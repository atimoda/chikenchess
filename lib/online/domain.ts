import { Chess, type Square } from "chess.js";
import { z } from "zod";
import { HARMONY_PLAN_IDS } from "../music/harmony";
import { EGG_REWARDS, cappedMatchEggs, rankedMovesPerList } from "../egg-rewards";
import { ROOTS, SCALE_NAMES } from "../music/scales";
import {
  advanceMatchPowers,
  createMatchPower,
  type MatchPower,
  type MatchPowerKind,
} from "../chess-powers";
import {
  makePoweredChess,
  setPoweredChessPowers,
  syncPoweredMoveSan,
  clonePoweredChess,
  freezeApplicationError,
} from "../powered-chess";
import type {
  MatchState,
  MatchCommand,
  OnlineColor,
  SharedSuggestion,
} from "./types";

const square = z.string().regex(/^[a-h][1-8]$/);
const suggestion = z
  .object({
    uci: z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/),
    score: z.number().int().min(-1000000).max(1000000),
    mate: z.number().int().min(-1000).max(1000).nullable().optional(),
  })
  .strict();
const suggestions = z.array(suggestion).min(1).max(3);
const position = z.string().max(8000);
const simpleCommands = [
  "undo",
  "redo",
  "resign",
  "offer-draw",
  "accept-draw",
  "decline-draw",
  "offer-rematch",
  "accept-rematch",
] as const;
const commandSchema = z.union([
  z
    .object({
      kind: z.literal("board-music"),
      patch: z
        .object({
          root: z.enum(ROOTS).optional(),
          scale: z.enum(SCALE_NAMES).optional(),
          harmony: z.enum(HARMONY_PLAN_IDS).optional(),
        })
        .strict()
        .refine(
          (patch) => Object.keys(patch).length > 0 && Object.values(patch).every(value => value !== undefined),
          "Provide at least one musical setting",
        ),
    })
    .strict(),
  z
    .object({
      kind: z.literal("move"),
      from: square,
      to: square,
      promotion: z.enum(["q", "r", "b", "n"]).optional(),
      analysis: z
        .object({ position, best: suggestions, worst: suggestions })
        .strict()
        .optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("power"),
      power: z.enum(["freeze", "shield"]),
      square,
    })
    .strict(),
  z
    .object({
      kind: z.literal("suggest"),
      group: z.enum(["best", "worst"]),
      moves: suggestions,
      position,
    })
    .strict(),
  ...simpleCommands.map((kind) => z.object({ kind: z.literal(kind) }).strict()),
]);

export function parseMatchCommand(value: unknown): MatchCommand {
  return commandSchema.parse(value) as MatchCommand;
}

export function createMatchState(): MatchState {
  return {
    schema: 1,
    actions: [],
    usage: { freeze: 0, shield: 0, undo: 0, redo: 0, best: 0, worst: 0 },
    redo: null,
    eggs: { w: 1, b: 1 },
    collected: { w: 0, b: 0 },
    rewarded: [],
    suggestions: null,
    seen: [],
    result: null,
    drawOffer: null,
    rematchOffer: null,
  };
}

/** Eggs a ranked move of `actor` earns now: x2 from the third in a row, never past the match cap. */
export function rankedRewardEggs(
  state: Pick<MatchState, "actions" | "eggs">,
  actor: OnlineColor,
  reward: "best" | "worst",
): number {
  let streak = 1;
  for (const action of [...state.actions].reverse()) {
    if (action.kind !== "move" || action.color !== actor) continue;
    if (action.reward !== reward) break;
    streak++;
  }
  return cappedMatchEggs(state.eggs[actor], (reward === "best" ? 1 : 3) * (streak >= 3 ? 2 : 1));
}

/** Destination squares of the actor's shared suggestions keep their eggs until this time. */
export function squareEggsUntil(suggestions: NonNullable<MatchState["suggestions"]>): number {
  return suggestions.expiresAt + EGG_REWARDS.squareEggsExtraSeconds * 1000;
}

/** The reward any piece earns by landing on a destination square of the visible suggestions. */
export function squareReward(
  state: Pick<MatchState, "suggestions">,
  actor: OnlineColor,
  key: string,
  uci: string,
  now: number,
): "best" | "worst" | null {
  const shared = state.suggestions;
  if (!shared || shared.actor !== actor || shared.position !== key || now > squareEggsUntil(shared)) return null;
  const move = shared.moves.find((m) => m.uci.slice(2, 4) === uci.slice(2, 4));
  if (!move) return null;
  return shared.kind === "best" && move.score >= -100 && !(move.mate != null && move.mate < 0) ? "best" : "worst";
}

/** Each team may apply each power at most once per turn: since the last move. */
export function powerUsedThisTurn(
  state: Pick<MatchState, "actions">,
  power: MatchPowerKind,
  color: OnlineColor,
): boolean {
  const lastMove = state.actions.findLastIndex((action) => action.kind === "move");
  return state.actions
    .slice(lastMove + 1)
    .some((action) => action.kind === "power" && action.power === power && action.color === color);
}

