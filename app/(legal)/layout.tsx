import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import Link from 'next/link'
import { LegalLinks } from '@/components/legal-links'
import { LegalContact } from '@/components/legal-document'
import styles from './legal.module.css'

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, userScalable: true }

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>
    <header className={styles.navigation}>
      <Link href="/" prefetch={false} className={styles.brand}>ChickenChess</Link>
      <Link href="/" prefetch={false} className={styles.back}>← Back to the game</Link>
    </header>
    {children}
    <footer className={styles.footer}>
      <LegalLinks className="text-white/65" />
      <p>Questions or requests? <LegalContact /></p>
      <p className={styles.tagline}>Play chess. Compose music.</p>
    </footer>
  </div>
}
