const {test}=require('node:test')
const assert=require('node:assert/strict')
const {loadTs}=require('./helpers/music.cjs')
const {createCombat}=loadTs('lib/pigchicken/combat.ts')
const L=loadTs('lib/pigchicken/layout.ts')
const {createLayoutSync}=loadTs('lib/pigchicken/layout-sync.ts')
const {rackRespawnDelay}=loadTs('lib/pigchicken/racks.ts')
const body={x:0,y:1000,face:1,scale:1,grounded:true,state:'idle',vx:0}
const input={fire:false,firePressed:false,melee:false,throwHeld:false,throwReleased:false,reload:false,pick:0,slot:0}
const step=(c,dt,over={},world=true)=>c.step(dt,body,{x:0,y:0},{x:0,y:0},0,{...input,...over},[],1000,()=>{},{world})

test('rack defaults are 0.1 seconds for every consumable and 2 seconds for weapons/instruments, including older layouts',()=>{
  for(const [item,delay] of [['maryjane',.1],['cok',.1],['pistol',2],['violin',2]]){
    assert.equal(rackRespawnDelay(item),delay)
    assert.equal(L.createElement('rack',0,0,{item}).params.respawnDelay,delay)
    assert.equal(L.normalizeElement({kind:'rack',params:{item}}).params.respawnDelay,delay)
  }
  for(const r of L.defaultLayout().elements.filter(e=>e.kind==='rack')) assert.equal(r.params.respawnDelay,rackRespawnDelay(r.params.item))
})

test('custom rack delays survive persistence, zero is valid, and invalid values fall back or clamp',()=>{
  const el=L.createElement('rack',100,200,{item:'cok',respawnDelay:4.5})
  const out=L.normalizeLayout(JSON.parse(JSON.stringify({v:L.LAYOUT_VERSION,elements:[el]})))
  assert.equal(out.elements[0].params.respawnDelay,4.5)
  assert.equal(rackRespawnDelay('pistol',0),0)
  assert.equal(rackRespawnDelay('pistol',-1),0)
  assert.equal(rackRespawnDelay('cok',Infinity),.1)
  assert.equal(rackRespawnDelay('pistol',999),300)
})

test('a rack waits its configured interval after the player picks up its item',()=>{
  const c=createCombat();c.addRack(0,'pistol',1000,.5)
  step(c,.49);assert.equal(c.pickups.length,0)
  step(c,.01);assert.equal(c.pickups.length,1)
  const first=c.pickups[0].id
  step(c,.01,{grab:true});assert.equal(c.held.item,'pistol');assert.equal(c.pickups.length,0)
  step(c,.49);assert.equal(c.pickups.length,0)
  step(c,.01);assert.equal(c.pickups.length,1);assert.notEqual(c.pickups[0].id,first)
})

test('consumable racks refill in 0.1 seconds and zero delay refills immediately',()=>{
  for(const item of ['maryjane','cok']){
    const c=createCombat();c.addRack(0,item,1000)
    step(c,.099);assert.equal(c.pickups.length,0)
    step(c,.001);assert.equal(c.pickups.length,1)
    step(c,.01,{grab:true});assert.equal(c.pickups.length,0)
    step(c,.099);assert.equal(c.pickups.length,0)
    step(c,.001);assert.equal(c.pickups.length,1)
  }
  const c=createCombat();c.addRack(0,'cok',1000,0)
  step(c,.01);step(c,.01,{grab:true});assert.equal(c.pickups.length,1)
})

test('nearby spawners of the same item own independent pickups and timers',()=>{
  const c=createCombat();c.addRack(0,'cok',1000,.1);c.addRack(20,'cok',1000,.1)
  step(c,.1);assert.equal(c.pickups.length,2)
  const ids=c.pickups.map(p=>p.id)
  step(c,.01,{grab:true});assert.equal(c.pickups.length,1)
  step(c,.1);assert.equal(c.pickups.length,2)
  assert.ok(ids.some(id=>c.pickups.some(p=>p.id===id)))
})

test('partially collected stacks still occupy a spawner; a full inventory cannot start its timer',()=>{
  const c=createCombat();for(let i=0;i<12;i++)c.give('maryjane');c.addRack(0,'maryjane',1000,.1)
  step(c,.1);c.pickups[0].owned.ammo=5
  const id=c.pickups[0].id
  step(c,.01,{grab:true});assert.equal(c.held.ammo,13)
  assert.equal(c.pickups[0].owned.ammo,4)
  for(let i=0;i<20;i++)step(c,.1,{grabHeld:true})
  assert.equal(c.pickups.length,1);assert.equal(c.pickups[0].id,id)
})

test('all local players share each rack cooldown and extra-player steps do not advance world timers',()=>{
  const c=createCombat();c.addRack(0,'cok',1000,.1)
  step(c,.05);c.use('p2');step(c,1,{},false);assert.equal(c.pickups.length,0)
  c.use('p1');step(c,.05);assert.equal(c.pickups.length,1)
  c.use('p2');step(c,.01,{grab:true},false);assert.equal(c.held.item,'cok')
  c.use('p1');step(c,.01);step(c,.1);assert.equal(c.pickups.length,1)
})

test('layout edits update delays without resetting the rack, and moving/revealing it carries its available item',()=>{
  const c=createCombat(),sync=createLayoutSync(c)
  const el=L.createElement('rack',200,900,{item:'cok',respawnDelay:.4})
  sync.sync([el],1);step(c,.2)
  sync.sync([{...el,params:{...el.params,respawnDelay:.3}}],1)
  assert.equal(c.racks.length,1);assert.equal(c.racks[0].respawnDelay,.3)
  step(c,.1);assert.equal(c.pickups.length,1)
  const id=c.pickups[0].id
  sync.sync([{...el,x:4000}],1);step(c,.01);assert.equal(c.pickups[0].x,-1e6)
  sync.sync([{...el,x:4000}],4);step(c,.01)
  assert.equal(c.pickups.length,1);assert.equal(c.pickups[0].id,id);assert.equal(c.pickups[0].x,4038)
})

test('touch Run collects an offered rack item only when enabled and releases its grab source',()=>{
  const {virtualActionHeld}=loadTs('lib/chicken/controls.ts')
  for(const enabled of [false,true]){
    const c=createCombat();c.addRack(0,'pistol',1000,0)
    step(c,.016)
    const active={run:true}
    step(c,.016,{grabHeld:virtualActionHeld(active,'grab',enabled)})
    assert.equal(c.held?.item??null,enabled?'pistol':null)
    active.run=false
    assert.equal(virtualActionHeld(active,'grab',enabled),false)
    // Dedicated Grab remains usable with the preference disabled.
    if(!enabled){step(c,.016,{grab:true,grabHeld:true});assert.equal(c.held.item,'pistol')}
  }
})
