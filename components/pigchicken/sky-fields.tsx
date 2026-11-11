"use client"

// Configurações do Pátio → Céu e luz: the hour, the sky's gradient (by the hour or band by band), sun, clouds,
// texture, haze, the contraluz and the light on the Pátio, and Randomize. Saved with the Pátio (settings.sky).
import { Plus, X } from "lucide-react"
import { PatioRange } from "@/components/ui/patio-range"
import { cn } from "@/lib/utils"
import { SKY_DEFAULT, SKY_HOUR, SKY_PCT, SKY_STOPS, SKY_SUN, hourLabel, hourStops, randomSky, skyLook, stopColor, type SkyParams, type SkyStop } from "@/lib/pigchicken/sky"

const BTN = "h-7 rounded-md border border-white/20 px-2 hover:border-[#ffd166]"

export function SkyFields({ sky, onChange }: { sky: SkyParams | undefined; onChange: (sky: SkyParams | undefined) => void }) {
  const s = sky ?? SKY_DEFAULT
  const set = (p: Partial<SkyParams>) => onChange({ ...s, ...p })
  const look = skyLook(s)
  const stops = look.stops
  const setStop = (i: number, p: Partial<SkyStop>) => set({ follow: false, stops: stops.map((st, k) => (k === i ? { ...st, ...p } : st)).sort((a, b) => a.at - b.at) })
  const addStop = () => {
    if (stops.length >= SKY_STOPS.max) return
    // in the widest gap, with the colour already there
    let gap = 0
    for (let i = 1; i < stops.length; i++) if (stops[i].at - stops[i - 1].at > stops[gap + 1].at - stops[gap].at) gap = i - 1
    const at = Math.round(((stops[gap].at + stops[gap + 1].at) / 2) * 100) / 100
    set({ follow: false, stops: [...stops, { at, color: stopColor(stops, at) }].sort((a, b) => a.at - b.at) })
  }
  const pct = (label: string, key: "glow" | "clouds" | "texture" | "haze" | "silhouette" | "light", hint: string) => (
    <PatioRange label={label} min={SKY_PCT.min} max={SKY_PCT.max} step={SKY_PCT.step} value={s[key]} display={`${s[key]}%`}
      changed={!!sky && s[key] !== SKY_DEFAULT[key]} onReset={() => set({ [key]: SKY_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={hint} />
  )
  const gradient = `linear-gradient(to bottom, ${stops.map(st => `${st.color} ${Math.round(st.at * 100)}%`).join(", ")})`
  return (
    <section className="grid gap-2 border-t border-white/10 pt-3" aria-label="Céu e luz">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-[10px] uppercase tracking-wider text-[#93a79a]">Céu e luz</h3>
        <button type="button" className={BTN} onClick={() => onChange(randomSky(Math.random, sky ? { light: s.light } : undefined))} title="Sorteia hora, faixas de cor, sol, nuvens, textura, névoa e contraluz">Randomize</button>
        {sky && <button type="button" className={BTN} onClick={() => onChange(undefined)} title="Volta ao entardecer clássico do Pátio">Clássico</button>}
      </div>
      <div className="grid grid-cols-[44px_1fr] gap-2">
        <div aria-hidden="true" className="relative h-full min-h-24 overflow-hidden rounded-md border border-white/10" style={{ background: gradient }}>
          {look.sun.opacity > 0 && <span className="absolute left-1/2 size-3 -translate-x-1/2 rounded-full" style={{ top: `${Math.max(4, Math.min(92, (look.sun.y / 900) * 100))}%`, background: look.sun.color, boxShadow: `0 0 10px ${look.sun.color}` }} />}
        </div>
        <div className="grid gap-[3px]">
          <PatioRange label="Hora do dia" min={SKY_HOUR.min} max={SKY_HOUR.max} step={SKY_HOUR.step} value={s.hour} display={hourLabel(s.hour)}
            changed={!!sky && s.hour !== SKY_DEFAULT.hour} onReset={() => set({ hour: SKY_DEFAULT.hour })} onChange={hour => set({ hour, ...(s.follow ? { stops: hourStops(hour) } : {}) })}
            hint="Posição do sol e da lua e a luz sobre o Pátio. Com Cores pela hora, também as cores do céu." />
          <label className="flex h-9 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title="As cores do céu seguem a hora do dia. Mexer numa cor desliga.">
            <span>Cores pela hora</span>
            <input type="checkbox" checked={s.follow} onChange={e => set(e.target.checked ? { follow: true, stops: hourStops(s.hour) } : { follow: false, stops })} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
        </div>
      </div>
      {!s.follow && <div className="grid gap-1" aria-label="Faixas do degradê">
        {stops.map((st, i) => (
          <div key={i} className="grid grid-cols-[32px_1fr_28px] items-center gap-1.5">
            <input type="color" aria-label={`Cor ${i + 1}`} value={st.color} onChange={e => setStop(i, { color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
            <PatioRange label={i === 0 ? "Topo" : i === stops.length - 1 ? "Horizonte" : `Faixa ${i + 1}`} min={0} max={100} value={Math.round(st.at * 100)} display={`${Math.round(st.at * 100)}%`}
              onChange={v => setStop(i, { at: v / 100 })} />
            <button type="button" aria-label={`Tirar cor ${i + 1}`} disabled={stops.length <= SKY_STOPS.min} onClick={() => set({ follow: false, stops: stops.filter((_, k) => k !== i) })}
              className="inline-flex h-8 w-7 items-center justify-center rounded-md border border-white/15 hover:border-[#ffd166] disabled:opacity-30"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button type="button" disabled={stops.length >= SKY_STOPS.max} onClick={addStop} className={cn(BTN, "inline-flex items-center justify-center gap-1 disabled:opacity-30")}><Plus className="h-3.5 w-3.5" />Cor</button>
      </div>}
      <div className="grid gap-[3px]">
        <PatioRange label="Tamanho do sol" min={SKY_SUN.min} max={SKY_SUN.max} step={SKY_SUN.step} value={s.sunSize} display={`${s.sunSize}`}
          changed={!!sky && s.sunSize !== SKY_DEFAULT.sunSize} onReset={() => set({ sunSize: SKY_DEFAULT.sunSize })} onChange={sunSize => set({ sunSize })} />
        {pct("Brilho do sol", "glow", "O halo do sol e a luz ao longo do horizonte embaixo dele.")}
        {pct("Nuvens", "clouds", "Quantas nuvens; elas pegam a cor do sol e do céu.")}
        {pct("Textura", "texture", "Um grão suave com estrias horizontais por cima do céu.")}
        {pct("Névoa", "haze", "As montanhas, as árvores ao longe e os postes no fundo somem na cor do horizonte.")}
        {pct("Contraluz", "silhouette", "O cenário escurece até virar silhueta contra o céu. Bonecos, itens e tiros mantêm as cores.")}
        {pct("Luz no pátio", "light", "Quanto a hora do dia ilumina, escurece e esquenta o cenário do Pátio.")}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <label className="flex h-9 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3"><span>Montanhas</span>
          <input type="checkbox" checked={s.mountains} onChange={e => set({ mountains: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" /></label>
        <label className="flex h-9 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3"><span>Mata ao longe</span>
          <input type="checkbox" checked={s.forest} onChange={e => set({ forest: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" /></label>
      </div>
    </section>
  )
}
