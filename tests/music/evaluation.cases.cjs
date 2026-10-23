const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')
const { ChessEvaluationQueue, formatMoveCoordinates, formatEvaluation, rankedMoveReward, rankedMoveLabelTone, rememberMoveSuggestions, rankedMoveRewardDetails } = loadTs('lib/chess-evaluation.ts')
const candidates = ['a2a3','b2b3','c2c3','d2d3','e2e3','f2f3'].map(uci => ({ uci, san: uci.slice(2) }))
function setup() {
  const commands=[], scores=[], analyses=[], progress=[], played=[], errors=[], traces=[]
  const queue = new ChessEvaluationQueue({ postMessage: m => commands.push(m) }, {
    onBusy() {}, onScore: (...score) => scores.push(score), onAnalysis: a => analyses.push(a), onProgress: a => progress.push(a),
    onMove: (...move) => played.push(move), onError: error => errors.push(error), onTrace: trace => traces.push(trace),
  })
  queue.initialize()
  return {queue,commands,scores,analyses,progress,played,errors,traces}
}
function ready(queue) { queue.handleMessage('uciok'); queue.handleMessage('readyok') }
function quick(queue, value=30) { queue.handleMessage(`info depth 7 score cp ${value} nodes 3000 time 12 pv a2a3`); queue.handleMessage('bestmove a2a3') }
function iteration(queue, depth=3) {
  candidates.forEach((move,i)=>queue.handleMessage(`info depth ${depth} multipv ${i+1} score cp ${60-i*30} nodes 5000 time 25 pv ${move.uci}`))
}

test('move rewards require the complete ranking of the exact player position', () => {
  const analysis = { fen: 'before', side: 'w', complete: true, final: true, best: [{ uci: 'e2e4', score: 25, mate: null }], worst: [{ uci: 'f2f3', score: -200, mate: null }] }
  assert.equal(rankedMoveReward(analysis, 'before', 'e2e4'), 'best')
  assert.equal(rankedMoveReward(analysis, 'before', 'f2f3'), 'worst')
  assert.equal(rankedMoveReward(analysis, 'before', 'd2d4'), null)
  assert.equal(rankedMoveReward(analysis, 'after', 'e2e4'), null)
  assert.equal(rankedMoveReward({ ...analysis, complete: false }, 'before', 'e2e4'), null)
  assert.equal(rankedMoveReward({ ...analysis, final: false }, 'before', 'e2e4'), 'best')
  assert.equal(rankedMoveReward({ ...analysis, side: 'b' }, 'before', 'e2e4'), null)
  assert.equal(rankedMoveReward({ ...analysis, worst: [{ uci: 'e2e4' }] }, 'before', 'e2e4'), 'best')
})

test('arrow label tone follows the displayed score, including the one-pawn boundary', () => {
  assert.equal(rankedMoveLabelTone(4),'best')
  assert.equal(rankedMoveLabelTone(0),'best')
  assert.equal(rankedMoveLabelTone(-1),'warning')
  assert.equal(rankedMoveLabelTone(-100),'warning')
  assert.equal(rankedMoveLabelTone(-101),'worst')
  assert.equal(rankedMoveLabelTone(0,-2),'worst')
})

test('best-list egg reward follows the move score, not its loss against the top line', () => {
  const analysis = { fen: 'before', side: 'w', legalMoves: 6, complete: true, final: true, best: [{ uci: 'e2e4', score: -100, mate: null, change: -300 }], worst: [{ uci: 'f2f3', score: -500, mate: null }] }
  assert.equal(rankedMoveReward(analysis,'before','e2e4'),'best')
  assert.equal(rankedMoveReward({ ...analysis, best: [{ uci: 'e2e4', score: -101, mate: null, change: 0 }] },'before','e2e4'),'worst')
  assert.equal(rankedMoveReward({ ...analysis, best: [{ uci: 'e2e4', score: 50, mate: -2, change: 0 }] },'before','e2e4'),'worst')
  assert.equal(rankedMoveReward({ ...analysis, best: [{ uci: 'e2e4', score: -101, mate: null, change: 0 }], worst: [{ uci: 'e2e4', score: -101, mate: null }] },'before','e2e4'),'worst')
  assert.equal(rankedMoveReward(analysis,'before','f2f3'),'worst')
})

