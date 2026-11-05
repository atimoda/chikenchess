"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Move, Square } from "chess.js";
import {
  Eye,
  Shield,
  Snowflake,
  Undo2,
  Redo2,
  Music2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { matchEggPayout, matchEggSources } from "@/lib/match-eggs";
import { trackMatchCompleted, trackMatchStarted } from "@/lib/game-analytics";
import { EggBasketTransfer } from "../victory-basket";
import { getCityById, cities } from "@/lib/cities-data";
import { replayMatch, matchPosition, onlineActionEvents, powerUsedThisTurn, rankedRewardTotal, squareEggsUntil } from "@/lib/online/domain";
import { launchEggFlight } from "@/lib/egg-flight";
import { EGG_REWARDS, limitRankedLists } from "@/lib/egg-rewards";
import type { Occurrence } from "@/lib/music/reactions";
import { pendingMovePreview } from "@/lib/online/pending-move";
import type { OnlineMatch, MatchCommand, RoomMember } from "@/lib/online/types";
import { getOnlineClient } from "@/lib/online/client";
import { defaultCityKit } from "@/lib/music/city-kits";
import { combineOnlineKits } from "@/lib/music/online-kit";
import type { Instrument } from "@/lib/music/model";
import {
  DEFAULT_EFFECTS,
  DEFAULT_GLOBAL_EFFECTS,
  type GlobalEffects,
  type SquareEffects,
} from "@/lib/types";
import { getSfxEngine } from "@/lib/sfx-engine";
import { useMusic } from "@/hooks/use-music";
import { useOnlineMatch } from "@/hooks/use-online-match";
import { useGameWidgetLayout } from "@/hooks/use-game-widget-layout";
import { BOARD_CARDS_RESIZE_RATIO, powerCardsResizeLimits, useBoardResize } from "@/hooks/use-board-resize";
import { useBoardPan } from "@/hooks/use-board-pan";
import { BoardResizeHandles } from "@/components/board-resize-handles";
import { useOnlineAnalysis } from "@/hooks/use-online-analysis";
import { usePowerTargetingGesture } from "@/hooks/use-power-targeting-gesture";
import { createMatchPower, shieldCaptureBlockMessage, type MatchPowerKind } from "@/lib/chess-powers";
import { freezeApplicationError } from "@/lib/powered-chess";
import { formatEvaluation, rankedMoveLabelTone } from "@/lib/chess-evaluation";
import {
  ChessgroundBoard,
  PiecesSVG,
  type AnalysisArrow,
} from "../chessground-board";
import { GamePreferences } from "../game-preferences";
import { PowerCardHand } from "../power-card-hand";
import { animateInsufficientEggs, getOnlineMulliganPreviewMoves } from "@/lib/power-presentation";
import { usePowerDisplay } from "@/hooks/use-power-display";
import { useChancePosition } from "@/hooks/use-chance-position";
import { useSpectrogramMode } from "@/hooks/use-spectrogram-mode";
import { useCrossfaderSync } from "@/hooks/use-crossfader-sync";
import { useAwardAnimations } from "@/hooks/use-award-animations";
import { useCapturedPiecesScale, useMatchViewport } from "@/hooks/use-match-layout";
import { CapturedPieces } from "../match/captured-pieces";
import { EggCounter, MatchStatus } from "../match/egg-counter";
import { GameplayTipDialog, useGameplayTip } from "../match/gameplay-tip";
import { MATCH_HEADER_BUTTON_CLASS, MatchViewControls } from "../match/match-view-controls";
import { MixerWidget } from "../mixer-widget";
import { MusicSongPanel, MusicSongSections, type SongPanelHover } from "../music-song-panel";
import { SynthControlPanel } from "../synth-control-panel";
import { MusicVoiceReadout, MusicTransportReadout } from "../music-playback";
import {
  GameActionCostHint,
  GameActionRow,
  GameBoardChanceBar,
  GameCityBackground,
  GameCityTitleIntro,
  GameFooter,
  GameWidgetEntranceStyles,
  GameWidgetConnections,
  GlobeGridIcon,
} from "../game-presentation";
import {
  BoardMusicSelectors,
  type BoardDropdownId,
} from "../board-music-selectors";
import { SpectrogramWidget } from "../spectrogram-widget";
import { LiveCodeWidget } from "../live-code-widget";
import { PieceDebugWidget } from "../piece-debug-widget";
import { WidgetToggleLayer } from "../widget-toggle-layer";
import { VersionChangelog } from "../version-changelog";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { useOnline } from "./online-provider";
import { AddFriendButton } from "./online-hub";
import { duckSourceOptions } from "@/lib/music/sound-design"

export function OnlineGame({
  matchId,
  onBack,
  onMatch,
}: {
  matchId: string;
  onBack: () => void;
  onMatch: (id: string) => void;
}) {
  const online = useOnlineMatch(matchId);
  const { user } = useOnline();
  useEffect(() => {
    if (online.match?.rematch_id) onMatch(online.match.rematch_id);
  }, [online.match?.rematch_id, onMatch]);
  if (
    !online.match ||
    !user ||
    !online.match.members.some((m) => m.user_id === user.id)
  )
    return (
      <main className="grid min-h-dvh place-items-center bg-black text-white">
        <div className="space-y-4 text-center">
          <p>{online.error ?? "Loading online match…"}</p>
          <Button onClick={() => void online.refresh()}>Retry</Button>
          <Button variant="ghost" onClick={onBack}>
            Return to globe
          </Button>
        </div>
      </main>
    );
  return (
    <OnlineMatchBoard
      key={matchId}
      match={online.match}
      online={online}
      viewerId={user.id}
      onBack={onBack}
    />
  );
}

const SEEN_INTRO_KEY = "chickenchess:online:seen-intro";

/** A match already shown once, or already under way, resumes from the board entrance. */
function hasSeenMatchIntro(matchId: string) {
  try {
    return (JSON.parse(localStorage.getItem(SEEN_INTRO_KEY) ?? "[]") as string[]).includes(matchId);
  } catch {
    return false;
  }
}

function rememberMatchIntro(matchId: string) {
  try {
    const seen = (JSON.parse(localStorage.getItem(SEEN_INTRO_KEY) ?? "[]") as string[]).filter((id) => id !== matchId);
    localStorage.setItem(SEEN_INTRO_KEY, JSON.stringify([...seen, matchId].slice(-50)));
  } catch {
    // Storage is optional; the intro simply plays again.
  }
}

function getBotDifficultyLabel(depth?: number): string {
  if (depth === 10) return "Medium";
  if (depth === 15) return "Hard";
  if (depth && depth >= 20) return "Expert";
  return "Easy";
}

function getOnlineMemberDisplayName(
  member: RoomMember,
  fallback: string,
  depth?: number,
): string {
  const name = member.profile?.display_name?.trim() || "";
  const isBot =
    member.user_id.toLowerCase().includes("bot") ||
    name.toLowerCase().includes("bot") ||
    member.profile?.code === "BOT";
  if (isBot) {
    const diff = getBotDifficultyLabel(depth);
    return `${diff} Bot`;
  }
  return name || fallback;
}

export function OnlineMatchBoard({
  match,
  online,
  onBack,
  viewerId,
}: {
  match: OnlineMatch;
  online: ReturnType<typeof useOnlineMatch>;
  onBack: () => void;
  viewerId: string;
}) {
  const me = match.members.find((m) => m.user_id === viewerId)!;
  const opponent = match.members.find((m) => m.user_id !== viewerId)!;
  const color = me.color;
  const ownEggCounterRef = useRef<HTMLDivElement | null>(null);
  const opponentEggCounterRef = useRef<HTMLDivElement | null>(null);
  const reportedMatchResultRef = useRef(false);
  const reportedMatchStartRef = useRef(false);
  const matchStartedAtRef = useRef<number | null>(null);
  const [depositedEggs, setDepositedEggs] = useState({ w: 0, b: 0 });
  const city =
    getCityById(match.context_city_id ?? match.members[0].city_id) ?? cities[0];
  const enemyCity = getCityById(opponent.city_id) ?? cities[0];
  const whiteMember =
    match.members.find((m) => m.color === "w") ?? match.members[0];
  const blackMember =
    match.members.find((m) => m.color === "b") ??
    match.members[1] ??
    match.members[0];
  const whiteCity = getCityById(whiteMember.city_id);
  const blackCity = getCityById(blackMember.city_id);
  const whiteStyle = whiteCity?.genre ?? city.genre;
  const blackStyle = blackCity?.genre ?? city.genre;
  const player1Name = getOnlineMemberDisplayName(
    whiteMember,
    "Player 1",
    city.aiDepth,
  );
  const player2Name = getOnlineMemberDisplayName(
    blackMember,
    "Player 2",
    city.aiDepth,
  );
  const introMatchInfo = useMemo(
    () => ({
      player1Name,
      player2Name,
      player1Style: whiteStyle,
      player2Style: blackStyle,
    }),
    [player1Name, player2Name, whiteStyle, blackStyle],
  );
  const actionsKey = JSON.stringify(match.state.actions);
  const replay = useMemo(() => replayMatch(match.state), [actionsKey]); // Match versions also include non-position commands.
  // Powers and ranked moves come from the shared action list; shown hints and
  // Mulligan leave no action behind, so each browser records them as they sync.
  const derivedReactionEvents = useMemo(() => onlineActionEvents(match.state.actions), [actionsKey]); // Keyed like replay: the arrays are rebuilt on every sync.
  const [syncedReactionEvents, setSyncedReactionEvents] = useState<Occurrence[]>([]);
  const currentPly = replay.game.history().length;
  const shownSuggestion = match.state.suggestions;
  const shownSuggestionKey = shownSuggestion ? `${shownSuggestion.kind}|${shownSuggestion.actor}|${shownSuggestion.position}` : null;
  useEffect(() => {
    if (!shownSuggestion) return;
    const event: Occurrence = { trigger: shownSuggestion.kind === "best" ? "seeBest" : "seeWorst", color: shownSuggestion.actor, ply: currentPly };
    setSyncedReactionEvents((log) => [...log, event].slice(-128));
  }, [shownSuggestionKey]); // Once per newly shown suggestion, not on every sync.
  const undoCount = match.state.usage?.undo ?? 0;
  const undoCountRef = useRef(undoCount);
  useEffect(() => {
    if (undoCount > undoCountRef.current) {
      const event: Occurrence = { trigger: "mulligan", color: match.state.redo?.actor ?? color, ply: currentPly };
      setSyncedReactionEvents((log) => [...log.filter((entry) => entry.ply <= currentPly), event].slice(-128));
    }
    undoCountRef.current = undoCount;
  }, [undoCount]); // Only a rising Undo count is a new Mulligan.
  const reactionEvents = useMemo(() => [...derivedReactionEvents, ...syncedReactionEvents], [derivedReactionEvents, syncedReactionEvents]);
  const [mulliganPreviewActive, setMulliganPreviewActive] = useState(false);
  const mulliganPreviewMoves = useMemo(() => {
    if (!mulliganPreviewActive) return null;
    return getOnlineMulliganPreviewMoves(replay.game, match.state.actions, color);
  }, [mulliganPreviewActive, replay.game, match.state.actions, color]);
  const movePreview = useMemo(
    () => pendingMovePreview(match, online.pending, viewerId),
    [match, online.pending, viewerId],
  );
  const position = useMemo(() => matchPosition(match.state), [actionsKey]);
  const kit = useMemo(() => {
    const white = defaultCityKit(
      match.members.find((m) => m.color === "w")!.city_id,
    )!;
    const black = defaultCityKit(
      match.members.find((m) => m.color === "b")!.city_id,
    )!;
    const common = defaultCityKit(
      match.context_city_id ?? match.members[0].city_id,
    )!;
    return combineOnlineKits(white, black, common);
  }, [me.city_id, opponent.city_id, match.context_city_id]);
  const [powerDisplay, setPowerDisplay] = usePowerDisplay();
  const [chancePosition, setChancePosition] = useChancePosition();
  const [spectrogramMode, setSpectrogramMode] = useSpectrogramMode();
  const [crossfaderSync, setCrossfaderSync] = useCrossfaderSync();
  const [awardAnimations, setAwardAnimations] = useAwardAnimations();
  const awardAnimationsRef = useRef(awardAnimations);
  awardAnimationsRef.current = awardAnimations;
  const [playing, setPlaying] = useState(false);
  const [engineOn, setEngineOn] = useState(true);
  const [mixerOn, setMixerOn] = useState(false);
  const [paramsOn, setParamsOn] = useState(false);
  const [syncParams, setSyncParams] = useState(true);
  const [songHover, setSongHover] = useState<SongPanelHover | null>(null);
  // Piece Params shows the Song & Instruments list until the full params are opened.
  const [paramsOpen, setParamsOpen] = useState(false);
  const [songMidiOn, setSongMidiOn] = useState(true);
  const [opponentOpen, setOpponentOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [resumedMatch] = useState(
    () => match.state.actions.length > 0 || hasSeenMatchIntro(match.id),
  );
  const [introPhase, setIntroPhase] = useState(resumedMatch ? 2 : 1);
  const intro = introPhase < 3;
  const gameplayTip = useGameplayTip(introPhase === 3);
  const [introExitStarted, setIntroExitStarted] = useState(resumedMatch);
  const [showIntroBoxes, setShowIntroBoxes] = useState(!resumedMatch);
  const introRequested = useRef(resumedMatch);
  const [openDropdown, setOpenDropdown] = useState<BoardDropdownId>(null);
  const { isMobile, isPortraitMobile } = useMatchViewport();
  const [spectrogramOn, setSpectrogramOn] = useState(false);
  const [codeBackdropOn, setCodeBackdropOn] = useState(false);
  const [codeTextOn, setCodeTextOn] = useState(true);
  const [liveCodeOn, setLiveCodeOn] = useState(false);
  const [pieceDebugOn, setPieceDebugOn] = useState(false);
  const [activeWidgetOrder, setActiveWidgetOrder] = useState<string[]>([]);
  const [widgetTogglesReady, setWidgetTogglesReady] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tickerRef = useRef<HTMLDivElement | null>(null);
  const knobsRef = useRef<HTMLDivElement | null>(null);
  const knobsHandleRef = useRef<HTMLDivElement | null>(null);
  const knobsToggleRef = useRef<HTMLButtonElement | null>(null);
  const mixerRef = useRef<HTMLDivElement | null>(null);
  const mixerHandleRef = useRef<HTMLDivElement | null>(null);
  const mixerToggleRef = useRef<HTMLButtonElement | null>(null);
  const spectrogramRef = useRef<HTMLDivElement | null>(null);
  const spectrogramHandleRef = useRef<HTMLDivElement | null>(null);
  const spectrogramToggleRef = useRef<HTMLButtonElement | null>(null);
  const liveCodeRef = useRef<HTMLDivElement | null>(null);
  const liveCodeHandleRef = useRef<HTMLDivElement | null>(null);
  const liveCodeToggleRef = useRef<HTMLButtonElement | null>(null);
  const pieceDebugRef = useRef<HTMLDivElement | null>(null);
  const pieceDebugHandleRef = useRef<HTMLDivElement | null>(null);
  const pieceDebugToggleRef = useRef<HTMLButtonElement | null>(null);
  const [knobsPosition, setKnobsPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [mixerPosition, setMixerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [spectrogramPosition, setSpectrogramPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [liveCodePosition, setLiveCodePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pieceDebugPosition, setPieceDebugPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const mutedWidgets = useRef<{
    mixer: boolean;
    knobs: boolean;
    spectrogram: boolean;
    pieceDebug: boolean;
    order: string[];
  } | null>(null);
  const [armedPower, setArmedPower] = useState<MatchPowerKind | null>(null);
  const [global, setGlobal] = useState<GlobalEffects>(() => ({
    ...DEFAULT_GLOBAL_EFFECTS,
    bpm: kit.bpm,
    volume: kit.volume,
  }));
  const [hoveredCost, setHoveredCost] = useState<string | null>(null);
  const costTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [arrows, setArrows] = useState<AnalysisArrow[]>([]);
  const [pieceSaveError, setPieceSaveError] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const powerCardsRef = useRef<HTMLDivElement | null>(null);
  const boardResize = useBoardResize({ boardRef, enabled: !isPortraitMobile, reservedHeight: powerDisplay === "cards" ? () => (powerCardsRef.current?.offsetWidth ?? 0) * BOARD_CARDS_RESIZE_RATIO : undefined });
  const cardsResize = useBoardResize({ boardRef: powerCardsRef, enabled: !isPortraitMobile && powerDisplay === "cards", customLimits: powerCardsResizeLimits });
  const boardPan = useBoardPan({ boardRef, enabled: !isMobile && introPhase >= 3 });
  const cardsPan = useBoardPan({ boardRef: powerCardsRef, enabled: !isMobile && introPhase >= 3 && powerDisplay === "cards" });
  const queuedPieces = useRef(
    new Map<string, { instrument: Instrument; effects?: SquareEffects }>(),
  );
  const pieceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingPieces = useRef(false);
  const appliedRevisions = useRef(new Map<string, number>());
  const alive = useRef(true);
  const [saveEpoch, setSaveEpoch] = useState(0);
  const previousMoves = useRef(replay.game.history().length);
  const [mulliganAnimationKey, setMulliganAnimationKey] = useState(0);
  const animateMulligan = useCallback(() => setMulliganAnimationKey(key => key + 1), []);
  const { publishPiece } = online;
  const flushPieces = useCallback(async () => {
    const client = getOnlineClient();
    if (!client || savingPieces.current || !queuedPieces.current.size) return;
    savingPieces.current = true;
    setPieceSaveError(null);
    try {
      // New edits made during a request form the next batch. They cannot be
      // dropped just because their debounce fired while this batch was busy.
      while (alive.current && queuedPieces.current.size) {
        const batch = [...queuedPieces.current];
        for (const [pieceId, values] of batch) {
          if (!alive.current) break;
          const { data, error } = await client.functions.invoke<{ revision?: number }>("piece-params", {
            timeout: 20000,
            body: { matchId: match.id, pieceId, ...values },
          });
          if (error) throw error;
          if (typeof data?.revision === "number")
            publishPiece(pieceId, data.revision, values.instrument, values.effects);
          if (queuedPieces.current.get(pieceId) === values)
            queuedPieces.current.delete(pieceId);
        }
      }
    } catch {
      if (alive.current)
        setPieceSaveError(
          "Piece changes have not been saved. Retry to share them.",
        );
    } finally {
      savingPieces.current = false;
      if (alive.current) setSaveEpoch((n) => n + 1);
    }
  }, [match.id, publishPiece]);
  const onPieceChange = useCallback(
    (id: string, instrument: Instrument, effects?: SquareEffects) => {
      if (!id.startsWith(`${color}:`)) return;
      queuedPieces.current.set(id, { instrument, effects });
      if (pieceTimer.current) clearTimeout(pieceTimer.current);
      pieceTimer.current = setTimeout(() => void flushPieces(), 300);
    },
    [color, flushPieces],
  );
  const music = useMusic(
    replay.game,
    city,
    playing && !intro && !match.state.result,
    global.bpm,
    global.volume,
    codeBackdropOn,
    engineOn,
    replay.positions,
    {
      initialKit: kit,
      canEditPiece: (id) =>
        !match.state.result && (id.startsWith(`${color}:`) || !syncParams),
      onPieceChange,
      actionEvents: reactionEvents,
    },
  );
  const sharedRoot = match.state.boardMusic?.root ?? kit.root;
  const sharedScale = match.state.boardMusic?.scale ?? kit.scale;
  const sharedHarmony = match.state.boardMusic?.harmony ?? kit.harmony;
  useEffect(() => {
    music.setTonality(sharedRoot, sharedScale);
    music.setHarmony(sharedHarmony);
  }, [
    sharedRoot,
    sharedScale,
    sharedHarmony,
    music.setTonality,
    music.setHarmony,
  ]);
  useEffect(() => {
    tickerRef.current?.scrollTo({
      left: tickerRef.current.scrollWidth,
      behavior: "smooth",
    });
  }, [actionsKey]);
  const musicApply = useRef(music.applySharedPiece);
  musicApply.current = music.applySharedPiece;
  useEffect(() => {
    for (const piece of online.pieces) {
      if (!piece.piece_id.startsWith(`${color}:`) && !syncParams) continue;
      if (queuedPieces.current.has(piece.piece_id)) continue;
      if (appliedRevisions.current.get(piece.piece_id) === piece.revision)
        continue;
      if (musicApply.current(piece.piece_id, piece.instrument, piece.effects))
        appliedRevisions.current.set(piece.piece_id, piece.revision);
      else
        setPieceSaveError(
          "A shared instrument is incompatible. Reload to get the latest game version.",
        );
    }
  }, [online.pieces, syncParams, color, saveEpoch]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (pieceTimer.current) clearTimeout(pieceTimer.current);
    };
  }, []);
  const beginIntroExit = useCallback(() => {
    if (introRequested.current) return;
    introRequested.current = true;
    getSfxEngine().playSeatbelt();
    setIntroExitStarted(true);
  }, []);
  useEffect(() => {
    rememberMatchIntro(match.id);
    if (resumedMatch) return;
    const timer = setTimeout(beginIntroExit, 5000);
    return () => clearTimeout(timer);
  }, [beginIntroExit, match.id, resumedMatch]);
  useEffect(() => {
    if (!introExitStarted) return;
    // Resumed matches skip the title and start at the board entrance.
    const entranceDelay = resumedMatch ? 0 : 1000;
    const boardTimer = setTimeout(() => setIntroPhase(2), entranceDelay);
    const titleTimer = setTimeout(() => setShowIntroBoxes(false), entranceDelay + 500);
    const activeTimer = setTimeout(() => setIntroPhase(3), entranceDelay + 3500);
    return () => {
      clearTimeout(boardTimer);
      clearTimeout(titleTimer);
      clearTimeout(activeTimer);
    };
  }, [introExitStarted, resumedMatch]);
  useEffect(() => {
    const count = replay.game.history().length;
    if (count > previousMoves.current) setPlaying(true);
    previousMoves.current = count;
    setArmedPower(null);
  }, [actionsKey]);
  const analysis = useOnlineAnalysis(
    replay.game,
    replay.powers,
    position,
    match.state.result,
  );
  const ownTurn = replay.game.turn() === color && !match.state.result;
  const disabled =
    online.busy ||
    !!online.pending ||
    !online.connected ||
    !!match.state.result;
  const hasEggsForAction = useCallback((amount: number) => {
    const balance = match.state.eggs[color];
    if (balance >= amount) return true;
    animateInsufficientEggs(ownEggCounterRef.current);
    void getSfxEngine().playBlockedCue();
    const shortfall = amount - balance;
    toast.error(`You need ${shortfall} more golden egg${shortfall === 1 ? "" : "s"} to use this`);
    return false;
  }, [match.state.eggs, color]);
  const perform = useCallback(
    (command: MatchCommand) => {
      if (command.kind === "undo") setMulliganPreviewActive(false);
      const cost = command.kind === "power" ? 3 : command.kind === "undo" ? 2 : command.kind === "suggest" ? 1 : 0;
      if (command.kind === "power" && powerUsedThisTurn(match.state, command.power, color)) {
        setArmedPower(null);
        toast.info(`${command.power === "freeze" ? "Freeze" : "Shield"} can be used once per turn`);
        return;
      }
      if (cost && !hasEggsForAction(cost)) return;
      if (command.kind === "power" && command.power === "freeze") {
        const power = createMatchPower(
          command.power,
          command.square,
          replay.game,
          match.state.actions.length + 1,
        );
        const error = freezeApplicationError(replay.game, replay.powers, power);
        if (error) {
          setArmedPower(null);
          toast.error(error);
          return;
        }
      }
      void online
        .send(command)
        .catch((e) =>
          toast.error(e.message ?? "Could not confirm this action"),
        );
    },
    [online.send, replay.game, replay.powers, match.state, color, hasEggsForAction],
  );
  const gesture = usePowerTargetingGesture({
    armedPower,
    enabled: !intro && ownTurn && !disabled,
    boardRef,
    onArm: (kind) => { if (kind) hideCostHint(); setArmedPower(kind); },
    canArm: () => ownTurn && !disabled && hasEggsForAction(3),
    onBegin: () => { music.endAudition(); void getSfxEngine().resume() },
    onTarget: (square, power) => {
      perform({ kind: "power", power, square });
      setArmedPower(null);
    },
    onHover: (power) => getSfxEngine().playPowerHover(power),
  });
  useEffect(() => {
    const shared = match.state.suggestions;
    if (
      !shared ||
      shared.position !== position ||
      shared.expiresAt <= Date.now()
    ) {
      setArrows([]);
      return;
    }
    setArrows(
      shared.moves.map((m) => ({
        from: m.uci.slice(0, 2) as Square,
        to: m.uci.slice(2, 4) as Square,
        label: formatEvaluation(m.score, m.mate ?? null),
        tone: shared.kind,
        labelTone: rankedMoveLabelTone(m.score, m.mate ?? null),
      })),
    );
    const timer = setTimeout(
      () => setArrows([]),
      Math.max(0, shared.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [match.state.suggestions, position]);
  // Eggs stay on the destination squares of your own suggestions a little longer than
  // the arrows; any of your pieces landing there earns them.
  const [squareEggs, setSquareEggs] = useState<{ square: Square; kind: "best" | "worst"; eggs: number }[]>([]);
  const squareEggsFadeAt = match.state.suggestions ? squareEggsUntil(match.state.suggestions) - EGG_REWARDS.squareEggsFadeSeconds * 1000 : null;
  useEffect(() => {
    const shared = match.state.suggestions;
    if (!shared || shared.actor !== color || shared.position !== position || squareEggsUntil(shared) <= Date.now()) {
      setSquareEggs([]);
      return;
    }
    const targets = new Map<string, "best" | "worst">();
    for (const m of shared.moves) {
      const square = m.uci.slice(2, 4);
      if (!targets.has(square))
        targets.set(square, shared.kind === "best" && rankedMoveLabelTone(m.score, m.mate ?? null) !== "worst" ? "best" : "worst");
    }
    setSquareEggs(
      [...targets]
        .map(([square, kind]) => ({ square: square as Square, kind, eggs: rankedRewardTotal(match.state, color, kind, replay.game.moves().length) }))
        .filter((target) => target.eggs > 0),
    );
    const timer = setTimeout(() => setSquareEggs([]), Math.max(0, squareEggsUntil(shared) - Date.now()));
    return () => clearTimeout(timer);
  }, [match.state, position, color, replay]);
  // Ranked-move eggs fly from the destination square to the earner's counter, as in the campaign.
  // The server computes the reward, so the flight is rebuilt from the confirmed state:
  // eggs that entered the counter plus those past the full counter (historic points, in a puff).
  const eggSnapshotRef = useRef<{ actions: number; eggs: Record<"w" | "b", number>; collected: Record<"w" | "b", number> } | null>(null);
  const eggFlightCleanupsRef = useRef(new Set<() => void>());
  const eggFlightSerialRef = useRef(0);
  useEffect(() => {
    const { actions, eggs, collected } = match.state;
    const previous = eggSnapshotRef.current;
    eggSnapshotRef.current = { actions: actions.length, eggs: { ...eggs }, collected: { ...collected } };
    // The final move hands over to the victory basket, which flies the counters' eggs itself.
    if (!previous || actions.length !== previous.actions + 1 || match.state.result) return;
    const last = actions.at(-1);
    if (last?.kind !== "move" || !last.reward) return;
    const owner = last.color;
    const earned = Math.max(0, eggs[owner] - previous.eggs[owner]);
    const overflow = Math.max(0, collected[owner] - previous.collected[owner]);
    if (earned + overflow <= 0) return;
    const counterEl = owner === color ? ownEggCounterRef.current : opponentEggCounterRef.current;
    launchEggFlight(
      { id: ++eggFlightSerialRef.current, amount: earned + overflow, overflow, direction: "earn", owner, sourceSquare: last.to as Square },
      counterEl,
      boardRef.current,
      eggFlightCleanupsRef.current,
      { still: !awardAnimationsRef.current },
    );
  }, [match.state, color]);
  useEffect(() => () => {
    eggFlightCleanupsRef.current.forEach((cleanup) => cleanup());
    eggFlightCleanupsRef.current.clear();
  }, []);
  const onMove = (move: Move) => {
    if (!ownTurn || disabled) return;
    const currentAnalysis =
      analysis.analysis?.complete && analysis.analysis.fen === replay.game.fen()
        ? analysis.analysis
        : null;
    perform({
      kind: "move",
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      ...(currentAnalysis
        ? {
            analysis: {
              position,
              best: limitRankedLists(currentAnalysis).best
                .map(({ uci, score, mate }) => ({ uci, score, mate })),
              worst: limitRankedLists(currentAnalysis).worst
                .map(({ uci, score, mate }) => ({ uci, score, mate })),
            },
          }
        : {}),
    });
  };
  const canShowSuggestions = (group: "best" | "worst") =>
    !disabled &&
    !replay.powers.some(p => (p.appliedBy ?? 'w') === color) &&
    !arrows.some(arrow => arrow.tone === group) &&
    !!analysis.analysis?.complete;
  const show = (group: "best" | "worst") => {
    if (!canShowSuggestions(group) || !analysis.analysis?.complete) return;
    const moves = limitRankedLists(analysis.analysis)[group]
      .map(({ uci, score, mate }) => ({ uci, score, mate }));
    perform({ kind: "suggest", group, moves, position });
    if (awardAnimationsRef.current) void getSfxEngine().playAnalysisWhistle(group === "best" ? "up" : "down");
  };
  const changeSync = (enabled: boolean) => {
    setSyncParams(enabled);
    if (!enabled) return;
    const shared = new Map(online.pieces.map((p) => [p.piece_id, p]));
    for (const [id, instrument] of Object.entries(kit.instruments)) {
      if (id.startsWith(`${color}:`)) continue;
      const piece = shared.get(id);
      musicApply.current(
        id,
        piece?.instrument ?? instrument,
        piece?.effects ?? kit.effects[id],
      );
      if (piece) appliedRevisions.current.set(id, piece.revision);
    }
  };
  const selected = music.selected;
  if (paramsOpen && !selected) setParamsOpen(false);
  const locked = !!selected && syncParams && selected.color !== color;
  const result = match.state.result;
  const won = result?.winner === color;
  const currentEggs = match.state.eggs[color];
  const hasResult = !!result;
  const payout = result ? matchEggPayout(match.state.eggs, result.winner)[color] : 0;
  useEffect(() => {
    if (introPhase !== 3 || color !== "w" || match.state.actions.length !== 0 || result || reportedMatchStartRef.current) return;
    reportedMatchStartRef.current = true;
    matchStartedAtRef.current = Date.now();
    const whiteCity = getCityById(match.members.find((member) => member.color === "w")!.city_id);
    const blackCity = getCityById(match.members.find((member) => member.color === "b")!.city_id);
    trackMatchStarted({
      game_mode: "online",
      city_name: city.name,
      white_kit_city: whiteCity?.name ?? "Random",
      black_kit_city: blackCity?.name ?? "Random",
    });
  }, [introPhase, color, match.state.actions.length, match.members, result, city.name]);
  useEffect(() => {
    if (!result || color !== "w" || reportedMatchResultRef.current) return;
    reportedMatchResultRef.current = true;
    const whiteCity = getCityById(match.members.find((member) => member.color === "w")!.city_id);
    const blackCity = getCityById(match.members.find((member) => member.color === "b")!.city_id);
    const saved = matchEggPayout(match.state.eggs, result.winner);
    trackMatchCompleted({
      game_mode: "online",
      result: result.winner === "w" ? "white" : result.winner === "b" ? "black" : "draw",
      result_reason: result.reason,
      move_count: replay.game.history().length,
      golden_eggs_saved: saved.w + saved.b,
      golden_eggs_collected: match.state.collected.w + match.state.collected.b,
      freeze_uses: match.state.usage?.freeze ?? 0,
      shield_uses: match.state.usage?.shield ?? 0,
      undo_uses: match.state.usage?.undo ?? 0,
      redo_uses: match.state.usage?.redo ?? 0,
      best_uses: match.state.usage?.best ?? 0,
      worst_uses: match.state.usage?.worst ?? 0,
      ...(matchStartedAtRef.current !== null ? { observed_duration_seconds: Math.max(0, Math.round((Date.now() - matchStartedAtRef.current) / 1000)) } : {}),
      city_name: city.name,
      white_kit_city: whiteCity?.name ?? "Random",
      black_kit_city: blackCity?.name ?? "Random",
    });
  }, [result, color, match, replay.game, city.name]);
  const basketSources = useMemo(() => {
    const shares = result ? matchEggSources(match.state.eggs, result.winner, color) : { w: 0, b: 0 };
    return [
      { amount: shares[color], element: () => ownEggCounterRef.current },
      { amount: shares[opponent.color], element: () => opponentEggCounterRef.current },
    ];
  }, [!!result, result?.winner, match.state.eggs.w, match.state.eggs.b, color, opponent.color]);
  const visibleOwnEggs = hasResult && !won && result?.winner ? 0 : Math.max(0, currentEggs - depositedEggs[color]);
  const visibleOpponentEggs = hasResult && !won && result?.winner ? 0 : Math.max(0, match.state.eggs[opponent.color] - depositedEggs[opponent.color]);
  useEffect(() => {
    if (introPhase !== 3) return;
    setMixerOn(!hasResult);
    setParamsOn(!hasResult);
    if (!hasResult)
      setActiveWidgetOrder((order) => [
        ...order.filter((id) => id !== "mixer" && id !== "knobs"),
        "mixer",
        "knobs",
      ]);
  }, [introPhase, hasResult]);

  const hideCostHint = () => {
    if (costTimer.current) clearTimeout(costTimer.current);
    setHoveredCost(null);
  };
  const costEvents = (action: string) => ({
    onMouseEnter: () => {
      hideCostHint();
      setHoveredCost(action);
      costTimer.current = setTimeout(() => setHoveredCost(null), 1500);
    },
    onFocus: () => {
      hideCostHint();
      setHoveredCost(action);
      costTimer.current = setTimeout(() => setHoveredCost(null), 1500);
    },
    onPointerLeave: hideCostHint,
    onBlur: hideCostHint,
  });
  useEffect(
    () => () => {
      if (costTimer.current) clearTimeout(costTimer.current);
    },
    [],
  );
  const bringToFront = useCallback((id: string) => {
    setActiveWidgetOrder((order) => [
      ...order.filter((item) => item !== id),
      id,
    ]);
  }, []);
  const toggleWidget = (
    id: string,
    set: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    set((current) => !current);
    bringToFront(id);
  };
  const toggleEngine = () => {
    music.endAudition();
    if (engineOn) {
      mutedWidgets.current = {
        mixer: mixerOn,
        knobs: paramsOn,
        spectrogram: spectrogramOn,
        pieceDebug: pieceDebugOn,
        order: activeWidgetOrder,
      };
      setMixerOn(false);
      setParamsOn(false);
      setSpectrogramOn(false);
      setPieceDebugOn(false);
    } else {
      const previous = mutedWidgets.current;
      if (previous) {
        setMixerOn(previous.mixer);
        setParamsOn(previous.knobs);
        setSpectrogramOn(previous.spectrogram);
        setPieceDebugOn(previous.pieceDebug);
        setActiveWidgetOrder(previous.order);
      }
    }
    setEngineOn(!engineOn);
  };
  const widgetDescriptors = useMemo(
    () => ({
      knobs: {
        ref: knobsRef,
        on: paramsOn,
        position: knobsPosition,
        setPosition: setKnobsPosition,
      },
      mixer: {
        ref: mixerRef,
        on: mixerOn,
        position: mixerPosition,
        setPosition: setMixerPosition,
      },
      spectrogram:
        spectrogramMode === "widget"
          ? {
              ref: spectrogramRef,
              on: spectrogramOn,
              position: spectrogramPosition,
              setPosition: setSpectrogramPosition,
            }
          : undefined,
      liveCode: {
        ref: liveCodeRef,
        on: liveCodeOn && codeBackdropOn,
        position: liveCodePosition,
        setPosition: setLiveCodePosition,
      },
      pieceDebug: {
        ref: pieceDebugRef,
        on: pieceDebugOn,
        position: pieceDebugPosition,
        setPosition: setPieceDebugPosition,
      },
    }),
    [
      paramsOn,
      knobsPosition,
      mixerOn,
      mixerPosition,
      spectrogramMode,
      spectrogramOn,
      spectrogramPosition,
      liveCodeOn,
      codeBackdropOn,
      liveCodePosition,
      pieceDebugOn,
      pieceDebugPosition,
    ],
  );
  const widgetLayout = useGameWidgetLayout({
    rootRef,
    boardAreaRef: boardRef,
    boardScale: 1,
    // Connections are hidden on portrait phones; skip measuring them after every move.
    musicEngineOn: engineOn && !isPortraitMobile,
    selectedSquare: selected?.square ?? null,
    hoveredPiece: paramsOn && (!selected || !paramsOpen) ? songHover : null,
    orientation: color === "w" ? "white" : "black",
    introPhase,
    activeWidgetOrder,
    boardOffset: boardPan.offset,
    widgets: widgetDescriptors,
  });
  const toggles = [
    ...(spectrogramMode === "widget"
      ? [
          {
            id: "spectrogram",
            label: "Spectrogram",
            ref: spectrogramToggleRef,
            isOn: spectrogramOn,
            onToggle: () => toggleWidget("spectrogram", setSpectrogramOn),
            position: spectrogramPosition ?? { x: 0, y: 0 },
            onPositionChange: setSpectrogramPosition,
          },
        ]
      : []),
    {
      id: "knobs",
      label: "Piece Params",
      ref: knobsToggleRef,
      isOn: paramsOn,
      onToggle: () => toggleWidget("knobs", setParamsOn),
      position: knobsPosition ?? { x: 0, y: 0 },
      onPositionChange: setKnobsPosition,
    },
    {
      id: "mixer",
      label: "Mixer",
      ref: mixerToggleRef,
      isOn: mixerOn,
      onToggle: () => toggleWidget("mixer", setMixerOn),
      position: mixerPosition ?? { x: 0, y: 0 },
      onPositionChange: setMixerPosition,
    },
    ...(pieceDebugOn
      ? [
          {
            id: "pieceDebug",
            label: "Piece Debug",
            ref: pieceDebugToggleRef,
            isOn: pieceDebugOn,
            onToggle: () => toggleWidget("pieceDebug", setPieceDebugOn),
            position: pieceDebugPosition ?? {
              x: knobsPosition?.x ?? 0,
              y:
                (knobsPosition?.y ?? 0) +
                (knobsRef.current?.offsetHeight ?? 520) +
                12,
            },
            onPositionChange: setPieceDebugPosition,
          },
        ]
      : []),
    ...(codeBackdropOn
      ? [
          {
            id: "liveCode",
            label: "Debug",
            ref: liveCodeToggleRef,
            isOn: liveCodeOn,
            onToggle: () => toggleWidget("liveCode", setLiveCodeOn),
            position: liveCodePosition ?? { x: 0, y: 0 },
            onPositionChange: setLiveCodePosition,
          },
        ]
      : []),
  ].map((item) => ({
    ...item,
    cityColor: city.color,
    onDragStart: () => bringToFront(item.id),
  }));
  const widgetsContent = (mobile: boolean) => {
    const panelStyle = (id: string): React.CSSProperties =>
      mobile
        ? { position: "static", width: "100%", zIndex: 10 }
        : { zIndex: activeWidgetOrder.indexOf(id) + 10 };
    const portalized = !mobile && widgetTogglesReady;
    // The on/off dot of the Song & Instruments list and of Piece Params.
    const toggleSongPiece = (square: Square) => {
      if (music.togglePiece(square, false) && engineOn) setPlaying(true);
    };
    const soloSongPiece = (id: string) => {
      if (music.toggleSolo(id, false) && engineOn) setPlaying(true);
    };
    return (
      <>
        {spectrogramMode === "widget" && (
          <SpectrogramWidget
            ref={spectrogramRef}
            handleRef={spectrogramHandleRef}
            toggleRef={spectrogramToggleRef}
            togglePortalized={portalized}
            cityColor={city.color}
            isOn={spectrogramOn}
            onToggle={() => toggleWidget("spectrogram", setSpectrogramOn)}
            isPlaying={engineOn && (playing || !!music.preview)}
            topColor={opponent.color}
            getTeamFrequencyData={music.getTeamFrequencyData}
            getFrequencyData={music.getFrequencyData}
            position={
              mobile ? undefined : (spectrogramPosition ?? { x: 0, y: 0 })
            }
            onPositionChange={setSpectrogramPosition}
            style={panelStyle("spectrogram")}
            onClickCapture={() => bringToFront("spectrogram")}
          />
        )}
        <SynthControlPanel
                duckSources={duckSourceOptions(music.snapshot.pieces, music.snapshot.instruments, music.selected)}
          ref={knobsRef}
          handleRef={knobsHandleRef}
          toggleRef={knobsToggleRef}
          togglePortalized={portalized}
          selectedSquare={selected?.square ?? null}
          selectedPieceInfo={music.instrument?.name ?? null}
          selectedPiece={selected}
          effects={
            selected
              ? (music.baseEffects[selected.id] ?? DEFAULT_EFFECTS)
              : DEFAULT_EFFECTS
          }
          onEffectChange={music.setPieceEffect}
          cityColor={city.color}
          isOn={paramsOn}
          onToggle={() => toggleWidget("knobs", setParamsOn)}
          position={mobile ? undefined : (knobsPosition ?? { x: 0, y: 0 })}
          onPositionChange={setKnobsPosition}
          style={panelStyle("knobs")}
          onClickCapture={() => bringToFront("knobs")}
          song={
            music.kit ? (
              // The arrangement is shared by both players' kits, so a match
              // only queues sections here; editing stays in Creative.
              <MusicSongPanel
                pieces={music.snapshot.pieces}
                names={Object.fromEntries(
                  music.snapshot.pieces.map((piece) => [
                    piece.id,
                    music.snapshot.instruments?.[piece.id]?.name,
                  ]),
                )}
                activeIds={music.activeIds}
                soloIds={music.soloIds}
                monitor={music.monitor}
                arrangement={music.kit.arrangement}
                harmony={music.kit.harmony}
                onSeek={music.seekSection}
                onSelect={(square) => music.select(square)}
                onOpenParams={(square) => {
                  setSongHover(null);
                  music.select(square);
                  setParamsOpen(true);
                }}
                snapshot={music.snapshot}
                selectedId={selected?.id ?? null}
                selectedView={
                  paramsOn && selected ? (
                    <MusicVoiceReadout
                      showStatus={false}
                      monitor={music.monitor}
                      id={selected.id}
                      snapshot={music.snapshot}
                      instrument={music.instrument ?? undefined}
                      onInstrumentChange={
                        locked || result ? undefined : music.updateInstrument
                      }
                      variationTabs
                      knobUpdateMode="on-release"
                    />
                  ) : undefined
                }
                showMidi={songMidiOn}
                canToggle={(piece) =>
                  !result && (piece.color === color || !syncParams)
                }
                onToggle={toggleSongPiece}
                ownColor={color}
                onAudition={music.tapAudition}
                onSolo={result ? undefined : soloSongPiece}
                onHover={setSongHover}
              />
            ) : undefined
          }
          // The list stays usable with an opponent's piece selected.
          readOnly={(locked && paramsOpen) || !!result}
          showSong={!paramsOpen}
          sections={
            music.kit ? (
              <MusicSongSections
                arrangement={music.kit.arrangement}
                harmony={music.kit.harmony}
                monitor={music.monitor}
                onSeek={music.seekSection}
              />
            ) : undefined
          }
          songMidi={{ on: songMidiOn, onToggle: () => setSongMidiOn((on) => !on) }}
          readOnlyMessage={locked ? "Opponent’s Piece Params" : "Match ended"}
          instrument={music.instrument}
          onInstrumentChange={
            locked || result ? undefined : music.updateInstrument
          }
          monitor={paramsOn ? music.monitor : undefined}
          monitorId={paramsOn ? selected?.id : undefined}
          pieceSvg={
            selected
              ? PiecesSVG[
                  `${selected.color}${selected.type.toUpperCase()}` as keyof typeof PiecesSVG
                ]
              : undefined
          }
          onDeselect={() => {
            setParamsOpen(false);
            music.select(null);
          }}
          playback={
            paramsOn && selected ? (
              <MusicVoiceReadout
                showStatus={false}
                monitor={music.monitor}
                id={selected.id}
                snapshot={music.snapshot}
                instrument={music.instrument ?? undefined}
                onInstrumentChange={
                  locked || result ? undefined : music.updateInstrument
                }
                loopOn={music.activeIds.has(selected.id)}
                onLoopToggle={() => toggleSongPiece(selected.square)}
                soloOn={music.soloIds.has(selected.id)}
                onSoloToggle={
                  result ? undefined : () => soloSongPiece(selected.id)
                }
                variationTabs
                knobUpdateMode="on-release"
              />
            ) : undefined
          }
        />
        {pieceDebugOn && (
          <PieceDebugWidget
            ref={pieceDebugRef}
            handleRef={pieceDebugHandleRef}
            toggleRef={pieceDebugToggleRef}
            togglePortalized={portalized}
            isStatic={mobile}
            selectedSquare={selected?.square ?? null}
            instrument={music.instrument}
            selectedPiece={selected ?? null}
            movementMapping={
              selected ? music.snapshot.mappings?.[selected.id] : undefined
            }
            arrangement={music.snapshot.arrangement}
            sectionOverride={
              selected
                ? music.snapshot.sectionOverrides?.[selected.id]
                : undefined
            }
            cityColor={city.color}
            position={
              mobile
                ? undefined
                : (pieceDebugPosition ?? {
                    x: knobsPosition?.x ?? 0,
                    y:
                      (knobsPosition?.y ?? 0) +
                      (knobsRef.current?.offsetHeight ?? 520) +
                      12,
                  })
            }
            onPositionChange={setPieceDebugPosition}
            onToggle={() => toggleWidget("pieceDebug", setPieceDebugOn)}
            className={mobile ? "w-full" : undefined}
            style={panelStyle("pieceDebug")}
            onClickCapture={() => bringToFront("pieceDebug")}
          />
        )}
        <MixerWidget
          ref={mixerRef}
          handleRef={mixerHandleRef}
          toggleRef={mixerToggleRef}
          togglePortalized={portalized}
          teamMixes={music.teamMixes}
          monitor={music.monitor}
          effects={{
            ...global,
            bpm: music.snapshot.bpm,
            volume: music.snapshot.volume,
          }}
          onEffectChange={(key, value) =>
            setGlobal((g) => ({ ...g, [key]: value }))
          }
          topColor={opponent.color}
          onTeamMixChange={music.updateTeamMix}
          cityColor={city.color}
          sessionId={match.id}
          isOn={mixerOn}
          onToggle={() => toggleWidget("mixer", setMixerOn)}
          crossfaderSync={crossfaderSync}
          isPlaying={engineOn && (playing || !!music.preview)}
          onTogglePlay={() => { if (engineOn && !result) setPlaying((p) => !p) }}
          spectrogramMode={spectrogramMode}
          getTeamFrequencyData={music.getTeamFrequencyData}
          getFrequencyData={music.getFrequencyData}
          position={mobile ? undefined : (mixerPosition ?? { x: 0, y: 0 })}
          onPositionChange={setMixerPosition}
          style={panelStyle("mixer")}
          onClickCapture={() => bringToFront("mixer")}
          evalScore={analysis.score}
          evalMate={analysis.mate}
          turn={(movePreview?.game ?? replay.game).turn()}
        />
        {codeBackdropOn && (
          <LiveCodeWidget
            ref={liveCodeRef}
            handleRef={liveCodeHandleRef}
            toggleRef={liveCodeToggleRef}
            togglePortalized={portalized}
            pattern={music.code}
            city={city}
            cityColor={city.color}
            isPlaying={engineOn && playing}
            isOn={liveCodeOn}
            onToggle={() => toggleWidget("liveCode", setLiveCodeOn)}
            position={mobile ? undefined : (liveCodePosition ?? { x: 0, y: 0 })}
            onPositionChange={setLiveCodePosition}
            style={panelStyle("liveCode")}
            onClickCapture={() => bringToFront("liveCode")}
            stockfishDebugOn={false}
            codeVisible={codeTextOn}
            onToggleCodeVisible={() => setCodeTextOn((on) => !on)}
            pieceDebugOn={pieceDebugOn}
            onTogglePieceDebug={() =>
              toggleWidget("pieceDebug", setPieceDebugOn)
            }
            playback={
              <>
                <MusicTransportReadout
                  monitor={music.monitor}
                  arrangement={music.snapshot.arrangement}
                />
                <p>
                  {analysis.error ??
                    (analysis.busy ? "Analyzing…" : "Analysis ready")}
                </p>
              </>
            }
          />
        )}
      </>
    );
  };
  const centerButtonClass =
    "relative size-[38px] p-0 sm:size-[51px] overflow-visible rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer";
  const status =
    online.busy || movePreview
      ? "Confirming…"
      : !online.connected
        ? "Reconnecting…"
        : result
          ? won
            ? "You won!"
            : result.winner
              ? "You lost"
              : "Draw"
          : armedPower
            ? "Choose a square"
            : ownTurn
              ? replay.game.isCheck()
                ? "Your move · Check!"
                : "Your move"
              : "Opponent thinking...";
  const statusPlacement = !online.busy && !movePreview && online.connected && !result && !armedPower && !ownTurn ? "top" : "bottom";
  const statusColor = replay.game.isCheck() ? "#ef4444" : city.color;
  const captured = replay.game
    .history({ verbose: true })
    .filter((move) => move.captured);
  const opponentCaptures = captured.filter((move) => move.color === opponent.color).map((move) => move.captured!);
  const playerCaptures = captured.filter((move) => move.color === color).map((move) => move.captured!);
  const capturedScale = useCapturedPiecesScale(playerCaptures.length, opponentCaptures.length);


  return (
    <main
      ref={rootRef}
      className={cn(
        "relative w-full h-[100dvh] max-h-[100dvh] max-w-[100vw] bg-background text-white select-none flex flex-col",
        isMobile
          ? "overflow-x-hidden overflow-y-auto [scrollbar-width:none]"
          : "overflow-hidden",
      )}
      style={
        {
          "--city-neon": city.color,
          backgroundImage: `radial-gradient(circle at 20% 20%, ${city.color}08 0%, transparent 40%),radial-gradient(circle at 80% 80%, ${city.color}05 0%, transparent 40%)`,
        } as React.CSSProperties
      }
    >
      <GameWidgetEntranceStyles />
      <GameCityBackground
        city={city}
        isBackgroundDark={introExitStarted}
        introPhase={introPhase}
      />
      {codeBackdropOn && codeTextOn && introPhase === 3 && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] overflow-hidden opacity-75"
          aria-hidden="true"
        >
          <pre className="whitespace-pre-wrap break-all px-4 py-16 font-mono text-xs text-green-400">
            {music.code}
          </pre>
        </div>
      )}
      {intro && (
        <div
          className={cn(
            "absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-all duration-[3000ms] bg-transparent",
            introExitStarted && "pointer-events-none",
          )}
          onClick={beginIntroExit}
          role="button"
          tabIndex={introExitStarted ? -1 : 0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              beginIntroExit();
            }
          }}
          aria-label="Enter online board"
        >
          <GameCityTitleIntro
            city={city}
            showIntroBoxes={showIntroBoxes}
            showIntroGlow={!introExitStarted}
            introExitStarted={introExitStarted}
            onTitleTransitionEnd={(event) => {
              if (introExitStarted && event.propertyName === "text-shadow")
                setShowIntroBoxes(false);
            }}
            matchInfo={introMatchInfo}
          />
        </div>
      )}
      <header
        className={cn(
          "top-0 left-0 w-full flex flex-col border-b border-transparent bg-transparent transition-opacity duration-1000 pointer-events-none",
          intro ? "z-[110]" : "z-[130]",
          isMobile ? "relative shrink-0" : "absolute",
        )}
      >
        <div className="w-full grid grid-cols-[auto_1fr] md:flex md:flex-wrap items-center md:justify-between gap-x-3 gap-y-1.5 px-4 md:px-6 py-2.5 md:py-3">
          <Button
          variant="outline"
          size="icon"
          className={cn(
            "col-start-1 row-start-1 md:col-auto md:row-auto shrink-0 pointer-events-auto text-[var(--city-neon)]",
            MATCH_HEADER_BUTTON_CLASS,
            intro && "relative z-[111]",
          )}
          aria-label="Voltar ao mapa"
          title="Voltar ao mapa"
          onClick={onBack}
        >
          <GlobeGridIcon maskId="online" />
        </Button>
        <div
          className={cn(
            "col-span-2 row-start-2 md:col-auto md:row-auto flex min-w-0 flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-1 text-[11px] font-semibold leading-none tracking-[0.025em] sm:text-xs md:text-sm pointer-events-auto transition-opacity duration-500",
            intro ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          style={{
            color: city.color,
            fontFamily: '"Bitcount Prop Single", sans-serif',
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <h1
            aria-label={`${city.year} ${city.name.toUpperCase()}`}
            className="max-w-full"
          >
            {city.year} {city.name.toUpperCase()}
          </h1>
          {music.tonality && music.baseTonality && music.harmony && (
            <BoardMusicSelectors
              disabled={disabled}
              cityColor={city.color}
              tonality={music.tonality}
              baseTonality={music.baseTonality}
              currentScaleLabel={music.currentScaleLabel}
              onTonalityChange={(root, scale) => {
                if (!disabled)
                  perform({ kind: "board-music", patch: { root, scale } });
              }}
              harmony={music.harmony}
              onHarmonyChange={(harmony) => {
                if (!disabled)
                  perform({ kind: "board-music", patch: { harmony } });
              }}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />
          )}
        </div>
        <div className="col-start-2 row-start-1 justify-self-end md:col-auto md:row-auto md:ml-auto flex min-w-0 items-center gap-2 md:gap-3 pointer-events-auto">
          <div
            className={cn(
              "flex min-w-0 items-center gap-2 md:gap-3 transition-opacity duration-500",
              intro && "opacity-0 pointer-events-none",
            )}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpponentOpen(true)}
              className={cn(
                "min-w-0 max-w-[calc(100vw-250px)] sm:max-w-60 bg-transparent",
                MATCH_HEADER_BUTTON_CLASS,
              )}
              title={`${opponent.profile.display_name} · ${online.opponentConnected ? "Online" : "Disconnected"}`}
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  online.opponentConnected ? "bg-green-400" : "bg-amber-400",
                )}
              />
              <span className="truncate">{opponent.profile.display_name}</span>
              <span className="hidden sm:inline text-xs">
                {online.opponentConnected ? "Online" : "Disconnected"}
              </span>
            </Button>
            <div className="flex gap-3">
              <MatchViewControls
                codeOn={codeBackdropOn}
                onToggleCode={() => {
                  setCodeBackdropOn(!codeBackdropOn);
                  if (codeBackdropOn) {
                    setLiveCodeOn(false);
                    setPieceDebugOn(false);
                  }
                }}
                musicOn={engineOn}
                onToggleMusic={toggleEngine}
                preferences={<GamePreferences display={powerDisplay} onDisplayChange={value => { gesture.cancel(); setPowerDisplay(value) }} chancePosition={chancePosition} onChancePositionChange={setChancePosition} spectrogramMode={spectrogramMode} onSpectrogramModeChange={setSpectrogramMode} crossfaderSync={crossfaderSync} onCrossfaderSyncChange={setCrossfaderSync} awardAnimations={awardAnimations} onAwardAnimationsChange={setAwardAnimations} className={MATCH_HEADER_BUTTON_CLASS} />}
              />
            </div>
          </div>
        </div>
        </div>
      </header>
      <div
        className={cn(
          "relative z-10 w-full flex flex-col lg:block justify-start pointer-events-none",
          isMobile ? "shrink-0 min-h-full pb-16 pt-4" : "h-full pt-4 lg:pt-0",
        )}
        style={
          {
            "--game-board-width": boardResize.width !== null ? `${boardResize.width}px` : isMobile
              ? "min(calc(100vw - 16px),512px)"
              : powerDisplay === "cards" ? "min(90vw,calc(100dvh - 350px),512px)" : "min(90vw,calc(100dvh - 270px),512px)",
            // The cards keep their own size: resizing the board never resizes them.
            "--power-cards-width": cardsResize.width !== null ? `${cardsResize.width}px` : isMobile
              ? "min(calc(100vw - 16px),512px)"
              : "min(90vw,calc(100dvh - 350px),512px)",
          } as React.CSSProperties
        }
      >
        <section
          className="flex flex-col items-center justify-start w-full mx-auto relative z-10 px-2 pointer-events-none lg:pt-6"
          style={{ marginTop: !isMobile ? "max(90px, calc(50vh - 350px))" : "0px" }}
        >
          <div
            className="relative min-h-[2rem] h-8 w-[var(--game-board-width)] flex justify-between items-center mb-2 sm:mb-3 gap-1.5"
            style={{ translate: boardPan.translate }}
            aria-label="Peças capturadas do adversário e ovos"
          >
            {statusPlacement === "top" && <MatchStatus placement="top" text={status} color={statusColor} className={cn("transition-opacity duration-1000", intro ? "opacity-0" : "opacity-100")} />}
            <EggCounter
              ref={opponentEggCounterRef}
              tone="opponent"
              value={visibleOpponentEggs}
              widthFor={[visibleOwnEggs, visibleOpponentEggs]}
              role="img"
              aria-label={`${visibleOpponentEggs} golden eggs for the opponent`}
            />
            <CapturedPieces pieces={opponentCaptures} color={opponent.color === "w" ? "b" : "w"} align="center" justify="end" {...capturedScale.opponent} />
          </div>
          <div
            ref={boardRef}
            className="w-[var(--game-board-width)] aspect-square relative z-20 mb-2 sm:mb-3 pointer-events-auto"
            style={{ visibility: introPhase < 2 ? "hidden" : "visible", translate: boardPan.translate }}
          >
            {chancePosition === "board" && (
              <GameBoardChanceBar
                visible={!intro}
                score={analysis.score}
                mate={analysis.mate}
                evaluationError={analysis.error}
                evaluating={analysis.busy}
                dimmed={(previousMoves.current > 0 && !playing) || !!result}
                orientation={color === "w" ? "white" : "black"}
              />
            )}
            <BoardResizeHandles enabled={boardResize.enabled && introPhase >= 3} onStart={boardResize.startResize} onResizeBy={boardResize.resizeBy} onCancel={boardResize.cancelResize} />
            <ChessgroundBoard
              entranceActive={introPhase === 2}
              game={movePreview?.game ?? replay.game}
              pendingSquares={movePreview?.squares}
              cityColor={city.color}
              orientation={color === "w" ? "white" : "black"}
              playerColor={color}
              deferMoves
              movesDisabled={disabled || !ownTurn || intro}
              isThinking={online.busy}
              onMove={onMove}
              undoAnimationKey={match.version}
              onUndoAnimation={animateMulligan}
              mulliganPreviewMoves={mulliganPreviewMoves}
              armedPower={armedPower}
              matchPowers={movePreview?.powers ?? replay.powers}
              confirmedPowerState={{ powers: replay.powers, ply: replay.game.history().length }}
              onPowerTarget={(square) => {
                if (armedPower)
                  perform({ kind: "power", power: armedPower, square });
                setArmedPower(null);
              }}
              onBoardClick={(square) => {
                if (!movePreview) music.select(square);
              }}
              onPieceHold={
                movePreview
                  ? undefined
                  : (square) => {
                      if (!armedPower && engineOn) music.audition(square);
                    }
              }
              onDragOverSquare={(from, to) => {
                if (!movePreview && !armedPower && engineOn)
                  music.audition(from, to);
              }}
              onPieceRelease={music.releaseAudition}
              onPieceCancel={music.endAudition}
              onPieceDoubleTap={(square) => {
                if (movePreview) return;
                const piece = music.snapshot.pieces.find(
                  (p) => p.square === square,
                );
                // Only the double tap that turns a piece on opens the full Piece Params.
                if (piece && music.togglePiece(square)) setParamsOpen(true);
              }}
              onFrozenCaptureBlocked={() => toast("Não é possível capturar uma peça congelada.", { id: "frozen-capture-blocked", duration: 3000 })}
              onShieldCaptureBlocked={(reason) => toast(shieldCaptureBlockMessage(reason), { id: "shield-capture-blocked", duration: 3000 })}
              musicEffectsEnabled={engineOn}
              musicPulseMonitor={music.pulseMonitor}
              synthSelectedSquare={selected?.square as Square | undefined}
              activeSquares={music.activeSquares}
              teamMixes={music.teamMixes}
              analysisArrows={movePreview ? [] : arrows}
              squareEggs={movePreview ? [] : squareEggs}
              squareEggsFadeAt={squareEggsFadeAt}
              showRankedMoveMarks={false}
              onEmptySquarePointerDown={boardPan.enabled ? boardPan.startPan : undefined}
            />
          </div>
          <div
            className={cn(
              "flex w-[var(--game-board-width)] items-start justify-between gap-1.5 pointer-events-none transition-opacity duration-1000",
              intro ? "opacity-0" : "opacity-100",
            )}
            style={{ translate: boardPan.translate }}
          >
            <CapturedPieces
              pieces={playerCaptures}
              color={color === "w" ? "b" : "w"}
              align="top"
              outlineColor={city.color}
              aria-label="Peças capturadas por você"
              {...capturedScale.player}
            />

            <EggCounter
              ref={ownEggCounterRef}
              tone="player"
              value={visibleOwnEggs}
              widthFor={[visibleOwnEggs, visibleOpponentEggs]}
              empty={currentEggs === 0}
              role="img"
              aria-label={`${visibleOwnEggs} golden eggs for you`}
              className="self-center"
            />
          </div>
          <MatchStatus
            placement="bottom"
            text={statusPlacement === "bottom" ? status : ""}
            color={statusColor}
            style={{ translate: boardPan.translate }}
            className={cn("mb-1 sm:mb-2 transition-opacity duration-1000", intro ? "opacity-0" : "opacity-100")}
          />
          {powerDisplay === "cards" ? <PowerCardHand visible={!intro} undoAnimationKey={mulliganAnimationKey} rowRef={powerCardsRef} resize={{ enabled: cardsResize.enabled, onStart: cardsResize.startResize, onResizeBy: cardsResize.resizeBy, onCancel: cardsResize.cancelResize }} move={cardsPan.enabled ? { translate: cardsPan.translate, moving: cardsPan.panning, onPointerDown: cardsPan.startPan } : undefined} actions={{
            best: { disabled: !canShowSuggestions("best"), onClick: () => show("best") },
            worst: { disabled: !canShowSuggestions("worst"), onClick: () => show("worst") },
            undo: {
              disabled: disabled || !match.state.actions.some(action => action.kind === "move" && action.color === color),
              onClick: () => {
                setMulliganPreviewActive(false);
                perform({ kind: "undo" });
              },
              onMouseEnter: () => setMulliganPreviewActive(true),
              onMouseLeave: () => setMulliganPreviewActive(false),
              onPointerLeave: () => setMulliganPreviewActive(false),
              onBlur: () => setMulliganPreviewActive(false),
              title: "Volta 1 jogada · 2 golden eggs"
            },
            freeze: {
              disabled: disabled || !ownTurn || powerUsedThisTurn(match.state, "freeze", color), 'aria-pressed': armedPower === "freeze",
              onPointerDown: event => gesture.onButtonPointerDown("freeze", event), onLostPointerCapture: gesture.onLostPointerCapture,
              onClick: event => gesture.onButtonClick("freeze", event),
            },
            shield: {
              disabled: disabled || !ownTurn || powerUsedThisTurn(match.state, "shield", color), 'aria-pressed': armedPower === "shield",
              onPointerDown: event => gesture.onButtonPointerDown("shield", event), onLostPointerCapture: gesture.onLostPointerCapture,
              onClick: event => gesture.onButtonClick("shield", event),
            },
          }} /> : <GameActionRow visible={!intro}>
            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
              {(["best", "worst"] as const).map((group) => (
                <button
                  key={group}
                  data-ranked-move-action={group}
                  {...costEvents(group)}
                  type="button"
                  aria-label={
                    group === "best"
                      ? "Veja as 3 melhores jogadas"
                      : "Veja as 3 piores jogadas"
                  }
                  title={`${group} · 1 golden egg`}
                  disabled={!canShowSuggestions(group)}
                  onClick={() => show(group)}
                  className={cn(
                    "pointer-events-auto cursor-pointer relative flex h-8 w-fit shrink-0 items-center gap-0.5 sm:gap-1 rounded-md border bg-black/55 px-1 sm:px-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    group === "best"
                      ? "border-green-300/35 text-green-100 hover:bg-green-950/70"
                      : "border-red-300/35 text-red-100 hover:bg-red-950/70",
                  )}
                >
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  {group}
                  <GameActionCostHint
                    visible={hoveredCost === group}
                    amount={1}
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={centerButtonClass}
                style={{ backgroundColor: "var(--city-neon)20" }}
                aria-label="Undo · costs 2 golden eggs"
                {...costEvents("undo")}
                onMouseEnter={() => {
                  setMulliganPreviewActive(true);
                  costEvents("undo").onMouseEnter();
                }}
                onMouseLeave={() => setMulliganPreviewActive(false)}
                onPointerLeave={() => {
                  setMulliganPreviewActive(false);
                  hideCostHint();
                }}
                onFocus={() => {
                  costEvents("undo").onFocus();
                }}
                onBlur={() => {
                  setMulliganPreviewActive(false);
                  hideCostHint();
                }}
                title="Undo · 2 golden eggs"
                disabled={disabled || replay.game.history().length === 0}
                onClick={() => {
                  setMulliganPreviewActive(false);
                  perform({ kind: "undo" });
                }}
              >
                <GameActionCostHint
                  visible={hoveredCost === "undo"}
                  amount={2}
                />
                <Undo2 className="pointer-events-none absolute inset-0 m-auto h-7 w-7 sm:h-10 sm:w-10" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={centerButtonClass}
                style={{ backgroundColor: "var(--city-neon)20" }}
                aria-label="Redo"
                title="Redo · free"
                disabled={disabled || match.state.redo?.actor !== color}
                onClick={() => perform({ kind: "redo" })}
              >
                <Redo2 className="pointer-events-none absolute inset-0 m-auto h-7 w-7 sm:h-10 sm:w-10" />
              </Button>
            </div>
            <div className="flex min-w-0 items-center justify-self-end gap-1 sm:gap-2">
              {(["freeze", "shield"] as const).map((kind) => (
                <button
                  key={kind}
                  data-match-power-action={kind}
                  {...costEvents(kind)}
                  type="button"
                  disabled={disabled || !ownTurn || powerUsedThisTurn(match.state, kind, color)}
                  title={`${kind} · 3 golden eggs`}
                  aria-label={
                    kind === "freeze"
                      ? "Congele uma casa por uma rodada"
                      : "Proteja uma casa por uma rodada"
                  }
                  aria-pressed={armedPower === kind}
                  onPointerDown={(event) => {
                    gesture.onButtonPointerDown(kind, event);
                  }}
                  onLostPointerCapture={gesture.onLostPointerCapture}
                  onClick={(event) => {
                    hideCostHint();
                    gesture.onButtonClick(kind, event);
                  }}
                  className={cn(
                    "pointer-events-auto touch-manipulation cursor-grab active:cursor-grabbing relative flex h-8 w-fit items-center gap-0.5 sm:gap-1 rounded-md border bg-black/55 px-1 sm:px-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    kind === "freeze"
                      ? "text-cyan-100 border-cyan-300/35 hover:bg-cyan-950/70"
                      : "text-amber-100 border-amber-300/35 hover:bg-amber-950/70",
                    armedPower === kind &&
                      (kind === "freeze"
                        ? "border-cyan-300 bg-cyan-900/70 shadow-[0_0_12px_#bcecff88]"
                        : "border-amber-300 bg-amber-900/70 shadow-[0_0_12px_#bcecff88]"),
                  )}
                >
                  {kind === "freeze" ? (
                    <Snowflake className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  {kind === "freeze" ? "Freeze" : "Shield"}
                  <GameActionCostHint
                    visible={hoveredCost === kind}
                    amount={3}
                  />
                </button>
              ))}
            </div>
          </GameActionRow>}
          <div className="w-[var(--game-board-width)] pointer-events-auto">
            {analysis.error ? (
              <p role="alert" className="mt-2 text-sm text-amber-300">
                {analysis.error}
              </p>
            ) : null}
            {online.error || (online.pending && !online.busy) ? (
              <div
                role="alert"
                className="mt-3 rounded border border-amber-300/30 p-3 text-sm text-amber-200"
              >
                {online.error ?? "An action is waiting for confirmation."}{" "}
                {online.pending ? (
                  <Button
                    variant="ghost"
                    disabled={online.busy}
                    onClick={() => void online.retry().catch(() => {})}
                  >
                    Retry action
                  </Button>
                ) : null}
              </div>
            ) : null}
            {pieceSaveError ? (
              <div role="alert" className="mt-3 text-sm text-amber-200">
                {pieceSaveError}
                <Button variant="ghost" onClick={() => void flushPieces()}>
                  Retry
                </Button>
              </div>
            ) : null}
            {music.error ? (
              <p role="alert" className="mt-2 text-sm text-amber-300">
                {music.error}
              </p>
            ) : null}
          </div>
          {isMobile && introPhase >= 3 && (
            <div
              data-mobile-widgets
              className="flex w-[var(--game-board-width)] flex-col gap-5 pt-5 pointer-events-auto [&>[data-widget=piece]]:order-1 [&>[data-widget=piece-debug]]:order-2 [&>[data-widget=mixer]]:order-3 [&>[data-widget=spectrum]]:order-4 [&>[data-widget=strudel]]:order-5 [&>[data-widget=board]]:order-6"
            >
              {widgetsContent(true)}
            </div>
          )}
        </section>
      </div>
      <GameWidgetConnections
        visible={engineOn && !isPortraitMobile}
        pieceConnections={widgetLayout.pieceConnections}
        chainConnections={widgetLayout.chainConnections}
      />
      <GameWidgetConnections
        overlay
        visible={engineOn && !isPortraitMobile}
        pieceConnections={widgetLayout.hoverConnections}
      />
      <div
        data-widget-entrance={introPhase === 2 ? "true" : undefined}
        className={cn(
          "transition-opacity duration-1000",
          introPhase < 2 ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        {!isMobile && widgetsContent(false)}
      </div>
      {!isMobile && introPhase >= 2 && (
        <WidgetToggleLayer
          items={toggles}
          onReady={() => setWidgetTogglesReady(true)}
        />
      )}
      <GameFooter
        visible={!intro}
        moves={replay.game.history()}
        tickerRef={tickerRef}
        score={analysis.score}
        mate={analysis.mate}
        evaluationError={analysis.error}
        evaluating={analysis.busy}
        dimmed={(previousMoves.current > 0 && !playing) || !!result}
        chancePosition={chancePosition}
      />
      {codeBackdropOn && (
        <>
          <div className="hidden sm:flex fixed bottom-3 right-3 z-[50] pointer-events-auto items-center gap-2 bg-background/80 backdrop-blur-sm p-1.5 px-2.5 rounded-lg border border-border shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <VersionChangelog />
          </div>
          <div className="flex sm:hidden fixed bottom-3 right-3 z-[50] pointer-events-auto items-center gap-1.5 bg-background/80 backdrop-blur-sm py-0.5 px-2 rounded border border-border/60 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <VersionChangelog />
          </div>
        </>
      )}

      <div
        ref={gesture.cursorRef}
        data-power-cursor={armedPower}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/60 bg-black/75 text-cyan-100 opacity-0"
        style={{ transform: "translate3d(-100px, -100px, 0)" }}
      >
        {armedPower === "freeze" ? (
          <Snowflake className="h-5 w-5" />
        ) : (
          <Shield className="h-5 w-5" />
        )}
      </div>
      <Dialog open={opponentOpen} onOpenChange={setOpponentOpen}>
        <DialogContent className="z-[140] border-white/20 bg-[#101713] text-white">
          <DialogHeader>
            <DialogTitle>{opponent.profile.display_name}</DialogTitle>
            <DialogDescription>
              {enemyCity.year} {enemyCity.name} · {enemyCity.genre}
            </DialogDescription>
          </DialogHeader>
          <p>
            Golden eggs:{" "}
            <b className="text-amber-300">
              {opponent.profile.profile.goldenEggs}
            </b>
          </p>
          <p>Historical points: {opponent.profile.profile.points}</p>
          <p className="text-xs text-white/60">
            {online.opponentConnected
              ? "Connected"
              : "Disconnected · waiting for reconnection"}
          </p>
          <AddFriendButton targetCode={opponent.profile.code} />
          {!result && <Button variant="outline" onClick={() => { setOpponentOpen(false); setExitOpen(true); }}>Desistir ou oferecer empate</Button>}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={syncParams}
              onChange={(e) => changeSync(e.target.checked)}
            />
            Sincronizar parâmetros musicais
          </label>
          <p className="text-xs text-white/60">
            Ao religar, seus ajustes locais nas peças adversárias são
            substituídos pelos parâmetros compartilhados.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="z-[140] border-white/20 bg-[#101713] text-white">
          <DialogHeader>
            <DialogTitle>Ações da partida</DialogTitle>
            <DialogDescription>
              Desistir encerra a partida. A oferta de empate precisa ser aceita
              pelo adversário.
            </DialogDescription>
          </DialogHeader>
          <Button
            disabled={disabled}
            onClick={() => {
              perform({ kind: "resign" });
              setExitOpen(false);
            }}
          >
            Desistir
          </Button>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => {
              perform({ kind: "offer-draw" });
              setExitOpen(false);
            }}
          >
            Oferecer empate
          </Button>
          <Button variant="ghost" onClick={() => setExitOpen(false)}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={
          !!match.state.drawOffer && match.state.drawOffer !== color && !result
        }
      >
        <DialogContent className="z-[140] border-white/20 bg-[#101713] text-white">
          <DialogHeader>
            <DialogTitle>Draw offered</DialogTitle>
            <DialogDescription>
              {opponent.profile.display_name} ofereceu empate.
            </DialogDescription>
          </DialogHeader>
          <Button
            disabled={disabled}
            onClick={() => perform({ kind: "accept-draw" })}
          >
            Aceitar empate
          </Button>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => perform({ kind: "decline-draw" })}
          >
            Continuar jogando
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!result} onOpenChange={(open) => { if (!open) onBack(); }}>
        <DialogContent
          className="z-[140] border-white/20 bg-[#101713] text-white"
          closeLabel="Return to globe"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {won ? "You won!" : result?.winner ? "You lost" : "Draw"}
            </DialogTitle>
            <DialogDescription>
              {won || (result && !result.winner)
                ? `You took home ${payout} golden eggs. Historical points +${payout + match.state.collected[color]}.`
                : result?.reason === "resign"
                  ? "Match ended by resignation."
                  : "The match has ended."}
            </DialogDescription>
          </DialogHeader>
          {result && (won || !result.winner) && <EggBasketTransfer
            earnedEggs={payout}
            accountEggs={me.profile.profile.goldenEggs}
            sources={basketSources}
            onLaunch={(amount, source) => {
              const sourceColor = source === 0 ? color : opponent.color;
              setDepositedEggs(current => ({ ...current, [sourceColor]: current[sourceColor] + amount }));
            }}
            onLand={amount => { if (!document.hidden && amount > 0) getSfxEngine().playEggLanding() }}
            onComplete={() => setDepositedEggs({ ...match.state.eggs })}
          />}
          {match.state.rematchOffer && match.state.rematchOffer !== color ? (
            <Button
              disabled={online.busy || !!online.pending}
              onClick={() => perform({ kind: "accept-rematch" })}
            >
              Aceitar nova partida
            </Button>
          ) : (
            <Button
              disabled={
                online.busy ||
                !!online.pending ||
                match.state.rematchOffer === color
              }
              onClick={() => perform({ kind: "offer-rematch" })}
            >
              <Music2 className="h-4 w-4" />
              {match.state.rematchOffer === color
                ? "Waiting for opponent…"
                : won
                  ? "Convidar para uma nova partida"
                  : result?.winner
                    ? "Pedir revanche"
                    : "Nova partida"}
            </Button>
          )}
          <Button variant="outline" onClick={onBack}>
            Return to globe
          </Button>
        </DialogContent>
      </Dialog>
      <GameplayTipDialog tip={gameplayTip.tip} open={gameplayTip.open} onOpenChange={gameplayTip.setOpen} />
    </main>
  );
}
