"use client";

import { useEffect, useRef, useState } from "react";
import type { Chess } from "chess.js";
import type { MatchPower } from "@/lib/chess-powers";
import {
  ChessEvaluationQueue,
  STOCKFISH_WORKER_URL,
  type ChessMoveAnalysis,
} from "@/lib/chess-evaluation";
import { analyzePoweredMovesInWorker } from "@/lib/powered-analysis-client";
import { isConstrainedDevice } from "@/lib/performance";

export function useOnlineAnalysis(
  game: Chess,
  powers: MatchPower[],
  position: string,
) {
  const [analysis, setAnalysis] = useState<ChessMoveAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<ChessEvaluationQueue | null>(null);
  const latestFen = useRef(game.fen());
  latestFen.current = game.fen();
  const generation = useRef(0);

  useEffect(() => {
    const worker = new Worker(STOCKFISH_WORKER_URL);
    const receive = (value: ChessMoveAnalysis | null) => {
      if (value?.complete && value.fen === latestFen.current)
        setAnalysis(value);
    };
    const engine = new ChessEvaluationQueue(
      worker,
      {
        onBusy: setBusy,
        onScore: () => {},
        onMove: () => {},
        onAnalysis: receive,
        onProgress: receive,
        onError: setError,
      },
      isConstrainedDevice(),
    );
    queue.current = engine;
    worker.onmessage = (event) => engine.handleMessage(String(event.data));
    worker.onerror = () => engine.fail();
    engine.initialize();
    return () => {
      generation.current++;
      engine.reset();
      worker.terminate();
      queue.current = null;
    };
  }, []);

  useEffect(() => {
    const sequence = ++generation.current;
    setAnalysis(null);
    setError(null);
    if (game.isGameOver()) {
      queue.current?.reset();
      setBusy(false);
      return;
    }
    if (powers.length) {
      queue.current?.reset();
      setBusy(true);
      void analyzePoweredMovesInWorker(
        game,
        powers,
        () => sequence !== generation.current,
      )
        .then((result) => {
          if (sequence !== generation.current) return;
          setAnalysis(result);
          setBusy(false);
        })
        .catch((e) => {
          if (sequence === generation.current) {
            setError(String(e.message ?? e));
            setBusy(false);
          }
        });
    } else {
      const moves = game
        .moves({ verbose: true })
        .map((m) => ({
          uci: `${m.from}${m.to}${m.promotion ?? ""}`,
          san: m.san,
        }));
      queue.current?.request(game.fen(), game.turn(), moves);
    }
    return () => {
      generation.current++;
      queue.current?.reset();
    };
  }, [game, position, powers]);
  return {
    analysis: analysis?.fen === game.fen() ? analysis : null,
    busy,
    error,
  };
}
