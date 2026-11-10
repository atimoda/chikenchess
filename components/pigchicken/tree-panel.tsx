"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Dice5, Move, Wind, X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { PatioRange } from "@/components/ui/patio-range"
import { PatioSelect } from "@/components/ui/patio-select"
import { gustSceneryWind } from "@/lib/pigchicken/scenery-wind"
import {
  TREE_BARKS, TREE_BLOOMS, TREE_CROWNS, TREE_EFFECTS, TREE_NUMBERS, TREE_STYLES, randomTree, treeDraftSize, treePreset, type TreeParams,
} from "@/lib/pigchicken/trees"
import type { PatioPlacementHandlers } from "./use-patio-placement"
import { CustomTreeArt } from "./tree-art"

const BUTTON = "inline-flex h-8 items-center justify-center gap-1.5 rounded border border-white/15 px-2.5 text-white hover:border-primary"
const STYLES = Object.fromEntries(Object.entries(TREE_STYLES).map(([key, p]) => [key, p.label])) as Record<TreeParams['style'], string>

function TreeGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return <PatioDisclosure title={title} open={open} onToggle={setOpen}>
    <div className="grid gap-2 px-4 pb-4">{children}</div>
  </PatioDisclosure>
}

export function TreePanel({ tree, onChange, onClose, previewDrag, dragging, dimensions = treeDraftSize(tree), worldX, legacy }: {
  tree: TreeParams; onChange: (tree: TreeParams, step?: string) => void; onClose: () => void
  previewDrag?: PatioPlacementHandlers; dragging?: boolean; dimensions?: { w: number; h: number }; worldX?: number; legacy?: ReactNode
}) {
  const session = useId()
  const gesture = useRef(0)
  const stopGust = useRef<(() => void) | null>(null)
  useEffect(() => () => stopGust.current?.(), [])
  const end = () => { gesture.current++ }
  const set = (patch: Partial<TreeParams>, key?: string) => onChange({ ...tree, ...patch }, key && `tree:${session}:${key}:${gesture.current}`)
  const range = (key: keyof typeof TREE_NUMBERS, label: string, unit = "", hint?: string) => {
    const [min, max] = TREE_NUMBERS[key]
    return <PatioRange label={label} value={tree[key]} min={min} max={max} display={`${tree[key]}${unit}`} hint={hint} onChange={v => set({ [key]: v }, key)} onEnd={end} />
  }
  const color = (key: "barkColor" | "leafColor" | "accentColor" | "flowerColor", label: string) => <label className="flex min-w-0 items-center gap-2">
    <input type="color" value={tree[key]} className="h-7 w-8 shrink-0 cursor-pointer rounded bg-transparent" onChange={e => set({ [key]: e.target.value }, key)} onBlur={end} />
    <span>{label}</span>
  </label>
  const toggle = (key: "climbTrunk" | "walkBranches" | "walkCrown" | "flip", label: string) => <label className="flex items-center gap-2">
    <input type="checkbox" checked={tree[key]} onChange={e => set({ [key]: e.target.checked })} /> {label}
  </label>
  const style = (next: TreeParams) => onChange({
    ...next, climbTrunk: tree.climbTrunk, walkBranches: tree.walkBranches, walkCrown: tree.walkCrown,
  })
  const art = <span className="absolute inset-x-4 top-1 bottom-4 flex justify-center">
    <span className="relative h-full max-w-full" style={{ aspectRatio: `${dimensions.w} / ${dimensions.h}` }}>
      {legacy ?? <CustomTreeArt tree={tree} worldX={worldX} />}
    </span>
  </span>
  return <FloatingPanel id="patio-tree" aria-label="Editor de árvores" initial={(vw, vh) => ({
    x: Math.max(8, vw - 390), y: 64, w: Math.min(vw - 16, 376), h: Math.min(vh - 78, 660),
  })} minW={245} minH={170} keepInViewport
    className={`rounded-xl border border-[#ffd166]/40 bg-[#101713] font-mono text-xs text-[#dfe8df] shadow-[0_20px_60px_#0009] ${dragging ? "pointer-events-none opacity-0" : ""}`}>
    <div data-drag-handle className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
      <h2 className="text-sm text-white">{previewDrag ? "Criador de árvores" : "Editar árvore"}</h2>
      <button type="button" className={BUTTON} aria-label="Fechar editor de árvores" onClick={onClose}><X size={16} /></button>
    </div>
    <div className="mx-3 my-2 shrink-0">
      {previewDrag
        ? <button type="button" aria-label="Arraste a prévia para inserir a árvore" {...previewDrag}
          className="relative block h-[clamp(64px,20dvh,144px)] w-full cursor-grab touch-none overflow-hidden rounded-md border border-[#ffd166]/35 bg-[#222936] active:cursor-grabbing">
          {art}<span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[#141922]/90 py-0.5 text-[10px] text-[#ffdba1]"><Move size={12} /> Arraste para o Pátio</span>
        </button>
        : <div className="relative h-[clamp(64px,20dvh,144px)] overflow-hidden rounded-md border border-white/10 bg-[#222936]">{art}</div>}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="grid gap-2 px-4 pb-2">
        {legacy && <p className="text-[10px] leading-relaxed text-[#a6b5a9]">A primeira alteração aplica a versão paramétrica à árvore original.</p>}
        <PatioSelect label="Estilo" options={STYLES} value={tree.style} onChange={value => style(treePreset(value, tree.seed))} />
        <button type="button" className={`${BUTTON} justify-self-end`} onClick={() => style(randomTree(tree.style).tree)}><Dice5 size={15} /> Sortear</button>
      </div>
      <TreeGroup title="Tronco">
        <div className="grid gap-[3px]">
        {range("trunkHeight", "Altura do tronco", "%")}
        {range("trunkWidth", "Espessura da base", "%")}
        {range("taper", "Espessura da ponta", "%")}
        {range("lean", "Inclinação lateral", "%")}
        </div>
        <PatioSelect label="Casca" options={TREE_BARKS} value={tree.bark} onChange={bark => set({ bark })} />
        {color("barkColor", "Cor da casca")}
        {toggle("flip", "Espelhar")}
      </TreeGroup>
      <TreeGroup title="Galhos e folhas">
        <div className="grid gap-[3px]">
        {range("branches", "Quantidade de galhos")}
        {range("angle", "Inclinação dos galhos", "%")}
        </div>
        <PatioSelect label="Copa" options={TREE_CROWNS} value={tree.crown} onChange={crown => set({ crown })} />
        <div className="grid gap-[3px]">
        {range("spread", "Abertura da copa", "%")}
        {range("density", "Grupos de folhas")}
        {range("leafSize", "Tamanho dos grupos", "%")}
        {range("sharpness", "Pontas das folhas", "%")}
        </div>
        <PatioSelect label="Floração" options={TREE_BLOOMS} value={tree.bloom} onChange={bloom => set({ bloom })} />
        {tree.bloom === "custom" && color("flowerColor", "Cor das flores")}
        <div className="grid grid-cols-2 gap-2">{color("leafColor", "Folhas")}{color("accentColor", "Destaques")}</div>
      </TreeGroup>
      <TreeGroup title="Movimento e efeitos">
        <div className="grid gap-[3px]">
        {range("trunkSway", "Balanço do tronco", "°", tree.climbTrunk || tree.walkBranches || tree.walkCrown
          ? "O tronco fica firme com apoios ligados." : "Balanço manual em tempo calmo. Rajadas podem somar movimento.")}
        {range("wind", "Balanço da copa", "°", tree.walkCrown || (tree.crown === "fronds" && tree.walkBranches)
          ? "A folhagem com apoios fica firme." : undefined)}
        {range("windPeriod", "Duração do balanço", " s")}
        </div>
        {worldX !== undefined && !legacy && <button type="button" className={`${BUTTON} justify-self-end`} onClick={() => {
          stopGust.current?.()
          stopGust.current = gustSceneryWind({ strength: 5, durationMs: 1800, fromX: worldX - 700, toX: worldX + 700 })
        }}><Wind size={15} /> Testar rajada</button>}
        <PatioSelect label="Efeito" options={TREE_EFFECTS} value={tree.effect}
          onChange={effect => set({ effect, particles: effect !== "none" && tree.particles === 0 ? 3 : tree.particles })} />
        {tree.effect !== "none" && range("particles", "Quantidade de partículas")}
      </TreeGroup>
      <TreeGroup title="Apoios para a galinha">
        {toggle("climbTrunk", "Tronco escalável")}
        {toggle("walkBranches", "Galhos pisáveis")}
        {toggle("walkCrown", "Grupos de folhas pisáveis")}
      </TreeGroup>
    </div>
  </FloatingPanel>
}
