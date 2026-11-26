import type { Chess, Move, Square } from 'chess.js'
import botsCatalogJson from '../data/ui/bots.json'
import type { ChessMoveAnalysis } from './chess-evaluation'
import { createMatchPower, hasUsedPowerThisTurn, permittedPowerMoves, type MatchPower, type MatchPowerKind } from './chess-powers'
import { MATE_VALUE, evaluateBotPlan, pieceValue, shieldedAdvanceThreatens, threatsAfterPlan, topThreat, type PoweredPosition } from './chess-bot-tactics'
import { freezeApplicationError } from './powered-chess'
import { limitRankedLists } from './egg-rewards'
import { msg } from './i18n'

export type BotKind = 'pure' | 'chicken'

export interface BotConfigParams {
  delaySeconds: number // U
  powerUsePercent: number // N: chance the bot looks for a Freeze/Shield on a turn
  freezeMinThreatPawns: number // Y: the Freeze must take away at least Y pawns of opponent threat
  freezeCooldownMoves: number // Z: minimum bot turns between two Freezes
  shieldMinPiecePawns: number // T: the Shield must save at least T pawns (and a piece worth T)
  shieldCooldownMoves: number // R: minimum bot turns between two Shields
  powerMinGainPawns: number // P: two-ply check of the power plan must gain P pawns (0 = no check, no Shield advance)
  powerReserveEggs: number // Q: eggs kept after a Freeze or Shield advance (mate and piece rescue may spend all)
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

/** Why the bot used a power: stop a mate, save a piece, take away a threat, or protect an advance. */
export type BotPowerReason = 'mate' | 'rescue' | 'threat' | 'advance'

export interface BotTurnDecision {
  powerAction: BotSpecialPowerAction | null
  powerReason: BotPowerReason | null
  insufficientEggs: boolean
  moveUci: string | null
  usedWorstMoveForEggs: boolean
  usedShieldAdvance: boolean
}

interface PowerPlan {
  power: BotSpecialPowerAction
  reason: BotPowerReason
  moveUci: string
  benefit: number
}

const POWER_COST = 3
const REASON_PRIORITY: Record<BotPowerReason, number> = { mate: 0, rescue: 1, threat: 2, advance: 3 }
// Two-ply checks run on the main thread; keep their number small.
const MAX_CHECKED_PLANS = 2

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

function moveToUci(move: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`
}

function cooldownOver(lastTurn: number | null, turn: number, cooldown: number): boolean {
  return lastTurn === null || turn - lastTurn >= cooldown
}

function canApplyBotFreezeOnSquare(game: Chess, powers: MatchPower[], square: Square, plannedMove?: Move): boolean {
  if (powers.some(power => power.kind === 'freeze' && power.square === square)) return false
  const occupant = game.get(square)
  if (!occupant || occupant.color === game.turn()) return false
  const power = createMatchPower('freeze', square, game, -1)
  if (freezeApplicationError(game, powers, power)) return false
  if (plannedMove && !permittedPowerMoves([plannedMove], [...powers, power], game.history().length + 1).length) return false
  return true
}

function canApplyBotShieldOnSquare(game: Chess, powers: MatchPower[], square: Square): boolean {
  if (powers.some(power => power.kind === 'shield' && power.square === square)) return false
  const occupant = game.get(square)
  return !!occupant && occupant.color === game.turn() && occupant.type !== 'k'
}

/**
 * Freeze and Shield plans that take away the opponent's threats left after the
 * bot's planned move: the attacker is frozen, or the attacked piece is shielded.
 */
export function findDefensivePowerPlans(position: PoweredPosition, plannedMove: Move): PowerPlan[] {
  const { game, powers } = position
  const plannedUci = moveToUci(plannedMove)
  const threats = threatsAfterPlan(position, null, plannedUci) ?? []
  const before = topThreat(threats)
  if (before <= 0) return []
  const plans: PowerPlan[] = []
  const consider = (power: BotSpecialPowerAction, reason: Exclude<BotPowerReason, 'mate' | 'advance'>) => {
    const after = threatsAfterPlan(position, power, plannedUci)
    if (!after) return
    const remaining = topThreat(after)
    const benefit = before - remaining
    if (benefit <= 0) return
    plans.push({ power, reason: before >= MATE_VALUE && remaining < MATE_VALUE ? 'mate' : reason, moveUci: plannedUci, benefit })
  }
  for (const from of new Set(threats.map(threat => threat.from))) {
    if (canApplyBotFreezeOnSquare(game, powers, from, plannedMove)) consider({ kind: 'freeze', square: from }, 'threat')
  }
  for (const target of new Set(threats.filter(threat => threat.gain < MATE_VALUE).map(threat => threat.to))) {
    // The planned move may be the one that walks into the attack: the Shield goes on its origin and follows it.
    const square = target === plannedMove.to ? plannedMove.from : target
    if (canApplyBotShieldOnSquare(game, powers, square)) consider({ kind: 'shield', square }, 'rescue')
  }
  return plans.sort((a, b) => REASON_PRIORITY[a.reason] - REASON_PRIORITY[b.reason] || b.benefit - a.benefit)
}

/**
 * Non-capture advances into a square the opponent could win right away: only a
 * Shield makes them playable, so they are worth checking with a two-ply search.
 */
export function findShieldAdvancePlans(position: PoweredPosition, permittedMoves: Move[]): PowerPlan[] {
  const { game, powers } = position
  const plans: PowerPlan[] = []
  for (const move of permittedMoves) {
    if (move.captured || move.piece === 'k') continue
    if (!canApplyBotShieldOnSquare(game, powers, move.from)) continue
    if (!game.isAttacked(move.to, game.turn() === 'w' ? 'b' : 'w')) continue
    const uci = moveToUci(move)
    const exposed = (threatsAfterPlan(position, null, uci) ?? []).find(threat => threat.to === move.to)
    if (!exposed) continue
    // Worth a Shield only if the advanced piece then threatens to win material itself.
    if (!shieldedAdvanceThreatens(position, uci)) continue
    plans.push({ power: { kind: 'shield', square: move.from }, reason: 'advance', moveUci: uci, benefit: pieceValue(move.piece) })
  }
  return plans.sort((a, b) => b.benefit - a.benefit)
}

export function getBotConfigParams(profile: BotConfigParams): BotConfigParams {
  return {
    delaySeconds: profile.delaySeconds,
    powerUsePercent: profile.powerUsePercent,
    freezeMinThreatPawns: profile.freezeMinThreatPawns,
    freezeCooldownMoves: profile.freezeCooldownMoves,
    shieldMinPiecePawns: profile.shieldMinPiecePawns,
    shieldCooldownMoves: profile.shieldCooldownMoves,
    powerMinGainPawns: profile.powerMinGainPawns,
    powerReserveEggs: profile.powerReserveEggs,
    worstFloorPawns: profile.worstFloorPawns,
    worstMaxLossPawns: profile.worstMaxLossPawns,
    eggTarget: profile.eggTarget,
    worstCooldownMoves: profile.worstCooldownMoves,
  }
}

export class ChessBot implements BotConfigParams {
  readonly id: string
  readonly name: string
  readonly kind: BotKind
  readonly skill: number
  readonly alwaysBestMove: boolean
  delaySeconds: number
  powerUsePercent: number
  freezeMinThreatPawns: number
  freezeCooldownMoves: number
  shieldMinPiecePawns: number
  shieldCooldownMoves: number
  powerMinGainPawns: number
  powerReserveEggs: number
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
    const params = { ...getBotConfigParams(profile), ...overrides }
    this.delaySeconds = params.delaySeconds
    this.powerUsePercent = params.powerUsePercent
    this.freezeMinThreatPawns = params.freezeMinThreatPawns
    this.freezeCooldownMoves = params.freezeCooldownMoves
    this.shieldMinPiecePawns = params.shieldMinPiecePawns
    this.shieldCooldownMoves = params.shieldCooldownMoves
    this.powerMinGainPawns = params.powerMinGainPawns
    this.powerReserveEggs = params.powerReserveEggs
    this.worstFloorPawns = params.worstFloorPawns
    this.worstMaxLossPawns = params.worstMaxLossPawns
    this.eggTarget = params.eggTarget
    this.worstCooldownMoves = params.worstCooldownMoves
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
      ...getBotConfigParams(this),
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

  /** Whether a plan passes its own threshold and cooldown, before eggs and the two-ply check. */
  private planQualifies(plan: PowerPlan, turn: number, lastFreezeTurn: number | null, lastShieldTurn: number | null): boolean {
    if (plan.reason === 'mate') return true
    if (plan.power.kind === 'freeze') {
      return cooldownOver(lastFreezeTurn, turn, this.freezeCooldownMoves) && plan.benefit >= this.freezeMinThreatPawns * 100
    }
    if (!cooldownOver(lastShieldTurn, turn, this.shieldCooldownMoves)) return false
    if (plan.reason === 'advance') return this.powerMinGainPawns > 0
    return plan.benefit >= this.shieldMinPiecePawns * 100
  }

  private canAfford(plan: PowerPlan, eggs: number): boolean {
    const keep = plan.reason === 'mate' || plan.reason === 'rescue' ? 0 : this.powerReserveEggs
    return eggs - POWER_COST >= keep
  }

  /**
   * Pick at most one power for this turn, by priority: stop a mate, rescue a piece,
   * freeze the biggest threat, then a protected advance.
   */
  private choosePower(options: {
    game: Chess
    powers: MatchPower[]
    plannedMove: Move | undefined
    permittedMoves: Move[]
    botTurnNumber: number
    lastFreezeTurn: number | null
    lastShieldTurn: number | null
    botEggs: number
    random: () => number
  }): { plan: PowerPlan | null; insufficientEggs: boolean } {
    const { game, powers, plannedMove, botTurnNumber, lastFreezeTurn, lastShieldTurn, botEggs, random } = options
    if (!plannedMove || random() * 100 >= this.powerUsePercent) return { plan: null, insufficientEggs: false }
    const position: PoweredPosition = { game, powers }
    const turnColor = game.turn()
    const qualifies = (plan: PowerPlan) =>
      !hasUsedPowerThisTurn(powers, plan.power.kind, game, turnColor) &&
      this.planQualifies(plan, botTurnNumber, lastFreezeTurn, lastShieldTurn)

    let plans = findDefensivePowerPlans(position, plannedMove).filter(qualifies)
    const advanceAffordable = botEggs - POWER_COST >= this.powerReserveEggs
    if (!plans.length && advanceAffordable && this.powerMinGainPawns > 0 && cooldownOver(lastShieldTurn, botTurnNumber, this.shieldCooldownMoves)) {
      plans = findShieldAdvancePlans(position, options.permittedMoves).filter(qualifies)
    }
    if (!plans.length) return { plan: null, insufficientEggs: false }

    const affordable = plans.filter(plan => this.canAfford(plan, botEggs))
    // Only a real emergency the bot cannot pay for is worth showing to the player.
    const insufficientEggs = !affordable.length && plans.some(plan => plan.reason === 'mate' || plan.reason === 'rescue')
    if (!affordable.length) return { plan: null, insufficientEggs }

    const urgent = affordable.find(plan => plan.reason === 'mate')
    if (urgent || this.powerMinGainPawns <= 0) return { plan: urgent ?? affordable[0]!, insufficientEggs: false }

    const baseline = evaluateBotPlan(position, null, moveToUci(plannedMove))
    if (baseline === null) return { plan: null, insufficientEggs: false }
    for (const plan of affordable.slice(0, MAX_CHECKED_PLANS)) {
      const score = evaluateBotPlan(position, plan.power, plan.moveUci)
      if (score !== null && score - baseline >= this.powerMinGainPawns * 100) return { plan, insufficientEggs: false }
    }
    return { plan: null, insufficientEggs: false }
  }

  decideTurn(options: {
    game: Chess
    powers?: MatchPower[]
    matchPowers?: MatchPower[]
    botTurnNumber?: number
    botTurnCount?: number
    /** Bot turn numbers of the last Worst move, Freeze and Shield, if any. */
    lastWorstMoveTurn?: number | null
    lastFreezeTurn?: number | null
    lastShieldTurn?: number | null
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
      lastFreezeTurn = null,
      lastShieldTurn = null,
      botEggs,
      whiteScore = options.whiteEvalScore ?? null,
      whiteMate = null,
      blackAnalysis = options.analysis ?? null,
      stockfishSuggestedUci,
      bestAvailableUci,
      random = Math.random,
    } = options
    const verboseMoves = game.moves({ verbose: true })
    const permittedUcis = options.legalUciMoves ?? (options.permittedMoves ?? verboseMoves).map(moveToUci)
    const permittedMoves = verboseMoves.filter(move => permittedUcis.includes(moveToUci(move)))

    if (this.isPureChess) {
      return {
        powerAction: null,
        powerReason: null,
        insufficientEggs: false,
        moveUci: this.selectStandardMove(permittedUcis, blackAnalysis, stockfishSuggestedUci, bestAvailableUci),
        usedWorstMoveForEggs: false,
        usedShieldAdvance: false,
      }
    }

    const plannedUci = this.selectStandardMove(permittedUcis, blackAnalysis, stockfishSuggestedUci, bestAvailableUci)
    const plannedMove = plannedUci ? permittedMoves.find(move => moveToUci(move) === plannedUci) : undefined
    const { plan, insufficientEggs } = this.choosePower({
      game, powers, plannedMove, permittedMoves, botTurnNumber, lastFreezeTurn, lastShieldTurn, botEggs, random,
    })
    const powerAction = plan?.power ?? null

    // If a power will be applied first, make sure the chosen normal move remains legal with that power active.
    const effectivePowers = powerAction
      ? [...powers, createMatchPower(powerAction.kind, powerAction.square, game, -1)]
      : powers
    const effectivePermittedMoves = powerAction
      ? permittedPowerMoves(permittedMoves, effectivePowers, game.history().length + 1)
      : permittedMoves
    const effectivePermittedUcis = effectivePermittedMoves.map(moveToUci)

    if (plan && effectivePermittedUcis.includes(plan.moveUci)) {
      return {
        powerAction,
        powerReason: plan.reason,
        insufficientEggs: false,
        moveUci: plan.moveUci,
        usedWorstMoveForEggs: false,
        usedShieldAdvance: plan.reason === 'advance',
      }
    }

    // Worst move for 3 eggs: only on a turn without a power, while short of eggs, after the cooldown,
    // and only when the move gives up at most V pawns and keeps the bot at W pawns or better.
    const worstCooldownOver = cooldownOver(lastWorstMoveTurn, botTurnNumber, this.worstCooldownMoves)
    // Only the rewarded head of each list earns eggs (fewer when the position has few moves).
    const ranked = blackAnalysis ? limitRankedLists(blackAnalysis) : null
    const bestCandidate = blackAnalysis?.best.find(candidate => effectivePermittedUcis.includes(candidate.uci))
    const botScore = whiteScore === null ? null : -whiteScore
    if (
      !powerAction &&
      botEggs < this.eggTarget &&
      worstCooldownOver &&
      whiteMate === null &&
      blackAnalysis?.complete &&
      blackAnalysis.legalMoves > 1 &&
      ranked &&
      ranked.worst.length > 0 &&
      bestCandidate &&
      bestCandidate.mate === null &&
      (botScore === null || bestCandidate.score - botScore <= WORST_SKIP_BEST_GAIN_CP)
    ) {
      const floorCp = this.worstFloorPawns * 100
      const maxLossCp = this.worstMaxLossPawns * 100
      const eligibleWorst = ranked.worst
        .filter(
          candidate =>
            effectivePermittedUcis.includes(candidate.uci) &&
            !ranked.best.some(best => best.uci === candidate.uci) &&
            candidate.mate === null &&
            candidate.score >= floorCp &&
            bestCandidate.score - candidate.score <= maxLossCp,
        )
        .sort((a, b) => b.score - a.score)
      const chosenWorst = eligibleWorst[0]
      if (chosenWorst) {
        return {
          powerAction,
          powerReason: null,
          insufficientEggs,
          moveUci: chosenWorst.uci,
          usedWorstMoveForEggs: true,
          usedShieldAdvance: false,
        }
      }
    }

    return {
      powerAction,
      powerReason: plan?.reason ?? null,
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

/** Names of the bots (data/ui/bots.json), shown through t(). */
export const BOT_NAME_KEYS = [
  msg("Easy Pure Chess"),
  msg("Medium Pure Chess"),
  msg("Hard Pure Chess"),
  msg("Expert Pure Chess"),
  msg("Jedi Pure Chess"),
  msg("Easy ChickenBot"),
  msg("Expert ChickenBot"),
  msg("Jedi ChickenBot"),
] as const
