/** Pátio visit counters (202611250001_patio_visits.sql) on real PostgreSQL through PGlite, isolated from production.
 * Supply ONLINE_TEST_MODULES=/tmp/chicken-online-db-test when PGlite is installed there (docs/ONLINE_SETUP.md).
 * Kept apart from database.test.cjs: the same stubs, only what these cases need. */
/* global process, __dirname */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require(require.resolve('@electric-sql/pglite', { paths: [process.env.ONLINE_TEST_MODULES || process.cwd()] }))
const ana = '11111111-1111-4111-8111-111111111111'
const guest = '22222222-2222-4222-8222-222222222222'
const PATIO = '0f8fad5b-d9cb-469f-a165-70867728950e'
let db
// who calls: an account, a Supabase anonymous session, or nobody (the publishable key only)
async function as(who, sql, args = []) {
  await db.exec('reset role')
  const claims = who === null ? {} : { sub: who, is_anonymous: who === guest }
  await db.query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)", [who ?? '', JSON.stringify(claims)])
  await db.exec(who === null ? 'set role anon' : 'set role authenticated')
  return db.query(sql, args)
}
const visit = async (who, newAnon, id = PATIO) => (await as(who, 'select public.patio_lobby_visit($1,$2) as r', [id, newAnon])).rows[0].r
const row = async () => (await as(ana, 'select public.patio_lobby_get($1) as r', [PATIO])).rows[0].r

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
  for (const id of [ana, guest]) await db.query('insert into auth.users(id) values($1)', [id])
  await db.exec('reset role')
  await db.query(`insert into online_private.patio_lobbies(id,name,layout) values($1,'Campo minado','{"elements":[]}')`, [PATIO])
})
after(async () => { await db.close() })

test('a Pátio never visited reads zero visits and zero anonymous players', async () => {
  const r = await row()
  assert.equal(Number(r.visits), 0)
  assert.equal(Number(r.anon_players), 0)
})

test('every entry counts a visit; the anonymous player only without an account and when new', async () => {
  assert.deepEqual(await visit(ana, true), { visits: 1, anon_players: 0, anon_counted: false })
  assert.deepEqual(await visit(null, true), { visits: 2, anon_players: 1, anon_counted: true })
  assert.deepEqual(await visit(guest, true), { visits: 3, anon_players: 2, anon_counted: true })
  assert.deepEqual(await visit(guest, false), { visits: 4, anon_players: 2, anon_counted: false })
  const r = await row()
  assert.equal(Number(r.visits), 4)
  assert.equal(Number(r.anon_players), 2)
})

test('a Pátio not in the database is not counted, and the counters stay closed to the players', async () => {
  assert.equal(await visit(null, true, '3f1d2c4b-1111-4222-8333-444455556666'), null)
  await assert.rejects(as(ana, 'select * from online_private.patio_lobby_stats'), /permission denied/)
})

test('the lists carry the numbers too and the Pátio row is not touched by a visit', async () => {
  await db.exec('reset role')
  const before = (await db.query('select updated_at, revision from online_private.patio_lobbies where id=$1', [PATIO])).rows[0]
  await visit(null, false)
  await db.exec('reset role')
  const afterRow = (await db.query('select updated_at, revision from online_private.patio_lobbies where id=$1', [PATIO])).rows[0]
  assert.deepEqual(afterRow, before)
  const list = (await as(ana, 'select public.patio_lobby_list(true) as r')).rows[0].r
  const mine = list.find(l => l.id === PATIO)
  assert.equal(Number(mine.visits), 5)
  assert.equal(Number(mine.anon_players), 2)
})
