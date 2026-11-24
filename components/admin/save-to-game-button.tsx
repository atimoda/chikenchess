"use client"

// "Salvar no game": shown only to admins; shows what changes and asks first, then writes a game defaults file
// through the local Admin and shows the result. With onRevert, "Reverter para o padrão" comes first, for everyone.
import { useEffect, useState } from "react"
import { SaveCancelled, watchAdminSession, withSaveConfirm } from "@/lib/admin/game-defaults-client"
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

export function SaveToGameButton({ path, save, onRevert, revertDisabled, className }: {
  path: string; save: () => Promise<void>; onRevert?: () => void; revertDisabled?: boolean; className?: string
}) {
  const admin = useIsAdmin()
  const [state, setState] = useState<{ busy: boolean; message?: string; error?: boolean }>({ busy: false })
  // before writing, the changes against the file as the game has it now, to confirm
  const [confirm, confirmation] = useSaveConfirm()
  if (!admin && !onRevert) return null
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      {state.message && <span role="status" className={cn("min-w-0 text-[11px]", state.error ? "text-red-300" : "text-[#8a9a8a]")}>{state.message}</span>}
      {onRevert && <RevertToDefaultButton onRevert={() => { onRevert(); setState({ busy: false }) }} disabled={revertDisabled || state.busy} />}
      {admin && <button
        type="button" disabled={state.busy}
        title={`Grava em ${path} (Admin local); publique com commit e deploy`}
        onClick={() => {
          setState({ busy: true })
          withSaveConfirm(changes => confirm(changes, `Grava em ${path}. Para publicar, faça commit e deploy.`), save).then(
            () => setState({ busy: false, message: `Salvo em ${path}. Faça commit e deploy para publicar.` }),
            (error: Error) => setState(error instanceof SaveCancelled ? { busy: false } : { busy: false, message: error.message, error: true }),
          )
        }}
        className="h-8 rounded border border-primary/60 bg-primary/10 px-3 text-xs transition-colors hover:bg-primary/25 disabled:opacity-50"
      >{state.busy ? "Salvando…" : "Salvar no game"}</button>}
      {confirmation}
    </span>
  )
}
