"use client"

// The open Pátio's Lock (Configurações do Pátio, lib/pigchicken/patio-tuning.ts): for whoever may not edit the Pátio,
// the panels of characters, items, scales, camera, layers and volumes show its values and change nothing. The fields
// just look disabled; the Pátio's editors and the admin keep them.
import type { ReactNode } from "react"
import { useTuningVersion } from "@/hooks/use-game-defaults"
import { tuningLocked } from "@/lib/pigchicken/patio-tuning"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

export function useTuningLocked() {
  useTuningVersion()
  return tuningLocked()
}

export function LockedFieldset({ children, className }: { children: ReactNode; className?: string }) {
  const t = useT()
  const locked = useTuningLocked()
  return (
    <fieldset disabled={locked} title={locked ? t("Travado por quem cuida deste Pátio") : undefined}
      className={cn("m-0 min-w-0 border-0 p-0 disabled:opacity-60 [&:disabled_input]:cursor-default", className)}>{children}</fieldset>
  )
}
