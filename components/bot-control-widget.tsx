"use client"

import type React from "react"
import { useRef, forwardRef } from "react"
import { Power, Save } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import { Resizable } from "re-resizable"
import { cn } from "@/lib/utils"
import type { BotConfigParams, BotProfile } from "@/lib/chess-bots"
import { StepperButton, stepValue } from "@/components/compact-number-input"

interface BotControlWidgetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd"> {
  cityColor: string
  bot: BotProfile
  params: BotConfigParams
  onParamsChange: (patch: Partial<BotConfigParams>) => void
  canSaveBot?: boolean
  savingBot?: boolean
  onSaveBot?: () => void
  position?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  togglePortalized?: boolean
  isStatic?: boolean
  onToggle: () => void
}

interface NumberFieldProps {
  label: string
  code: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  disabled?: boolean
  onChange: (value: number) => void
}

function ParamField({ label, code, value, min, max, step = 1, suffix, disabled, onChange }: NumberFieldProps) {
  // Held +/- buttons repeat faster than the parent re-renders, so step from the latest value.
  const valueRef = useRef(value)
  valueRef.current = value
  const adjust = (direction: -1 | 1) => {
    const next = stepValue(valueRef.current, direction, min, max, step)
    if (next === valueRef.current) return
    valueRef.current = next
    onChange(next)
  }
  const stepperClass = "absolute top-1/2 flex h-3.5 w-3.5 -translate-y-1/2 cursor-pointer select-none items-center justify-center rounded-full border border-white/25 bg-white/10 p-0 text-[10px] leading-none text-white/80 transition-colors hover:border-white/60 hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
  return (
    <label className={cn("flex items-center justify-between gap-2 rounded bg-white/[0.03] px-2 py-0.5", disabled && "opacity-45")}>
      <span className="min-w-0 flex-1 truncate text-[10px] text-white/80" title={`${code}: ${label}`}>
        <b className="text-white">{code}</b> · {label}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="relative w-[4.5rem]">
          <input
            type="number"
            aria-label={`${code} ${label}`}
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onClick={event => event.stopPropagation()}
            onPointerDown={event => event.stopPropagation()}
            onChange={event => {
              const parsed = Number(event.target.value)
              if (!Number.isFinite(parsed)) return
              const clamped = Math.max(min, Math.min(max, parsed))
              onChange(clamped)
            }}
            className="w-full rounded border border-white/20 bg-black/70 py-0.5 pl-1.5 pr-9 text-right font-mono text-[10px] text-white [appearance:textfield] focus:border-white/60 focus:outline-none disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <StepperButton aria-label={`Diminuir ${code} ${label}`} disabled={disabled || value <= min} onStep={() => adjust(-1)} className={cn(stepperClass, "right-[19px]")}>−</StepperButton>
          <StepperButton aria-label={`Aumentar ${code} ${label}`} disabled={disabled || value >= max} onStep={() => adjust(1)} className={cn(stepperClass, "right-[2px]")}>+</StepperButton>
        </span>
        {suffix && <span className="w-3 font-mono text-[10px] text-white/55">{suffix}</span>}
      </span>
    </label>
  )
}

