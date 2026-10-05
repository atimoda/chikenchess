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
import type { MatchState } from "@/lib/online/types";

export function useOnlineAnalysis(
  game: Chess,
  powers: MatchPower[],
  position: string,
  result: MatchState["result"] = null,
) {
  const [analysis, setAnalysis] = useState<ChessMoveAnalysis | null>(null);
  const [evaluation, setEvaluation] = useState<{
    score: number | null;
    mate: number | null;
  }>({ score: null, mate: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<ChessEvaluationQueue | null>(null);
  const fen = game.fen();
  const latest = useRef({ game, powers, position, result, fen });
  latest.current = { game, powers, position, result, fen };
  const generation = useRef(0);
  const request = useRef<{
    input: typeof latest.current;
    sequence: number;
  } | null>(null);
  const analysisRequest = useRef<typeof request.current>(null);

  const isCurrent = (value: typeof request.current) =>
    value !== null &&
    value.sequence === generation.current &&
    value.input.game === latest.current.game &&
    value.input.powers === latest.current.powers &&
    value.input.position === latest.current.position &&
    value.input.result === latest.current.result &&
    value.input.fen === latest.current.fen;

  useEffect(() => {
    const worker = new Worker(STOCKFISH_WORKER_URL);
    const isCurrentStockfish = () =>
      isCurrent(request.current) && !request.current?.input.powers.length &&
      !request.current?.input.result;
    const receive = (value: ChessMoveAnalysis | null) => {
      if (!isCurrentStockfish()) return;
      if (value === null) {
        analysisRequest.current = null;
        setAnalysis(null);
      } else if (value.complete && value.fen === latest.current.fen) {
        analysisRequest.current = request.current;
        setAnalysis(value);
      }
    };
    const engine = new ChessEvaluationQueue(
      worker,
      {
        onBusy: (value) => {
          if (isCurrentStockfish()) setBusy(value);
        },
        onScore: (score, mate) => {
          if (!isCurrentStockfish()) return;
          setEvaluation({ score, mate });
          setError(null);
        },
        onMove: () => {},
        onAnalysis: receive,
        onProgress: receive,
        onError: (message) => {
          if (!isCurrentStockfish()) return;
          setError(message);
          setEvaluation({ score: null, mate: null });
        },
      },
      isConstrainedDevice(),
    );
    queue.current = engine;
    worker.onmessage = (event) => engine.handleMessage(String(event.data));
    worker.onerror = () => engine.fail();
    engine.initialize();
    return () => {
      generation.current++;
      request.current = null;
      engine.reset();
      worker.terminate();
      queue.current = null;
    };
  }, []);

  useEffect(() => {
    const sequence = ++generation.current;
    const currentRequest = { input: latest.current, sequence };
    request.current = currentRequest;
    analysisRequest.current = null;
    setAnalysis(null);
    setError(null);
    if (result || game.isGameOver()) {
      queue.current?.reset();
      const checkmate = result ? result.reason === "checkmate" : game.isCheckmate();
      const winner = result ? result.winner : checkmate ? (game.turn() === "w" ? "b" : "w") : null;
      setEvaluation({
        score: winner === null ? 0 : winner === "w" ? 100000 : -100000,
        mate: checkmate ? 0 : null,
      });
      setBusy(false);
      return;
    }
    if (powers.length) {
      queue.current?.reset();
      setBusy(true);
      void analyzePoweredMovesInWorker(
        game,
        powers,
        () => !isCurrent(currentRequest),
      )
        .then((result) => {
          if (!isCurrent(currentRequest)) return;
          if (result?.complete && result.fen === latest.current.fen) {
            analysisRequest.current = currentRequest;
            setAnalysis(result);
            const best = result.best[0];
            const sign = result.side === "w" ? 1 : -1;
            setEvaluation({
              score: (best?.score ?? 0) * sign,
              mate: best?.mate == null ? null : best.mate * sign,
            });
          }
          setBusy(false);
        })
        .catch((e) => {
          if (isCurrent(currentRequest)) {
            setError(String(e.message ?? e));
            setEvaluation({ score: null, mate: null });
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
      request.current = null;
      queue.current?.reset();
    };
  }, [game, position, powers, result]);
  return {
    analysis: analysis?.complete && analysis.fen === fen && isCurrent(analysisRequest.current) ? analysis : null,
    score: evaluation.score,
    mate: evaluation.mate,
    busy,
    error,
  };
}
