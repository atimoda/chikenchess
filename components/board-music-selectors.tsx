"use client"

import type React from "react"
import { ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ROOTS, SCALES, type CreativeSession } from "@/lib/music/creative"
import { HARMONY_PLANS, type HarmonyPlanId } from "@/lib/music/harmony"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

interface BoardMusicSelectorsProps {
  cityColor: string
  disabled?: boolean
  tonality: { root: CreativeSession["root"]; scale: CreativeSession["scale"] | null }
  baseTonality: Pick<CreativeSession, "root" | "scale">
  currentScaleLabel: string
  onTonalityChange: (root: CreativeSession["root"], scale: CreativeSession["scale"]) => void
  harmony: HarmonyPlanId
  onHarmonyChange: (harmony: HarmonyPlanId) => void
  openDropdown: BoardDropdownId
  setOpenDropdown: React.Dispatch<React.SetStateAction<BoardDropdownId>>
}

/**
 * Header chips of the match (year/city title and the tone, scale and harmony
 * selectors) share the globe button's size and hover look: the same dark fill
 * and border, white letters and a glow in the city color. An open dropdown keeps that look while its menu is shown.
 * Expects `--city-neon` on the element or an ancestor.
 */
export const BOARD_HEADER_CHIP_CLASS = "pointer-events-auto inline-flex h-9 max-w-full items-center gap-1 rounded-md border border-transparent bg-transparent px-2.5 leading-none text-[var(--city-neon)] transition-all hover:border-input hover:bg-input/50 hover:text-white hover:shadow-[0_0_10px_var(--city-neon)] data-[state=open]:border-input data-[state=open]:bg-input/50 data-[state=open]:text-white data-[state=open]:shadow-[0_0_10px_var(--city-neon)] focus-visible:border-[var(--city-neon)] focus-visible:outline-none disabled:pointer-events-none"

export type BoardDropdownId = "difficulty" | "root" | "scale" | "harmony" | null

export function BoardMusicSelectors({ disabled = false, cityColor, tonality, baseTonality, currentScaleLabel, onTonalityChange, harmony, onHarmonyChange, openDropdown, setOpenDropdown }: BoardMusicSelectorsProps) {
  const t = useT()
  const triggerClass = BOARD_HEADER_CHIP_CLASS
  const triggerStyle = {
    "--city-neon": cityColor,
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    letterSpacing: "inherit",
    textTransform: "uppercase",
  } as React.CSSProperties
  const menuStyle = {
    color: cityColor,
    colorScheme: "dark",
    scrollbarColor: "rgba(255,255,255,.5) transparent",
    scrollbarWidth: "thin",
    "--city-dropdown-hover": `color-mix(in srgb, ${cityColor} 50%, black)`,
  } as React.CSSProperties
  const menuItemClass = (selected: boolean) => cn(
    "whitespace-nowrap pl-2 [&>span]:hidden text-xs hover:bg-[var(--city-dropdown-hover)] focus:bg-[var(--city-dropdown-hover)] data-[highlighted]:bg-[var(--city-dropdown-hover)]",
    selected ? "text-white" : "text-white/60",
  )

  return <div role="group" aria-label={t("Tom, escala e harmonia")} className="contents">
    <DropdownMenu open={openDropdown === "root"} onOpenChange={open => setOpenDropdown(current => open ? "root" : current === "root" ? null : current)}>
      <DropdownMenuTrigger asChild>
        <button disabled={disabled} type="button" aria-label={t("Tom da partida")} data-city-dropdown className={`${triggerClass} min-w-0 max-w-full`} style={triggerStyle}>
          <span className="truncate">{tonality.root}</span><ChevronDown aria-hidden="true" className="size-3 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[135] max-h-72 w-max min-w-0" style={menuStyle}>
        <DropdownMenuRadioGroup value={tonality.root} onValueChange={root => onTonalityChange(root as CreativeSession["root"], baseTonality.scale)}>
          {ROOTS.map(root => <DropdownMenuRadioItem key={root} value={root} className={menuItemClass(root === tonality.root)}>{root}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    <DropdownMenu open={openDropdown === "scale"} onOpenChange={open => setOpenDropdown(current => open ? "scale" : current === "scale" ? null : current)}>
      <DropdownMenuTrigger asChild>
        <button disabled={disabled} type="button" aria-label={t("Escala da partida")} data-city-dropdown className={`${triggerClass} min-w-0 max-w-full`} style={triggerStyle}>
          <span className="truncate">{currentScaleLabel}</span><ChevronDown aria-hidden="true" className="size-3 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[135] max-h-72 w-max min-w-0" style={menuStyle}>
        <DropdownMenuRadioGroup value={tonality.scale ?? "__active-scale"} onValueChange={scale => { if (scale !== "__active-scale") onTonalityChange(baseTonality.root, scale as CreativeSession["scale"]) }}>
          {tonality.scale === null && <DropdownMenuRadioItem value="__active-scale" disabled className={menuItemClass(true)} title={currentScaleLabel}>{currentScaleLabel} · {t("vigente")}</DropdownMenuRadioItem>}
          {Object.keys(SCALES).map(scale => <DropdownMenuRadioItem key={scale} value={scale} className={menuItemClass(scale === tonality.scale)}>{scale}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    <DropdownMenu open={openDropdown === "harmony"} onOpenChange={open => setOpenDropdown(current => open ? "harmony" : current === "harmony" ? null : current)}>
      <DropdownMenuTrigger asChild>
        <button disabled={disabled} type="button" aria-label={t("Harmonia da partida")} data-city-dropdown className={`${triggerClass} min-w-0 max-w-full`} style={triggerStyle}>
          <span className="truncate">{t(HARMONY_PLANS[harmony].compactLabel)}</span><ChevronDown aria-hidden="true" className="size-3 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[135] max-h-72 w-max min-w-0 max-w-[min(90vw,24rem)]" style={menuStyle}>
        <DropdownMenuRadioGroup value={harmony} onValueChange={value => onHarmonyChange(value as HarmonyPlanId)}>
          {Object.entries(HARMONY_PLANS).map(([id, plan]) => <DropdownMenuRadioItem key={id} value={id} className={menuItemClass(id === harmony)}>{t(plan.label)}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
}
