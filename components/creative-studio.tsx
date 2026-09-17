'use client'
import { Range } from './creative/parameter-range'
import { InstrumentParameters } from './creative/instrument-parameters'
import { MusicPerformanceControls } from './music-performance-controls'
import { InfoTip, HelpLabel } from './info-tip'
import { MusicTransitionView } from './music-transition-view'

import Link from 'next/link'
import { MusicReactionEditor } from './music-reaction-editor'
import type { ReactionContext } from '@/lib/music/reactions'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, FlaskConical, Pause, Play, Save, Upload } from 'lucide-react'
import { PiecesSVG } from './chessground-board'
import { useCreativeMusic } from '@/hooks/use-creative-music'
import { CREATIVE_STORAGE, ROOTS, SCALES, SOUNDS, createCreativeSession, createDusseldorfSession, creativeSnapshot, hasMaskBudget, hasPatternBudget, moveCreativePiece, parseCreativeSession, type CreativeSession } from '@/lib/music/creative'
import { PATTERN_RECIPES, patternRecipe } from '@/lib/music/pattern-library'
import { validateMusicSnapshot } from '@/lib/music/runtime'
import { EDITABLE_CITY_KITS, cityKitStorageKey, defaultCityKit, loadCityKit, previousCityKit, prepareCityKitForCreative } from '@/lib/music/city-kits'
import { getCityById } from '@/lib/cities-data'
import { STYLE_REVISION } from '@/lib/music/styled-kits'
import { createRandomCityKit } from '@/lib/music/random-kit'
import { SampleSourceControls, GrooveControls } from './music-lab-controls'
import { MusicTransportReadout, MusicVoiceReadout, MusicVoiceBadge } from './music-playback'
import { VersionChangelog } from './version-changelog'
import styles from './creative-studio.module.css'

const pieceNames = { p: 'Peão', n: 'Cavalo', b: 'Bispo', r: 'Torre', q: 'Rainha', k: 'Rei' }
const squares = Array.from({ length: 64 }, (_, i) => `${'abcdefgh'[i % 8]}${8 - Math.floor(i / 8)}`)
const PRESETS_STORAGE = `${CREATIVE_STORAGE}:kits`
type Instrument = CreativeSession['instruments'][string]
type Effects = CreativeSession['effects'][string]
type Mapping = CreativeSession['mappings'][string]

function messageOf(error: unknown) {
  if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) {
    return error.issues.slice(0, 2).map((issue: { message: string; path: string[] }) => `${issue.path.join('.')}: ${issue.message}`).join(' ')
  }
  return error instanceof Error ? error.message : 'Não foi possível carregar a configuração.'
}

