import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ChiKenChess - Play Chess, Compose Music",
  description:
    "An immersive audiovisual experience that fuses chess strategy with generative electronic music. Each board state composes a real-time soundtrack.",
  generator: "v0.app",
  openGraph: {
    type: "website",
    siteName: "ChiKenChess",
    title: "ChiKenChess - Play Chess, Compose Music",
    description: "An immersive audiovisual experience that fuses chess strategy with generative electronic music.",
    images: [{ url: "/social-card.png", width: 1200, height: 630, alt: "ChickenChess logo and audiovisual chess experience" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChiKenChess - Play Chess, Compose Music",
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
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