/** JSON actions are the durable format; chess.js's private snapshot is never sent. */
export function replayMatch(state: Pick<MatchState, "actions">) {
  const game = makePoweredChess(new Chess(), []);
  let powers: MatchPower[] = [];
  const positions: Chess[] = [clonePoweredChess(game, powers)];
  for (const action of state.actions) {
    if (action.kind === "power") {
      powers = [
        ...powers.filter(
          (p) => !(p.kind === action.power && p.square === action.square),
        ),
        createMatchPower(action.power, action.square, game, action.id),
      ];
      setPoweredChessPowers(game, powers);
      if (!game.moves().length && clonePoweredChess(game, []).moves().length) {
        powers = [];
        setPoweredChessPowers(game, powers);
      }
      positions[positions.length - 1] = clonePoweredChess(game, powers);
    } else {
      const move = game.move({
        from: action.from,
        to: action.to,
        promotion: action.promotion,
      });
      powers = advanceMatchPowers(powers, move, game, game.history().length);
      setPoweredChessPowers(game, powers);
      syncPoweredMoveSan(game, move);
      if (
        powers.length &&
        !game.moves().length &&
        clonePoweredChess(game, []).moves().length
      ) {
        powers = [];
        setPoweredChessPowers(game, powers);
      }
      positions.push(clonePoweredChess(game, powers));
    }
  }
  return { game, powers, positions };
}

export function matchPosition(state: Pick<MatchState, "actions">): string {
  const { game, powers } = replayMatch(state);
  return positionFor(game, powers);
}

function positionFor(game: Chess, powers: MatchPower[]) {
  const ply = game.history().length;
  // Exclude command IDs and FEN clocks, so Undo or a repeated position cannot farm a reward.
  const identity = powers.map(
    ({ id: _id, blocksOnPly, trapUntilPly, ...power }) => ({
      ...power,
      blocksOnPly: blocksOnPly - ply,
      ...(trapUntilPly === undefined
        ? {}
        : { trapUntilPly: trapUntilPly - ply }),
    }),
  );
  return JSON.stringify([
    game.fen().split(" ").slice(0, 4).join(" "),
    identity,
  ]);
}

function reject(message: string): never {
  throw new Error(message);
}
function spend(state: MatchState, actor: OnlineColor, amount: number) {
  if (state.eggs[actor] < amount)
    reject(
      `You need ${amount - state.eggs[actor]} more golden egg(s) to use this`,
    );
  state.eggs[actor] -= amount;
}
function validateSuggestions(game: Chess, moves: SharedSuggestion[]) {
  const legal = new Set(
    game
      .moves({ verbose: true })
      .map((m) => `${m.from}${m.to}${m.promotion ?? ""}`),
  );
  if (
    new Set(moves.map((m) => m.uci)).size !== moves.length ||
    moves.some((m) => !legal.has(m.uci))
  )
    reject("Invalid move suggestions");
}
function clearSuggestions(state: MatchState) {
  state.suggestions = null;
  state.seen = [];
}
function rewardFor(
  state: MatchState,
  game: Chess,
  key: string,
  uci: string,
  analysis?: Extract<MatchCommand, { kind: "move" }>["analysis"],
): "best" | "worst" | null {
  const legalMoves = game.moves().length;
  if (legalMoves < 2) return null;
  // Only the head of each list earns eggs; positions with few moves reward fewer.
  const count = rankedMovesPerList(legalMoves);
  for (const seen of state.seen) {
    if (seen.position !== key) continue;
    const move = seen.moves.slice(0, count).find((m) => m.uci === uci);
    if (move)
      return seen.kind === "best" &&
        move.score >= -100 &&
        !(move.mate != null && move.mate < 0)
        ? "best"
        : "worst";
  }
  if (analysis?.position !== key) return null;
  validateSuggestions(game, analysis.best);
  validateSuggestions(game, analysis.worst);
  const best = analysis.best.slice(0, count).find((m) => m.uci === uci);
  if (best)
    return best.score < -100 || (best.mate != null && best.mate < 0)
      ? "worst"
      : "best";
  return analysis.worst.slice(0, count).some((m) => m.uci === uci) ? "worst" : null;
}

