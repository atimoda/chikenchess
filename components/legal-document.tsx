import type { ReactNode } from 'react'
import Link from 'next/link'
import { LEGAL_UPDATED, SUPPORT_EMAIL } from '@/lib/site-info'
import styles from '@/app/(legal)/legal.module.css'

export function LegalDocument({ title, introduction, contents, children }: {
  title: string
  introduction: string
  contents: readonly { id: string; title: string }[]
  children: ReactNode
}) {
  return <main className={styles.document}>
    <header className={styles.introduction}>
      <p className={styles.eyebrow}>ChickenChess · Legal</p>
      <h1>{title}</h1>
      <p className={styles.date}>Effective and last updated: {LEGAL_UPDATED}</p>
      <p className={styles.lead}>{introduction}</p>
    </header>
    <nav aria-label="On this page" className={styles.contents}>
      <strong>On this page</strong>
      <ol>{contents.map(section => <li key={section.id}><Link href={`#${section.id}`}>{section.title}</Link></li>)}</ol>
    </nav>
    <article className={styles.prose}>{children}</article>
  </main>
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id}><h2>{title}</h2>{children}</section>
}

export function LegalContact() {
  return <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
}
