"use client"

// The confirmation of a "Salvar no game": what changes (before → after), and Salvar / Cancelar. Above every panel.
import { useCallback, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { showValue, type SaveChange } from "@/lib/admin/save-diff"

type Ask = { changes: SaveChange[]; where: string; resolve: (ok: boolean) => void }

/** [ask, element]: ask(changes, where) opens the confirmation and resolves with the answer; render the element. */
export function useSaveConfirm(): [(changes: SaveChange[], where: string) => Promise<boolean>, React.ReactNode] {
  const [ask, setAsk] = useState<Ask | null>(null)
  const open = useRef<Ask | null>(null)
  const request = useCallback((changes: SaveChange[], where: string) => new Promise<boolean>(resolve => {
    const next = { changes, where, resolve }
    open.current = next
    setAsk(next)
  }), [])
  const answer = (ok: boolean) => { open.current?.resolve(ok); open.current = null; setAsk(null) }
  const node = ask && typeof document !== "undefined" ? createPortal(
    <div role="presentation" className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4" onPointerDown={e => { if (e.target === e.currentTarget) answer(false) }}>
      <div role="dialog" aria-modal="true" aria-label="Salvar no game" onKeyDown={e => { if (e.key === "Escape") answer(false) }}
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs text-[#d6e2d6] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm text-white">Salvar no game</h2>
          <p className="mt-1 text-[11px] text-[#8a9a8a]">{ask.where}</p>
        </div>
        {ask.changes.length ? (
          <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
            {ask.changes.map(c => (
              <li key={c.path.join("/")} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-white/5 py-1.5 last:border-0">
                <span className="min-w-0 break-words">{c.label}</span>
                <span className="whitespace-nowrap tabular-nums"><span className="text-[#8a9a8a]">{showValue(c.before)}</span> → <span className="text-amber-300">{showValue(c.after)}</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="px-4 py-4 text-[#8a9a8a]">Nada mudou em relação ao que o jogo usa.</p>}
        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button type="button" onClick={() => answer(false)} className="h-8 rounded border border-white/20 px-3 hover:border-primary">Cancelar</button>
          {ask.changes.length > 0 && <button type="button" autoFocus onClick={() => answer(true)} className="h-8 rounded border border-primary/60 bg-primary/10 px-3 hover:bg-primary/25">Salvar {ask.changes.length} {ask.changes.length === 1 ? "alteração" : "alterações"}</button>}
        </div>
      </div>
    </div>,
    document.body,
  ) : null
  return [request, node]
}
