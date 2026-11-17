import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SiteAnalytics } from "@/components/site-analytics"
import { GoogleAnalytics } from "@/components/google-analytics"
import { AudioFocus } from "@/components/audio-focus"
import { NoButtonMenu } from "@/components/no-button-menu"
import { QualityMonitor } from "@/components/quality-monitor"
import { VersionUpdateNotice } from "@/components/version-update-notice"
import { GOOGLE_ANALYTICS_ID, SITE_URL } from "@/lib/site-info"
import { Toaster } from "sonner"
import Script from "next/script"
import "./globals.css"

/* global URL, process */

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ChicKenChess - Play Chess, Compose Music",
  description:
    "An immersive audiovisual experience that fuses chess strategy with generative electronic music. Each board state composes a real-time soundtrack.",
  generator: "v0.app",
  openGraph: {
    type: "website",
    siteName: "ChicKenChess",
    title: "ChicKenChess - Play Chess, Compose Music",
    description: "An immersive audiovisual experience that fuses chess strategy with generative electronic music.",
    images: [{ url: "/social-card.png", width: 1200, height: 630, alt: "ChickenChess logo and audiovisual chess experience" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChicKenChess - Play Chess, Compose Music",
    description: "An immersive audiovisual experience that fuses chess strategy with generative electronic music.",
    images: ["/twitter-card.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "ChicKenChess",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {process.env.NODE_ENV === 'production' ? <Script id="google-analytics-init" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
window.gtag('js', new Date());
window.gtag('config', '${GOOGLE_ANALYTICS_ID}', { send_page_view: false });`}
        </Script> : null}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bitcount+Prop+Single:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <AudioFocus />
        <NoButtonMenu />
        <QualityMonitor />
        <VersionUpdateNotice />
        {process.env.NODE_ENV === 'production' ? <GoogleAnalytics /> : null}
        {process.env.VERCEL === '1' ? <SiteAnalytics /> : null}
        <Toaster duration={3000} />
      </body>
    </html>
  )
}
