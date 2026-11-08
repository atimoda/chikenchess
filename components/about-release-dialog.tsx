'use client'

import { useRef } from 'react'
import type React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { LegalLinks } from './legal-links'
import { RELEASE_LABEL } from '@/lib/release'
import { ReleaseNotesContent } from './version-changelog'

export function AboutReleaseDialog({ open, onOpenChange, tab, onTabChange }: { open: boolean; onOpenChange: (open: boolean) => void; tab: 'about' | 'releases'; onTabChange: (tab: 'about' | 'releases') => void }) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const selectTab = (next: 'about' | 'releases') => onTabChange(next)
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const index = event.currentTarget === tabs.current[0] ? 0 : 1
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % 2
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + 1) % 2
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = 1
    else return
    event.preventDefault()
    const nextTab = next === 0 ? 'about' : 'releases'
    selectTab(nextTab)
    tabs.current[next]?.focus()
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent closeLabel="Fechar About" mobileViewportScroll className="max-w-2xl max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#101713] text-[#dfe8df] border-white/20" onPointerDown={e => e.stopPropagation()}>
      <DialogHeader>
        <DialogTitle className="sr-only">About e Release notes</DialogTitle>
        <DialogDescription className="sr-only">Informações sobre o ChickenChess e novidades da versão</DialogDescription>
        <div role="tablist" aria-label="About e release notes" className="flex gap-1 border-b border-white/15 pr-2">
          {(['about', 'releases'] as const).map((value, index) => <button id={`${value}-tab`} key={value} ref={element => { tabs.current[index] = element }} type="button" role="tab" aria-selected={tab === value} aria-controls={`${value}-tabpanel`} tabIndex={tab === value ? 0 : -1} onKeyDown={onKeyDown} onClick={() => selectTab(value)} className={`px-3 py-2 text-xs font-mono ${tab === value ? 'border-b-2 border-primary text-primary' : 'text-[#a7b6a9] hover:text-white'}`}>{value === 'about' ? 'About' : 'Release notes'}</button>)}
        </div>
      </DialogHeader>
      {tab === 'about' ? <div id="about-tabpanel" role="tabpanel" aria-labelledby="about-tab" className="min-h-0 overflow-y-auto overscroll-contain text-sm">
        <h2 className="mb-1 flex items-center gap-2 font-mono text-xl sm:text-2xl font-bold text-primary"><img src="/chickenchess-logo.png" alt="" className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 object-contain" />chickenchess</h2>
        <p className="text-xs font-bold text-muted-foreground mb-4">{RELEASE_LABEL}</p>
        <div className="my-4 border-l-2 border-primary/50 pl-4 py-1"><p className="text-sm text-foreground leading-relaxed">Our vision is to reimagine the classic game of chess by turning the board into a musical instrument. Every piece has a voice, and every move creates a new moment in the music you make while playing with your friends. Explore new strategic possibilities, like freezing or protecting a piece for one round, or getting a second chance with a Mulligan. Extra cheesy.</p></div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed mt-6">This is an independent project built with love and lots of coffee. The idea emerged after dozens of chess games played while listening to electronic music, by cousins Thiago Atimoda and Rodrigo Zecchinelli. If you enjoy the experience and want to help the development, consider making a donation. Every bit helps us develop more features.</p>
        <div className="mb-6 space-y-3"><div><p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">General Contact:</p><a href="mailto:atimoda@gmail.com" className="text-sm text-primary hover:underline">atimoda@gmail.com</a></div></div>
        <a href="https://ko-fi.com/chickenchess" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5E5B] text-white rounded font-bold hover:bg-[#ff4542] transition-colors"><span>☕</span> Buy me a coffee</a>
        <div className="mt-6 border-t border-border pt-4"><LegalLinks newTab className="text-muted-foreground" /></div>
      </div> : <div id="releases-tabpanel" role="tabpanel" aria-labelledby="releases-tab" className="min-h-0 overflow-hidden"><ReleaseNotesContent /></div>}
    </DialogContent>
  </Dialog>
}
