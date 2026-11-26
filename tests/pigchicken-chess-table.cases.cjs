const {test}=require('node:test')
const assert=require('node:assert/strict')
const {loadTs}=require('./helpers/music.cjs')
const T=loadTs('lib/pigchicken/chess-table.ts')
const S=loadTs('lib/pigchicken/chess-table-store.ts')
const L=loadTs('lib/pigchicken/layout.ts')
const I=loadTs('lib/pigchicken/items.ts')

const box=(id='t1',x=0)=>({id,x,y:810,w:T.CHESS_TABLE_BOX.w,h:T.CHESS_TABLE_BOX.h,params:T.defaultChessTable()})
const near=()=>true

test('Mesa de chickenchess: params, shape and the options a slam on the top steps through',()=>{
  assert.deepEqual(T.defaultChessTable(),{city:'random',radius:1200})
  assert.deepEqual(T.normalizeChessTable({city:'Leipzig!',radius:999}),{city:'random',radius:1200})
  assert.deepEqual(T.normalizeChessTable({city:'leipzig',radius:0}),{city:'leipzig',radius:0})
  const el={x:100,y:810,w:440,h:190}
  const top=T.chessTop(el), left=T.chessStool(el,0), right=T.chessStool(el,1)
  assert.equal(top.top,1000-92)
  assert.ok(left.r<top.l&&top.r<right.l)
  assert.equal(left.face,1); assert.equal(right.face,-1)
  // the city on the left half of the top, the radius on the right half, nothing off it
  assert.equal(T.chessSlamOption(el,top.l+10),'city')
  assert.equal(T.chessSlamOption(el,top.r-10),'radius')
  assert.equal(T.chessSlamOption(el,top.l-10),null)
  assert.ok(T.onChessTop(el,(top.l+top.r)/2,top.top))
  assert.ok(!T.onChessTop(el,(top.l+top.r)/2,1000))
  // Random, then each city, back to Random; the radius goes up and back to 0 (no music)
  let p=T.defaultChessTable()
  p=T.nextChessOption(p,'city',['a','b']); assert.equal(p.city,'a')
  p=T.nextChessOption(p,'city',['a','b']); assert.equal(p.city,'b')
  p=T.nextChessOption(p,'city',['a','b']); assert.equal(p.city,'random')
  const radii=[]; for(let i=0;i<T.CHESS_RADII.length;i++){p=T.nextChessOption(p,'radius',[]);radii.push(p.radius)}
  assert.deepEqual(radii,[1600,2400,3200,0,400,800,1200])
  assert.equal(T.chessRadiusLabel(0),'som desligado')
  // the element of the editor: fixed size, its options kept, a solid top
  const e=L.normalizeElement({id:'c',kind:'chesstable',x:0,y:0,w:10,h:10,params:{chessTable:{city:'leipzig',radius:400}}})
  assert.equal(e.w,440); assert.equal(e.h,190)
  assert.deepEqual(e.params.chessTable,{city:'leipzig',radius:400})
  assert.equal(L.ELEMENT_DEFS.chesstable.group,'Jogos')
})

test('Mesa de chickenchess: the queue, the bot and the bot\'s place',()=>{
  let s=T.idleChessTable()
  assert.equal(T.chessPrompt(s,0,'p1'),'join')
  s=T.chessUse(s,0,'p1',0)
  assert.equal(T.chessPrompt(s,0,'p1'),'leave')
  // ready, on the other stool: against a bot
  assert.equal(T.chessPrompt(s,1,'p1'),'bot')
  assert.equal(T.chessPrompt(s,1,'p2'),'join')
  // someone else's stool: nothing
  assert.equal(T.chessPrompt(s,0,'p2'),null)
  const bot=T.chessUse(s,1,'p1',50)
  assert.equal(bot.phase,'countdown'); assert.ok(T.isBot(bot.seats[1]))
  assert.equal(T.chessPlayers(bot).hotseat,false)
  // during the match against the bot: another player takes its place, the one playing cannot
  assert.equal(T.chessPrompt(bot,1,'p2'),'replace')
  assert.equal(T.chessPrompt(bot,1,'p1'),null)
  const two=T.chessUse(bot,1,'p2',60)
  assert.equal(T.whoOf(two.seats[1]),'p2'); assert.equal(two.phase,'countdown')
  assert.equal(T.chessPlayers(two).hotseat,true)
  // two players: the count, then the match
  const pair=T.chessUse(T.chessUse(T.idleChessTable(),0,'p1',0),1,'p2',10)
  assert.equal(pair.phase,'countdown')
  assert.equal(T.chessTick(pair,10+T.CHESS_COUNTDOWN_MS-1).phase,'countdown')
  assert.equal(T.chessTick(pair,10+T.CHESS_COUNTDOWN_MS).phase,'playing')
  // walking away leaves the queue, not a match
  assert.equal(T.chessLeave(s,'p1').seats[0],null)
  assert.equal(T.chessLeave(pair,'p1'),pair)
  // the winner: the player of the winning side, none for a draw or the bot
  assert.equal(T.chessWinner(pair,'w'),'p1'); assert.equal(T.chessWinner(pair,'b'),'p2')
  assert.equal(T.chessWinner(pair,'draw'),null); assert.equal(T.chessWinner(bot,'b'),null)
})

