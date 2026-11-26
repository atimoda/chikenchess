"use client"

import { Languages } from "lucide-react"
import { isLocale, LOCALES, setLocale, useLocale, useT } from "@/lib/i18n"

/** The game's language, the first row of Preferências and of the Pátio's Camadas. Each language shows its own name. */
export function LanguageField({ rowClassName, selectClassName }: { rowClassName: string; selectClassName: string }) {
  const t = useT()
  const locale = useLocale()
  return <label className={rowClassName}>
    <span className="flex items-center gap-1.5"><Languages aria-hidden="true" className="size-3.5 shrink-0" />{t("Idioma")}</span>
    <select value={locale} onChange={e => { if (isLocale(e.target.value)) setLocale(e.target.value) }} className={selectClassName}>
      {LOCALES.map(l => <option key={l.id} value={l.id} lang={l.id}>{l.name}</option>)}
    </select>
  </label>
}