export function CreativeStudio() {
  const [session, setSession] = useState(createCreativeSession)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState('w:b1')
  const [soloId, setSoloId] = useState<string | null>(null)
  const [mode, setMode] = useState<'move' | 'play'>('move')
  const [notice, setNotice] = useState('')
  const [kits, setKits] = useState<CreativeSession[]>([])
  const [chosenKit, setChosenKit] = useState('')
  const [stageCityId, setStageCityId] = useState('dusseldorf')
  const [pattern, setPattern] = useState('')
  const [recipeId, setRecipeId] = useState('')
  const [patternError, setPatternError] = useState('')
  const [sectionPattern, setSectionPattern] = useState('0')
  const [phrases, setPhrases] = useState<string[]>(['0'])
  const [mask, setMask] = useState('')
  const [formError, setFormError] = useState('')
  const drag = useRef<{ id: string; square: string; origin: string; x: number; y: number; moved: boolean } | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const dragVisualRef = useRef<HTMLSpanElement>(null)
  const [dragVisual, setDragVisual] = useState<{ id: string; svg: keyof typeof PiecesSVG; x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const [simulation, setSimulation] = useState<ReactionContext>({ ply:0, states:[{ trigger:'opening',color:'w',ply:0 }], events:[] })
  const [showCode, setShowCode] = useState(false)
  const music = useCreativeMusic(session, playing, soloId, simulation, showCode)
  const selected = session.pieces.find(p => p.id === selectedId)!
  const instrument = session.instruments[selectedId]
  const effects = session.effects[selectedId]
  const mapping = session.mappings[selectedId]
  const activeCount = session.pieces.filter(p => p.active).length
  const chosenRecipe = patternRecipe(recipeId)
  const savedPhrases = instrument.phrases?.length ? instrument.phrases : [instrument.notes]
  const formDirty = sectionPattern !== session.sectionPattern || mask !== (instrument.mask ?? '') || JSON.stringify(phrases) !== JSON.stringify(savedPhrases)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      try {
        const requestedCity = new window.URLSearchParams(window.location.search).get('city')
        const requestedKit = requestedCity ? loadCityKit(requestedCity) : null
        const saved = requestedKit ? JSON.stringify(prepareCityKitForCreative(requestedKit, requestedCity!)) : localStorage.getItem(CREATIVE_STORAGE)
        if (saved) {
          const parsed = parseCreativeSession(saved)
          await validateMusicSnapshot(creativeSnapshot(parsed, false))
          if (!cancelled) {
            setSession(parsed)
            if (parsed.cityId && getCityById(parsed.cityId)) setStageCityId(parsed.cityId)
          }
        }
        const savedKits: unknown = JSON.parse(localStorage.getItem(PRESETS_STORAGE) ?? '[]')
        if (Array.isArray(savedKits) && !cancelled) {
          setKits(savedKits.slice(0, 30).flatMap(kit => {
            try { return [parseCreativeSession(JSON.stringify(kit))] } catch { return [] }
          }))
        }
      } catch (error) {
        if (!cancelled) setNotice(`Não foi possível restaurar o rascunho: ${messageOf(error)}`)
      } finally { if (!cancelled) setReady(true) }
    }
    void restore()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      try { localStorage.setItem(CREATIVE_STORAGE, JSON.stringify(session)) }
      catch { setNotice('Armazenamento local indisponível. Exporte o kit para guardar suas alterações.') }
    }, 300)
    return () => clearTimeout(timer)
  }, [session, ready])

  useEffect(() => { setPattern(instrument.notes); setRecipeId(''); setPatternError('') }, [selectedId, instrument.notes])
  useEffect(() => {
    setPhrases(instrument.phrases?.length ? instrument.phrases : [instrument.notes])
    setMask(instrument.mask ?? '')
    setFormError('')
  }, [selectedId, instrument.notes, instrument.phrases, instrument.mask])
  useEffect(() => { setSectionPattern(session.sectionPattern); setFormError('') }, [session.sectionPattern])
  useEffect(() => {
    const cancel = () => { drag.current = null; setDragVisual(null); music.endAudition() }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel() }
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('blur', cancel); window.removeEventListener('keydown', escape) }
  }, [music.endAudition])

  const updateInstrument = useCallback((update: Partial<Instrument>) => {
    setSession(s => ({ ...s, instruments: { ...s.instruments, [selectedId]: { ...s.instruments[selectedId], ...update } } }))
  }, [selectedId])
  function updateEffects(update: Partial<Effects>) {
    setSession(s => ({ ...s, effects: { ...s.effects, [selectedId]: { ...s.effects[selectedId], ...update } } }))
  }
  async function applyMusicalConfiguration(candidate: CreativeSession) {
    setBusy(true)
    try {
      const clean = parseCreativeSession(JSON.stringify(candidate))
      await validateMusicSnapshot(creativeSnapshot(clean, false))
      setSession(clean)
      setNotice('Configuração aplicada ao kit. Salve o kit da fase para usar na próxima partida.')
    } finally { setBusy(false) }
  }
  function updateMapping(update: Partial<Mapping>) {
    setSession(s => ({ ...s, mappings: { ...s.mappings, [selectedId]: { ...s.mappings[selectedId], ...update } } }))
  }
  function toggleActive(id: string) {
    const currentlyActive = session.pieces.find(p => p.id === id)?.active
    if (!currentlyActive) setPlaying(true)
    else if (activeCount === 1) setPlaying(false)
    setSession(s => ({ ...s, pieces: s.pieces.map(p => p.id === id ? { ...p, active: !p.active } : p) }))
  }
  function stop() { setPlaying(false); music.endAudition(); drag.current = null; setNotice('Arranjo pausado.') }
  function select(id: string) { music.endAudition(); setSelectedId(id) }

  async function applyPattern() {
    const id = selectedId
    if (!hasPatternBudget(pattern)) {
      setPatternError('Use graus inteiros (−48 a 48), ~, grupos [], <>, vírgulas e operadores *, /, !, @. Limite de 512 caracteres e multiplicadores combinados de até 32.')
      return
    }
    setBusy(true)
    try {
      const recipe = patternRecipe(recipeId)
      const nextInstrument = { ...instrument, ...(recipe?.instrument ?? {}), ...(recipe ? { behavior: recipe.behavior, source: { kind: 'synth' as const }, groove: undefined, automations: undefined } : {}), pianoOnly: undefined, pianoRolls: undefined, selectedVariation: undefined, notes: pattern, phrases: undefined, mask: undefined }
      const candidate = { ...session, instruments: { ...session.instruments, [id]: nextInstrument } }
      await validateMusicSnapshot(creativeSnapshot(candidate, false))
      setSession(s => ({ ...s, instruments: { ...s.instruments, [id]: nextInstrument } }))
      setPatternError('')
      setNotice(recipe ? `Receita “${recipe.name}” aplicada. A próxima execução já usa timbre, envelope e frase novos.` : 'Padrão aplicado. A próxima execução já usa a nova frase.')
    } catch (error) { setPatternError(`O padrão anterior foi mantido. ${messageOf(error)}`) }
    finally { setBusy(false) }
  }

  async function applyForm() {
    const cleanPhrases = phrases.map(phrase => phrase.trim()).filter(Boolean)
    if (!hasPatternBudget(sectionPattern) || !cleanPhrases.length || cleanPhrases.length > 8 || cleanPhrases.some(phrase => !hasPatternBudget(phrase)) || (mask.trim() && !hasMaskBudget(mask))) {
      setFormError('Revise a timeline, as variações e a máscara. São aceitas até oito frases; a máscara usa x e ~ com a mesma mini-notação.')
      return
    }
    setBusy(true)
    try {
      const nextInstrument = { ...instrument, pianoOnly: undefined, pianoRolls: undefined, selectedVariation: undefined, notes: cleanPhrases[0], phrases: cleanPhrases.length > 1 ? cleanPhrases : undefined, mask: mask.trim() || undefined }
      const candidate = { ...session, sectionPattern, instruments: { ...session.instruments, [selectedId]: nextInstrument } }
      await validateMusicSnapshot(creativeSnapshot(candidate, false))
      setSession(candidate)
      setFormError('')
      setNotice(`Forma aplicada a “${instrument.name}”. As variações seguem a timeline comum sem reiniciar o transporte.`)
    } catch (error) { setFormError(`A forma anterior foi mantida. ${messageOf(error)}`) }
    finally { setBusy(false) }
  }

  async function loadSession(next: CreativeSession, autoplay = false) {
    setBusy(true)
    try {
      await validateMusicSnapshot(creativeSnapshot(next, false))
      music.endAudition(); drag.current = null; setDragVisual(null); setSoloId(null); setSimulation({ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]}); setSession(next); setPlaying(autoplay)
      if (next.cityId && getCityById(next.cityId)) setStageCityId(next.cityId)
      setNotice(`Kit “${next.name}” carregado${autoplay ? ' e tocando' : ' e pausado'}.`)
    } catch (error) { setNotice(`Kit não carregado: ${messageOf(error)}`) }
    finally { setBusy(false) }
  }
  async function loadStageKit(cityId: string, autoplay = true) {
    const cityKit = loadCityKit(cityId)
    if (!cityKit) { setNotice('Esta fase ainda não usa a nova engine de kits.'); return }
    await loadSession(prepareCityKitForCreative(cityKit, cityId), autoplay)
  }
  function saveKit() {
    if (!session.name.trim()) { setNotice('Dê um nome ao kit antes de salvar.'); return }
    const clean = parseCreativeSession(JSON.stringify({...session, catalogRevision: STYLE_REVISION}))
    const next = [...kits.filter(k => k.name !== clean.name), clean].slice(-30)
    try {
      localStorage.setItem(PRESETS_STORAGE, JSON.stringify(next))
      if (clean.cityId) localStorage.setItem(cityKitStorageKey(clean.cityId), JSON.stringify(clean))
      setKits(next); setChosenKit(clean.name)
      const city = EDITABLE_CITY_KITS.find(item => item.id === clean.cityId)
      setNotice(city
        ? `Kit “${clean.name}” salvo e vinculado à fase ${city.name}. A próxima partida já usará esta configuração.`
        : `Kit “${clean.name}” salvo neste navegador. Salvar com o mesmo nome atualiza o kit.`)
    } catch { setNotice('Não foi possível salvar localmente. Use Exportar kit.') }
  }
  function exportKit() {
    if (!session.name.trim()) { setNotice('Dê um nome ao kit antes de exportar.'); return }
    const url = window.URL.createObjectURL(new window.Blob([JSON.stringify(session, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = `${session.name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'kit'}.chickenchess.json`
    link.click()
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    setNotice('Kit exportado com instrumentos, padrões, posições e configurações.')
  }

  function squareAt(event: React.PointerEvent) {
    return document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-creative-square]')?.getAttribute('data-creative-square') ?? null
  }
  function updateDragVisual(event: React.PointerEvent, id: string) {
    const piece = session.pieces.find(item => item.id === id)
    const rect = boardRef.current?.getBoundingClientRect()
    if (!piece || !rect) return
    const x = (event.clientX - rect.left) * (boardRef.current!.offsetWidth / rect.width) - boardRef.current!.clientLeft
    const y = (event.clientY - rect.top) * (boardRef.current!.offsetHeight / rect.height) - boardRef.current!.clientTop
    if (dragVisualRef.current) {
      dragVisualRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(1.06)`
    } else {
      setDragVisual({ id, svg: `${piece.color}${piece.type.toUpperCase()}` as keyof typeof PiecesSVG, x, y })
    }
  }
  function pointerDown(event: React.PointerEvent, square: string) {
    if (event.button !== 0) return
    const piece = session.pieces.find(p => p.square === square)
    const id = mode === 'play' ? selectedId : piece?.id
    if (!id) return
    suppressClick.current = false
    if (mode === 'move') setSelectedId(id)
    drag.current = { id, square, origin: square, x: event.clientX, y: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    music.audition(id, square)
  }
  function pointerMove(event: React.PointerEvent) {
    if (!drag.current) return
    const square = squareAt(event)
    if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 5) {
      drag.current.moved = true
      if (mode === 'move') updateDragVisual(event, drag.current.id)
    }
    if (square && square !== drag.current.square) {
      drag.current.square = square
      music.audition(drag.current.id, square)
    }
  }
  function pointerUp(event: React.PointerEvent) {
    const current = drag.current
    if (!current) return
    const square = squareAt(event)
    if (mode === 'move' && current.moved && square && square !== current.origin) {
      setPlaying(true)
      setSession(s => moveCreativePiece(s, current.id, square))
    }
    suppressClick.current = current.moved || mode === 'play'
    drag.current = null
    setDragVisual(null)
    music.endAudition()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <main className={styles.studio}>
    <header className={styles.header}>
      <div className={styles.identity}><Link href="/" aria-label="Voltar ao mundo"><ArrowLeft size={18} /></Link><div><span className={styles.eyebrow}>CHICKENCHESS LAB</span><h1><FlaskConical size={22} /> Modo Criativo</h1></div></div>
      <InfoTip label="Modo Criativo">Uma bancada para compor com as peças. Sem abertura de fase nem turnos obrigatórios: experimente sons, simule estados e salve kits para as partidas.</InfoTip>
      <VersionChangelog />
    </header>

    <fieldset disabled={!ready || busy} className={styles.workspace}>
<section className={styles.transport} aria-label="Kit atual">            <label className={styles.hint}><span style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:5}}>Kit atual do Criativo<InfoTip label="Carregar e experimentar kits">Cada cidade tem um arranjo próprio inspirado no estilo e na época. A coleção anterior fica disponível em Kit anterior. Gere variações e use Salvar kit da fase para adotá-las na próxima partida.</InfoTip></span><select aria-label="Cidade do kit" value={stageCityId} onChange={e => setStageCityId(e.target.value)}>{EDITABLE_CITY_KITS.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={() => void loadStageKit(stageCityId)}>Carregar kit da cidade</button>
              <button onClick={() => void loadSession(defaultCityKit(stageCityId)!, true)}>Kit inicial da cidade</button>
              <button onClick={() => {
                const city = getCityById(stageCityId)
                if (city) void loadSession(createRandomCityKit(city, Math.random().toString(36).slice(2, 8)), true)
              }}>Gerar kit aleatório</button>
              <button onClick={() => {const previous=previousCityKit(stageCityId);if(previous)void loadSession(prepareCityKitForCreative(previous,stageCityId),true);else setNotice('Não existe kit anterior guardado para esta cidade.')}}>Kit anterior</button>
              <button onClick={async () => {try {const response=await window.fetch('/presets/mouth-breather.json');if(!response.ok)throw new Error('Preset indisponível');await loadSession(parseCreativeSession(await response.text()),true)}catch(error){setNotice(messageOf(error))}}}>Estudo Mouth Breather</button>
              <button onClick={() => void loadSession(createDusseldorfSession(), true)}>Düsseldorf original · samples</button>
</div>
</section>
      <section className={styles.transport} aria-label="Controles da sessão">
        <button className={styles.primary} onClick={() => { if (playing) stop(); else setPlaying(true) }} aria-pressed={playing}>
          {playing ? <Pause size={17} /> : <Play size={17} />}{playing ? 'Pause' : 'Play'}
        </button>
        <label><HelpLabel label="BPM">Velocidade base do kit, em batidas por minuto. O relógio mostra o valor efetivo quando uma regra ou rampa está atuando.</HelpLabel><input aria-label="BPM" type="number" min={30} max={240} value={session.bpm} onChange={e => { const n = Number(e.target.value); if (n >= 30 && n <= 240) setSession(s => ({ ...s, bpm: n })) }} /></label>
        <label><HelpLabel label="Tônica">Nota de referência comum às peças afinadas. Os graus das melodias acompanham esta nota.</HelpLabel><select value={session.root} onChange={e => setSession(s => ({ ...s, root: e.target.value as CreativeSession['root'] }))}>{ROOTS.map(root => <option key={root}>{root}</option>)}</select></label>
        <label><HelpLabel label="Escala">Conjunto de notas permitido às vozes afinadas. Samples não afinados mantêm sua altura original.</HelpLabel><select value={session.scale} onChange={e => setSession(s => ({ ...s, scale: e.target.value as CreativeSession['scale'] }))}>{Object.keys(SCALES).map(scale => <option key={scale}>{scale}</option>)}</select></label>
        <Range label="Volume geral" value={session.volume} min={0} max={1} onChange={volume => setSession(s => ({ ...s, volume }))} />
        <span className={styles.status}><i className={playing ? styles.running : ''} />{playing ? 'Em execução' : 'Pausado'} · {music.snapshot.pieces.filter(p => p.active).length}/32 ativas{soloId ? ' · solo' : ''}</span>
        <MusicTransportReadout monitor={music.monitor} />
      </section>

      <div className={styles.columns}>
          <div className={styles.boardColumn}><section className={`${styles.panel} ${styles.boardPanel}`}>
            <div className={styles.sectionHeader}><div className={styles.segmented}>
              <button aria-pressed={mode === 'move'} onClick={() => { music.endAudition(); setMode('move') }}>Mover</button>
              <button aria-pressed={mode === 'play'} onClick={() => { music.endAudition(); setMode('play') }}>Tocar casas</button>
            </div><InfoTip label="Tabuleiro livre">{mode === 'move' ? 'Segure para ouvir. Arraste livremente ou selecione e clique numa casa vazia. Mover ativa a peça; casas ocupadas trocam as peças. Esc cancela a prévia.' : 'Segure ou deslize pelas casas para tocar o instrumento selecionado. Nada é movido ou ativado. Pelo teclado: Tab e segure Espaço.'}</InfoTip></div>
            <div ref={boardRef} className={styles.board} role="group" aria-label="Tabuleiro criativo">
              {squares.map((square, index) => {
                const piece = music.snapshot.pieces.find(p => p.square === square)
                const chosen = piece?.id === selectedId
                const preview = music.preview?.square === square
                const pulse = music.pulse?.square === square
                return <button key={square} type="button" data-creative-square={square}
                  aria-label={`${square}${piece ? ` · ${pieceNames[piece.type]} ${piece.color === 'w' ? 'branco' : 'preto'} · ${session.instruments[piece.id].name} · ${piece.active ? 'ativo' : 'inativo'}` : ' · vazia'}`}
                  aria-pressed={chosen} className={`${styles.square} ${(Math.floor(index / 8) + index % 8) % 2 ? styles.dark : styles.light} ${chosen ? styles.selected : ''} ${preview ? styles.preview : ''} ${pulse ? styles.pulse : ''}`}
                  onPointerDown={e => pointerDown(e, square)} onPointerMove={pointerMove} onPointerUp={pointerUp}
                  onPointerCancel={() => { drag.current = null; setDragVisual(null); music.endAudition(); suppressClick.current = true }}
                  onLostPointerCapture={() => { if (drag.current) { drag.current = null; setDragVisual(null); music.endAudition() } }}
                  onClick={() => {
                    if (suppressClick.current) { suppressClick.current = false; return }
                    if (mode === 'play') return
                    if (piece) select(piece.id)
                    else { setPlaying(true); setSession(s => moveCreativePiece(s, selectedId, square)) }
                  }}
                  onKeyDown={e => { if (mode === 'play' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); if (!e.repeat) music.audition(selectedId, square) } }}
                  onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') music.endAudition() }} onBlur={() => { if (!drag.current) music.endAudition() }}>
                  <span className={styles.coordinate}>{square}</span>
                  {piece && dragVisual?.id !== piece.id && <span className={styles.piece} dangerouslySetInnerHTML={{ __html: PiecesSVG[`${piece.color}${piece.type.toUpperCase()}` as keyof typeof PiecesSVG] }} />}
                  {piece?.active && dragVisual?.id !== piece.id && <span className={styles.activeDot} />}
                </button>
              })}
              {dragVisual && <span ref={dragVisualRef} data-creative-drag={dragVisual.id} className={styles.dragPiece} style={{ left: 0, top: 0, transform: `translate(${dragVisual.x}px, ${dragVisual.y}px) translate(-50%, -50%) scale(1.06)` }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: PiecesSVG[dragVisual.svg] }} />}
            </div>

            <div className={styles.actions}>
              <button onClick={() => { setSoloId(null); setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, active: p.color === 'w' })) })); setPlaying(true) }}>Ativar brancas</button>
              <button onClick={() => { stop(); setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, active: false })) })); setSoloId(null) }}>Silenciar todas</button>
              <button onClick={() => { music.endAudition(); setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, square: p.origin })) })) }}>Repor posições</button>
            </div>

          </section>

        <MusicTransitionView monitor={music.monitor} />
          <MusicReactionEditor config={session.reactions} onChange={reactions=>setSession(s=>({...s,reactions}))} context={simulation} onContext={setSimulation} descriptions={music.reactionDescriptions} bpm={music.snapshot.bpm} scale={music.snapshot.scale} /></div>
        <div className={styles.controlColumns}>
        <div className={styles.controlColumn}>
        <aside className={styles.inspector} aria-label="Editor do instrumento">
          <section className={styles.panel}>
            <span className={styles.eyebrow}>02 / INSTRUMENTO</span>
            <div className={styles.instrumentTitle}><h2>{pieceNames[selected.type]} · {selected.origin}</h2><span>em {selected.square}</span></div>
            <label><HelpLabel label="Nome do instrumento">Nome livre desta voz, salvo no kit e independente do tipo de peça.</HelpLabel><input maxLength={60} value={instrument.name} onChange={e => updateInstrument({ name: e.target.value || 'Instrumento' })} /></label>
            <div className={styles.actions}>
              <button aria-pressed={selected.active} onClick={() => toggleActive(selectedId)}>{selected.active ? 'Loop ativo' : 'Ativar loop'}</button>
              <button aria-pressed={soloId === selectedId} onClick={() => { music.endAudition(); setSoloId(soloId === selectedId ? null : selectedId); if (soloId !== selectedId) { setPlaying(true); setSession(s => ({ ...s, pieces: s.pieces.map(p => p.id === selectedId ? { ...p, active: true } : p) })) } }}>Solo</button>
            </div>
            <MusicVoiceReadout instrument={instrument} onInstrumentChange={updateInstrument} expanded monitor={music.monitor} id={selectedId} snapshot={music.snapshot} manual={music.preview?.id === selectedId && music.preview.mode === 'manual'} />
            <MusicPerformanceControls override={music.snapshot.sectionOverrides?.[selectedId]} instrument={instrument} onChange={updateInstrument} monitor={music.monitor} />
            <SampleSourceControls instrument={instrument} onChange={updateInstrument} />
            <div className={styles.pair}><label><span className={styles.helpCaption}>Comportamento<InfoTip label="Comportamento do instrumento">Comportamento, fonte e afinação independem do tipo de peça.</InfoTip></span><select value={instrument.behavior} onChange={e => updateInstrument({ behavior: e.target.value as Instrument['behavior'] })}><option value="pulse">Pulso / percussão</option><option value="phrase">Frase / sequenciador</option><option value="sustain">Sustentado / acordes</option></select></label>
              <label><HelpLabel label="Timbre sintetizado">Forma de onda usada pela fonte Síntese. Para samples, escolha o banco e o som nos campos de fonte.</HelpLabel><select disabled={instrument.source?.kind === 'sample'} value={instrument.sound} onChange={e => updateInstrument({ sound: e.target.value as Instrument['sound'] })}>{SOUNDS.map(sound => <option key={sound}>{sound}</option>)}</select></label></div>


            <details><summary>Receitas e código Strudel<InfoTip label="Aplicar receitas">Aplicar um padrão ou receita substitui as notas desenhadas deste instrumento.</InfoTip></summary><div className={styles.editor}>

              <label>Receitas de referência<select value={recipeId} onChange={e => {
                const id = e.target.value
                setRecipeId(id)
                const recipe = patternRecipe(id)
                if (recipe) { setPattern(recipe.notes); setPatternError('') }
              }}><option value="">Escolha uma receita</option>{PATTERN_RECIPES.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name} · {recipe.study}</option>)}</select></label>
              {chosenRecipe && <InfoTip label="Receita selecionada">{chosenRecipe.description} Estudo: {chosenRecipe.study} · {chosenRecipe.credit}.</InfoTip>}
              <label htmlFor="creative-pattern"><span className={styles.helpCaption}>Padrão · graus da escala<InfoTip label="Notação Strudel">0 = tônica · ~ = pausa · [0 2] = subdivisão · &lt;0 2&gt; = alternar ciclos · [0,2,4] = acorde · *2 = acelerar · /2 = desacelerar. Um ciclo = 4 tempos.</InfoTip></span></label><textarea id="creative-pattern" rows={3} spellCheck={false} value={pattern} maxLength={512} onChange={e => { setPattern(e.target.value); setRecipeId(''); setPatternError('') }} />
              <div className={styles.actions}><button className={styles.primary} disabled={pattern === instrument.notes && !recipeId} onClick={() => void applyPattern()}>{recipeId ? 'Aplicar receita' : 'Aplicar padrão'}</button><button onClick={() => { setPattern(instrument.notes); setRecipeId(''); setPatternError('') }}>Restaurar edição</button></div>
              {patternError && <p role="alert" className={styles.error}>{patternError}</p>}

            </div>

            </details>
            <details><summary>Forma e variações · código avançado<InfoTip label="Aplicar forma">Aplicar forma volta às variações de texto e remove a edição visual deste instrumento.</InfoTip></summary><div className={styles.formEditor}>

              <label><span className={styles.helpCaption}>Timeline compartilhada A–H<InfoTip label="Timeline compartilhada">Os números escolhem a variação de todas as peças. Exemplo: [0@4 1@4 2@4 1@4]/16 mantém A, B, C e B por quatro ciclos cada.</InfoTip></span><textarea rows={2} spellCheck={false} value={sectionPattern} maxLength={512} onChange={e => { setSectionPattern(e.target.value); setFormError('') }} /></label>

              {phrases.map((phrase, index) => <label key={index}>Variação {String.fromCharCode(65 + index)}<textarea aria-label={`Variação ${String.fromCharCode(65 + index)}`} rows={2} spellCheck={false} value={phrase} maxLength={512} onChange={e => { setPhrases(current => current.map((value, i) => i === index ? e.target.value : value)); setFormError('') }} /></label>)}
              <div className={styles.actions}><button disabled={phrases.length >= 8} onClick={() => setPhrases(current => [...current, current.at(-1) ?? '0'])}>Adicionar variação</button><button disabled={phrases.length <= 1} onClick={() => setPhrases(current => current.slice(0, -1))}>Remover última</button></div>
              <label><span className={styles.helpCaption}>Máscara de entrada<InfoTip label="Máscara de entrada">x toca e ~ silencia. A máscara usa o mesmo relógio da timeline e não interrompe a frase durante edições.</InfoTip></span><textarea rows={2} spellCheck={false} placeholder="vazio = sempre presente" value={mask} maxLength={256} onChange={e => { setMask(e.target.value); setFormError('') }} /></label>

              <button className={styles.primary} disabled={!formDirty} onClick={() => void applyForm()}>Aplicar forma</button>
              {formError && <p role="alert" className={styles.error}>{formError}</p>}
            </div></details>
            <GrooveControls id={selectedId} grooves={session.grooves} binding={instrument.groove} onApply={async (grooves, groove) => {
              await applyMusicalConfiguration({ ...session, grooves, instruments: { ...session.instruments, [selectedId]: { ...instrument, groove } } })
            }} />
          </section>
        </aside>
        </div>

        <div className={styles.controlColumn}>
        <InstrumentParameters selectedId={selectedId} instrument={instrument} effects={effects} mapping={mapping}
          updateInstrument={updateInstrument} updateEffects={updateEffects} updateMapping={updateMapping}
          onApplyAutomations={async automations => {
            await applyMusicalConfiguration({ ...session, instruments: { ...session.instruments, [selectedId]: { ...instrument, automations } } })
          }} />

        <section className={`${styles.panel} ${styles.bandPanel}`}>
          <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>04 / SUA BANDA</span><h2>32 vozes independentes</h2></div><span className={styles.hint}>● loop ativo</span></div>
          <div className={styles.voices}>{(['w', 'b'] as const).map(color => <div key={color}><h3>{color === 'w' ? 'Brancas' : 'Pretas'}</h3>{session.pieces.filter(p => p.color === color).sort((a, b) => a.origin.localeCompare(b.origin)).map(p =>
            <div key={p.id} className={`${styles.voice} ${selectedId === p.id ? styles.chosenVoice : ''}`}>
              <button className={styles.voiceName} onClick={() => select(p.id)} aria-pressed={selectedId === p.id}><span>{p.origin}</span><span>{session.instruments[p.id].name}<MusicVoiceBadge monitor={music.monitor} id={p.id} /></span></button>
              <button className={styles.voiceToggle} aria-label={`${p.active ? 'Desativar' : 'Ativar'} ${p.id}`} aria-pressed={p.active} onClick={() => toggleActive(p.id)}><span>{p.active ? '●' : '○'}</span></button>
            </div>)}</div>)}</div>
        </section>
        </div>
        </div>
      </div>

      <section className={`${styles.panel} ${styles.kitPanel}`} aria-label="Biblioteca de kits">
        <div><span className={styles.eyebrow}>05 / KITS E FASES</span><h2>Guarde o que funcionou<InfoTip label="Salvar kits e fases">Vincule o kit a uma cidade para usá-lo na partida. No Criativo, o kit da fase liga as 16 peças brancas para audição; na partida, cada peça entra após seu primeiro movimento.</InfoTip></h2></div>
        <div className={styles.kitControls}>
          <label><HelpLabel label="Nome do kit">Nome usado na biblioteca local e na exportação JSON.</HelpLabel><input maxLength={80} value={session.name} onChange={e => setSession(s => ({ ...s, name: e.target.value }))} /></label>
          <div className={styles.pair}><label><HelpLabel label="Fase vinculada">Associa este kit a uma cidade e época. Salvar kit da fase o disponibiliza para a próxima partida neste navegador.</HelpLabel><select value={session.cityId ?? ''} onChange={e => setSession(s => ({ ...s, cityId: e.target.value || undefined }))}><option value="">Somente biblioteca local</option>{EDITABLE_CITY_KITS.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label><button disabled={!session.cityId} onClick={() => session.cityId && void loadStageKit(session.cityId, false)}>Recarregar da fase</button></div>
          <div className={styles.actions}><button className={session.cityId ? styles.primary : undefined} onClick={saveKit}><Save size={15} />{session.cityId ? 'Salvar kit da fase' : 'Salvar kit'}</button><button onClick={exportKit}><Download size={15} />Exportar kit</button><label className={styles.upload}><Upload size={15} />Importar kit<input type="file" accept=".json,application/json" aria-label="Importar kit JSON" onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = ''
            if (!file) return
            if (file.size > 150000) { setNotice('Arquivo de kit muito grande. Limite: 150 KB.'); return }
            try { await loadSession(parseCreativeSession(await file.text())) } catch (error) { setNotice(`Kit não importado: ${messageOf(error)}`) }
          }} /></label><button onClick={() => { if (confirm('Começar um rascunho novo? Exporte ou salve o atual se quiser mantê-lo.')) void loadSession(createCreativeSession()) }}>Novo rascunho</button></div>
          <div className={styles.pair}><label><HelpLabel label="Kits salvos">Escolha uma configuração da biblioteca local e use Carregar kit para trazê-la à bancada.</HelpLabel><select value={chosenKit} onChange={e => setChosenKit(e.target.value)}><option value="">Escolha um kit</option>{kits.map(kit => <option key={kit.name}>{kit.name}</option>)}</select></label><button disabled={!chosenKit} onClick={() => { const kit = kits.find(k => k.name === chosenKit); if (kit) void loadSession(kit) }}>Carregar kit</button></div>
        </div>
      </section>
      <details className={`${styles.panel} ${styles.code}`} onToggle={event => setShowCode(event.currentTarget.open)}><summary>Código Strudel em execução<InfoTip label="Código em execução">Visão gerada pelas vozes ativas e pela prévia. Para editar, use os controles do instrumento.</InfoTip></summary>{music.codeStats && <p>Exportação: {(music.codeStats.bytes / 1024).toFixed(1)} KB · {music.codeStats.stacks} stacks · {music.codeStats.timeCats} timeCat · {music.codeStats.orbits} orbits · {music.codeStats.filters} filtros declarados<InfoTip label="Métricas da exportação">Contagens do código gerado, não de nós de áudio ativos. Efeitos e vozes realmente em execução variam durante a música.</InfoTip></p>}<pre>{music.code}</pre></details>
    </fieldset>
    <div className={styles.notice} role="status" aria-live="polite">{!ready ? 'Abrindo bancada…' : busy ? 'Validando padrões…' : music.error ? `Áudio: ${music.error}` : notice || 'Selecione uma peça ou carregue uma formação para começar.'}</div>
  </main>
}
