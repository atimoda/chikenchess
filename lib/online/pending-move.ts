import type { Chess, Square } from "chess.js";
import { advanceMatchPowers, type MatchPower } from "../chess-powers";
import {
  clonePoweredChess,
  setPoweredChessPowers,
  syncPoweredMoveSan,
} from "../powered-chess";
import { parseMatchCommand, replayMatch } from "./domain";
import type { MatchCommand, OnlineMatch } from "./types";

export interface PendingMatchCommand {
  matchId: string;
  commandId: string;
  expectedVersion: number;
  command: MatchCommand;
}

/** A visual move preview only; confirmed actions, rewards and music stay intact. */
export function pendingMovePreview(
  match: OnlineMatch,
  pending: PendingMatchCommand | null,
  viewerId: string,
): { game: Chess; squares: Square[]; powers: MatchPower[] } | null {
  try {
    if (
      !pending ||
      pending.matchId !== match.id ||
      typeof pending.commandId !== "string" ||
      !pending.commandId ||
      !Number.isInteger(pending.expectedVersion) ||
      pending.expectedVersion !== match.version ||
      match.state.result ||
      match.state.actions.length >= 768
    )
      return null;

    const command = parseMatchCommand(pending.command);
    if (command.kind !== "move") return null;
    const actor = match.members.find((member) => member.user_id === viewerId);
    if (!actor) return null;
    const confirmed = replayMatch(match.state);
    if (confirmed.game.turn() !== actor.color) return null;

    const game = clonePoweredChess(confirmed.game, confirmed.powers);
    const move = game.move({
      from: command.from,
      to: command.to,
      promotion: command.promotion,
    });
    let powers = advanceMatchPowers(
      confirmed.powers,
      move,
      game,
      game.history().length,
    );
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

    const squares: Square[] = [move.to];
    const rank = move.color === "w" ? "1" : "8";
    if (move.flags.includes("k")) squares.push(`f${rank}` as Square);
    if (move.flags.includes("q")) squares.push(`d${rank}` as Square);
    return { game, squares, powers };
  } catch {
    // Pending requests may come from old or damaged browser storage.
    return null;
  }
}
