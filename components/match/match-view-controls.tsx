"use client"

import type { ReactNode } from "react"
import { Code2, Maximize, Minimize, Music2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFullscreen } from "@/hooks/use-match-layout"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

export const MATCH_HEADER_BUTTON_CLASS = "hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black transition-all"

interface MatchViewControlsProps {
  codeOn: boolean
  onToggleCode: () => void
  musicOn: boolean
  onToggleMusic: () => void
  /** The Preferences menu sits between the code and music toggles. */
  preferences: ReactNode
}

/** Code/Debug, Preferences, music and fullscreen buttons of the match header. */
export function MatchViewControls({ codeOn, onToggleCode, musicOn, onToggleMusic, preferences }: MatchViewControlsProps) {
  const t = useT()
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  return <>
    <Button
      variant="outline"
      size="icon"
      onClick={onToggleCode}
      title={t("View code / Debug")}
      aria-label={codeOn ? t("Ocultar código Strudel e widget Debug") : t("Mostrar código Strudel e widget Debug")}
      aria-pressed={codeOn}
      className={MATCH_HEADER_BUTTON_CLASS}
    >
      <Code2 className={cn("w-4 h-4", !codeOn && "opacity-60")} />
    </Button>
    {preferences}
    <Button
      variant="outline"
      size="icon"
      onClick={onToggleMusic}
      title={musicOn ? t("Desligar música") : t("Ligar música")}
      aria-label={musicOn ? t("Desligar música generativa") : t("Ligar música generativa")}
      aria-pressed={musicOn}
      className={MATCH_HEADER_BUTTON_CLASS}
    >
      <Music2 className={cn("w-4 h-4", !musicOn && "opacity-35")} />
    </Button>
    <Button
      variant="outline"
      size="icon"
      onClick={toggleFullscreen}
      title={isFullscreen ? t("Restaurar") : t("Maximizar")}
      aria-label={isFullscreen ? t("Restaurar janela") : t("Maximizar janela")}
      className={MATCH_HEADER_BUTTON_CLASS}
    >
      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
    </Button>
  </>
}
