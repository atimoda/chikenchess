"use client"

import { useSyncExternalStore } from "react"
import { msg, useT } from "@/lib/i18n"
import {
  getQuality, getServerQuality, QUALITY_LABELS, qualityLevels, setQualityAuto, setQualityLevel, subscribeQuality,
  type GraphicsLevel, type QualityKind,
} from "@/lib/quality"

export const useQuality = () => useSyncExternalStore(subscribeQuality, getQuality, getServerQuality)

const KINDS: { kind: QualityKind; label: string }[] = [
  { kind: "graphics", label: msg("Qualidade e efeitos gráficos") },
  { kind: "sound", label: msg("Qualidade e efeitos sonoros") },
]

/** The two quality levels and "Ajustar automaticamente", the same rows in Preferências and in the Pátio's Camadas. */
export function QualityFields({ rowClassName, selectClassName, checkboxClassName }: { rowClassName: string; selectClassName: string; checkboxClassName: string }) {
  const quality = useQuality()
  const t = useT()
  return <>
    {KINDS.map(({ kind, label }) => (
      <label key={kind} className={rowClassName}>
        <span>{t(label)}</span>
        <select value={quality[kind]} onChange={e => setQualityLevel(kind, e.target.value as GraphicsLevel)} className={selectClassName}>
          {qualityLevels(kind).map(level => <option key={level} value={level}>{t(QUALITY_LABELS[level])}</option>)}
        </select>
      </label>
    ))}
    <label className={rowClassName}>
      <span>{t("Ajustar automaticamente")}</span>
      <input type="checkbox" checked={quality.auto} onChange={e => setQualityAuto(e.target.checked)} className={checkboxClassName} />
    </label>
  </>
}

export function QualityPreferences() {
  return <div className="grid gap-2 border-t border-border/40 px-2 py-2 text-sm">
    <QualityFields rowClassName="flex cursor-pointer items-center justify-between gap-5"
      selectClassName="rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-sm" checkboxClassName="size-4 accent-primary" />
  </div>
}
