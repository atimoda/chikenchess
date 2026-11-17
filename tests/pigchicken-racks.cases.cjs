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

test('Limite de reposição: the first item and that many more, then the rack stays empty; none is no limit, and it is saved',()=>{
  const c=createCombat();c.addRack(0,'pistol',1000,0,undefined,1)
  // its pickup taken away each frame: the rack puts the next one at once (delay 0)
  let given=0
  for(let i=0;i<5;i++){step(c,.01);const own=c.pickups.find(p=>p.id===c.racks[0].pickupId);if(own){given++;c.pickups.splice(c.pickups.indexOf(own),1)}}
  assert.equal(given,2,'the first item and one refill')
  const free=createCombat();free.addRack(0,'pistol',1000,0)
  let n=0
  for(let i=0;i<8;i++){step(free,.01);const own=free.pickups.find(p=>p.id===free.racks[0].pickupId);if(own){n++;free.pickups.splice(free.pickups.indexOf(own),1)}}
  assert.ok(n>=7,'no limit keeps refilling')
  const el=L.createElement('rack',100,200,{item:'cok',refillLimit:3})
  const out=L.normalizeLayout(JSON.parse(JSON.stringify({v:L.LAYOUT_VERSION,elements:[el,L.createElement('rack',0,0,{item:'cok'}),L.createElement('rack',0,0,{item:'cok',refillLimit:999})]})))
  assert.equal(out.elements[0].params.refillLimit,3)
  assert.equal(out.elements[1].params.refillLimit,undefined)
  assert.equal(out.elements[2].params.refillLimit,50)
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
  // past the world's end (1 screen: the Parquinho, the Templo and the Vila, 3 scenes) it waits away
  sync.sync([{...el,x:6000}],1);step(c,.01);assert.equal(c.pickups[0].x,-1e6)
  sync.sync([{...el,x:6000}],4);step(c,.01)
  assert.equal(c.pickups.length,1);assert.equal(c.pickups[0].id,id);assert.equal(c.pickups[0].x,6038)
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

test('a deleted rack leaves its item on its own: it stays, never comes back, and can be deleted (the undo brings the rack back)',()=>{
  const c=createCombat(),sync=createLayoutSync(c)
  const rack=L.createElement('rack',300,900,{item:'pistol',respawnDelay:0})
  sync.sync([rack],1);step(c,.05)
  assert.equal(c.pickups.length,1);const id=c.pickups[0].id
  // the editor's delete: a loose item with the same id and item, where the rack stood
  const loose=L.looseFromRack(rack)
  assert.equal(loose.kind,'loose');assert.equal(loose.id,rack.id);assert.equal(loose.params.item,'pistol')
  assert.equal(loose.x+loose.w/2,rack.x+rack.w/2);assert.equal(loose.y+loose.h,rack.y+rack.h)
  sync.sync([loose],1);step(c,.05)
  assert.equal(c.racks.length,0);assert.equal(c.pickups.length,1);assert.equal(c.pickups[0].id,id)
  // taken: nothing comes back
  c.pickups.length=0;step(c,3);assert.equal(c.pickups.length,0)
  // undo: the rack again, which refills
  sync.sync([rack],1);step(c,.05);assert.equal(c.racks.length,1);assert.equal(c.pickups.length,1)
  // a loose item saved in a layout puts its item once; deleting it takes the item away
  const c2=createCombat(),s2=createLayoutSync(c2),one=L.createElement('loose',500,900,{item:'flute'})
  s2.sync([one],1);step(c2,.05);assert.equal(c2.pickups.length,1);assert.equal(c2.pickups[0].owned.item,'flute')
  s2.sync([],1);assert.equal(c2.pickups.length,0)
})

test('opening another Pátio clears the last one: its racks, dummies and every item lying in the world',()=>{
  const c=createCombat(),sync=createLayoutSync(c)
  sync.sync([L.createElement('rack',300,900,{item:'pistol',respawnDelay:0}),L.createElement('dummy',600,900)],1);step(c,.05)
  c.pickups.push({...c.pickups[0],id:999,x:800})
  assert.equal(c.pickups.length,2)
  sync.reset()
  assert.equal(c.pickups.length,0);assert.equal(c.racks.length,0);assert.equal(c.targets.filter(t=>t.kind==='dummy').length,0)
  sync.sync(L.emptyLayout().elements,1);step(c,3);assert.equal(c.pickups.length,0)
})

test('a rack on a shaped floor (Chão): its item lands on the outline, not on the floor under it',()=>{
  // the default hill: its top dips, so only one point of it touches the top of its box
  const ground=L.createElement('ground',0,400,{surface:{style:'village'}})
  const boxes=L.layoutBoxes([ground])
  for(const dx of [40,200,330,500,620]){
    const x=ground.x+dx,top=L.layoutFloorBelow([ground],x,0)
    assert.ok(top>=ground.y&&top<ground.y+60)
    const c=createCombat();c.addRack(x,'pistol',top,0)
    for(let i=0;i<120;i++)c.step(1/60,body,{x:0,y:0},{x:0,y:0},0,input,boxes,1000,()=>{},{})
    assert.equal(c.pickups.length,1)
    assert.equal(c.pickups[0].resting,true)
    assert.ok(Math.abs(c.pickups[0].y-top)<.01,`x ${x}: ${c.pickups[0].y} != ${top}`)
  }
  // off the floor's sides it still falls to the ground
  const c=createCombat();c.addRack(ground.x-40,'pistol',ground.y,0)
  for(let i=0;i<180;i++)c.step(1/60,body,{x:0,y:0},{x:0,y:0},0,input,boxes,1000,()=>{},{})
  assert.equal(c.pickups[0].y,1000)
})
