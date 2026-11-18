// The buildings of the Pátio's far scenery (Configurações do Pátio → Prédios), saved with each Pátio in
// `settings.skyline`: up to SKYLINE_MAX_ROWS rows of buildings, each at a depth of its own among the mountains and
// the tree lines. Without it (or with no rows) there are none. Their colour comes from the sky at their depth (the
// hour, the haze), like the mountains; these settings shape them and tint them.
// The geometry: lib/pigchicken/skyline-draw.ts. The drawing: components/pigchicken/parallax.tsx. The panel:
// components/pigchicken/skyline-fields.tsx.

// the facade's pattern: a grid of windows, thin vertical or horizontal stripes, a mix of those three (one per
// building), app windows with lines of code (a title bar with three dots on top), or server racks (data-centers)
export type SkylineFacade = 'janelas' | 'verticais' | 'horizontais' | 'misto' | 'codigo' | 'servidores'
export const SKYLINE_FACADES: Record<SkylineFacade, string> = {
  janelas: 'Grade de janelas', verticais: 'Listras verticais', horizontais: 'Listras horizontais', misto: 'Misturado',
  codigo: 'Código', servidores: 'Servidores',
}

// every number of a row: [min, max, step, label, hint]
export const SKYLINE_NUMS = {
  depth: [10, 88, 1, 'Profundidade', 'Quão longe a fileira fica: perto, ela corre quase com o chão; longe, quase parada, atrás das montanhas.'],
  lift: [0, 100, 1, 'Elevação', 'Sobe o chão da fileira, para os prédios aparecerem por cima do que está na frente.'],
  haze: [0, 100, 1, 'Névoa', 'Quanto a névoa do céu clareia a fileira e sobe do pé dos prédios.'],
  density: [20, 300, 5, 'Densidade', 'Quantos prédios em cada trecho. Acima de 100% eles se sobrepõem.'],
  height: [20, 500, 5, 'Altura', 'A altura média dos prédios.'],
  heightVar: [0, 100, 1, 'Variação de altura', 'O quanto as alturas mudam de um prédio para o outro.'],
  width: [30, 1000, 5, 'Largura', 'A largura média dos prédios. Bem largos e altos viram data-centers.'],
  widthVar: [0, 100, 1, 'Variação de largura', 'O quanto as larguras mudam de um prédio para o outro.'],
  gap: [0, 100, 1, 'Vãos', 'O espaço entre um prédio e o próximo. 0: colados.'],
  cluster: [0, 100, 1, 'Aglomerado', 'Junta os prédios em grupos com os mais altos no meio.'],
  setback: [0, 100, 1, 'Recuos no topo', 'A parte dos prédios com um ou dois degraus mais estreitos no alto.'],
  annex: [0, 100, 1, 'Anexos', 'A parte dos prédios com um bloco mais baixo colado ao lado.'],
  roof: [0, 100, 1, 'Coisas no teto', 'Caixas e máquinas em cima dos prédios.'],
  antenna: [0, 100, 1, 'Antenas', 'A parte dos prédios com uma antena.'],
  windowSize: [30, 300, 5, 'Janelas', 'O tamanho das janelas, listras, linhas de código e servidores.'],
  windowGap: [30, 300, 5, 'Espaço entre janelas', 'O espaço entre as janelas, listras e linhas.'],
  contrast: [0, 100, 1, 'Contraste da fachada', 'O quanto o desenho da fachada se destaca da parede. 0: só a silhueta.'],
  lit: [0, 100, 1, 'Luzes acesas', 'A parte das janelas, linhas de código ou luzes dos servidores acesas na cor das luzes.'],
  wallAmount: [0, 100, 1, 'Cor', 'Quanto a cor escolhida tinge a parede. 0: só a luz do céu.'],
  faceAmount: [0, 100, 1, 'Cor da fachada', 'Quanto a cor escolhida tinge o desenho da fachada.'],
} as const
export type SkylineNum = keyof typeof SKYLINE_NUMS

// model: the model the row started from (its sliders reset to that model's values)
export type SkylineRow = { show: boolean; model: SkylinePreset; facade: SkylineFacade; shape: number; wall: string; face: string; light: string } & Record<SkylineNum, number>
export type SkylineParams = { rows: SkylineRow[] }
export const SKYLINE_MAX_ROWS = 4
export const SKYLINE_SHAPES = 1000

