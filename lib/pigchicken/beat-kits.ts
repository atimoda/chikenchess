// The timbres of a zone's percussion: each beat (beats.ts) names a kit, and a kit says which recorded instrument
// each row of the grid plays and what the row is called. Pure data: lib/pigchicken/kit-player.ts loads and plays the
// files, the panel shows the labels. The files are recordings (CC0: Versilian VCSL, Virtuosity Drums and plotzki's
// samba pack, see public/samples/README.md); the drum machines of the electronic beats are the game's own
// emulations of them. To add a kit: one entry in KITS.

export type DrumRow = 'kick' | 'snare' | 'clap' | 'hat' | 'openHat' | 'shaker' | 'tom' | 'perc'
// label: the row's name in the panel; file: bank/asset under /samples (take and extension are added); takes: how
// many takes the asset has (played in turn); gain: its level in the mix; rate: playback speed (tuning); lp: the
// brightest it gets (Hz: a worn, dusty recording; every hit goes through it and its speed wavers a hair, like tape)
export type KitVoice = { label: string; file: string; takes?: number; gain?: number; rate?: number; lp?: number }
export type KitId =
  | 'acoustic' | 'rock' | 'disco' | 'funk' | 'jazz' | 'boombap' | 'soft'
  | 'house' | 'techno' | 'trap' | 'dembow'
  | 'bossa' | 'samba' | 'baiao' | 'reggae' | 'afro'
  | 'lofi'
export type Kit = Partial<Record<DrumRow, KitVoice>>

const P = 'chicken-percussion-v1/', Y = 'chicken-patio-v1/', B = 'chicken-bateria-v1/', S = 'chicken-samba-reggae-v2/', M = 'chicken-machines-v1/'
const v = (label: string, file: string, takes = 1, gain = 1, rate = 1): KitVoice => ({ label, file, ...(takes > 1 ? { takes } : {}), ...(gain !== 1 ? { gain } : {}), ...(rate !== 1 ? { rate } : {}) })

