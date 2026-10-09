const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-files-'));
  await fs.writeFile(path.join(root, 'kit.json'), '{"name":"old"}');
  const mod = await import('../scripts/admin/file-service.mjs');
  const server = mod.createAdminFileService({ root, origin: 'http://localhost:3000', entries: [{ id: 'kit', path: 'kit.json', label: 'Kit' }, { id: 'link', path: 'link.json' }, { id: 'escape', path: '../outside.json' }], authenticate: (token) => token === 'good', validate: async (_entry, value) => { if (!value || value.reject) { const error = new Error('invalid'); error.publicMessage = 'value rejected'; throw error; } } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  async function request(method, pathname, body, extra = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, method, path: pathname, headers: { host: `127.0.0.1:${port}`, authorization: 'Bearer good', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...extra } }, (res) => { const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) })); }); req.on('error', reject); if (body !== undefined) req.end(typeof body === 'string' ? body : JSON.stringify(body)); else req.end();
    });
  }
  return { root, server, request, close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(resolve); }) };
}

test('admin file service protects catalog and file APIs', async (t) => {
  const s = await setup(); t.after(() => s.close());
  const unauthorized = await new Promise((resolve) => { const req = http.request({ hostname: '127.0.0.1', port: s.server.address().port, path: '/catalog', headers: { host: '127.0.0.1' } }, (r) => { r.resume(); r.on('end', () => resolve(r.statusCode)); }); req.end(); });
  assert.equal(unauthorized, 401);
  assert.equal((await s.request('GET', '/catalog')).body.entries[0].label, 'Kit');
  assert.equal((await s.request('GET', '/file?id=unknown')).status, 404);
  assert.equal((await s.request('GET', '/file?id=../kit')).status, 404);
  assert.equal((await s.request('GET', '/catalog', undefined, { host: 'evil.example' })).status, 403);
  assert.equal((await s.request('GET', '/file?id=kit')).status, 200);
});

test('PUT enforces origin, content, validation, CAS, and atomic success', async (t) => {
  const s = await setup(); t.after(() => s.close());
  const current = await s.request('GET', '/file?id=kit');
  assert.equal((await s.request('PUT', '/file?id=kit', { value: { reject: true }, revision: current.body.revision }, { origin: 'http://evil' })).status, 403);
  const rejected = await s.request('PUT', '/file?id=kit', { value: { reject: true }, revision: current.body.revision }, { origin: 'http://localhost:3000' });
  assert.equal(rejected.status, 422); assert.equal(rejected.body.error, 'value rejected');
  assert.equal((await s.request('PUT', '/file?id=kit', { value: { name: 'new' }, revision: 'bad' }, { origin: 'http://localhost:3000' })).status, 409);
  const saved = await s.request('PUT', '/file?id=kit', { value: { name: 'new' }, revision: current.body.revision }, { origin: 'http://localhost:3000' });
  assert.equal(saved.status, 200); assert.deepEqual((await s.request('GET', '/file?id=kit')).body.value, { name: 'new' });
});

test('concurrent writes with one revision have one winner', async (t) => {
  const s = await setup(); t.after(() => s.close()); const current = await s.request('GET', '/file?id=kit');
  const [a, b] = await Promise.all(['a', 'b'].map((name) => s.request('PUT', '/file?id=kit', { value: { name }, revision: current.body.revision }, { origin: 'http://localhost:3000' })));
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
});

test('rejects malformed, oversized, symlink and preserves bytes on failed validation', async (t) => {
  const s = await setup(); t.after(() => s.close()); const before = await fs.readFile(path.join(s.root, 'kit.json'));
  assert.equal((await s.request('PUT', '/file?id=kit', '{', { origin: 'http://localhost:3000' })).status, 400);
  assert.equal((await s.request('PUT', '/file?id=kit', undefined, { origin: 'http://localhost:3000', 'content-length': String(2 * 1024 * 1024 + 1) })).status, 413);
  await fs.symlink('kit.json', path.join(s.root, 'link.json'));
  assert.equal((await s.request('GET', '/file?id=link')).status, 404);
  assert.equal((await s.request('GET', '/file?id=escape')).status, 404);
  assert.equal((await s.request('GET', '/file?id=kit')).status, 200);
  assert.equal((await fs.readFile(path.join(s.root, 'kit.json'))).equals(before), true);
});
