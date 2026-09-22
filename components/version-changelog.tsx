'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { CHANGELOG, RELEASE_LABEL } from '@/lib/changelog'

export function VersionChangelog() {
  const [open, setOpen] = useState(false)
  return <Dialog open={open} onOpenChange={setOpen}>
    <button type="button" aria-label={`Abrir changelog ${RELEASE_LABEL}`} className="text-[10px] font-mono text-muted-foreground hover:text-primary underline-offset-4 hover:underline px-1 py-1" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setOpen(true) }}>{RELEASE_LABEL}</button>
    <DialogContent closeLabel="Fechar changelog" className="max-w-2xl max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#101713] text-[#dfe8df] border-white/20" onPointerDown={e => e.stopPropagation()}>
      <DialogHeader><DialogTitle className="text-xl font-mono">Novidades do ChickenChess</DialogTitle><DialogDescription className="text-sm text-[#a7b6a9]">O que mudou em cada versão.</DialogDescription></DialogHeader>
      <div tabIndex={0} aria-label="Histórico de versões" className="overflow-y-auto overscroll-contain min-h-0 pr-3 space-y-8 text-sm">
        {CHANGELOG.map(release => <article key={release.version}>
          <h2 className="text-lg font-mono text-primary">v{release.version} · {release.title}</h2>
          {release.date && <p className="text-xs text-[#a7b6a9] mt-1">{release.date}</p>}
          {release.groups.map(group => <section key={group.title} className="mt-5">
            <h3 className="font-semibold mb-2">{group.title}</h3>
            <ul className="list-disc pl-5 space-y-2 text-[#bdcabc]">{group.items.map(item => <li key={item}>{item}</li>)}</ul>
          </section>)}
        </article>)}
      </div>
    </DialogContent>
  </Dialog>
}