test('handshake gates requests; bounded UCI searches replace custom analysis protocol', () => {
  const {queue,commands}=setup()
  queue.request('a','w',candidates)
  assert.deepEqual(commands,['uci'])
  ready(queue)
  assert.ok(commands.includes('setoption name Hash value 8'))
  assert.equal(commands.at(-1),'go nodes 6000 movetime 120')
  quick(queue)
  assert.ok(commands.includes('setoption name MultiPV value 6'))
  assert.equal(commands.at(-1),'go nodes 25000000 movetime 30000 depth 15')
})
test('powered positions restrict every search and reject a forbidden engine reply', () => {
  const {queue,commands,played}=setup();ready(queue)
  queue.request('powered','b',candidates,{skill:0,searchMoves:['b2b3','c2c3']})
  assert.equal(commands.at(-1),'go nodes 6000 movetime 120 searchmoves b2b3 c2c3')
  quick(queue)
  assert.equal(commands.at(-1),'go nodes 6000 movetime 100 searchmoves b2b3 c2c3')
  queue.handleMessage('bestmove a2a3')
  assert.deepEqual(played,[])
  queue.handleMessage('bestmove a2a3')
  assert.equal(queue.bestAvailableMove('powered'),null)
})
test('white evaluation uses UCI root color; rankings stay relative to player', () => {
  const {queue,scores,analyses}=setup();ready(queue)
  queue.request('black','b',candidates);quick(queue,-30);iteration(queue)
  queue.handleMessage('bestmove a2a3')
  assert.deepEqual(scores,[[30,null]])
  assert.deepEqual(analyses.at(-1).best.map(m=>m.score),[60,30,0])
  assert.deepEqual(analyses.at(-1).best.map(m=>m.change),[0,-30,-60])
  assert.deepEqual(analyses.at(-1).worst.map(m=>m.score),[-90,-60,-30])
  assert.deepEqual(analyses.at(-1).worst.map(m=>m.change),[-150,-120,-90])
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
  assert.equal(commands.at(-1),'go nodes 6000 movetime 120')
})
test('live Stockfish trace publishes every arriving score and retains exact UCI lines', () => {
  const {queue,traces}=setup();ready(queue);queue.request('live','w',candidates);quick(queue)
  queue.handleMessage('info depth 3 seldepth 5 multipv 1 score cp 40 nodes 4100 nps 82000 time 50 pv a2a3 b7b6')
  queue.handleMessage('info depth 3 multipv 2 score cp -12 nodes 4200 time 51 pv b2b3 g7g6')
  const trace=traces.at(-1)
  assert.equal(trace.phase,'rank')
  assert.equal(trace.depth,3)
  assert.equal(trace.completeDepth,0)
  assert.equal(trace.lines.length,2)
  assert.equal(trace.lines[0].score,40)
  assert.deepEqual(trace.lines[0].pv,['a2a3','b7b6'])
  assert.equal(trace.nps,82000)
  assert.ok(trace.raw.at(-1).includes('multipv 2'))
})
test('complete depth iterations update move previews and can reward the move they showed', () => {
  const {queue,progress,analyses}=setup();ready(queue);queue.request('preview','w',candidates);quick(queue)
  iteration(queue,3)
  const preview=progress.at(-1)
  assert.equal(preview.depth,3)
  assert.equal(preview.complete,true)
  assert.equal(preview.final,false)
  assert.equal(rankedMoveReward(preview,'preview','a2a3'),'best')
  queue.handleMessage('bestmove a2a3')
  assert.equal(analyses.at(-1).final,true)
  assert.equal(rankedMoveReward(analyses.at(-1),'preview','a2a3'),'best')
})
test('opponent search runs before the long ranking and exposes a legal choice during both phases', () => {
  const {queue,commands,played}=setup();ready(queue);queue.request('black','b',candidates,{skill:5})
  queue.handleMessage('info depth 3 score cp 12 pv a2a3')
  assert.equal(queue.bestAvailableMove('black'),'a2a3')
  queue.handleMessage('bestmove a2a3')
  assert.equal(commands.at(-1),'go nodes 6000 movetime 100')
  queue.handleMessage('info depth 4 score cp 15 pv b2b3')
  assert.equal(queue.bestAvailableMove('black'),'b2b3')
  queue.handleMessage('bestmove b2b3')
  assert.deepEqual(played,[['b2b3','black']])
  assert.equal(commands.at(-1),'go nodes 25000000 movetime 30000 depth 15')
  queue.handleMessage('info depth 2 multipv 1 score cp 25 pv c2c3')
  assert.equal(queue.bestAvailableMove('black'),'c2c3')
  assert.equal(queue.bestAvailableMove('other'),null)
})
test('lopsided desktop positions keep the depth-15 ranking target', () => {
  const {queue,commands}=setup();ready(queue);queue.request('tactical','w',candidates);quick(queue,-1400)
  assert.equal(commands.at(-1),'go nodes 25000000 movetime 30000 depth 15')
})
test('a forced losing mate is not a best move or a positive mate label', () => {
  const {queue,analyses}=setup();ready(queue)
  const forced=[{uci:'d3d2',san:'Kd2'}]
  queue.request('forced','w',forced);queue.handleMessage('info depth 4 score mate -1 pv d3d2');queue.handleMessage('bestmove d3d2')
  queue.handleMessage('info depth 5 multipv 1 score mate -1 pv d3d2 e4e2');queue.handleMessage('bestmove d3d2')
  const analysis=analyses.at(-1)
  assert.equal(analysis.best[0].mate,-1)
  assert.equal(formatEvaluation(analysis.best[0].score,analysis.best[0].mate),'−M1')
  assert.equal(rankedMoveLabelTone(analysis.best[0].score,analysis.best[0].mate),'worst')
  assert.equal(rankedMoveReward(analysis,'forced','d3d2'),null)
})
test('incomplete rankings are searched again after revisiting the same position', () => {
  const {queue,commands,analyses}=setup();ready(queue)
  queue.request('incomplete','w',candidates);quick(queue)
  queue.handleMessage('info depth 1 multipv 1 score cp 10 pv a2a3');queue.handleMessage('bestmove a2a3')
  assert.equal(analyses.at(-1).complete,false)
  const before=commands.length
  queue.request('incomplete','w',candidates)
  assert.ok(commands.length>before)
  assert.equal(commands.at(-1),'go nodes 6000 movetime 120')
})
test('rapid undo and redo only publish the latest position and its trace', () => {
  const {queue,scores,analyses,traces}=setup();ready(queue)
  queue.request('mate','w',candidates);queue.reset()
  queue.request('earlier','b',candidates);queue.request('latest','w',candidates)
  queue.handleMessage('info depth 7 score mate -1 pv a2a3');queue.handleMessage('bestmove a2a3')
  assert.deepEqual(scores,[])
  assert.equal(traces.at(-1).fen,'latest')
  quick(queue,25);iteration(queue);queue.handleMessage('bestmove a2a3')
  assert.deepEqual(scores,[[25,null]])
  assert.equal(analyses.at(-1).fen,'latest')
})
test('difficulty changes during analysis apply to the upcoming opponent search', () => {
  const {queue,commands}=setup();ready(queue);queue.request('a','w',candidates,{skill:0});queue.setSkill(12);quick(queue)
  assert.ok(commands.includes('setoption name Skill Level value 12'))
  assert.equal(commands.at(-1),'go nodes 6000 movetime 100')
})
test('difficulty changes during an opponent search stop and replace it immediately', () => {
  const {queue,commands,played}=setup();ready(queue);queue.request('a','w',candidates,{skill:0});quick(queue)
  assert.equal(commands.at(-1),'go nodes 6000 movetime 100')
  queue.setSkill(12)
  assert.equal(commands.at(-1),'stop')
  queue.handleMessage('bestmove a2a3')
  assert.equal(commands.at(-1),'go nodes 6000 movetime 120')
  quick(queue)
  assert.ok(commands.slice(-4).includes('setoption name Skill Level value 12'))
  assert.equal(commands.at(-1),'go nodes 6000 movetime 100')
  queue.handleMessage('bestmove b2b3')
  assert.deepEqual(played,[['b2b3','a']])
  assert.equal(commands.at(-1),'go nodes 25000000 movetime 30000 depth 15')
})
test('reset drains opponent search and discards its result', () => {
  const {queue,played}=setup();ready(queue);queue.request('a','w',candidates,{skill:0});quick(queue)
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

test('real Stockfish Lite WASM handles legal root moves on desktop and e4 and mate on constrained devices', { timeout: 60000 }, async () => {
  const {run,positions}=require('../../scripts/benchmark-chess.cjs')
  const {Chess}=require('chess.js')
  for(const constrained of [false,true]) {
    const {results}=await run(constrained,constrained ? positions : positions.slice(0,1))
    const initial=results.find(r=>r.position==='start'),e4=results.find(r=>r.position==='e4')
    assert.ok(Math.abs(initial.whiteScore)<150)
    if(e4) {
      assert.ok(Math.abs(e4.whiteScore)<150,'e4 remains near balanced, not a decisive disadvantage')
      assert.ok(Math.abs(e4.whiteScore-initial.whiteScore)<100)
    }
    for(const result of results) {
      const legal=new Set(new Chess(result.fen).moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')))
      for(const move of [...result.best,...result.worst])assert.ok(legal.has(move.uci))
      assert.ok(result.best.length<=3 && result.worst.length<=3)
      if(!result.complete)assert.equal(result.worst.length,0)
    }
    if(constrained) assert.equal(results.find(r=>r.position==='mate').mate,1)
  }
})


function rewardAnalysis(best, worst = [], fen = 'before') {
  const moves = list => list.map(([uci, score]) => ({ uci, score, mate: null }))
  return { fen, side: 'w', legalMoves: 8, complete: true, final: false, best: moves(best), worst: moves(worst) }
}

test('last seen recommendations and unseen current candidates both earn their relative rewards', () => {
  const seen = rememberMoveSuggestions([], { kind: 'best', analysis: rewardAnalysis([['e2e4', 25]], [['c2c3', -200]]) })
  const current = rewardAnalysis([['d2d4', 30]], [['e2e4', -200], ['f2f3', -300]])
  assert.deepEqual(rankedMoveRewardDetails(current, 'before', 'e2e4', seen), { kind: 'best', comeback: false })
  assert.deepEqual(rankedMoveRewardDetails(current, 'before', 'd2d4', seen), { kind: 'best', comeback: false })
  assert.deepEqual(rankedMoveRewardDetails(current, 'before', 'f2f3', seen), { kind: 'worst', comeback: false })
  // The unseen Worst group of the remembered analysis does not count.
  assert.equal(rankedMoveRewardDetails(current, 'before', 'c2c3', seen), null)
})

test('remembered Worst suggestions survive ranking updates and the latest display of each group replaces it', () => {
  let seen = rememberMoveSuggestions([], { kind: 'worst', analysis: rewardAnalysis([], [['f2f3', -200]]) })
  const current = rewardAnalysis([['f2f3', 30]], [])
  assert.deepEqual(rankedMoveRewardDetails(current, 'before', 'f2f3', seen), { kind: 'worst', comeback: false })
  seen = rememberMoveSuggestions(seen, { kind: 'best', analysis: rewardAnalysis([['e2e4', 10]]) })
  seen = rememberMoveSuggestions(seen, { kind: 'best', analysis: rewardAnalysis([['d2d4', 20]]) })
  assert.equal(seen.length, 2)
  assert.equal(rankedMoveRewardDetails(current, 'before', 'e2e4', seen), null)
  assert.deepEqual(rankedMoveRewardDetails(current, 'before', 'd2d4', seen), { kind: 'best', comeback: false })
  assert.deepEqual(rankedMoveRewardDetails(current, 'before', 'f2f3', seen), { kind: 'worst', comeback: false })
  // If groups conflict for the same move, the one most recently visible wins.
  seen = rememberMoveSuggestions(seen, { kind: 'best', analysis: current })
  assert.deepEqual(rankedMoveRewardDetails(current, 'before', 'f2f3', seen), { kind: 'best', comeback: false })
})

test('remembered scores preserve comeback phrases and the one-pawn boundary despite later scores', () => {
  const current = rewardAnalysis([['e2e4', 30], ['d2d4', -200]])
  const seen = rememberMoveSuggestions([], { kind: 'best', analysis: rewardAnalysis([['e2e4', -101], ['d2d4', -100]]) })
  assert.deepEqual(rankedMoveRewardDetails(current, 'before', 'e2e4', seen), { kind: 'worst', comeback: true })
  assert.deepEqual(rankedMoveRewardDetails(current, 'before', 'd2d4', seen), { kind: 'best', comeback: false })
})

test('suggestions are temporary copied snapshots scoped to a valid player position and never reward forced moves', () => {
  const analysis = rewardAnalysis([['e2e4', 20]])
  const seen = rememberMoveSuggestions([], { kind: 'best', analysis })
  analysis.best[0].score = -200
  analysis.best.length = 0
  assert.deepEqual(rankedMoveRewardDetails(null, 'before', 'e2e4', seen), { kind: 'best', comeback: false })
  assert.equal(rankedMoveRewardDetails(null, 'after', 'e2e4', seen), null)
  const next = rememberMoveSuggestions(seen, { kind: 'worst', analysis: rewardAnalysis([], [['f2f3', -200]], 'after') })
  assert.equal(next.length, 1)
  assert.equal(rankedMoveRewardDetails(null, 'after', 'e2e4', next), null)
  for (const invalid of [{ ...seen[0].analysis, complete: false }, { ...seen[0].analysis, side: 'b' }, { ...seen[0].analysis, legalMoves: 1 }]) {
    assert.equal(rankedMoveRewardDetails(null, 'before', 'e2e4', [{ kind: 'best', analysis: invalid }]), null)
  }
  assert.equal(rankedMoveRewardDetails({ ...seen[0].analysis, legalMoves: 1 }, 'before', 'e2e4', seen), null)
  assert.deepEqual(rememberMoveSuggestions(seen, { kind: 'best', analysis: { ...seen[0].analysis, complete: false } }), seen)
})

test('rewarded Best/Worst lists shrink with the number of legal moves and eggs never pass the match cap', () => {
  const { rankedMovesPerList, limitRankedLists, cappedMatchEggs, EGG_REWARDS } = loadTs('lib/egg-rewards.ts')
  assert.deepEqual([40, 12, 11, 8, 7, 4, 3, 2].map(count => rankedMovesPerList(count)), [3, 3, 2, 2, 1, 1, 1, 1])
  const moves = ['a', 'b', 'c'].map((uci, index) => ({ uci, score: -index * 50, mate: null }))
  const limited = limitRankedLists({ legalMoves: 9, best: moves, worst: moves })
  assert.deepEqual(limited.best.map(move => move.uci), ['a', 'b'])
  assert.equal(EGG_REWARDS.maxMatchEggs, 12)
  assert.equal(cappedMatchEggs(5, 3), 3)
  assert.equal(cappedMatchEggs(11, 3), 1)
  assert.equal(cappedMatchEggs(12, 6), 0)
  assert.equal(cappedMatchEggs(20, 1), 0, 'a balance above the cap keeps its eggs and earns none')

  const analysis = { fen: 'before', side: 'w', legalMoves: 5, complete: true, final: true,
    best: [{ uci: 'e2e4', score: 30, mate: null }, { uci: 'd2d4', score: 20, mate: null }],
    worst: [{ uci: 'f2f3', score: -300, mate: null }, { uci: 'g2g4', score: -250, mate: null }] }
  assert.equal(rankedMoveReward(analysis, 'before', 'e2e4'), 'best')
  assert.equal(rankedMoveReward(analysis, 'before', 'd2d4'), null, 'with 5 moves only the top Best pays')
  assert.equal(rankedMoveReward(analysis, 'before', 'g2g4'), null)
  assert.equal(rankedMoveReward({ ...analysis, legalMoves: 2 }, 'before', 'f2f3'), 'worst')
})

test('eggs on a shown destination square pay any piece that lands there', () => {
  const { squareMoveRewardDetails, squareEggTargets } = loadTs('lib/chess-evaluation.ts')
  const analysis = { fen: 'before', side: 'w', legalMoves: 20, complete: true, final: true,
    best: [{ uci: 'g1f3', score: 30, mate: null }, { uci: 'e2e4', score: -150, mate: null }],
    worst: [{ uci: 'h2h4', score: -300, mate: null }] }
  const shown = { kind: 'best', analysis }
  assert.deepEqual(squareEggTargets(shown), [{ square: 'f3', kind: 'best' }, { square: 'e4', kind: 'worst' }])
  assert.deepEqual(squareMoveRewardDetails(shown, 'before', 'g2f3'), { kind: 'best', comeback: false }, 'another piece on f3 earns the Best eggs')
  assert.deepEqual(squareMoveRewardDetails(shown, 'before', 'd3e4'), { kind: 'worst', comeback: true })
  assert.equal(squareMoveRewardDetails(shown, 'before', 'h2h4'), null, 'a square from the other, unseen group pays nothing here')
  assert.equal(squareMoveRewardDetails(shown, 'after', 'g2f3'), null)
  assert.equal(squareMoveRewardDetails(null, 'before', 'g2f3'), null)
})
