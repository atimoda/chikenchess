"use client"

// Configurações do Pátio → Céu e luz: the hour, the sky's gradient (by the hour or band by band) and its curvature,
// sun, clouds, texture, haze, the contraluz and the light on the Pátio, and Randomize. Saved with the Pátio
// (settings.sky). → Montanhas: MountainFields (settings.mountains). → Nuvens: CloudFields (settings.clouds).
// → Aurora: AuroraFields (settings.aurora).
import { Plus, X } from "lucide-react"
import { PatioRange } from "@/components/ui/patio-range"
import { cn } from "@/lib/utils"
import { SKY_DEFAULT, SKY_GLOW, SKY_HOUR, SKY_PCT, SKY_RADIAL_SIZE, SKY_RADIAL_X, SKY_SCALE, SKY_STAR_COUNT, SKY_BLENDS, SKY_STAR_GLOW, SKY_STOPS, SKY_SUN, SKY_TEX_SCALE, hourLabel, hourStops, randomSky, skyGradient, skyLook, skyRadial, stopColor, type SkyParams, type SkyStop } from "@/lib/pigchicken/sky"
import { MOUNTAINS_DEFAULT, MOUNTAIN_LIFT, MOUNTAIN_OPACITY, MOUNTAIN_PCT, MOUNTAIN_PEAKS, MOUNTAIN_RANGES, MOUNTAIN_SCALE, MOUNTAIN_SHADES, MOUNTAIN_SHAPES, MOUNTAIN_SNOWS, type MountainParams } from "@/lib/pigchicken/mountains"
import { SNOWFALL_DEFAULT, SNOWFALL_OPACITY, SNOWFALL_PCT, SNOWFALL_SIZE, SNOWFALL_SPEED, SNOWFALL_WIND, type SnowfallParams } from "@/lib/pigchicken/snowfall"
import { AURORA_AMOUNT, AURORA_BANDS, AURORA_DEFAULT, AURORA_PCT, AURORA_SCALE, AURORA_SHAPES, AURORA_SPEED, type AuroraParams } from "@/lib/pigchicken/aurora"
import { CLOUDS_DEFAULT, CLOUD_KINDS, CLOUD_OPACITY, CLOUD_PCT, CLOUD_SCALE, CLOUD_SHAPES, CLOUD_WIND, type CloudParams } from "@/lib/pigchicken/clouds"
import { useT, msg } from "@/lib/i18n"

const BTN = "h-7 rounded-md border border-white/20 px-2 hover:border-[#ffd166]"

// a row of options, one chosen
function Choice<T extends string>({ label, options, value, onChange, title }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; title?: string }) {
  const t = useT()
  return (
    <div role="radiogroup" aria-label={label} title={title} className="grid gap-field" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={cn("h-8 truncate rounded-md border px-1", value === o.id ? "border-primary bg-primary/15 text-white" : "border-white/15 hover:border-white/40")}>{t(o.label)}</button>
      ))}
    </div>
  )
}

