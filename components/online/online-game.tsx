"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Move, Square } from "chess.js";
import {
  Globe2,
  LockKeyhole,
  Pause,
  Play,
  Power,
  Shield,
  Snowflake,
  Undo2,
  Redo2,
  Maximize,
  Minimize,
  Music2,
} from "lucide-react";
import { toast } from "sonner";
import { getCityById, cities } from "@/lib/cities-data";
import { replayMatch, matchPosition } from "@/lib/online/domain";
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
      const { data: room, error } = await client.rpc('online_room', { p_action: 'get' });
      if (error) { toast.error(error.message); return }
      if (room?.match_id === matchId) {
        const { error: leaveError } = await client.rpc('online_room', { p_action: 'leave', p_code: room.code });
        if (leaveError) { toast.error(leaveError.message); return }
      }
    }
    onBack();
  }, [online.match?.state.result, matchId, onBack]);
  useEffect(() => {
    if (online.match?.rematch_id) onMatch(online.match.rematch_id);
  }, [online.match?.rematch_id, onMatch]);
  if (!online.match || !user || !online.match.members.some(m => m.user_id === user.id))
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
  const city = getCityById(me.city_id) ?? cities[0];
  const enemyCity = getCityById(opponent.city_id) ?? cities[0];
  const actionsKey = JSON.stringify(match.state.actions);
  const replay = useMemo(() => replayMatch(match.state), [actionsKey]); // Match versions also include non-position commands.
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
  const [mixerOn, setMixerOn] = useState(true);
  const [paramsOn, setParamsOn] = useState(true);
  const [syncParams, setSyncParams] = useState(true);
  const [opponentOpen, setOpponentOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [intro, setIntro] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [armedPower, setArmedPower] = useState<MatchPowerKind | null>(null);
  const [global, setGlobal] = useState<GlobalEffects>(() => ({
    ...DEFAULT_GLOBAL_EFFECTS,
    bpm: kit.bpm,
    volume: kit.volume,
  }));
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
      if (alive.current) setPieceSaveError("Piece changes have not been saved. Retry to share them.");
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
    false,
    engineOn,
    replay.positions,
    {
      initialKit: kit,
      canEditPiece: (id) =>
        !match.state.result && (id.startsWith(`${color}:`) || !syncParams),
      onPieceChange,
    },
  );
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
      else setPieceSaveError("A shared instrument is incompatible. Reload to get the latest game version.");
    }
  }, [online.pieces, syncParams, color, saveEpoch]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (pieceTimer.current) clearTimeout(pieceTimer.current);
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), 5000);
    return () => clearTimeout(timer);
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
  const analysis = useOnlineAnalysis(replay.game, replay.powers, position);
  const ownTurn = replay.game.turn() === color && !match.state.result;
  const disabled =
    online.busy ||
    !!online.pending ||
    !online.connected ||
    !!match.state.result;
  const perform = useCallback(
    (command: MatchCommand) => {
      if (command.kind === "power" && command.power === "freeze") {
        const power = createMatchPower(command.power, command.square, replay.game, match.state.actions.length + 1);
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

  return (
    <main
      className="relative min-h-dvh bg-black pb-16 text-white"
      style={{ "--city-neon": city.color } as React.CSSProperties}
    >
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-25 grayscale"
        style={{ backgroundImage: `url(${city.image})` }}
      />
      {intro ? (
        <button
          className="absolute inset-0 z-50 flex min-h-dvh w-full flex-col items-center justify-center bg-black/20 p-8"
          onClick={() => setIntro(false)}
          aria-label="Enter online board"
        >
          <span
            className="text-center text-6xl font-bold"
            style={{ color: city.color, textShadow: "0 2px 10px black" }}
          >
            {city.year} {city.name}
          </span>
          <span className="mt-4 text-xl">{city.genre}</span>
        </button>
      ) : null}
      <header className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <h1
            className="font-mono text-lg uppercase"
            style={{ color: city.color }}
          >
            {city.year} {city.name}
          </h1>
          <p className="text-xs text-white/60">ChickenChess · 1v1 casual</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpponentOpen(true)}>
            <span
              className={`h-2 w-2 rounded-full ${online.opponentConnected ? "bg-green-400" : "bg-amber-400"}`}
            />
            {opponent.profile.display_name} ·{" "}
            {online.opponentConnected ? "Online" : "Disconnected"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Fullscreen"
            onClick={() => {
              if (fullscreen) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen();
            }}
          >
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Return to globe"
            onClick={() => (result ? onBack() : setExitOpen(true))}
          >
            <Globe2 />
          </Button>
        </div>
      </header>
      <div className="relative mx-auto grid max-w-[1500px] gap-5 px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="mx-auto w-full max-w-[min(76vh,760px)]">
          <div className="mb-3 flex items-center justify-between gap-2 font-mono text-xs">
            <span className="text-amber-300">
              🥚 {match.state.eggs[opponent.color]}
            </span>
            <span role="status">
              {online.busy
                ? "Confirming…"
                : !online.connected
                  ? "Reconnecting…"
                  : result
                    ? won
                      ? "You won!"
                      : result.winner
                        ? "You lost"
                        : "Draw"
                    : ownTurn
                      ? replay.game.isCheck()
                        ? "Your move · Check!"
                        : "Your move"
                      : "Opponent’s turn"}
            </span>
            <span className="text-amber-300">🥚 {currentEggs}</span>
          </div>
          <div ref={boardRef} className="aspect-square w-full">
            <ChessgroundBoard
              game={replay.game}
              cityColor={city.color}
              orientation={color === "w" ? "white" : "black"}
              playerColor={color}
              deferMoves
              movesDisabled={disabled || !ownTurn || intro}
              isThinking={online.busy}
              onMove={onMove}
              undoAnimationKey={match.version}
              armedPower={armedPower}
              matchPowers={replay.powers}
              onPowerTarget={(square) => {
                if (armedPower)
                  perform({ kind: "power", power: armedPower, square });
                setArmedPower(null);
              }}
              onBoardClick={(square) => music.select(square)}
              onPieceHold={(square) => {
                if (!armedPower && engineOn) music.audition(square);
              }}
              onDragOverSquare={(from, to) => {
                if (!armedPower && engineOn) music.audition(from, to);
              }}
              onPieceRelease={music.releaseAudition}
              onPieceCancel={music.endAudition}
              onPieceDoubleTap={(square) => {
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
              analysisArrows={arrows}
              showRankedMoveMarks={false}
              entranceActive={!intro}
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              title="Undo · 1 golden egg"
              disabled={
                disabled ||
                !match.state.actions.some(
                  (a) => a.kind === "move" && a.color === color,
                )
              }
              onClick={() => perform({ kind: "undo" })}
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </Button>
            <Button
              variant="outline"
              title="Redo · free"
              disabled={disabled || match.state.redo?.actor !== color}
              onClick={() => perform({ kind: "redo" })}
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </Button>
            <Button
              variant="outline"
              disabled={!canShowSuggestions}
              title="Best · 1 golden egg"
              onClick={() => show("best")}
            >
              Best
            </Button>
            <Button
              variant="outline"
              disabled={!canShowSuggestions}
              title="Worst · 1 golden egg"
              onClick={() => show("worst")}
            >
              Worst
            </Button>
            {(["freeze", "shield"] as const).map((kind) => (
              <Button
                key={kind}
                variant={armedPower === kind ? "default" : "outline"}
                disabled={disabled || !ownTurn}
                title={`${kind} · 3 golden eggs`}
                onPointerDown={(event) =>
                  gesture.onButtonPointerDown(kind, event)
                }
                onLostPointerCapture={gesture.onLostPointerCapture}
                onClick={(event) => gesture.onButtonClick(kind, event)}
              >
                {kind === "freeze" ? (
                  <Snowflake className="h-4 w-4" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {kind === "freeze" ? "Freeze" : "Shield"}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button
              variant="ghost"
              disabled={!engineOn || !!result}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {playing ? "Pause music" : "Play music"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                music.endAudition();
                setEngineOn((p) => !p);
              }}
            >
              <Power className="h-4 w-4" />
              Music {engineOn ? "on" : "off"}
            </Button>
            {engineOn ? (
              <>
                <Button variant="ghost" onClick={() => setMixerOn((p) => !p)}>
                  Mixer
                </Button>
                <Button variant="ghost" onClick={() => setParamsOn((p) => !p)}>
                  Piece Params
                </Button>
              </>
            ) : null}
          </div>
          {engineOn ? (
            <MusicTransportReadout
              monitor={music.monitor}
              arrangement={music.snapshot.arrangement}
            />
          ) : null}
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
        </section>
        <aside className="mx-auto w-full max-w-[420px] space-y-4">
          {engineOn && paramsOn ? (
            <div className="relative">
              <fieldset
                disabled={locked || !!result}
                className={locked ? "pointer-events-none opacity-40" : ""}
              >
                <SynthControlPanel
                  selectedSquare={selected?.square ?? null}
                  selectedPieceInfo={music.instrument?.name ?? null}
                  selectedPiece={selected}
                  effects={
                    selected
                      ? (music.effects?.[selected.id] ?? DEFAULT_EFFECTS)
                      : DEFAULT_EFFECTS
                  }
                  onEffectChange={music.setPieceEffect}
                  cityColor={city.color}
                  isOn
                  onToggle={() => setParamsOn(false)}
                  style={{ position: "static" }}
                  instrument={music.instrument}
                  onInstrumentChange={music.updateInstrument}
                  monitor={music.monitor}
                  monitorId={selected?.id}
                  pieceSvg={
                    selected
                      ? PiecesSVG[
                          `${selected.color}${selected.type.toUpperCase()}` as keyof typeof PiecesSVG
                        ]
                      : undefined
                  }
                  isSolo={!!selected && music.soloIds.has(selected.id)}
                  onSoloToggle={() => {
                    if (selected) music.toggleSolo(selected.id);
                  }}
                  playback={
                    selected ? (
                      <MusicVoiceReadout
                        monitor={music.monitor}
                        id={selected.id}
                        snapshot={music.snapshot}
                        instrument={music.instrument ?? undefined}
                        onInstrumentChange={music.updateInstrument}
                        variationTabs
                        knobUpdateMode="on-release"
                      />
                    ) : undefined
                  }
                />
              </fieldset>
              {locked ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                  <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/90 p-4">
                    <LockKeyhole className="h-5 w-5" />
                    Opponent’s Piece Params
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {engineOn && mixerOn ? (
            <MixerWidget
              teamMixes={music.teamMixes}
              monitor={music.monitor}
              effects={global}
              onEffectChange={(key, value) =>
                setGlobal((g) => ({ ...g, [key]: value }))
              }
              topColor={opponent.color}
              onTeamMixChange={music.updateTeamMix}
              cityColor={city.color}
              sessionId={match.id}
              isOn
              onToggle={() => setMixerOn(false)}
              style={{ position: "static" }}
            />
          ) : null}
        </aside>
      </div>
      <footer className="fixed bottom-0 left-0 right-0 flex min-h-10 items-center gap-4 bg-black/80 px-4 py-2 text-xs">
        <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono">
          {replay.game
            .history()
            .map(
              (san, i) =>
                `${i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}${san}`,
            )
            .join(" ")}
        </span>
        <VersionChangelog />
      </footer>
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
        <DialogContent className="border-white/20 bg-[#101713] text-white">
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
        <DialogContent className="border-white/20 bg-[#101713] text-white">
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
        <DialogContent className="border-white/20 bg-[#101713] text-white">
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
        <DialogContent className="border-white/20 bg-[#101713] text-white">
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
