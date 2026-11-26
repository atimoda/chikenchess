'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import dynamic from 'next/dynamic'
import { RELEASE_LABEL } from '@/lib/release'
import { t as tr, useT } from '@/lib/i18n'

// The full history loads only when a dialog that shows it opens.
export const ReleaseNotesContent = dynamic(() => import('./release-notes-content').then(module => module.ReleaseNotesContent), {
  ssr: false,
  loading: () => <div aria-busy="true" className="h-full min-h-0 text-xs text-[#a7b6a9]">{tr('Carregando…')}</div>,
})

export function VersionChangelog({ mapButton = false, label, className, onOpen }: { mapButton?: boolean; label?: string; className?: string; onOpen?: () => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const handleOpen = () => onOpen ? onOpen() : setOpen(true)
  const button = <button type="button" aria-label={t('Open changelog {version}', { version: RELEASE_LABEL })} className={`${mapButton ? 'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background/80 px-3 text-[10px] font-mono text-muted-foreground backdrop-blur-sm transition-all hover:border-primary hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:shadow-[0_0_10px_var(--primary)]' : 'text-[10px] font-mono text-muted-foreground hover:text-primary underline-offset-4 hover:underline px-1 py-1'} ${className ?? ''}`} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); handleOpen() }}>
    {mapButton && !label && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-500" />}
    {label ?? RELEASE_LABEL}
  </button>
  if (onOpen) return button
  return <Dialog open={open} onOpenChange={setOpen}>
    {button}
    <DialogContent closeLabel={t("Fechar changelog")} className="max-w-2xl max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#101713] text-[#dfe8df] border-white/20" onPointerDown={e => e.stopPropagation()}>
      <DialogHeader><DialogTitle className="text-lg font-mono">{t("Release notes")}</DialogTitle><DialogDescription className="text-xs text-[#a7b6a9]">{t("Novidades do ChickenChess")}</DialogDescription></DialogHeader>
      <ReleaseNotesContent />
    </DialogContent>
  </Dialog>
}
