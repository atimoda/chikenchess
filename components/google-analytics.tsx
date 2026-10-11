'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { analyticsPageUrl, GOOGLE_ANALYTICS_ID } from '@/lib/site-info'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const url = analyticsPageUrl(window.location.href)
    if (!url) return

    const pageView: Record<string, string> = {
      page_location: url,
      page_path: new URL(url).pathname,
      page_title: document.title,
    }
    const referrer = document.referrer ? analyticsPageUrl(document.referrer) : null
    if (referrer) pageView.page_referrer = referrer

    window.gtag('event', 'page_view', pageView)
  }, [pathname])

  return null
}

export function GoogleAnalytics() {
  return <>
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
      strategy="afterInteractive"
    />
    <PageViewTracker />
  </>
}
