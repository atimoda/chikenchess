/** Real PostgreSQL execution through PGlite, isolated from production.
 * Supply ONLINE_TEST_MODULES=/tmp/chicken-online-db-test when PGlite is installed
 * there. Auth/Realtime stubs test SQL permissions, not hosted Auth/WebSockets. */
/* global process, __dirname */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require(require.resolve('@electric-sql/pglite', { paths: [process.env.ONLINE_TEST_MODULES || process.cwd()] }))
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555']
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
  for (const id of ids) await db.query('insert into auth.users(id) values($1)',[id])
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
  await assert.rejects(asUser(ids[0],'select * from online_private.profile_saves'),/permission denied/)
  await assert.rejects(asUser(ids[0],'select * from public.online_match_commands'),/permission denied/)
  await assert.rejects(asUser(ids[0],"select public.online_commit_match(null,null,null,0,'{}','{}')"),/permission denied/)
  await db.exec('reset role; set role anon'); await assert.rejects(db.query('select public.online_rooms()'),/permission denied/)
})
test('server preset allowlist matches the shipped city catalog and rejects unknown kits',async()=>{
  const { loadTs }=require('../../tests/helpers/music.cjs')
  const catalog=loadTs('lib/cities-data.ts').cities.map(c=>c.id).sort()
  assert.deepEqual((await admin('select id from online_private.kit_catalog order by id')).rows.map(r=>r.id),catalog)
  await assert.rejects(rpc(ids[0],'online_room',['create',null,true,'nonexistent-city']),/INVALID_KIT/)
})
test('unrelated profiles are hidden; public directory contains only open vacancies',async()=>{
  assert.equal((await asUser(ids[2],'select * from public.online_profiles')).rows.length,1)
  room=await rpc(ids[0],'online_room',['create',null,true,'dusseldorf'])
  assert.equal((await rpc(ids[2],'online_rooms')).length,1)
  assert.deepEqual(Object.keys((await rpc(ids[2],'online_rooms'))[0]).sort(),['code','creator_name','players'])
  assert.equal((await asUser(ids[2],'select * from public.online_rooms')).rows.length,0)
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
test('kit changes reset own Ready and both Ready calls create only one initial match',async()=>{
  await rpc(ids[0],'online_room',['ready',room.code])
  room=await rpc(ids[0],'online_room',['kit',room.code,true,'dusseldorf']); assert.equal(room.members.find(m=>m.user_id===ids[0]).ready,false)
  await rpc(ids[0],'online_room',['ready',room.code])
  room=await rpc(ids[1],'online_room',['ready',room.code]); assert.equal(room.status,'playing'); assert.ok(room.match_id)
  assert.equal((await rpc(ids[0],'online_room',['ready',room.code])).match_id,room.match_id)
  match=await rpc(ids[0],'get_online_match',[room.match_id]); assert.equal(match.state.eggs.w,1); assert.equal(match.state.eggs.b,1)
  assert.equal(match.context_city_id,'new-orleans-1953')
  assert.equal((await admin('select count(*)::int as total from public.online_matches')).rows[0].total,1)
  await assert.rejects(rpc(ids[2],'get_online_match',[match.id]),/FORBIDDEN/)
  await assert.rejects(rpc(ids[0],'online_room',['leave',room.code]),/ACTIVE_MATCH/)
  const other=await rpc(ids[2],'online_room',['create',null,true,'dusseldorf'])
  await assert.rejects(rpc(ids[0],'online_room',['join',other.code]),/ACTIVE_MATCH/)
  assert.equal((await rpc(ids[0],'online_room',['get'])).match_id,room.match_id)
  assert.equal((await rpc(ids[2],'online_room',['get'])).members.length,1)
  await rpc(ids[2],'online_room',['leave',other.code])
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
  assert.equal((await rpc(ids[1],'online_piece_params',[match.id])).length,1)
  assert.equal((await rpc(ids[0],'get_online_match',[match.id])).version,1)
  const updates=(await asUser(ids[0],'select * from public.online_match_updates')).rows[0]; assert.equal(updates.params_revision,1)
})
test('result settlement credits only once and never conquers a campaign city',async()=>{
  const baseline=await rpc(ids[0],'online_profile')
  const winner=match.members.find(m=>m.user_id===ids[0]).color
  const next={...match.state,eggs:{w:4,b:4},collected:{w:6,b:6},result:{winner,reason:'resign'}}
  const args=[match.id,ids[1],'cccccccc-cccc-4ccc-8ccc-cccccccccccc',1,next,{kind:'resign'}]
  match=await service('online_commit_match',args); assert.equal(match.version,2)
  const p=await rpc(ids[0],'online_profile'); assert.equal(p.profile.goldenEggs,14); assert.equal(p.profile.points,20); assert.equal(p.profile.winsCount,1); assert.deepEqual(p.profile.conqueredCityIds,[])
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
test('private presence accepts only match members and rejects broadcast and other users',async()=>{
  await admin("select set_config('realtime.topic',$1,false)",[`match:${match.id}`])
  await asUser(ids[0],"insert into realtime.messages(extension) values('presence')")
  await assert.rejects(asUser(ids[0],"insert into realtime.messages(extension) values('broadcast')"),/row-level security/)
  await assert.rejects(asUser(ids[3],"insert into realtime.messages(extension) values('presence')"),/row-level security/)
})
