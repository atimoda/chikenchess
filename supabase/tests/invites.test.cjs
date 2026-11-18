/** Friend invites (202611180004_friend_invites.sql) on real PostgreSQL through PGlite, isolated from production.
 * Supply ONLINE_TEST_MODULES=/tmp/chicken-online-db-test when PGlite is installed there (docs/ONLINE_SETUP.md).
 * Kept apart from database.test.cjs: the same stubs, only the accounts these cases need. */
/* global process, __dirname */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require(require.resolve('@electric-sql/pglite', { paths: [process.env.ONLINE_TEST_MODULES || process.cwd()] }))
const [ana, bia, caio] = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333']
const PATIO = '0f8fad5b-d9cb-469f-a165-70867728950e'
let db
async function asUser(id, sql, args = []) {
  await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec('set role authenticated')
  return db.query(sql, args)
}
async function rpc(id, fn, args = []) {
  return (await asUser(id, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(',')}) as result`, args)).rows[0].result
}
const invite = (from, to, kind = 'patio', patio = PATIO, room = 'r0om_1') => rpc(from, 'online_invite', ['send', to, kind, patio, room])
const inbox = id => rpc(id, 'online_invite', ['list'])
async function age(from, to, seconds) {
  await db.exec('reset role')
  await db.query(`update public.online_invites set created_at=created_at - make_interval(secs => $3) where sender_id=$1 and recipient_id=$2`, [from, to, seconds])
}

before(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}'::jsonb,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role;
    create schema realtime; create table realtime.messages(id bigint,extension text); alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
    grant usage on schema realtime to authenticated; grant select,insert on realtime.messages to authenticated;
    grant execute on function realtime.topic() to authenticated;`)
  const migrations = path.join(__dirname, '../migrations')
  for (const file of fs.readdirSync(migrations).filter(file => file.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(migrations, file), 'utf8'))
  for (const id of [ana, bia, caio]) await db.query('insert into auth.users(id) values($1)', [id])
  await rpc(ana, 'online_profile', [null, 'Ana']); await rpc(bia, 'online_profile', [null, 'Bia']); await rpc(caio, 'online_profile', [null, 'Caio'])
  // Ana and Bia are friends; Caio only asked Ana
  const biaCode = (await rpc(bia, 'online_profile')).code
  const pending = await rpc(ana, 'online_friends', ['request', biaCode, null])
  await rpc(bia, 'online_friends', ['accept', null, pending[0].id])
  await rpc(caio, 'online_friends', ['request', (await rpc(ana, 'online_profile')).code, null])
  await db.exec('reset role')
  await db.query(`insert into online_private.patio_lobbies(id,name,layout) values($1,'Campo minado','{"elements":[]}')`, [PATIO])
})
after(async () => { await db.close() })

test('an accepted friend is called into the Pátio and its room, and only the friend reads it', async () => {
  const before = (await asUser(bia, 'select revision from public.online_social_updates where user_id=$1', [bia])).rows[0]?.revision ?? 0
  await invite(ana, bia)
  const after = (await asUser(bia, 'select revision from public.online_social_updates where user_id=$1', [bia])).rows[0].revision
  assert.ok(Number(after) > Number(before), 'the friend\'s social watch wakes up')
  const [got] = await inbox(bia)
  assert.deepEqual({ ...got, created_at: undefined }, { sender_id: ana, name: 'Ana', kind: 'patio', patio_id: PATIO, patio_name: 'Campo minado', room: 'r0om_1', created_at: undefined })
  assert.deepEqual(await inbox(ana), [])
  // the table itself is closed to the players
  await assert.rejects(asUser(bia, 'select * from public.online_invites'), /permission denied/)
})

test('only accepted friends, not oneself, a pending request or a stranger', async () => {
  await assert.rejects(invite(ana, caio), /FRIEND_NOT_FOUND/)
  await assert.rejects(invite(caio, ana), /FRIEND_NOT_FOUND/)
  await assert.rejects(invite(ana, ana), /FRIEND_NOT_FOUND/)
  await assert.rejects(rpc(ana, 'online_invite', ['send', null, 'patio', null, null]), /FRIEND_NOT_FOUND/)
})

test('one invite per friend: again within 5 seconds is refused, later it replaces the last one', async () => {
  await age(ana, bia, 60)
  await invite(bia, ana, 'room', null, 'ABCDEF0123')
  await invite(ana, bia, 'patio', null, null)
  await assert.rejects(invite(ana, bia), /INVITE_TOO_SOON/)
  const list = await inbox(bia)
  assert.equal(list.length, 1)
  assert.equal(list[0].patio_id, null)
  assert.equal(list[0].room, null)
  const [chess] = await inbox(ana)
  assert.equal(chess.kind, 'room')
  assert.equal(chess.room, 'ABCDEF0123')
  assert.equal(chess.patio_id, null)
})

test('bad invites are refused: a chess lobby needs its code, room ids are plain', async () => {
  await age(ana, bia, 60)
  await assert.rejects(invite(ana, bia, 'room', null, null), /INVALID_INVITE/)
  await assert.rejects(invite(ana, bia, 'patio', PATIO, 'x; drop'), /INVALID_INVITE/)
  await assert.rejects(invite(ana, bia, 'game', PATIO, null), /INVALID_INVITE/)
  await assert.rejects(rpc(ana, 'online_invite', ['delete', bia, 'patio', null, null]), /INVALID_ACTION/)
})

test('invites last 10 minutes and are dropped on the next read', async () => {
  await age(bia, ana, 11 * 60)
  assert.deepEqual(await inbox(ana), [])
  await db.exec('reset role')
  assert.equal((await db.query('select count(*)::int as n from public.online_invites where recipient_id=$1', [ana])).rows[0].n, 0)
})

test('a removed friend can not be called anymore', async () => {
  await age(ana, bia, 60)
  const friendship = (await rpc(ana, 'online_friends', ['list'])).find(f => f.profile.id === bia)
  await rpc(ana, 'online_friends', ['remove', null, friendship.id])
  await assert.rejects(invite(ana, bia), /FRIEND_NOT_FOUND/)
})

test('guests and the anonymous role can not call the function', async () => {
  await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub','',false)"); await db.exec('set role authenticated')
  await assert.rejects(db.query("select public.online_invite('list')"), /UNAUTHORIZED/)
  await db.exec('reset role'); await db.exec('set role anon')
  await assert.rejects(db.query("select public.online_invite('list')"), /permission denied/)
  await db.exec('reset role')
})
