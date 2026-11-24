const {test}=require('node:test')
const assert=require('node:assert/strict')
const {loadTs}=require('./helpers/music.cjs')
const {createCombat}=loadTs('lib/pigchicken/combat.ts')
const L=loadTs('lib/pigchicken/layout.ts')
const C=loadTs('lib/pigchicken/chests.ts')
const {createLayoutSync}=loadTs('lib/pigchicken/layout-sync.ts')
const I=loadTs('lib/pigchicken/items.ts')
const body={x:0,y:1000,face:1,scale:1,grounded:true,state:'idle',vx:0}
const input={fire:false,firePressed:false,melee:false,throwHeld:false,throwReleased:false,reload:false,pick:0,slot:0}
const step=(c,over={},b=body)=>c.step(1/60,b,{x:0,y:0},{x:0,y:0},0,{...input,...over},[],1000,()=>{},{world:true})
const seq=(...v)=>{let i=0;return()=>v[i++%v.length]}

// a combat with one Baú of the layout standing at x 0 on the floor (y 1000)
function withChest(chest){
  const c=createCombat()
  const sync=createLayoutSync(c)
  const el=L.normalizeElement({kind:'chest',id:'chest-1',x:-46,y:930,params:{chest}})
  sync.sync([el],8)
  return {c,sync,el}
}

test('a Baú is an element of the layout: fixed size, its params cleaned, a palette default per rarity',()=>{
  const el=L.createElement('chest',100,500)
  assert.deepEqual({w:el.w,h:el.h},C.CHEST_BOX)
  assert.deepEqual(el.params.chest,C.defaultChest('simple'))
  assert.equal(L.ELEMENT_DEFS.chest.label,'Baú')
  const odd=L.normalizeElement({kind:'chest',w:999,h:999,params:{chest:{rarity:'legendary',lock:'souls',souls:5000,reopen:-3,loot:[{pick:'pistol',chance:150},{pick:'nope',chance:10},{pick:'magic',chance:-4},{pick:'key'}]}}})
  assert.deepEqual({w:odd.w,h:odd.h},C.CHEST_BOX)
  assert.deepEqual(odd.params.chest,{rarity:'legendary',lock:'souls',souls:999,reopen:0,loot:[{pick:'pistol',chance:100},{pick:'magic',chance:0},{pick:'key',chance:100}]})
  assert.equal(C.normalizeChest(null).lock,'free')
  assert.equal(C.defaultChest('legendary').loot.length,3)
  const back=L.normalizeLayout(JSON.parse(JSON.stringify({v:L.LAYOUT_VERSION,elements:[odd]})))
  assert.deepEqual(back.elements.find(e=>e.kind==='chest').params.chest,odd.params.chest)
})

test('an item dropped on a Baú becomes one more line of it, always coming out; a full list takes no more',()=>{
  const a=C.defaultChest('simple'),b=C.addChestItem(a,'pistol')
  assert.deepEqual(b.loot,[{pick:'any',chance:100},{pick:'pistol',chance:100}])
  assert.equal(a.loot.length,1)
  assert.deepEqual(C.normalizeChest(b),b)
  let full=a
  while(full.loot.length<C.CHEST_LOOT_MAX)full=C.addChestItem(full,'key')
  assert.equal(C.addChestItem(full,'pistol'),null)
  assert.ok(C.rollLoot(b.loot,()=>0.999).includes('pistol'))
})

test('each loot line is drawn on its own chance; a group gives one of its items',()=>{
  assert.deepEqual(C.rollLoot([{pick:'pistol',chance:100},{pick:'sax',chance:0}],seq(0.99)),['pistol'])
  assert.deepEqual(C.rollLoot([{pick:'pistol',chance:50}],seq(0.49)),['pistol'])
  assert.deepEqual(C.rollLoot([{pick:'pistol',chance:50}],seq(0.5)),[])
  // the second number picks inside the group
  assert.deepEqual(C.rollLoot([{pick:'instruments',chance:100}],seq(0,0)),[I.INSTRUMENT_IDS[0]])
  assert.deepEqual(C.rollLoot([{pick:'weapons',chance:100}],seq(0,0.999)),[I.WEAPON_IDS[I.WEAPON_IDS.length-1]])
  for(let i=0;i<50;i++) assert.ok(I.MAGIC_IDS.includes(C.rollLoot([{pick:'magic',chance:100}])[0]))
})

