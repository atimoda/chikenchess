"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getNextMatchTip, markMatchTipSeen } from "@/lib/game-progression"
import { useT } from "@/lib/i18n"

/** Shows the next unseen tip once, when the match becomes playable. */
export function useGameplayTip(active: boolean) {
  const [tip, setTip] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const evaluatedRef = useRef(false)
  useEffect(() => {
    if (!active || evaluatedRef.current) return
    evaluatedRef.current = true
    const next = getNextMatchTip()
    if (!next) return
    markMatchTipSeen()
    setTip(next)
    setOpen(true)
  }, [active])
  return { tip, open, setOpen }
}

export function GameplayTipDialog({ tip, open, onOpenChange }: { tip: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT()
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="z-[140] max-w-md border-amber-300/40 bg-[#101713] p-6 text-white">
      <DialogHeader>
        <DialogTitle className="font-mono text-amber-200">{t("Tip")}</DialogTitle>
        <DialogDescription className="whitespace-pre-line pt-2 text-base leading-relaxed text-white/80">
          {tip ? t(tip) : tip}
        </DialogDescription>
      </DialogHeader>
      <Button autoFocus onClick={() => onOpenChange(false)} className="mt-2 w-full bg-amber-400 text-black hover:bg-amber-300">{t("Ok!")}</Button>
    </DialogContent>
  </Dialog>
}
