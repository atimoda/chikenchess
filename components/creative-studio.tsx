'use client'
import { stableHtml } from '@/lib/utils'
import { METER_IDS, meterLabel } from '@/lib/music/meter'
import { Knob } from './knob'
import { InstrumentParameters } from './creative/instrument-parameters'
import { MusicPerformanceControls } from './music-performance-controls'
import { MusicArrangementControls } from './music-arrangement-controls'
import { InfoTip, HelpLabel } from './info-tip'
import { MusicBpmRamp, MusicHarmonyReadout, MusicPendingTransitions } from './music-transition-view'

import Link from 'next/link'
import { MusicReactionEditor } from './music-reaction-editor'
import type { ReactionContext } from '@/lib/music/reactions'
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { ArrowLeft, Download, FlaskConical, Pause, Pencil, Play, Power, Save, Upload } from 'lucide-react'
import { ChessgroundBoard, PiecesSVG } from './chessground-board'
import { BoardResizeHandles } from './board-resize-handles'
import { useBoardResize } from '@/hooks/use-board-resize'
import { useCreativeMusic } from '@/hooks/use-creative-music'
import { CREATIVE_STORAGE, ROOTS, SCALES, SOUNDS, createCreativeSession, createDusseldorfSession, creativeSnapshot, moveCreativePiece, parseCreativeSession, updateCreativeArrangement, type CreativeSession } from '@/lib/music/creative'
import { validateMusicSnapshot } from '@/lib/music/runtime'
import { EDITABLE_CITY_KITS, KIT_LIBRARY_STORAGE, cityKitStorageKey, defaultCityKit, loadCityKit, prepareCityKitForCreative, resetLegacyMusicStorage, updateKitLibrary } from '@/lib/music/city-kits'
import { getCityById } from '@/lib/cities-data'
import { STYLE_REVISION } from '@/lib/music/styled-kits'
import { HARMONY_PLANS, type HarmonyPlanId } from '@/lib/music/harmony'
import { createRandomCityKit } from '@/lib/music/random-kit'
import { SampleSourceControls } from './music-lab-controls'
import { MusicTransportReadout, MusicVoiceReadout, MusicVoiceBadge } from './music-playback'
import { VersionChangelog } from './version-changelog'
import styles from './creative-studio.module.css'

