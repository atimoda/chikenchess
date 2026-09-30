// Reproducible real-engine benchmark. Run: node scripts/benchmark-chess.cjs
// Wall/engine time and nodes are NOT measurements of physical-device CPU load.
const { spawn } = require('node:child_process')
const { createInterface } = require('node:readline')
const { Chess } = require('chess.js')
const { loadTs } = require('../tests/helpers/music.cjs')
const { ChessEvaluationQueue } = loadTs('lib/chess-evaluation.ts')
const positions = [
  { name:'start', moves:[] },
  { name:'e4', moves:['e4'] },
  { name:'opening', moves:['e4','e5','Nf3','Nc6','Bc4','Nf6'] },
  { name:'middlegame', fen:'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1' },
  { name:'mate', fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1' },
]
async function run(constrained, fixtures = positions) {
  const child=spawn(process.execPath,['public/engine/stockfish-19-lite-single.js'],{stdio:['pipe','pipe','inherit']})
  let resolve, reject, start, quickMs, whiteScore, mate, readyAt
  const launched=performance.now()
  const queue=new ChessEvaluationQueue({postMessage:m=>child.stdin.write(m+'\n')},{
    onBusy(){},onScore:(score,m)=>{whiteScore=score;mate=m;quickMs=performance.now()-start},
    onAnalysis:a=>{if(a)resolve({...a,whiteScore,mate,quickMs:Math.round(quickMs),totalMs:Math.round(performance.now()-start)})},
    onError:e=>reject(Error(e)),
  },constrained)
  const lines=createInterface({input:child.stdout})
  lines.on('line',m=>{if(m==='readyok')readyAt=performance.now()-launched;queue.handleMessage(m)})
  let timer
  queue.initialize()
  const results=[]
  try {
    for (const fixture of fixtures) {
      const game=new Chess(fixture.fen)
      for(const move of fixture.moves??[])game.move(move)
      start=performance.now()
      const result=await new Promise((res,rej)=>{
        resolve=res;reject=rej
        timer=setTimeout(()=>{child.kill();rej(Error('benchmark timeout'))},constrained ? 20000 : 40000)
        queue.request(game.fen(),game.turn(),game.moves({verbose:true}).map(m=>({uci:m.from+m.to+(m.promotion??''),san:m.san})))
      })
      clearTimeout(timer)
      results.push({profile:constrained?'constrained':'desktop',position:fixture.name,...result})
    }
    return {startupMs:Math.round(readyAt),results}
  } finally {clearTimeout(timer);lines.close();child.kill()}
}
if(require.main===module) (async()=>console.log(JSON.stringify({desktop:await run(false),constrained:await run(true)},null,2)))().catch(e=>{console.error(e);process.exitCode=1})
module.exports={positions,run}