test('Mesa de chickenchess: its music fades out to nothing at the radius, and 0 turns it off',()=>{
  assert.equal(T.chessVolume(1200,0),1)
  assert.equal(T.chessVolume(1200,600),1)
  const mid=T.chessVolume(1200,900); assert.ok(mid>0&&mid<1)
  assert.equal(T.chessVolume(1200,1200),0)
  assert.equal(T.chessVolume(0,0),0)
})

test('Mesa de chickenchess: the store runs one match, gives the key once and frees the table',()=>{
  S.resetChessTables(); S.setChessCities(['leipzig','dusseldorf'])
  S.setChessTables([box('t1'),box('t2',1000)])
  // joining another table's queue leaves the first one
  assert.ok(S.chessTableUse('t1',0,'p1',0))
  assert.ok(S.chessTableUse('t2',0,'p1',0))
  assert.equal(S.chessTableStore.state('t1').seats[0],null)
  // a city picked by a slam is the match's city
  S.chessTableSlam('t2','city',0)
  assert.equal(S.chessTableStore.params('t2').city,'leipzig')
  assert.ok(S.chessTableUse('t2',1,'p1',100))
  const m=S.chessTableStore.match
  assert.equal(m.tableId,'t2'); assert.equal(m.city,'leipzig'); assert.equal(m.white,'p1'); assert.equal(m.black,null)
  assert.equal(m.phase,'countdown')
  // two ready at another table wait for this match to end
  S.chessTableUse('t1',0,'p2',150); S.chessTableUse('t1',1,'p3',150)
  assert.equal(S.chessTableStore.state('t1').phase,'idle')
  S.stepChessTables(100+T.CHESS_COUNTDOWN_MS,near)
  assert.equal(S.chessTableStore.match.phase,'playing')
  assert.equal(S.chessTableStore.state('t1').phase,'idle')
  // a slam during the match changes its city
  S.chessTableSlam('t2','city',200)
  assert.equal(S.chessTableStore.match.city,'dusseldorf')
  // checkmate: the key once, to the winner of this screen
  S.chessMatchResult(m.id,'w'); S.chessMatchResult(m.id,'w')
  assert.deepEqual([...S.takeChessRewards()],['p1'])
  assert.deepEqual([...S.takeChessRewards()],[])
  // leaving the match frees the table; the pair waiting at the other one starts
  S.chessMatchExit(m.id,5000)
  assert.equal(S.chessTableStore.state('t2').phase,'idle')
  S.stepChessTables(5000,near)
  assert.equal(S.chessTableStore.match.tableId,'t1')
  assert.equal(S.chessTableStore.match.hotseat,true)
  // a removed table takes its match along
  S.setChessTables([box('t2',1000)])
  assert.equal(S.chessTableStore.match,null)
  // whoever went too far leaves the queue
  S.chessTableUse('t2',0,'p1',6000)
  S.stepChessTables(6001,()=>false)
  assert.equal(S.chessTableStore.state('t2').seats[0],null)
  S.resetChessTables()
})

test('Chave de ouro: a consumable of the Chaves, only won, that does not open chests',()=>{
  const key=I.DEFAULT_ITEMS.chesskey
  assert.ok(I.ITEM_IDS.includes('chesskey'))
  assert.ok(I.TROPHY_IDS.includes('chesskey'))
  assert.ok(!I.KEY_IDS.includes('chesskey'))
  // only won at a table: no suporte, Item solto or Baú gives one
  assert.ok(!I.RACK_ITEM_IDS.includes('chesskey'))
  assert.equal(key.name,'Chave de ouro')
  assert.equal(I.CONSUMABLE_LIMITS.chesskey,9)
})

test('Arquipélago das Almas: the Mesa de chickenchess stands on the floor in the middle of the arena',()=>{
  const D=loadTs('lib/pigchicken/example-deadlock.ts')
  const layout=D.deadlockLayout()
  const tables=layout.elements.filter(e=>e.kind==='chesstable')
  assert.equal(tables.length,1)
  const t=tables[0], worldW=10*1920
  assert.ok(Math.abs(t.x+t.w/2-worldW/2)<1)
  // the arena's things beside it, not over it
  const arena=layout.elements.filter(e=>['jukebox','gong','chest','rack'].includes(e.kind)&&e.y>500&&Math.abs(e.x-t.x)<1000)
  assert.ok(arena.length>=4)
  assert.ok(arena.every(e=>e.x+e.w<=t.x||e.x>=t.x+t.w))
})
