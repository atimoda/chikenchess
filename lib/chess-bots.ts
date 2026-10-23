import { Chess, type Move, type Square } from 'chess.js'
import botsCatalogJson from '../data/ui/bots.json'
import type { ChessMoveAnalysis } from './chess-evaluation'
import { advanceMatchPowers, createMatchPower, permittedPowerMoves, type MatchPower, type MatchPowerKind } from './chess-powers'
import { clonePoweredChess, freezeApplicationError, makePoweredChess, setPoweredChessPowers } from './powered-chess'

export type BotKind = 'pure' | 'chicken'

export interface BotConfigParams {
  delaySeconds: number // U
  freezeTopMoves: number // X
  freezeChanceBelowPercent: number // Y%
  freezeEveryMoves: number // Z
  shieldEveryMoves: number // R
  shieldChanceAbovePercent: number // T%
  worstFloorPawns: number // W: the bot's score must stay at or above W pawns after the Worst move
  worstMaxLossPawns: number // V: the Worst move may lose at most V pawns against the best move
  eggTarget: number // O: farm Worst moves only while holding fewer eggs than this
  worstCooldownMoves: number // K: minimum bot turns between two Worst moves
}

export interface BotProfile extends BotConfigParams {
  id: string
  name: string
  kind: BotKind
  skill: number
  alwaysBestMove: boolean
}

export interface BotSpecialPowerAction {
  kind: MatchPowerKind
  square: Square
}

export interface BotTurnDecision {
  powerAction: BotSpecialPowerAction | null
  insufficientEggs: boolean
  moveUci: string | null
  usedWorstMoveForEggs: boolean
  usedShieldAdvance: boolean
}

const MATERIAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

// A best move that gains this much over the current evaluation is a conversion, not a moment to farm eggs.
const WORST_SKIP_BEST_GAIN_CP = 150

/** Visual balance formula shared by the match evaluation bar (0% = Black mate, 50% = 0.00, 100% = White mate). */
export function evaluationWhitePercent(score: number | null, mate: number | null = null): number {
  if (score === null) return 50
  if (mate !== null) return score < 0 ? 0 : 100
  return 50 + (50 * score) / (Math.abs(score) + 300)
}

/** Bot's share of the evaluation bar (50% = 0.00, 100% = full bar for Bot, 0% = zeroed bar for Bot). */
export function botChancePercentFromWhiteScore(whiteScore: number | null, whiteMate: number | null = null): number {
  return 100 - evaluationWhitePercent(whiteScore, whiteMate)
}

/** Inverse of the evaluation bar formula: converts a bot chance percentage (0..100) to bot centipawns. */
export function botCentipawnsFromChancePercent(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent))
  if (clamped <= 0) return -100000
  if (clamped >= 100) return 100000
  const delta = clamped - 50
  return Math.round((300 * delta) / (50 - Math.abs(delta)))
}

function quickPositionWhiteScore(game: Chess, powers: MatchPower[]): number {
  if (game.isCheckmate()) return game.turn() === 'w' ? -100000 : 100000
  if (game.isDraw()) return 0
  let score = 0
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue
      const value = MATERIAL[piece.type] ?? 0
      const file = piece.square.charCodeAt(0) - 97
      const rank = Number(piece.square[1])
      const center = 3.5 - Math.abs(file - 3.5)
      const advance = piece.color === 'w' ? rank - 2 : 7 - rank
      const activity = piece.type === 'p' ? advance * 6 + center * 2
        : piece.type === 'n' || piece.type === 'b' ? center * 8 + (piece.color === 'w' ? rank - 1 : 8 - rank) * 5
        : piece.type === 'q' ? center * 2 : 0
      score += (piece.color === 'w' ? 1 : -1) * (value + activity)
    }
  }
  for (const power of powers) {
    if (power.kind === 'freeze' && power.frozenColor) score += power.frozenColor === 'w' ? -30 : 30
    if (power.kind === 'shield' && power.attachedColor) score += power.attachedColor === 'w' ? 20 : -20
  }
  if (game.isCheck()) score += game.turn() === 'w' ? -70 : 70
  return score
}

