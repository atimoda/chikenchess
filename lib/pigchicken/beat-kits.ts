import { msg } from '../i18n'
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
  kick: v(msg('Bumbo'), P + 'kick', 2), snare: v(msg('Caixa'), P + 'snare', 2), clap: v(msg('Palma'), Y + 'clap', 2, 0.9),
  hat: v(msg('Chimbal'), P + 'hat', 2, 0.8), openHat: v(msg('Aberto'), P + 'open-hat', 2, 0.7), shaker: v(msg('Chocalho'), P + 'shaker', 2, 0.8),
  tom: v(msg('Tom'), P + 'tom', 2), perc: v(msg('Caixa leve'), P + 'ghost-snare', 2, 0.9),
}
export const KITS: Record<KitId, Kit> = {
  acoustic: ACOUSTIC,
  rock: { ...ACOUSTIC, shaker: v(msg('Pandeirola'), P + 'tambourine', 2, 0.7), perc: v(msg('Prato'), P + 'crash', 2, 0.6) },
  disco: { ...ACOUSTIC, shaker: v(msg('Pandeirola'), P + 'tambourine', 2, 0.7), perc: v(msg('Cowbell'), Y + 'cowbell', 1, 0.6) },
  funk: { ...ACOUSTIC, shaker: v(msg('Pandeirola'), P + 'tambourine', 2, 0.6), tom: v(msg('Conga'), P + 'conga', 2, 0.9) },
  // a jazz kit: the ride leads, the hi-hat closes with the foot, the snare whispers
  jazz: {
    kick: v(msg('Bumbo'), P + 'kick', 2, 0.6), snare: v(msg('Caixa leve'), P + 'ghost-snare', 2), clap: v(msg('Chimbal no pé'), Y + 'hat-foot', 2, 0.9),
    hat: v(msg('Condução'), P + 'ride', 2, 0.8), openHat: v(msg('Cúpula'), P + 'cymbal-tip', 2, 0.7), shaker: v(msg('Chocalho'), P + 'shaker', 2, 0.6),
    tom: v(msg('Tom'), P + 'tom', 2, 0.8), perc: v(msg('Aro'), Y + 'sidestick', 2, 0.9),
  },
  boombap: { ...ACOUSTIC, kick: v(msg('Bumbo'), P + 'kick', 2, 1.1, 0.92), snare: v(msg('Caixa'), P + 'snare', 2, 1, 0.94), perc: v(msg('Aro'), Y + 'sidestick', 2, 0.9) },
  soft: { ...ACOUSTIC, kick: v(msg('Bumbo'), P + 'kick', 2, 0.7), shaker: v(msg('Ganzá'), Y + 'ganza', 2, 0.8), perc: v(msg('Clave'), Y + 'clave', 1, 0.7) },
  // drum machines (the game's own emulations of the 909 and the 808)
  house: {
    kick: v(msg('Bumbo 909'), M + '909-kick'), snare: v(msg('Caixa 909'), M + '909-snare', 1, 0.8), clap: v(msg('Palma 909'), M + '909-clap', 1, 0.9),
    hat: v(msg('Chimbal 909'), M + '909-hat', 1, 0.7), openHat: v(msg('Aberto 909'), M + '909-open-hat', 1, 0.6), shaker: v(msg('Maracas'), M + '808-maracas', 1, 0.7),
    tom: v(msg('Tom 909'), M + '909-tom', 1, 0.8), perc: v(msg('Aro 909'), M + '909-rim', 1, 0.7),
  },
  techno: {
    kick: v(msg('Bumbo 909'), M + '909-kick-hard'), snare: v(msg('Caixa 909'), M + '909-snare-tight', 1, 0.8), clap: v(msg('Palma 909'), M + '909-clap', 1, 0.9),
    hat: v(msg('Chimbal 909'), M + '909-hat', 1, 0.7), openHat: v(msg('Aberto 909'), M + '909-open-hat', 1, 0.6), shaker: v(msg('Tique'), M + 'synth-tick', 1, 0.5),
    tom: v(msg('Tom 909'), M + '909-tom', 1, 0.8), perc: v(msg('Condução 909'), M + '909-ride', 1, 0.5),
  },
  trap: {
    kick: v(msg('Bumbo 808'), M + '808-kick-long'), snare: v(msg('Caixa 808'), M + '808-snare', 1, 0.9), clap: v(msg('Palma 808'), M + '808-clap', 1, 0.9),
    hat: v(msg('Chimbal 808'), M + '808-hat', 1, 0.7), openHat: v(msg('Aberto 808'), M + '808-open-hat', 1, 0.6), shaker: v(msg('Maracas'), M + '808-maracas', 1, 0.6),
    tom: v(msg('Tom 808'), M + '808-tom-low', 1, 0.8), perc: v(msg('Aro 808'), M + '808-rim', 1, 0.7),
  },
  dembow: {
    kick: v(msg('Bumbo 909'), M + '909-kick'), snare: v(msg('Caixa'), M + '909-snare-tight', 1, 0.9), clap: v(msg('Palma 909'), M + '909-clap', 1, 0.8),
    hat: v(msg('Chimbal 909'), M + '909-hat', 1, 0.6), openHat: v(msg('Aberto 909'), M + '909-open-hat', 1, 0.5), shaker: v(msg('Maracas'), M + '808-maracas', 1, 0.7),
    tom: v(msg('Conga'), P + 'conga', 2, 0.8), perc: v(msg('Aro'), Y + 'rimshot', 2, 0.8),
  },
  // Brazil
  bossa: {
    kick: v(msg('Bumbo'), P + 'kick', 2, 0.6), snare: v(msg('Aro'), Y + 'sidestick', 2), hat: v(msg('Chimbal'), P + 'hat', 2, 0.6),
    openHat: v(msg('Chimbal no pé'), Y + 'hat-foot', 2, 0.8), shaker: v(msg('Ganzá'), Y + 'ganza', 2, 0.8), tom: v(msg('Tom'), P + 'tom', 2, 0.7),
    perc: v(msg('Caixa leve'), P + 'ghost-snare', 2, 0.8),
  },
  samba: {
    kick: v(msg('Surdo'), B + 'surdo-primeira', 1, 1.1), tom: v(msg('Surdo de corte'), B + 'surdo-terceira'), snare: v(msg('Caixa'), B + 'caixa-leve', 1, 0.9),
    clap: v(msg('Tamborim'), B + 'tamborim', 1, 0.9), hat: v(msg('Pandeiro'), S + 'pandeiro', 1, 0.9), shaker: v(msg('Ganzá'), Y + 'ganza', 2, 0.8),
    openHat: v(msg('Agogô agudo'), S + 'agogo-agudo', 1, 0.6), perc: v(msg('Agogô grave'), S + 'agogo-grave', 1, 0.6),
  },
  baiao: {
    kick: v(msg('Zabumba'), Y + 'zabumba', 1, 1.1), snare: v(msg('Bacalhau'), Y + 'bacalhau', 1, 0.9), hat: v(msg('Triângulo fechado'), Y + 'triangle-closed', 2, 0.7),
    openHat: v(msg('Triângulo aberto'), Y + 'triangle-open', 1, 0.6), shaker: v(msg('Ganzá'), Y + 'ganza', 2, 0.7), tom: v(msg('Zabumba aberta'), Y + 'zabumba-aberta'),
    clap: v(msg('Pandeiro'), S + 'pandeiro', 1, 0.8), perc: v(msg('Agogô'), S + 'agogo-agudo', 1, 0.5),
  },
  // lo-fi: the acoustic kit slowed down and dulled, like a drum break sampled off a worn record
  lofi: {
    kick: { ...v(msg('Bumbo'), P + 'kick', 2, 0.95, 0.86), lp: 2600 }, snare: { ...v(msg('Caixa abafada'), P + 'snare', 2, 0.7, 0.8), lp: 3400 },
    clap: { ...v(msg('Estalo'), Y + 'clap', 2, 0.45, 0.84), lp: 3800 }, hat: { ...v(msg('Chimbal'), P + 'hat', 2, 0.5, 0.78), lp: 5200 },
    openHat: { ...v(msg('Aberto'), P + 'open-hat', 2, 0.35, 0.76), lp: 4800 }, shaker: { ...v(msg('Vassourinha'), P + 'shaker', 2, 0.5, 0.72), lp: 4200 },
    tom: { ...v(msg('Tom'), P + 'tom', 2, 0.6, 0.8), lp: 2400 }, perc: { ...v(msg('Aro'), Y + 'sidestick', 2, 0.65, 0.88), lp: 3600 },
  },
  // the world
  reggae: {
    kick: v(msg('Bumbo'), P + 'kick', 2, 1.1), snare: v(msg('Aro'), Y + 'rimshot', 2, 0.9), hat: v(msg('Chimbal'), P + 'hat', 2, 0.7),
    openHat: v(msg('Aberto'), P + 'open-hat', 2, 0.6), shaker: v(msg('Chocalho'), P + 'shaker', 2, 0.7), tom: v(msg('Tom'), P + 'tom', 2, 0.9, 1.2),
    perc: v(msg('Aro leve'), Y + 'sidestick', 2, 0.8), clap: v(msg('Cowbell'), Y + 'cowbell-muted', 1, 0.5),
  },
  afro: {
    kick: v(msg('Bumbo'), P + 'kick', 2), snare: v(msg('Caixa leve'), P + 'ghost-snare', 2, 1.1), hat: v(msg('Chimbal'), P + 'hat', 2, 0.7),
    openHat: v(msg('Aberto'), P + 'open-hat', 2, 0.6), shaker: v(msg('Xequerê'), Y + 'cabasa', 2, 0.8), tom: v(msg('Conga'), P + 'conga', 2, 0.9),
    clap: v(msg('Conga abafada'), P + 'muted-conga', 2, 0.9), perc: v(msg('Agogô'), Y + 'cowbell', 1, 0.5),
  },
}

// the order the rows are shown in, and what a row is called in a kit that has no voice for it
export const DRUM_ROWS: { id: DrumRow; label: string }[] = [
  { id: 'kick', label: msg('Bumbo') }, { id: 'tom', label: msg('Tom') }, { id: 'snare', label: msg('Caixa') }, { id: 'clap', label: msg('Palma') },
  { id: 'hat', label: msg('Chimbal') }, { id: 'openHat', label: msg('Aberto') }, { id: 'shaker', label: msg('Chocalho') }, { id: 'perc', label: msg('Percussão') },
]
export const kitOf = (id: KitId | undefined): Kit => KITS[id ?? 'acoustic'] ?? ACOUSTIC
export const rowLabel = (kit: Kit, row: DrumRow) => kit[row]?.label ?? DRUM_ROWS.find(r => r.id === row)!.label
// every file of a kit, takes included: "bank/asset-take" (the player adds /samples/ and the extension)
export const kitFiles = (kit: Kit) => Object.values(kit).flatMap(x => Array.from({ length: x.takes ?? 1 }, (_, i) => `${x.file}-${i}`))
