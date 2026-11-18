const {test}=require('node:test')
const assert=require('node:assert/strict')
const {loadTs}=require('./helpers/music.cjs')
const B=loadTs('lib/pigchicken/button-limit.ts')
const {createCombat}=loadTs('lib/pigchicken/combat.ts')
const L=loadTs('lib/pigchicken/layout.ts')
const {createLayoutSync}=loadTs('lib/pigchicken/layout-sync.ts')
const body={x:0,y:1000,face:1,scale:1,grounded:true,state:'idle',vx:0}
const input={fire:false,firePressed:false,melee:false,throwHeld:false,throwReleased:false,reload:false,pick:0,slot:0}
const step=(c,dt)=>c.step(dt,body,{x:0,y:0},{x:0,y:0},0,input,[],1000,()=>{},{world:true})

test('defaults: 10 presses a minute, 0.3 s apart; saved values are cleaned',()=>{
  assert.deepEqual(B.pressRules({}),{limit:10,window:60,gap:.3})
  assert.deepEqual(B.pressRules({pressLimit:99,pressWindow:1,pressGap:7}),{limit:50,window:5,gap:3})
  assert.equal(B.pressRules({pressGap:.04}).gap,.1)
  assert.equal(B.pressRules({pressLimit:0}).limit,0)
  const el=L.normalizeElement({kind:'button',params:{action:'aliens',pressLimit:3.4,pressWindow:30,pressGap:.25,junk:1}})
  assert.equal(el.params.pressLimit,3);assert.equal(el.params.pressWindow,30);assert.equal(el.params.pressGap,.3)
  const old=L.normalizeElement({kind:'button',params:{action:'aliens'}})
  assert.equal(old.params.pressLimit,undefined)
})

test('the gap holds it between presses, the limit until the oldest press leaves the window',()=>{
  const s=B.withPressRules(undefined,{limit:3,window:10,gap:.5})
  assert.ok(B.canPress(s));B.press(s)
  assert.ok(!B.canPress(s));assert.equal(B.pressCountdown(s),null)
  B.stepPress(s,.5);assert.ok(B.canPress(s))
  B.press(s);B.stepPress(s,1);B.press(s)
  // three presses at 0, 0.5 and 1.5 s: held until 10 s
  B.stepPress(s,1)
  assert.ok(!B.canPress(s));assert.equal(B.pressCountdown(s),'7,5')
  B.stepPress(s,7.45);assert.equal(B.pressCountdown(s),'0,1')
  B.stepPress(s,.06);assert.ok(B.canPress(s));assert.equal(B.pressCountdown(s),null)
  // no limit: only the gap
  const free=B.withPressRules(undefined,{limit:0,window:60,gap:.1})
  for(let i=0;i<100;i++){assert.ok(B.canPress(free));B.press(free);B.stepPress(free,.1)}
})

test('new rules keep the presses made: a lower limit holds it at once, a higher one frees it',()=>{
  const s=B.withPressRules(undefined,{limit:5,window:60,gap:.1})
  for(let i=0;i<3;i++){B.press(s);B.stepPress(s,1)}
  assert.ok(B.canPress(s))
  B.withPressRules(s,{limit:2,window:60,gap:.1})
  assert.ok(!B.canPress(s));assert.equal(B.pressCountdown(s),'58,0')
  B.withPressRules(s,{limit:4,window:60,gap:.1});assert.ok(B.canPress(s))
  B.withPressRules(s,{limit:2,window:5,gap:.1});assert.ok(!B.canPress(s));B.withPressRules(s,{limit:2,window:1.5,gap:.1});assert.ok(B.canPress(s))
})

test('in the world: only the Aliens button gets the limit; it presses up to the limit and counts down',()=>{
  const c=createCombat(),sync=createLayoutSync(c)
  const aliens=L.createElement('button',100,900,{action:'aliens',pressLimit:2,pressWindow:5,pressGap:.3})
  const zombies=L.createElement('button',300,900,{action:'zombies'})
  sync.sync([aliens,zombies],1)
  const [a,z]=c.targets.filter(t=>t.kind==='button')
  assert.deepEqual([a.label,z.label],['aliens','zombies'])
  assert.ok(a.press);assert.equal(z.press,undefined)
  a.net=901
  const hit=()=>c.applyNetHit({id:901,d:1,px:0,x:a.x,y:a.y})
  hit();hit()
  assert.deepEqual(c.pressed.splice(0),['aliens'])
  step(c,.31);hit();step(c,.31);hit()
  assert.deepEqual(c.pressed.splice(0),['aliens'])
  assert.equal(B.pressCountdown(a.press),'4,4')
  step(c,4.4);hit()
  assert.deepEqual(c.pressed.splice(0),['aliens'])
  // the editor changes the limit: the presses already made still count
  sync.sync([{...aliens,params:{...aliens.params,pressLimit:0}},zombies],1)
  step(c,.31);hit();assert.deepEqual(c.pressed.splice(0),['aliens'])
})