function moveToUci(move: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`
}

/** Rank the opponent's (White's) available moves on the current board, best first for White. */
export function rankOpponentMovesForBot(game: Chess, powers: MatchPower[]): Move[] {
  try {
    const botColor = game.turn()
    const opponentColor = botColor === 'w' ? 'b' : 'w'
    const ownPly = game.history().length + 1
    const fen = game.fen().split(' ')
    fen[1] = opponentColor
    fen[3] = '-'
    const opponentPowers = powers
      .filter(item => (item.trapUntilPly ?? item.blocksOnPly) > ownPly)
      .map(item => ({
        ...item,
        blocksOnPly: item.blocksOnPly - ownPly,
        trapUntilPly: item.trapUntilPly === undefined ? undefined : item.trapUntilPly - ownPly,
      }))
    const opponentGame = makePoweredChess(new Chess(fen.join(' ')), opponentPowers)
    const moves = opponentGame.moves({ verbose: true })
    const scored = moves.map(candidate => {
      const next = clonePoweredChess(opponentGame, opponentPowers)
      const played = next.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion })
      const nextPowers = advanceMatchPowers(opponentPowers, played, next, next.history().length)
      setPoweredChessPowers(next, nextPowers)
      const captureBonus = candidate.captured ? (MATERIAL[candidate.captured] ?? 100) * 0.25 : 0
      const whiteScore = quickPositionWhiteScore(next, nextPowers) + captureBonus
      return { move: candidate, score: whiteScore }
    })
    scored.sort((a, b) => b.score - a.score)
    return scored.map(entry => entry.move)
  } catch {
    return []
  }
}

function canApplyBotFreezeOnSquare(game: Chess, powers: MatchPower[], square: Square, plannedMove?: Move): boolean {
  if (powers.some(power => power.kind === 'freeze' && power.square === square)) return false
  const botColor = game.turn()
  const occupant = game.get(square)
  if (occupant?.color === botColor) return false
  const power = createMatchPower('freeze', square, game, -1)
  if (freezeApplicationError(game, powers, power)) return false
  if (plannedMove) {
    const nextPowers = [...powers, power]
    const permitted = permittedPowerMoves([plannedMove], nextPowers, game.history().length + 1)
    if (!permitted.length) return false
  }
  return true
}

/**
 * Pick a Freeze target among the opponent pieces that play its top X available moves, at random.
 * Only the moving piece (`from`) is frozen: an empty destination would just become a trap the
 * opponent can avoid. A piece that the bot's planned move captures is never frozen, since a
 * frozen piece cannot be captured.
 */
export function selectBotFreezeSquare(
  game: Chess,
  powers: MatchPower[],
  topX: number,
  random: () => number = Math.random,
  plannedMove?: Move,
): Square | null {
  const opponentMoves = rankOpponentMovesForBot(game, powers)
  if (!opponentMoves.length) return null
  const limit = Math.max(1, Math.min(opponentMoves.length, Math.round(topX)))
  const topCandidates = opponentMoves.slice(0, limit)

  // Shuffle top X candidates using the provided random generator.
  const indices = topCandidates.map((_, index) => index)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temp = indices[i]!
    indices[i] = indices[j]!
    indices[j] = temp
  }

  for (const idx of indices) {
    const square = topCandidates[idx]!.from
    if (canApplyBotFreezeOnSquare(game, powers, square, plannedMove)) return square
  }
  return null
}

/**
 * Find a legal non-capture move where one of the bot's own pieces advances into a square
 * currently attacked by the opponent (White), so the bot can Shield that piece first and
 * advance safely 1 second later.
 */
export function selectBotShieldAdvanceMove(
  game: Chess,
  powers: MatchPower[],
  permittedMoves: Move[],
  blackAnalysis: ChessMoveAnalysis | null,
  random: () => number = Math.random,
): { shieldSquare: Square; moveUci: string } | null {
  const unpowered = clonePoweredChess(game, [])
  const candidates = permittedMoves.filter(move => {
    if (move.color !== 'b' || move.captured) return false
    if (Number(move.to[1]) > Number(move.from[1])) return false
    if (powers.some(power => power.kind === 'shield' && power.square === move.from)) return false
    const attackedByWhite = unpowered.isAttacked(move.to, 'w')
    if (!attackedByWhite) return false
    const testPower = createMatchPower('shield', move.from, game, -1)
    const afterShield = permittedPowerMoves([move], [...powers, testPower], game.history().length + 1)
    return afterShield.length > 0
  })

  if (!candidates.length) return null

  if (blackAnalysis?.complete) {
    const scoreByUci = new Map<string, number>()
    for (const item of [...blackAnalysis.best, ...blackAnalysis.worst]) {
      scoreByUci.set(item.uci, item.score)
    }
    candidates.sort((a, b) => (scoreByUci.get(moveToUci(b)) ?? 0) - (scoreByUci.get(moveToUci(a)) ?? 0))
  }

  const topCount = Math.min(candidates.length, 2)
  const chosen = candidates[Math.floor(random() * topCount)] ?? candidates[0]!
  return {
    shieldSquare: chosen.from,
    moveUci: moveToUci(chosen),
  }
}

export function getBotConfigParams(profile: BotConfigParams): BotConfigParams {
  return {
    delaySeconds: profile.delaySeconds,
    freezeTopMoves: profile.freezeTopMoves,
    freezeChanceBelowPercent: profile.freezeChanceBelowPercent,
    freezeEveryMoves: profile.freezeEveryMoves,
    shieldEveryMoves: profile.shieldEveryMoves,
    shieldChanceAbovePercent: profile.shieldChanceAbovePercent,
    worstFloorPawns: profile.worstFloorPawns,
    worstMaxLossPawns: profile.worstMaxLossPawns,
    eggTarget: profile.eggTarget,
    worstCooldownMoves: profile.worstCooldownMoves,
  }
}

export class ChessBot {
  readonly id: string
  readonly name: string
  readonly kind: BotKind
  readonly skill: number
  readonly alwaysBestMove: boolean
  delaySeconds: number
  freezeTopMoves: number
  freezeChanceBelowPercent: number
  freezeEveryMoves: number
  shieldEveryMoves: number
  shieldChanceAbovePercent: number
  worstFloorPawns: number
  worstMaxLossPawns: number
  eggTarget: number
  worstCooldownMoves: number

  constructor(profile: BotProfile, overrides?: Partial<BotConfigParams>) {
    this.id = profile.id
    this.name = profile.name
    this.kind = profile.kind
    this.skill = profile.skill
    this.alwaysBestMove = profile.alwaysBestMove
    this.delaySeconds = overrides?.delaySeconds ?? profile.delaySeconds
    this.freezeTopMoves = overrides?.freezeTopMoves ?? profile.freezeTopMoves
    this.freezeChanceBelowPercent = overrides?.freezeChanceBelowPercent ?? profile.freezeChanceBelowPercent
    this.freezeEveryMoves = overrides?.freezeEveryMoves ?? profile.freezeEveryMoves
    this.shieldEveryMoves = overrides?.shieldEveryMoves ?? profile.shieldEveryMoves
    this.shieldChanceAbovePercent = overrides?.shieldChanceAbovePercent ?? profile.shieldChanceAbovePercent
    this.worstFloorPawns = overrides?.worstFloorPawns ?? profile.worstFloorPawns
    this.worstMaxLossPawns = overrides?.worstMaxLossPawns ?? profile.worstMaxLossPawns
    this.eggTarget = overrides?.eggTarget ?? profile.eggTarget
    this.worstCooldownMoves = overrides?.worstCooldownMoves ?? profile.worstCooldownMoves
  }

  get isPureChess(): boolean {
    return this.kind === 'pure'
  }

  get isChickenBot(): boolean {
    return this.kind === 'chicken'
  }

  get delayMs(): number {
    return Math.max(0, Math.round(this.delaySeconds * 1000))
  }

  toProfile(): BotProfile {
    return {
      id: this.id,
      name: this.name,
      kind: this.kind,
      skill: this.skill,
      alwaysBestMove: this.alwaysBestMove,
      delaySeconds: this.delaySeconds,
      freezeTopMoves: this.freezeTopMoves,
      freezeChanceBelowPercent: this.freezeChanceBelowPercent,
      freezeEveryMoves: this.freezeEveryMoves,
      shieldEveryMoves: this.shieldEveryMoves,
      shieldChanceAbovePercent: this.shieldChanceAbovePercent,
      worstFloorPawns: this.worstFloorPawns,
      worstMaxLossPawns: this.worstMaxLossPawns,
      eggTarget: this.eggTarget,
      worstCooldownMoves: this.worstCooldownMoves,
    }
  }

  toUpdatedProfile(): BotProfile {
    return this.toProfile()
  }

  withParams(params: Partial<BotConfigParams>): ChessBot {
    return new ChessBot(this.toProfile(), params)
  }

  private selectStandardMove(
    permittedUcis: string[],
    blackAnalysis: ChessMoveAnalysis | null,
    stockfishSuggestedUci: string | null,
    bestAvailableUci: string | null,
  ): string | null {
    if (!permittedUcis.length) return null
    if (this.alwaysBestMove) {
      const topRanked = blackAnalysis?.best.find(candidate => permittedUcis.includes(candidate.uci))?.uci
      if (topRanked) return topRanked
      if (bestAvailableUci && permittedUcis.includes(bestAvailableUci)) return bestAvailableUci
      if (stockfishSuggestedUci && permittedUcis.includes(stockfishSuggestedUci)) return stockfishSuggestedUci
      return permittedUcis[0] ?? null
    }
    if (stockfishSuggestedUci && permittedUcis.includes(stockfishSuggestedUci)) return stockfishSuggestedUci
    const topRanked = blackAnalysis?.best.find(candidate => permittedUcis.includes(candidate.uci))?.uci
    if (topRanked) return topRanked
    if (bestAvailableUci && permittedUcis.includes(bestAvailableUci)) return bestAvailableUci
    return permittedUcis[0] ?? null
  }

  decideTurn(options: {
    game: Chess
    powers?: MatchPower[]
    matchPowers?: MatchPower[]
    botTurnNumber?: number
    botTurnCount?: number
    /** Bot turn number of the last Worst move played for eggs, if any. */
    lastWorstMoveTurn?: number | null
    botEggs: number
    whiteScore?: number | null
    whiteEvalScore?: number | null
    whiteMate?: number | null
    blackAnalysis?: ChessMoveAnalysis | null
    analysis?: ChessMoveAnalysis | null
    stockfishSuggestedUci: string | null
    bestAvailableUci: string | null
    permittedMoves?: Move[]
    legalUciMoves?: string[]
    random?: () => number
  }): BotTurnDecision {
    const {
      game,
      powers = options.matchPowers ?? [],
      botTurnNumber = options.botTurnCount ?? 0,
      lastWorstMoveTurn = null,
      botEggs,
      whiteScore = options.whiteEvalScore ?? null,
      whiteMate = null,
      blackAnalysis = options.analysis ?? null,
      stockfishSuggestedUci,
      bestAvailableUci,
      random = Math.random,
    } = options
    const permittedMoves = options.permittedMoves ?? (options.legalUciMoves ? options.legalUciMoves.map(uci => {
      const from = uci.slice(0, 2) as Square
      const to = uci.slice(2, 4) as Square
      const promotion = uci[4] as Move['promotion']
      return { from, to, promotion, color: game.turn() } as Move
    }) : game.moves({ verbose: true }))
    const permittedUcis = options.legalUciMoves ?? permittedMoves.map(moveToUci)

    if (this.isPureChess) {
      return {
        powerAction: null,
        insufficientEggs: false,
        moveUci: this.selectStandardMove(permittedUcis, blackAnalysis, stockfishSuggestedUci, bestAvailableUci),
        usedWorstMoveForEggs: false,
        usedShieldAdvance: false,
      }
    }

    const botPercent = botChancePercentFromWhiteScore(whiteScore, whiteMate)
    const freezeEmergency = botPercent < this.freezeChanceBelowPercent
    const freezePeriodic = this.freezeEveryMoves > 0 && botTurnNumber > 0 && botTurnNumber % this.freezeEveryMoves === 0
    const shouldTryFreeze = freezeEmergency || freezePeriodic
    const shouldTryShield =
      this.shieldEveryMoves > 0 &&
      botTurnNumber > 0 &&
      botTurnNumber % this.shieldEveryMoves === 0 &&
      botPercent > this.shieldChanceAbovePercent

    let desiredPower: BotSpecialPowerAction | null = null
    let shieldAdvanceMoveUci: string | null = null

    // Freeze must not take away the capture the bot is about to play.
    const plannedUci = this.selectStandardMove(permittedUcis, blackAnalysis, stockfishSuggestedUci, bestAvailableUci)
    const plannedMove = plannedUci ? game.moves({ verbose: true }).find(move => moveToUci(move) === plannedUci) : undefined

    const tryResolveFreeze = (): BotSpecialPowerAction | null => {
      const targetSquare = selectBotFreezeSquare(game, powers, this.freezeTopMoves, random, plannedMove)
      if (!targetSquare) return null
      return { kind: 'freeze', square: targetSquare }
    }

    const tryResolveShield = (): { power: BotSpecialPowerAction; moveUci: string } | null => {
      const candidate = selectBotShieldAdvanceMove(game, powers, permittedMoves, blackAnalysis, random)
      if (!candidate) return null
      return { power: { kind: 'shield', square: candidate.shieldSquare }, moveUci: candidate.moveUci }
    }

    if (freezeEmergency) {
      const freeze = tryResolveFreeze()
      if (freeze) {
        desiredPower = freeze
      } else if (shouldTryShield) {
        const shield = tryResolveShield()
        if (shield) {
          desiredPower = shield.power
          shieldAdvanceMoveUci = shield.moveUci
        }
      }
    } else if (shouldTryShield) {
      const shield = tryResolveShield()
      if (shield) {
        desiredPower = shield.power
        shieldAdvanceMoveUci = shield.moveUci
      } else if (freezePeriodic) {
        desiredPower = tryResolveFreeze()
      }
    } else if (freezePeriodic) {
      desiredPower = tryResolveFreeze()
    }

    let powerAction: BotSpecialPowerAction | null = null
    let insufficientEggs = false

    if (desiredPower) {
      if (botEggs >= 3) {
        powerAction = desiredPower
      } else {
        insufficientEggs = true
        shieldAdvanceMoveUci = null
      }
    } else if ((shouldTryFreeze || shouldTryShield) && botEggs < 3) {
      insufficientEggs = true
    }

    // If a power will be applied first, make sure the chosen normal move remains legal with that power active.
    const effectivePowers = powerAction
      ? [...powers, createMatchPower(powerAction.kind, powerAction.square, game, -1)]
      : powers
    const effectivePermittedMoves = powerAction
      ? permittedPowerMoves(permittedMoves, effectivePowers, game.history().length + 1)
      : permittedMoves
    const effectivePermittedUcis = effectivePermittedMoves.map(moveToUci)

    if (powerAction?.kind === 'shield' && shieldAdvanceMoveUci && effectivePermittedUcis.includes(shieldAdvanceMoveUci)) {
      return {
        powerAction,
        insufficientEggs: false,
        moveUci: shieldAdvanceMoveUci,
        usedWorstMoveForEggs: false,
        usedShieldAdvance: true,
      }
    }

    // Worst move for 3 eggs: only on a turn without a power, while short of eggs, after the cooldown,
    // and only when the move gives up at most V pawns and keeps the bot at W pawns or better.
    const worstCooldownOver = lastWorstMoveTurn === null || botTurnNumber - lastWorstMoveTurn >= this.worstCooldownMoves
    const bestCandidate = blackAnalysis?.best.find(candidate => effectivePermittedUcis.includes(candidate.uci))
    const botScore = whiteScore === null ? null : -whiteScore
    if (
      !powerAction &&
      botEggs < this.eggTarget &&
      worstCooldownOver &&
      whiteMate === null &&
      blackAnalysis?.complete &&
      blackAnalysis.legalMoves > 1 &&
      blackAnalysis.worst.length > 0 &&
      bestCandidate &&
      bestCandidate.mate === null &&
      (botScore === null || bestCandidate.score - botScore <= WORST_SKIP_BEST_GAIN_CP)
    ) {
      const floorCp = this.worstFloorPawns * 100
      const maxLossCp = this.worstMaxLossPawns * 100
      const eligibleWorst = blackAnalysis.worst
        .filter(
          candidate =>
            effectivePermittedUcis.includes(candidate.uci) &&
            !blackAnalysis.best.some(best => best.uci === candidate.uci) &&
            candidate.mate === null &&
            candidate.score >= floorCp &&
            bestCandidate.score - candidate.score <= maxLossCp,
        )
        .sort((a, b) => b.score - a.score)
      const chosenWorst = eligibleWorst[0]
      if (chosenWorst) {
        return {
          powerAction,
          insufficientEggs,
          moveUci: chosenWorst.uci,
          usedWorstMoveForEggs: true,
          usedShieldAdvance: false,
        }
      }
    }

    return {
      powerAction,
      insufficientEggs,
      moveUci: this.selectStandardMove(effectivePermittedUcis, blackAnalysis, stockfishSuggestedUci, bestAvailableUci),
      usedWorstMoveForEggs: false,
      usedShieldAdvance: false,
    }
  }
}

export const DEFAULT_BOT_PROFILES: BotProfile[] = (botsCatalogJson as BotProfile[]).map(profile => ({ ...profile }))

export const DEFAULT_BOT_ID = DEFAULT_BOT_PROFILES.find(p => p.id === 'easy-chickenbot')?.id ?? 'easy-chickenbot'

export function createChessBots(profiles: readonly BotProfile[] = DEFAULT_BOT_PROFILES): ChessBot[] {
  return profiles.map(profile => new ChessBot(profile))
}
