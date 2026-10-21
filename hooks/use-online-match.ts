"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playLobbyJoinSound } from "@/components/online/lobby-audio";
import { getOnlineClient } from "@/lib/online/client";
import type { MatchCommand, OnlineMatch } from "@/lib/online/types";
import { useOnline } from "@/components/online/online-provider";
import type { Instrument } from "@/lib/music/model";
import type { SquareEffects } from "@/lib/types";
import type { PendingMatchCommand } from "@/lib/online/pending-move";
/* global Response, crypto */

export interface SharedPiece {
  piece_id: string;
  instrument: Instrument;
  effects?: SquareEffects;
  revision: number;
}

// Set once the database rejects the revision-aware call (not yet migrated).
let fullPieceListOnly = false;

/** Ask only for pieces whose revision differs from the ones already held. */
async function loadPieceParams(client: NonNullable<ReturnType<typeof getOnlineClient>>, matchId: string, held: SharedPiece[]) {
  if (!fullPieceListOnly) {
    const known = Object.fromEntries(held.map((piece) => [piece.piece_id, piece.revision]));
    const result = await client.rpc("online_piece_params", { p_match_id: matchId, p_known: known });
    if (result.error?.code !== "PGRST202") return { ...result, delta: true };
    fullPieceListOnly = true;
  }
  return { ...(await client.rpc("online_piece_params", { p_match_id: matchId })), delta: false };
}

