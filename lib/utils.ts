import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const htmlMarkup = new Map<string, { __html: string }>()
/**
 * React 19 rewrites innerHTML whenever the dangerouslySetInnerHTML object is a
 * new one, even with identical markup. Reusing one object per string keeps
 * re-renders from re-parsing piece SVGs (and re-rasterizing their filters).
 */
export function stableHtml(html: string) {
  let markup = htmlMarkup.get(html)
  if (!markup) htmlMarkup.set(html, markup = { __html: html })
  return markup
}
