"use client"

import type React from "react"
import { memo, useRef, forwardRef } from "react"
import { Power } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import { Resizable } from "re-resizable"
import { cn } from "@/lib/utils"
import type { Instrument, MovementMapping, MusicPiece } from "@/lib/music/model"
import { DEFAULT_MOVEMENT } from "@/lib/music/model"
import { DEFAULT_ARRANGEMENT, pieceSection, type Arrangement } from "@/lib/music/arrangement"
import { SAMPLE_BANKS, sampleAsset } from "@/lib/music/sample-banks"

interface PieceDebugWidgetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd"> {
  cityColor: string
  selectedSquare: string | null
  instrument: Instrument | null
  selectedPiece: MusicPiece | null
  movementMapping?: MovementMapping
  arrangement?: Arrangement
  sectionOverride?: number
  position?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  togglePortalized?: boolean
  isStatic?: boolean
  onToggle: () => void
}

function formatSummaryNumber(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

const pieceTypeNames: Record<MusicPiece['type'], string> = {
  p: 'peão', n: 'cavalo', b: 'bispo', r: 'torre', q: 'dama', k: 'rei',
}

const PieceConfigurationSummary = memo(function PieceConfigurationSummary({
  instrument, piece, movementMapping, arrangement, sectionOverride,
}: {
  instrument: Instrument
  piece: MusicPiece
  movementMapping?: MovementMapping
  arrangement?: Arrangement
  sectionOverride?: number
}) {
  const plan = arrangement ?? DEFAULT_ARRANGEMENT
  const mapping = movementMapping ?? DEFAULT_MOVEMENT
  const pieceArrangement = instrument.arrangement
  const sampleSource = instrument.source?.kind === 'sample' ? instrument.source : undefined
  const sampleBank = sampleSource && SAMPLE_BANKS.find(bank => bank.id === sampleSource.bank)
  const sample = sampleSource && sampleAsset(sampleSource)
  const sampleVariant = sample && sampleSource ? sample.variants[sampleSource.variant] : undefined
  const sampleMap = sampleVariant?.keymap ?? sample?.keymap
  const behavior = instrument.behavior === 'pulse'
    ? 'Pulso: conserva os graus escritos mesmo ao mover.'
    : instrument.behavior === 'phrase'
      ? 'Frase: transpõe os graus conforme o deslocamento da peça.'
      : 'Sustentado: transpõe os graus; progressões (fora de Estática e Kit Harmony) geram acordes por ataque.'
  const movementMeaning = instrument.behavior === 'pulse'
    ? 'Este comportamento ignora o mapa para afinação.'
    : sampleSource && !sampleSource.pitched
      ? 'O mapa não altera a altura de um sample não afinado.'
      : `Afinação: arredondar(Δcoluna × ${formatSummaryNumber(mapping.fileDegrees)} + ⌊avanço × ${formatSummaryNumber(mapping.rankDegrees)}⌋), limitado a ±${movementMapping ? 12 : 4} graus.`
  const sections = plan.sections.map((section, index) => {
    const step = pieceSection(instrument, plan, index)
    const transpose = step.transpose === 0 ? '±0 st' : `${step.transpose > 0 ? '+' : ''}${step.transpose} st`
    return `${section.label} (${formatSummaryNumber(section.beats)}t): ${step.variation === null ? 'pausa (sem variação)' : String.fromCharCode(65 + step.variation)}, ${transpose}`
  }).join(' · ')
  const typeName = pieceTypeNames[piece.type]
  const activation = piece.activation === 'check' ? 'cheque' : piece.activation === 'move' ? 'lance' : 'base'
  const soundSource = sampleSource
    ? `${sampleBank?.name ?? sampleSource.bank} / ${sample?.name ?? sampleSource.asset} / ${sampleVariant?.name ?? `variante ${sampleSource.variant + 1}`}`
    : `síntese · onda ${instrument.sound}`

  return <div className="space-y-1 break-words">
    <p><b className="text-white/90">Peça:</b> {typeName} · lado {piece.color === 'w' ? 'branco' : 'preto'} · origem {piece.origin} · {piece.active ? 'ativa' : 'inativa'} · ativação: {activation}{piece.checkEnsemble ? ' · banda completa no cheque' : ''} · slot {piece.slot} · ID {piece.id}</p>
    <p><b className="text-white/90">Fonte:</b> {soundSource}{sampleSource ? ` · ${sampleSource.pitched ? 'afinada: segue a escala' : 'one-shot: preserva a altura gravada'}` : ''}{sampleSource && sample?.rootNote ? ` · raiz ${sample.rootNote}` : ''}{sampleSource && sampleMap ? ` · mapa de ${Object.keys(sampleMap).length} notas` : ''}</p>
    <p><b className="text-white/90">Comportamento:</b> {behavior} {movementMeaning}</p>
    <p><b className="text-white/90">Mapa de movimento:</b> coluna × {formatSummaryNumber(mapping.fileDegrees)} · avanço × {formatSummaryNumber(mapping.rankDegrees)} · pan até {formatSummaryNumber(mapping.panWidth * 100)}% entre colunas · filtro nas prévias: {mapping.previewFilter ? 'ligado' : 'desligado'}.</p>
    {(instrument.octaveRange || (sampleSource?.pitched ?? !sampleSource)) && <p><b className="text-white/90">Oitava base:</b> {instrument.octave}{instrument.octaveRange ? ' · usada como referência ao sortear o Range' : ''}</p>}
    <p><b className="text-white/90">Mix da distorção:</b> {Math.round((instrument.distortionMix ?? .25) * 100)}% do sinal distorcido.</p>
    <p><b className="text-white/90">Forma por seção:</b> {sections}. Reinício {pieceArrangement?.restart ? 'local à entrada de cada seção' : 'segue a fase global'}{!pieceArrangement ? ' · sem arranjo próprio; usa atribuições padrão' : ''}.</p>
    {instrument.selectedVariation !== undefined && <p><b className="text-white/90">Pin:</b> variação {String.fromCharCode(65 + instrument.selectedVariation)} fixa, mas presença, transposição e reinício seguem as seções.</p>}
    {sectionOverride !== undefined && <p><b className="text-white/90">Regra ativa:</b> força a variação {String.fromCharCode(65 + sectionOverride)} e tem prioridade sobre o pin.</p>}
  </div>
}, (previous, next) => previous.instrument === next.instrument
  && previous.piece === next.piece
  && previous.movementMapping === next.movementMapping
  && previous.arrangement === next.arrangement
  && previous.sectionOverride === next.sectionOverride)

export const PieceDebugWidget = forwardRef<HTMLDivElement, PieceDebugWidgetProps>(({
  cityColor,
  selectedSquare,
  instrument,
  selectedPiece,
  movementMapping,
  arrangement,
  sectionOverride,
  position,
  onPositionChange,
  handleRef,
  toggleRef,
  togglePortalized = false,
  isStatic = false,
  onToggle,
  ...props
}, ref) => {
  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef
  const pieceDebugTop = Math.max(0, position?.y ?? 0)

  return <Draggable
    data-widget="piece-debug"
    ref={ref}
    position={position}
    onDrag={onPositionChange}
    handleRef={effectiveHandleRef}
    dragFromBackground
    className={cn('pointer-events-auto', props.className)}
    style={{ ...props.style, zIndex: undefined, '--city-neon': cityColor } as React.CSSProperties}
    {...props}
  >
    <Resizable
      defaultSize={{ width: 340, height: 300 }}
      size={isStatic ? { width: '100%', height: 'auto' } : undefined}
      minWidth={isStatic ? '100%' : 260}
      maxWidth={isStatic ? '100%' : undefined}
      minHeight={isStatic ? 'auto' : 160}
      maxHeight={isStatic ? undefined : `max(160px, min(90vh, calc(100vh - ${pieceDebugTop + 12}px)))`}
      enable={isStatic ? false : { top: false, right: true, bottom: true, left: false, topRight: false, bottomRight: true, bottomLeft: false, topLeft: false }}
      handleStyles={{ bottom: { zIndex: 90, height: 10, bottom: 0, cursor: 'ns-resize' } }}
      handleWrapperStyle={{ zIndex: 90 }}
      handleComponent={{ bottom: <div className="pointer-events-none absolute bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-white/35" /> }}
      className={cn('relative', isStatic && 'w-full')}
      onResizeStart={event => event.stopPropagation()}
    >
      <div className="absolute inset-0 z-50 rounded-md border border-white/30 bg-black/80 opacity-100 backdrop-blur-md" style={{ boxShadow: selectedSquare ? `0 0 20px ${cityColor}40` : 'none' }} />
      <button
        type="button"
        ref={toggleRef}
        aria-label="Desligar Piece Debug"
        aria-hidden={togglePortalized || undefined}
        tabIndex={togglePortalized ? -1 : 0}
        title="Desligar Piece Debug"
        className={cn('absolute -left-2 -top-1 z-[70] flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-background text-[var(--city-neon)] shadow-md transition-colors hover:text-[#60a5fa]', togglePortalized && 'invisible pointer-events-none')}
        onClick={event => { event.stopPropagation(); onToggle() }}
      ><Power className="h-4 w-4" /></button>
      <div ref={effectiveHandleRef} data-drag-handle="true" className="absolute inset-x-0 top-0 z-[60] h-8" />
      <section aria-label="Piece debug" className="relative z-50 flex h-full min-h-0 flex-col overflow-hidden px-2.5 pb-3 pt-2.5 font-mono text-[10px] leading-[1.4] text-white/75">
        <h2 className="mb-3 h-4 shrink-0 text-center text-xs font-bold tracking-wider text-white/90">PIECE DEBUG</h2>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,.5)_transparent] [scrollbar-width:thin]">
          {instrument && selectedPiece
            ? <PieceConfigurationSummary instrument={instrument} piece={selectedPiece} movementMapping={movementMapping} arrangement={arrangement} sectionOverride={sectionOverride} />
            : <p className="text-white/55">Selecione uma peça com voz musical para ver as configurações adicionais.</p>}
        </div>
      </section>
    </Resizable>
  </Draggable>
})

PieceDebugWidget.displayName = 'PieceDebugWidget'
