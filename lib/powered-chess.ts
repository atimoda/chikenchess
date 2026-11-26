import { Chess, type Move, type Square } from 'chess.js'
import { t } from './i18n'
import { permitsPowerMove, type MatchPower } from './chess-powers'

// chess.js 1.4 exposes these methods at runtime even though its declarations mark
// them private. Keep the variant adapter here so the rest of the game uses its
// ordinary public API. The pinned chess.js version is covered by powers tests.
interface InternalMove {
  from: number
  to: number
  color: 'w' | 'b'
  piece: string
  captured?: string
  promotion?: string
  flags: number
}
interface ChessInternals {
  _attacked(color: 'w' | 'b', square: number, verbose?: boolean): boolean | Square[]
  _moves(options?: { legal?: boolean; square?: Square; piece?: string }): InternalMove[]
  _makeMove(move: InternalMove): void
  _undoMove(): unknown
  _history: Array<{ move: InternalMove }>
  _board: unknown[]
  _turn: 'w' | 'b'
  _header: Record<string, string | null>
  _kings: Record<'w' | 'b', number>
  _epSquare: number
  _halfMoves: number
  _moveNumber: number
  _comments: Record<string, string>
  _castling: Record<'w' | 'b', number>
  _hash: bigint
  _positionCount: Map<bigint, number>
}
interface PoweredContext { powers: MatchPower[]; records: Move[] }
const contexts = new WeakMap<Chess, PoweredContext>()
const original = Chess.prototype as unknown as ChessInternals
const originalMove = Chess.prototype.move

function square(index: number): Square {
  return `${String.fromCharCode(97 + (index & 15))}${8 - Math.floor(index / 16)}` as Square
}

function activeSquare(game: Chess, power: MatchPower): Square {
  const color = power.kind === 'freeze' ? power.frozenColor : power.attachedColor
  if (color && game.get(power.square)?.color === color) return power.square
  const last = (game as unknown as ChessInternals)._history.at(-1)?.move
  return last && square(last.from) === power.square && last.color === color ? square(last.to) : power.square
}

function shieldedOwnKing(game: Chess, powers: MatchPower[], color: 'w' | 'b'): boolean {
  return powers.some(power => {
    if (power.kind !== 'shield' || power.attachedColor !== color || (power.appliedBy ?? 'w') !== color) return false
    if (game.get(power.square)?.type === 'k') return true
    const last = (game as unknown as ChessInternals)._history.at(-1)?.move
    return last?.color === color && last.piece === 'k' && square(last.from) === power.square
  })
}

/**
 * A frozen piece does not threaten squares, but it can thaw early: when no legal
 * reply remains, every power fades on the owner's turn. A king that stepped into
 * its reach (even next to a frozen king) would then be capturable. So a move may
 * not newly expose the mover's king to a frozen enemy piece. A king already in
 * the reach of a frozen checker keeps the existing freeze-the-checker play.
 */
function withoutNewFrozenThreats(game: Chess, powers: MatchPower[], moves: InternalMove[]): InternalMove[] {
  const variant = game as unknown as ChessInternals
  const us = variant._turn, them = us === 'w' ? 'b' : 'w'
  if (variant._kings[us] === -1) return moves
  const frozen = new Set<Square>()
  for (const power of powers) {
    if (power.kind !== 'freeze' || power.frozenColor !== them) continue
    const at = activeSquare(game, power)
    if (game.get(at)?.color === them) frozen.add(at)
  }
  if (!frozen.size) return moves
  const frozenAttackers = () => (original._attacked.call(game, them, variant._kings[us], true) as Square[]).filter(from => frozen.has(from))
  const before = new Set(frozenAttackers())
  return moves.filter(move => {
    variant._makeMove(move)
    const exposed = frozenAttackers().some(from => !before.has(from))
    variant._undoMove()
    return !exposed
  })
}

export function setPoweredChessPowers(game: Chess, powers: MatchPower[]): void {
  const context = contexts.get(game)
  if (context) context.powers = powers.map(power => ({ ...power }))
}

