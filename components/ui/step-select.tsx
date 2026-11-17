"use client"

// The panels' dropdown: a native <select> with the standard "next item" button at its right. One tap picks the option
// after the current one (after the last comes the first), so a list can be gone through by touch, with a visible
// change at each tap. It takes what a <select> takes and goes through its real options, in the order they are listed:
// disabled ones and the ones marked `data-skip` (a placeholder such as "Escolher…") are jumped. A dropdown that always
// shows its placeholder goes on from the option picked last.
import { useRef, type ComponentProps } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/** The look of the "next item" button, wherever it is drawn. */
export const STEP_BUTTON = "inline-flex w-7 shrink-0 touch-manipulation items-center justify-center rounded-md bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 disabled:opacity-40"

const skipped = (o: HTMLOptionElement) => o.disabled || o.hasAttribute("data-skip") || (o.parentElement instanceof HTMLOptGroupElement && o.parentElement.disabled)

/** Picks the option after `from`, as if it had been chosen in the list. */
function stepSelect(el: HTMLSelectElement, from: number) {
  const n = el.options.length
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n
    if (skipped(el.options[i])) continue
    if (i === el.selectedIndex) return
    el.selectedIndex = i
    el.dispatchEvent(new Event("change", { bubbles: true }))
    return
  }
}

// `wrap`: classes of the pair (select + button), for what places it in its row (a margin, a maximum width). A select
// that fills its row (`w-full` or `flex-1` in `className`) makes the pair fill it.
export function StepSelect({ wrap, className, children, ...rest }: ComponentProps<"select"> & { wrap?: string }) {
  const ref = useRef<HTMLSelectElement | null>(null)
  const last = useRef<number | null>(null)
  const classes = (className ?? "").split(/\s+/)
  const label = rest["aria-label"]
  return (
    <span className={cn("flex min-w-0 gap-1", classes.includes("flex-1") ? "flex-1" : classes.includes("w-full") && "w-full", wrap)}
      onChange={() => { last.current = ref.current?.selectedIndex ?? null }}>
      <select ref={ref} className={cn("min-w-0 grow", className)} {...rest}>{children}</select>
      <button type="button" disabled={rest.disabled} aria-label={label ? `Próximo item de ${label}` : "Próximo item"} title="Próximo item" className={STEP_BUTTON}
        onClick={() => {
          const el = ref.current
          if (!el) return
          const cur = el.selectedIndex
          stepSelect(el, last.current != null && el.options[cur]?.hasAttribute("data-skip") ? last.current : cur)
        }}><ChevronRight size={16} /></button>
    </span>
  )
}
