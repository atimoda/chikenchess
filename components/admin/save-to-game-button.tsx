"use client"

// "Salvar no game": shown only to admins; shows what changes and asks first, then writes a game defaults file
// through the local Admin and shows the result.
import { useEffect, useState } from "react"
import { SaveCancelled, watchAdminSession, withSaveConfirm } from "@/lib/admin/game-defaults-client"
import { useSaveConfirm } from "./save-confirm"
import { cn } from "@/lib/utils"

export function useIsAdmin() {
  const [admin, setAdmin] = useState(false)
  useEffect(() => watchAdminSession(setAdmin), [])
  return admin
}

export function SaveToGameButton({ path, save, className }: { path: string; save: () => Promise<void>; className?: string }) {
  const admin = useIsAdmin()
  const [state, setState] = useState<{ busy: boolean; message?: string; error?: boolean }>({ busy: false })
  // before writing, the changes against the file as the game has it now, to confirm
  const [confirm, confirmation] = useSaveConfirm()
  if (!admin) return null
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      {state.message && <span role="status" className={cn("min-w-0 text-[11px]", state.error ? "text-red-300" : "text-[#8a9a8a]")}>{state.message}</span>}
      <button
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
      >{state.busy ? "Salvando…" : "Salvar no game"}</button>
      {confirmation}
    </span>
  )
}
