"use client"

import { useEffect } from "react"

// Mounted once in the root layout: a right click (or a long press) on a button, a portal's button, a header or any
// control of the interface does not open the browser's menu. Text fields keep theirs (copy, paste), and so do links.
// Only the default menu is cancelled: a control that does something on a right click still gets the event.
const CONTROL = "button, [role='button'], [role='switch'], [role='tab'], [role='menuitem'], [role='slider'], header, label, summary"
const KEEPS_MENU = "input, textarea, select, [contenteditable=''], [contenteditable='true'], a[href]"

export function NoButtonMenu() {
  useEffect(() => {
    const onMenu = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (!t?.closest || t.closest(KEEPS_MENU)) return
      if (t.closest(CONTROL)) e.preventDefault()
    }
    document.addEventListener("contextmenu", onMenu)
    return () => document.removeEventListener("contextmenu", onMenu)
  }, [])
  return null
}
