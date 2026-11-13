// The Quadro de lousa: a green school chalkboard with a text of its own, written in white chalk. It may also show a
// ghost chicken (a "fantasminha") doing one move over and over while a player is near it: the move's buttons as a
// script of held actions (TRAINING_DEMOS), played by a real chicken engine (components/pigchicken/training-ghosts.ts),
// so the ghost does exactly what the player's buttons would do.
import type { ChickenAction } from '../chicken/controls'

// one stretch of the script: how long (s) and which actions are held during it ('' = nothing)
export type DemoStep = [seconds: number, actions: string]
export type TrainingDemo = { label: string; text: string; face?: 1 | -1; steps: DemoStep[] }

export const DEMO_ACTIONS: readonly ChickenAction[] = ['left', 'right', 'up', 'down', 'crouch', 'jump', 'run']

// the moves, from the basic ones to the advanced ones; `text` is what a new board for the move says (primary keyboard
// and gamepad, default binds of data/chicken/default-controls.json)
const DEMOS = {
  walk: {
    label: 'Andar e correr',
    text: 'ANDAR E CORRER\nA / D  andar\nSHIFT + D  correr\nControle: analógico, X',
    steps: [[0.5, ''], [0.9, 'right'], [0.9, 'right+run'], [0.6, '']],
  },
  jump: {
    label: 'Pular e pulo duplo',
    text: 'PULAR\nESPAÇO  pular\nno ar, ESPAÇO de novo:\npulo duplo\nControle: A',
    steps: [[0.5, ''], [0.2, 'right'], [0.15, 'right+jump'], [0.35, 'right'], [0.5, ''], [0.15, 'right+jump'], [0.2, 'right'], [0.15, 'right+jump'], [0.5, 'right'], [0.8, '']],
  },
  fly: {
    label: 'Voar',
    text: 'VOAR\nno ar, segure ESPAÇO\npara planar\n+ W  cai mais devagar\nControle: segure A',
    steps: [[0.5, ''], [0.2, 'right+jump'], [0.15, 'right'], [1.8, 'right+jump'], [0.8, '']],
  },
  slide: {
    label: 'Agachar e slide',
    text: 'AGACHAR E SLIDE\nS  agachar\ncorrendo, aperte S\npara deslizar\nControle: ↓ e X',
    steps: [[0.5, ''], [0.8, 'right+crouch'], [0.3, ''], [0.7, 'right+run'], [1.0, 'right+run+crouch'], [0.8, '']],
  },
  superJump: {
    label: 'Super pulo',
    text: 'SUPER PULO\nsegure S\ne aperte ESPAÇO\npula o dobro\nControle: ↓ + A',
    steps: [[0.5, ''], [0.4, 'crouch'], [0.2, 'crouch+jump'], [0.4, 'jump'], [0.5, 'right'], [1.0, '']],
  },
  drop: {
    label: 'Descer da plataforma',
    text: 'DESCER DA PLATAFORMA\nS + ESPAÇO\nsegure S para\npassar direto\nControle: ↓ + A',
    steps: [[0.6, ''], [0.3, 'crouch'], [0.2, 'crouch+jump'], [0.1, 'crouch'], [0.9, ''], [0.3, 'crouch'], [0.2, 'crouch+jump'], [0.1, 'crouch'], [1.0, '']],
  },
  wall: {
    label: 'Agarrar e escalar parede',
    text: 'PAREDE\npule e encoste nela\nsem apertar nada\nW / S  sobe e desce\nControle: analógico',
    steps: [[0.5, ''], [0.15, 'right'], [0.1, 'right+jump'], [0.6, ''], [1.3, 'up'], [0.4, 'right'], [0.8, '']],
  },
  wallJump: {
    label: 'Pulo na parede',
    text: 'PULO NA PAREDE\nagarrada: ESPAÇO\n+ o lado de fora\nsolte tudo e agarre\na outra parede\nControle: A',
    steps: [[0.5, ''], [0.15, 'right'], [0.1, 'right+jump'], [0.5, ''], [0.12, 'jump+left'], [0.4, ''], [0.12, 'jump+right'], [0.4, ''], [0.12, 'jump+left'], [0.4, ''], [0.12, 'jump+right'], [0.4, ''], [0.12, 'jump+left'], [0.4, ''], [1.2, '']],
  },
  ceiling: {
    label: 'Pendurar no teto',
    text: 'TETO\npule segurando W\npara pendurar\nA / D  anda no teto\nESPAÇO  solta\nControle: ↑ + A',
    steps: [[0.5, ''], [0.3, 'up+jump'], [0.3, 'up'], [0.8, 'right'], [0.4, ''], [0.2, 'jump'], [1.0, '']],
  },
  flip: {
    label: 'Inverter de lado',
    text: 'INVERTER DE LADO\nem cima da caixa:\nCTRL + ESPAÇO\nde novo: volta\nControle: LT + A',
    steps: [[0.6, ''], [0.2, 'down'], [0.2, 'down+jump'], [0.9, ''], [0.2, 'down'], [0.2, 'down+jump'], [1.0, '']],
  },
  edge: {
    label: 'Agarrar a beira',
    text: 'AGARRAR A BEIRA\nagachada (S), ande\naté a ponta\nW  sobe de volta\nControle: ↓',
    steps: [[0.5, ''], [1.3, 'right+crouch'], [0.6, ''], [0.8, 'up'], [0.3, 'left'], [0.8, '']],
  },
  shocking: {
    label: 'Pulo chocando',
    text: 'PULO CHOCANDO\nsegure CTRL + ESPAÇO\nsolte ESPAÇO com W\n(A / D: para o lado)\nControle: LT + A',
    steps: [[0.5, ''], [0.2, 'down'], [0.5, 'down+jump'], [0.15, 'down+jump+up'], [0.05, 'down+up'], [0.3, 'right'], [1.4, '']],
  },
  airShocking: {
    label: 'Pulo chocando no ar',
    text: 'PULO CHOCANDO NO AR\nno ar: CTRL + ESPAÇO\nsegure para carregar\nsolte ESPAÇO com W\nControle: LT + A',
    steps: [[0.5, ''], [0.2, 'jump'], [0.1, ''], [0.4, 'down+jump'], [0.1, 'down+jump+up'], [0.05, 'down+up'], [0.45, ''], [0.8, 'right'], [2.4, '']],
  },
  longJump: {
    label: 'Salto longo',
    text: 'SALTO LONGO\ncorrendo (SHIFT + D)\nCTRL + ESPAÇO\ne solte ESPAÇO\nControle: X + LT + A',
    steps: [[0.5, ''], [0.3, 'right+run'], [0.25, 'right+run+down+jump'], [0.08, 'right+run+down'], [0.1, 'left'], [1.5, '']],
  },
  trampoline: {
    label: 'Trampolim',
    text: 'TRAMPOLIM\npouse em cima\npara quicar\nsegure S: atravessa\nControle: ↓',
    steps: [[0.5, ''], [1.3, 'right'], [1.5, '']],
  },
} satisfies Record<string, TrainingDemo>

