import type { Square } from "chess.js";
import type { PlayerProfile } from "../game-progression";
import type { MatchPowerKind } from "../chess-powers";
import type { CreativeSession } from "../music/creative";
import type { HarmonyPlanId } from "../music/harmony";

export type OnlineColor = "w" | "b";
export interface OnlineProfile {
  id: string;
  code: string;
  display_name: string;
  baptismal_name: string;
  profile: PlayerProfile;
}
export interface RoomMember {
  user_id: string;
  color: OnlineColor;
  city_id: string;
  ready: boolean;
  profile: OnlineProfile;
}
export interface OnlineRoom {
  id: string;
  code: string;
  is_public: boolean;
  status: "open" | "playing" | "closed";
  host_id: string;
  match_id: string | null;
  members: RoomMember[];
}
export interface PublicRoom {
  code: string;
  creator_name: string;
  players: number;
}
export interface RunningGame {
  id: string;
  context_city_id: string;
  updated_at: string;
  color: OnlineColor;
  turn: OnlineColor;
  opponent: { id: string; display_name: string };
}
export interface OnlineFriend {
  id: string;
  sender_id: string;
  status: "pending" | "accepted";
  profile: OnlineProfile;
}
export interface SharedSuggestion {
  uci: string;
  score: number;
  mate?: number | null;
}
export type BoardMusicSettings = Pick<CreativeSession, "root" | "scale"> & {
  harmony: HarmonyPlanId;
};
export type GameAction =
  | {
      kind: "move";
      from: Square;
      to: Square;
      promotion?: string;
      color: OnlineColor;
      reward: "best" | "worst" | null;
    }
  | {
      kind: "power";
      power: MatchPowerKind;
      square: Square;
      color: OnlineColor;
      id: number;
    };
export interface MatchState {
  schema: 1;
  /** Missing settings inherit the host kit's shared musical context. */
  boardMusic?: Partial<BoardMusicSettings>;
  actions: GameAction[];
  redo: { actor: OnlineColor; actions: GameAction[] } | null;
  eggs: Record<OnlineColor, number>;
  collected: Record<OnlineColor, number>;
  rewarded: string[];
  suggestions: {
    kind: "best" | "worst";
    moves: SharedSuggestion[];
    position: string;
    expiresAt: number;
    actor: OnlineColor;
  } | null;
  seen: Array<{
    kind: "best" | "worst";
    moves: SharedSuggestion[];
    position: string;
  }>;
  result: {
    winner: OnlineColor | null;
    reason: "checkmate" | "draw" | "resign";
  } | null;
  drawOffer: OnlineColor | null;
  rematchOffer: OnlineColor | null;
}
export interface OnlineMatch {
  id: string;
  room_id: string;
  version: number;
  state: MatchState;
  members: RoomMember[];
  rematch_id: string | null;
  context_city_id?: string;
}
export type MatchCommand =
  | { kind: "board-music"; patch: Partial<BoardMusicSettings> }
  | {
      kind: "move";
      from: Square;
      to: Square;
      promotion?: string;
      analysis?: {
        position: string;
        best: SharedSuggestion[];
        worst: SharedSuggestion[];
      };
    }
  | { kind: "power"; power: MatchPowerKind; square: Square }
  | {
      kind: "suggest";
      group: "best" | "worst";
      moves: SharedSuggestion[];
      position: string;
    }
  | {
      kind:
        | "undo"
        | "redo"
        | "resign"
        | "offer-draw"
        | "accept-draw"
        | "decline-draw"
        | "offer-rematch"
        | "accept-rematch";
    };