test('what keeps a Baú shut: a key for the key lock, enough souls in the Bag of souls for merit',()=>{
  assert.equal(C.chestBlock({lock:'free',souls:5},{keys:0,souls:0}),null)
  assert.equal(C.chestBlock({lock:'key',souls:5},{keys:0,souls:99}),'key')
  assert.equal(C.chestBlock({lock:'key',souls:5},{keys:1,souls:0}),null)
  assert.equal(C.chestBlock({lock:'souls',souls:5},{keys:3,souls:4}),'souls')
  assert.equal(C.chestBlock({lock:'souls',souls:5},{keys:0,souls:5}),null)
})

test('Pegar next to a free Baú opens it once and its items jump out as pickups',()=>{
  const {c}=withChest({rarity:'simple',lock:'free',souls:5,reopen:0,loot:[{pick:'pistol',chance:100},{pick:'cok',chance:100}]})
  step(c)
  assert.equal(c.chestNear.block,null,'next to it: Pegar opens it')
  step(c,{grab:true})
  assert.equal(c.chests[0].open,true)
  assert.deepEqual(c.pickups.map(p=>p.owned.item).sort(),['cok','pistol'])
  assert.ok(c.sounds.some(s=>s.kind==='chest'))
  // open, it is not offered again and Pegar does nothing more with it
  step(c); assert.equal(c.chestNear,null)
  for(let i=0;i<60;i++) step(c)
  assert.ok(c.chests[0].lid>0.99,'the lid stands open')
  const n=c.pickups.length
  for(const p of c.pickups) p.noPick=99
  step(c,{grab:true}); assert.equal(c.pickups.length,n)
})

test('a press shared with Correr (the gamepad\'s X) opens the Baú too',()=>{
  const {c}=withChest({rarity:'simple',lock:'free',souls:5,reopen:0,loot:[{pick:'pistol',chance:100}]})
  step(c,{grab:true,grabRun:true}); assert.equal(c.chests[0].open,true)
})

test('too far away or an item offered first: the Baú stays shut',()=>{
  const {c}=withChest({rarity:'simple',lock:'free',souls:5,reopen:0,loot:[{pick:'pistol',chance:100}]})
  step(c,{grab:true},{...body,x:400}); assert.equal(c.chests[0].open,false)
  c.addPickup(0,'bat',1000)
  step(c); step(c,{grab:true})
  assert.equal(c.chests[0].open,false,'the item at her feet is taken first')
  assert.equal(c.inventory[0].item,'bat')
  step(c,{grab:true}); assert.equal(c.chests[0].open,true,'the next press opens it')
})

test('a key lock asks for a Chave and uses one up; merit asks for souls in the Bag of souls and keeps them',()=>{
  const {c}=withChest({rarity:'legendary',lock:'key',souls:5,reopen:0,loot:[{pick:'sax',chance:100}]})
  step(c); assert.equal(c.chestNear.block,'key')
  step(c,{grab:true})
  assert.equal(c.chests[0].open,false); assert.ok(c.chests[0].shake>0,'it shivers')
  assert.ok(c.texts.some(t=>t.text==='Precisa de uma chave'))
  c.give('key'); c.give('key')
  assert.equal(c.keys,2)
  step(c,{grab:true})
  assert.equal(c.chests[0].open,true)
  assert.equal(c.keys,1,'one key used')
  assert.ok(c.sounds.some(s=>s.kind==='chestLegend'))

  const m=withChest({rarity:'simple',lock:'souls',souls:3,reopen:0,loot:[{pick:'flute',chance:100}]}).c
  m.give('cage')
  m.bagOfSouls.push({id:1},{id:2})
  step(m); assert.equal(m.chestNear.block,'souls')
  step(m,{grab:true}); assert.equal(m.chests[0].open,false)
  assert.ok(m.texts.some(t=>t.text==='Almas nas gaiolas: 2/3'))
  m.bagOfSouls.push({id:3})
  step(m,{grab:true}); assert.equal(m.chests[0].open,true)
  assert.equal(m.capturedSouls,3,'the souls stay in the cage')
})

