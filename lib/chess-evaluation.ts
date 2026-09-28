export type EvaluationSide = 'w' | 'b'
interface EvaluationWorker { postMessage(message: string): void }
export interface EvaluationCandidate { uci: string; san: string }
export interface EvaluatedMove extends EvaluationCandidate {
  score: number
  mate: number | null
  change: number
  changeMate: number | null
}
export interface ChessMoveAnalysis {
  fen: string
  side: EvaluationSide
  best: EvaluatedMove[]
  worst: EvaluatedMove[]
  complete: boolean
  depth: number
  nodes: number
  elapsedMs: number
  engineMs: number
  quickMs: number
  quickNodes: number
  quickDepth: number
}

/** A move can earn a reward only from a finished ranking of its starting position. */
export function rankedMoveReward(
  analysis: ChessMoveAnalysis | null,
  startingFen: string,
  uci: string,
): 'best' | 'worst' | null {
  if (!analysis?.complete || analysis.fen !== startingFen || analysis.side !== 'w') return null
  // Small legal-move sets can put the same move in both lists. Award it once.
  if (analysis.best.some(candidate => candidate.uci === uci)) return 'best'
  if (analysis.worst.some(candidate => candidate.uci === uci)) return 'worst'
  return null
}
interface EvaluationCallbacks {
  onBusy(busy: boolean): void
  onScore(score: number, mate: number | null): void
  onAnalysis(analysis: ChessMoveAnalysis | null): void
  onMove?(uci: string, fen: string): void
  onError?(message: string): void
}
export const STOCKFISH_WORKER_URL = '/engine/stockfish-19-lite-single.js'
export const ANALYSIS_BUDGETS = {
  desktop: { hash: 8, quickNodes: 4000, quickMs: 80, rankNodes: 12000, rankMs: 180, moveNodes: 6000, moveMs: 100 },
  constrained: { hash: 4, quickNodes: 1500, quickMs: 60, rankNodes: 8000, rankMs: 120, moveNodes: 2500, moveMs: 80 },
} as const
interface Request {
  fen: string; side: EvaluationSide; candidates: EvaluationCandidate[]
  position: string; key: string; skill?: number
}
interface Line { uci: string; score: number; mate: number | null; depth: number }
interface Active {
  request: Request; phase: 'quick' | 'rank' | 'move'; cancelled: boolean
  started: number; nodes: number; engineMs: number
  lines: Map<number, Map<number, Line>>; completeLines: Line[]; score: Line | null; quickMs: number; quickNodes: number
}
interface Cached { score: Line; analysis: ChessMoveAnalysis }

/** Scores from UCI are relative to the root player; UI evaluation is always White.
 * One worker serializes analysis and opponent play. Superseded searches drain at
 * bestmove before another position is sent. Only a complete MultiPV iteration
 * can claim to rank the worst moves; mixed depths are never combined.
 */