/** Serial command evaluation; Postgres rechecks identity/version and commits atomically. */
export function applyMatchCommand(
  original: MatchState,
  actor: OnlineColor,
  input: unknown,
  now = Date.now(),
): MatchState {
  const command = parseMatchCommand(input);
  const state: MatchState = globalThis.structuredClone(original);
  state.usage = {
    freeze: Math.max(0, state.usage?.freeze ?? 0),
    shield: Math.max(0, state.usage?.shield ?? 0),
    undo: Math.max(0, state.usage?.undo ?? 0),
    redo: Math.max(0, state.usage?.redo ?? 0),
    best: Math.max(0, state.usage?.best ?? 0),
    worst: Math.max(0, state.usage?.worst ?? 0),
  };
  const { game, powers } = replayMatch(state);
  if (command.kind === "offer-rematch" || command.kind === "accept-rematch") {
    if (!state.result) reject("The match has not ended");
    if (command.kind === "accept-rematch") {
      if (!state.rematchOffer || state.rematchOffer === actor)
        reject("No rematch invitation to accept");
      state.rematchOffer = null;
    } else state.rematchOffer = actor;
    return state;
  }
  if (state.result) reject("This match has ended");
  if (command.kind === "board-music") {
    state.boardMusic = { ...state.boardMusic, ...command.patch };
    return state;
  }
  if (command.kind === "resign") {
    state.result = { winner: actor === "w" ? "b" : "w", reason: "resign" };
    clearSuggestions(state);
    return state;
  }
  if (command.kind === "offer-draw") {
    state.drawOffer = actor;
    return state;
  }
  if (command.kind === "accept-draw" || command.kind === "decline-draw") {
    if (!state.drawOffer || state.drawOffer === actor)
      reject("No draw offer to answer");
    state.drawOffer = null;
    if (command.kind === "accept-draw") {
      state.result = { winner: null, reason: "draw" };
      clearSuggestions(state);
    }
    return state;
  }
  const key = positionFor(game, powers);
  if (command.kind === "suggest") {
    if (powers.some(p => (p.appliedBy ?? "w") === actor))
      reject("Best/Worst are unavailable while powers are active");
    if (command.position !== key) reject("The board changed; try again");
    if (state.suggestions?.position === key && state.suggestions.kind === command.group && state.suggestions.expiresAt > now)
      reject("Wait for the visible suggestions to expire");
    validateSuggestions(game, command.moves);
    spend(state, actor, 1);
    state.usage[command.group]++;
    const moves = command.moves.slice(0, rankedMovesPerList(game.moves().length));
    state.suggestions = {
      kind: command.group,
      moves,
      position: key,
      expiresAt: now + 3000,
      actor,
    };
    state.seen = [
      { kind: command.group, moves, position: key },
      ...state.seen.filter(
        (s) => s.kind !== command.group && s.position === key,
      ),
    ];
    return state;
  }
  if (command.kind === "undo") {
    const index = state.actions.findLastIndex(
      (a) => a.kind === "move" && a.color === actor,
    );
    if (index < 0) reject("No move of yours to undo");
    spend(state, actor, 2);
    state.usage.undo++;
    state.redo = { actor, actions: state.actions.slice(index) };
    state.actions = state.actions.slice(0, index);
    clearSuggestions(state);
    state.drawOffer = null;
    return state;
  }
  if (game.turn() !== actor) reject("Wait for your turn");
  if (command.kind === "redo") {
    if (!state.redo || state.redo.actor !== actor)
      reject("No continuation of yours to redo");
    state.actions.push(...state.redo.actions);
    state.redo = null;
    state.usage.redo++;
    clearSuggestions(state);
    state.drawOffer = null;
  } else if (command.kind === "power") {
    if (state.actions.length >= 768) reject("Match action limit reached");
    if (powerUsedThisTurn(state, command.power, actor))
      reject(`${command.power === "freeze" ? "Freeze" : "Shield"} can be used once per turn`);
    const power = createMatchPower(command.power, command.square as Square, game, state.actions.length + 1);
    const freezeError = freezeApplicationError(game, powers, power);
    if (freezeError) reject(freezeError);
    spend(state, actor, 3);
    state.usage[command.power]++;
    state.actions.push({
      kind: "power",
      power: command.power,
      square: command.square as Square,
      color: actor,
      id: state.actions.length + 1,
    });
    state.redo = null;
    clearSuggestions(state);
  } else if (command.kind === "move") {
    if (state.actions.length >= 768) reject("Match action limit reached");
    const uci = `${command.from}${command.to}${command.promotion ?? ""}`;
    const reward =
      (game.moves().length > 1 ? squareReward(state, actor, key, uci, now) : null) ??
      rewardFor(state, game, key, uci, command.analysis);
    // Powered adapter validates castling, en passant, frozen movement and protected captures.
    game.move({
      from: command.from,
      to: command.to,
      promotion: command.promotion,
    });
    state.actions.push({
      kind: "move",
      from: command.from,
      to: command.to,
      promotion: command.promotion,
      color: actor,
      reward,
    });
    const rewardKey = `${actor}|${key}|${uci}`;
    if (reward && !state.rewarded.includes(rewardKey)) {
      // The move was already pushed: count the streak before it.
      const earned = rankedRewardEggs({ ...state, actions: state.actions.slice(0, -1) }, actor, reward);
      state.eggs[actor] += earned;
      state.collected[actor] += earned;
      state.rewarded.push(rewardKey);
    }
    state.redo = null;
    state.drawOffer = null;
    clearSuggestions(state);
  }
  const next = replayMatch(state).game;
  if (next.isCheckmate())
    state.result = {
      winner: next.turn() === "w" ? "b" : "w",
      reason: "checkmate",
    };
  else if (next.isDraw()) state.result = { winner: null, reason: "draw" };
  if (state.result) clearSuggestions(state);
  return state;
}