test('the last key leaves the inventory; Atirar with a key in hand uses nothing',()=>{
  const {c}=withChest({rarity:'simple',lock:'key',souls:5,reopen:0,loot:[]})
  c.give('key')
  assert.equal(c.held.item,'key')
  step(c,{fire:true,firePressed:true})
  assert.equal(c.keys,1,'Atirar does not spend it')
  step(c,{grab:true})
  assert.equal(c.keys,0); assert.equal(c.inventory.filter(Boolean).length,0)
  assert.ok(c.texts.some(t=>t.text==='Vazio'),'an empty roll says so')
})

test('one that closes again can be opened again; the layout sync moves it, keeps it open and removes it',()=>{
  const {c,sync,el}=withChest({rarity:'simple',lock:'free',souls:5,reopen:1,loot:[{pick:'pistol',chance:100}]})
  step(c,{grab:true}); assert.equal(c.chests[0].open,true)
  sync.sync([{...el,x:el.x+20}],8)
  assert.equal(c.chests.length,1); assert.equal(c.chests[0].open,true); assert.equal(c.chests[0].x,20)
  for(let i=0;i<70;i++) step(c)
  assert.equal(c.chests[0].open,false,'shut again after its time')
  c.pickups.length=0
  step(c,{grab:true},{...body,x:20}); assert.equal(c.chests[0].open,true)
  assert.equal(c.pickups.length,1,'with a new roll')
  sync.sync([],8); assert.equal(c.chests.length,0)
  sync.sync([el],8); sync.reset(); assert.equal(c.chests.length,0)
})

// ---------- online (lib/pigchicken/net-chests.ts) ----------
const N=loadTs('lib/pigchicken/net-chests.ts')

test('online: a Baú opened in one browser opens in the others, with its animation and sound, but no items',()=>{
  const chest={rarity:'legendary',lock:'free',souls:5,reopen:0,loot:[{pick:'pistol',chance:100}]}
  const a=withChest(chest).c, b=withChest(chest).c
  a.setNetOn(true)
  step(a,{grab:true})
  assert.deepEqual([...a.chestOpens],['chest-1'],'news for the others')
  const msg=N.cleanNetChests(JSON.parse(JSON.stringify({l:a.chestOpens.splice(0).map(id=>[id,0]),o:1})))
  b.sounds.length=0
  N.applyNetChests(b,msg,false,()=>false)
  assert.equal(b.chests[0].open,true)
  assert.ok(b.sounds.some(s=>s.kind==='chestLegend'),'the same sound')
  assert.equal(b.chests[0].lid,0,'the lid goes up there too'); step(b); assert.ok(b.chests[0].lid>0)
  assert.equal(b.pickups.length,0,'the items are for whoever opened it')
  assert.equal(b.chestOpens.length,0,'news from elsewhere is not sent back')
})

test('online: the owner\'s list opens the ones open there (late joiners, quietly) and shuts the rest, but not one just opened here',()=>{
  const chest={rarity:'simple',lock:'free',souls:5,reopen:0,loot:[]}
  const owner=withChest(chest).c, late=withChest(chest).c
  step(owner,{grab:true}); for(let i=0;i<120;i++) step(owner)
  const list=N.exportOpenChests(owner.chests)
  assert.equal(list.length,1); assert.ok(list[0][1]>=1.9)
  late.sounds.length=0
  N.applyNetChests(late,N.cleanNetChests({l:list}),true,()=>false)
  assert.equal(late.chests[0].open,true); assert.equal(late.chests[0].lid,1,'already open, no animation')
  assert.equal(late.sounds.length,0)
  // the owner shut it: shut here too, unless it was opened here a moment ago
  N.applyNetChests(late,{l:[]},true,()=>true); assert.equal(late.chests[0].open,true)
  N.applyNetChests(late,{l:[]},false,()=>false); assert.equal(late.chests[0].open,true,'only the owner\'s list shuts')
  N.applyNetChests(late,{l:[]},true,()=>false); assert.equal(late.chests[0].open,false)
  assert.equal(N.cleanNetChests({l:'x'}),null)
  assert.deepEqual(N.cleanNetChests({l:[['a',-3],[5,1],['b',1e9]],o:1}),{l:[['a',0],['b',3600]],o:1})
})