const pieceNames = { p: 'Peão', n: 'Cavalo', b: 'Bispo', r: 'Torre', q: 'Rainha', k: 'Rei' }
const MOUTH_BREATHER_KIT = 'builtin:mouth-breather'
const DUSSELDORF_ORIGINAL_KIT = 'builtin:dusseldorf-original'
const DEFAULT_KIT_PREFIX = 'default:'
const USER_KIT_PREFIX = 'user:'
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
  const boardRef = useRef<HTMLDivElement | null>(null)
  const boardResize = useBoardResize({ boardRef, enabled: true, constrainToParent: true })
  const [session, setSession] = useState(createCreativeSession)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState('w:b1')
  const [soloIds, setSoloIds] = useState<Set<string>>(() => new Set())
  const soloMemoryRef = useRef<string[] | null>(null)
  const soloCycleIdsRef = useRef<Set<string>>(new Set())
  const [mode, setMode] = useState<'move' | 'play'>('move')
  const [notice, setNotice] = useState('')
  const [kits, setKits] = useState<CreativeSession[]>([])
  const [selectedKit, setSelectedKit] = useState('')
  const [simulation, setSimulation] = useState<ReactionContext>({ ply:0, states:[{ trigger:'opening',color:'w',ply:0 }], events:[] })
  const [showCode, setShowCode] = useState(false)
  const [editingInstrumentName, setEditingInstrumentName] = useState(false)
  const music = useCreativeMusic(session, playing, soloIds, simulation, showCode)
  const selected = session.pieces.find(p => p.id === selectedId)!
  const boardGame = useMemo(() => {
    const board = new Chess()
    board.clear()
    for (const piece of session.pieces) board.put({ type: piece.type, color: piece.color }, piece.square as Square)
    return board
  }, [session.pieces])
  const boardColor = getCityById(session.cityId ?? '')?.color ?? '#00ffaa'
  const boardActiveSquares = useMemo(() => new Set(session.pieces.filter(piece => piece.active).map(piece => piece.square)), [session.pieces])
  const selectedInstrument = session.instruments[selectedId]
  const instrument = soloIds.has(selectedId) && selectedInstrument.loopEnabled === false
    ? { ...selectedInstrument, loopEnabled: true }
    : selectedInstrument
  const effects = session.effects[selectedId]
  const mapping = session.mappings[selectedId]
  const activeCount = session.pieces.filter(p => p.active).length
  const cityName = (cityId?: string) => EDITABLE_CITY_KITS.find(city => city.id === cityId)?.name
  const kitLabel = (kit: CreativeSession) => `${kit.name}${cityName(kit.cityId) ? ` (${cityName(kit.cityId)})` : ''}`
  const linkedUserCities = new Set(kits.flatMap(kit => kit.cityId ? [kit.cityId] : []))
  const selectedUserKit = selectedKit.startsWith(USER_KIT_PREFIX) ? kits.find(kit => kit.name === selectedKit.slice(USER_KIT_PREFIX.length)) : undefined
  const selectedCityId = selectedKit.startsWith(DEFAULT_KIT_PREFIX) ? selectedKit.slice(DEFAULT_KIT_PREFIX.length) : selectedUserKit?.cityId

  useEffect(() => {
    let cancelled = false
    async function restore() {
      resetLegacyMusicStorage()
      let restored: CreativeSession | undefined
      try {
        const query = new window.URLSearchParams(window.location.search)
        const requestedCity = query.get('city')
        const requestedPreset = query.get('preset')
        const requestedKit = requestedCity ? (query.get('official') === '1' ? defaultCityKit(requestedCity) : loadCityKit(requestedCity)) : null
        let saved = requestedKit ? JSON.stringify(prepareCityKitForCreative(requestedKit, requestedCity!)) : localStorage.getItem(CREATIVE_STORAGE)
        if (requestedPreset && ['manchester-1999', 'dusseldorf-original', 'mouth-breather'].includes(requestedPreset)) {
          const response = await window.fetch(`/presets/${requestedPreset}.json`)
          if (!response.ok) throw new Error('Preset oficial indisponível.')
          saved = await response.text()
        }
        if (saved) {
          const parsed = parseCreativeSession(saved)
          await validateMusicSnapshot(creativeSnapshot(parsed, false))
          if (!cancelled) {
            restored = parsed
            setSession(parsed)
          }
        }
      } catch (error) {
        if (!cancelled) setNotice(`Não foi possível restaurar o rascunho: ${messageOf(error)}`)
      }
      try {
        const activeCustom = new Map<string, CreativeSession>()
        for (const city of EDITABLE_CITY_KITS) {
          const active = loadCityKit(city.id), standard = defaultCityKit(city.id)
          if (active && standard && JSON.stringify(active) !== JSON.stringify(standard)) activeCustom.set(city.id, active)
        }
        const savedKits: unknown = JSON.parse(localStorage.getItem(KIT_LIBRARY_STORAGE) ?? '[]')
        if (Array.isArray(savedKits) && !cancelled) {
          const parsed = savedKits.slice(0, 30).flatMap(kit => {
            try { return [parseCreativeSession(JSON.stringify(kit))] } catch { return [] }
          })
          const byName = new Map(parsed.map(kit => [kit.name, kit]))
          for (const kit of activeCustom.values()) byName.set(kit.name, kit)
          const candidates = [...byName.values()].map(kit => kit.cityId && activeCustom.get(kit.cityId)?.name !== kit.name ? { ...kit, cityId: undefined } : kit)
          const savedNames = new Set(parsed.map(kit => kit.name))
          const normalized = candidates.filter(kit => savedNames.has(kit.name))
          for (const kit of candidates) if (!savedNames.has(kit.name) && normalized.length < 30) normalized.push(kit)
          setKits(normalized)
          localStorage.setItem(KIT_LIBRARY_STORAGE, JSON.stringify(normalized))
          if (restored) {
            const user = normalized.find(kit => kit.name === restored!.name)
            const standard = restored.cityId && defaultCityKit(restored.cityId)?.name === restored.name
            setSelectedKit(user ? `${USER_KIT_PREFIX}${user.name}` : standard ? `${DEFAULT_KIT_PREFIX}${restored.cityId}` : restored.name === 'Mouth Breather · estudo eefano' ? MOUTH_BREATHER_KIT : restored.name === 'Düsseldorf · Electro 01' ? DUSSELDORF_ORIGINAL_KIT : '')
          }
        }
      } catch (error) {
        if (!cancelled) setNotice(`Não foi possível carregar a biblioteca de kits: ${messageOf(error)}`)
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

  useEffect(() => setEditingInstrumentName(false), [selectedId])

  const updateInstrument = useCallback((update: Partial<Instrument>) => {
    setSession(s => ({ ...s, instruments: { ...s.instruments, [selectedId]: { ...s.instruments[selectedId], ...update } } }))
  }, [selectedId])
  function updateEffects(update: Partial<Effects>) {
    setSession(s => ({ ...s, effects: { ...s.effects, [selectedId]: { ...s.effects[selectedId], ...update } } }))
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
  function toggleSolo(id: string) {
    music.endAudition()
    if (soloIds.has(id)) {
      const nextSoloIds = new Set(soloIds)
      nextSoloIds.delete(id)
      setSoloIds(nextSoloIds)
      if (nextSoloIds.size) {
        setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, active: nextSoloIds.has(p.id) })) }))
      } else {
        const restore = new Set([...(soloMemoryRef.current ?? []), ...soloCycleIdsRef.current, ...session.pieces.filter(p => p.active).map(p => p.id)])
        setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, active: restore.has(p.id) })) }))
        soloMemoryRef.current = null
        soloCycleIdsRef.current = new Set()
      }
      return
    }
    if (!soloIds.size) {
      soloMemoryRef.current = session.pieces
        .filter(p => p.active && session.instruments[p.id]?.loopEnabled !== false)
        .map(p => p.id)
      soloCycleIdsRef.current = new Set()
    }
    const nextSoloIds = new Set([...soloIds, id])
    soloCycleIdsRef.current.add(id)
    setSoloIds(nextSoloIds)
    setPlaying(true)
    setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, active: nextSoloIds.has(p.id) })) }))
  }
  function stop() { setPlaying(false); music.endAudition(); setNotice('Arranjo pausado.') }
  function select(id: string) { music.endAudition(); setSelectedId(id) }

  async function loadSession(next: CreativeSession, autoplay = false) {
    setBusy(true)
    try {
      await validateMusicSnapshot(creativeSnapshot(next, false))
      music.endAudition(); setSoloIds(new Set()); soloMemoryRef.current = null; soloCycleIdsRef.current = new Set(); setSimulation({ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]}); setSession(next); setPlaying(autoplay)
      setNotice(`Kit “${next.name}” carregado${autoplay ? ' e tocando' : ' e pausado'}.`)
    } catch (error) { setNotice(`Kit não carregado: ${messageOf(error)}`) }
    finally { setBusy(false) }
  }
  async function loadSelectedKit() {
    if (!selectedKit) return
    if (selectedKit.startsWith(USER_KIT_PREFIX)) {
      const kit = kits.find(item => item.name === selectedKit.slice(USER_KIT_PREFIX.length))
      if (kit) await loadSession(kit, true)
      return
    }
    if (selectedKit.startsWith(DEFAULT_KIT_PREFIX)) {
      const cityId = selectedKit.slice(DEFAULT_KIT_PREFIX.length), kit = defaultCityKit(cityId)
      if (kit) await loadSession(kit, true)
      return
    }
    if (selectedKit === DUSSELDORF_ORIGINAL_KIT) {
      await loadSession({ ...createDusseldorfSession(), cityId: undefined }, true)
      return
    }
    if (selectedKit === MOUTH_BREATHER_KIT) {
      try {
        const response = await window.fetch('/presets/mouth-breather.json')
        if (!response.ok) throw new Error('Preset indisponível')
        await loadSession(parseCreativeSession(await response.text()), true)
      } catch (error) { setNotice(messageOf(error)) }
    }
  }
  function saveKit() {
    if (!session.name.trim()) { setNotice('Dê um nome ao kit antes de salvar.'); return }
    const revision = session.cityId ? defaultCityKit(session.cityId)?.catalogRevision ?? STYLE_REVISION : STYLE_REVISION
    const clean = parseCreativeSession(JSON.stringify({...session, catalogRevision: revision}))
    let replacedLink = false
    if (clean.cityId) {
      const customConflict = kits.find(kit => kit.cityId === clean.cityId && kit.name !== clean.name)
      const standard = defaultCityKit(clean.cityId)
      const standardConflict = !kits.some(kit => kit.cityId === clean.cityId) && standard?.name !== clean.name ? standard : undefined
      const conflict = customConflict ?? standardConflict
      const city = cityName(clean.cityId)
      if (conflict && !window.confirm(`${city ?? 'Esta cidade'} já tem o kit “${conflict.name}” vinculado. Deseja vincular “${clean.name}” à cidade? O vínculo anterior será removido.`)) return
      replacedLink = Boolean(conflict)
    }
    const updated = updateKitLibrary(kits, clean)
    try {
      for (const cityId of updated.releasedCityIds) {
        const current = localStorage.getItem(cityKitStorageKey(cityId))
        if (current) {
          try { if (parseCreativeSession(current).name === clean.name) localStorage.removeItem(cityKitStorageKey(cityId)) } catch { /* corrupt slots already fall back to the default */ }
        }
      }
      localStorage.setItem(KIT_LIBRARY_STORAGE, JSON.stringify(updated.kits))
      if (clean.cityId) localStorage.setItem(cityKitStorageKey(clean.cityId), JSON.stringify(clean))
      setKits(updated.kits); setSession(clean); setSelectedKit(`${USER_KIT_PREFIX}${clean.name}`)
      const city = EDITABLE_CITY_KITS.find(item => item.id === clean.cityId)
      setNotice(city
        ? `Kit “${clean.name}” salvo e vinculado à fase ${city.name}.${replacedLink ? ' O vínculo anterior dessa cidade foi removido.' : ''}`
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

  return <main className={styles.studio}>
    <header className={styles.header}>
      <div className={styles.identity}><Link href="/" aria-label="Voltar ao mundo"><ArrowLeft size={18} /></Link><div><span className={styles.eyebrow}>CHICKENCHESS LAB</span><h1><FlaskConical size={22} /> Modo Criativo</h1></div></div>
      <InfoTip label="Modo Criativo">Uma bancada para compor com as peças. Sem abertura de fase nem turnos obrigatórios: experimente sons, simule estados e salve kits para as partidas.</InfoTip>
      <VersionChangelog />
    </header>

    <fieldset disabled={!ready || busy} className={styles.workspace}>
      <section className={`${styles.panel} ${styles.kitHub}`} aria-label="Kit atual e biblioteca">
        <div className={styles.kitStage}>
          <label><span className={styles.helpCaption}>Kit atual do Criativo<InfoTip label="Carregar e experimentar kits">Meus kits reúne os kits salvos neste navegador e os estudos independentes. Os kits padrão das cidades ficam abaixo. O nome da cidade aparece entre parênteses somente no kit atualmente vinculado a ela.</InfoTip></span><select aria-label="Kit atual do Criativo" value={selectedKit} onChange={e => setSelectedKit(e.target.value)}>
            <option value="">Rascunho atual</option>
            <optgroup label="Meus kits">
              {kits.map(kit=><option key={kit.name} value={`${USER_KIT_PREFIX}${kit.name}`}>{kitLabel(kit)}</option>)}
              <option value={MOUTH_BREATHER_KIT}>Mouth Breather · estudo eefano</option>
              <option value={DUSSELDORF_ORIGINAL_KIT}>Düsseldorf · Electro 01</option>
            </optgroup>
            <optgroup label="Kits padrão">{EDITABLE_CITY_KITS.map(city=>{const kit=defaultCityKit(city.id)!;return <option key={city.id} value={`${DEFAULT_KIT_PREFIX}${city.id}`}>{kit.name}{linkedUserCities.has(city.id)?'':` (${city.name})`}</option>})}</optgroup>
          </select></label>
          <div className={styles.actions}>
              <button className={styles.primary} disabled={!selectedKit} onClick={() => void loadSelectedKit()}>Carregar kit</button>
              <button onClick={() => {
                const city = selectedCityId ? getCityById(selectedCityId) : null
                if (city) { setSelectedKit(''); void loadSession(createRandomCityKit(city, Math.random().toString(36).slice(2, 8)), true) }
              }} disabled={!selectedCityId}>Gerar kit aleatório</button>
          </div>
        </div>
        <div className={styles.kitLibrary}>
          <div className={styles.kitFields}>
            <label>Nome do kit<input maxLength={80} value={session.name} onChange={e => setSession(s => ({ ...s, name: e.target.value }))} /></label>
            <label><span className={styles.helpCaption}>Fase vinculada<InfoTip label="Vincular kit à fase">Uma cidade usa somente um kit salvo por vez. Ao substituir um vínculo existente, o kit anterior continua na biblioteca sem cidade.</InfoTip></span><select value={session.cityId ?? ''} onChange={e => setSession(s => ({ ...s, cityId: e.target.value || undefined }))}><option value="">Nenhuma cidade</option>{EDITABLE_CITY_KITS.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
          </div>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={saveKit}><Save size={15} />Salvar kit</button>
            <button onClick={exportKit}><Download size={15} />Exportar kit</button>
            <label className={styles.upload}><Upload size={15} />Importar kit<input type="file" accept=".json,application/json" aria-label="Importar kit JSON" onChange={async e => {
              const file = e.target.files?.[0]; e.target.value = ''
              if (!file) return
              if (file.size > 150000) { setNotice('Arquivo de kit muito grande. Limite: 150 KB.'); return }
              try { setSelectedKit(''); await loadSession(parseCreativeSession(await file.text())) } catch (error) { setNotice(`Kit não importado: ${messageOf(error)}`) }
            }} /></label>
            <button onClick={() => { if (confirm('Começar um rascunho novo? Exporte ou salve o atual se quiser mantê-lo.')) { setSelectedKit(''); void loadSession(createCreativeSession()) } }}>Novo rascunho</button>
          </div>
        </div>
      </section>
      <div className={styles.sessionRow}>
        <section className={styles.transport} aria-label="Controles da sessão">
          <button className={styles.primary} onClick={() => { if (playing) stop(); else setPlaying(true) }} aria-pressed={playing}>
            {playing ? <Pause size={17} /> : <Play size={17} />}{playing ? 'Pause' : 'Play'}
          </button>
          <div className={styles.transportKnob}><span>Volume</span><Knob label="Volume" hideLabel value={session.volume} min={0} max={1} step={0.01} onChange={volume => setSession(s => ({ ...s, volume }))} /></div>
          <div className={styles.transportKnob}><span>BPM</span><Knob label="BPM" hideLabel value={session.bpm} min={30} max={240} step={1} formatValue={value => String(value)} onChange={bpm => setSession(s => ({ ...s, bpm }))} /></div>
          <label><HelpLabel label="Compasso">{meterLabel(session.meter)}. Nos compostos, cada pulso se divide em três; nos ímpares de colcheia, o relógio conta colcheias iguais e os acentos formam grupos. Alterar o compasso reinicia o relógio da sessão.</HelpLabel><select aria-label="Compasso" value={session.meter} onChange={e => setSession(s => ({ ...s, meter: e.target.value as CreativeSession['meter'] }))}>{METER_IDS.map(meter=><option key={meter} value={meter}>{meter}</option>)}</select></label>
          <label><HelpLabel label="Tônica">Nota de referência comum às peças afinadas. Os graus das melodias acompanham esta nota.</HelpLabel><select aria-label="Tônica" value={session.root} onChange={e => setSession(s => ({ ...s, root: e.target.value as CreativeSession['root'] }))}>{ROOTS.map(root => <option key={root}>{root}</option>)}</select></label>
          <label><HelpLabel label={`Escala (${music.snapshot.scale.join(' ')})`}>Conjunto de notas permitido às vozes afinadas. Samples não afinados mantêm sua altura original.</HelpLabel><select aria-label="Escala" value={session.scale} onChange={e => setSession(s => ({ ...s, scale: e.target.value as CreativeSession['scale'] }))}>{Object.keys(SCALES).map(scale => <option key={scale}>{scale}</option>)}</select></label>
          <div className={styles.harmonyControl}><label><span className={styles.helpCaption}><span>Harmonia <MusicHarmonyReadout monitor={music.monitor} compact /></span><InfoTip label="Harmonia">Kit Harmony usa os graus harmônicos salvos em cada seção do Arranjo global. Os outros planos usam sua própria progressão e deixam a edição desses graus desabilitada. Os graus do kit ficam guardados para quando você voltar a Kit Harmony. Baixos, acordes e melodias afinados compartilham esta harmonia.</InfoTip></span><select aria-label="Harmonia" value={session.harmony} onChange={e => {
            const harmony = e.target.value as HarmonyPlanId
            setSession(s => ({ ...s, harmony }))
          }}>{Object.entries(HARMONY_PLANS).map(([id,plan]) => <option key={id} value={id}>{plan.label}</option>)}</select></label></div>
          <div className={styles.transportFooter}><MusicTransportReadout arrangement={session.arrangement} monitor={music.monitor} activeCount={activeCount} solo={soloIds.size > 0} showBeatUnit /><div className={styles.rampSlot}><MusicBpmRamp monitor={music.monitor}/></div><MusicPendingTransitions monitor={music.monitor}/></div>
          <MusicArrangementControls arrangement={session.arrangement} harmony={session.harmony} monitor={music.monitor} onSeek={music.seekSection} onChange={arrangement => setSession(s => updateCreativeArrangement(s, arrangement))} />
        </section>
      </div>

      <div className={styles.columns}>
          <div className={styles.boardColumn}><section className={`${styles.panel} ${styles.boardPanel}`}>
            <div className={styles.sectionHeader}><div className={styles.segmented}>
              <button aria-pressed={mode === 'move'} onClick={() => { music.endAudition(); setMode('move') }}>Mover</button>
              <button aria-pressed={mode === 'play'} onClick={() => { music.endAudition(); setMode('play') }}>Tocar casas</button>
            </div><InfoTip label="Tabuleiro livre">{mode === 'move' ? 'Segure para ouvir uma nota por casa. Arraste livremente ou selecione e clique numa casa vazia. Mover ativa a peça; casas ocupadas trocam as peças. Duplo clique na peça liga ou desliga seu loop. Esc cancela a prévia.' : 'Segure ou deslize pelas casas para tocar o instrumento selecionado. Nada é movido ou ativado. Pelo teclado: Tab e segure Espaço.'}</InfoTip></div>
            <div ref={boardRef} className={styles.board} style={boardResize.width === null ? undefined : { width: boardResize.width }} role="group" aria-label="Tabuleiro criativo" aria-busy={!music.auditionReady}>
              <BoardResizeHandles enabled={boardResize.enabled} onStart={boardResize.startResize} onResizeBy={boardResize.resizeBy} onCancel={boardResize.cancelResize} />
              <fieldset className={styles.boardReadyGate} disabled={!music.auditionReady} onMouseDownCapture={music.unlock}>
              <ChessgroundBoard
                game={boardGame}
                onMove={() => {}}
                cityColor={boardColor}
                isThinking={false}
                synthSelectedSquare={selected.square as Square}
                activeSquares={boardActiveSquares}
                musicPulseMonitor={music.pulseMonitor}
                onBoardClick={square => {
                  if (mode === 'play') return
                  const piece = session.pieces.find(item => item.square === square)
                  // Updating the instrument editors can compile every variation.
                  // Let the gesture submit its sample before that lower-priority render.
                  if (piece) startTransition(() => setSelectedId(piece.id))
                  else { setPlaying(true); setSession(current => moveCreativePiece(current, selectedId, square)) }
                }}
                onPieceHold={square => {
                  const id = mode === 'play' ? selectedId : session.pieces.find(item => item.square === square)?.id
                  if (id) music.audition(id, square)
                }}
                onDragOverSquare={(from, to) => {
                  const id = mode === 'play' ? selectedId : session.pieces.find(item => item.square === from)?.id
                  if (id) music.audition(id, to)
                }}
                onPieceRelease={music.releaseAudition}
                onPieceCancel={music.endAudition}
                freeMode={{
                  mode,
                  auditionPiece: { color: selected.color, type: selected.type },
                  onMove: (from, to) => {
                    const piece = session.pieces.find(item => item.square === from)
                    if (!piece) return
                    setPlaying(true)
                    setSession(current => moveCreativePiece(current, piece.id, to))
                  },
                  onTogglePiece: square => {
                    const piece = session.pieces.find(item => item.square === square)
                    if (piece) { select(piece.id); toggleActive(piece.id) }
                  },
                  squareLabel: square => {
                    const piece = session.pieces.find(item => item.square === square)
                    return `${square}${piece ? ` · ${pieceNames[piece.type]} ${piece.color === 'w' ? 'branco' : 'preto'} · ${session.instruments[piece.id].name} · ${piece.active ? 'ativo' : 'inativo'}` : ' · vazia'}`
                  },
                }}
              />
              </fieldset>
              {!music.auditionReady && <div className={styles.boardLoading} role="status">Preparando sons do kit…</div>}
            </div>

            <div className={styles.actions}>
              <button onClick={() => { setSoloIds(new Set()); soloMemoryRef.current = null; soloCycleIdsRef.current = new Set(); setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, active: p.color === 'w' })) })); setPlaying(true) }}>Ativar brancas</button>
              <button onClick={() => { stop(); setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, active: false })) })); setSoloIds(new Set()); soloMemoryRef.current = null; soloCycleIdsRef.current = new Set() }}>Silenciar todas</button>
              <button onClick={() => { music.endAudition(); setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, square: p.origin })) })) }}>Repor posições</button>
            </div>

          </section>

          <MusicReactionEditor config={session.reactions} onChange={reactions=>setSession(s=>({...s,reactions}))} context={simulation} onContext={setSimulation} descriptions={music.reactionDescriptions} bpm={music.snapshot.bpm} scale={music.snapshot.scale} />

          <section className={`${styles.panel} ${styles.bandPanel}`}>
            <div className={styles.sectionHeader}><h2>32 vozes independentes</h2></div>
            <div className={styles.voices}>{(['w', 'b'] as const).map(color => <div key={color}><h3>{color === 'w' ? 'Brancas' : 'Pretas'}</h3>{session.pieces.filter(p => p.color === color).sort((a, b) => a.origin.localeCompare(b.origin)).map(p =>
              <div key={p.id} className={`${styles.voice} ${selectedId === p.id ? styles.chosenVoice : ''}`}>
                <button className={styles.voiceName} onClick={() => select(p.id)} aria-pressed={selectedId === p.id}><span>{p.origin}</span><span>{session.instruments[p.id].name}<MusicVoiceBadge monitor={music.monitor} id={p.id} /></span></button>
                <button className={styles.voiceSolo} aria-label={`${soloIds.has(p.id) ? 'Desativar' : 'Ativar'} solo ${p.id}`} title="Solo" aria-pressed={soloIds.has(p.id)} onClick={() => toggleSolo(p.id)}>S</button>
                <button className={styles.voiceToggle} aria-label={`${p.active ? 'Desativar' : 'Ativar'} ${p.id}`} aria-pressed={p.active} onClick={() => toggleActive(p.id)}><span>{p.active ? '●' : '○'}</span></button>
              </div>)}</div>)}</div>
          </section>
        </div>
        <div className={styles.controlColumns}>
        <div className={styles.controlColumn}>
        <aside className={styles.inspector} aria-label="Editor do instrumento">
          <section className={styles.panel}>
            <span className={styles.eyebrow}>Selected Instrument</span>
            <div className={styles.instrumentIdentity}>
              <span className={styles.instrumentAvatar} aria-hidden="true" dangerouslySetInnerHTML={stableHtml(PiecesSVG[`${selected.color}${selected.type.toUpperCase()}` as keyof typeof PiecesSVG])} />
              <div className={styles.instrumentHeading}>
                <div className={styles.instrumentTitle}>
                  {editingInstrumentName ? <input autoFocus aria-label="Nome do instrumento" maxLength={60} value={instrument.name} onChange={e => updateInstrument({ name: e.target.value || 'Instrumento' })} onBlur={() => setEditingInstrumentName(false)} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur() }} /> : <h2>{instrument.name}</h2>}
                  <button type="button" className={styles.editName} aria-label="Editar nome do instrumento" title="Editar nome" onClick={() => setEditingInstrumentName(true)}><Pencil size={14} /></button>
                </div>
                <span className={styles.instrumentMeta}>{pieceNames[selected.type]} - {selected.origin} - em {selected.square} - <MusicVoiceBadge monitor={music.monitor} id={selectedId} /></span>
              </div>
            </div>
            <div className={styles.actions}>
              <button className={!selected.active && music.preview?.id === selectedId ? styles.partialPower : undefined} aria-label={selected.active ? 'Desativar loop' : 'Ativar loop'} title={selected.active ? 'Loop ativo' : music.preview?.id === selectedId ? 'Prévia temporária' : 'Loop inativo'} aria-pressed={selected.active} onClick={() => toggleActive(selectedId)}><Power size={16} /></button>
              <button aria-pressed={soloIds.has(selectedId)} onClick={() => toggleSolo(selectedId)}>Solo</button>
            </div>
            <MusicVoiceReadout instrument={instrument} onInstrumentChange={updateInstrument} variationTabs manageVariations expanded showStatus={false} monitor={music.monitor} id={selectedId} snapshot={music.snapshot} manual={music.preview?.id === selectedId && music.preview.mode === 'manual'} />
            <MusicPerformanceControls key={selectedId} arrangement={session.arrangement} override={music.snapshot.sectionOverrides?.[selectedId]} instrument={instrument} onChange={updateInstrument} monitor={music.monitor} />
            <SampleSourceControls instrument={instrument} onChange={updateInstrument} />
            <div className={styles.pair}><label><span className={styles.helpCaption}>Comportamento<InfoTip label="Comportamento do instrumento">
              <p><b>Pulso / percussão:</b> toca o ritmo e as notas escritas sem seguir a progressão harmônica nem a transposição por linha/coluna. Sem ajustes explícitos, usa notas curtas (fração 0,12) e sustentação zero.</p>
              <p><b>Frase / sequenciador:</b> toca a melodia escrita; vozes afinadas acompanham a harmonia e o mapa de graus da posição. Sem duração explícita, usa fração 0,7.</p>
              <p><b>Sustentado / acordes:</b> em vozes afinadas, uma harmonia não estática transforma cada ataque em acorde com condução de vozes. Na harmonia estática, preserva as notas/acordes escritos. Sem duração explícita, usa fração 0,95; não mantém som indefinidamente.</p>
              <p>Todos permitem variações MIDI, arranjo por peça, ADSR e efeitos. Slides de afinação exigem voz afinada; samples não afinados não seguem graus/acordes. Trocar comportamento não troca a fonte/timbre nem redefine os parâmetros salvos. O gesto manual toca uma nota por casa, sem executar a sequência. O tipo de peça não restringe a escolha.</p>
            </InfoTip></span><select value={instrument.behavior} onChange={e => updateInstrument({ behavior: e.target.value as Instrument['behavior'] })}><option value="pulse">Pulso / percussão</option><option value="phrase">Frase / sequenciador</option><option value="sustain">Sustentado / acordes</option></select></label>
              <label><HelpLabel label="Timbre sintetizado">Forma de onda usada pela fonte Síntese. Se a fonte atual for um sample, escolher um timbre muda a fonte para Síntese. Para voltar aos samples, escolha Banco de samples em Fonte sonora.</HelpLabel><select value={instrument.sound} onChange={e => updateInstrument({ sound: e.target.value as Instrument['sound'], source: { kind: 'synth' } })}>{SOUNDS.map(sound => <option key={sound}>{sound}</option>)}</select></label></div>


          </section>
        </aside>
        </div>

        <div className={styles.controlColumn}>
        <InstrumentParameters instrument={instrument} effects={effects} mapping={mapping}
          updateInstrument={updateInstrument} updateEffects={updateEffects} updateMapping={updateMapping} />
        </div>
        </div>
      </div>

      <details className={`${styles.panel} ${styles.code}`} onToggle={event => setShowCode(event.currentTarget.open)}><summary>Código Strudel em execução<InfoTip label="Código em execução">Visão gerada pelas vozes ativas e pela prévia. Para editar, use os controles do instrumento.</InfoTip></summary>{music.codeStats && <p>Exportação: {(music.codeStats.bytes / 1024).toFixed(1)} KB · {music.codeStats.stacks} stacks · {music.codeStats.timeCats} timeCat · {music.codeStats.orbits} orbits · {music.codeStats.filters} filtros declarados<InfoTip label="Métricas da exportação">Contagens do código gerado, não de nós de áudio ativos. Efeitos e vozes realmente em execução variam durante a música.</InfoTip></p>}<pre>{music.code}</pre></details>
    </fieldset>
    <div className={styles.notice} role="status" aria-live="polite">{!ready ? 'Abrindo bancada…' : busy ? 'Validando padrões…' : music.error ? `Áudio: ${music.error}` : notice || 'Selecione uma peça ou carregue uma formação para começar.'}</div>
  </main>
}
