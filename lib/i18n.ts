// Game languages. The code keeps each text in the language it was written in (Portuguese or English): that
// source text is the key, and lib/locales/messages/*.json hold the eight translations of every key.
// scripts/i18n-build.mjs turns them into one small catalog per language (lib/locales/generated/), loaded on demand.
//
// - In components: `const t = useT()` and `t("Preferências")`; the component re-renders when the language changes.
// - Outside React (canvas drawing, helpers): `t("…")` reads the current language directly.
// - Texts defined as data (labels in constant tables): mark them with `msg("…")` and translate where they are shown,
//   `t(item.label)`. The stored/compared value stays the source text.
// - Values: `t("Limitar a {n} FPS", { n: 30 })`. Elements inside a sentence: `tx("Aperte {key} para entrar", { key: <kbd>E</kbd> })`.
// A key without a translation shows the source text, so a missing entry never breaks the screen.

import { createElement, Fragment, useMemo, useSyncExternalStore, type ReactNode } from "react"

export type Locale = "pt" | "en" | "es" | "zh" | "hi" | "ja" | "ru" | "fr"

/** The languages in the selector, each in its own language. */
export const LOCALES: readonly { id: Locale; name: string }[] = [
  { id: "pt", name: "Português" },
  { id: "en", name: "English" },
  { id: "es", name: "Español" },
  { id: "fr", name: "Français" },
  { id: "ru", name: "Русский" },
  { id: "hi", name: "हिन्दी" },
  { id: "zh", name: "中文" },
  { id: "ja", name: "日本語" },
]

export const LOCALE_IDS = LOCALES.map(l => l.id)
const FALLBACK: Locale = "en"
const STORAGE_KEY = "chickenchess.locale"

type Catalog = Record<string, string>
type Vars = Record<string, string | number>

const LOADERS: Record<Locale, () => Promise<{ default: unknown }>> = {
  pt: () => import("./locales/generated/pt.json"),
  en: () => import("./locales/generated/en.json"),
  es: () => import("./locales/generated/es.json"),
  zh: () => import("./locales/generated/zh.json"),
  hi: () => import("./locales/generated/hi.json"),
  ja: () => import("./locales/generated/ja.json"),
  ru: () => import("./locales/generated/ru.json"),
  fr: () => import("./locales/generated/fr.json"),
}

/** What the screen shows: the chosen language and its catalog (empty while it loads, so the source texts show). */
export type LocaleState = { locale: Locale; catalog: Catalog }

const SOURCE: LocaleState = { locale: FALLBACK, catalog: {} }
let state: LocaleState = SOURCE
let started = false
const listeners = new Set<() => void>()
const loaded = new Map<Locale, Catalog>()

export const isLocale = (value: unknown): value is Locale => typeof value === "string" && (LOCALE_IDS as string[]).includes(value)

/** The browser's first language among the eight (pt-BR → pt, zh-CN → zh…), English when none matches. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const base = lang.toLowerCase().split(/[-_]/)[0]
    if (isLocale(base)) return base
  }
  return FALLBACK
}

function storedLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch { /* storage blocked: follow the browser */ }
  return detectLocale(typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language ?? ""])
}

function publish(next: LocaleState) {
  state = next
  if (typeof document !== "undefined") document.documentElement.lang = next.locale === "zh" ? "zh-CN" : next.locale
  for (const listener of listeners) listener()
}

function apply(locale: Locale) {
  const ready = loaded.get(locale)
  if (ready) { publish({ locale, catalog: ready }); return }
  // the language changes when its catalog arrives; meanwhile the previous language stays on screen
  void LOADERS[locale]().then(mod => {
    const catalog = ((mod as { default?: Catalog }).default ?? mod) as Catalog
    loaded.set(locale, catalog)
    if (wanted === locale) publish({ locale, catalog })
  }).catch(() => { /* offline chunk: keep the current texts */ })
}

let wanted: Locale = FALLBACK
function start() {
  if (started || typeof window === "undefined") return
  started = true
  wanted = storedLocale()
  state = { locale: wanted, catalog: {} }
  apply(wanted)
}

export function getLocaleState(): LocaleState { start(); return state }
export const getServerLocaleState = (): LocaleState => SOURCE
export function subscribeLocale(listener: () => void) {
  start()
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const getLocale = (): Locale => getLocaleState().locale

/** Chooses the language, saved in this browser. */
export function setLocale(locale: Locale) {
  start()
  wanted = locale
  try { window.localStorage.setItem(STORAGE_KEY, locale) } catch { /* the choice lasts for this visit */ }
  apply(locale)
}

const fill = (text: string, vars?: Vars) => vars ? text.replace(/\{(\w+)\}/g, (all, name: string) => name in vars ? String(vars[name]) : all) : text

/** Translates a source text with the given state's catalog. */
export function translate(current: LocaleState, key: string, vars?: Vars): string {
  return fill(current.catalog[key] ?? key, vars)
}

/** Translates with the current language (for code outside React, such as canvas drawing). */
export function t(key: string, vars?: Vars): string {
  return translate(getLocaleState(), key, vars)
}

/** Marks a text kept as data to be translated where it is shown, with `t(value)`. Returns the text itself. */
export function msg<T extends string>(key: T): T {
  return key
}

/** Translates a sentence with elements in its {placeholders}, for JSX. */
export function txWith(current: LocaleState, key: string, parts: Record<string, ReactNode>): ReactNode[] {
  const text = current.catalog[key] ?? key
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of text.matchAll(/\{(\w+)\}/g)) {
    const at = match.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    out.push(match[1] in parts ? createElement(Fragment, { key: i++ }, parts[match[1]]) : match[0])
    last = at + match[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function tx(key: string, parts: Record<string, ReactNode>): ReactNode[] {
  return txWith(getLocaleState(), key, parts)
}

/** The current language's state, re-rendering the component when it changes. */
export const useLocaleState = () => useSyncExternalStore(subscribeLocale, getLocaleState, getServerLocaleState)
export const useLocale = () => useLocaleState().locale

type Translate = ((key: string, vars?: Vars) => string) & { x: (key: string, parts: Record<string, ReactNode>) => ReactNode[] }

/** `const t = useT()`: translates in render and re-renders on a language change. `t.x(…)` is `tx` for JSX. */
export function useT(): Translate {
  const current = useLocaleState()
  return useMemo(() => Object.assign((key: string, vars?: Vars) => translate(current, key, vars), {
    x: (key: string, parts: Record<string, ReactNode>) => txWith(current, key, parts),
  }), [current])
}