export function useOnlineMatch(matchId: string) {
  const { user, ensureGuest, refreshProfile, notify } = useOnline();
  const userId = user?.id ?? null;
  const [match, setMatch] = useState<OnlineMatch | null>(null);
  const [pieces, setPieces] = useState<SharedPiece[]>([]);
  const piecesRef = useRef<{ matchId: string; pieces: SharedPiece[] } | null>(null);
  const [connected, setConnected] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingMatchCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef(match);
  current.current = match;
  const paramsRevision = useRef<number | null>(null);
  const activeRequest = useRef(false);
  const settledProfileScope = useRef<string | null>(null);
  useEffect(() => {
    if (!match?.state.result || !userId) return;
    const scope = `${userId}:${match.id}`;
    if (settledProfileScope.current === scope) return;
    settledProfileScope.current = scope;
    void refreshProfile().catch(cause => {
      settledProfileScope.current = null;
      setError(String(cause.message ?? cause));
    });
  }, [match?.id, !!match?.state.result, userId, refreshProfile]);
  const localKey = userId ? `chickenchess:pending:${userId}:${matchId}` : null;
  const requestScope = useRef(localKey);
  requestScope.current = localKey;
  const loadSequence = useRef(0);
  const refresh = useCallback(async (options?: { match?: boolean; pieces?: boolean }) => {
    const client = getOnlineClient();
    if (!client) return;
    const loadMatch = options?.match ?? true;
    const loadPieces = options?.pieces ?? true;
    if (!loadMatch && !loadPieces) return;
    const sequence = ++loadSequence.current;
    // A delta is merged into the same snapshot whose revisions were sent.
    const held = piecesRef.current?.matchId === matchId ? piecesRef.current.pieces : [];
    const [gameResult, pieceResult] = await Promise.all([
      loadMatch ? client.rpc("get_online_match", { p_match_id: matchId }) : Promise.resolve(null),
      loadPieces ? loadPieceParams(client, matchId, held) : Promise.resolve(null),
    ]);
    if (sequence !== loadSequence.current) return;
    if (gameResult?.error) {
      setError(gameResult.error.message);
      return;
    }
    if (gameResult?.data) {
      const next = gameResult.data as OnlineMatch;
      const prev = current.current;
      if (!prev || next.id !== prev.id || next.version >= prev.version) {
        if (
          prev &&
          prev.id === next.id &&
          next.version > prev.version &&
          !next.state.result &&
          userId &&
          typeof document !== "undefined" &&
          document.visibilityState === "hidden"
        ) {
          const ownColor = next.members.find((m) => m.user_id === userId)?.color;
          const opponent = next.members.find((m) => m.user_id !== userId);
          const prevTurn = prev.state.actions.filter((a) => a.kind === "move").length % 2 === 0 ? "w" : "b";
          const nextTurn = next.state.actions.filter((a) => a.kind === "move").length % 2 === 0 ? "w" : "b";
          if (ownColor && prevTurn !== ownColor && nextTurn === ownColor) {
            playLobbyJoinSound();
            if (opponent?.profile.display_name) {
              notify(`Your turn against ${opponent.profile.display_name}.`);
            }
          }
        }
        current.current = next;
        setMatch(next);
      }
    }
    if (pieceResult && !pieceResult.error) {
      const changed = (pieceResult.data ?? []) as SharedPiece[];
      let nextPieces = changed;
      if (pieceResult.delta) {
        const merged = new Map(held.map((piece) => [piece.piece_id, piece]));
        for (const piece of changed) merged.set(piece.piece_id, piece);
        nextPieces = [...merged.values()].sort((a, b) => a.piece_id.localeCompare(b.piece_id));
      }
      if (!pieceResult.delta || changed.length || piecesRef.current?.matchId !== matchId) {
        piecesRef.current = { matchId, pieces: nextPieces };
        setPieces(nextPieces);
      }
      if (paramsRevision.current === null && nextPieces.length === 0) {
        paramsRevision.current = 0;
      }
    }
    setError(null);
  }, [matchId, userId, notify]);

  useEffect(() => {
    let disposed = false;
    if (!userId) {
      void ensureGuest().catch((e) => {
        if (!disposed) setError(String(e.message ?? e));
      });
      return () => {
        disposed = true;
      };
    }
    const client = getOnlineClient();
    if (!client) return;
    let hasSubscribedOnce = false;
    let isSubscribed = false;
    void refresh();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingOptions = { match: false, pieces: false };
    const scheduleRefresh = (options: { match?: boolean; pieces?: boolean } = { match: true, pieces: true }) => {
      pendingOptions = {
        match: pendingOptions.match || (options.match ?? true),
        pieces: pendingOptions.pieces || (options.pieces ?? true),
      };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const target = pendingOptions;
        pendingOptions = { match: false, pieces: false };
        void refresh(target);
      }, 80);
    };
    type MatchUpdateRecord = { version?: number; params_revision?: number };
    const applyUpdate = (record: MatchUpdateRecord | null | undefined) => {
      const nextVersion = typeof record?.version === "number" ? record.version : null;
      const nextParamsRev = typeof record?.params_revision === "number" ? record.params_revision : null;
      const needMatch = nextVersion === null || !current.current || nextVersion > current.current.version;
      const needPieces = nextParamsRev === null || paramsRevision.current === null || nextParamsRev !== paramsRevision.current;
      if (nextParamsRev !== null) paramsRevision.current = nextParamsRev;
      if (!needMatch && !needPieces) return;
      scheduleRefresh({ match: needMatch, pieces: needPieces });
    };
    // Reconnects happen often in background tabs. Read the two counters
    // first and download the match or pieces only when one of them moved.
    const catchUp = async () => {
      const { data, error: counterError } = await client
        .from("online_match_updates")
        .select("version,params_revision")
        .eq("match_id", matchId)
        .maybeSingle()
        .then((result) => result, () => ({ data: null, error: true }));
      if (disposed) return;
      if (counterError || !data) void refresh();
      else applyUpdate(data);
    };
    const channel = client
      .channel(`match:${matchId}`, {
        config: { private: true, presence: { key: userId }, postgres_changes_options: { wait: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "online_match_updates",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => applyUpdate((payload as { new?: MatchUpdateRecord } | undefined)?.new),
      )
      .on("presence", { event: "sync" }, () => {
        const opponent = current.current?.members.find(
          (m) => m.user_id !== userId,
        );
        setOpponentConnected(
          !!opponent && !!channel.presenceState()[opponent.user_id]?.length,
        );
      })
      .subscribe((status) => {
        if (disposed) return;
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          isSubscribed = true;
          void channel.track({ online: true });
          if (hasSubscribedOnce) void catchUp();
          hasSubscribedOnce = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          isSubscribed = false;
          setError("Connection lost. Reconnecting…");
        } else if (status === "CLOSED") {
          isSubscribed = false;
        }
      });
    const onReturn = () => {
      if (document.visibilityState === "visible" && !isSubscribed) void catchUp();
    };
    const onOnline = () => void catchUp();
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("online", onOnline);
    return () => {
      disposed = true;
      loadSequence.current++;
      if (timer) clearTimeout(timer);
      void client.removeChannel(channel);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("online", onOnline);
    };
  }, [userId, ensureGuest, matchId, refresh]);

  useEffect(() => {
    current.current = null;
    paramsRevision.current = null;
    setMatch(null);
    piecesRef.current = null;
    setPieces([]);
    setPending(null);
    setBusy(false);
    setOpponentConnected(false);
    setError(null);
    if (!localKey) return;
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) setPending(JSON.parse(saved));
    } catch {
      /* Session storage may be disabled. */
    }
  }, [localKey]);

  const execute = useCallback(
    async (request: PendingMatchCommand) => {
      if (activeRequest.current) return;
      const client = getOnlineClient();
      if (!client) throw new Error("Online is not configured");
      activeRequest.current = true;
      setBusy(true);
      setError(null);
      setPending(request);
      try { if (localKey) localStorage.setItem(localKey, JSON.stringify(request)); }
      catch { /* The in-memory command still retains the same retry ID. */ }
      const clearStored = () => {
        try { if (localKey) localStorage.removeItem(localKey); } catch { /* Storage unavailable. */ }
      };
      try {
        const response = await client.functions.invoke("match-command", {
          body: request,
          timeout: 20000,
        });
        if (response.error) {
          const context = response.error.context as Response | undefined;
          if (context?.json) {
            const detail = await context.json().catch(() => null);
            // A server failure may follow a successful commit. Keep its ID
            // for an exact retry; only a definitive 4xx rejection clears it.
            if (context.status >= 400 && context.status < 500) {
              if (requestScope.current === localKey) setPending(null);
              clearStored();
            }
            throw new Error(detail?.error ?? response.error.message);
          }
          throw response.error;
        }
        const next = response.data as OnlineMatch;
        clearStored();
        if (requestScope.current !== localKey) return next;
        if (
          next?.id &&
          (!current.current || next.id !== current.current.id || next.version >= current.current.version)
        ) {
          current.current = next;
          setMatch(next);
        }
        setPending(null);
        return next;
      } catch (e) {
        if (requestScope.current !== localKey) return;
        setError(
          e instanceof Error ? e.message : "Could not confirm this action",
        );
        void refresh({ match: true, pieces: false });
        throw e;
      } finally {
        activeRequest.current = false;
        if (requestScope.current === localKey) setBusy(false);
      }
    },
    [localKey, refresh],
  );

  const send = useCallback(
    (command: MatchCommand) => {
      if (pending)
        return Promise.reject(new Error("Retry the pending action first"));
      if (!current.current) return Promise.reject(new Error("Loading match"));
      return execute({
        matchId,
        commandId: crypto.randomUUID(),
        expectedVersion: current.current.version,
        command,
      });
    },
    [matchId, pending, execute],
  );

  return {
    match,
    pieces,
    connected,
    opponentConnected,
    busy,
    pending,
    error,
    refresh,
    send,
    retry: () => (pending ? execute(pending) : Promise.resolve(undefined)),
  };
}
