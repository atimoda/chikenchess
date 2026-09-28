"use client"

import type React from "react"
import { ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ROOTS, SCALES, type CreativeSession } from "@/lib/music/creative"
import { HARMONY_PLANS, type HarmonyPlanId } from "@/lib/music/harmony"
import { cn } from "@/lib/utils"

interface BoardMusicSelectorsProps {
  cityColor: string
  tonality: Pick<CreativeSession, "root" | "scale">
  onTonalityChange: (root: CreativeSession["root"], scale: CreativeSession["scale"]) => void
  harmony: HarmonyPlanId
  onHarmonyChange: (harmony: HarmonyPlanId) => void
}

export function BoardMusicSelectors({ cityColor, tonality, onTonalityChange, harmony, onHarmonyChange }: BoardMusicSelectorsProps) {
  const triggerClass = "inline-flex h-7 w-auto max-w-full items-center gap-1 rounded border border-transparent bg-black/50 px-1.5 text-xs font-mono leading-none hover:border-white/20 focus-visible:border-white/30 focus-visible:outline-none"
  const triggerStyle = { color: cityColor } as const
  const menuStyle = {
    color: cityColor,
    colorScheme: "dark",
    "--city-dropdown-hover": `color-mix(in srgb, ${cityColor} 50%, black)`,
  } as React.CSSProperties
  const menuItemClass = (selected: boolean) => cn(
    "whitespace-nowrap text-xs hover:bg-[var(--city-dropdown-hover)] focus:bg-[var(--city-dropdown-hover)] data-[highlighted]:bg-[var(--city-dropdown-hover)]",
    selected ? "text-white" : "text-white/60",
  )

  return <div className="pointer-events-auto flex w-full items-center gap-1 px-1 py-1">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Tom da partida" data-city-dropdown className={`${triggerClass} shrink-0`} style={triggerStyle}>
          {tonality.root}<ChevronDown aria-hidden="true" className="size-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-max min-w-0" style={menuStyle}>
        <DropdownMenuRadioGroup value={tonality.root} onValueChange={root => onTonalityChange(root as CreativeSession["root"], tonality.scale)}>
          {ROOTS.map(root => <DropdownMenuRadioItem key={root} value={root} className={menuItemClass(root === tonality.root)}>{root}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Escala da partida" data-city-dropdown className={`${triggerClass} shrink-0`} style={triggerStyle}>
          {tonality.scale}<ChevronDown aria-hidden="true" className="size-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-max min-w-0" style={menuStyle}>
        <DropdownMenuRadioGroup value={tonality.scale} onValueChange={scale => onTonalityChange(tonality.root, scale as CreativeSession["scale"])}>
          {Object.keys(SCALES).map(scale => <DropdownMenuRadioItem key={scale} value={scale} className={menuItemClass(scale === tonality.scale)}>{scale}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Progressão da partida" data-city-dropdown className={`${triggerClass} ml-auto min-w-0`} style={triggerStyle}>
          <span className="truncate">{HARMONY_PLANS[harmony].compactLabel}</span><ChevronDown aria-hidden="true" className="size-3 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-max min-w-0 max-w-[min(90vw,24rem)]" style={menuStyle}>
        <DropdownMenuRadioGroup value={harmony} onValueChange={value => onHarmonyChange(value as HarmonyPlanId)}>
          {Object.entries(HARMONY_PLANS).map(([id, plan]) => <DropdownMenuRadioItem key={id} value={id} className={menuItemClass(id === harmony)}>{plan.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
}
