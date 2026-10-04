"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOnlineClient } from "@/lib/online/client";
import type { MatchCommand, OnlineMatch } from "@/lib/online/types";
import { useOnline } from "@/components/online/online-provider";
import type { Instrument } from "@/lib/music/model";
import type { SquareEffects } from "@/lib/types";
/* global Response, crypto */

export interface SharedPiece {
  piece_id: string;
  instrument: Instrument;
  effects?: SquareEffects;
  revision: number;
}
interface PendingCommand {
  matchId: string;
  commandId: string;
  expectedVersion: number;
  command: MatchCommand;
}

export function useOnlineMatch(matchId: string) {
  const { user, ensureGuest, refreshProfile } = useOnline();
  const [match, setMatch] = useState<OnlineMatch | null>(null);
  const [pieces, setPieces] = useState<SharedPiece[]>([]);
  const [connected, setConnected] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef(match);
  current.current = match;
  const activeRequest = useRef(false);
  const localKey = user ? `chickenchess:pending:${user.id}:${matchId}` : null;
  const requestScope = useRef(localKey);
  requestScope.current = localKey;
  const loadSequence = useRef(0);
  const refresh = useCallback(async () => {
    const client = getOnlineClient();
    if (!client) return;
    const sequence = ++loadSequence.current;
    const [gameResult, pieceResult] = await Promise.all([
      client.rpc("get_online_match", { p_match_id: matchId }),
      client.rpc("online_piece_params", { p_match_id: matchId }),
    ]);
    if (sequence !== loadSequence.current) return;
    if (gameResult.error) {
      setError(gameResult.error.message);
      return;
    }
    const next = gameResult.data as OnlineMatch;
    if (next && (!current.current || next.id !== current.current.id || next.version >= current.current.version)) {
      current.current = next;
      setMatch(next);
    }
    if (!pieceResult.error) setPieces(pieceResult.data ?? []);
    setError(null);
  }, [matchId]);

  useEffect(() => {
    let disposed = false;
    if (!user) {
      void ensureGuest().catch((e) => {
        if (!disposed) setError(String(e.message ?? e));
      });
      return () => {
        disposed = true;
      };
    }
    const client = getOnlineClient();
    if (!client) return;
    void refresh();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 80);
    };
    const channel = client
      .channel(`match:${matchId}`, {
        config: { private: true, presence: { key: user.id }, postgres_changes_options: { wait: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "online_match_updates",
          filter: `match_id=eq.${matchId}`,
        },
        scheduleRefresh,
      )
      .on("presence", { event: "sync" }, () => {
        const opponent = current.current?.members.find(
          (m) => m.user_id !== user.id,
        );
        setOpponentConnected(
          !!opponent && !!channel.presenceState()[opponent.user_id]?.length,
        );
      })
      .subscribe((status) => {
        if (disposed) return;
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          void channel.track({ online: true });
          void refresh();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setError("Connection lost. Reconnecting…");
      });
    const onReturn = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("online", refresh);
    return () => {
      disposed = true;
      loadSequence.current++;
      if (timer) clearTimeout(timer);
      void client.removeChannel(channel);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("online", refresh);
    };
  }, [user, ensureGuest, matchId, refresh]);

  useEffect(() => {
    current.current = null;
    setMatch(null);
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
    async (request: PendingCommand) => {
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
        void refresh();
        if (next?.state.result) void refreshProfile();
        return next;
      } catch (e) {
        if (requestScope.current !== localKey) return;
        setError(
          e instanceof Error ? e.message : "Could not confirm this action",
        );
        void refresh();
        throw e;
      } finally {
        activeRequest.current = false;
        if (requestScope.current === localKey) setBusy(false);
      }
    },
    [localKey, refresh, refreshProfile],
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
