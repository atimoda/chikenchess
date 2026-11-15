import type { MatchLogEvent } from "../match-log";
import { rankedMoveStreakKind, rankedStreakDoubles } from "../egg-rewards";
import { rankedRewardTotal, rankedStreakCount, replayMatch } from "./domain";
import type { MatchState, SharedSuggestion } from "./types";

// Online side of the copy-paste match log. The durable action list is replayed for the
// position of every action; what the server paid comes from comparing confirmed states.

const balances = (state: Pick<MatchState, "eggs" | "collected">) => ({
  eggsAfter: { ...state.eggs },
  historicAfter: { ...state.collected },
});

const suggestionList = (moves: readonly SharedSuggestion[]) =>
  moves
    .map((move) =>
      `${move.uci} ${move.mate != null ? `${move.mate < 0 ? "-" : "+"}M${Math.abs(move.mate)}` : `${move.score >= 0 ? "+" : "-"}${(Math.abs(move.score) / 100).toFixed(2)}`}`,
    )
    .join(", ");

/** One event per durable action, with the position and the reward state the server rules read. */
export function onlineActionLog(state: Pick<MatchState, "actions">): MatchLogEvent[] {
  const { game, positions } = replayMatch(state);
  const history = game.history({ verbose: true });
  let ply = 0;
  return state.actions.map((action, index): MatchLogEvent => {
    if (action.kind === "power")
      return { t: "power", action: index + 1, ply, by: action.color, kind: action.power, square: action.square, cost: 3 };
    const move = history[ply];
    const legal = positions[ply]?.moves().length ?? 0;
    ply++;
    const event: MatchLogEvent = {
      t: "move",
      action: index + 1,
      ply,
      by: action.color,
      san: move?.san,
      uci: `${action.from}${action.to}${action.promotion ?? ""}`,
      fen: move?.before,
      legal,
      reward: action.reward,
    };
    if (!action.reward) return event;
    const comeback = action.comeback === true;
    const before = { actions: state.actions.slice(0, index) };
    const streak = rankedStreakCount(before, action.color, action.reward, comeback);
    return {
      ...event,
      comeback,
      streak: `${rankedMoveStreakKind(action.reward, comeback)}x${streak}`,
      x2: rankedStreakDoubles(streak, comeback),
      // What the rules pay before the match cap; a repeated position and move pays nothing.
      eggs: rankedRewardTotal(before, action.color, action.reward, legal, comeback),
    };
  });
}

/** What changed between two confirmed states: new actions with what they paid, Undo, views and the result. */
export function onlineStateLog(previous: MatchState | null, next: MatchState): MatchLogEvent[] {
  const actions = onlineActionLog(next);
  // Joining or reloading mid-match: earlier actions are rebuilt without what each one paid.
  if (!previous) return [...actions.map((event) => ({ ...event, replayed: true })), { t: "joined", actions: next.actions.length, ...balances(next) }];
  const events: MatchLogEvent[] = [];
  const usage = (state: MatchState, key: "undo" | "redo") => state.usage?.[key] ?? 0;
  const added = next.actions.length - previous.actions.length;
  if (added < 0 || usage(next, "undo") > usage(previous, "undo"))
    events.push({ t: "undo", fromAction: previous.actions.length, toAction: next.actions.length, ...balances(next) });
  if (added > 0) {
    const redo = usage(next, "redo") > usage(previous, "redo");
    for (const event of actions.slice(previous.actions.length)) {
      const by = event.by as "w" | "b";
      events.push({
        ...event,
        ...(redo ? { redo: true } : {}),
        // With several actions at once (Redo) the payment cannot be split per action.
        ...(added === 1
          ? {
              paid: next.eggs[by] - previous.eggs[by],
              historic: next.collected[by] - previous.collected[by],
            }
          : {}),
        ...balances(next),
      });
    }
  }
  const shown = next.suggestions;
  if (shown && (shown.expiresAt !== previous.suggestions?.expiresAt || shown.kind !== previous.suggestions?.kind))
    events.push({ t: "view", by: shown.actor, kind: shown.kind, cost: 1, moves: suggestionList(shown.moves), ...balances(next) });
  if (next.result && !previous.result)
    events.push({ t: "end", winner: next.result.winner, reason: next.result.reason, ...balances(next) });
  return events;
}
