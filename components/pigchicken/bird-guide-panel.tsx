"use client"

// The Pássaros tab of the Catálogo (catalog-panel.tsx), the Guia de pássaros: the real birds the souls take after (lib/pigchicken/bird-guide.ts). A card for each
// bird; a click opens it and plays one of its real songs (each click on its drawing plays the next one). The open bird
// shows what it is, its recordings with who made each one, and the souls it inspires: the ones not caught yet are
// only their outline, as in the Biblioteca de almas, and a click on one caught opens the library on it (onSoul).
// `focus` opens the guide on a bird (from a soul's Inspiration).
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { SoulCanvas } from "@/components/pigchicken/draw/soul-card"
import { GUIDE_BIRDS, birdClips, type BirdClip, type GuideBird } from "@/lib/pigchicken/bird-guide"
import { playBirdClip, stopBirdClip } from "@/lib/pigchicken/bird-song"
import { loadCollection, loadSoulEntries, subscribeCollection, subscribeSoulEntries, type SoulCollection, type SoulEntry, type SoulLook } from "@/lib/pigchicken/soul-library"

const lookOf = (b: GuideBird): SoulLook => ({ shape: b.shape, pixel: b.pixel, body: b.body, wing: b.wing, belly: b.belly, beak: b.beak, eye: "#101018", halo: false })
const sky = "rounded-md bg-[#4a7391]"
const clipName = (c: BirdClip, all: readonly BirdClip[]) => {
  const same = all.filter(o => o.kind === c.kind)
  return `${c.kind === "song" ? "Canto" : "Chamado"}${same.length > 1 ? ` ${same.indexOf(c) + 1}` : ""}`
}

export function BirdGuideBody({ focus, onSoul }: { focus?: { id: string; n: number } | null; onSoul?: (soul: string) => void }) {
  const [sel, setSel] = useState<string | null>(focus?.id ?? null)
  const [col, setCol] = useState<SoulCollection>(() => loadCollection())
  const [entries, setEntries] = useState<readonly SoulEntry[]>(() => loadSoulEntries())
  const [playing, setPlaying] = useState<string | null>(null)
  const next = useRef(0)
  useEffect(() => subscribeCollection(setCol), [])
  useEffect(() => subscribeSoulEntries(setEntries), [])
  useEffect(() => () => stopBirdClip(), [])
  const play = (clip: BirdClip | undefined) => {
    if (!clip) return
    setPlaying(clip.file)
    playBirdClip(clip, () => setPlaying(now => (now === clip.file ? null : now)))
  }
  const stop = () => { stopBirdClip(); setPlaying(null) }
  // the bird's next recording, from the first
  const sing = (id: string) => { const clips = birdClips(id); if (clips.length) play(clips[next.current++ % clips.length]) }
  const pick = (id: string | null) => { next.current = 0; setSel(id); if (id) sing(id); else stop() }
  const asked = focus?.n
  useEffect(() => { if (focus) pick(focus.id) }, [asked]) // (only a new ask opens it)

  const b = sel ? GUIDE_BIRDS.find(o => o.id === sel) ?? null : null
  const clips = b ? birdClips(b.id) : []
  const souls = useMemo(() => (b ? entries.filter(e => e.bird === b.id) : []), [b, entries])
  const row = "flex items-center justify-between gap-3"
  const head = "text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]"

  return (
    <>
      {b && (
        <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <button type="button" aria-label="Voltar ao guia" title="Voltar ao guia" onClick={() => pick(null)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><ArrowLeft className="h-4 w-4" /></button>
          <h2 className="min-w-0 flex-1 truncate text-sm text-white">{b.game}</h2>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!b && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2 p-4">
            {GUIDE_BIRDS.map(o => (
              <button key={o.id} type="button" onClick={() => pick(o.id)} className="grid min-w-0 content-start gap-1 rounded-lg border border-white/10 bg-[#0b110e] p-1.5 text-left hover:border-primary">
                <SoulCanvas look={lookOf(o)} most={1.2} className={`h-20 w-full ${sky}`} />
                <span className="min-h-[30px] px-0.5 text-[12px] leading-[15px] text-white">{o.game}</span>
                <span className="truncate px-0.5 text-[10px] text-[#93a79a]">{o.name}</span>
              </button>
            ))}
          </div>
        )}
        {b && (
          <div className="grid gap-3 px-4 py-3">
            <button type="button" aria-label={clips.length ? `${b.name}: ouvir o próximo canto` : b.name} title={clips.length ? "Ouvir" : undefined} onClick={() => sing(b.id)} className="block w-full">
              <SoulCanvas look={lookOf(b)} most={3.4} live className={`h-36 w-full ${sky}`} />
            </button>
            <div className="grid gap-2">
              <div className={row}><span>Nome popular</span><span className="text-right text-white">{b.name}</span></div>
              <div className={row}><span>Nome científico</span><i className="text-right text-white">{b.sci}</i></div>
              <div className={row}><span>Família</span><span className="text-white">{b.family}</span></div>
              <div className={row}><span>Tamanho</span><span className="text-white">{String(b.cm).replace(".", ",")} cm</span></div>
              <div className={row}><span>Onde vive</span><span className="text-right text-white">{b.where}</span></div>
            </div>
            <p className="leading-relaxed text-white">{b.about}</p>
            {clips.length > 0 && (
              <div className="grid gap-1.5">
                <h3 className={head}>Cantos reais</h3>
                {clips.map(c => (
                  <div key={c.file} className="flex items-center gap-2">
                    <button type="button" aria-pressed={playing === c.file} onClick={() => (playing === c.file ? stop() : play(c))} className={playing === c.file ? "h-8 shrink-0 rounded-md border border-primary bg-primary/20 px-2 text-white" : "h-8 shrink-0 rounded-md border border-white/15 px-2 text-[#b9c7b9] hover:border-primary"}>{clipName(c, clips)}</button>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" title={`${c.license} · ${c.country}`} className="min-w-0 truncate text-[11px] text-[#93a79a] hover:text-white hover:underline">{c.by} · XC{c.xc}</a>
                  </div>
                ))}
              </div>
            )}
            {souls.length > 0 && (
              <div className="grid gap-1.5">
                <h3 className={head}>Almas inspiradas</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
                  {souls.map(e => {
                    const shown = !!col[e.id]
                    return (
                      <button key={e.id} type="button" disabled={!shown} aria-label={shown ? e.name : "Alma ainda não capturada"} onClick={() => onSoul?.(e.id)} className="grid min-w-0 content-start gap-1 rounded-lg border border-white/10 bg-[#0b110e] p-1.5 text-left enabled:hover:border-primary">
                        <SoulCanvas look={e.look} found={shown} most={0.9} className="h-14 w-full rounded-md bg-[#1b2531]" />
                        <span className={shown ? "min-h-[26px] px-0.5 text-[11px] leading-[13px] text-white" : "min-h-[26px] px-0.5 text-[11px] leading-[13px] text-white/30"}>{shown ? e.name : "???"}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
