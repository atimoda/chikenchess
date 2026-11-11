"use client"

import type { ReactNode } from "react"

export function PatioDisclosure({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: (open: boolean) => void; children: ReactNode
}) {
  return (
    <details open={open} onToggle={e => onToggle(e.currentTarget.open)} className="border-b border-white/10">
      <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#ffd166] hover:text-white">{title}</summary>
      {children}
    </details>
  )
}