export const BotControlWidget = forwardRef<HTMLDivElement, BotControlWidgetProps>(({
  cityColor,
  bot,
  params,
  onParamsChange,
  canSaveBot = false,
  savingBot = false,
  onSaveBot,
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
  const initialPosRef = useRef<{ x: number; y: number } | null>(null)
  const isChicken = bot.kind === 'chicken'

  return (
    <Draggable
      data-widget="bot-control"
      ref={ref}
      position={position}
      onDrag={onPositionChange}
      handleRef={effectiveHandleRef}
      dragFromBackground
      className={cn("pointer-events-auto", props.className)}
      style={{ ...props.style, zIndex: undefined }}
      {...props}
    >
      <Resizable
        defaultSize={{ width: 256, height: 310 }}
        size={isStatic ? { width: "100%", height: "auto" } : undefined}
        minWidth={210}
        minHeight={isStatic ? undefined : 160}
        maxWidth={isStatic ? undefined : "92vw"}
        maxHeight={isStatic ? undefined : "85vh"}
        enable={isStatic ? false : { top: false, right: true, bottom: true, left: true, topRight: false, bottomRight: true, bottomLeft: true, topLeft: false }}
        handleStyles={{
          bottom: { zIndex: 90, height: 14, bottom: -7, cursor: "ns-resize" },
          bottomRight: { zIndex: 90, width: 16, height: 16, right: -6, bottom: -6, cursor: "nwse-resize" },
          bottomLeft: { zIndex: 90, width: 16, height: 16, left: -6, bottom: -6, cursor: "nesw-resize" },
          right: { zIndex: 90, width: 12, right: -6, cursor: "ew-resize" },
          left: { zIndex: 90, width: 12, left: -6, cursor: "ew-resize" },
        }}
        handleWrapperStyle={{ zIndex: 90 }}
        handleComponent={{
          bottom: (
            <div data-no-drag="true" className="group flex h-full w-full items-center justify-center">
              <div className="h-1 w-8 rounded-full bg-white/25 transition-colors group-hover:bg-white/60" />
            </div>
          ),
          bottomRight: <div data-no-drag="true" className="h-full w-full" />,
          bottomLeft: <div data-no-drag="true" className="h-full w-full" />,
          right: <div data-no-drag="true" className="h-full w-full" />,
          left: <div data-no-drag="true" className="h-full w-full" />,
        }}
        className="relative flex flex-col"
        onResizeStart={event => {
          event.stopPropagation()
          initialPosRef.current = position || { x: 0, y: 0 }
        }}
        onResize={(_event, direction, _elementRef, delta) => {
          if (direction.includes("left") && initialPosRef.current) {
            onPositionChange?.({
              x: initialPosRef.current.x - delta.width,
              y: initialPosRef.current.y,
            })
          }
        }}
      >
        <div
          className="absolute inset-0 z-0 rounded-md border bg-black/85 backdrop-blur-md transition-all duration-300"
          style={{
            borderColor: "rgba(255,255,255,0.3)",
            boxShadow: `0 0 20px ${cityColor}40`,
          }}
        />
        <button
          type="button"
          aria-label="Desligar Bot Control"
          aria-hidden={togglePortalized || undefined}
          tabIndex={togglePortalized ? -1 : 0}
          ref={toggleRef}
          className={cn(
            "absolute z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-background text-[var(--city-neon)] shadow-md transition-all hover:text-[#60a5fa]",
            togglePortalized && "invisible pointer-events-none",
          )}
          style={{
            "--city-neon": cityColor,
            borderColor: "rgba(255,255,255,0.3)",
            top: -5,
            left: -8,
            boxShadow: `0 0 10px ${cityColor}40`,
          } as React.CSSProperties}
          onClick={event => {
            event.stopPropagation()
            onToggle()
          }}
        >
          <Power className="h-4 w-4 drop-shadow-[0_0_8px_currentColor]" />
        </button>

        <div ref={effectiveHandleRef} className="relative z-10 flex h-9 shrink-0 items-center justify-center px-8">
          <span className="truncate text-center font-mono text-xs font-bold uppercase tracking-wider text-white">
            BOT CONTROL
          </span>
        </div>

        <div className="debug-scroll relative z-10 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2.5 py-1.5 font-mono text-[10px] leading-tight text-white/80">
          <div className="mb-1 flex items-center justify-between gap-2 rounded bg-white/[0.04] px-2 py-1">
            <span className="truncate font-bold text-white">{bot.name}</span>
            <span className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
              isChicken ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" : "bg-zinc-500/20 text-zinc-300 border border-zinc-400/30"
            )}>
              {isChicken ? "Chicken Bot" : "PureChess Bot"}
            </span>
          </div>

          <ParamField
            code="U"
            label="Delay inicial"
            value={params.delaySeconds}
            min={0.5}
            max={30}
            step={0.5}
            suffix="s"
            onChange={delaySeconds => onParamsChange({ delaySeconds })}
          />

          <div className="pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300/85">
            Freeze {!isChicken && "(inativo em PureChess)"}
          </div>
          <ParamField
            code="X"
            label="Melhores jogadas alvo"
            value={params.freezeTopMoves}
            min={1}
            max={20}
            step={1}
            disabled={!isChicken}
            onChange={freezeTopMoves => onParamsChange({ freezeTopMoves: Math.round(freezeTopMoves) })}
          />
          <ParamField
            code="Y"
            label="Barra abaixo de"
            value={params.freezeChanceBelowPercent}
            min={0}
            max={100}
            step={1}
            suffix="%"
            disabled={!isChicken}
            onChange={freezeChanceBelowPercent => onParamsChange({ freezeChanceBelowPercent })}
          />
          <ParamField
            code="Z"
            label="A cada Z jogadas"
            value={params.freezeEveryMoves}
            min={1}
            max={100}
            step={1}
            disabled={!isChicken}
            onChange={freezeEveryMoves => onParamsChange({ freezeEveryMoves: Math.round(freezeEveryMoves) })}
          />

          <div className="pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300/85">
            Shield {!isChicken && "(inativo em PureChess)"}
          </div>
          <ParamField
            code="R"
            label="A cada R jogadas"
            value={params.shieldEveryMoves}
            min={1}
            max={100}
            step={1}
            disabled={!isChicken}
            onChange={shieldEveryMoves => onParamsChange({ shieldEveryMoves: Math.round(shieldEveryMoves) })}
          />
          <ParamField
            code="T"
            label="Barra acima de"
            value={params.shieldChanceAbovePercent}
            min={0}
            max={100}
            step={1}
            suffix="%"
            disabled={!isChicken}
            onChange={shieldChanceAbovePercent => onParamsChange({ shieldChanceAbovePercent })}
          />

          <div className="pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300/85">
            Buscar 3 Ovos (Worst) {!isChicken && "(inativo em PureChess)"}
          </div>
          <ParamField
            code="W"
            label="Barra acima de"
            value={params.worstChanceAbovePercent}
            min={0}
            max={100}
            step={1}
            suffix="%"
            disabled={!isChicken}
            onChange={worstChanceAbovePercent => onParamsChange({ worstChanceAbovePercent })}
          />
          <ParamField
            code="V"
            label="Score mínimo"
            value={params.worstMinScorePawns}
            min={-50}
            max={50}
            step={0.5}
            disabled={!isChicken}
            onChange={worstMinScorePawns => onParamsChange({ worstMinScorePawns })}
          />

          {canSaveBot && onSaveBot && (
            <div className="pt-1.5">
              <button
                type="button"
                disabled={savingBot}
                onClick={event => {
                  event.stopPropagation()
                  onSaveBot()
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-emerald-400/60 bg-emerald-500/20 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-emerald-200 transition-colors hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingBot ? "Salvando…" : "Salvar bot"}
              </button>
            </div>
          )}
        </div>
      </Resizable>
    </Draggable>
  )
})

BotControlWidget.displayName = "BotControlWidget"