export type DemoId = keyof typeof DEMOS
export const TRAINING_DEMOS: Record<DemoId, TrainingDemo> = DEMOS
export const DEMO_IDS = Object.keys(TRAINING_DEMOS) as DemoId[]
export const isDemoId = (v: unknown): v is DemoId => typeof v === 'string' && v in TRAINING_DEMOS

// a board: its text and, optionally, the move its ghost does. The ghost starts at (ghostX, ghostY) from the board's
// bottom middle (world units; it falls onto whatever floor is below) and shows while a player is within `reach`
// of the board's middle (horizontally, and as far up or down)
export type ChalkboardParams = { text: string; demo: DemoId | ''; ghostX: number; ghostY: number; reach: number }
export const CHALK_TEXT_MAX = 400
export const GHOST_OFFSET = { min: -1500, max: 1500 } as const
export const GHOST_REACH = { min: 100, max: 2000, default: 520 } as const

export const defaultChalkboard = (): ChalkboardParams => ({ text: 'Escreva aqui', demo: '', ghostX: 0, ghostY: 0, reach: GHOST_REACH.default })

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function normalizeChalkboard(raw: unknown): ChalkboardParams {
  const d = defaultChalkboard()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Record<string, unknown>
  return {
    text: typeof r.text === 'string' ? r.text.slice(0, CHALK_TEXT_MAX) : d.text,
    demo: isDemoId(r.demo) ? r.demo : '',
    ghostX: Math.round(clamp(num(r.ghostX, 0), GHOST_OFFSET.min, GHOST_OFFSET.max)),
    ghostY: Math.round(clamp(num(r.ghostY, 0), GHOST_OFFSET.min, GHOST_OFFSET.max)),
    reach: Math.round(clamp(num(r.reach, d.reach), GHOST_REACH.min, GHOST_REACH.max)),
  }
}

// a new board for a move: the move's own text, unless the board already says something else
export const chalkboardForDemo = (board: ChalkboardParams, demo: DemoId | ''): ChalkboardParams => {
  const own = board.text.trim() === '' || board.text === defaultChalkboard().text || DEMO_IDS.some(id => TRAINING_DEMOS[id].text === board.text)
  return { ...board, demo, ...(own && demo ? { text: TRAINING_DEMOS[demo].text } : {}) }
}

// the script's length (s)
export const demoLength = (demo: Pick<TrainingDemo, 'steps'>) => demo.steps.reduce((t, [s]) => t + s, 0)

// the actions held at `t` seconds into the script (past its end: none)
export function demoActionsAt(demo: Pick<TrainingDemo, 'steps'>, t: number): Partial<Record<ChickenAction, boolean>> {
  let at = 0
  for (const [s, keys] of demo.steps) {
    if (t < at + s) {
      const out: Partial<Record<ChickenAction, boolean>> = {}
      for (const k of keys.split('+')) if ((DEMO_ACTIONS as readonly string[]).includes(k)) out[k as ChickenAction] = true
      return out
    }
    at += s
  }
  return {}
}

// the text's lines and the font size (px) that fits them in a w × h board (inside its frame)
export function chalkFit(text: string, w: number, h: number) {
  const lines = text.split('\n')
  const longest = Math.max(1, ...lines.map(l => [...l].length))
  const iw = Math.max(10, w - 44), ih = Math.max(10, h - 48)
  const size = Math.max(8, Math.min(ih / (lines.length * 1.22), iw / (longest * 0.5), 46))
  return { lines, size: Math.round(size * 10) / 10 }
}

// whether a player at (px, py) (world, feet) is near the board to see its ghost: within `reach` of its middle
// sideways, and up and down within `reach` of the board or of where the ghost starts
export function nearBoard(board: { x: number; y: number; w: number; h: number }, params: Pick<ChalkboardParams, 'reach' | 'ghostY'>, px: number, py: number) {
  const { reach } = params
  const startY = board.y + board.h + params.ghostY
  const top = Math.min(board.y, startY), bottom = Math.max(board.y + board.h, startY)
  return Math.abs(px - (board.x + board.w / 2)) <= reach && py >= top - reach && py <= bottom + reach
}
