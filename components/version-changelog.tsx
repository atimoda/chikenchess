'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { CHANGELOG, RELEASE_LABEL } from '@/lib/changelog'

export function ReleaseNotesContent() {
  return <div tabIndex={0} aria-label="Histórico de versões" className="h-full overflow-y-auto overscroll-contain min-h-0 pr-3 space-y-8 text-xs">
    {CHANGELOG.map(release => <article key={release.version}>
      <h2 className="text-base font-mono text-primary">v{release.version} · {release.title}</h2>
      {release.date && <p className="text-[11px] text-[#a7b6a9] mt-1">{release.date}</p>}
      {release.groups.map(group => <section key={group.title} className="mt-5">
        <h3 className="text-xs font-semibold mb-2">{group.title}</h3>
        <ul className="list-disc pl-5 space-y-2 text-xs text-[#bdcabc]">{group.items.map(item => <li key={item}>{item}</li>)}</ul>
      </section>)}
    </article>)}
  </div>
}

export function VersionChangelog({ mapButton = false, onOpen }: { mapButton?: boolean; onOpen?: () => void }) {
  const [open, setOpen] = useState(false)
  const handleOpen = () => onOpen ? onOpen() : setOpen(true)
  const button = <button type="button" aria-label={`Abrir changelog ${RELEASE_LABEL}`} className={mapButton ? 'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background/80 px-3 text-[10px] font-mono text-muted-foreground backdrop-blur-sm transition-all hover:border-primary hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:shadow-[0_0_10px_var(--primary)]' : 'text-[10px] font-mono text-muted-foreground hover:text-primary underline-offset-4 hover:underline px-1 py-1'} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); handleOpen() }}>
    {mapButton && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-500" />}
    {RELEASE_LABEL}
  </button>
  if (onOpen) return button
  return <Dialog open={open} onOpenChange={setOpen}>
    {button}
    <DialogContent closeLabel="Fechar changelog" className="max-w-2xl max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#101713] text-[#dfe8df] border-white/20" onPointerDown={e => e.stopPropagation()}>
      <DialogHeader><DialogTitle className="text-lg font-mono">Release notes</DialogTitle><DialogDescription className="text-xs text-[#a7b6a9]">Novidades do ChickenChess</DialogDescription></DialogHeader>
      <ReleaseNotesContent />
    </DialogContent>
  </Dialog>
}
