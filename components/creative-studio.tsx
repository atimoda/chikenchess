'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, FlaskConical, Pause, Play, Save, Upload, Volume2 } from 'lucide-react'
import { PiecesSVG } from './chessground-board'
import { useCreativeMusic } from '@/hooks/use-creative-music'
import { CREATIVE_STORAGE, ROOTS, SCALES, SOUNDS, createCreativeSession, creativeSnapshot, hasPatternBudget, moveCreativePiece, parseCreativeSession, type CreativeSession } from '@/lib/music/creative'
import { validateMusicSnapshot } from '@/lib/music/runtime'
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

function Range({ label, value, min, max, step = 0.01, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void
}) {
  return <label className={styles.range}>
    <span>{label}<output>{Number(value.toFixed(3))}{unit}</output></span>
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
  </label>
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
  const [pattern, setPattern] = useState('')
  const [patternError, setPatternError] = useState('')
  const drag = useRef<{ id: string; square: string; origin: string; x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const music = useCreativeMusic(session, playing, soloId)
  const selected = session.pieces.find(p => p.id === selectedId)!
  const instrument = session.instruments[selectedId]
  const effects = session.effects[selectedId]
  const mapping = session.mappings[selectedId]
  const activeCount = session.pieces.filter(p => p.active).length

  useEffect(() => {
    let cancelled = false
    async function restore() {
      try {
        const saved = localStorage.getItem(CREATIVE_STORAGE)
        if (saved) {
          const parsed = parseCreativeSession(saved)
          await validateMusicSnapshot(creativeSnapshot(parsed, false))
          if (!cancelled) setSession(parsed)
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

  useEffect(() => { setPattern(instrument.notes); setPatternError('') }, [selectedId, instrument.notes])
  useEffect(() => {
    const cancel = () => { drag.current = null; music.endAudition() }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel() }
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('blur', cancel); window.removeEventListener('keydown', escape) }
  }, [music.endAudition])

  function updateInstrument(update: Partial<Instrument>) {
    setSession(s => ({ ...s, instruments: { ...s.instruments, [selectedId]: { ...s.instruments[selectedId], ...update } } }))
  }
  function updateEffects(update: Partial<Effects>) {
    setSession(s => ({ ...s, effects: { ...s.effects, [selectedId]: { ...s.effects[selectedId], ...update } } }))
  }
  function updateMapping(update: Partial<Mapping>) {
    setSession(s => ({ ...s, mappings: { ...s.mappings, [selectedId]: { ...s.mappings[selectedId], ...update } } }))
  }
  function toggleActive(id: string) {
    setSession(s => ({ ...s, pieces: s.pieces.map(p => p.id === id ? { ...p, active: !p.active } : p) }))
  }
  function stop() { setPlaying(false); music.endAudition(); drag.current = null }
  function select(id: string) { music.endAudition(); setSelectedId(id) }

  async function applyPattern() {
    const id = selectedId
    if (!hasPatternBudget(pattern)) {
      setPatternError('Use graus inteiros (−48 a 48), ~, grupos [], <>, vírgulas e operadores *, /, !, @. Limite de 512 caracteres e multiplicadores combinados de até 32.')
      return
    }
    setBusy(true)
    try {
      const candidate = { ...session, instruments: { ...session.instruments, [id]: { ...instrument, notes: pattern } } }
      await validateMusicSnapshot(creativeSnapshot(candidate, false))
      setSession(s => ({ ...s, instruments: { ...s.instruments, [id]: { ...s.instruments[id], notes: pattern } } }))
      setPatternError('')
      setNotice('Padrão aplicado. A próxima execução já usa a nova frase.')
    } catch (error) { setPatternError(`O padrão anterior foi mantido. ${messageOf(error)}`) }
    finally { setBusy(false) }
  }

  async function loadSession(next: CreativeSession) {
    setBusy(true)
    try {
      await validateMusicSnapshot(creativeSnapshot(next, false))
      stop(); setSoloId(null); setSession(next)
      setNotice(`Kit “${next.name}” carregado e pausado.`)
    } catch (error) { setNotice(`Kit não carregado: ${messageOf(error)}`) }
    finally { setBusy(false) }
  }
  function saveKit() {
    if (!session.name.trim()) { setNotice('Dê um nome ao kit antes de salvar.'); return }
    const clean = parseCreativeSession(JSON.stringify(session))
    const next = [...kits.filter(k => k.name !== clean.name), clean].slice(-30)
    try {
      localStorage.setItem(PRESETS_STORAGE, JSON.stringify(next))
      setKits(next); setChosenKit(clean.name)
      setNotice(`Kit “${clean.name}” salvo neste navegador. Salvar com o mesmo nome atualiza o kit.`)
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
    if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 5) drag.current.moved = true
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
      setSession(s => moveCreativePiece(s, current.id, square))
    }
    suppressClick.current = current.moved || mode === 'play'
    drag.current = null
    music.endAudition()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <main className={styles.studio}>
    <header className={styles.header}>
      <div className={styles.identity}><Link href="/" aria-label="Voltar ao mundo"><ArrowLeft size={18} /></Link><div><span className={styles.eyebrow}>CHICKENCHESS / LAB</span><h1><FlaskConical size={22} /> Modo Criativo</h1></div></div>
      <p>Uma bancada para compor com as peças.<br /><span>Sem abertura. Sem turnos. No seu tempo.</span></p>
    </header>

    <fieldset disabled={!ready || busy} className={styles.workspace}>
      <section className={styles.transport} aria-label="Controles da sessão">
        <button className={styles.primary} onClick={() => { if (playing) stop(); else setPlaying(true) }} aria-pressed={playing}>
          {playing ? <Pause size={17} /> : <Play size={17} />}{playing ? 'Pausar' : 'Tocar arranjo'}
        </button>
        <label>BPM<input aria-label="BPM" type="number" min={30} max={240} value={session.bpm} onChange={e => { const n = Number(e.target.value); if (n >= 30 && n <= 240) setSession(s => ({ ...s, bpm: n })) }} /></label>
        <label>Tônica<select value={session.root} onChange={e => setSession(s => ({ ...s, root: e.target.value as CreativeSession['root'] }))}>{ROOTS.map(root => <option key={root}>{root}</option>)}</select></label>
        <label>Escala<select value={session.scale} onChange={e => setSession(s => ({ ...s, scale: e.target.value as CreativeSession['scale'] }))}>{Object.keys(SCALES).map(scale => <option key={scale}>{scale}</option>)}</select></label>
        <Range label="Volume geral" value={session.volume} min={0} max={1} onChange={volume => setSession(s => ({ ...s, volume }))} />
        <span className={styles.status}><i className={playing ? styles.running : ''} />{playing ? 'Em execução' : 'Pausado'} · {activeCount}/32 ativas{soloId ? ' · solo' : ''}</span>
      </section>

      <div className={styles.columns}>
        <div className={styles.canvas}>
          <section className={styles.panel}>
            <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>01 / TABULEIRO LIVRE</span><h2>Experimente o movimento</h2></div><div className={styles.segmented}>
              <button aria-pressed={mode === 'move'} onClick={() => { music.endAudition(); setMode('move') }}>Mover</button>
              <button aria-pressed={mode === 'play'} onClick={() => { music.endAudition(); setMode('play') }}>Tocar casas</button>
            </div></div>
            <div className={styles.board} role="group" aria-label="Tabuleiro criativo">
              {squares.map((square, index) => {
                const piece = session.pieces.find(p => p.square === square)
                const chosen = piece?.id === selectedId
                const preview = music.preview?.square === square
                const pulse = music.pulse?.square === square
                return <button key={square} type="button" data-creative-square={square}
                  aria-label={`${square}${piece ? ` · ${pieceNames[piece.type]} ${piece.color === 'w' ? 'branco' : 'preto'} · ${session.instruments[piece.id].name} · ${piece.active ? 'ativo' : 'inativo'}` : ' · vazia'}`}
                  aria-pressed={chosen} className={`${styles.square} ${(Math.floor(index / 8) + index % 8) % 2 ? styles.dark : styles.light} ${chosen ? styles.selected : ''} ${preview ? styles.preview : ''} ${pulse ? styles.pulse : ''}`}
                  onPointerDown={e => pointerDown(e, square)} onPointerMove={pointerMove} onPointerUp={pointerUp}
                  onPointerCancel={() => { drag.current = null; music.endAudition(); suppressClick.current = true }}
                  onLostPointerCapture={() => { if (drag.current) { drag.current = null; music.endAudition() } }}
                  onClick={() => {
                    if (suppressClick.current) { suppressClick.current = false; return }
                    if (mode === 'play') return
                    if (piece) select(piece.id)
                    else setSession(s => moveCreativePiece(s, selectedId, square))
                  }}
                  onKeyDown={e => { if (mode === 'play' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); if (!e.repeat) music.audition(selectedId, square) } }}
                  onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') music.endAudition() }} onBlur={() => { if (!drag.current) music.endAudition() }}>
                  <span className={styles.coordinate}>{square}</span>
                  {piece && <span className={styles.piece} dangerouslySetInnerHTML={{ __html: PiecesSVG[`${piece.color}${piece.type.toUpperCase()}` as keyof typeof PiecesSVG] }} />}
                  {piece?.active && <span className={styles.activeDot} />}
                </button>
              })}
            </div>
            <p className={styles.hint}>{mode === 'move' ? 'Segure para ouvir. Arraste livremente ou selecione e clique numa casa vazia. Mover ativa a peça; casas ocupadas trocam as peças. Esc cancela a prévia.' : 'Segure ou deslize pelas casas para tocar o instrumento selecionado. Nada é movido ou ativado. Pelo teclado: Tab e segure Espaço.'}</p>
            <div className={styles.actions}>
              <button onClick={() => { setSoloId(null); setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, active: ['w:a2', 'w:b2', 'w:c2', 'w:b1', 'w:c1'].includes(p.id) })) })); setPlaying(true) }}>Ouvir formação inicial</button>
              <button onClick={() => { music.endAudition(); setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, active: false })) })); setSoloId(null) }}>Silenciar todas</button>
              <button onClick={() => { music.endAudition(); setSession(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p, square: p.origin })) })) }}>Repor posições</button>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>02 / SUA BANDA</span><h2>32 vozes independentes</h2></div><span className={styles.hint}>● loop ativo</span></div>
            <div className={styles.voices}>{(['w', 'b'] as const).map(color => <div key={color}><h3>{color === 'w' ? 'Brancas' : 'Pretas'}</h3>{session.pieces.filter(p => p.color === color).sort((a, b) => a.origin.localeCompare(b.origin)).map(p =>
              <div key={p.id} className={`${styles.voice} ${selectedId === p.id ? styles.chosenVoice : ''}`}>
                <button className={styles.voiceName} onClick={() => select(p.id)} aria-pressed={selectedId === p.id}><span>{p.origin}</span>{session.instruments[p.id].name}</button>
                <button className={styles.voiceToggle} aria-label={`${p.active ? 'Desativar' : 'Ativar'} ${p.id}`} aria-pressed={p.active} onClick={() => toggleActive(p.id)}><span>{p.active ? '●' : '○'}</span></button>
              </div>)}</div>)}</div>
          </section>
        </div>

        <aside className={styles.inspector} aria-label="Editor do instrumento">
          <section className={styles.panel}>
            <span className={styles.eyebrow}>03 / INSTRUMENTO SELECIONADO</span>
            <div className={styles.instrumentTitle}><h2>{pieceNames[selected.type]} · {selected.origin}</h2><span>em {selected.square}</span></div>
            <label>Nome do instrumento<input maxLength={60} value={instrument.name} onChange={e => updateInstrument({ name: e.target.value || 'Instrumento' })} /></label>
            <div className={styles.actions}>
              <button aria-pressed={selected.active} onClick={() => toggleActive(selectedId)}>{selected.active ? 'Loop ativo' : 'Ativar loop'}</button>
              <button aria-pressed={soloId === selectedId} onClick={() => { music.endAudition(); setSoloId(soloId === selectedId ? null : selectedId); if (soloId !== selectedId) setSession(s => ({ ...s, pieces: s.pieces.map(p => p.id === selectedId ? { ...p, active: true } : p) })) }}>Solo</button>
              <button onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); music.audition(selectedId, selected.square) }} onPointerUp={music.endAudition} onPointerCancel={music.endAudition} onLostPointerCapture={music.endAudition} onBlur={music.endAudition} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) music.audition(selectedId, selected.square) } }} onKeyUp={music.endAudition}><Volume2 size={14} />Segure para ouvir</button>
            </div>
            <div className={styles.pair}><label>Comportamento<select value={instrument.behavior} onChange={e => updateInstrument({ behavior: e.target.value as Instrument['behavior'] })}><option value="pulse">Pulso / percussão</option><option value="phrase">Frase / sequenciador</option><option value="sustain">Sustentado / acordes</option></select></label>
              <label>Timbre<select value={instrument.sound} onChange={e => updateInstrument({ sound: e.target.value as Instrument['sound'] })}>{SOUNDS.map(sound => <option key={sound}>{sound}</option>)}</select></label></div>
            <p className={styles.hint}>O comportamento independe da peça. Os timbres desta primeira bancada são sintetizados.</p>

            <div className={styles.editor}><label htmlFor="creative-pattern">Padrão · graus da escala</label><textarea id="creative-pattern" rows={3} spellCheck={false} value={pattern} maxLength={512} onChange={e => { setPattern(e.target.value); setPatternError('') }} />
              <div className={styles.actions}><button className={styles.primary} disabled={pattern === instrument.notes} onClick={() => void applyPattern()}>Aplicar padrão</button><button onClick={() => { setPattern(instrument.notes); setPatternError('') }}>Restaurar edição</button></div>
              {patternError && <p role="alert" className={styles.error}>{patternError}</p>}
              <p className={styles.hint}>0 = tônica · ~ = pausa · [0 2] = subdivisão · &lt;0 2&gt; = alternar ciclos · [0,2,4] = acorde · *2 = acelerar · /2 = desacelerar. Um ciclo = 4 tempos.</p>
            </div>

            <details open><summary>Afinação e envelope</summary><div className={styles.controls}>
              <Range label="Oitava" value={instrument.octave} min={0} max={7} step={1} onChange={octave => updateInstrument({ octave })} />
              <Range label="Ganho do instrumento" value={instrument.gain} min={0} max={1} onChange={gain => updateInstrument({ gain })} />
              <Range label="Ataque" value={instrument.attack} min={0.001} max={2} step={0.001} unit=" s" onChange={attack => updateInstrument({ attack })} />
              <Range label="Decaimento" value={effects.decay} min={0.01} max={2} unit=" s" onChange={decay => updateEffects({ decay })} />
              <Range label="Sustentação" value={instrument.sustain ?? (instrument.behavior === 'pulse' ? 0 : 0.55)} min={0} max={1} onChange={sustain => updateInstrument({ sustain })} />
              <Range label="Liberação" value={instrument.release} min={0.01} max={2} unit=" s" onChange={release => updateInstrument({ release })} />
              <Range label="Duração da nota (fração)" value={instrument.clip ?? (instrument.behavior === 'pulse' ? 0.12 : instrument.behavior === 'sustain' ? 0.95 : 0.7)} min={0.01} max={1} onChange={clip => updateInstrument({ clip })} />
            </div></details>
            <details open><summary>Filtros e efeitos</summary><div className={styles.controls}>
              <Range label="Passa-baixas" value={instrument.lpf} min={20} max={20000} step={10} unit=" Hz" onChange={lpf => updateInstrument({ lpf })} />
              <Range label="Passa-altas" value={instrument.hpf} min={0} max={20000} step={10} unit=" Hz" onChange={hpf => updateInstrument({ hpf })} />
              <Range label="Ganho adicional" value={effects.gain} min={0} max={2} onChange={gain => updateEffects({ gain })} />
              <Range label="Pitch (multiplicador)" value={effects.pitch} min={0.5} max={2} onChange={pitch => updateEffects({ pitch })} />
              <Range label="Pan adicional" value={effects.pan} min={-1} max={1} onChange={pan => updateEffects({ pan })} />
              <Range label="Reverb" value={effects.reverb} min={0} max={1} onChange={reverb => updateEffects({ reverb })} />
              <Range label="Delay pontuado" value={effects.delay} min={0} max={1} onChange={delay => updateEffects({ delay })} />
            </div></details>
            <details open><summary>Movimento → música</summary><div className={styles.controls}>
              <Range label="Graus por coluna" value={mapping.fileDegrees} min={-4} max={4} step={0.5} onChange={fileDegrees => updateMapping({ fileDegrees })} />
              <Range label="Graus por avanço" value={mapping.rankDegrees} min={-4} max={4} step={0.5} onChange={rankDegrees => updateMapping({ rankDegrees })} />
              <Range label="Abertura estéreo do tabuleiro" value={mapping.panWidth} min={0} max={1} onChange={panWidth => updateMapping({ panWidth })} />
              <label className={styles.check}><input type="checkbox" checked={mapping.previewFilter} onChange={e => updateMapping({ previewFilter: e.target.checked })} />Altura da casa modula o filtro na prévia</label>
            </div><p className={styles.hint}>{instrument.behavior === 'pulse' ? 'Percussão mantém os graus ao mover; pan e filtro continuam reagindo.' : 'Deslocamentos partem da casa original. Avanço segue a cor da peça. O resultado é arredondado para graus inteiros e limitado a ±12 graus.'}</p></details>
          </section>
        </aside>
      </div>

      <section className={`${styles.panel} ${styles.kitPanel}`} aria-label="Biblioteca de kits">
        <div><span className={styles.eyebrow}>04 / BIBLIOTECA LOCAL</span><h2>Guarde o que funcionou</h2><p className={styles.hint}>Rascunho salvo automaticamente. Kits ficam neste navegador; exporte para levar a outro dispositivo.</p></div>
        <div className={styles.kitControls}>
          <label>Nome do kit<input maxLength={80} value={session.name} onChange={e => setSession(s => ({ ...s, name: e.target.value }))} /></label>
          <div className={styles.actions}><button onClick={saveKit}><Save size={15} />Salvar kit</button><button onClick={exportKit}><Download size={15} />Exportar kit</button><label className={styles.upload}><Upload size={15} />Importar kit<input type="file" accept=".json,application/json" aria-label="Importar kit JSON" onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = ''
            if (!file) return
            if (file.size > 150000) { setNotice('Arquivo de kit muito grande. Limite: 150 KB.'); return }
            try { await loadSession(parseCreativeSession(await file.text())) } catch (error) { setNotice(`Kit não importado: ${messageOf(error)}`) }
          }} /></label></div>
          <div className={styles.pair}><label>Kits salvos<select value={chosenKit} onChange={e => setChosenKit(e.target.value)}><option value="">Escolha um kit</option>{kits.map(kit => <option key={kit.name}>{kit.name}</option>)}</select></label><button disabled={!chosenKit} onClick={() => { const kit = kits.find(k => k.name === chosenKit); if (kit) void loadSession(kit) }}>Carregar kit</button></div>
        </div>
      </section>
      <details className={`${styles.panel} ${styles.code}`}><summary>Código Strudel em execução</summary><p className={styles.hint}>Visão gerada pelas vozes ativas e pela prévia. Para editar, use os controles do instrumento.</p><pre>{music.code}</pre></details>
    </fieldset>
    <div className={styles.notice} role="status" aria-live="polite">{!ready ? 'Abrindo bancada…' : busy ? 'Validando padrões…' : music.error ? `Áudio: ${music.error}` : notice || 'Selecione uma peça ou ouça a formação inicial para começar.'}</div>
  </main>
}
