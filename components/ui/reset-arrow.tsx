"use client"

// The small reset in front of a parameter that differs from the game's default (the rotating arrow): it takes only
// that parameter back to the default, where Reverter para o padrão takes the whole panel. Shown only while it differs.
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

export function ResetArrow({ onReset, className, label }: { onReset: () => void; className?: string; label?: string }) {
  const t = useT()
  return (
    <button type="button" aria-label={label ? t("Voltar {label} ao padrão", { label }) : t("Voltar ao padrão")} title={t("Voltar ao padrão")}
      onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onReset() }}
      className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-amber-300 hover:bg-white/10 hover:text-white", className)}>
      <RotateCcw className="h-3.5 w-3.5" />
    </button>
  )
}
