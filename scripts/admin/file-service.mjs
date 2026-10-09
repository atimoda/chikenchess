import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_BODY = 2 * 1024 * 1024;

function revision(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': data.length, 'cache-control': 'no-store', connection: 'close' });
  res.end(data);
}
function bearer(req) {
  const value = req.headers.authorization;
  return typeof value === 'string' && /^Bearer\s+(.+)$/i.test(value) ? value.replace(/^Bearer\s+/i, '') : null;
}
function loopbackHost(value) {
  if (typeof value !== 'string') return false;
  const host = value.startsWith('[') ? value.slice(1, value.indexOf(']')) : value.split(':')[0];
  return host === '127.0.0.1' || host === '::1';
}
function loopbackAddress(value) {
  return value === '127.0.0.1' || value === '::1' || value === '::ffff:127.0.0.1';
}

export function createAdminFileService({ root, origin, entries, validate, authenticate, operations = {} }) {
  if (!root || !origin || !Array.isArray(entries) || typeof validate !== 'function' || typeof authenticate !== 'function') throw new TypeError('invalid file service options');
  const rootPath = path.resolve(root);
  const byId = new Map(entries.map((entry) => [entry.id, { ...entry, path: String(entry.path) }]));
  const locks = new Map();

  async function safePath(entry) {
    if (!entry || !entry.id || path.isAbsolute(entry.path)) return null;
    const relative = path.normalize(entry.path);
    if (relative === '..' || relative.startsWith(`..${path.sep}`)) return null;
    const target = path.resolve(rootPath, relative);
    if (target !== rootPath && !target.startsWith(`${rootPath}${path.sep}`)) return null;
    const parts = path.relative(rootPath, target).split(path.sep).filter(Boolean);
    let current = rootPath;
    try {
      for (const part of parts) {
        current = path.join(current, part);
        const stat = await fs.lstat(current);
        if (stat.isSymbolicLink()) return null;
      }
      return target;
    } catch (error) {
      if (error.code === 'ENOENT') return target;
      throw error;
    }
  }
  async function current(target) { return fs.readFile(target); }
  async function authenticated(req, res) {
    const token = bearer(req);
    if (!token) { json(res, 401, { error: 'unauthorized' }); return false; }
    let result = false;
    try { result = await authenticate(token); } catch { result = false; }
    if (!result) { json(res, 403, { error: 'forbidden' }); return false; }
    return true;
  }
  async function body(req) {
    const chunks = []; let total = 0; let tooLarge = false;
    for await (const chunk of req) { total += chunk.length; if (total > MAX_BODY) tooLarge = true; else if (!tooLarge) chunks.push(chunk); }
    if (tooLarge) { const error = new Error('body too large'); error.status = 413; throw error; }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { const error = new Error('malformed json'); error.status = 400; throw error; }
  }
  function withLock(key, task) {
    const previous = locks.get(key) || Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    const tracked = next.finally(() => { if (locks.get(key) === tracked) locks.delete(key); });
    tracked.catch(() => {});
    locks.set(key, tracked);
    return next;
  }
  const server = http.createServer(async (req, res) => {
    try {
      req.setTimeout(30_000, () => { if (!res.headersSent) json(res, 408, { error: 'request timeout' }); req.destroy(); });
      if (!loopbackHost(req.headers.host) || !loopbackAddress(req.socket.remoteAddress)) return json(res, 403, { error: 'forbidden' });
      const declaredLength = Number(req.headers['content-length']);
      if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY) { req.resume(); return json(res, 413, { error: 'payload too large' }); }
      if (!await authenticated(req, res)) return;
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/catalog') return json(res, 200, { entries: entries.map(({ id, path: entryPath, ...metadata }) => ({ id, path: entryPath, ...metadata })) });
      if (req.method === 'POST' && Object.hasOwn(operations, url.pathname) && typeof operations[url.pathname] === 'function') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return json(res, 403, { error: 'forbidden' });
        const input = await body(req);
        return json(res, 200, await operations[url.pathname](input));
      }
      if ((url.pathname !== '/file' || !['GET', 'PUT'].includes(req.method))) return json(res, 404, { error: 'not found' });
      const entry = byId.get(url.searchParams.get('id'));
      const target = await safePath(entry);
      if (!entry || !target) return json(res, 404, { error: 'not found' });
      if (req.method === 'GET') {
        const bytes = await current(target);
        return json(res, 200, { value: JSON.parse(bytes.toString('utf8')), revision: revision(bytes) });
      }
      if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return json(res, 403, { error: 'forbidden' });
      const payload = await body(req);
      if (!payload || typeof payload !== 'object' || typeof payload.revision !== 'string' || !Object.prototype.hasOwnProperty.call(payload, 'value')) return json(res, 400, { error: 'invalid request' });
      return await withLock(entry.id, async () => {
        const old = await current(target); const oldRevision = revision(old);
        if (payload.revision !== oldRevision) return json(res, 409, { error: 'conflict', revision: oldRevision });
        try { await validate(entry, payload.value); } catch (error) {
          error.status = 422;
          throw error;
        }
        const bytes = Buffer.from(`${JSON.stringify(payload.value, null, 2)}\n`);
        const stat = await fs.stat(target);
        const temporary = `${target}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
        try { await fs.writeFile(temporary, bytes, { mode: stat.mode & 0o7777 }); await fs.chmod(temporary, stat.mode & 0o7777); await fs.rename(temporary, target); } catch (error) { await fs.rm(temporary, { force: true }).catch(() => {}); throw error; }
        return json(res, 200, { revision: revision(bytes) });
      });
    } catch (error) {
      const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
      if (!res.headersSent) json(res, status, { error: status === 422 && error.publicMessage ? error.publicMessage : status === 404 ? 'not found' : status === 413 ? 'payload too large' : status === 400 ? 'bad request' : 'internal error' });
      else res.destroy();
    }
  });
  return server;
}
