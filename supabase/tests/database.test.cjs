/** Real PostgreSQL execution through PGlite, isolated from production.
 * Supply ONLINE_TEST_MODULES=/tmp/chicken-online-db-test when PGlite is installed
 * there. Auth/Realtime stubs test SQL permissions, not hosted Auth/WebSockets. */
/* global process, __dirname */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { PGlite } = require(require.resolve('@electric-sql/pglite', { paths: [process.env.ONLINE_TEST_MODULES || process.cwd()] }))
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555']
const randomRoomIds = ['a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003']
let db; let profiles; let room; let match; let firstReceipt
const legacyId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
async function admin(sql, args=[]) { await db.exec('reset role'); return db.query(sql,args) }
async function asUser(id, sql, args=[]) {
  await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); await db.exec('set role authenticated')
  return db.query(sql,args)
}
async function rpc(id, fn, args=[], placeholders=args.map((_,i)=>`$${i+1}`).join(',')) {
  return (await asUser(id, `select public.${fn}(${placeholders}) as result`,args)).rows[0].result
}
async function service(fn, args) {
  await db.exec('reset role'); await db.exec('set role service_role')
  return (await db.query(`select public.${fn}(${args.map((_,i)=>`$${i+1}`).join(',')}) as result`,args)).rows[0].result
}
before(async () => {
  db=new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role;
    create schema realtime; create table realtime.messages(id bigint,extension text); alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
    grant usage on schema realtime to authenticated; grant select,insert on realtime.messages to authenticated;
    grant execute on function realtime.topic() to authenticated;`)
  const migrations=path.join(__dirname,'../migrations')
  for(const file of fs.readdirSync(migrations).filter(file=>file.endsWith('.sql')).sort()) {
    if(file==='202610040003_baptism_names.sql') {
      await db.query('insert into auth.users(id) values($1)',[legacyId])
      await db.query('insert into public.online_profiles(id) values($1)',[legacyId])
    }
    await db.exec(fs.readFileSync(path.join(migrations,file),'utf8'))
  }
  for (const id of [...ids,...randomRoomIds]) await db.query('insert into auth.users(id) values($1)',[id])
  for (const id of randomRoomIds) await rpc(id,'online_profile')
  profiles=[]
  for (let i=0;i<ids.length;i++) profiles.push(await rpc(ids[i],'online_profile',[null,`Chicken ${i}`]))
})
after(async()=>{ await db.close() })
test('baptism catalog has over 200 distinct words and all combinations fit the profile contract',async()=>{
  const words=(await admin('select category,word from online_private.baptism_name_words')).rows
  assert.equal(words.length,304)
  assert.ok(new Set(words.map(w=>w.word)).size>200)
  const max=Object.fromEntries(['title','adjective','noun','epithet'].map(category=>[category,Math.max(...words.filter(w=>w.category===category).map(w=>w.word.length))]))
  assert.ok(max.title+max.adjective+max.noun+2<=40)
  assert.ok(max.title+max.noun+max.epithet+2<=40)
  assert.ok(max.title+max.noun+max.adjective+6<=40)
  const names=(await admin('select online_private.generate_baptism_name() as name from generate_series(1,300)')).rows.map(r=>r.name)
  assert.ok(names.every(name=>name.length<=40 && !/[\r\n\t]/.test(name)))
  assert.ok(new Set(names).size>200)
  assert.ok(names.every(name=>words.some(w=>w.category==='title' && name.startsWith(w.word+' '))))
  await assert.rejects(asUser(ids[0],'select online_private.generate_baptism_name()'),/permission denied/)
})
test('new profiles get a permanent baptismal name and an independently editable public name',async()=>{
  const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  await admin('insert into auth.users(id) values($1)',[id])
  const first=await rpc(id,'online_profile')
  assert.ok(first.baptismal_name)
  assert.equal(first.display_name,first.baptismal_name)
  assert.deepEqual(await rpc(id,'online_profile'),first)
  const edited=await rpc(id,'online_profile',[null,'My custom name',id])
  assert.equal(edited.display_name,'My custom name')
  assert.equal(edited.baptismal_name,first.baptismal_name)
  assert.equal((await rpc(id,'online_profile',[{goldenEggs:999},null,id])).baptismal_name,first.baptismal_name)
  const synced=await rpc(id,'online_sync_profile',[first.profile.updatedAt,{...first.profile,goldenEggs:18},id])
  assert.equal(synced.baptismal_name,first.baptismal_name)
  assert.equal(synced.display_name,'My custom name')
  await assert.rejects(rpc(id,'online_profile',[null,'bad\nname',id]),/INVALID_NAME/)
  assert.equal((await rpc(id,'online_profile')).baptismal_name,first.baptismal_name)
})
test('baptismal names cannot be spoofed on insert or changed even by privileged writes',async()=>{
  const id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  await admin('insert into auth.users(id) values($1)',[id])
  const stored=(await admin('insert into public.online_profiles(id,baptismal_name) values($1,$2) returning *',[id,'Spoofed birth name'])).rows[0]
  assert.notEqual(stored.baptismal_name,'Spoofed birth name')
  await assert.rejects(admin('update public.online_profiles set baptismal_name=$1 where id=$2',['Another birth name',id]),/NAME_IMMUTABLE/)
  await assert.rejects(admin('update public.online_profiles set baptismal_name=null where id=$1',[id]),/NAME_IMMUTABLE/)
  await admin('update public.online_profiles set display_name=$1 where id=$2',['Editable',id])
  assert.equal((await admin('select baptismal_name from public.online_profiles where id=$1',[id])).rows[0].baptismal_name,stored.baptismal_name)
})
test('Google names import at creation without overwriting later custom names or baptismal names',async()=>{
  const id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  await admin('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,{full_name:'Google Player'}])
  const first=await rpc(id,'online_profile')
  assert.equal(first.display_name,'Google Player')
  assert.notEqual(first.baptismal_name,'Google Player')
  await rpc(id,'online_profile',[null,'Custom Player',id])
  const loaded=await rpc(id,'online_profile')
  assert.equal(loaded.display_name,'Custom Player')
  assert.equal(loaded.baptismal_name,first.baptismal_name)
})
test('linking a visitor keeps both names and explicit Google import only changes the public name',async()=>{
  const id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  await admin('insert into auth.users(id) values($1)',[id])
  const visitor=await rpc(id,'online_profile')
  await admin('update auth.users set raw_user_meta_data=$1 where id=$2',[{full_name:'Linked Google Player'},id])
  assert.deepEqual(await rpc(id,'online_profile'),visitor)
  const imported=await rpc(id,'online_profile',[null,'Linked Google Player',id])
  assert.equal(imported.display_name,'Linked Google Player')
  assert.equal(imported.baptismal_name,visitor.baptismal_name)
})
test('migration preserves existing names as legacy baptismal names without touching progress',async()=>{
  const legacy=(await admin('select * from public.online_profiles where id=$1',[legacyId])).rows[0]
  assert.equal(legacy.display_name,'Sir Clucks-a-Lot')
  assert.equal(legacy.baptismal_name,'Sir Clucks-a-Lot')
  assert.equal(legacy.golden_eggs,10)
  const edited=await rpc(legacyId,'online_profile',[null,'Legacy custom name',legacyId])
  assert.equal(edited.display_name,'Legacy custom name')
  assert.equal(edited.baptismal_name,'Sir Clucks-a-Lot')
})
test('profile imports once, preserves exact eggs and cities, calculates rank and adds no gift',async()=>{
  // Start an unused sixth identity to test the creation/import boundary.
  const id='66666666-6666-4666-8666-666666666666'; await admin('insert into auth.users(id) values($1)',[id])
  const profile={profileVersion:1,goldenEggs:42,points:80,winsCount:4,conqueredCityIds:['dusseldorf'],gameplayTipSeen:true,moveRewardNotices:{best:true,worst:false}}
  const p=await rpc(id,'online_profile',[profile,null])
  assert.equal(p.profile.goldenEggs,42); assert.equal(p.profile.points,80); assert.equal(p.profile.rank,'Groove Master'); assert.deepEqual(p.profile.conqueredCityIds,['dusseldorf'])
  assert.deepEqual((await rpc(id,'online_profile',[{...profile,goldenEggs:999},null])).profile,p.profile)
})
test('profile sync keeps the match-tip progress',async()=>{
  const p=await rpc(ids[3],'online_profile')
  assert.equal(p.profile.seenMatchTipsCount,0)
  const saved=await rpc(ids[3],'online_sync_profile',[p.profile.updatedAt,{...p.profile,seenMatchTipsCount:2},ids[3]])
  assert.equal(saved.profile.seenMatchTipsCount,2)
  assert.equal((await rpc(ids[3],'online_profile')).profile.seenMatchTipsCount,2)
  const reset=await rpc(ids[3],'online_sync_profile',[saved.profile.updatedAt,{...saved.profile,seenMatchTipsCount:0},ids[3]])
  assert.equal(reset.profile.seenMatchTipsCount,0)
})
test('offline campaign sync uses CAS, recovers exact retries and preserves conflicting cloud progress',async()=>{
  const p=await rpc(ids[3],'online_profile')
  const proposal={...p.profile,goldenEggs:20,points:21,winsCount:1,conqueredCityIds:['dusseldorf']}
  const saved=await rpc(ids[3],'online_sync_profile',[p.profile.updatedAt,proposal,ids[3]]); assert.equal(saved.profile.goldenEggs,20); assert.ok(saved.profile.updatedAt>p.profile.updatedAt)
  assert.deepEqual(await rpc(ids[3],'online_sync_profile',[p.profile.updatedAt,proposal,ids[3]]),saved)
  await assert.rejects(rpc(ids[3],'online_sync_profile',[p.profile.updatedAt,{...proposal,goldenEggs:999},ids[3]]),{message:'PROFILE_CONFLICT',code:'PT409'})
  assert.equal((await rpc(ids[3],'online_profile')).profile.goldenEggs,20)
})
test('intended identity guard rejects switched-session sync even when both cloud timestamps match',async()=>{
  const a='77777777-7777-4777-8777-777777777777', b='88888888-8888-4888-8888-888888888888', fresh='99999999-9999-4999-8999-999999999999'
  for(const id of [a,b,fresh]) await admin('insert into auth.users(id) values($1)',[id])
  await rpc(a,'online_profile',[null,'Identity A',a]); await rpc(b,'online_profile',[null,'Identity B',b])
  await admin("update online_private.profile_saves set profile=jsonb_set(profile,'{updatedAt}','1234567890') where user_id=any($1::uuid[])",[[a,b]])
  const baselineA=await rpc(a,'online_profile',[null,null,a]), baselineB=await rpc(b,'online_profile',[null,null,b])
  assert.equal(baselineA.profile.updatedAt,baselineB.profile.updatedAt)
  const proposal={...baselineA.profile,goldenEggs:47,points:47}
  await assert.rejects(rpc(b,'online_sync_profile',[baselineA.profile.updatedAt,proposal,a]),/FORBIDDEN_IDENTITY/)
  await assert.rejects(rpc(b,'online_sync_profile',[baselineB.profile.updatedAt,proposal,null]),/FORBIDDEN_IDENTITY/)
  await assert.rejects(rpc(b,'online_profile',[proposal,'Cross account',a]),/FORBIDDEN_IDENTITY/)
  assert.deepEqual(await rpc(b,'online_profile',[null,null,b]),baselineB)
  await assert.rejects(rpc(fresh,'online_profile',[proposal,'Wrong import',a]),/FORBIDDEN_IDENTITY/)
  assert.equal((await admin('select count(*)::int as total from public.online_profiles where id=$1',[fresh])).rows[0].total,0)
  const savedA=await rpc(a,'online_sync_profile',[baselineA.profile.updatedAt,proposal,a]); assert.equal(savedA.profile.goldenEggs,47)
})
test('roles cannot directly mutate official data or call privileged service RPCs',async()=>{
  await assert.rejects(asUser(ids[0],"update public.online_profiles set golden_eggs=999 where id=$1",[ids[0]]),/permission denied/)
  await assert.rejects(asUser(ids[0],"update public.online_rooms set is_public=false"),/permission denied/)
  await assert.rejects(asUser(ids[0],'select * from online_private.profile_saves'),/permission denied/)
  await assert.rejects(asUser(ids[0],'select * from public.online_match_commands'),/permission denied/)
  await assert.rejects(asUser(ids[0],"select public.online_commit_match(null,null,null,0,'{}','{}')"),/permission denied/)
  await db.exec('reset role; set role anon'); await db.query('select public.online_rooms()')
  await assert.rejects(db.query('select * from public.online_rooms'),/permission denied/)
  await assert.rejects(db.query('select * from public.online_profiles'),/permission denied/)
  await assert.rejects(db.query("select public.online_room('create')"),/permission denied/)
})
test('server preset allowlist matches the shipped city catalog and rejects unknown kits',async()=>{
  const { loadTs }=require('../../tests/helpers/music.cjs')
  const catalog=loadTs('lib/cities-data.ts').cities.map(c=>c.id).sort()
  assert.deepEqual((await admin('select id from online_private.kit_catalog order by id')).rows.map(r=>r.id),catalog)
  await assert.rejects(rpc(ids[0],'online_room',['create',null,true,'nonexistent-city']),/INVALID_KIT/)
})
test('Random remains a lobby choice until second Ready resolves independent concrete match kits',async()=>{
  let current=await rpc(randomRoomIds[0],'online_room',['create'])
  assert.equal(current.members[0].city_id,'random')
  current=await rpc(randomRoomIds[1],'online_room',['join',current.code])
  assert.deepEqual(current.members.map(m=>m.city_id),['random','random'])
  const catalog=(await admin('select id from online_private.kit_catalog')).rows.map(r=>r.id)
  // A reproducible PRNG sequence checks both independent draws and the absence
  // of draws during get/first Ready, without probabilistic equality assertions.
  await admin('select setseed(0.42)')
  const hostExpected=(await admin('select id from online_private.kit_catalog order by random() limit 1')).rows[0].id
  const guestExpected=(await admin('select id from online_private.kit_catalog order by random() limit 1')).rows[0].id
  assert.notEqual(hostExpected,guestExpected)
  await admin('select setseed(0.42)')
  assert.deepEqual((await rpc(randomRoomIds[2],'online_room',['get',current.code])).members.map(m=>m.city_id),['random','random'])
  current=await rpc(randomRoomIds[0],'online_room',['ready',current.code])
  assert.equal(current.status,'open'); assert.equal(current.match_id,null)
  assert.deepEqual(current.members.map(m=>m.city_id),['random','random'])
  assert.equal((await admin('select count(*)::int as count from public.online_matches where room_id=$1',[current.id])).rows[0].count,0)
  current=await rpc(randomRoomIds[1],'online_room',['ready',current.code])
  assert.equal(current.status,'playing')
  assert.deepEqual(current.members.map(m=>m.city_id),['random','random'])
  let resolved=await rpc(randomRoomIds[0],'get_online_match',[current.match_id])
  assert.equal(resolved.members.find(m=>m.user_id===randomRoomIds[0]).city_id,hostExpected)
  assert.equal(resolved.members.find(m=>m.user_id===randomRoomIds[1]).city_id,guestExpected)
  assert.equal(resolved.context_city_id,hostExpected)
  assert.ok(resolved.members.every(m=>catalog.includes(m.city_id)))
  await assert.rejects(rpc(randomRoomIds[0],'online_room',['visibility',current.code,false]),/ROOM_CLOSED/)
  await assert.rejects(rpc(randomRoomIds[1],'online_room',['visibility',current.code,false]),/FORBIDDEN/)
  await assert.rejects(rpc(randomRoomIds[0],'online_room',['kit',current.code,true,'nyc']),/ROOM_CLOSED/)
  assert.equal((await rpc(randomRoomIds[0],'online_room',['ready',current.code])).match_id,current.match_id)
  assert.equal((await rpc(randomRoomIds[1],'online_room',['ready',current.code])).match_id,current.match_id)
  assert.deepEqual(await rpc(randomRoomIds[0],'get_online_match',[current.match_id]),resolved)
  assert.equal((await admin('select count(*)::int as count from public.online_matches where room_id=$1',[current.id])).rows[0].count,1)
  await assert.rejects(admin("update public.online_match_members set city_id='random' where match_id=$1",[current.match_id]),/online_match_members_concrete_kit/)
  await assert.rejects(admin("update public.online_matches set context_city_id='random' where id=$1",[current.match_id]),/online_matches_concrete_context/)
  // Revanche keeps the concrete draws and original context while swapping colors.
  const offered=resolved.members.find(m=>m.user_id===randomRoomIds[0]).color
  resolved=await service('online_commit_match',[resolved.id,randomRoomIds[0],randomUUID(),0,{...resolved.state,result:{winner:null,reason:'agreement'}},{kind:'accept-draw'}])
  resolved=await service('online_commit_match',[resolved.id,randomRoomIds[0],randomUUID(),1,{...resolved.state,rematchOffer:offered},{kind:'offer-rematch'}])
  const accepted=await service('online_commit_match',[resolved.id,randomRoomIds[1],randomUUID(),2,{...resolved.state,rematchOffer:null},{kind:'accept-rematch'}])
  const again=await rpc(randomRoomIds[0],'get_online_match',[accepted.rematch_id])
  assert.equal(again.context_city_id,hostExpected)
  for(const m of again.members) {
    const original=resolved.members.find(before=>before.user_id===m.user_id)
    assert.equal(m.city_id,original.city_id); assert.notEqual(m.color,original.color)
  }
  await service('online_commit_match',[again.id,randomRoomIds[0],randomUUID(),0,{...again.state,result:{winner:null,reason:'agreement'}},{kind:'accept-draw'}])
  await rpc(randomRoomIds[0],'online_room',['leave',current.code]); await rpc(randomRoomIds[1],'online_room',['leave',current.code])
})
test('explicit kits survive Ready and the explicit host supplies context while Random can be selected again',async()=>{
  let current=await rpc(randomRoomIds[0],'online_room',['create',null,true,'nyc'])
  current=await rpc(randomRoomIds[1],'online_room',['join',current.code,true,'chicago'])
  current=await rpc(randomRoomIds[1],'online_room',['ready',current.code])
  current=await rpc(randomRoomIds[1],'online_room',['kit',current.code,true,'random'])
  assert.equal(current.members.find(m=>m.user_id===randomRoomIds[1]).city_id,'random')
  assert.equal(current.members.find(m=>m.user_id===randomRoomIds[1]).ready,true)
  const first=await rpc(randomRoomIds[0],'online_room',['ready',current.code])
  assert.equal(first.members.find(m=>m.user_id===randomRoomIds[0]).city_id,'nyc')
  current=await rpc(randomRoomIds[1],'online_room',['ready',current.code])
  const resolved=await rpc(randomRoomIds[0],'get_online_match',[current.match_id])
  assert.equal(resolved.context_city_id,'nyc')
  assert.equal(resolved.members.find(m=>m.user_id===randomRoomIds[0]).city_id,'nyc')
  const guest=resolved.members.find(m=>m.user_id===randomRoomIds[1])
  assert.equal((await admin('select count(*)::int as count from online_private.kit_catalog where id=$1',[guest.city_id])).rows[0].count,1)
  await service('online_commit_match',[resolved.id,randomRoomIds[0],randomUUID(),0,{...resolved.state,result:{winner:null,reason:'agreement'}},{kind:'accept-draw'}])
  await rpc(randomRoomIds[0],'online_room',['leave',current.code]); await rpc(randomRoomIds[1],'online_room',['leave',current.code])
})
test('only the open-room host may change visibility and the directory refreshes without changing Ready',async()=>{
  let current=await rpc(randomRoomIds[0],'online_room',['create',null,false])
  const directoryHas=async()=> (await rpc(randomRoomIds[2],'online_rooms')).some(r=>r.code===current.code)
  assert.equal(await directoryHas(),false)
  await assert.rejects(rpc(randomRoomIds[2],'online_room',['visibility',current.code,true]),/FORBIDDEN/)
  await assert.rejects(rpc(randomRoomIds[0],'online_room',['visibility',current.code,null]),/INVALID_VISIBILITY/)
  current=await rpc(randomRoomIds[0],'online_room',['visibility',current.code,true])
  assert.equal(current.is_public,true); assert.equal(await directoryHas(),true)
  current=await rpc(randomRoomIds[1],'online_room',['join',current.code])
  assert.equal(await directoryHas(),false)
  const ready=await rpc(randomRoomIds[0],'online_room',['ready',current.code])
  await assert.rejects(rpc(randomRoomIds[1],'online_room',['visibility',current.code,false]),/FORBIDDEN/)
  current=await rpc(randomRoomIds[0],'online_room',['visibility',current.code,false])
  assert.equal(current.is_public,false); assert.deepEqual(current.members,ready.members)
  current=await rpc(randomRoomIds[0],'online_room',['visibility',current.code,true])
  assert.equal(current.is_public,true); assert.equal(await directoryHas(),false)
  await rpc(randomRoomIds[1],'online_room',['leave',current.code])
  assert.equal(await directoryHas(),true)
  current=await rpc(randomRoomIds[0],'online_room',['visibility',current.code,false])
  assert.equal(await directoryHas(),false)
  assert.equal((await rpc(randomRoomIds[2],'online_room',['get',current.code])).id,current.id)
  await rpc(randomRoomIds[0],'online_room',['leave',current.code])
  await assert.rejects(rpc(randomRoomIds[0],'online_room',['visibility',current.code,true]),/FORBIDDEN/)
})
test('unrelated profiles are hidden; public directory contains only open vacancies',async()=>{
  assert.equal((await asUser(ids[2],'select * from public.online_profiles')).rows.length,1)
  room=await rpc(ids[0],'online_room',['create',null,true,'dusseldorf'])
  assert.equal((await rpc(ids[2],'online_rooms')).length,1)
  assert.deepEqual(Object.keys((await rpc(ids[2],'online_rooms'))[0]).sort(),['code','created_at','creator_name','players','room_id'])
  assert.equal((await asUser(ids[2],'select * from public.online_rooms')).rows.length,0)
})
test('public directory orders by room creation and remains thin for anon readers',async()=>{
  const older=await rpc(randomRoomIds[0],'online_room',['create',null,true,'dusseldorf'])
  const newer=await rpc(randomRoomIds[1],'online_room',['create',null,true,'dusseldorf'])
  await admin("update public.online_rooms set created_at=$1,updated_at=clock_timestamp()-interval '1 minute' where id=$2",[new Date('2026-01-01T00:00:00Z'),older.id])
  await admin("update public.online_rooms set created_at=$1,updated_at=clock_timestamp()-interval '2 minutes' where id=$2",[new Date('2026-01-02T00:00:00Z'),newer.id])
  const first=await rpc(ids[2],'online_rooms')
  assert.deepEqual(first.filter(r=>[older.code,newer.code].includes(r.code)).map(r=>r.code),[newer.code,older.code])
  await admin('update public.online_rooms set updated_at=clock_timestamp() where id=$1',[older.id])
  const second=await rpc(ids[2],'online_rooms')
  assert.deepEqual(second.filter(r=>[older.code,newer.code].includes(r.code)).map(r=>r.code),[newer.code,older.code])
  await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon")
  const anonymousDirectory=(await db.query('select public.online_rooms() as result')).rows[0].result
  assert.deepEqual(anonymousDirectory,second)
  const projection=(await db.query('select code,creator_name,players from public.online_public_rooms')).rows
  assert.ok(projection.some(r=>r.code===newer.code))
  assert.deepEqual(Object.keys(projection[0]).sort(),['code','creator_name','players'])
  await assert.rejects(db.query('select * from public.online_profiles'),/permission denied/)
  await assert.rejects(db.query('select * from public.online_rooms'),/permission denied/)
  await assert.rejects(db.query("select public.online_room('join',$1)",[older.code]),/permission denied/)
  await rpc(randomRoomIds[0],'online_room',['leave',older.code]); await rpc(randomRoomIds[1],'online_room',['leave',newer.code])
})
test('private room has an unguessable invite and stays out of directory and raw RLS reads',async()=>{
  const privateRoom=await rpc(ids[3],'online_room',['create',null,false,'dusseldorf'])
  assert.match(privateRoom.code,/^[A-F0-9]{32}$/)
  assert.equal((await rpc(ids[2],'online_rooms')).some(r=>r.code===privateRoom.code),false)
  assert.equal((await rpc(ids[2],'online_room',['get',privateRoom.code])).members[0].profile.display_name,'Chicken 3')
  await rpc(ids[3],'online_room',['leave',privateRoom.code])
})
test('joining another room closes an empty old lobby and preserves one membership on retries',async()=>{
  const old=await rpc(ids[2],'online_room',['create',null,true,'dusseldorf'])
  const target=await rpc(ids[3],'online_room',['create',null,true,'dusseldorf'])
  const before=await rpc(ids[2],'online_profile')
  const joined=await rpc(ids[2],'online_room',['join',target.code,true,'nyc'])
  assert.equal(joined.id,target.id); assert.equal(joined.members.length,2)
  assert.equal((await rpc(ids[2],'online_room',['get'])).id,target.id)
  assert.equal((await rpc(ids[2],'online_room',['get',old.code])).status,'closed')
  assert.equal((await rpc(ids[4],'online_rooms')).some(r=>r.code===old.code),false)
  await rpc(ids[2],'online_room',['ready',target.code])
  const retry=await rpc(ids[2],'online_room',['join',target.code])
  assert.equal(retry.members.filter(m=>m.user_id===ids[2]).length,1)
  assert.equal(retry.members.find(m=>m.user_id===ids[2]).ready,true)
  assert.deepEqual(await rpc(ids[2],'online_profile'),before)
  await rpc(ids[2],'online_room',['leave',target.code]); await rpc(ids[3],'online_room',['leave',target.code])
})
test('room switching replaces the old host, clears readiness and refreshes both directory entries',async()=>{
  const old=await rpc(ids[2],'online_room',['create',null,true,'dusseldorf'])
  await rpc(ids[4],'online_room',['join',old.code]); await rpc(ids[2],'online_room',['ready',old.code])
  const target=await rpc(ids[3],'online_room',['create',null,true,'dusseldorf'])
  await rpc(ids[2],'online_room',['join',target.code])
  const remaining=await rpc(ids[4],'online_room',['get',old.code])
  assert.equal(remaining.host_id,ids[4]); assert.equal(remaining.status,'open')
  assert.deepEqual(remaining.members.map(m=>[m.user_id,m.ready]),[[ids[4],false]])
  const directory=await rpc(ids[4],'online_rooms')
  assert.equal(directory.find(r=>r.code===old.code).players,1)
  assert.equal(directory.find(r=>r.code===old.code).creator_name,'Chicken 4')
  assert.equal(directory.some(r=>r.code===target.code),false)
  await rpc(ids[4],'online_room',['leave',old.code])
  await rpc(ids[2],'online_room',['leave',target.code]); await rpc(ids[3],'online_room',['leave',target.code])
})
test('creating a room closes the previous lobby and clears the remaining participant readiness',async()=>{
  const old=await rpc(ids[2],'online_room',['create',null,true,'dusseldorf'])
  await rpc(ids[4],'online_room',['join',old.code])
  await rpc(ids[2],'online_room',['ready',old.code])
  const next=await rpc(ids[2],'online_room',['create',null,true,'nyc'])
  assert.notEqual(next.id,old.id)
  assert.equal(next.members.length,1)
  assert.equal((await rpc(ids[2],'online_room',['get'])).id,next.id)
  assert.equal((await rpc(ids[2],'online_room',['get',old.code])).status,'closed')
  const closed=await rpc(ids[4],'online_room',['get',old.code])
  assert.equal(closed.status,'closed')
  assert.deepEqual(closed.members.map(member=>[member.user_id,member.ready]),[[ids[4],false]])
  const directory=await rpc(ids[4],'online_rooms')
  assert.equal(directory.some(entry=>entry.code===old.code),false)
  assert.equal(directory.some(entry=>entry.code===next.code),true)
  await rpc(ids[4],'online_room',['leave',old.code])
  assert.equal((await rpc(ids[2],'online_room',['get',old.code])).status,'closed')
  assert.equal((await rpc(ids[4],'online_room',['get',old.code])).status,'closed')
  await rpc(ids[2],'online_room',['leave',next.code])
})
test('failed switch to full, closed, missing or invalid-kit rooms keeps the previous seat and readiness',async()=>{
  const old=await rpc(ids[2],'online_room',['create',null,true,'dusseldorf'])
  await rpc(ids[2],'online_room',['ready',old.code])
  const before=await rpc(ids[2],'online_room',['get'])
  const target=await rpc(ids[3],'online_room',['create',null,true,'dusseldorf'])
  await rpc(ids[4],'online_room',['join',target.code])
  await assert.rejects(rpc(ids[2],'online_room',['join',target.code]),/ROOM_FULL/)
  assert.deepEqual(await rpc(ids[2],'online_room',['get']),before)
  await assert.rejects(rpc(ids[2],'online_room',['join',target.code,true,'invalid']),/INVALID_KIT/)
  await assert.rejects(rpc(ids[2],'online_room',['join','MISSING']),/ROOM_NOT_FOUND/)
  await rpc(ids[4],'online_room',['leave',target.code]); await rpc(ids[3],'online_room',['leave',target.code])
  await assert.rejects(rpc(ids[2],'online_room',['join',target.code]),/ROOM_CLOSED/)
  assert.deepEqual(await rpc(ids[2],'online_room',['get']),before)
  await rpc(ids[2],'online_room',['leave',old.code])
})
test('admission prevents third occupant; host replacement and reload recovery preserve lobby',async()=>{
  room=await rpc(ids[1],'online_room',['join',room.code,true,'new-orleans-1953'])
  assert.equal(room.members.length,2)
  await assert.rejects(rpc(ids[2],'online_room',['join',room.code]),/ROOM_FULL/)
  assert.equal((await rpc(ids[2],'online_rooms')).length,0)
  assert.equal((await rpc(ids[0],'online_room',['get'])).id,room.id)
  await rpc(ids[0],'online_room',['leave',room.code])
  room=await rpc(ids[1],'online_room',['get',room.code]); assert.equal(room.host_id,ids[1]); assert.equal(room.members[0].ready,false)
  room=await rpc(ids[0],'online_room',['join',room.code,true,'dusseldorf'])
})
test('kit changes preserve Ready, explicit cancellation clears it, and both ready players create one initial match',async()=>{
  room=await rpc(ids[0],'online_room',['ready',room.code]); assert.equal(room.members.find(m=>m.user_id===ids[0]).ready,true)
  room=await rpc(ids[0],'online_room',['kit',room.code,true,'dusseldorf']); assert.equal(room.members.find(m=>m.user_id===ids[0]).ready,true)
  room=await rpc(ids[0],'online_room_cancel_ready',[room.code]); assert.equal(room.members.find(m=>m.user_id===ids[0]).ready,false)
  room=await rpc(ids[0],'online_room_cancel_ready',[room.code]); assert.equal(room.members.find(m=>m.user_id===ids[0]).ready,false)
  room=await rpc(ids[0],'online_room',['ready',room.code]); assert.equal(room.members.find(m=>m.user_id===ids[0]).ready,true)
  room=await rpc(ids[1],'online_room',['ready',room.code]); assert.equal(room.status,'playing'); assert.ok(room.match_id)
  assert.equal((await rpc(ids[0],'online_room',['ready',room.code])).match_id,room.match_id)
  match=await rpc(ids[0],'get_online_match',[room.match_id]); assert.equal(match.state.eggs.w,1); assert.equal(match.state.eggs.b,1)
  assert.equal(match.context_city_id,'new-orleans-1953')
  assert.equal((await admin('select count(*)::int as total from public.online_matches where room_id=$1',[room.id])).rows[0].total,1)
  await assert.rejects(rpc(ids[2],'get_online_match',[match.id]),/FORBIDDEN/)
  assert.equal((await rpc(ids[0],'online_running_games'))[0].id,match.id)
})
test('directory reads expire idle lobbies, free their seats and preserve playing rooms',async()=>{
  const idle=await rpc(randomRoomIds[0],'online_room',['create',null,true,'dusseldorf'])
  await admin("update public.online_rooms set updated_at=clock_timestamp()-interval '31 minutes' where id=$1",[idle.id])
  // Cleanup is throttled to once a minute; a read within the minute leaves it.
  await admin("update online_private.maintenance_runs set ran_at=clock_timestamp()")
  assert.equal((await rpc(ids[4],'online_rooms')).some(entry=>entry.code===idle.code),true)
  await admin("update online_private.maintenance_runs set ran_at=clock_timestamp()-interval '2 minutes'")
  const directory=await rpc(ids[4],'online_rooms')
  assert.equal(directory.some(entry=>entry.code===idle.code),false)
  const expired=await rpc(randomRoomIds[0],'online_room',['get',idle.code])
  assert.equal(expired.status,'closed')
  assert.deepEqual(expired.members,[])
  assert.equal(await rpc(randomRoomIds[0],'online_room',['get']),null)
  const replacement=await rpc(randomRoomIds[0],'online_room',['create',null,true,'dusseldorf'])
  assert.notEqual(replacement.id,idle.id,'expiration releases the unique lobby membership')
  assert.equal((await rpc(ids[0],'online_room',['get',room.code])).status,'playing')
  assert.equal((await rpc(ids[0],'get_online_match',[room.match_id])).id,room.match_id)
  await rpc(randomRoomIds[0],'online_room',['leave',replacement.code])
})
test('verified service commit checks membership/version and deduplicates exact command before conflict',async()=>{
  const command={kind:'offer-draw'}; const next={...match.state,drawOffer:match.members.find(m=>m.user_id===ids[0]).color}
  const commandId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  await assert.rejects(service('online_commit_match',[match.id,ids[2],commandId,0,next,command]),/FORBIDDEN/)
  firstReceipt=await service('online_commit_match',[match.id,ids[0],commandId,0,next,command]); assert.equal(firstReceipt.version,1)
  assert.deepEqual(await service('online_commit_match',[match.id,ids[0],commandId,0,next,command]),firstReceipt)
  const receipt=(await admin('select response from public.online_match_commands where match_id=$1 and command_id=$2',[match.id,commandId])).rows[0].response
  assert.deepEqual(Object.keys(receipt).sort(),['id','rematch_id','version']); assert.equal(receipt.version,1)
  await assert.rejects(service('online_commit_match',[match.id,ids[0],commandId,0,next,{kind:'resign'}]),/COMMAND_ID_REUSED/)
  await assert.rejects(service('online_commit_match',[match.id,ids[1],'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',0,next,command]),{message:'VERSION_CONFLICT',code:'PT409'})
})
test('musical params only accept owner identity and do not advance game version',async()=>{
  const own=match.members.find(m=>m.user_id===ids[0]).color; const piece=`${own}:a${own==='w'?1:8}`
  await service('online_commit_piece',[match.id,ids[0],piece,{name:'test'},{gain:1}])
  await assert.rejects(service('online_commit_piece',[match.id,ids[1],piece,{name:'test'},{gain:1}]),/FORBIDDEN/)
  await assert.rejects(service('online_commit_piece',[match.id,ids[0],`${own}:a4`,{},{}]),/FORBIDDEN/)
  const [shared]=await rpc(ids[1],'online_piece_params',[match.id])
  assert.equal(shared.piece_id,piece)
  assert.deepEqual(await rpc(ids[1],'online_piece_params',[match.id,{[piece]:shared.revision}]),[])
  assert.equal((await rpc(ids[1],'online_piece_params',[match.id,{[piece]:shared.revision-1}])).length,1)
  assert.equal(await rpc(ids[1],'online_match_context',[match.id]),match.context_city_id)
  await assert.rejects(rpc(ids[2],'online_match_context',[match.id]),/FORBIDDEN/)
  assert.equal((await rpc(ids[0],'get_online_match',[match.id])).version,1)
  const updates=(await asUser(ids[0],'select * from public.online_match_updates')).rows[0]; assert.equal(updates.params_revision,1)
})
test('result settlement credits only once and never conquers a campaign city',async()=>{
  const baseline=await rpc(ids[0],'online_profile')
  const winner=match.members.find(m=>m.user_id===ids[0]).color
  const next={...match.state,eggs:{w:4,b:4},collected:{w:6,b:6},result:{winner,reason:'resign'}}
  const args=[match.id,ids[1],'cccccccc-cccc-4ccc-8ccc-cccccccccccc',1,next,{kind:'resign'}]
  match=await service('online_commit_match',args); assert.equal(match.version,2)
  const p=await rpc(ids[0],'online_profile'); assert.equal(p.profile.goldenEggs,18); assert.equal(p.profile.points,24); assert.equal(p.profile.winsCount,1); assert.deepEqual(p.profile.conqueredCityIds,[])
  await service('online_commit_match',args); assert.deepEqual((await rpc(ids[0],'online_profile')).profile,p.profile)
  assert.ok(p.profile.updatedAt>baseline.profile.updatedAt)
  await assert.rejects(rpc(ids[0],'online_sync_profile',[baseline.profile.updatedAt,{...baseline.profile,goldenEggs:99},ids[0]]),/PROFILE_CONFLICT/)
  await assert.rejects(service('online_commit_match',[match.id,ids[0],'dddddddd-dddd-4ddd-8ddd-dddddddddddd',2,{...next,result:null},{kind:'undo'}]),/MATCH_FINISHED/)
  const retry=await service('online_commit_match',[match.id,ids[0],'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0,{}, {kind:'offer-draw'}]); assert.equal(retry.version,2); assert.deepEqual(retry.state.result,next.result)
  assert.equal((await admin('select response from public.online_match_commands where command_id=$1',['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'])).rows[0].response.version,1)
})
test('opposing rematch starts exactly one fresh reversed match with retained context',async()=>{
  const offering=match.members.find(m=>m.user_id===ids[0]).color
  match=await service('online_commit_match',[match.id,ids[0],'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',2,{...match.state,rematchOffer:offering},{kind:'offer-rematch'}])
  const args=[match.id,ids[1],'ffffffff-ffff-4fff-8fff-ffffffffffff',3,{...match.state,rematchOffer:null},{kind:'accept-rematch'}]
  const rematchResponse=await service('online_commit_match',args); assert.ok(rematchResponse.rematch_id)
  assert.deepEqual(await service('online_commit_match',args),rematchResponse)
  const rematch=await rpc(ids[0],'get_online_match',[rematchResponse.rematch_id]); assert.equal(rematch.version,0); assert.deepEqual(rematch.state.actions,[]); assert.equal(rematch.state.eggs.w,1); assert.equal(rematch.context_city_id,match.context_city_id)
  assert.notEqual(rematch.members.find(m=>m.user_id===ids[0]).color,offering)
})
test('friend requests require recipient acceptance; inverse send is not automatic acceptance',async()=>{
  let list=await rpc(ids[2],'online_friends',['request',profiles[3].code]); const id=list[0].id
  list=await rpc(ids[3],'online_friends',['request',profiles[2].code]); assert.equal(list[0].status,'pending'); assert.equal(list[0].sender_id,ids[2])
  await assert.rejects(rpc(ids[2],'online_friends',['accept',null,id]),/FORBIDDEN/)
  assert.equal((await rpc(ids[4],'online_friends')).length,0)
  await assert.rejects(rpc(ids[4],'online_friends',['accept',null,id]),/FRIEND_NOT_FOUND/)
  assert.equal((await rpc(ids[3],'online_friends',['accept',null,id]))[0].status,'accepted')
  await rpc(ids[2],'online_friends',['remove',null,id]); assert.equal((await rpc(ids[3],'online_friends')).length,0)
  assert.equal((await asUser(ids[3],'select * from public.online_social_updates')).rows.length,1)
  await assert.rejects(rpc(ids[2],'online_friends',['request',profiles[2].code]),/SELF_REQUEST/)
})
test('transfer retains selected save without summing, migrates social relations and retires source once',async()=>{
  const targetBefore=await rpc(ids[4],'online_profile')
  await rpc(ids[2],'online_friends',['request',profiles[3].code])
  const target=await service('online_transfer_profile',[ids[2],ids[4],'source']); assert.equal(target.id,ids[4]); assert.equal(target.profile.goldenEggs,10)
  assert.equal(target.baptismal_name,targetBefore.baptismal_name)
  assert.equal(target.display_name,targetBefore.display_name)
  assert.equal((await rpc(ids[4],'online_friends'))[0].status,'pending')
  assert.deepEqual(await service('online_transfer_profile',[ids[2],ids[4],'target']),target)
  await assert.rejects(rpc(ids[2],'online_profile'),/TRANSFERRED/)
  assert.equal((await admin('select count(*)::int as total from online_private.profile_transfers')).rows[0].total,1)
})
test('private presence and piece broadcasts accept only match members',async()=>{
  await admin("select set_config('realtime.topic',$1,false)",[`match:${match.id}`])
  await asUser(ids[0],"insert into realtime.messages(extension) values('presence')")
  await asUser(ids[0],"insert into realtime.messages(extension) values('broadcast')")
  await assert.rejects(asUser(ids[0],"insert into realtime.messages(extension) values('postgres_changes')"),/row-level security/)
  await assert.rejects(asUser(ids[3],"insert into realtime.messages(extension) values('presence')"),/row-level security/)
  await assert.rejects(asUser(ids[3],"insert into realtime.messages(extension) values('broadcast')"),/row-level security/)
})

async function settlementFixture() {
  const players=[randomUUID(),randomUUID()]
  const before={}
  for(const id of players) {
    await admin('insert into auth.users(id) values($1)',[id])
    before[id]=await rpc(id,'online_profile',[{profileVersion:1,goldenEggs:20,points:34,winsCount:2,conqueredCityIds:['dusseldorf'],gameplayTipSeen:true,moveRewardNotices:{best:true,worst:false}}])
  }
  let lobby=await rpc(players[0],'online_room',['create',null,true,'nyc'])
  lobby=await rpc(players[1],'online_room',['join',lobby.code,true,'chicago'])
  lobby=await rpc(players[0],'online_room',['ready',lobby.code])
  lobby=await rpc(players[1],'online_room',['ready',lobby.code])
  return {players,before,initial:await rpc(players[0],'get_online_match',[lobby.match_id])}
}

for(const scenario of [
  {label:'white win takes both unequal balances',winner:'w',eggs:{w:3,b:8},reward:{w:11,b:0}},
  {label:'black win takes both unequal balances',winner:'b',eggs:{w:3,b:8},reward:{w:0,b:11}},
  {label:'draw splits an even unequal pool',winner:null,eggs:{w:2,b:8},reward:{w:5,b:5}},
  {label:'draw gives black the remaining egg of an odd pool',winner:null,eggs:{w:1,b:8},reward:{w:4,b:5}},
  {label:'draw with no remaining eggs still adds each own collected bonus',winner:null,eggs:{w:0,b:0},reward:{w:0,b:0}},
]) test(`pooled settlement: ${scenario.label}, preserves progress and retries once`,async()=>{
  const {players,before,initial}=await settlementFixture()
  const collected={w:6,b:2}
  const state={...initial.state,eggs:scenario.eggs,collected,result:{winner:scenario.winner,reason:scenario.winner?'resign':'agreement'}}
  const command={kind:scenario.winner?'resign':'accept-draw'}
  const args=[initial.id,players[0],randomUUID(),0,state,command]
  const settled=await service('online_commit_match',args)
  assert.equal(settled.version,1)
  assert.deepEqual(settled.state,state)
  const credited={}
  for(const member of initial.members) {
    const baseline=before[member.user_id].profile
    const profile=(await rpc(member.user_id,'online_profile')).profile
    const receives=scenario.winner===null || scenario.winner===member.color
    const amount=scenario.reward[member.color]
    const points=baseline.points+amount+(receives?collected[member.color]:0)
    credited[member.user_id]=profile
    assert.equal(profile.goldenEggs,baseline.goldenEggs+amount)
    assert.equal(profile.points,points)
    assert.equal(profile.winsCount,baseline.winsCount+(scenario.winner===member.color?1:0))
    assert.equal(profile.rank,points>=40?'Rhythm Apprentice':'Novice Beatmaker')
    assert.deepEqual(profile.conqueredCityIds,baseline.conqueredCityIds)
    assert.deepEqual(profile.moveRewardNotices,baseline.moveRewardNotices)
    assert.equal(profile.gameplayTipSeen,baseline.gameplayTipSeen)
    if(receives) assert.ok(profile.updatedAt>baseline.updatedAt)
    else assert.deepEqual(profile,baseline)
    const official=(await admin('select golden_eggs,points,wins_count from public.online_profiles where id=$1',[member.user_id])).rows[0]
    assert.equal(Number(official.golden_eggs),profile.goldenEggs)
    assert.equal(Number(official.points),profile.points)
    assert.equal(Number(official.wins_count),profile.winsCount)
  }
  assert.equal(initial.members.reduce((total,m)=>total+credited[m.user_id].goldenEggs-before[m.user_id].profile.goldenEggs,0),scenario.eggs.w+scenario.eggs.b)
  const settledAt=(await admin('select settled_at from public.online_matches where id=$1',[initial.id])).rows[0].settled_at
  assert.ok(settledAt)
  assert.deepEqual(await service('online_commit_match',args),settled)
  await assert.rejects(service('online_commit_match',[...args.slice(0,5),{kind:'undo'}]),/COMMAND_ID_REUSED/)
  await assert.rejects(service('online_commit_match',[initial.id,players[1],randomUUID(),1,state,command]),/MATCH_FINISHED/)
  for(const id of players) assert.deepEqual((await rpc(id,'online_profile')).profile,credited[id])
  assert.equal((await rpc(players[1],'get_online_match',[initial.id])).version,1)
  assert.equal((await admin('select count(*)::int as count from public.online_match_commands where match_id=$1',[initial.id])).rows[0].count,1)
  assert.deepEqual((await admin('select settled_at from public.online_matches where id=$1',[initial.id])).rows[0].settled_at,settledAt)
})

test('pooled settlement rejects invalid other-side eggs and draw bonuses without any partial credit',async()=>{
  const {players,before,initial}=await settlementFixture()
  const invalid=[
    {eggs:{w:3,b:-1},collected:{w:6,b:2},result:{winner:'w',reason:'resign'}},
    {eggs:{w:3,b:1.5},collected:{w:6,b:2},result:{winner:'w',reason:'resign'}},
    {eggs:{w:3,b:8},collected:{w:6,b:-2},result:{winner:null,reason:'agreement'}},
  ]
  for(const result of invalid) {
    await assert.rejects(service('online_commit_match',[initial.id,players[0],randomUUID(),0,{...initial.state,...result},{kind:'resign'}]),/INVALID_RESULT/)
    for(const id of players) assert.deepEqual((await rpc(id,'online_profile')),before[id])
    assert.deepEqual(await rpc(players[0],'get_online_match',[initial.id]),initial)
    const stored=(await admin('select settled_at from public.online_matches where id=$1',[initial.id])).rows[0]
    assert.equal(stored.settled_at,null)
    assert.equal((await admin('select count(*)::int as count from public.online_match_commands where match_id=$1',[initial.id])).rows[0].count,0)
  }
})

async function freshOnlinePlayers(count) {
  const players=Array.from({length:count},()=>randomUUID())
  for(const id of players) {
    await admin('insert into auth.users(id) values($1)',[id])
    await rpc(id,'online_profile',[null,`Player ${id.slice(0,8)}`])
  }
  return players
}
async function startOnlineMatch(players,city='nyc') {
  let lobby=await rpc(players[0],'online_room',['create',null,true,city])
  await rpc(players[1],'online_room',['join',lobby.code,true,'chicago'])
  await rpc(players[0],'online_room',['ready',lobby.code])
  lobby=await rpc(players[1],'online_room',['ready',lobby.code])
  return {lobby:await rpc(players[0],'online_room',['get',lobby.code]),initial:await rpc(players[0],'get_online_match',[lobby.match_id])}
}
async function runningRevision(user) {
  const rows=(await asUser(user,'select revision from public.online_running_game_updates where user_id=$1',[user])).rows
  return rows[0]?.revision
}

test('creating and joining new lobbies preserves several active matches and both players can still commit',async()=>{
  const players=await freshOnlinePlayers(4)
  const first=await startOnlineMatch(players.slice(0,2))
  const firstBefore=await rpc(players[1],'get_online_match',[first.initial.id])
  const second=await startOnlineMatch([players[0],players[2]],'dusseldorf')
  const oldLobby=await rpc(players[1],'online_room',['get',first.lobby.code])
  assert.equal(oldLobby.status,'playing')
  assert.equal(oldLobby.host_id,players[0])
  assert.equal(oldLobby.match_id,first.initial.id)
  assert.equal(oldLobby.members.length,1)
  assert.equal(oldLobby.members[0].ready,true)
  assert.deepEqual(await rpc(players[1],'get_online_match',[first.initial.id]),firstBefore)
  assert.deepEqual(new Set((await rpc(players[0],'online_running_games')).map(g=>g.id)),new Set([first.initial.id,second.initial.id]))
  const thirdLobby=await rpc(players[3],'online_room',['create',null,false,'nyc'])
  const third=await rpc(players[0],'online_room',['join',thirdLobby.code])
  assert.equal(third.id,thirdLobby.id)
  assert.equal((await rpc(players[2],'online_room',['get',second.lobby.code])).status,'playing')
  assert.equal((await rpc(players[2],'online_room',['get',second.lobby.code])).members[0].ready,true)
  const recoveredSecond=await rpc(players[2],'get_online_match',[second.initial.id])
  assert.equal(recoveredSecond.id,second.initial.id)
  assert.equal(recoveredSecond.version,second.initial.version)
  assert.deepEqual(recoveredSecond.state,second.initial.state)
  assert.deepEqual(recoveredSecond.members.map(({user_id,color,city_id})=>({user_id,color,city_id})),second.initial.members.map(({user_id,color,city_id})=>({user_id,color,city_id})))
  const firstCommit=await service('online_commit_match',[first.initial.id,players[1],randomUUID(),0,{...first.initial.state,drawOffer:first.initial.members.find(m=>m.user_id===players[1]).color},{kind:'offer-draw'}])
  const secondCommit=await service('online_commit_match',[first.initial.id,players[0],randomUUID(),1,{...firstCommit.state,drawOffer:null},{kind:'decline-draw'}])
  assert.equal(secondCommit.version,2)
  assert.equal((await rpc(players[1],'get_online_match',[first.initial.id])).version,2)
  assert.equal((await rpc(players[0],'online_room',['get'])).id,thirdLobby.id)
  assert.equal((await admin('select count(*)::int as count from public.online_room_members where user_id=$1',[players[0]])).rows[0].count,1)
})

test('leaving every lobby slot of an unfinished match preserves its playing room and durable membership',async()=>{
  const players=await freshOnlinePlayers(3)
  const {lobby,initial}=await startOnlineMatch(players.slice(0,2))
  const otherInitial=await rpc(players[1],'get_online_match',[initial.id])
  await rpc(players[0],'online_room',['leave',lobby.code])
  assert.equal(await rpc(players[0],'online_room',['get']),null)
  const remaining=await rpc(players[1],'online_room',['get',lobby.code])
  assert.equal(remaining.status,'playing')
  assert.equal(remaining.members[0].ready,true)
  await rpc(players[1],'online_room',['leave',lobby.code])
  const empty=await rpc(players[0],'online_room',['get',lobby.code])
  assert.equal(empty.status,'playing')
  assert.equal(empty.members.length,0)
  assert.equal(empty.match_id,initial.id)
  assert.deepEqual(await rpc(players[0],'get_online_match',[initial.id]),initial)
  assert.deepEqual(await rpc(players[1],'get_online_match',[initial.id]),otherInitial)
  assert.equal((await rpc(players[0],'online_running_games'))[0].id,initial.id)
  assert.equal((await rpc(players[1],'online_running_games'))[0].id,initial.id)
  assert.equal((await rpc(players[2],'online_rooms')).some(r=>r.code===lobby.code),false)
})

test('failed admission and failed creation roll back active lobby slots and preserve match state',async()=>{
  const players=await freshOnlinePlayers(4)
  const {lobby,initial}=await startOnlineMatch(players.slice(0,2))
  const otherInitial=await rpc(players[1],'get_online_match',[initial.id])
  const target=await rpc(players[2],'online_room',['create',null,true,'nyc'])
  await rpc(players[3],'online_room',['join',target.code])
  const revision=await runningRevision(players[0])
  for(const attempt of [
    ['join',target.code,true,'nyc'],['join','MISSING'],['create',null,true,'invalid'],
  ]) {
    await assert.rejects(rpc(players[0],'online_room',attempt),/ROOM_FULL|ROOM_NOT_FOUND|INVALID_KIT/)
    assert.deepEqual(await rpc(players[0],'online_room',['get']),lobby)
    assert.deepEqual(await rpc(players[0],'get_online_match',[initial.id]),initial)
    assert.equal(await runningRevision(players[0]),revision)
  }
  // Fail after detachment to exercise transaction rollback, not only preflight.
  await admin("create function public.test_reject_room_insert() returns trigger language plpgsql as $$ begin raise exception 'TEST_CREATION_FAILED'; end $$")
  await admin('create trigger test_reject_room_insert before insert on public.online_rooms for each row execute function public.test_reject_room_insert()')
  try {
    await assert.rejects(rpc(players[0],'online_room',['create',null,true,'nyc']),/TEST_CREATION_FAILED/)
    assert.deepEqual(await rpc(players[0],'online_room',['get']),lobby)
    assert.deepEqual(await rpc(players[1],'get_online_match',[initial.id]),otherInitial)
  } finally {
    await admin('drop trigger test_reject_room_insert on public.online_rooms')
    await admin('drop function public.test_reject_room_insert()')
  }
})

test('running games exposes caller metadata only, derives turn from moves, orders stably and removes results',async()=>{
  const players=await freshOnlinePlayers(4)
  const first=await startOnlineMatch(players.slice(0,2))
  const second=await startOnlineMatch([players[0],players[2]],'dusseldorf')
  const commonTime=new Date('2026-10-09T12:00:00Z')
  await admin('update public.online_matches set updated_at=$1 where id in($2,$3)',[commonTime,first.initial.id,second.initial.id])
  let list=await rpc(players[0],'online_running_games')
  assert.deepEqual(list.map(g=>g.id),[first.initial.id,second.initial.id].sort())
  for(const row of list) {
    assert.deepEqual(Object.keys(row).sort(),['actions','color','context_city_id','id','opponent','turn','updated_at'])
    assert.deepEqual(Object.keys(row.opponent).sort(),['display_name','id'])
    const initial=row.id===first.initial.id?first.initial:second.initial
    assert.equal(row.color,initial.members.find(m=>m.user_id===players[0]).color)
    assert.equal(row.turn,'w')
    assert.equal(row.context_city_id,initial.context_city_id)
    assert.equal(row.opponent.id,initial.members.find(m=>m.user_id!==players[0]).user_id)
    assert.equal(row.opponent.display_name,(await rpc(row.opponent.id,'online_profile')).display_name)
  }
  const delta=await rpc(players[0],'online_running_games',[{[list[0].id]:list[0].updated_at,[list[1].id]:'2000-01-01T00:00:00+00:00'}])
  assert.deepEqual(delta.map(g=>g.id),list.map(g=>g.id))
  assert.equal('actions' in delta[0],false)
  assert.deepEqual(delta[1].actions,list[1].actions)
  assert.deepEqual((await rpc(players[1],'online_running_games')).map(g=>g.id),[first.initial.id])
  assert.deepEqual((await rpc(players[2],'online_running_games')).map(g=>g.id),[second.initial.id])
  assert.deepEqual(await rpc(players[3],'online_running_games'),[])
  const power={kind:'power',power:'shield',square:'e4',color:'w',id:1}
  const powered=await service('online_commit_match',[first.initial.id,players[0],randomUUID(),0,{...first.initial.state,actions:[power]},{kind:'power',power:'shield',square:'e4'}])
  assert.equal((await rpc(players[0],'online_running_games'))[0].id,first.initial.id)
  assert.equal((await rpc(players[0],'online_running_games'))[0].turn,'w')
  const move={kind:'move',from:'e2',to:'e4',color:'w',san:'e4'}
  const moved=await service('online_commit_match',[first.initial.id,players[0],randomUUID(),1,{...powered.state,actions:[power,move]},{kind:'move',from:'e2',to:'e4'}])
  assert.equal((await rpc(players[0],'online_running_games'))[0].turn,'b')
  const undone=await service('online_commit_match',[first.initial.id,players[0],randomUUID(),2,{...moved.state,actions:[power],redo:{actor:'w',actions:[move]}},{kind:'undo'}])
  assert.equal((await rpc(players[0],'online_running_games'))[0].turn,'w')
  await service('online_commit_match',[first.initial.id,players[1],randomUUID(),3,{...undone.state,result:{winner:null,reason:'agreement'}},{kind:'accept-draw'}])
  assert.deepEqual((await rpc(players[0],'online_running_games')).map(g=>g.id),[second.initial.id])
  assert.deepEqual(await rpc(players[1],'online_running_games'),[])
  await assert.rejects(rpc(null,'online_running_games'),/UNAUTHORIZED/)
  await admin("select set_config('request.jwt.claim.sub',$1,false)",[players[0]])
  await db.exec('set role anon')
  await assert.rejects(db.query('select public.online_running_games()'),/permission denied/)
  await assert.rejects(db.query('select * from public.online_running_game_updates'),/permission denied/)
})

test('rematch restores a departed finished room without stealing either unrelated open lobby',async()=>{
  const players=await freshOnlinePlayers(2)
  const {lobby,initial}=await startOnlineMatch(players)
  const settled=await service('online_commit_match',[initial.id,players[0],randomUUID(),0,{...initial.state,result:{winner:'w',reason:'resign'}},{kind:'resign'}])
  const ownLobby=await rpc(players[0],'online_room',['create',null,false,'dusseldorf'])
  const otherLobby=await rpc(players[1],'online_room',['create',null,true,'nyc'])
  const ownReady=await rpc(players[0],'online_room',['ready',ownLobby.code])
  const otherReady=await rpc(players[1],'online_room',['ready',otherLobby.code])
  assert.equal((await rpc(players[0],'online_room',['get',lobby.code])).status,'closed')
  const offering=initial.members.find(m=>m.user_id===players[0]).color
  const offered=await service('online_commit_match',[initial.id,players[0],randomUUID(),1,{...settled.state,rematchOffer:offering},{kind:'offer-rematch'}])
  const args=[initial.id,players[1],randomUUID(),2,{...offered.state,rematchOffer:null},{kind:'accept-rematch'}]
  const accepted=await service('online_commit_match',args)
  assert.ok(accepted.rematch_id)
  assert.deepEqual(await service('online_commit_match',args),accepted)
  assert.deepEqual(await rpc(players[0],'online_room',['get']),ownReady)
  assert.deepEqual(await rpc(players[1],'online_room',['get']),otherReady)
  const restored=await rpc(players[0],'online_room',['get',lobby.code])
  assert.equal(restored.status,'playing')
  assert.equal(restored.match_id,accepted.rematch_id)
  assert.equal(restored.members.length,0)
  const rematch=await rpc(players[0],'get_online_match',[accepted.rematch_id])
  assert.equal(rematch.context_city_id,initial.context_city_id)
  for(const member of initial.members) {
    const next=rematch.members.find(m=>m.user_id===member.user_id)
    assert.equal(next.color,member.color==='w'?'b':'w')
    assert.equal(next.city_id,member.city_id)
    assert.deepEqual((await rpc(member.user_id,'online_running_games')).map(g=>g.id),[rematch.id])
  }
  assert.equal((await admin('select count(*)::int as count from public.online_matches where room_id=$1',[lobby.id])).rows[0].count,2)
  assert.equal((await rpc(players[0],'online_rooms')).some(r=>r.code===otherLobby.code),true)
  assert.equal((await rpc(players[0],'online_rooms')).some(r=>r.code===lobby.code),false)
})

test('running game revisions cover new membership and offscreen commits with caller-only read and rollback',async()=>{
  const players=await freshOnlinePlayers(3)
  const {initial}=await startOnlineMatch(players.slice(0,2))
  const before=[await runningRevision(players[0]),await runningRevision(players[1])]
  assert.ok(before.every(revision=>revision>=1))
  const read=(await asUser(players[0],'select user_id from public.online_running_game_updates')).rows
  assert.deepEqual(read.map(row=>row.user_id),[players[0]])
  assert.equal((await asUser(players[2],'select user_id from public.online_running_game_updates')).rows.length,0)
  await assert.rejects(asUser(players[0],'update public.online_running_game_updates set revision=0'),/permission denied/)
  const published=(await admin("select tablename from pg_publication_tables where pubname='supabase_realtime' and tablename='online_running_game_updates'")).rows
  assert.equal(published.length,1)
  await rpc(players[0],'online_room',['create',null,false,'dusseldorf'])
  await service('online_commit_match',[initial.id,players[1],randomUUID(),0,{...initial.state,drawOffer:initial.members.find(m=>m.user_id===players[1]).color},{kind:'offer-draw'}])
  const updated=[await runningRevision(players[0]),await runningRevision(players[1])]
  assert.ok(updated.every((revision,index)=>revision>before[index]))
  await assert.rejects(service('online_commit_match',[initial.id,players[1],randomUUID(),1,{...initial.state,eggs:{w:1,b:-1},result:{winner:'w',reason:'resign'}},{kind:'resign'}]),/INVALID_RESULT/)
  assert.deepEqual([await runningRevision(players[0]),await runningRevision(players[1])],updated)
  assert.equal((await rpc(players[0],'get_online_match',[initial.id])).version,1)
})
test('creative kits are private to the signed-in owner, upsert by name and refuse guests',async()=>{
  const [owner,other]=[ids[3],ids[4]]
  const kit=(name,bpm)=>({name,bpm,version:7})
  assert.deepEqual(await rpc(owner,'creative_kits'),[])
  await rpc(owner,'creative_kit_save',['Groove',kit('Groove',120)])
  await rpc(owner,'creative_kit_save',['Groove',kit('Groove',128)])
  const listed=await rpc(owner,'creative_kits')
  assert.deepEqual(listed.map(row=>row.name),['Groove'])
  assert.equal((await rpc(owner,'creative_kit',['Groove'])).bpm,128)
  assert.equal(await rpc(other,'creative_kit',['Groove']),null)
  assert.deepEqual(await rpc(other,'creative_kits'),[])
  await assert.rejects(rpc(owner,'creative_kit_save',['Other',kit('Mismatch',1)]),/INVALID_KIT/)
  await assert.rejects(asUser(owner,'select * from online_private.creative_kits'),/permission denied/)
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({is_anonymous:true})])
  try { await assert.rejects(rpc(other,'creative_kit_save',['Guest',kit('Guest',1)]),/ACCOUNT_REQUIRED/) }
  finally { await db.query("select set_config('request.jwt.claims','',false)") }
})
test('chicken config: anyone reads, only the admin saves, with revision check and history',async()=>{
  const [owner,other]=[ids[3],ids[4]]
  const claims=value=>db.query("select set_config('request.jwt.claims',$1,false)",[value?JSON.stringify(value):''])
  const cfg=walkSpeed=>({params:{walkSpeed},look:{comb:'caipira'}})
  await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub','',false)"); await db.exec('set role anon')
  assert.equal((await db.query('select public.chicken_config() as result')).rows[0].result,null)
  await assert.rejects(db.query('select public.chicken_config_save($1,0)',[cfg(1)]),/permission denied/)
  await assert.rejects(rpc(other,'chicken_config_save',[cfg(1),0]),/ADMIN_REQUIRED/)
  try {
    await claims({is_anonymous:true,app_metadata:{access_level:'admin'}})
    await assert.rejects(rpc(other,'chicken_config_save',[cfg(1),0]),/ADMIN_REQUIRED/)
    await claims({app_metadata:{access_level:'admin'}})
    await assert.rejects(rpc(owner,'chicken_config_save',[{params:{}},0]),/INVALID_CONFIG/)
    const first=await rpc(owner,'chicken_config_save',[cfg(200),0])
    assert.equal(first.revision,1)
    await assert.rejects(rpc(owner,'chicken_config_save',[cfg(210),0]),/CONFIG_CONFLICT/)
    assert.equal((await rpc(owner,'chicken_config_save',[cfg(220),1])).revision,2)
  } finally { await claims(null) }
  const read=await rpc(other,'chicken_config')
  assert.equal(read.revision,2)
  assert.equal(read.config.params.walkSpeed,220)
  // egress: the cached revision is still current, so only the revision comes back
  assert.deepEqual(Object.keys(await rpc(other,'chicken_config',[2])).sort(),['revision','updated_at'])
  assert.equal((await rpc(other,'chicken_config',[1])).config.params.walkSpeed,220)
  await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub','',false)"); await db.exec('set role anon')
  assert.equal((await db.query('select public.chicken_config(2) as result')).rows[0].result.config,undefined)
  await assert.rejects(asUser(other,'select * from online_private.chicken_config'),/permission denied/)
  assert.equal((await admin('select count(*)::int as n from online_private.chicken_config_history')).rows[0].n,2)
})
test('patio: the layout is left out when the caller already holds that revision',async()=>{
  const [owner,other]=[ids[3],ids[4]]
  const id='b1000000-0000-4000-8000-000000000001'
  const layout={elements:[{id:'a',kind:'box',x:1,y:2}]}
  assert.equal((await rpc(owner,'patio_lobby_save',[id,layout,0])).revision,1)
  assert.equal((await rpc(owner,'patio_lobby_save',[id,layout,1])).revision,2)
  const full=await rpc(other,'patio_lobby_get',[id])
  assert.deepEqual(full.layout,layout)
  const lean=await rpc(other,'patio_lobby_get',[id,2])
  assert.equal(lean.layout,undefined)
  assert.deepEqual({...lean,layout:full.layout},full)
  assert.deepEqual((await rpc(other,'patio_lobby_get',[id,1])).layout,layout)
  try {
    await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({app_metadata:{access_level:'admin'}})])
    await rpc(owner,'patio_lobby_set_default',[id])
  } finally { await db.query("select set_config('request.jwt.claims','',false)") }
  assert.deepEqual((await rpc(other,'patio_default')).layout,layout)
  assert.equal((await rpc(other,'patio_default',[id,2])).layout,undefined)
  assert.deepEqual((await rpc(other,'patio_default',[id,1])).layout,layout)
  assert.deepEqual((await rpc(other,'patio_default',[ids[0],2])).layout,layout)
  await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub','',false)"); await db.exec('set role anon')
  assert.equal((await db.query('select public.patio_lobby_get($1,2) as result',[id])).rows[0].result.layout,undefined)
})
