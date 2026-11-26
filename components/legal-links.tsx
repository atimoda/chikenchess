'use client'

import Link from 'next/link'
import { LEGAL_PATHS } from '@/lib/site-info'
import { useT } from '@/lib/i18n'

export function LegalLinks({ newTab = false, className = '' }: { newTab?: boolean; className?: string }) {
  const t = useT()
  return <nav aria-label={t("Legal information")} className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs ${className}`}>
    <Link href={LEGAL_PATHS.privacy} prefetch={false} target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined} className="underline underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-offset-4">{t("Privacy Policy")}{newTab ? <span className="sr-only"> {t("(opens in a new tab)")}</span> : null}</Link>
    <Link href={LEGAL_PATHS.terms} prefetch={false} target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined} className="underline underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-offset-4">{t("Terms of Service")}{newTab ? <span className="sr-only"> {t("(opens in a new tab)")}</span> : null}</Link>
  </nav>
}