test('a won song\'s prize: the items of a Jukebox or Vitrola jump out of it as pickups, nothing for an empty roll',()=>{
  const c=createCombat()
  c.popPrize(300,700,['key','pistol'])
  assert.deepEqual(c.pickups.map(p=>p.owned.item).sort(),['key','pistol'])
  assert.ok(c.pickups.every(p=>p.noPick>0&&p.vy<0&&Math.abs(p.x-300)<=15))
  c.popPrize(300,700,[])
  assert.equal(c.pickups.length,2)
  // the prize is drawn like a Baú's loot
  assert.deepEqual(C.rollLoot([{pick:'key',chance:100},{pick:'magic',chance:0}],()=>0.5),['key'])
})

test('the example Pátio "Arquipélago das Almas": big, mirrored, three lanes of wires, spawns high and low, keys from songs',()=>{
  const D=loadTs('lib/pigchicken/example-deadlock.ts'), P=loadTs('lib/pigchicken/power-lines.ts'), PS=loadTs('lib/pigchicken/patio-settings.ts')
  const SEED=loadTs('lib/pigchicken/example-seed.ts'), SP=loadTs('lib/pigchicken/spawn-portals.ts'), W=loadTs('lib/pigchicken/world.ts')
  const layout=D.deadlockLayout()
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(layout))),layout)
  assert.deepEqual(D.deadlockLayout(),layout)
  assert.ok(JSON.stringify(layout).length<400000)
  assert.equal(layout.settings.screens,8)
  const els=L.elementsInWorld(layout,8)
  assert.equal(els.length,layout.elements.length)
  assert.ok(els.length<L.LAYOUT_MAX_ELEMENTS)
  const worldW=W.worldScenes(8)*W.SCENE_W
  // nothing above the ceiling nor past the world's ends
  assert.ok(els.every(e=>e.depth||(e.y>=PS.patioWorldTop(layout.settings)&&e.x>=0&&e.x+e.w<=worldW)))
  // six places to be born at (three on each side, on the ground and on the islands), the chances adding to 100
  const born=L.spawnPortalsIn?L.spawnPortalsIn(els):els.filter(SP.isSpawnPortal)
  assert.equal(born.length,6)
  assert.equal(SP.spawnChances(born).reduce((a,b)=>a+b,0),100)
  assert.equal(born.filter(p=>p.y<0).length,4)
  assert.equal(born.filter(p=>p.x<worldW/2).length,3)
  // every pole and tower is wired by hand to another one; the islands' lanes are floors
  const power=els.filter(e=>L.isPowerElement(e.kind))
  assert.ok(power.every(e=>P.linkedTo(els,e.id).size>0))
  assert.ok(P.powerSpans(els).filter(s=>P.spanFloor(s)).length>150)
  // the portals have their partners; the sequencers give keys for a won song; the Baús lendários ask for one
  els.filter(e=>e.kind==='portal').forEach(p=>assert.ok(L.portalPartner(p,els)))
  const seqs=els.filter(e=>e.kind==='jukebox'||e.kind==='vitrola')
  assert.equal(seqs.length,6)
  assert.ok(seqs.every(e=>e.params.player.prize.some(l=>l.pick==='key'&&l.chance===100)))
  assert.ok(els.filter(e=>e.kind==='chest'&&e.params.chest.rarity==='legendary'&&e.params.chest.lock==='key').length>=5)
  assert.ok(els.some(e=>e.kind==='chest'&&e.params.chest.lock==='souls'))
  // each sequencer in a zone of its own (one fase de notas per zone)
  const zones=els.filter(e=>e.kind==='zone')
  const inside=(z,e)=>{const x=e.x+e.w/2,y=e.y+e.h;return x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h}
  const zoneOf=e=>zones.filter(z=>inside(z,e)).sort((a,b)=>b.params.zone.priority-a.params.zone.priority)[0]
  assert.ok(seqs.every(zoneOf))
  assert.equal(new Set(seqs.map(e=>zoneOf(e).id)).size,seqs.length)
  // themed items in many places
  assert.ok(new Set(els.filter(e=>e.kind==='rack').map(e=>e.params.item)).size>=25)
  const ex=SEED.EXAMPLE_PATIOS.find(e=>e.name==='Arquipélago das Almas')
  assert.ok(ex)
  assert.equal(ex.id,'5e7a0c11-0008-4e5a-9c0d-ec5a3b1e0008')
  assert.deepEqual(ex.layout(),layout)
  assert.equal(new Set(SEED.EXAMPLE_PATIOS.map(e=>e.id)).size,SEED.EXAMPLE_PATIOS.length)
})
