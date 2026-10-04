'use client'

import { Analytics } from '@vercel/analytics/next'
import { analyticsPageUrl } from '@/lib/site-info'

export function SiteAnalytics() {
  return <Analytics beforeSend={event => {
    const url = analyticsPageUrl(event.url)
    return url ? { ...event, url } : null
  }} />
}
