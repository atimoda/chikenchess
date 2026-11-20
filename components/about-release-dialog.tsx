'use client'

import { useRef } from 'react'
import type React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { LegalLinks } from './legal-links'
import { RELEASE_LABEL } from '@/lib/release'
import { ReleaseNotesContent } from './version-changelog'
import { BIRD_SONGS_SOURCE, birdCredits } from '@/lib/pigchicken/bird-guide'

export type AboutTab = 'about' | 'releases' | 'credits'
const TABS: readonly AboutTab[] = ['about', 'releases', 'credits']
const TAB_LABELS: Record<AboutTab, string> = { about: 'About', releases: 'Release notes', credits: 'Credits' }

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const
const instagram = (handle: string) => `https://www.instagram.com/${handle}/`

// Who made the game, and what it plays and is built on: the people, Strudel, the chicken voice
// simulator, the AI tools, the art, then the long list of the Guia de pássaros' recordings and the globe.
function CreditsContent() {
  const songs = birdCredits()
  const link = 'text-primary hover:underline'
  const person = (name: string, handle: string) => <a href={instagram(handle)} {...ext} className={link} title={`@${handle} on Instagram`}>{name}</a>
  return <div className="grid gap-5 pb-2 text-sm">
    <section className="grid gap-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ChickenChess</h3>
      <p className="leading-relaxed">Original idea of musical chess: {person('Thiago Atimoda', 'atimoda')} and {person('Rodrigo Zecchinelli', 'rigoz311')}.</p>
      <p className="leading-relaxed">Development: {person('Thiago Atimoda', 'atimoda')}.</p>
    </section>
    <section className="grid gap-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Strudel</h3>
      <p className="leading-relaxed">The music sequencing engine of ChickenChess is Strudel (@strudel/web), a live coding music engine by the Strudel authors, licensed under AGPL-3.0-or-later. <a href="https://strudel.cc" target="_blank" rel="noopener noreferrer" className={link}>strudel.cc</a> · <a href="https://codeberg.org/uzu/strudel" target="_blank" rel="noopener noreferrer" className={link}>source</a></p>
    </section>
    <section className="grid gap-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chicken voice simulator</h3>
      <p className="leading-relaxed">The <a href="/chicken-voice-simulator/" className={link}>chicken voice simulator</a> is built on Chimera, a physical-modelling voice synthesizer by Jameson Hodge, licensed under MIT. <a href="https://www.chimera.audio" {...ext} className={link}>chimera.audio</a> · <a href="https://github.com/jamesondh/chimera-vocal-synth" {...ext} className={link}>source</a> · <a href="https://github.com/atimoda/chicken-vocal-synth" {...ext} className={link}>chicken fork</a></p>
    </section>
    <section className="grid gap-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI coding assistants</h3>
      <p className="leading-relaxed">Code written with the help of <a href="https://claude.ai" {...ext} className={link}>Claude</a> (Anthropic), <a href="https://chatgpt.com" {...ext} className={link}>ChatGPT</a> (OpenAI), <a href="https://gemini.google.com" {...ext} className={link}>Gemini</a> (Google) and <a href="https://www.deepseek.com" {...ext} className={link}>DeepSeek</a>.</p>
    </section>
    <section className="grid gap-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Art</h3>
      <p className="leading-relaxed">Some visual assets come from creators on <a href="https://itch.io" {...ext} className={link}>itch.io</a>.</p>
    </section>
    <section className="grid gap-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bird songs</h3>
      <p className="leading-relaxed">The real songs of the Guia de pássaros are short excerpts (cut, filtered and levelled) of recordings shared on <a href={`https://${BIRD_SONGS_SOURCE}`} target="_blank" rel="noopener noreferrer" className={link}>{BIRD_SONGS_SOURCE}</a> by the recordists below, used non-commercially under each recording&apos;s Creative Commons licence.</p>
      <ul className="grid gap-1 font-mono text-xs">
        {songs.map(({ bird, clip }) => <li key={clip.file} className="flex flex-wrap gap-x-2">
          <i className="text-foreground">{bird.sci}</i>
          <span>{clip.by}</span>
          <a href={clip.url} target="_blank" rel="noopener noreferrer" className={link}>XC{clip.xc}</a>
          <a href={clip.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline">{clip.license}</a>
        </li>)}
      </ul>
    </section>
    <section className="grid gap-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Globe</h3>
      <p className="leading-relaxed">Earth textures from NASA Earth Observatory (Blue Marble Next Generation and Black Marble 2016), public domain.</p>
    </section>
  </div>
}

export function AboutReleaseDialog({ open, onOpenChange, tab, onTabChange }: { open: boolean; onOpenChange: (open: boolean) => void; tab: AboutTab; onTabChange: (tab: AboutTab) => void }) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const selectTab = (next: AboutTab) => onTabChange(next)
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const index = Math.max(0, tabs.current.indexOf(event.currentTarget)), n = TABS.length
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % n
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + n - 1) % n
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = n - 1
    else return
    event.preventDefault()
    selectTab(TABS[next])
    tabs.current[next]?.focus()
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent closeLabel="Fechar About" mobileViewportScroll className="max-w-2xl max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#101713] text-[#dfe8df] border-white/20" onPointerDown={e => e.stopPropagation()}>
      <DialogHeader>
        <DialogTitle className="sr-only">About, Release notes e Credits</DialogTitle>
        <DialogDescription className="sr-only">Informações sobre o ChickenChess e novidades da versão</DialogDescription>
        <div role="tablist" aria-label="About e release notes" className="flex gap-1 border-b border-white/15 pr-2">
          {TABS.map((value, index) => <button id={`${value}-tab`} key={value} ref={element => { tabs.current[index] = element }} type="button" role="tab" aria-selected={tab === value} aria-controls={`${value}-tabpanel`} tabIndex={tab === value ? 0 : -1} onKeyDown={onKeyDown} onClick={() => selectTab(value)} className={`px-3 py-2 text-xs font-mono ${tab === value ? 'border-b-2 border-primary text-primary' : 'text-[#a7b6a9] hover:text-white'}`}>{TAB_LABELS[value]}</button>)}
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
      </div> : tab === 'credits' ? <div id="credits-tabpanel" role="tabpanel" aria-labelledby="credits-tab" className="min-h-0 overflow-y-auto overscroll-contain"><CreditsContent /></div>
        : <div id="releases-tabpanel" role="tabpanel" aria-labelledby="releases-tab" className="min-h-0 overflow-hidden"><ReleaseNotesContent /></div>}
    </DialogContent>
  </Dialog>
}
