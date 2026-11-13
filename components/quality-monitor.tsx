"use client"

// Mounted once in the root layout: "Ajustar automaticamente" (lib/quality-monitor.ts) on every screen.
import { useEffect } from "react"
import { toast } from "sonner"
import { getQuality, QUALITY_LABELS } from "@/lib/quality"
import { installQualityMonitor } from "@/lib/quality-monitor"

export function QualityMonitor() {
  useEffect(() => installQualityMonitor(kind => {
    const level = QUALITY_LABELS[getQuality()[kind]]
    toast(kind === "graphics" ? `Qualidade gráfica reduzida para ${level}` : `Qualidade sonora reduzida para ${level}`, { id: `quality-${kind}` })
  }), [])
  return null
}
