/** Game defaults of the Pátio panels (202611250002_game_defaults.sql) on real PostgreSQL through PGlite, isolated from
 * production. Supply ONLINE_TEST_MODULES=/tmp/chicken-online-db-test when PGlite is installed there (docs/ONLINE_SETUP.md).
 * Kept apart from database.test.cjs: the same stubs, only what these cases need. */
/* global process, __dirname */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require(require.resolve('@electric-sql/pglite', { paths: [process.env.ONLINE_TEST_MODULES || process.cwd()] }))
const admin = '11111111-1111-4111-8111-111111111111'
const ana = '22222222-2222-4222-8222-222222222222'
let db
// who calls: the admin, an account, or nobody (the publishable key only)
async function as(who, sql, args = []) {
  await db.exec('reset role')
  const claims = who === null ? {} : { sub: who, is_anonymous: false, ...(who === admin ? { app_metadata: { access_level: 'admin' } } : {}) }
  await db.query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)", [who ?? '', JSON.stringify(claims)])
  await db.exec(who === null ? 'set role anon' : 'set role authenticated')
  return db.query(sql, args)
}
const read = async (who, known = null) => (await as(who, 'select public.game_defaults($1) as r', [known])).rows[0].r
const save = async (who, part, value, revision) => (await as(who, 'select public.game_defaults_save($1,$2,$3) as r', [part, value, revision])).rows[0].r

before(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}'::jsonb,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema realtime; create table realtime.messages(id bigint,extension text); alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
    grant usage on schema realtime to authenticated; grant select,insert on realtime.messages to authenticated;
    grant execute on function realtime.topic() to authenticated;`)
  const migrations = path.join(__dirname, '../migrations')
  for (const file of fs.readdirSync(migrations).filter(file => file.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(migrations, file), 'utf8'))
  for (const id of [admin, ana]) await db.query('insert into auth.users(id) values($1)', [id])
})
after(async () => { await db.close() })

test('nothing saved: anyone reads an empty set', async () => {
  assert.deepEqual(await read(null), {})
  assert.deepEqual(await read(ana), {})
})

test('only the admin saves, and the tables stay closed', async () => {
  await assert.rejects(as(null, 'select public.game_defaults_save($1,$2,0)', ['volume', { music: 1 }]), /permission denied/)
  await assert.rejects(save(ana, 'volume', { music: 1 }, 0), /ADMIN_REQUIRED/)
  await assert.rejects(as(ana, 'select * from online_private.game_defaults'), /permission denied/)
  await assert.rejects(as(ana, 'select public.game_defaults_versions($1)', ['volume']), /ADMIN_REQUIRED/)
  await assert.rejects(save(admin, 'nope', { a: 1 }, 0), /INVALID_PART/)
  await assert.rejects(save(admin, 'volume', 3, 0), /INVALID_CONFIG/)
})

test('a save bumps the revision; a save over a newer one conflicts', async () => {
  const first = await save(admin, 'volume', { music: 0.5 }, 0)
  assert.equal(first.revision, 1)
  await assert.rejects(save(admin, 'volume', { music: 0.6 }, 0), /CONFIG_CONFLICT/)
  const second = await save(admin, 'volume', { music: 0.7 }, 1)
  assert.equal(second.revision, 2)
  await save(admin, 'items', { taco: { dmg: 3 } }, 0)
  const all = await read(null)
  assert.deepEqual(all.volume.value, { music: 0.7 })
  assert.equal(all.items.revision, 1)
})

test('a part already held comes back without its value', async () => {
  const r = await read(null, { volume: 2, items: 0 })
  assert.deepEqual(Object.keys(r.volume).sort(), ['revision', 'updated_at'])
  assert.deepEqual(r.items.value, { taco: { dmg: 3 } })
})

test('the history keeps the last 50 versions of each part and one can be read back', async () => {
  let rev = 2
  for (let i = 0; i < 55; i++) rev = (await save(admin, 'volume', { music: i / 100 }, rev)).revision
  const versions = (await as(admin, 'select public.game_defaults_versions($1) as r', ['volume'])).rows[0].r
  assert.equal(versions.length, 50)
  assert.equal(versions[0].revision, rev)
  assert.equal((await as(admin, 'select public.game_defaults_versions($1) as r', ['items'])).rows[0].r.length, 1)
  const old = (await as(admin, 'select public.game_defaults_version($1) as r', [versions[49].id])).rows[0].r
  assert.equal(old.part, 'volume')
  assert.equal(old.revision, rev - 49)
  // restoring is saving that value again
  const restored = await save(admin, 'volume', old.value, rev)
  assert.equal(restored.revision, rev + 1)
  assert.deepEqual((await read(null)).volume.value, old.value)
})

test('the Personagem versions: listed and read only by the admin', async () => {
  const cfg = { params: { scale: 1 }, look: {} }
  await as(admin, 'select public.chicken_config_save($1,0)', [cfg])
  await assert.rejects(as(ana, 'select public.chicken_config_versions()'), /ADMIN_REQUIRED/)
  const versions = (await as(admin, 'select public.chicken_config_versions() as r')).rows[0].r
  assert.equal(versions.length, 1)
  const one = (await as(admin, 'select public.chicken_config_version($1) as r', [versions[0].id])).rows[0].r
  assert.deepEqual(one.config, cfg)
})
