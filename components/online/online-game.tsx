"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Move, Square } from "chess.js";
import {
  Code2,
  Eye,
  Pause,
  Play,
  Shield,
  Snowflake,
  Undo2,
  Redo2,
  Maximize,
  Minimize,
  Music2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCityById, cities } from "@/lib/cities-data";
import { replayMatch, matchPosition } from "@/lib/online/domain";
import { pendingMovePreview } from "@/lib/online/pending-move";
import type { OnlineMatch, MatchCommand } from "@/lib/online/types";
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
import { getAudioEngine } from "@/lib/audio-engine";
import { useMusic } from "@/hooks/use-music";
import { useOnlineMatch } from "@/hooks/use-online-match";
import { useGameWidgetLayout } from "@/hooks/use-game-widget-layout";
import { useOnlineAnalysis } from "@/hooks/use-online-analysis";
import { usePowerTargetingGesture } from "@/hooks/use-power-targeting-gesture";
import { createMatchPower, type MatchPowerKind } from "@/lib/chess-powers";
import { freezeApplicationError } from "@/lib/powered-chess";
import { formatEvaluation, rankedMoveLabelTone } from "@/lib/chess-evaluation";
import {
  ChessgroundBoard,
  PiecesSVG,
  type AnalysisArrow,
} from "../chessground-board";
import { MixerWidget } from "../mixer-widget";
import { SynthControlPanel } from "../synth-control-panel";
import { MusicVoiceReadout, MusicTransportReadout } from "../music-playback";
import {
  GameActionCostHint,
  GameActionRow,
  GameCityBackground,
  GameCityTitleIntro,
  GameWidgetEntranceStyles,
  GameFooter,
  GameWidgetConnections,
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
  const returnToGlobe = useCallback(async () => {
    const client = getOnlineClient();
    if (client && online.match?.state.result) {
      const { data: room, error } = await client.rpc("online_room", {
        p_action: "get",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (room?.match_id === matchId) {
        const { error: leaveError } = await client.rpc("online_room", {
          p_action: "leave",
          p_code: room.code,
        });
        if (leaveError) {
          toast.error(leaveError.message);
          return;
        }
      }
    }
    onBack();
  }, [online.match?.state.result, matchId, onBack]);
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
      onBack={() => void returnToGlobe()}
    />
  );
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
  const city =
    getCityById(match.context_city_id ?? match.members[0].city_id) ?? cities[0];
  const enemyCity = getCityById(opponent.city_id) ?? cities[0];
  const actionsKey = JSON.stringify(match.state.actions);
  const replay = useMemo(() => replayMatch(match.state), [actionsKey]); // Match versions also include non-position commands.
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
  const [playing, setPlaying] = useState(false);
  const [engineOn, setEngineOn] = useState(true);
  const [mixerOn, setMixerOn] = useState(false);
  const [paramsOn, setParamsOn] = useState(false);
  const [syncParams, setSyncParams] = useState(true);
  const [opponentOpen, setOpponentOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [introPhase, setIntroPhase] = useState(1);
  const intro = introPhase < 3;
  const [introExitStarted, setIntroExitStarted] = useState(false);
  const [showIntroBoxes, setShowIntroBoxes] = useState(true);
  const introRequested = useRef(false);
  const [openDropdown, setOpenDropdown] = useState<BoardDropdownId>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [spectrogramOn, setSpectrogramOn] = useState(false);
  const [codeBackdropOn, setCodeBackdropOn] = useState(false);
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
  const [fullscreen, setFullscreen] = useState(false);
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
  const queuedPieces = useRef(
    new Map<string, { instrument: Instrument; effects?: SquareEffects }>(),
  );
  const pieceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingPieces = useRef(false);
  const appliedRevisions = useRef(new Map<string, number>());
  const alive = useRef(true);
  const [saveEpoch, setSaveEpoch] = useState(0);
  const previousMoves = useRef(replay.game.history().length);
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
          const { error } = await client.functions.invoke("piece-params", {
            timeout: 20000,
            body: { matchId: match.id, pieceId, ...values },
          });
          if (error) throw error;
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
  }, [match.id]);
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
    getAudioEngine().playSeatbelt();
    setIntroExitStarted(true);
  }, []);
  useEffect(() => {
    const timer = setTimeout(beginIntroExit, 5000);
    return () => clearTimeout(timer);
  }, [beginIntroExit]);
  useEffect(() => {
    if (!introExitStarted) return;
    const boardTimer = setTimeout(() => setIntroPhase(2), 1000);
    const titleTimer = setTimeout(() => setShowIntroBoxes(false), 1500);
    const activeTimer = setTimeout(() => setIntroPhase(3), 4500);
    return () => {
      clearTimeout(boardTimer);
      clearTimeout(titleTimer);
      clearTimeout(activeTimer);
    };
  }, [introExitStarted]);
  useEffect(() => {
    const resize = () => {
      const width = window.innerWidth,
        height = window.innerHeight;
      const mobile =
        width <= Math.min(Math.max(0, height - 270), 512) + 16 ||
        (width <= 528 && height > width);
      setIsMobile(mobile);
      setIsPortraitMobile(mobile && height > width);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    const count = replay.game.history().length;
    if (count > previousMoves.current) setPlaying(true);
    previousMoves.current = count;
    setArmedPower(null);
  }, [actionsKey]);
  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
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
  const perform = useCallback(
    (command: MatchCommand) => {
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
    [online.send, replay.game, replay.powers, match.state.actions.length],
  );
  const gesture = usePowerTargetingGesture({
    armedPower,
    enabled: !intro && ownTurn && !disabled,
    boardRef,
    onArm: setArmedPower,
    canArm: () => ownTurn && !disabled,
    onBegin: () => music.endAudition(),
    onTarget: (square, power) => {
      perform({ kind: "power", power, square });
      setArmedPower(null);
    },
    onHover: (power) => getAudioEngine().playPowerHover(power),
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
              best: currentAnalysis.best
                .slice(0, 3)
                .map(({ uci, score, mate }) => ({ uci, score, mate })),
              worst: currentAnalysis.worst
                .slice(0, 3)
                .map(({ uci, score, mate }) => ({ uci, score, mate })),
            },
          }
        : {}),
    });
  };
  const canShowSuggestions =
    !disabled &&
    !replay.powers.length &&
    !arrows.length &&
    !!analysis.analysis?.complete;
  const show = (group: "best" | "worst") => {
    if (!canShowSuggestions || !analysis.analysis?.complete) return;
    const moves = analysis.analysis[group]
      .slice(0, 3)
      .map(({ uci, score, mate }) => ({ uci, score, mate }));
    perform({ kind: "suggest", group, moves, position });
    void getAudioEngine().playAnalysisWhistle(group === "best" ? "up" : "down");
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
  const locked = !!selected && syncParams && selected.color !== color;
  const result = match.state.result;
  const won = result?.winner === color;
  const currentEggs = match.state.eggs[color];
  const hasResult = !!result;
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
      spectrogram: {
        ref: spectrogramRef,
        on: spectrogramOn,
        position: spectrogramPosition,
        setPosition: setSpectrogramPosition,
      },
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
    musicEngineOn: engineOn,
    selectedSquare: selected?.square ?? null,
    orientation: color === "w" ? "white" : "black",
    introPhase,
    activeWidgetOrder,
    widgets: widgetDescriptors,
  });
  const toggles = [
    {
      id: "spectrogram",
      label: "Spectrogram",
      ref: spectrogramToggleRef,
      isOn: spectrogramOn,
      onToggle: () => toggleWidget("spectrogram", setSpectrogramOn),
      position: spectrogramPosition ?? { x: 0, y: 0 },
      onPositionChange: setSpectrogramPosition,
    },
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
    return (
      <>
        <SpectrogramWidget
          ref={spectrogramRef}
          handleRef={spectrogramHandleRef}
          toggleRef={spectrogramToggleRef}
          togglePortalized={portalized}
          cityColor={city.color}
          isOn={spectrogramOn}
          onToggle={() => toggleWidget("spectrogram", setSpectrogramOn)}
          isPlaying={engineOn && (playing || !!music.preview)}
          getFrequencyData={music.getFrequencyData}
          position={
            mobile ? undefined : (spectrogramPosition ?? { x: 0, y: 0 })
          }
          onPositionChange={setSpectrogramPosition}
          style={panelStyle("spectrogram")}
          onClickCapture={() => bringToFront("spectrogram")}
        />
        <SynthControlPanel
          ref={knobsRef}
          handleRef={knobsHandleRef}
          toggleRef={knobsToggleRef}
          togglePortalized={portalized}
          selectedSquare={selected?.square ?? null}
          selectedPieceInfo={music.instrument?.name ?? null}
          selectedPiece={selected}
          effects={
            selected
              ? (music.effects[selected.id] ?? DEFAULT_EFFECTS)
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
          readOnly={locked || !!result}
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
          isSolo={!!selected && music.soloIds.has(selected.id)}
          onSoloToggle={
            locked || result
              ? undefined
              : () => {
                  if (selected) {
                    const enabled = music.toggleSolo(selected.id);
                    if (enabled && engineOn) setPlaying(true);
                  }
                }
          }
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
          position={mobile ? undefined : (mixerPosition ?? { x: 0, y: 0 })}
          onPositionChange={setMixerPosition}
          style={panelStyle("mixer")}
          onClickCapture={() => bringToFront("mixer")}
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
  const headerButtonClass =
    "hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black transition-all";
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
              : "Opponent’s turn";
  const captured = replay.game
    .history({ verbose: true })
    .filter((move) => move.captured);

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
      {codeBackdropOn && introPhase === 3 && (
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
          />
        </div>
      )}
      <header
        className={cn(
          "top-0 left-0 w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 md:px-6 py-3 border-b border-transparent bg-transparent transition-opacity duration-1000 pointer-events-none",
          intro ? "z-[110]" : "z-[130]",
          isMobile ? "relative shrink-0" : "absolute",
        )}
      >
        <div
          className={cn(
            "flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold leading-none tracking-[0.025em] sm:text-xs md:w-auto md:flex-1 md:text-sm pointer-events-none transition-opacity duration-500",
            intro ? "opacity-0" : "opacity-100",
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
        <div
          className={cn(
            "ml-auto flex min-w-0 items-center gap-2 md:gap-3 pointer-events-auto",
            intro && "relative z-[111]",
          )}
        >
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
                "min-w-0 max-w-[calc(100vw-216px)] sm:max-w-60 bg-transparent",
                headerButtonClass,
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
              <Button
                variant="outline"
                size="icon"
                className={headerButtonClass}
                title="View code / Debug"
                aria-label={
                  codeBackdropOn
                    ? "Ocultar código Strudel e widget Debug"
                    : "Mostrar código Strudel e widget Debug"
                }
                aria-pressed={codeBackdropOn}
                onClick={() => {
                  setCodeBackdropOn(!codeBackdropOn);
                  if (codeBackdropOn) {
                    setLiveCodeOn(false);
                    setPieceDebugOn(false);
                  }
                }}
              >
                <Code2
                  className={cn("w-4 h-4", !codeBackdropOn && "opacity-60")}
                />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={headerButtonClass}
                title={engineOn ? "Desligar música" : "Ligar música"}
                aria-label={
                  engineOn
                    ? "Desligar música generativa"
                    : "Ligar música generativa"
                }
                aria-pressed={engineOn}
                onClick={toggleEngine}
              >
                <Music2 className={cn("w-4 h-4", !engineOn && "opacity-35")} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={headerButtonClass}
                title={fullscreen ? "Restaurar" : "Maximizar"}
                aria-label={
                  fullscreen ? "Restaurar janela" : "Maximizar janela"
                }
                onClick={() => {
                  void (
                    fullscreen
                      ? document.exitFullscreen()
                      : document.documentElement.requestFullscreen()
                  ).catch(() => toast.error("Fullscreen unavailable"));
                }}
              >
                {fullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "shrink-0 text-[var(--city-neon)]",
              headerButtonClass,
            )}
            aria-label="Voltar ao mapa"
            title="Voltar ao mapa"
            onClick={() => (result ? onBack() : setExitOpen(true))}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <circle cx="12" cy="12" r="9" />
              <g stroke="none">
                <circle cx="7.3" cy="8" r="1.3" fill="#38bdf8" />
                <circle cx="15.8" cy="7.2" r="1.3" fill="#f472b6" />
                <circle cx="11.4" cy="12.5" r="1.3" fill="#fbbf24" />
                <circle cx="16.4" cy="15.5" r="1.3" fill="#a78bfa" />
                <circle cx="8.4" cy="17.2" r="1.3" fill="#4ade80" />
              </g>
            </svg>
          </Button>
        </div>
      </header>
      <div
        className={cn(
          "relative z-10 w-full flex flex-col lg:block justify-start pointer-events-none",
          isMobile ? "shrink-0 min-h-full pb-16 pt-4" : "h-full pt-4 lg:pt-0",
        )}
        style={
          {
            "--game-board-width": isMobile
              ? "min(calc(100vw - 16px),512px)"
              : "min(90vw,calc(100dvh - 270px),512px)",
          } as React.CSSProperties
        }
      >
        <section
          className="flex flex-col items-center justify-start w-full lg:max-w-[512px] mx-auto relative z-10 px-2 pointer-events-none lg:pt-6"
          style={{ marginTop: !isMobile ? "calc(50vh - 350px)" : "0px" }}
        >
          <div
            className={cn(
              "mb-[30px] grid w-[var(--game-board-width)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 pointer-events-none transition-opacity duration-1000",
              intro ? "opacity-0" : "opacity-100",
            )}
          >
            <div
              role="img"
              aria-label={`${match.state.eggs[opponent.color]} golden egg for the opponent`}
              className="flex w-fit items-center gap-1.5 rounded-md border border-zinc-500/20 bg-black/45 px-2 py-1 font-mono text-xs font-bold text-zinc-400/50"
            >
              <span>{match.state.eggs[opponent.color]}</span>
              <span
                aria-hidden="true"
                className="inline-block h-[19px] w-[15px] rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-[radial-gradient(circle_at_32%_25%,#fff8c4_0%,#facc15_43%,#b45309_100%)] opacity-40 grayscale"
              />
            </div>
            <div
              role="status"
              className="min-w-0 text-center text-[9px] sm:text-xs font-mono"
              style={{ color: replay.game.isCheck() ? "#ef4444" : city.color }}
            >
              {status}
            </div>
            <div
              role="img"
              aria-label={`${currentEggs} golden eggs for you`}
              className={cn(
                "ml-auto flex h-8 w-full max-w-14 min-w-0 items-center justify-center gap-1.5 rounded-md border bg-black/45 px-2 font-mono text-xs font-bold",
                currentEggs === 0
                  ? "border-red-500/80 text-red-400"
                  : "border-amber-400/50 text-amber-200",
              )}
            >
              <span>{currentEggs}</span>
              <span
                aria-hidden="true"
                className="inline-block h-[19px] w-[15px] rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-[radial-gradient(circle_at_32%_25%,#fff8c4_0%,#facc15_43%,#b45309_100%)] shadow-[0_0_8px_#fbbf24]"
              />
            </div>
          </div>
          <div
            className="min-h-[2rem] h-8 w-[var(--game-board-width)] flex justify-between items-center overflow-hidden"
            aria-label="Peças capturadas"
          >
            {[opponent.color, color].map((team) => (
              <div key={team} className="flex min-w-0 items-center gap-0.5">
                {captured
                  .filter((move) => move.color === team)
                  .map((move, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 shrink-0 opacity-90 p-0.5"
                      style={
                        team === color
                          ? {
                              filter: `drop-shadow(1px 0 0 ${city.color}) drop-shadow(-1px 0 0 ${city.color}) drop-shadow(0 1px 0 ${city.color}) drop-shadow(0 -1px 0 ${city.color})`,
                            }
                          : undefined
                      }
                      dangerouslySetInnerHTML={{
                        __html:
                          PiecesSVG[
                            `${team === "w" ? "b" : "w"}${move.captured!.toUpperCase()}` as keyof typeof PiecesSVG
                          ],
                      }}
                    />
                  ))}
              </div>
            ))}
          </div>
          <div
            ref={boardRef}
            className="w-[var(--game-board-width)] aspect-square relative z-20 mb-2 sm:mb-4 pointer-events-auto"
            style={{ visibility: introPhase < 2 ? "hidden" : "visible" }}
          >
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
              armedPower={armedPower}
              matchPowers={movePreview?.powers ?? replay.powers}
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
                if (piece) music.togglePiece(square);
              }}
              onShieldCaptureBlocked={() =>
                toast.info("Shield prevents this capture")
              }
              musicEffectsEnabled={engineOn}
              musicPulseMonitor={music.pulseMonitor}
              synthSelectedSquare={selected?.square as Square | undefined}
              activeSquares={music.activeSquares}
              analysisArrows={movePreview ? [] : arrows}
              showRankedMoveMarks={false}
            />
          </div>
          <GameActionRow visible={!intro}>
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
                  disabled={!canShowSuggestions}
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
                aria-label="Undo · costs 1 golden egg"
                {...costEvents("undo")}
                title="Undo · 1 golden egg"
                disabled={disabled || replay.game.history().length === 0}
                onClick={() => perform({ kind: "undo" })}
              >
                <GameActionCostHint
                  visible={hoveredCost === "undo"}
                  amount={1}
                />
                <Undo2 className="pointer-events-none absolute inset-0 m-auto h-7 w-7 sm:h-10 sm:w-10" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={centerButtonClass}
                style={{ backgroundColor: "var(--city-neon)20" }}
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause music" : "Play music"}
                disabled={!engineOn || !!result}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? (
                  <Pause className="w-7 h-7 sm:w-10 sm:h-10" />
                ) : (
                  <Play className="w-7 h-7 sm:w-10 sm:h-10" />
                )}
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
                  disabled={disabled || !ownTurn}
                  title={`${kind} · 3 golden eggs`}
                  aria-label={
                    kind === "freeze"
                      ? "Congele uma casa por uma rodada"
                      : "Proteja uma casa por uma rodada"
                  }
                  aria-pressed={armedPower === kind}
                  onPointerDown={(event) => {
                    hideCostHint();
                    gesture.onButtonPointerDown(kind, event);
                  }}
                  onLostPointerCapture={gesture.onLostPointerCapture}
                  onClick={(event) => {
                    hideCostHint();
                    gesture.onButtonClick(kind, event);
                  }}
                  className={cn(
                    "pointer-events-auto touch-none cursor-grab active:cursor-grabbing relative flex h-8 w-fit items-center gap-0.5 sm:gap-1 rounded-md border bg-black/55 px-1 sm:px-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    kind === "freeze"
                      ? "text-cyan-100 border-cyan-300/35 hover:bg-cyan-950/70"
                      : "text-sky-100 border-sky-300/35 hover:bg-sky-950/70",
                    armedPower === kind &&
                      (kind === "freeze"
                        ? "border-cyan-300 bg-cyan-900/70 shadow-[0_0_12px_#bcecff88]"
                        : "border-sky-300 bg-sky-900/70 shadow-[0_0_12px_#bcecff88]"),
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
          </GameActionRow>
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
      />
      <div className="hidden sm:flex fixed bottom-3 right-3 z-[50] pointer-events-auto items-center gap-2 bg-background/80 backdrop-blur-sm p-1.5 px-2.5 rounded-lg border border-border shadow-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <VersionChangelog />
      </div>
      <div className="flex sm:hidden fixed bottom-3 right-3 z-[50] pointer-events-auto items-center gap-1.5 bg-background/80 backdrop-blur-sm py-0.5 px-2 rounded border border-border/60 shadow-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <VersionChangelog />
      </div>

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
            <DialogTitle>Leave this match?</DialogTitle>
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
      <Dialog open={!!result}>
        <DialogContent className="z-[140] border-white/20 bg-[#101713] text-white">
          <DialogHeader>
            <DialogTitle>
              {won ? "You won!" : result?.winner ? "You lost" : "Draw"}
            </DialogTitle>
            <DialogDescription>
              {won
                ? `You took home ${currentEggs} golden eggs. Historical points +${currentEggs + match.state.collected[color]}.`
                : result?.reason === "resign"
                  ? "Match ended by resignation."
                  : "The match has ended."}
            </DialogDescription>
          </DialogHeader>
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
    </main>
  );
}