// the models a row starts from (the panel's Modelo): every setting of the row
export type SkylinePreset = 'cidade' | 'flat' | 'codigo' | 'datacenter'
export const SKYLINE_PRESET_LABELS: Record<SkylinePreset, string> = { cidade: 'Cidade', flat: 'Skyline flat', codigo: 'Torres de código', datacenter: 'Data-center' }
type RowShape = Omit<SkylineRow, 'show' | 'shape' | 'model'>
export const SKYLINE_PRESETS: Record<SkylinePreset, RowShape> = {
  cidade: {
    facade: 'janelas', depth: 50, lift: 0, haze: 50, density: 100, height: 100, heightVar: 55, width: 100, widthVar: 50, gap: 30, cluster: 40,
    setback: 30, annex: 30, roof: 25, antenna: 20, windowSize: 100, windowGap: 100, contrast: 30, lit: 15,
    wall: '#3a3f5c', wallAmount: 0, face: '#fff1c9', faceAmount: 0, light: '#ffd27a',
  },
  flat: {
    facade: 'misto', depth: 60, lift: 0, haze: 70, density: 120, height: 120, heightVar: 60, width: 110, widthVar: 60, gap: 15, cluster: 50,
    setback: 50, annex: 50, roof: 0, antenna: 0, windowSize: 90, windowGap: 100, contrast: 22, lit: 0,
    wall: '#5b2a4a', wallAmount: 0, face: '#e7a8c4', faceAmount: 0, light: '#ffd27a',
  },
  codigo: {
    facade: 'codigo', depth: 45, lift: 0, haze: 20, density: 100, height: 160, heightVar: 60, width: 140, widthVar: 70, gap: 10, cluster: 80,
    setback: 0, annex: 0, roof: 0, antenna: 0, windowSize: 100, windowGap: 100, contrast: 45, lit: 30,
    wall: '#16223f', wallAmount: 75, face: '#8fb8ff', faceAmount: 60, light: '#e8c35a',
  },
  datacenter: {
    facade: 'servidores', depth: 70, lift: 0, haze: 60, density: 100, height: 260, heightVar: 20, width: 900, widthVar: 30, gap: 40, cluster: 0,
    setback: 10, annex: 70, roof: 70, antenna: 10, windowSize: 80, windowGap: 100, contrast: 30, lit: 40,
    wall: '#1f2a33', wallAmount: 30, face: '#9fb3c8', faceAmount: 0, light: '#6fe3ff',
  },
}
export const skylineRowFrom = (preset: SkylinePreset, shape = 0): SkylineRow => ({ show: true, model: preset, shape, ...SKYLINE_PRESETS[preset] })
// which model a row still matches exactly (null: changed since)
export function skylinePresetOf(row: SkylineRow): SkylinePreset | null {
  for (const [id, p] of Object.entries(SKYLINE_PRESETS) as [SkylinePreset, RowShape][]) {
    if ((Object.keys(p) as (keyof RowShape)[]).every(k => p[k] === row[k])) return id
  }
  return null
}

const HEX = /^#[0-9a-f]{6}$/i
const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(a, Math.min(b, v))) : d
const hex = (v: unknown, d: string) => typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d

function normalizeRow(raw: unknown): SkylineRow {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>, d = SKYLINE_PRESETS.cidade
  const out = {
    show: r.show !== false,
    model: typeof r.model === 'string' && r.model in SKYLINE_PRESETS ? r.model as SkylinePreset : 'cidade',
    facade: typeof r.facade === 'string' && r.facade in SKYLINE_FACADES ? r.facade as SkylineFacade : d.facade,
    shape: num(r.shape, 0, 0, SKYLINE_SHAPES - 1),
    wall: hex(r.wall, d.wall), face: hex(r.face, d.face), light: hex(r.light, d.light),
  } as SkylineRow
  for (const k of Object.keys(SKYLINE_NUMS) as SkylineNum[]) out[k] = num(r[k], d[k], SKYLINE_NUMS[k][0], SKYLINE_NUMS[k][1])
  return out
}

export function normalizeSkyline(raw: unknown): SkylineParams | undefined {
  const rows = (raw as { rows?: unknown } | null)?.rows
  if (!Array.isArray(rows) || !rows.length) return undefined
  return { rows: rows.slice(0, SKYLINE_MAX_ROWS).map(normalizeRow) }
}

// a row's depth (0 to 1, like the other layers)
export const skylineDepth = (row: SkylineRow) => row.depth / 100