// a drum kit played with sticks: the base of the pop and rock beats
const ACOUSTIC: Kit = {
  kick: v('Bumbo', P + 'kick', 2), snare: v('Caixa', P + 'snare', 2), clap: v('Palma', Y + 'clap', 2, 0.9),
  hat: v('Chimbal', P + 'hat', 2, 0.8), openHat: v('Aberto', P + 'open-hat', 2, 0.7), shaker: v('Chocalho', P + 'shaker', 2, 0.8),
  tom: v('Tom', P + 'tom', 2), perc: v('Caixa leve', P + 'ghost-snare', 2, 0.9),
}
export const KITS: Record<KitId, Kit> = {
  acoustic: ACOUSTIC,
  rock: { ...ACOUSTIC, shaker: v('Pandeirola', P + 'tambourine', 2, 0.7), perc: v('Prato', P + 'crash', 2, 0.6) },
  disco: { ...ACOUSTIC, shaker: v('Pandeirola', P + 'tambourine', 2, 0.7), perc: v('Cowbell', Y + 'cowbell', 1, 0.6) },
  funk: { ...ACOUSTIC, shaker: v('Pandeirola', P + 'tambourine', 2, 0.6), tom: v('Conga', P + 'conga', 2, 0.9) },
  // a jazz kit: the ride leads, the hi-hat closes with the foot, the snare whispers
  jazz: {
    kick: v('Bumbo', P + 'kick', 2, 0.6), snare: v('Caixa leve', P + 'ghost-snare', 2), clap: v('Chimbal no pé', Y + 'hat-foot', 2, 0.9),
    hat: v('Condução', P + 'ride', 2, 0.8), openHat: v('Cúpula', P + 'cymbal-tip', 2, 0.7), shaker: v('Chocalho', P + 'shaker', 2, 0.6),
    tom: v('Tom', P + 'tom', 2, 0.8), perc: v('Aro', Y + 'sidestick', 2, 0.9),
  },
  boombap: { ...ACOUSTIC, kick: v('Bumbo', P + 'kick', 2, 1.1, 0.92), snare: v('Caixa', P + 'snare', 2, 1, 0.94), perc: v('Aro', Y + 'sidestick', 2, 0.9) },
  soft: { ...ACOUSTIC, kick: v('Bumbo', P + 'kick', 2, 0.7), shaker: v('Ganzá', Y + 'ganza', 2, 0.8), perc: v('Clave', Y + 'clave', 1, 0.7) },
  // drum machines (the game's own emulations of the 909 and the 808)
  house: {
    kick: v('Bumbo 909', M + '909-kick'), snare: v('Caixa 909', M + '909-snare', 1, 0.8), clap: v('Palma 909', M + '909-clap', 1, 0.9),
    hat: v('Chimbal 909', M + '909-hat', 1, 0.7), openHat: v('Aberto 909', M + '909-open-hat', 1, 0.6), shaker: v('Maracas', M + '808-maracas', 1, 0.7),
    tom: v('Tom 909', M + '909-tom', 1, 0.8), perc: v('Aro 909', M + '909-rim', 1, 0.7),
  },
  techno: {
    kick: v('Bumbo 909', M + '909-kick-hard'), snare: v('Caixa 909', M + '909-snare-tight', 1, 0.8), clap: v('Palma 909', M + '909-clap', 1, 0.9),
    hat: v('Chimbal 909', M + '909-hat', 1, 0.7), openHat: v('Aberto 909', M + '909-open-hat', 1, 0.6), shaker: v('Tique', M + 'synth-tick', 1, 0.5),
    tom: v('Tom 909', M + '909-tom', 1, 0.8), perc: v('Condução 909', M + '909-ride', 1, 0.5),
  },
  trap: {
    kick: v('Bumbo 808', M + '808-kick-long'), snare: v('Caixa 808', M + '808-snare', 1, 0.9), clap: v('Palma 808', M + '808-clap', 1, 0.9),
    hat: v('Chimbal 808', M + '808-hat', 1, 0.7), openHat: v('Aberto 808', M + '808-open-hat', 1, 0.6), shaker: v('Maracas', M + '808-maracas', 1, 0.6),
    tom: v('Tom 808', M + '808-tom-low', 1, 0.8), perc: v('Aro 808', M + '808-rim', 1, 0.7),
  },
  dembow: {
    kick: v('Bumbo 909', M + '909-kick'), snare: v('Caixa', M + '909-snare-tight', 1, 0.9), clap: v('Palma 909', M + '909-clap', 1, 0.8),
    hat: v('Chimbal 909', M + '909-hat', 1, 0.6), openHat: v('Aberto 909', M + '909-open-hat', 1, 0.5), shaker: v('Maracas', M + '808-maracas', 1, 0.7),
    tom: v('Conga', P + 'conga', 2, 0.8), perc: v('Aro', Y + 'rimshot', 2, 0.8),
  },
  // Brazil
  bossa: {
    kick: v('Bumbo', P + 'kick', 2, 0.6), snare: v('Aro', Y + 'sidestick', 2), hat: v('Chimbal', P + 'hat', 2, 0.6),
    openHat: v('Chimbal no pé', Y + 'hat-foot', 2, 0.8), shaker: v('Ganzá', Y + 'ganza', 2, 0.8), tom: v('Tom', P + 'tom', 2, 0.7),
    perc: v('Caixa leve', P + 'ghost-snare', 2, 0.8),
  },
  samba: {
    kick: v('Surdo', B + 'surdo-primeira', 1, 1.1), tom: v('Surdo de corte', B + 'surdo-terceira'), snare: v('Caixa', B + 'caixa-leve', 1, 0.9),
    clap: v('Tamborim', B + 'tamborim', 1, 0.9), hat: v('Pandeiro', S + 'pandeiro', 1, 0.9), shaker: v('Ganzá', Y + 'ganza', 2, 0.8),
    openHat: v('Agogô agudo', S + 'agogo-agudo', 1, 0.6), perc: v('Agogô grave', S + 'agogo-grave', 1, 0.6),
  },
  baiao: {
    kick: v('Zabumba', Y + 'zabumba', 1, 1.1), snare: v('Bacalhau', Y + 'bacalhau', 1, 0.9), hat: v('Triângulo fechado', Y + 'triangle-closed', 2, 0.7),
    openHat: v('Triângulo aberto', Y + 'triangle-open', 1, 0.6), shaker: v('Ganzá', Y + 'ganza', 2, 0.7), tom: v('Zabumba aberta', Y + 'zabumba-aberta'),
    clap: v('Pandeiro', S + 'pandeiro', 1, 0.8), perc: v('Agogô', S + 'agogo-agudo', 1, 0.5),
  },
  // lo-fi: the acoustic kit slowed down and dulled, like a drum break sampled off a worn record
  lofi: {
    kick: { ...v('Bumbo', P + 'kick', 2, 0.95, 0.86), lp: 2600 }, snare: { ...v('Caixa abafada', P + 'snare', 2, 0.7, 0.8), lp: 3400 },
    clap: { ...v('Estalo', Y + 'clap', 2, 0.45, 0.84), lp: 3800 }, hat: { ...v('Chimbal', P + 'hat', 2, 0.5, 0.78), lp: 5200 },
    openHat: { ...v('Aberto', P + 'open-hat', 2, 0.35, 0.76), lp: 4800 }, shaker: { ...v('Vassourinha', P + 'shaker', 2, 0.5, 0.72), lp: 4200 },
    tom: { ...v('Tom', P + 'tom', 2, 0.6, 0.8), lp: 2400 }, perc: { ...v('Aro', Y + 'sidestick', 2, 0.65, 0.88), lp: 3600 },
  },
  // the world
  reggae: {
    kick: v('Bumbo', P + 'kick', 2, 1.1), snare: v('Aro', Y + 'rimshot', 2, 0.9), hat: v('Chimbal', P + 'hat', 2, 0.7),
    openHat: v('Aberto', P + 'open-hat', 2, 0.6), shaker: v('Chocalho', P + 'shaker', 2, 0.7), tom: v('Tom', P + 'tom', 2, 0.9, 1.2),
    perc: v('Aro leve', Y + 'sidestick', 2, 0.8), clap: v('Cowbell', Y + 'cowbell-muted', 1, 0.5),
  },
  afro: {
    kick: v('Bumbo', P + 'kick', 2), snare: v('Caixa leve', P + 'ghost-snare', 2, 1.1), hat: v('Chimbal', P + 'hat', 2, 0.7),
    openHat: v('Aberto', P + 'open-hat', 2, 0.6), shaker: v('Xequerê', Y + 'cabasa', 2, 0.8), tom: v('Conga', P + 'conga', 2, 0.9),
    clap: v('Conga abafada', P + 'muted-conga', 2, 0.9), perc: v('Agogô', Y + 'cowbell', 1, 0.5),
  },
}

// the order the rows are shown in, and what a row is called in a kit that has no voice for it
export const DRUM_ROWS: { id: DrumRow; label: string }[] = [
  { id: 'kick', label: 'Bumbo' }, { id: 'tom', label: 'Tom' }, { id: 'snare', label: 'Caixa' }, { id: 'clap', label: 'Palma' },
  { id: 'hat', label: 'Chimbal' }, { id: 'openHat', label: 'Aberto' }, { id: 'shaker', label: 'Chocalho' }, { id: 'perc', label: 'Percussão' },
]
export const kitOf = (id: KitId | undefined): Kit => KITS[id ?? 'acoustic'] ?? ACOUSTIC
export const rowLabel = (kit: Kit, row: DrumRow) => kit[row]?.label ?? DRUM_ROWS.find(r => r.id === row)!.label
// every file of a kit, takes included: "bank/asset-take" (the player adds /samples/ and the extension)
export const kitFiles = (kit: Kit) => Object.values(kit).flatMap(x => Array.from({ length: x.takes ?? 1 }, (_, i) => `${x.file}-${i}`))
