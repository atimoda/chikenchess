const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')
const { ChessEvaluationQueue, formatMoveCoordinates, formatEvaluation, rankedMoveReward } = loadTs('lib/chess-evaluation.ts')
const candidates = ['a2a3','b2b3','c2c3','d2d3','e2e3','f2f3'].map(uci => ({ uci, san: uci.slice(2) }))
function setup() {
  const commands=[], scores=[], analyses=[], played=[], errors=[]
  const queue = new ChessEvaluationQueue({ postMessage: m => commands.push(m) }, {
    onBusy() {}, onScore: (...score) => scores.push(score), onAnalysis: a => analyses.push(a),
    onMove: (...move) => played.push(move), onError: error => errors.push(error),
  })
  queue.initialize()
  return {queue,commands,scores,analyses,played,errors}
}
function ready(queue) { queue.handleMessage('uciok'); queue.handleMessage('readyok') }
function quick(queue, value=30) { queue.handleMessage(`info depth 7 score cp ${value} nodes 3000 time 12 pv a2a3`); queue.handleMessage('bestmove a2a3') }
function iteration(queue, depth=3) {
  candidates.forEach((move,i)=>queue.handleMessage(`info depth ${depth} multipv ${i+1} score cp ${60-i*30} nodes 5000 time 25 pv ${move.uci}`))
}

test('move rewards require the complete ranking of the exact player position', () => {
  const analysis = { fen: 'before', side: 'w', complete: true, best: [{ uci: 'e2e4' }], worst: [{ uci: 'f2f3' }] }
  assert.equal(rankedMoveReward(analysis, 'before', 'e2e4'), 'best')
  assert.equal(rankedMoveReward(analysis, 'before', 'f2f3'), 'worst')
  assert.equal(rankedMoveReward(analysis, 'before', 'd2d4'), null)
  assert.equal(rankedMoveReward(analysis, 'after', 'e2e4'), null)
  assert.equal(rankedMoveReward({ ...analysis, complete: false }, 'before', 'e2e4'), null)
  assert.equal(rankedMoveReward({ ...analysis, side: 'b' }, 'before', 'e2e4'), null)
  assert.equal(rankedMoveReward({ ...analysis, worst: [{ uci: 'e2e4' }] }, 'before', 'e2e4'), 'best')
})

