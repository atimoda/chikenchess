const {test}=require('node:test')
const assert=require('node:assert/strict')
const {loadTs}=require('./helpers/music.cjs')
const {createThrowTransition}=loadTs('lib/chicken/throw-transition.ts')
const start={x:4,y:-2,angle:170,handX:-58,handY:28}
const goal={x:-80,y:30,angle:-170,handX:-80,handY:30}

test('Throw begins at the exact captured item/hand pose and follows the shortest angular path',()=>{
 const t=createThrowTransition();t.start(start,1000)
 assert.deepEqual(t.sample(goal,1000,1),start)
 const half=t.sample(goal,1100,1)
 assert.equal(half.x,-38);assert.equal(half.y,14);assert.equal(half.angle,180)
 assert.equal(half.handX,-69);assert.equal(half.handY,29)
 assert.deepEqual(t.sample(goal,1200,1),goal);assert.equal(t.active(),false)
})

test('transition speed scales elapsed time and can change without jumping back',()=>{
 const fast=createThrowTransition();fast.start(start,0)
 assert.equal(fast.sample(goal,50,2).x,-38)
 assert.deepEqual(fast.sample(goal,100,2),goal)
 const t=createThrowTransition();t.start(start,0)
 const a=t.sample(goal,50,1),b=t.sample(goal,50,.1)
 assert.deepEqual(a,b)
 const c=t.sample(goal,100,.1);assert.ok(c.x<a.x)
})

test('a moving target unwraps continuously through 180 degrees instead of reversing mid-animation',()=>{
 const t=createThrowTransition();t.start({...start,angle:0},0)
 const a=t.sample({...goal,angle:170},100,1)
 const b=t.sample({...goal,angle:-170},100,1)
 assert.equal(a.angle,85);assert.ok(Math.abs(b.angle-95)<1e-9)
})

test('cancel/reset discards position and angle, and restarting captures a new pose',()=>{
 const t=createThrowTransition();t.start(start,0);t.sample(goal,80,1);t.reset()
 assert.deepEqual(t.sample(goal,100,1),goal)
 const other={x:20,y:10,angle:-80,handX:4,handY:5}
 t.start(other,200);assert.deepEqual(t.sample(goal,200,1),other)
 assert.deepEqual(t.sample(goal,400,1),goal)
})