export function SkyFields({ sky, onChange }: { sky: SkyParams | undefined; onChange: (sky: SkyParams | undefined) => void }) {
  const t = useT()
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
  const scaled = (label: string, key: "glowSize", r: { min: number; max: number; step: number }, hint: string) => (
    <PatioRange label={t(label)} min={r.min} max={r.max} step={r.step} value={s[key]} display={`${s[key]}%`}
      changed={!!sky && s[key] !== SKY_DEFAULT[key]} onReset={() => set({ [key]: SKY_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={t(hint)} />
  )
  const pct = (label: string, key: "clouds" | "texture" | "haze" | "silhouette" | "light" | "radial" | "radialY" | "sunSoft", hint: string) => (
    <PatioRange label={t(label)} min={SKY_PCT.min} max={SKY_PCT.max} step={SKY_PCT.step} value={s[key]} display={`${s[key]}%`}
      changed={!!sky && s[key] !== SKY_DEFAULT[key]} onReset={() => set({ [key]: SKY_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={t(hint)} />
  )
  // the preview: the same gradient over a box PREVIEW px tall, the sun in its middle
  // (the sky spans 1070 world units from its top band to the horizon, the sun's y counted from 200 above the top)
  const unit = PREVIEW / 1070, sunTop = Math.max(4, Math.min(92, ((look.sun.y + 200) / 1070) * 100))
  const gradient = skyRadial(look, 0, 0, PREVIEW, PREVIEW_W / 2, (look.sun.y + 200) * unit, unit) ?? skyGradient(look, 0, 0, PREVIEW)
  const moved = (label: string, key: "sunX" | "sunLift", hint: string) => (
    <PatioRange label={t(label)} min={SKY_RADIAL_X.min} max={SKY_RADIAL_X.max} step={SKY_RADIAL_X.step} value={s[key]} display={s[key] === 0 ? (key === "sunX" ? t("no lugar") : t("pela hora")) : `${s[key] > 0 ? "+" : ""}${s[key]}`}
      changed={s[key] !== SKY_DEFAULT[key]} onReset={() => set({ [key]: SKY_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={t(hint)} />
  )
  return (
    <div className="grid gap-field px-4 pb-4">
      <div className="flex items-center justify-end gap-2">
        <button type="button" className={BTN} onClick={() => onChange(randomSky(Math.random, sky ? { light: s.light } : undefined))} title={t("Sorteia hora, faixas de cor, sol, nuvens, textura, névoa e contraluz")}>{t("Randomize")}</button>
        {sky && <button type="button" className={BTN} onClick={() => onChange(undefined)} title={t("Volta ao entardecer clássico do Pátio")}>{t("Clássico")}</button>}
      </div>
      <div className="grid grid-cols-[96px_1fr] gap-2">
        <div aria-hidden="true" className="relative overflow-hidden rounded-md border border-white/10" style={{ background: gradient, width: PREVIEW_W, height: PREVIEW }}>
          {look.sun.opacity > 0 && <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `calc(50% + ${(look.sun.x * unit).toFixed(1)}px)`, top: `${sunTop}%`, background: look.sun.color, boxShadow: `0 0 ${Math.round(10 + look.sun.soft * 8)}px ${look.sun.glowColor}`, filter: look.sun.soft > 0 ? `blur(${(look.sun.soft * 2.5).toFixed(1)}px)` : undefined }} />}
        </div>
        <div className="grid gap-field">
          <PatioRange label={t("Hora do dia")} min={SKY_HOUR.min} max={SKY_HOUR.max} step={SKY_HOUR.step} value={s.hour} display={hourLabel(s.hour)}
            changed={!!sky && s.hour !== SKY_DEFAULT.hour} onReset={() => set({ hour: SKY_DEFAULT.hour })} onChange={hour => set({ hour, ...(s.follow ? { stops: hourStops(hour) } : {}) })}
            hint={t("Posição do sol e da lua e a luz sobre o Pátio. Com Cores pela hora, também as cores do céu.")} />
          <label className="flex h-9 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title={t("As cores do céu seguem a hora do dia. Mexer numa cor desliga.")}>
            <span>{t("Cores pela hora")}</span>
            <input type="checkbox" checked={s.follow} onChange={e => set(e.target.checked ? { follow: true, stops: hourStops(s.hour) } : { follow: false, stops })} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
        </div>
      </div>
      {!s.follow && <div className="grid gap-field" aria-label={t("Faixas do degradê")}>
        {stops.map((st, i) => (
          <div key={i} className="grid grid-cols-[32px_1fr_28px] items-center gap-1.5">
            <input type="color" aria-label={t("Cor {v}", { v: i + 1 })} value={st.color} onChange={e => setStop(i, { color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
            <PatioRange label={i === 0 ? t("Topo") : i === stops.length - 1 ? t("Horizonte") : t("Faixa {v}", { v: i + 1 })} min={0} max={100} value={Math.round(st.at * 100)} display={`${Math.round(st.at * 100)}%`}
              onChange={v => setStop(i, { at: v / 100 })} />
            <button type="button" aria-label={t("Tirar cor {v}", { v: i + 1 })} disabled={stops.length <= SKY_STOPS.min} onClick={() => set({ follow: false, stops: stops.filter((_, k) => k !== i) })}
              className="inline-flex h-8 w-7 items-center justify-center rounded-md border border-white/15 hover:border-[#ffd166] disabled:opacity-30"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button type="button" disabled={stops.length >= SKY_STOPS.max} onClick={addStop} className={cn(BTN, "inline-flex items-center justify-center gap-1 disabled:opacity-30")}><Plus className="h-3.5 w-3.5" />{t("Cor")}</button>
      </div>}
      <div className="grid gap-field">
        {pct(msg("Curvatura"), "radial", msg("Curva as faixas do céu em anéis em volta do sol. 0: faixas retas."))}
        {s.radial > 0 && <>
          <PatioRange label={t("Centro")} min={SKY_RADIAL_X.min} max={SKY_RADIAL_X.max} step={SKY_RADIAL_X.step} value={s.radialX} display={s.radialX === 0 ? t("sob o sol") : `${s.radialX > 0 ? "+" : ""}${s.radialX}`}
            changed={s.radialX !== SKY_DEFAULT.radialX} onReset={() => set({ radialX: SKY_DEFAULT.radialX })} onChange={radialX => set({ radialX })} hint={t("Move o centro dos anéis para os lados, a partir de baixo do sol.")} />
          {pct(s.radialSun ? msg("Centro abaixo do sol") : msg("Centro abaixo do horizonte"), "radialY", msg("Afunda o centro dos anéis: mais fundo, curvas mais abertas."))}
          <label className="flex h-9 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title={t("Os anéis ficam em volta do próprio sol, onde ele estiver: a cor do Horizonte no sol e a do Topo no anel de fora.")}>
            <span>{t("Anéis em volta do sol")}</span>
            <input type="checkbox" checked={s.radialSun} onChange={e => set({ radialSun: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <PatioRange label={t("Tamanho dos anéis")} min={SKY_RADIAL_SIZE.min} max={SKY_RADIAL_SIZE.max} step={SKY_RADIAL_SIZE.step} value={s.radialSize} display={`${s.radialSize}%`}
            changed={s.radialSize !== SKY_DEFAULT.radialSize} onReset={() => set({ radialSize: SKY_DEFAULT.radialSize })} onChange={radialSize => set({ radialSize })} hint={t("Anéis maiores espalham as cores para mais longe do centro.")} />
        </>}
        <PatioRange label={t("Tamanho do sol")} min={SKY_SUN.min} max={SKY_SUN.max} step={SKY_SUN.step} value={s.sunSize} display={`${s.sunSize}`}
          changed={!!sky && s.sunSize !== SKY_DEFAULT.sunSize} onReset={() => set({ sunSize: SKY_DEFAULT.sunSize })} onChange={sunSize => set({ sunSize })} />
        <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
          <input type="color" aria-label={t("Cor do sol")} value={s.sunColor || look.sun.color} onChange={e => set({ sunColor: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
          <button type="button" disabled={!s.sunColor} onClick={() => set({ sunColor: "" })} title={t("O sol volta a ter a cor da hora do dia")} className={cn(BTN, "h-10 text-left disabled:opacity-40")}>{s.sunColor ? t("Cor do sol: voltar à da hora") : t("Cor do sol: a da hora")}</button>
        </div>
        {pct(msg("Suavidade do sol"), "sunSoft", msg("A borda do sol: de um disco recortado a uma mancha que se desfaz no brilho."))}
        {moved(msg("Posição do sol"), "sunX", msg("Move o sol para a esquerda ou para a direita."))}
        {moved(msg("Altura do sol"), "sunLift", msg("Sobe ou desce o sol a partir de onde a hora o põe, sem mudar a luz da hora."))}
        <PatioRange label={t("Brilho do sol")} min={SKY_GLOW.min} max={SKY_GLOW.max} step={SKY_GLOW.step} value={s.glow} display={`${s.glow}%`}
          changed={!!sky && s.glow !== SKY_DEFAULT.glow} onReset={() => set({ glow: SKY_DEFAULT.glow })} onChange={glow => set({ glow })} hint={t("A força do halo do sol e da luz ao longo do horizonte embaixo dele. Acima de 100%, o halo toma o céu em volta.")} />
        {scaled(msg("Alcance do brilho"), "glowSize", SKY_SCALE, msg("Até onde o brilho radiante do sol se espalha."))}
        <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
          <input type="color" aria-label={t("Cor do brilho")} value={s.glowColor || look.sun.glowColor} onChange={e => set({ glowColor: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
          <button type="button" disabled={!s.glowColor} onClick={() => set({ glowColor: "" })} title={t("O brilho volta a ter a cor do sol")} className={cn(BTN, "h-10 text-left disabled:opacity-40")}>{s.glowColor ? t("Cor do brilho: voltar à do sol") : t("Cor do brilho: a do sol")}</button>
        </div>
        {pct(msg("Textura"), "texture", msg("Um grão suave com estrias horizontais por cima do céu."))}
        {s.texture > 0 && <>
          <PatioRange label={t("Tamanho da textura")} min={SKY_TEX_SCALE.min} max={SKY_TEX_SCALE.max} step={SKY_TEX_SCALE.step} value={s.texScale} display={`${s.texScale}%`}
            changed={s.texScale !== SKY_DEFAULT.texScale} onReset={() => set({ texScale: SKY_DEFAULT.texScale })} onChange={texScale => set({ texScale })} hint={t("O tamanho das estrias e do grão.")} />
          <PatioRange label={t("Estrias")} min={0} max={100} value={s.texStreak} display={`${s.texStreak}%`}
            changed={s.texStreak !== SKY_DEFAULT.texStreak} onReset={() => set({ texStreak: SKY_DEFAULT.texStreak })} onChange={texStreak => set({ texStreak })} hint={t("As faixas longas e horizontais, como pinceladas.")} />
          <PatioRange label={t("Grão")} min={0} max={100} value={s.texGrain} display={`${s.texGrain}%`}
            changed={s.texGrain !== SKY_DEFAULT.texGrain} onReset={() => set({ texGrain: SKY_DEFAULT.texGrain })} onChange={texGrain => set({ texGrain })} hint={t("O pontilhado fino, como papel.")} />
          <div role="radiogroup" aria-label={t("Mistura da textura")} className="grid grid-cols-4 gap-field" title={t("Como a textura se mistura às cores do céu")}>
            {SKY_BLENDS.map(b => (
              <button key={b.id} type="button" role="radio" aria-checked={s.texBlend === b.id} onClick={() => set({ texBlend: b.id })}
                className={cn("h-8 rounded-md border", s.texBlend === b.id ? "border-primary bg-primary/15 text-white" : "border-white/15 hover:border-white/40")}>{t(b.label)}</button>
            ))}
          </div>
        </>}
        {pct(msg("Névoa"), "haze", msg("As montanhas, as árvores ao longe e os postes no fundo somem na cor do horizonte."))}
        {pct(msg("Contraluz"), "silhouette", msg("O cenário escurece até virar silhueta contra o céu. Bonecos, itens e tiros mantêm as cores."))}
        {pct(msg("Luz no pátio"), "light", msg("Quanto a hora do dia ilumina, escurece e esquenta o cenário do Pátio."))}
      </div>
      <div className="grid">
        <label className="flex h-9 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3" title={t("As duas fileiras de árvores do fundo. Cada uma se ajusta em Mata.")}><span>{t("Mata")}</span>
          <input type="checkbox" checked={s.forest} onChange={e => set({ forest: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" /></label>
      </div>
    </div>
  )
}

const PREVIEW = 120, PREVIEW_W = 96

// Configurações do Pátio → Estrelas: how many, how big, how bright. Saved in the sky (settings.sky); with the
// classic sky, changing one starts the Pátio's own sky. When they show follows the hour and the sky's dark, unless
// "Mostrar estrelas a qualquer hora do dia" (starsAlways) is on.
export function StarFields({ sky, onChange }: { sky: SkyParams | undefined; onChange: (sky: SkyParams) => void }) {
  const t = useT()
  const s = sky ?? SKY_DEFAULT
  const set = (p: Partial<SkyParams>) => onChange({ ...s, ...p })
  const changed = s.starCount !== SKY_DEFAULT.starCount || s.starSize !== SKY_DEFAULT.starSize || s.starGlow !== SKY_DEFAULT.starGlow || s.starsAlways !== SKY_DEFAULT.starsAlways
  const range = (label: string, key: "starCount" | "starSize" | "starGlow", r: { min: number; max: number; step: number }, hint: string) => (
    <PatioRange label={t(label)} min={r.min} max={r.max} step={r.step} value={s[key]} display={`${s[key]}%`}
      changed={s[key] !== SKY_DEFAULT[key]} onReset={() => set({ [key]: SKY_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={t(hint)} />
  )
  return (
    <div className="grid gap-field px-4 pb-4">
      {changed && <div className="flex justify-end">
        <button type="button" className={BTN} onClick={() => set({ starCount: SKY_DEFAULT.starCount, starSize: SKY_DEFAULT.starSize, starGlow: SKY_DEFAULT.starGlow, starsAlways: SKY_DEFAULT.starsAlways })}>{t("Padrão")}</button>
      </div>}
      {range(msg("Quantidade"), "starCount", SKY_STAR_COUNT, msg("Quantas estrelas. Elas aparecem conforme a hora e o escuro do céu."))}
      {range(msg("Tamanho"), "starSize", SKY_SCALE, msg("O tamanho de cada estrela."))}
      {range(msg("Intensidade"), "starGlow", SKY_STAR_GLOW, msg("O brilho das estrelas; acima de 100% elas já aparecem no crepúsculo."))}
      <label className="flex min-h-9 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3 py-1.5">
        <span>{t("Mostrar estrelas a qualquer hora do dia")}</span>
        <input type="checkbox" checked={s.starsAlways} onChange={e => set({ starsAlways: e.target.checked })} className="h-5 w-5 shrink-0 accent-[var(--primary)]" /></label>
    </div>
  )
}

// Configurações do Pátio → Montanhas: the far ranges' shape; their colours still follow the sky
export function MountainFields({ mountains, onChange }: { mountains: MountainParams | undefined; onChange: (m: MountainParams | undefined) => void }) {
  const t = useT()
  const m = mountains ?? MOUNTAINS_DEFAULT
  const set = (p: Partial<MountainParams>) => onChange({ ...m, ...p })
  const pctRange = (label: string, key: "shade" | "snowEdge" | "snowShade" | "gradient" | "snowSide", hint: string) => (
    <PatioRange label={t(label)} min={MOUNTAIN_PCT.min} max={MOUNTAIN_PCT.max} step={MOUNTAIN_PCT.step} value={m[key]} display={`${m[key]}%`}
      changed={m[key] !== MOUNTAINS_DEFAULT[key]} onReset={() => set({ [key]: MOUNTAINS_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={t(hint)} />
  )
  const range = (label: string, key: "height" | "rough", hint: string) => (
    <PatioRange label={t(label)} min={MOUNTAIN_SCALE.min} max={MOUNTAIN_SCALE.max} step={MOUNTAIN_SCALE.step} value={m[key]} display={`${m[key]}%`}
      changed={m[key] !== MOUNTAINS_DEFAULT[key]} onReset={() => set({ [key]: MOUNTAINS_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={t(hint)} />
  )
  return (
    <div className="grid gap-field px-4 pb-4">
      <div className="flex items-center gap-2">
        <label className="flex h-9 flex-1 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3"><span>{t("Mostrar")}</span>
          <input type="checkbox" checked={m.show} onChange={e => set({ show: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" /></label>
        <button type="button" className={BTN} disabled={!m.show} onClick={() => set({ shape: (m.shape + 1 + Math.floor(Math.random() * (MOUNTAIN_SHAPES - 1))) % MOUNTAIN_SHAPES })} title={t("Desenha outras montanhas com a mesma altura e recorte")}>{t("Sortear forma")}</button>
        {mountains && <button type="button" className={BTN} onClick={() => onChange(undefined)} title={t("Volta às montanhas de sempre")}>{t("Padrão")}</button>}
      </div>
      {m.show && <>
        <PatioRange label={t("Cordilheiras")} min={MOUNTAIN_RANGES.min} max={MOUNTAIN_RANGES.max} step={MOUNTAIN_RANGES.step} value={m.ranges} display={m.ranges}
          changed={m.ranges !== MOUNTAINS_DEFAULT.ranges} onReset={() => set({ ranges: MOUNTAINS_DEFAULT.ranges })} onChange={ranges => set({ ranges })} hint={t("Quantas fileiras de montanhas, da mais distante para a mais perto.")} />
        <PatioRange label={t("Altura")} min={MOUNTAIN_LIFT.min} max={MOUNTAIN_LIFT.max} step={MOUNTAIN_LIFT.step} value={m.lift} display={m.lift > 0 ? `+${m.lift}` : m.lift}
          changed={m.lift !== MOUNTAINS_DEFAULT.lift} onReset={() => set({ lift: MOUNTAINS_DEFAULT.lift })} onChange={lift => set({ lift })} hint={t("Sobe (ou afunda) as montanhas na tela.")} />
        <Choice label={t("Tipo de pico")} options={MOUNTAIN_PEAKS} value={m.peak} onChange={peak => set({ peak })} title={t("Ondulado: morros arredondados. Pontudo: encostas côncavas e recortadas. Geométrico: triângulos retos.")} />
        {range(msg("Inclinação"), "height", msg("Quão íngremes e altos são os picos em relação ao pé."))}
        {range(msg("Recorte"), "rough", msg("Mais alto: picos mais estreitos e numerosos. Mais baixo: morros largos e suaves."))}
        {pctRange(msg("Relevo"), "shade", msg("Escurece as faces do lado oposto à luz, como num desenho."))}
        {m.shade > 0 && <Choice label={t("Sombra")} options={MOUNTAIN_SHADES} value={m.shadeStyle} onChange={shadeStyle => set({ shadeStyle })} title={t("Encostas: cada descida à direita. Meio a meio: o pico rachado do topo ao pé. Vincos: cunhas descendo dos picos.")} />}
        {pctRange(msg("Degradê"), "gradient", msg("Mais escuras no alto e mais claras no pé."))}
        <PatioRange label={t("Opacidade")} min={MOUNTAIN_OPACITY.min} max={MOUNTAIN_OPACITY.max} step={MOUNTAIN_OPACITY.step} value={m.opacity} display={`${m.opacity}%`}
          changed={m.opacity !== MOUNTAINS_DEFAULT.opacity} onReset={() => set({ opacity: MOUNTAINS_DEFAULT.opacity })} onChange={opacity => set({ opacity })} hint={t("Abaixo de 100%, uma cordilheira deixa ver a de trás.")} />
        <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
          <input type="color" aria-label={t("Cor do contorno")} value={m.outlineColor} onChange={e => set({ outlineColor: e.target.value, outline: m.outline || 40 })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
          <PatioRange label={t("Contorno")} min={MOUNTAIN_PCT.min} max={MOUNTAIN_PCT.max} step={MOUNTAIN_PCT.step} value={m.outline} display={`${m.outline}%`}
            changed={m.outline !== MOUNTAINS_DEFAULT.outline} onReset={() => set({ outline: MOUNTAINS_DEFAULT.outline })} onChange={outline => set({ outline })} hint={t("Uma linha ao longo dos picos, na cor escolhida.")} />
        </div>
        <PatioRange label={t("Neve nos picos")} min={MOUNTAIN_PCT.min} max={MOUNTAIN_PCT.max} step={MOUNTAIN_PCT.step} value={m.snow} display={`${m.snow}%`}
          changed={m.snow !== MOUNTAINS_DEFAULT.snow} onReset={() => set({ snow: MOUNTAINS_DEFAULT.snow })} onChange={snow => set({ snow })} hint={t("Até onde a neve desce. Ela pega a luz do sol.")} />
        {m.snow > 0 && <>
          <label className="flex h-9 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3" title={t("Cada pico com a sua capa, do tamanho dele. Desligado: uma linha só, a partir do pico mais alto.")}>
            <span>{t("Neve em cada pico")}</span>
            <input type="checkbox" checked={m.snowPeaks} onChange={e => set({ snowPeaks: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <Choice label={t("Borda da neve")} options={MOUNTAIN_SNOWS} value={m.snowStyle} onChange={snowStyle => set({ snowStyle })} title={t("Línguas descendo, ondas arredondadas, borda suave, estrias pela encosta ou uma faixa na aresta.")} />
          {pctRange(msg("Recorte da neve"), "snowEdge", msg("Quanto a borda escolhida aparece: línguas mais longas, ondas mais fundas, mais estrias, faixa mais grossa."))}
          {pctRange(msg("Lado da luz"), "snowSide", msg("Puxa a neve para a encosta iluminada. 100%: nada do lado da sombra."))}
          {pctRange(msg("Sombra da neve"), "snowShade", msg("As faces da neve do lado oposto à luz ficam azuladas."))}
          <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
            <input type="color" aria-label={t("Cor da neve")} value={m.snowTint} onChange={e => set({ snowTint: e.target.value, snowTintAmount: m.snowTintAmount || 60 })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
            <PatioRange label={t("Cor da neve")} min={MOUNTAIN_PCT.min} max={MOUNTAIN_PCT.max} step={MOUNTAIN_PCT.step} value={m.snowTintAmount} display={`${m.snowTintAmount}%`}
              changed={m.snowTintAmount !== MOUNTAINS_DEFAULT.snowTintAmount} onReset={() => set({ snowTintAmount: MOUNTAINS_DEFAULT.snowTintAmount })} onChange={snowTintAmount => set({ snowTintAmount })} hint={t("Quanto a cor escolhida tinge a neve. 0: a luz do sol.")} />
          </div>
        </>}
        <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
          <input type="color" aria-label={t("Cor das montanhas")} value={m.tint} onChange={e => set({ tint: e.target.value, tintAmount: m.tintAmount || 50 })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
          <PatioRange label={t("Cor")} min={MOUNTAIN_PCT.min} max={MOUNTAIN_PCT.max} step={MOUNTAIN_PCT.step} value={m.tintAmount} display={`${m.tintAmount}%`}
            changed={m.tintAmount !== MOUNTAINS_DEFAULT.tintAmount} onReset={() => set({ tintAmount: MOUNTAINS_DEFAULT.tintAmount })} onChange={tintAmount => set({ tintAmount })} hint={t("Quanto a cor escolhida tinge as montanhas. 0: só a luz do céu.")} />
        </div>
      </>}
    </div>
  )
}

// Configurações do Pátio → Nuvens: how many, their size and height, softness, volume, wind and colour; their light
// still follows the sky
export function CloudFields({ clouds, skyClouds, onChange }: { clouds: CloudParams | undefined; skyClouds: number | undefined; onChange: (c: CloudParams | undefined) => void }) {
  const t = useT()
  const c = clouds ?? { ...CLOUDS_DEFAULT, amount: skyClouds ?? CLOUDS_DEFAULT.amount }
  const set = (p: Partial<CloudParams>) => onChange({ ...c, ...p })
  const range = (label: string, key: "amount" | "size" | "height" | "spread" | "opacity" | "soft" | "volume" | "wind" | "puffs" | "detail", r: { min: number; max: number; step: number }, hint: string) => (
    <PatioRange label={t(label)} min={r.min} max={r.max} step={r.step} value={c[key]} display={`${c[key]}%`}
      changed={c[key] !== CLOUDS_DEFAULT[key]} onReset={() => set({ [key]: CLOUDS_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={t(hint)} />
  )
  return (
    <div className="grid gap-field px-4 pb-4">
      <div className="flex items-center justify-end gap-2">
        <button type="button" className={BTN} onClick={() => set({ shape: (c.shape + 1 + Math.floor(Math.random() * (CLOUD_SHAPES - 1))) % CLOUD_SHAPES })} title={t("Desenha outras nuvens com os mesmos ajustes")}>{t("Sortear forma")}</button>
        {clouds && <button type="button" className={BTN} onClick={() => onChange(undefined)} title={t("Volta às nuvens de sempre")}>{t("Padrão")}</button>}
      </div>
      <Choice label={t("Tipo de nuvem")} options={CLOUD_KINDS} value={c.kind} onChange={kind => set({ kind })} title={t("Suaves: faixas baixas e transparentes. Cumulus: montes altos de gomos, claros do lado do sol e sombreados do outro.")} />
      {range(msg("Quantidade"), "amount", CLOUD_PCT, msg("Quantas nuvens. 0 tira todas."))}
      {range(msg("Tamanho"), "size", CLOUD_SCALE, msg("O tamanho de cada nuvem."))}
      {range(msg("Altura no céu"), "height", CLOUD_PCT, msg("Baixas, perto das montanhas, ou altas no céu."))}
      {range(msg("Espalhamento"), "spread", CLOUD_PCT, msg("0: todas na mesma altura. Mais alto: espalhadas para cima e para baixo."))}
      {range(msg("Opacidade"), "opacity", CLOUD_OPACITY, msg("Quão sólidas elas são."))}
      {range(msg("Suavidade"), "soft", CLOUD_PCT, msg("O desfoque das bordas. 0: recortadas."))}
      {range(msg("Volume"), "volume", CLOUD_PCT, msg("A sombra embaixo de cada nuvem e, nas Cumulus, entre os gomos."))}
      {c.kind === "cumulus" && <>
        {range(msg("Gomos"), "puffs", CLOUD_PCT, msg("Quantos montes cada nuvem tem."))}
        {range(msg("Desfiado"), "detail", CLOUD_PCT, msg("Gomos pequenos pelas bordas, que desmancham o contorno."))}
      </>}
      <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
        <input type="color" aria-label={t("Cor da sombra das nuvens")} value={c.shadeTint} onChange={e => set({ shadeTint: e.target.value, shadeTintAmount: c.shadeTintAmount || 60 })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
        <PatioRange label={t("Cor da sombra")} min={CLOUD_PCT.min} max={CLOUD_PCT.max} step={CLOUD_PCT.step} value={c.shadeTintAmount} display={`${c.shadeTintAmount}%`}
          changed={c.shadeTintAmount !== CLOUDS_DEFAULT.shadeTintAmount} onReset={() => set({ shadeTintAmount: CLOUDS_DEFAULT.shadeTintAmount })} onChange={shadeTintAmount => set({ shadeTintAmount })} hint={t("Quanto a cor escolhida tinge o lado sombreado. 0: a sombra do céu.")} />
      </div>
      {range(msg("Vento"), "wind", CLOUD_WIND, msg("A velocidade com que elas vão e voltam. 0: paradas."))}
      <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
        <input type="color" aria-label={t("Cor das nuvens")} value={c.tint} onChange={e => set({ tint: e.target.value, tintAmount: c.tintAmount || 50 })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
        <PatioRange label={t("Cor")} min={CLOUD_PCT.min} max={CLOUD_PCT.max} step={CLOUD_PCT.step} value={c.tintAmount} display={`${c.tintAmount}%`}
          changed={c.tintAmount !== CLOUDS_DEFAULT.tintAmount} onReset={() => set({ tintAmount: CLOUDS_DEFAULT.tintAmount })} onChange={tintAmount => set({ tintAmount })} hint={t("Quanto a cor escolhida tinge as nuvens. 0: só a luz do céu.")} />
      </div>
    </div>
  )
}

// Configurações do Pátio → Neve caindo: flakes over the far scenery (0 turns it off)
export function SnowfallFields({ snowfall, onChange }: { snowfall: SnowfallParams | undefined; onChange: (s: SnowfallParams | undefined) => void }) {
  const t = useT()
  const f = snowfall ?? SNOWFALL_DEFAULT
  const set = (p: Partial<SnowfallParams>) => onChange({ ...f, ...p })
  const range = (label: string, key: keyof SnowfallParams, r: { min: number; max: number; step: number }, hint: string, display?: string) => (
    <PatioRange label={t(label)} min={r.min} max={r.max} step={r.step} value={f[key]} display={display ?? `${f[key]}%`}
      changed={f[key] !== SNOWFALL_DEFAULT[key]} onReset={() => set({ [key]: SNOWFALL_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={t(hint)} />
  )
  return (
    <div className="grid gap-field px-4 pb-4">
      {range(msg("Quantidade"), "amount", SNOWFALL_PCT, msg("Quantos flocos caem. 0: nenhum."))}
      {f.amount > 0 && <>
        {range(msg("Tamanho"), "size", SNOWFALL_SIZE, msg("O tamanho dos flocos."))}
        {range(msg("Velocidade"), "speed", SNOWFALL_SPEED, msg("Quão rápido eles caem. 0: parados no ar."))}
        {range(msg("Vento"), "wind", SNOWFALL_WIND, msg("Para a esquerda (negativo) ou para a direita."), f.wind > 0 ? `+${f.wind}` : String(f.wind))}
        {range(msg("Opacidade"), "opacity", SNOWFALL_OPACITY, msg("Quão visíveis eles são."))}
      </>}
    </div>
  )
}

// Configurações do Pátio → Aurora: curtains of light in the sky (Intensidade 0 turns it off)
export function AuroraFields({ aurora, onChange }: { aurora: AuroraParams | undefined; onChange: (a: AuroraParams | undefined) => void }) {
  const t = useT()
  const a = aurora ?? AURORA_DEFAULT
  const set = (p: Partial<AuroraParams>) => onChange({ ...a, ...p })
  type Key = "amount" | "bands" | "width" | "height" | "lift" | "wave" | "rays" | "speed"
  const range = (label: string, key: Key, r: { min: number; max: number; step: number }, hint: string, display = `${a[key]}%`) => (
    <PatioRange label={t(label)} min={r.min} max={r.max} step={r.step} value={a[key]} display={display}
      changed={a[key] !== AURORA_DEFAULT[key]} onReset={() => set({ [key]: AURORA_DEFAULT[key] })} onChange={v => set({ [key]: v })} hint={t(hint)} />
  )
  const color = (label: string, key: "color" | "top") => (
    <label className="flex h-10 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3"><span className={a[key] !== AURORA_DEFAULT[key] ? "text-amber-300" : undefined}>{t(label)}</span>
      <input type="color" aria-label={t(label)} value={a[key]} onChange={e => set({ [key]: e.target.value })} className="h-7 w-7 cursor-pointer rounded border border-white/15 bg-transparent p-0" /></label>
  )
  return (
    <div className="grid gap-field px-4 pb-4">
      {a.amount > 0 && <div className="flex items-center justify-end gap-2">
        <button type="button" className={BTN} onClick={() => set({ shape: (a.shape + 1 + Math.floor(Math.random() * (AURORA_SHAPES - 1))) % AURORA_SHAPES })} title={t("Desenha outras cortinas com os mesmos ajustes")}>{t("Sortear forma")}</button>
        {aurora && <button type="button" className={BTN} onClick={() => onChange(undefined)} title={t("Tira a aurora")}>{t("Padrão")}</button>}
      </div>}
      {range(msg("Intensidade"), "amount", AURORA_AMOUNT, msg("Quão forte a aurora brilha. 0: nenhuma. Acima de 100%, raios mais claros."))}
      {a.amount > 0 && <>
        <div className="grid grid-cols-2 gap-field">{color(msg("Cor"), "color")}{color(msg("Cor do alto"), "top")}</div>
        {range(msg("Faixas"), "bands", AURORA_BANDS, msg("Quantas cortinas de luz pelo céu."), String(a.bands))}
        {range(msg("Largura"), "width", AURORA_SCALE, msg("O comprimento de cada cortina."))}
        {range(msg("Altura dos raios"), "height", AURORA_SCALE, msg("Até onde os raios sobem."))}
        {range(msg("Altura no céu"), "lift", AURORA_PCT, msg("Baixa, saindo de trás das montanhas, ou alta no céu."))}
        {range(msg("Ondulação"), "wave", AURORA_PCT, msg("Quanto as cortinas dobram. 0: retas."))}
        {range(msg("Raios"), "rays", AURORA_PCT, msg("Raios de comprimentos e brilhos diferentes. 0: um véu liso."))}
        {range(msg("Movimento"), "speed", AURORA_SPEED, msg("A velocidade com que elas balançam e cintilam. 0: paradas."))}
        <label className="flex h-9 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3" title={t("Ligado: aparece com o céu escuro e some de dia, como as estrelas. Desligado: em qualquer hora.")}>
          <span>{t("Só à noite")}</span>
          <input type="checkbox" checked={a.night} onChange={e => set({ night: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" /></label>
      </>}
    </div>
  )
}