test('handshake gates requests; bounded UCI searches replace custom analysis protocol', () => {
  const {queue,commands}=setup()
  queue.request('a','w',candidates)
  assert.deepEqual(commands,['uci'])
  ready(queue)
  assert.ok(commands.includes('setoption name Hash value 8'))
  assert.equal(commands.at(-1),'go nodes 4000 movetime 80')
  quick(queue)
  assert.ok(commands.includes('setoption name MultiPV value 6'))
  assert.equal(commands.at(-1),'go nodes 12000 movetime 180')
})
test('white evaluation uses UCI root color; rankings stay relative to player', () => {
  const {queue,scores,analyses}=setup();ready(queue)
  queue.request('black','b',candidates);quick(queue,-30);iteration(queue)
  queue.handleMessage('bestmove a2a3')
  assert.deepEqual(scores,[[30,null]])
  assert.deepEqual(analyses.at(-1).best.map(m=>m.score),[60,30,0])
  assert.deepEqual(analyses.at(-1).best.map(m=>m.change),[90,60,30])
  assert.deepEqual(analyses.at(-1).worst.map(m=>m.score),[-90,-60,-30])
  assert.deepEqual(analyses.at(-1).worst.map(m=>m.change),[-60,-30,0])
  assert.equal(analyses.at(-1).complete,true)
})
test('superseded searches cannot publish or play; only latest position starts after bestmove', () => {
  const {queue,commands,scores,played}=setup();ready(queue)
  queue.request('a','w',candidates,{skill:5})
  queue.request('b','b',candidates)
  queue.request('c','w',candidates)
  assert.equal(commands.at(-1),'stop')
  quick(queue,900)
  assert.deepEqual(scores,[]);assert.deepEqual(played,[])
  assert.equal(commands.at(-2),'position fen c')
  assert.equal(commands.includes('position fen b'),false)
})
test('rankings only use complete iterations, never mix partial deeper lines', () => {
  const {queue,analyses}=setup();ready(queue);queue.request('a','w',candidates);quick(queue);iteration(queue,3)
  queue.handleMessage('info depth 4 multipv 1 score cp 500 nodes 11000 time 80 pv f2f3')
  queue.handleMessage('bestmove f2f3')
  assert.equal(analyses.at(-1).depth,3)
  assert.equal(analyses.at(-1).best[0].uci,'a2a3')
  queue.request('b','w',candidates);quick(queue)
  queue.handleMessage('info depth 1 multipv 1 score cp 10 pv a2a3')
  queue.handleMessage('bestmove a2a3')
  assert.equal(analyses.at(-1).complete,false)
  assert.deepEqual(analyses.at(-1).worst,[])
})
test('cache includes repetition history; cached analysis never supplies opponent move', () => {
  const {queue,commands,played}=setup();ready(queue)
  queue.request('same-fen','w',candidates,{position:'position startpos moves history-a'});quick(queue);iteration(queue);queue.handleMessage('bestmove a2a3')
  const count=commands.length
  queue.request('same-fen','w',candidates,{position:'position startpos moves history-a'})
  assert.equal(commands.length,count)
  queue.request('same-fen','w',candidates,{position:'position startpos moves history-a',skill:5})
  assert.equal(commands.at(-1),'go nodes 6000 movetime 100')
  assert.ok(commands.includes('setoption name Skill Level value 5'))
  queue.handleMessage('bestmove b2b3')
  assert.deepEqual(played,[['b2b3','same-fen']])
  queue.request('same-fen','w',candidates,{position:'position startpos moves history-b'})
  assert.equal(commands.at(-1),'go nodes 4000 movetime 80')
})
test('difficulty changes during analysis apply to the upcoming opponent search', () => {
  const {queue,commands}=setup();ready(queue);queue.request('a','w',candidates,{skill:0});quick(queue);queue.setSkill(12);iteration(queue);queue.handleMessage('bestmove a2a3')
  assert.ok(commands.includes('setoption name Skill Level value 12'))
  assert.equal(commands.at(-1),'go nodes 6000 movetime 100')
})
test('difficulty changes during an opponent search stop and replace it immediately', () => {
  const {queue,commands,played}=setup();ready(queue);queue.request('a','w',candidates,{skill:0});quick(queue);iteration(queue);queue.handleMessage('bestmove a2a3')
  assert.equal(commands.at(-1),'go nodes 6000 movetime 100')
  queue.setSkill(12)
  assert.equal(commands.at(-1),'stop')
  queue.handleMessage('bestmove a2a3')
  assert.ok(commands.slice(-4).includes('setoption name Skill Level value 12'))
  assert.equal(commands.at(-1),'go nodes 6000 movetime 100')
  queue.handleMessage('bestmove b2b3')
  assert.deepEqual(played,[['b2b3','a']])
})
test('reset drains opponent search and discards its result', () => {
  const {queue,played}=setup();ready(queue);queue.request('a','w',candidates,{skill:0});quick(queue);iteration(queue);queue.handleMessage('bestmove a2a3')
  queue.reset();queue.handleMessage('bestmove a2a3')
  assert.deepEqual(played,[])
})
test('mate, promotion, and explicit coordinates are not percentages or pawn scores', () => {
  assert.equal(formatMoveCoordinates('e2e4'),'e2 → e4')
  assert.equal(formatMoveCoordinates('a7a8q'),'a7 → a8=Q')
  assert.equal(formatEvaluation(99997,3),'+M3')
  const {queue,scores}=setup();ready(queue);queue.request('b','b',candidates)
  queue.handleMessage('info depth 3 score mate -2 pv a2a3');queue.handleMessage('bestmove a2a3')
  assert.deepEqual(scores,[[99998,2]])
})
test('worker failure makes analysis unavailable instead of silently keeping a stale score', () => {
  const {queue,errors,commands}=setup();queue.fail();ready(queue);queue.request('a','w',candidates)
  assert.equal(errors.length,1);assert.deepEqual(commands,['uci'])
})

test('real Stockfish Lite WASM handles e4, legal root moves, and mate under both budgets', { timeout: 30000 }, async () => {
  const {run}=require('../../scripts/benchmark-chess.cjs')
  const {Chess}=require('chess.js')
  for(const constrained of [false,true]) {
    const {results}=await run(constrained)
    const initial=results.find(r=>r.position==='start'),e4=results.find(r=>r.position==='e4')
    assert.ok(Math.abs(initial.whiteScore)<150)
    assert.ok(Math.abs(e4.whiteScore)<150,'e4 remains near balanced, not a decisive disadvantage')
    assert.ok(Math.abs(e4.whiteScore-initial.whiteScore)<100)
    for(const result of results) {
      const legal=new Set(new Chess(result.fen).moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')))
      for(const move of [...result.best,...result.worst])assert.ok(legal.has(move.uci))
      assert.ok(result.best.length<=3 && result.worst.length<=3)
      if(!result.complete)assert.equal(result.worst.length,0)
    }
    assert.equal(results.find(r=>r.position==='mate').mate,1)
  }
})