export class ChessEvaluationQueue {
  private ready = false
  private failed = false
  private active: Active | null = null
  private queued: Request | null = null
  private requestedKey: string | null = null
  private cache = new Map<string, Cached>()
  private budget: typeof ANALYSIS_BUDGETS[keyof typeof ANALYSIS_BUDGETS]
  constructor(private worker: EvaluationWorker, private callbacks: EvaluationCallbacks, constrained = false) {
    this.budget = ANALYSIS_BUDGETS[constrained ? 'constrained' : 'desktop']
  }
  initialize() { this.worker.postMessage('uci') }
  fail(message = 'Stockfish indisponível. Reabra a partida para tentar novamente.') {
    this.failed = true
    this.active = null
    this.queued = null
    this.callbacks.onBusy(false)
    this.callbacks.onAnalysis(null)
    this.callbacks.onError?.(message)
  }
  request(fen: string, side: EvaluationSide, candidates: EvaluationCandidate[], options: { position?: string; skill?: number } = {}) {
    if (this.failed) return
    const position = options.position ?? `position fen ${fen}`
    const key = position
    this.requestedKey = key
    const request = { fen, side, candidates, position, key, skill: options.skill }
    this.queued = request
    this.callbacks.onAnalysis(null)
    this.callbacks.onBusy(true)
    if (this.active) {
      this.active.cancelled = true
      this.worker.postMessage('stop')
    } else this.startQueued()
  }
  setSkill(skill: number) {
    if (this.queued?.skill !== undefined) this.queued = { ...this.queued, skill }
    const active = this.active
    if (!active || active.cancelled || active.request.skill === undefined || active.request.key !== this.requestedKey) return
    if (active.phase === 'move') {
      active.cancelled = true
      this.queued = { ...active.request, skill }
      this.worker.postMessage('stop')
    } else active.request.skill = skill
  }
  reset() {
    this.requestedKey = null
    this.queued = null
    this.callbacks.onAnalysis(null)
    this.callbacks.onBusy(false)
    if (this.active) { this.active.cancelled = true; this.worker.postMessage('stop') }
  }
  handleMessage(message: string) {
    if (this.failed) return
    if (message === 'uciok') {
      this.worker.postMessage(`setoption name Hash value ${this.budget.hash}`)
      this.worker.postMessage('setoption name Ponder value false')
      this.worker.postMessage('isready')
      return
    }
    if (message === 'readyok') { this.ready = true; this.startQueued(); return }
    if (message.includes('CRITICAL ERROR')) { this.fail(); return }
    const active = this.active
    if (!active) return
    if (message.startsWith('info ') && !active.cancelled) {
      const nodes = message.match(/\bnodes (\d+)/)
      const time = message.match(/\btime (\d+)/)
      if (nodes) active.nodes = Number(nodes[1])
      if (time) active.engineMs = Number(time[1])
      const score = message.match(/\bscore (cp|mate) (-?\d+)/)
      const pv = message.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/)
      const depth = Number(message.match(/\bdepth (\d+)/)?.[1] ?? 0)
      if (!score || !pv || /\b(lowerbound|upperbound)\b/.test(message)) return
      const value = Number(score[2])
      const mate = score[1] === 'mate' ? value : null
      const line: Line = { uci: pv[1], score: mate === null ? value : (value > 0 ? 100000 - value : -100000 - value), mate, depth }
      if (!active.request.candidates.some(move => move.uci === line.uci)) return
      const index = Number(message.match(/\bmultipv (\d+)/)?.[1] ?? 1)
      if (active.phase === 'quick' && index === 1) active.score = line
      if (active.phase === 'rank') {
        let iteration = active.lines.get(depth)
        if (!iteration) { iteration = new Map(); active.lines.set(depth, iteration) }
        iteration.set(index, line)
        const count = active.request.candidates.length
        if (iteration.size === count && new Set([...iteration.values()].map(item => item.uci)).size === count) {
          active.completeLines = [...iteration.values()].sort((a, b) => b.score - a.score)
          for (const oldDepth of active.lines.keys()) if (oldDepth < depth) active.lines.delete(oldDepth)
        }
      }
      return
    }
    if (!message.startsWith('bestmove ')) return
    this.active = null
    if (active.cancelled || active.request.key !== this.requestedKey) { this.startQueued(); return }
    const { request } = active
    if (active.phase === 'quick') {
      if (!active.score) { this.fail('A análise não retornou uma avaliação. Reabra a partida para tentar novamente.'); return }
      this.publishScore(active.score, request.side)
      this.start(request, 'rank', active.score, active.engineMs, active.nodes)
    } else if (active.phase === 'rank') {
      const labels = new Map(request.candidates.map(move => [move.uci, move.san]))
      const ranked = active.completeLines.map(line => ({
        uci: line.uci,
        san: labels.get(line.uci)!,
        score: line.score,
        mate: line.mate,
        change: line.score - (active.score?.score ?? line.score),
        changeMate: line.mate,
      }))
      const analysis: ChessMoveAnalysis = {
        fen: request.fen, side: request.side, best: ranked.slice(0, 3), worst: ranked.slice(-3).reverse(),
        complete: ranked.length === request.candidates.length, depth: active.completeLines[0]?.depth ?? 0,
        quickMs: active.quickMs, quickNodes: active.quickNodes, quickDepth: active.score?.depth ?? 0,
        nodes: active.nodes, elapsedMs: Math.round(globalThis.performance.now() - active.started), engineMs: active.engineMs,
      }
      if (active.score) {
        this.cache.set(request.key, { score: active.score, analysis })
        if (this.cache.size > 128) this.cache.delete(this.cache.keys().next().value!)
      }
      this.callbacks.onAnalysis(analysis)
      this.callbacks.onBusy(false)
      if (request.skill !== undefined) this.start(request, 'move', null)
      else this.startQueued()
    } else {
      const uci = message.split(/\s+/)[1]
      if (request.candidates.some(move => move.uci === uci)) this.callbacks.onMove?.(uci, request.fen)
      else this.fail('Stockfish não retornou um movimento legal.')
      this.startQueued()
    }
  }
  private publishScore(line: Line, side: EvaluationSide) {
    const sign = side === 'w' ? 1 : -1
    this.callbacks.onScore(sign * line.score, line.mate === null ? null : sign * line.mate)
  }
  private startQueued() {
    if (!this.ready || this.active || !this.queued || this.failed) return
    const request = this.queued
    this.queued = null
    if (!request.candidates.length) { this.callbacks.onBusy(false); return }
    const cached = this.cache.get(request.key)
    if (cached) {
      this.publishScore(cached.score, request.side)
      this.callbacks.onAnalysis(cached.analysis)
      this.callbacks.onBusy(false)
      if (request.skill !== undefined) this.start(request, 'move', null)
    } else this.start(request, 'quick', null)
  }
  private start(request: Request, phase: Active['phase'], score: Line | null, quickMs = 0, quickNodes = 0) {
    this.active = { request, phase, cancelled: false, started: globalThis.performance.now(), lines: new Map(), completeLines: [], nodes: 0, engineMs: 0, score, quickMs, quickNodes }
    this.worker.postMessage(`setoption name Skill Level value ${phase === 'move' ? request.skill : 20}`)
    this.worker.postMessage(`setoption name MultiPV value ${phase === 'rank' ? request.candidates.length : 1}`)
    this.worker.postMessage(request.position)
    const nodes = phase === 'rank' ? this.budget.rankNodes : phase === 'move' ? this.budget.moveNodes : this.budget.quickNodes
    const ms = phase === 'rank' ? this.budget.rankMs : phase === 'move' ? this.budget.moveMs : this.budget.quickMs
    this.worker.postMessage(`go nodes ${nodes} movetime ${ms}`)
  }
}

export function formatEvaluation(score: number, mate: number | null = null) {
  if (mate !== null) return `${score < 0 ? '−' : '+'}M${Math.abs(mate)}`
  return `${score > 0 ? '+' : score < 0 ? '−' : ''}${(Math.abs(score) / 100).toFixed(2)}`
}
export function formatMoveCoordinates(uci: string) {
  return `${uci.slice(0, 2)} → ${uci.slice(2, 4)}${uci[4] ? `=${uci[4].toUpperCase()}` : ''}`
}
