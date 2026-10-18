"use client"

import { useId, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Settings2 } from "lucide-react"
import { Button } from "./ui/button"
import type { PowerDisplay } from "@/hooks/use-power-display"
import type { ChancePosition } from "@/hooks/use-chance-position"

export function GamePreferences({
  display,
  onDisplayChange,
  chancePosition = "board",
  onChancePositionChange,
  className,
}: {
  display: PowerDisplay
  onDisplayChange: (value: PowerDisplay) => void
  chancePosition?: ChancePosition
  onChancePositionChange?: (value: ChancePosition) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const switchLabelId = useId()
  const chanceLabelId = useId()
  return <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
    <Popover.Trigger asChild>
      <Button variant="outline" size="icon" aria-label="Preferências" title="Preferências" className={className}>
        <Settings2 className="size-4" />
      </Button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content align="end" sideOffset={4} aria-labelledby={titleId}
        className="z-[200] min-w-64 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        <h2 id={titleId} className="px-2 py-1.5 text-sm font-medium">Preferências</h2>
        <div className="flex items-center justify-between gap-5 px-2 py-2">
          <div><div className="text-sm font-medium" id={switchLabelId}>Super-power</div>
            <div className="text-xs text-muted-foreground">{display === "cards" ? "Modo cards" : "Modo botões"}</div>
          </div>
          <button type="button" role="switch" aria-checked={display === "cards"} aria-labelledby={switchLabelId}
            onClick={() => onDisplayChange(display === "cards" ? "buttons" : "cards")}
            className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-white/25 transition-colors data-[checked=true]:bg-green-600 bg-zinc-700"
            data-checked={display === "cards"}>
            <span className="absolute left-0.5 top-0.5 size-[18px] rounded-full bg-white transition-transform" style={{ transform: display === "cards" ? "translateX(20px)" : undefined }} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-5 px-2 py-2 border-t border-border/40">
          <div><div className="text-sm font-medium" id={chanceLabelId}>Chance position</div>
            <div className="text-xs text-muted-foreground">{chancePosition === "board" ? "Board's side" : "Footer"}</div>
          </div>
          <button type="button" role="switch" aria-checked={chancePosition === "board"} aria-labelledby={chanceLabelId}
            onClick={() => onChancePositionChange?.(chancePosition === "board" ? "footer" : "board")}
            className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-white/25 transition-colors data-[checked=true]:bg-green-600 bg-zinc-700"
            data-checked={chancePosition === "board"}>
            <span className="absolute left-0.5 top-0.5 size-[18px] rounded-full bg-white transition-transform" style={{ transform: chancePosition === "board" ? "translateX(20px)" : undefined }} />
          </button>
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}
