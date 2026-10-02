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
  source?: 'powers'
  fen: string
  side: EvaluationSide
  legalMoves: number
  final: boolean
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

export type RankedMoveLabelTone = 'best' | 'warning' | 'worst'

/** The arrow label color follows the score printed on that label. */
export function rankedMoveLabelTone(score: number, mate: number | null = null): RankedMoveLabelTone {
  if (mate !== null && mate < 0) return 'worst'
  if (score < -100) return 'worst'
  if (score < 0) return 'warning'
  return 'best'
}

/** A move can earn a reward from the latest complete iteration of its starting position. */
export function rankedMoveReward(
  analysis: ChessMoveAnalysis | null,
  startingFen: string,
  uci: string,
): 'best' | 'worst' | null {
  if (!analysis?.complete || analysis.fen !== startingFen || analysis.side !== 'w') return null
  // There is no choice to reward when the only legal move is forced.
  if (analysis.legalMoves === 1) return null
  const bestMove = analysis.best.find(candidate => candidate.uci === uci)
  if (bestMove) return rankedMoveLabelTone(bestMove.score, bestMove.mate) === 'worst' ? 'worst' : 'best'
  if (analysis.worst.some(candidate => candidate.uci === uci)) return 'worst'
  return null
}
interface EvaluationCallbacks {
  onBusy(busy: boolean): void
  onScore(score: number, mate: number | null): void
  onAnalysis(analysis: ChessMoveAnalysis | null): void
  onProgress?(analysis: ChessMoveAnalysis | null): void
  onMove?(uci: string, fen: string): void
  onError?(message: string): void
  onTrace?(trace: StockfishTrace): void
}
export interface StockfishTraceLine {
  multipv: number
  uci: string
  san: string
  score: number
  mate: number | null
  depth: number
  pv: string[]
  bound: 'lower' | 'upper' | null
}
export interface StockfishTrace {
  fen: string
  side: EvaluationSide
  phase: 'waiting' | 'quick' | 'rank' | 'move' | 'cached' | 'finished' | 'idle' | 'error'
  legalMoves: number
  depth: number
  completeDepth: number
  nodes: number
  engineMs: number
  nps: number
  lines: StockfishTraceLine[]
  raw: string[]
}
export const STOCKFISH_WORKER_URL = '/engine/stockfish-19-lite-single.js'
export const ANALYSIS_BUDGETS = {
  desktop: { hash: 8, quickNodes: 6000, quickMs: 120, rankNodes: 25000000, rankMs: 30000, tacticalNodes: 25000000, tacticalMs: 30000, moveNodes: 6000, moveMs: 100 },
  constrained: { hash: 4, quickNodes: 2500, quickMs: 80, rankNodes: 40000, rankMs: 350, tacticalNodes: 120000, tacticalMs: 700, moveNodes: 2500, moveMs: 80 },
} as const
interface Request {
  fen: string; side: EvaluationSide; candidates: EvaluationCandidate[]
  position: string; key: string; skill?: number; searchMoves?: string[]
}
interface Line { uci: string; score: number; mate: number | null; depth: number }
interface Active {
  request: Request; phase: 'quick' | 'rank' | 'move'; cancelled: boolean
  started: number; nodes: number; engineMs: number
  lines: Map<number, Map<number, Line>>; completeLines: Line[]; score: Line | null; quickMs: number; quickNodes: number
  traceLines: Map<number, StockfishTraceLine>; traceRaw: string[]; traceDepth: number; nps: number
}
interface Cached { score: Line; analysis: ChessMoveAnalysis; trace: StockfishTrace }

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
  private lastTrace: StockfishTrace | null = null
  constructor(private worker: EvaluationWorker, private callbacks: EvaluationCallbacks, private constrained = false) {
    this.budget = ANALYSIS_BUDGETS[constrained ? 'constrained' : 'desktop']
  }
  initialize() { this.worker.postMessage('uci') }
  bestAvailableMove(fen: string): string | null {
    const active = this.active
    if (!active || active.cancelled || active.request.fen !== fen || active.request.key !== this.requestedKey) return null
    const allowed = active.request.searchMoves
    return [active.completeLines[0]?.uci, ...active.completeLines.map(line => line.uci), active.traceLines.get(1)?.uci, active.score?.uci]
      .find((uci): uci is string => !!uci && (!allowed || allowed.includes(uci))) ?? null
  }
  fail(message = 'Stockfish indisponível. Reabra a partida para tentar novamente.') {
    this.failed = true
    this.active = null
    this.queued = null
    this.callbacks.onBusy(false)
    this.callbacks.onAnalysis(null)
    this.callbacks.onProgress?.(null)
    this.emitTrace({ ...(this.lastTrace ?? this.emptyTrace('', 'w', 'error', 0)), phase: 'error' })
    this.callbacks.onError?.(message)
  }
  request(fen: string, side: EvaluationSide, candidates: EvaluationCandidate[], options: { position?: string; skill?: number; searchMoves?: string[] } = {}) {
    if (this.failed) return
    const position = options.position ?? `position fen ${fen}`
    const key = options.searchMoves?.length ? `${position} | searchmoves ${options.searchMoves.join(' ')}` : position
    this.requestedKey = key
    const request = { fen, side, candidates, position, key, skill: options.skill, searchMoves: options.searchMoves }
    this.queued = request
    this.emitTrace(this.emptyTrace(fen, side, 'waiting', candidates.length))
    this.callbacks.onAnalysis(null)
    this.callbacks.onProgress?.(null)
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
    this.callbacks.onProgress?.(null)
    this.callbacks.onBusy(false)
    this.emitTrace(this.emptyTrace('', 'w', 'idle', 0))
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
      active.traceRaw.push(message)
      if (active.traceRaw.length > 500) active.traceRaw.shift()
      const nodes = message.match(/\bnodes (\d+)/)
      const time = message.match(/\btime (\d+)/)
      const nps = message.match(/\bnps (\d+)/)
      if (nodes) active.nodes = Number(nodes[1])
      if (time) active.engineMs = Number(time[1])
      if (nps) active.nps = Number(nps[1])
      const score = message.match(/\bscore (cp|mate) (-?\d+)/)
      const pv = message.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/)
      const depth = Number(message.match(/\bdepth (\d+)/)?.[1] ?? 0)
      active.traceDepth = Math.max(active.traceDepth, depth)
      if (!score || !pv) { this.publishTrace(active); return }
      const value = Number(score[2])
      const mate = score[1] === 'mate' ? value : null
      const line: Line = { uci: pv[1], score: mate === null ? value : (value > 0 ? 100000 - value : -100000 - value), mate, depth }
      const candidate = active.request.candidates.find(move => move.uci === line.uci)
      if (!candidate) { this.publishTrace(active); return }
      const index = Number(message.match(/\bmultipv (\d+)/)?.[1] ?? 1)
      if (depth > 0 && depth >= (active.traceLines.get(index)?.depth ?? 0)) active.traceLines.set(index, {
        multipv: index, uci: line.uci, san: candidate.san, score: line.score, mate, depth,
        pv: message.split(/\bpv /)[1]?.trim().split(/\s+/) ?? [],
        bound: /\blowerbound\b/.test(message) ? 'lower' : /\bupperbound\b/.test(message) ? 'upper' : null,
      })
      if (/\b(lowerbound|upperbound)\b/.test(message)) { this.publishTrace(active); return }
      if (active.phase === 'quick' && index === 1) active.score = line
      if (active.phase === 'rank') {
        let iteration = active.lines.get(depth)
        if (!iteration) { iteration = new Map(); active.lines.set(depth, iteration) }
        iteration.set(index, line)
        const count = active.request.candidates.length
        if (depth > (active.completeLines[0]?.depth ?? 0) && iteration.size === count && new Set([...iteration.values()].map(item => item.uci)).size === count) {
          active.completeLines = [...iteration.values()].sort((a, b) => b.score - a.score)
          for (const oldDepth of active.lines.keys()) if (oldDepth < depth) active.lines.delete(oldDepth)
          this.callbacks.onProgress?.(this.buildAnalysis(active, false))
        }
      }
      this.publishTrace(active)
      return
    }
    if (!message.startsWith('bestmove ')) return
    if (!active.cancelled) {
      active.traceRaw.push(message)
      if (active.traceRaw.length > 500) active.traceRaw.shift()
      this.publishTrace(active)
    }
    this.active = null
    if (active.cancelled || active.request.key !== this.requestedKey) { this.startQueued(); return }
    const { request } = active
    if (active.phase === 'quick') {
      if (!active.score) { this.fail('A análise não retornou uma avaliação. Reabra a partida para tentar novamente.'); return }
      this.publishScore(active.score, request.side)
      this.start(request, request.skill !== undefined ? 'move' : 'rank', active.score, active.engineMs, active.nodes)
    } else if (active.phase === 'rank') {
      const analysis = this.buildAnalysis(active, true)
      if (active.score && analysis.complete) {
        this.cache.set(request.key, { score: active.score, analysis, trace: this.buildTrace(active) })
        if (this.cache.size > 128) this.cache.delete(this.cache.keys().next().value!)
      }
      this.callbacks.onAnalysis(analysis)
      this.callbacks.onProgress?.(analysis)
      this.emitTrace({ ...this.buildTrace(active), phase: 'finished' })
      this.callbacks.onBusy(false)
      this.startQueued()
    } else {
      const uci = message.split(/\s+/)[1]
      if (request.candidates.some(move => move.uci === uci) && (!request.searchMoves || request.searchMoves.includes(uci))) this.callbacks.onMove?.(uci, request.fen)
      else this.fail('Stockfish não retornou um movimento legal.')
      if (!this.failed) {
        if (this.cache.has(request.key)) this.startQueued()
        else this.start(request, 'rank', active.score, active.quickMs, active.quickNodes)
      }
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
      this.callbacks.onProgress?.(cached.analysis)
      this.emitTrace({ ...cached.trace, phase: 'cached' })
      this.callbacks.onBusy(false)
      if (request.skill !== undefined) this.start(request, 'move', null)
    } else this.start(request, 'quick', null)
  }
  private start(request: Request, phase: Active['phase'], score: Line | null, quickMs = 0, quickNodes = 0) {
    const previousRaw = this.lastTrace?.fen === request.fen ? this.lastTrace.raw : []
    this.active = { request, phase, cancelled: false, started: globalThis.performance.now(), lines: new Map(), completeLines: [], nodes: 0, engineMs: 0, score, quickMs, quickNodes, traceLines: new Map(), traceRaw: [...previousRaw.slice(-350), `--- ${phase} ---`], traceDepth: 0, nps: 0 }
    this.publishTrace(this.active)
    this.worker.postMessage(`setoption name Skill Level value ${phase === 'move' ? request.skill : 20}`)
    this.worker.postMessage(`setoption name MultiPV value ${phase === 'rank' ? request.candidates.length : 1}`)
    this.worker.postMessage(request.position)
    const tactical = phase === 'rank' && score !== null && (score.mate !== null || Math.abs(score.score) >= 1000)
    const nodes = phase === 'rank' ? (tactical ? this.budget.tacticalNodes : this.budget.rankNodes) : phase === 'move' ? this.budget.moveNodes : this.budget.quickNodes
    const ms = phase === 'rank' ? (tactical ? this.budget.tacticalMs : this.budget.rankMs) : phase === 'move' ? this.budget.moveMs : this.budget.quickMs
    const depth = phase === 'rank' && !this.constrained ? ' depth 15' : ''
    const searchMoves = request.searchMoves?.length ? ` searchmoves ${request.searchMoves.join(' ')}` : ''
    this.worker.postMessage(`go nodes ${nodes} movetime ${ms}${depth}${searchMoves}`)
  }
  private emptyTrace(fen: string, side: EvaluationSide, phase: StockfishTrace['phase'], legalMoves: number): StockfishTrace {
    return { fen, side, phase, legalMoves, depth: 0, completeDepth: 0, nodes: 0, engineMs: 0, nps: 0, lines: [], raw: [] }
  }
  private buildAnalysis(active: Active, final: boolean): ChessMoveAnalysis {
    const labels = new Map(active.request.candidates.map(move => [move.uci, move.san]))
    const bestScore = active.completeLines[0]?.score ?? 0
    const ranked = active.completeLines.map(line => ({
      uci: line.uci, san: labels.get(line.uci)!, score: line.score, mate: line.mate,
      change: line.score - bestScore, changeMate: line.mate,
    }))
    return {
      fen: active.request.fen, side: active.request.side, legalMoves: active.request.candidates.length, final,
      best: ranked.slice(0, 3), worst: ranked.slice(-3).reverse(),
      complete: ranked.length === active.request.candidates.length, depth: active.completeLines[0]?.depth ?? 0,
      quickMs: active.quickMs, quickNodes: active.quickNodes, quickDepth: active.score?.depth ?? 0,
      nodes: active.nodes, elapsedMs: Math.round(globalThis.performance.now() - active.started), engineMs: active.engineMs,
    }
  }
  private buildTrace(active: Active): StockfishTrace {
    return {
      fen: active.request.fen, side: active.request.side, phase: active.phase,
      legalMoves: active.request.candidates.length, depth: active.traceDepth,
      completeDepth: active.completeLines[0]?.depth ?? 0,
      nodes: active.nodes, engineMs: active.engineMs, nps: active.nps,
      lines: [...active.traceLines.values()].sort((a, b) => a.multipv - b.multipv), raw: [...active.traceRaw],
    }
  }
  private publishTrace(active: Active) { this.emitTrace(this.buildTrace(active)) }
  private emitTrace(trace: StockfishTrace) { this.lastTrace = trace; this.callbacks.onTrace?.(trace) }
}

export function formatEvaluation(score: number, mate: number | null = null) {
  if (mate !== null) return `${score < 0 ? '−' : '+'}M${Math.abs(mate)}`
  return `${score > 0 ? '+' : score < 0 ? '−' : ''}${(Math.abs(score) / 100).toFixed(2)}`
}
export function formatMoveCoordinates(uci: string) {
  return `${uci.slice(0, 2)} → ${uci.slice(2, 4)}${uci[4] ? `=${uci[4].toUpperCase()}` : ''}`
}