export function makePoweredChess(game: Chess = new Chess(), powers: MatchPower[] = [], records: Move[] = []): Chess {
  if (contexts.has(game)) { setPoweredChessPowers(game, powers); return game }
  const context: PoweredContext = { powers: powers.map(power => ({ ...power })), records: [...records] }
  contexts.set(game, context)
  const variant = game as unknown as ChessInternals
  variant._attacked = function (this: Chess, color: 'w' | 'b', target: number, verbose = false) {
    const attackers = original._attacked.call(this, color, target, true) as Square[]
    const effective = attackers.filter(from => !context.powers.some(power =>
      ((power.kind === 'freeze' && power.frozenColor === color) || power.kind === 'shield') && activeSquare(this, power) === from,
    ))
    // Only the applying player's own king gets the king-safety exception.
    // Shielding the opponent's king must not allow an unsafe move immediately
    // before that shield expires after the opponent's response.
    const protectedKing = shieldedOwnKing(this, context.powers, color === 'w' ? 'b' : 'w')
    return verbose ? (protectedKing ? [] : effective) : !protectedKing && effective.length > 0
  }
  variant._moves = function (this: Chess, options = {}) {
    const moves = original._moves.call(this, options).filter(move => {
      if (move.captured === 'k') return false
      const flags = `${move.flags & 8 ? 'e' : ''}${move.flags & 32 ? 'k' : ''}${move.flags & 64 ? 'q' : ''}`
      const to = square(move.to)
      return permitsPowerMove({ from: square(move.from), to, color: move.color, flags, captured: move.captured }, context.powers, (this as unknown as ChessInternals)._history.length + 1)
    })
    return options.legal === false ? moves : withoutNewFrozenThreats(this, context.powers, moves)
  }
  game.move = function (move, options) {
    const result = originalMove.call(this, move, options)
    context.records.push(result)
    return result
  }
  game.history = ((options?: { verbose?: boolean }) => options?.verbose ? [...context.records] : context.records.map(move => move.san)) as Chess['history']
  return game
}

/** Structured-cloneable position, including repetition and powered move history. */
export function poweredChessSnapshot(game: Chess) {
  const source = game as unknown as ChessInternals
  const fields = {
    _board: source._board, _turn: source._turn, _header: source._header, _kings: source._kings,
    _epSquare: source._epSquare, _halfMoves: source._halfMoves, _moveNumber: source._moveNumber,
    _history: source._history, _comments: source._comments, _castling: source._castling,
    _hash: source._hash, _positionCount: source._positionCount,
  }
  return { fields, records: contexts.get(game)?.records ?? game.history({ verbose: true }) }
}

export function restorePoweredChess(snapshot: ReturnType<typeof poweredChessSnapshot>, powers: MatchPower[]): Chess {
  const copy = new Chess()
  Object.assign(copy, globalThis.structuredClone(snapshot.fields))
  return makePoweredChess(copy, powers, snapshot.records)
}

export function clonePoweredChess(game: Chess, powers: MatchPower[]): Chess {
  return restorePoweredChess(poweredChessSnapshot(game), powers)
}

/**
 * True when from→to is a move the piece could make by its own movement (powers
 * included) but the rules reject because it would leave the mover's king under
 * attack, e.g. moving a pinned piece or stepping the king into check.
 */
export function moveExposesOwnKing(game: Chess, from: Square, to: Square): boolean {
  const piece = game.get(from)
  if (!piece || piece.color !== game.turn() || from === to) return false
  const variant = game as unknown as ChessInternals
  const reaches = (legal: boolean) => variant._moves({ legal, square: from }).some(move => square(move.to) === to)
  return reaches(false) && !reaches(true)
}

/** Validate a Freeze before charging, using the current board for both teams. */
export function freezeApplicationError(game: Chess, powers: MatchPower[], power: MatchPower): string | null {
  if (power.kind !== 'freeze') return null
  const nextPowers = [...powers, power]
  if (!clonePoweredChess(game, nextPowers).moves().length) return t('Freeze would leave no legal move')

  // Probe the opponent's upcoming turn without moving any piece. A fresh game
  // needs relative power deadlines; effects expiring on our move are excluded.
  // En passant belongs to the current turn and cannot carry over to this probe.
  const ownPly = game.history().length + 1
  const fen = game.fen().split(' ')
  fen[1] = game.turn() === 'w' ? 'b' : 'w'
  fen[3] = '-'
  const opponentPowers = nextPowers
    .filter(item => (item.trapUntilPly ?? item.blocksOnPly) > ownPly)
    .map(item => ({
      ...item,
      blocksOnPly: item.blocksOnPly - ownPly,
      trapUntilPly: item.trapUntilPly === undefined ? undefined : item.trapUntilPly - ownPly,
    }))
  const opponent = makePoweredChess(new Chess(fen.join(' ')), opponentPowers)
  return opponent.moves().length ? null : t('Você não pode deixar seu oponente sem jogadas.')
}

/** Powers can leave the side that just moved in check once they expire. Stockfish
 * refuses such a position ("King can be captured"), so it goes to the powered analysis. */
export function stockfishSupportsPosition(game: Chess): boolean {
  const fen = game.fen().split(' ')
  fen[1] = fen[1] === 'w' ? 'b' : 'w'
  fen[3] = '-'
  try { return !new Chess(fen.join(' ')).isCheck() } catch { return false }
}

export function syncPoweredMoveSan(game: Chess, move: Move): void {
  const base = move.san.replace(/[+#]$/, '')
  move.san = `${base}${game.isCheckmate() ? '#' : game.isCheck() ? '+' : ''}`
}
