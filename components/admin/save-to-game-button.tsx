"use client"

// "Salvar no game": shown only to admins; shows what changes and asks first, then saves the game's default in
// Supabase (lib/game-defaults.ts), which counts at once for everyone. With onRevert, "Reverter para o padrão" comes
// first, for everyone. With part, "Versões" (admin) lists the last saved versions and brings one back.
import { useEffect, useState } from "react"
import { SaveCancelled, gameDefaultVersions, restoreGameDefault, watchAdminSession, withSaveConfirm, type GameDefaultVersion } from "@/lib/admin/game-defaults-client"
import type { GameDefaultPart } from "@/lib/game-defaults"
import { useSaveConfirm } from "./save-confirm"
import { cn } from "@/lib/utils"

export function useIsAdmin() {
  const [admin, setAdmin] = useState(false)
  useEffect(() => watchAdminSession(setAdmin), [])
  return admin
}

// "Reverter para o padrão": every panel with Salvar no game ends with it, just left of Salvar no game, for everyone
// (Salvar no game only shows to admins). It takes the whole panel back to what the game has, so a Salvar no game
// right after it has nothing to write: every new field of a panel must go back with it too (AGENTS.md).
export function RevertToDefaultButton({ onRevert, disabled }: { onRevert: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onRevert} title="Volta todos os valores deste painel para o padrão do jogo"
      className="h-8 rounded border border-white/20 px-3 text-xs transition-colors hover:border-primary disabled:opacity-45 disabled:hover:border-white/20">Reverter para o padrão</button>
  )
}

const when = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

/** "Versões" (admin): the saved versions of a default, newest first; picking an older one brings it back (asking
 *  first, like Salvar no game). list/restore: how to read them and bring one back. */
export function VersionsButton({ list, restore, onDone, disabled }: {
  list: () => Promise<GameDefaultVersion[]>; restore: (id: number) => Promise<void>; onDone?: (message: string, error?: boolean) => void; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<GameDefaultVersion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    let live = true
    setVersions(null); setError(null)
    list().then(v => { if (live) setVersions(v) }, (e: Error) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [open, list])
  return (
    <span className="relative">
      <button type="button" disabled={disabled} aria-expanded={open} onClick={() => setOpen(v => !v)} title="Versões salvas no game (as 50 últimas)"
        className="h-8 rounded border border-white/20 px-3 text-xs transition-colors hover:border-primary disabled:opacity-45">Versões</button>
      {open && (
        <div role="menu" className="absolute bottom-full right-0 z-50 mb-1 max-h-64 w-56 overflow-y-auto rounded-md border border-white/15 bg-[#0c120f] py-1 text-[11px] shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          {error && <p className="px-3 py-1.5 text-red-300">{error}</p>}
          {!error && !versions && <p className="px-3 py-1.5 text-[#8a9a8a]">Carregando…</p>}
          {versions?.length === 0 && <p className="px-3 py-1.5 text-[#8a9a8a]">Nada salvo no game ainda.</p>}
          {versions?.map((v, i) => (
            <button key={v.id} type="button" role="menuitem" disabled={i === 0}
              onClick={() => {
                setOpen(false)
                restore(v.id).then(() => onDone?.(`Versão ${v.revision} de volta no game.`),
                  (e: Error) => { if (!(e instanceof SaveCancelled)) onDone?.(e.message, true) })
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-white/10 disabled:cursor-default disabled:hover:bg-transparent">
              <span className="tabular-nums">{when(v.updatedAt)}{v.by ? ` · ${v.by}` : ""}</span>
              <span className="shrink-0 text-[#8a9a8a]">{i === 0 ? "atual" : `v${v.revision}`}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

const WHERE = "Grava o padrão do game: vale na hora para todo mundo, em qualquer endereço."

// "Salvar no Pátio", just left of Salvar no game: the panel's values that differ from the game's default become the
// open Pátio's own (lib/pigchicken/patio-tuning.ts); the rest keeps following the game. Shown to everyone, it only
// works for whoever may edit the Pátio (its creator, a player its owner allowed, the admin), and when there is
// something to save.
export type SaveToPatio = { save: () => void; canSave: boolean; changed: boolean }
export function SaveToPatioButton({ patio, disabled }: { patio: SaveToPatio; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled || !patio.canSave || !patio.changed} onClick={patio.save}
      title={patio.canSave ? "Grava no Pátio aberto só os valores diferentes do padrão do game" : "Só quem pode editar este Pátio salva nele"}
      className="h-8 rounded border border-[#ffd166]/60 px-3 text-xs text-[#ffd166] transition-colors hover:bg-[#ffd166]/15 disabled:opacity-45 disabled:hover:bg-transparent">Salvar no Pátio</button>
  )
}

export function SaveToGameButton({ part, save, onRevert, revertDisabled, patio, className }: {
  part?: GameDefaultPart; save: () => Promise<void>; onRevert?: () => void; revertDisabled?: boolean; patio?: SaveToPatio; className?: string
}) {
  const admin = useIsAdmin()
  const [state, setState] = useState<{ busy: boolean; message?: string; error?: boolean }>({ busy: false })
  // before writing, the changes against the game's default as it is now, to confirm
  const [confirm, confirmation] = useSaveConfirm()
  const run = (task: () => Promise<void>, done: string) => {
    setState({ busy: true })
    withSaveConfirm(changes => confirm(changes, WHERE), task).then(
      () => setState({ busy: false, message: done }),
      (error: Error) => setState(error instanceof SaveCancelled ? { busy: false } : { busy: false, message: error.message, error: true }),
    )
  }
  const [list] = useState(() => () => part ? gameDefaultVersions(part) : Promise.resolve([]))
  if (!admin && !onRevert && !patio) return null
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      {state.message && <span role="status" className={cn("min-w-0 text-[11px]", state.error ? "text-red-300" : "text-[#8a9a8a]")}>{state.message}</span>}
      {onRevert && <RevertToDefaultButton onRevert={() => { onRevert(); setState({ busy: false }) }} disabled={revertDisabled || state.busy} />}
      {admin && part && <VersionsButton list={list} disabled={state.busy}
        restore={id => new Promise<void>((resolve, reject) => {
          setState({ busy: true })
          withSaveConfirm(changes => confirm(changes, WHERE), () => restoreGameDefault(part, id)).then(
            () => { setState({ busy: false, message: "Versão de volta no game." }); resolve() },
            (error: Error) => { setState(error instanceof SaveCancelled ? { busy: false } : { busy: false, message: error.message, error: true }); reject(error) },
          )
        })} />}
      {patio && <SaveToPatioButton patio={patio} disabled={state.busy} />}
      {admin && <button
        type="button" disabled={state.busy}
        title="Grava o padrão do game: vale na hora para todo mundo"
        onClick={() => run(save, "Salvo no game. Já vale para todo mundo.")}
        className="h-8 rounded border border-primary/60 bg-primary/10 px-3 text-xs transition-colors hover:bg-primary/25 disabled:opacity-50"
      >{state.busy ? "Salvando…" : "Salvar no game"}</button>}
      {confirmation}
    </span>
  )
}
