/* global URL */
export const SITE_URL = 'https://chickenchess.com'
export const SUPPORT_EMAIL = 'hello@chickenchess.com'
export const GOOGLE_ANALYTICS_ID = 'G-JS8T024M3K'
export const LEGAL_UPDATED = '10 October 2026'
export const LEGAL_PATHS = {
  privacy: '/privacy-policy',
  terms: '/terms-of-service',
} as const

/** Keep auth callbacks and private query/fragment values out of page analytics. */
export function analyticsPageUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (!['https:', 'http:'].includes(url.protocol)) return null
    if (url.searchParams.has('authCallback') || url.searchParams.has('code')) return null
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch { return null }
}
