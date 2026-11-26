// The beats a zone can play (zone-ambience.ts keeps what a zone stores and what hits on each sixteenth). Each beat
// is a rhythm studied on its own: the kit that plays it (beat-kits.ts), its microtiming (how far each sixteenth of a
// beat sits from the rigid grid) and its patterns: the base one and its variations. Pure data.
// To add a beat: one entry in BEATS. To add a variation: one entry in its `variations`.
import { msg } from '../i18n'
import type { DrumRow, KitId } from './beat-kits'

// one bar in sixteenths per row: "." rest, "o" soft, "x" normal, "X" accent
export type DrumGrid = Partial<Record<DrumRow, string>>
// how far each note of a row sits from its sixteenth, in hundredths of a sixteenth (-50 … 50: half a sixteenth
// early to half a sixteenth late), one number per step
export type DrumTime = Partial<Record<DrumRow, number[]>>
export const STEPS = 16
export const SHIFT_MAX = 50

export type BeatId =
  | 'none' | 'straight' | 'half' | 'swing' | 'rock' | 'disco' | 'funk'
  | 'house' | 'techno' | 'trap' | 'boombap'
  | 'bossa' | 'samba' | 'baiao'
  | 'reggae' | 'dembow' | 'afro'
  | 'breeze' | 'fair' | 'pulse'
  | 'lofi' | 'cafe' | 'chuva'
export type BeatGroup = 'Pop e rock' | 'Eletrônica' | 'Brasil' | 'Mundo' | 'Lo-fi' | 'Suave'
// a pattern of a beat. time: the notes that leave the beat's microtiming (by row and step); lag: rows that sit
// late (or early) as a whole; beats/reps: how long it plays as a variation block (16 beats once when absent)
export type BeatPattern = { label: string; grid: DrumGrid; time?: DrumTime; lag?: Partial<Record<DrumRow, number>>; beats?: number; reps?: number }
// micro: the rhythm's microtiming, in hundredths of a sixteenth for each sixteenth of a beat (4 numbers, the same
// in every beat of the bar) or of the bar (16). Every row follows it, the bass and the grid the players' notes are
// pulled to as well. Numbers past ±50 only make sense there (a drum note is written on the nearest step instead)
// rotate: the variation (1 …) the base pattern hands over to for a phrase in every 16 bars while it plays
// (zone-dynamics.ts rotatedAmbience): one that colours the groove without changing it
export type Beat = BeatPattern & { id: BeatId; group: BeatGroup; kit: KitId; micro: number[]; variations: BeatPattern[]; rotate?: number }

// a row's own times: at({ 7: -33 }) is a bar with step 7 a third of a sixteenth early
const at = (steps: Record<number, number>) => Array.from({ length: STEPS }, (_, i) => steps[i] ?? 0)
const FILL = { beats: 4, reps: 1 }

// Microtiming, by rhythm (docs/mechanics/patio/rhythms.md has the sources and what is an estimate):
// samba [0, +10, -16, -16]: the 2nd sixteenth a little late, the 3rd and the 4th early (Gouyon 2007; Naveda 2011)
const SAMBA = [0, 10, -16, -16]
// the triplet grid of jazz swing: the off-beat eighth lands on the last third of the beat
const TRIPLET = [0, 33, 67, -33]
// sixteenths that swing: the 2nd and the 4th late (50 + n/2 is the "swing %" of a drum machine)
const sw = (n: number) => [0, n, 0, n]

export const BEATS: Beat[] = [
  // ---------- Pop e rock ----------
  {
    id: 'straight', label: msg('Reto'), group: msg('Pop e rock'), kit: 'acoustic', rotate: 1, micro: [0, 0, 0, 0], lag: { snare: 4 },
    grid: { kick: 'X.......X.......', snare: '....X.......X...', hat: 'X.o.X.o.X.o.X.o.' },
    variations: [
      { label: msg('Bumbo dobrado'), grid: { kick: 'X.......X.x.....', snare: '....X.......X...', hat: 'X.o.X.o.X.o.X.o.' } },
      { label: msg('Sincopado'), grid: { kick: 'X.....x.X.......', snare: '....X.......X...', hat: 'X.o.X.o.X.o.X...', openHat: '..............o.' } },
      { label: msg('Quatro no chão'), grid: { kick: 'X...X...X...X...', snare: '....X.......X...', hat: 'x.o.x.o.x.o.x.o.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X.......X.......', snare: '....X.....x.XxXx', tom: '.............o.X', hat: 'X.o.X.o.X.......' } },
    ],
  },
  {
    id: 'half', label: msg('Meio tempo'), group: msg('Pop e rock'), kit: 'acoustic', rotate: 1, micro: [0, 0, 0, 0], lag: { snare: 8 },
    grid: { kick: 'X...............', snare: '........X.......', hat: 'x...x...x...x...', openHat: '..............o.' },
    variations: [
      { label: msg('Com colcheias'), grid: { kick: 'X.........x.....', snare: '........X.......', hat: 'x.o.x.o.x.o.x.o.' } },
      { label: msg('Pesado'), grid: { kick: 'X.....x...x.....', snare: '........X.......', hat: 'x...x...x...x...', tom: '..............x.' } },
      { label: msg('Aberto'), grid: { kick: 'X...............', snare: '........X.......', hat: 'x...x...x...x...', openHat: '..o...o...o...o.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X...............', snare: '........X...x.x.', tom: '.............x.X', hat: 'x...x...x.......' } },
    ],
  },
  {
    // the ride leads ("ding, ding-a-ding"): its skip notes sit on the last third of beats 2 and 4
    id: 'swing', label: msg('Swing'), group: msg('Pop e rock'), kit: 'jazz', rotate: 1, micro: TRIPLET,
    grid: { kick: 'o...o...o...o...', clap: '....X.......X...', hat: 'X...X..xX...X..x' },
    variations: [
      { label: msg('Com caixa'), grid: { kick: 'o...o...o...o...', clap: '....X.......X...', hat: 'X...X..xX...X..x', snare: '.......o...x....' } },
      { label: msg('Shuffle'), grid: { kick: 'X.......X.......', snare: '....X.......X...', hat: 'X..xX..xX..xX..x' } },
      { label: msg('Em dois'), grid: { kick: 'x.......x.......', clap: '....X.......X...', hat: 'X...x...X...x...', perc: '...........o....' } },
      { label: msg('Cúpula'), grid: { kick: 'o...o...o...o...', clap: '....X.......X...', openHat: 'X..xX..xX..xX..x', snare: '...o.......o....' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'o...o...o...X...', clap: '....X...........', hat: 'X...X..xX.......', snare: '........Xx.xXx.x', tom: '...............X' } },
    ],
  },
  {
    id: 'rock', label: msg('Rock'), group: msg('Pop e rock'), kit: 'rock', rotate: 5, micro: [0, 0, 0, 0], lag: { snare: 6 },
    grid: { kick: 'X.....x.X.x.....', snare: '....X.......X...', hat: 'X.x.X.x.X.x.X...', openHat: '..............x.' },
    variations: [
      { label: msg('Bumbo em colcheias'), grid: { kick: 'X.x...x.X.x...x.', snare: '....X.......X...', hat: 'X.x.X.x.X.x.X.x.' } },
      { label: msg('Chimbal aberto'), grid: { kick: 'X.....x.X.x.....', snare: '....X.......X...', openHat: 'x.x.x.x.x.x.x.x.' } },
      { label: msg('No tom'), grid: { kick: 'X.....x.X.x.....', snare: '....X.......X...', tom: 'x.x.x.x.x.x.x.x.' } },
      { label: msg('Punk'), grid: { kick: 'X.X...X.X.X...X.', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' } },
      { label: msg('Com pandeirola'), grid: { kick: 'X.....x.X.x.....', snare: '....X.......X...', hat: 'X.x.X.x.X.x.X.x.', shaker: '..x...x...x...x.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X.....x.X.......', snare: '....X...x.xxX.x.', tom: '.............x.X', hat: 'X.x.X.x.........', perc: '................' } },
    ],
  },
  {
    // a steady live drummer: the open hi-hat of the off-beat and the backbeat sit a hair late
    id: 'disco', label: msg('Disco'), group: msg('Pop e rock'), kit: 'disco', rotate: 2, micro: [0, 0, 0, 0], lag: { openHat: 4, snare: 3 },
    grid: { kick: 'X...X...X...X...', snare: '....X.......X...', hat: 'x...x...x...x...', openHat: '..x...x...x...x.' },
    variations: [
      { label: msg('Semicolcheias'), grid: { kick: 'X...X...X...X...', snare: '....X.......X...', hat: 'xo.oxo.oxo.oxo.o', openHat: '..x...x...x...x.' } },
      { label: msg('Com palmas'), grid: { kick: 'X...X...X...X...', snare: '....X.......X...', clap: '....X.......X...', hat: 'x...x...x...x...', openHat: '..x...x...x...x.' } },
      { label: msg('Cowbell'), grid: { kick: 'X...X...X...X...', snare: '....X.......X...', hat: 'x...x...x...x...', openHat: '..x...x...x...x.', perc: 'x.x.x.x.x.x.x.x.' } },
      { label: msg('Pandeirola'), grid: { kick: 'X...X...X...X...', snare: '....X.......X...', openHat: '..x...x...x...x.', shaker: 'x.xxx.xxx.xxx.xx' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X...X...X...X...', snare: '....X.....x.XxXx', tom: '.............o.X', hat: 'x...x...x.......', openHat: '..x...x.........' } },
    ],
  },
  {
    // the sixteenths swing a little (early funk: nearly always, from barely there to a shuffle); the backbeat on time
    id: 'funk', label: msg('Funk'), group: msg('Pop e rock'), kit: 'funk', rotate: 4, micro: sw(12),
    grid: { kick: 'X..x..x...x..x..', snare: '....X..o.o..X..o', hat: 'x.x.x.x.x.x.x...', openHat: '..............x.' },
    variations: [
      { label: msg('Semicolcheias'), grid: { kick: 'X.x.......x..x..', snare: '....X..o.o.oX..o', hat: 'xxxxxxx.xxxxx.xx', openHat: '.......x.....x..' } },
      { label: msg('No um'), grid: { kick: 'X.......x.X.....', snare: '....X..o....X.o.', hat: 'x.x.x.x.x.x.x.x.' } },
      { label: msg('Sincopado'), grid: { kick: 'X..x...x..x.....', snare: '....X.....o.X..o', hat: 'x.xxx.xxx.xxx.xx' } },
      { label: msg('Com conga'), grid: { kick: 'X..x..x...x..x..', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.', tom: '..x..x.x..x..xx.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X..x..x...x.....', snare: '....X..o.oxxX.xX', tom: '.............x..', hat: 'x.x.x.x.x.......' } },
    ],
  },
  // ---------- Eletrônica ----------
  {
    // the shuffle of a drum machine on the hi-hats and the shaker (about 57%); the kick dead on the grid
    id: 'house', label: msg('House'), group: msg('Eletrônica'), kit: 'house', rotate: 2, micro: sw(14),
    grid: { kick: 'X...X...X...X...', clap: '....X.......X...', hat: '..X...X...X...X.', shaker: '.o.o.o.o.o.o.o.o' },
    variations: [
      { label: msg('Aberto'), grid: { kick: 'X...X...X...X...', clap: '....X.......X...', openHat: '..x...x...x...x.', hat: 'x..xx..xx..xx..x' } },
      { label: msg('Deep'), grid: { kick: 'X...X...X...X...', clap: '....X.......X...', hat: '..x...x...x...x.', perc: '...x..x....x..x.', shaker: '.o.o.o.o.o.o.o.o' } },
      { label: msg('Garage'), lag: { snare: 0 }, time: { hat: at({ 1: 26, 3: 26, 5: 26, 7: 26, 9: 26, 11: 26, 13: 26, 15: 26 }) },
        grid: { kick: 'X...X...X...X...', clap: '....X.......X...', hat: '.xx..xx..xx..xx.', snare: '.......o.o.....o' } },
      { label: msg('Jacking'), grid: { kick: 'X...X...X...X...', clap: '....X.......X...', snare: '..........o.x.xx', hat: 'x.X.x.X.x.X.x.X.' } },
      { label: msg('Só bumbo e palma'), grid: { kick: 'X...X...X...X...', clap: '....X.......X...' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X...X...X...X...', clap: '....X.......X...', snare: '........ooxxxxXX', tom: '.............x.X' } },
    ],
  },
  {
    id: 'techno', label: msg('Techno'), group: msg('Eletrônica'), kit: 'techno', rotate: 3, micro: sw(4),
    grid: { kick: 'X...X...X...X...', clap: '....x.......x...', hat: '..x...x...x...x.', shaker: 'oooooooooooooooo' },
    variations: [
      { label: msg('Hipnótico'), grid: { kick: 'X...X...X...X...', hat: '..x...x...x...x.', perc: 'x.x.x.x.x.x.x.x.', shaker: 'oooooooooooooooo' } },
      { label: msg('Sincopado'), grid: { kick: 'X...X...X..xX...', clap: '....x.......x...', hat: '..x...x...x...x.', snare: '......o.......o.' } },
      { label: msg('Minimal'), grid: { kick: 'X...X...X...X...', shaker: '..o..o.o..o..o.o', hat: '..x...x...x...x.' } },
      { label: msg('Industrial'), grid: { kick: 'X...X...X...X...', snare: '....X.......X...', hat: 'xxxxxxxxxxxxxxxx', openHat: '..x...x...x...x.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X...X...X...X...', snare: '........ooooxxXX', hat: '..x...x.........', tom: '..............xX' } },
    ],
  },
  {
    // half time: the clap of beat 3 drags, the hi-hats run on the grid
    id: 'trap', label: msg('Trap'), group: msg('Eletrônica'), kit: 'trap', rotate: 4, micro: [0, 0, 0, 0], lag: { clap: 6, snare: 6 },
    grid: { kick: 'X.....X...x.....', clap: '........X.......', hat: 'x.x.x.oox.x.x.xo', openHat: '..............o.' },
    variations: [
      { label: msg('808 longo'), grid: { kick: 'X.........x..x..', clap: '........X.......', hat: 'x.x.x.x.x.x.x.x.' } },
      { label: msg('Rolos'), grid: { kick: 'X.....X...x.....', clap: '........X.......', hat: 'x.x.xxxxx.x.x.oo', openHat: '..........o.....' } },
      { label: msg('Tresillo'), grid: { kick: 'X..x..x...x.....', clap: '........X.......', hat: 'x..x..x.x..x..x.' } },
      { label: msg('Com caixa'), grid: { kick: 'X.....X...x.....', clap: '........X.......', snare: '...........o..oo', hat: 'x.x.x.x.x.x.x.x.', perc: '..x.......x.....' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X.....X.........', clap: '........X.......', snare: '..........ooxxXX', hat: 'x.x.x.oox.......' } },
    ],
  },
  {
    // the swing of a sampler on the sixteenths (about 61%), the snare a hair late
    id: 'boombap', label: msg('Boom bap'), group: msg('Eletrônica'), kit: 'boombap', rotate: 4, micro: sw(22), lag: { snare: 5 },
    grid: { kick: 'X......xX.x.....', snare: '....X.......X...', hat: 'x.o.x.o.x.o.x.o.' },
    variations: [
      { label: msg('Semicolcheias'), grid: { kick: 'X......xX.x.....', snare: '....X.......X...', hat: 'xoxoxoxoxoxoxoxo' } },
      // the kick ahead and the snare behind a hi-hat that swings hard: the pull between them is the feel
      { label: msg('Solto'), lag: { kick: -6, snare: 10 }, time: { hat: at({ 1: 30, 3: 30, 5: 30, 7: 30, 9: 30, 11: 30, 13: 30, 15: 30 }) },
        grid: { kick: 'X.....x.X..x....', snare: '....X.......X...', hat: 'xoxoxoxoxoxoxoxo' } },
      { label: msg('Bumbo duplo'), grid: { kick: 'X.X....xX.x.....', snare: '....X.......X...', hat: 'x.o.x.o.x.o.x.o.' } },
      { label: msg('Com aro'), grid: { kick: 'X......xX.x.....', snare: '....X.......X...', perc: '..x....x..x.....', hat: 'x.o.x.o.x.o.x.o.' } },
      { label: msg('Lento'), grid: { kick: 'X.........xX....', snare: '....X.......X..o', hat: 'x.o.x.o.x.o.x.o.', openHat: '..............o.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X......xX.......', snare: '....X.....o.XoXx', hat: 'x.o.x.o.x.......', tom: '...............X' } },
    ],
  },
  // ---------- Brasil ----------
  {
    // samba's lilt at half strength, with the rim marking the clave
    id: 'bossa', label: msg('Bossa nova'), group: msg('Brasil'), kit: 'bossa', rotate: 2, micro: [0, 5, -8, -8],
    grid: { kick: 'X.....x.X.....x.', snare: 'x..x..x...x..x..', hat: 'xoxoxoxoxoxoxoxo' },
    variations: [
      { label: msg('Clave invertida'), grid: { kick: 'X.....x.X.....x.', snare: '..x..x..x..x..x.', hat: 'xoxoxoxoxoxoxoxo' } },
      { label: msg('Com ganzá'), grid: { kick: 'X.....x.X.....x.', snare: 'x..x..x...x..x..', shaker: 'xooxxooxxooxxoox' } },
      { label: msg('Suave'), grid: { kick: 'x.....o.x.....o.', hat: 'xoxoxoxoxoxoxoxo', openHat: '....x.......x...' } },
      { label: msg('Sambinha'), grid: { kick: 'X..xX..xX..xX..x', snare: 'x..x..x...x..x..', hat: 'xoxoxoxoxoxoxoxo', perc: '.o.....o.o.....o' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X.....x.X.....x.', snare: 'x..x..x.........', perc: '........o.ooxox.', tom: '.............x.x', hat: 'xoxoxoxo........' } },
    ],
  },
  {
    // the surdo answers on the second beat; tamborim in teleco-teco; ganzá and pandeiro carry the lilt
    id: 'samba', label: msg('Samba'), group: msg('Brasil'), kit: 'samba', rotate: 5, micro: SAMBA,
    grid: { kick: '....X.......X...', tom: 'x..o....x..o..x.', clap: 'x.x.xx.x.x.xx.x.', shaker: 'xooxxooxxooxxoox', snare: 'o..oo..oo..oo..o' },
    variations: [
      { label: msg('Partido alto'), grid: { kick: '....X.......X...', tom: 'x.......x.....x.', hat: 'X..x.xx.x.x..xx.', shaker: 'xooxxooxxooxxoox' } },
      { label: msg('Batucada'), grid: { kick: '....X.......X...', tom: 'x..o....x..o..x.', snare: 'XooxXooxXooxXoox', clap: 'x.x.xx.x.x.xx.x.', openHat: '..x.xx....x.xx..', perc: 'x......xx......x', shaker: 'xooxxooxxooxxoox' } },
      { label: msg('Teleco-teco invertido'), grid: { kick: '....X.......X...', tom: 'x..o....x..o..x.', clap: '.x.xx.x.x.x.xx.x', shaker: 'xooxxooxxooxxoox' } },
      { label: msg('Pandeiro'), grid: { kick: '....x.......x...', hat: 'XoxoXoxoXoxoXoxo', perc: '..x...x...x...x.' } },
      { label: msg('Agogô'), grid: { kick: '....X.......X...', tom: 'x.......x.......', openHat: '..x.xx....x.xx..', perc: 'x......xx......x', shaker: 'xooxxooxxooxxoox', snare: 'o..oo..oo..oo..o' } },
      { label: msg('Breque'), ...FILL, grid: { kick: 'X..X..X.X.......', tom: 'X..X..X.X.......', snare: 'X..X..X.X...xxXX', clap: 'X..X..X.X.......' } },
    ],
  },
  {
    // zabumba low and its thin stick high, the triangle ringing open on the off-beat. No measurement of the
    // baião's microtiming was found: a lighter lilt in the samba's direction, to be tuned by ear
    id: 'baiao', label: msg('Baião'), group: msg('Brasil'), kit: 'baiao', rotate: 5, micro: [0, 6, -6, -10],
    grid: { kick: 'X..x....X..x....', snare: '......x.......x.', hat: 'xx.xxx.xxx.xxx.x', openHat: '..X...X...X...X.' },
    variations: [
      { label: msg('Xote'), grid: { kick: 'X.....x.X.....x.', snare: '....x.......x...', hat: 'x...x...x...x...', openHat: '..x...x...x...x.' } },
      { label: msg('Arrasta-pé'), grid: { kick: 'X...X...X...X...', snare: '..x...x...x...x.', hat: 'xx.xxx.xxx.xxx.x', openHat: '..X...X...X...X.' } },
      { label: msg('Xaxado'), grid: { kick: 'X..x..x.X..x..x.', snare: '..o...o...o...o.', hat: 'xx.xxx.xxx.xxx.x', openHat: '..X...X...X...X.', shaker: 'x.x.x.x.x.x.x.x.' } },
      { label: msg('Coco'), grid: { kick: 'X..x..X.X..x..X.', clap: 'xoxoxoxoxoxoxoxo', perc: '..x..x....x..x..', shaker: 'xooxxooxxooxxoox' } },
      { label: msg('Com agogô'), grid: { kick: 'X..x....X..x....', snare: '......x.......x.', hat: 'xx.xxx.xxx.xxx.x', openHat: '..X...X...X...X.', perc: 'x..x..x.x..x..x.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X..x....X..X..X.', tom: '...........X..X.', snare: '......x.x.xx.xx.', hat: 'xx.xxx.x........', openHat: '..X...X.........' } },
    ],
  },
  // ---------- Mundo ----------
  {
    // one drop: everything a little behind, the hi-hat shuffled between straight and triplet
    id: 'reggae', label: msg('Reggae'), group: msg('Mundo'), kit: 'reggae', rotate: 4, micro: sw(20), lag: { kick: 4, snare: 6 },
    grid: { kick: '........X.......', snare: '........x.......', hat: 'o.X.o.X.o.X.o.X.' },
    variations: [
      { label: msg('Rockers'), grid: { kick: 'X...X...X...X...', snare: '........X.......', hat: 'o.X.o.X.o.X.o.X.' } },
      { label: msg('Steppers'), grid: { kick: 'X...X...X...X...', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx' } },
      { label: msg('Semicolcheias'), grid: { kick: '........X.......', snare: '........x.......', hat: 'x.Xxx.Xxx.Xxx.Xx', openHat: '..............o.' } },
      { label: msg('Com aro'), grid: { kick: '........X.......', snare: '........x.......', hat: 'o.X.o.X.o.X.o.X.', perc: '..x...x.....x.x.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: '........X.......', snare: '........x...x.xx', tom: '..........x..x.X', hat: 'o.X.o.X.........' } },
    ],
  },
  {
    // programmed and nearly rigid: only the last snare of each half drags a little
    id: 'dembow', label: msg('Reggaeton'), group: msg('Mundo'), kit: 'dembow', rotate: 3, micro: [0, 0, 0, 0], time: { snare: at({ 3: 6, 11: 6 }) },
    grid: { kick: 'X...X...X...X...', snare: '...x..x....x..x.', hat: 'o.o.o.o.o.o.o.o.' },
    variations: [
      { label: msg('Perreo'), time: { snare: at({ 3: 6, 11: 6 }), clap: at({ 3: 6, 11: 6 }) },
        grid: { kick: 'X...X...X...X...', snare: '...x..x....x..x.', clap: '...x..x....x..x.', hat: 'x.xxx.xxx.xxx.xx' } },
      { label: msg('Aberto'), time: { snare: at({ 3: 6, 11: 6 }) },
        grid: { kick: 'X...X...X...X...', snare: '...x..x....x..x.', hat: 'o...o...o...o...', openHat: '..x...x...x...x.' } },
      { label: msg('Com conga'), time: { snare: at({ 3: 6, 11: 6 }) },
        grid: { kick: 'X...X...X...X...', snare: '...x..x....x..x.', hat: 'o.o.o.o.o.o.o.o.', tom: '..x..x....x..x..' } },
      { label: msg('Corte'), time: { snare: at({ 3: 6, 11: 6 }) },
        grid: { kick: 'X...............', snare: '...x..x....x..x.', perc: '...x..x....x..x.', shaker: 'x.x.x.x.x.x.x.x.' } },
      { label: msg('Virada'), ...FILL, time: { snare: at({ 3: 6 }) }, grid: { kick: 'X...X...X...X...', snare: '...x..x.x.xxx.xx', hat: 'o.o.o.o.........' } },
    ],
  },
  {
    // sixteenths between straight and triplet, the drums laid back behind the band
    id: 'afro', label: msg('Afrobeat'), group: msg('Mundo'), kit: 'afro', rotate: 1, micro: [0, 14, 3, 14], lag: { snare: 5 },
    grid: { kick: 'X..x..X...x.....', snare: 'o..x..o...x.o...', hat: 'x.x.x.x.x.x.x.x.', shaker: 'x.xox.xox.xox.xo' },
    variations: [
      { label: msg('Com agogô'), grid: { kick: 'X..x..X...x.....', snare: 'o..x..o...x.o...', shaker: 'x.xox.xox.xox.xo', perc: 'x..x..x...x.x...' } },
      { label: msg('Segundo padrão'), grid: { kick: 'X.....X..x..X...', snare: '....x..o.o..x...', hat: 'x.xxx.xxx.xxx.xx', shaker: 'x.xox.xox.xox.xo' } },
      { label: msg('Com congas'), grid: { kick: 'X..x..X...x.....', snare: 'o..x..o...x.o...', tom: 'x..x....x.x.....', clap: '..x..x....x..x..', shaker: 'x.xox.xox.xox.xo' } },
      { label: msg('Highlife'), grid: { kick: 'x...x...x...x...', perc: 'x..x..x...x.x...', hat: 'x.xxx.xxx.xxx.xx', snare: '....o.......o...' } },
      { label: msg('Afrobeats'), grid: { kick: 'X.....x...X.....', snare: '...x..x....x..x.', shaker: 'xoxoxoxoxoxoxoxo', tom: '..............x.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X..x..X...x.....', snare: 'o..x..o.x.xxXxXx', tom: '..............xX', shaker: 'x.xox.xo........' } },
    ],
  },
  // ---------- Lo-fi ----------
  // Original grooves of the game, for a quiet background: a slowed, dulled acoustic kit (beat-kits.ts lofi), a lazy
  // sixteenth swing and the backbeat dragging well behind, like a drummer half asleep
  {
    // a head-nodding beat: the kick skips past the 2, the snare drags, the hats lean on the off-beats
    id: 'lofi', label: msg('Lo-fi'), group: msg('Lo-fi'), kit: 'lofi', rotate: 2, micro: sw(26), lag: { snare: 12, clap: 12, perc: 8 },
    grid: { kick: 'X......x..X.....', snare: '....X.......X...', hat: 'x.o.x.oox.o.x.o.' },
    variations: [
      { label: msg('Preguiçoso'), grid: { kick: 'X.........X..x..', snare: '....X.......X...', hat: 'x...x.o.x...x.o.' } },
      { label: msg('Com aro'), grid: { kick: 'X......x..X.....', perc: '....x.......x...', hat: 'x.o.x.o.x.o.x.o.', shaker: '..o...o...o...o.' } },
      { label: msg('Sem bumbo'), grid: { snare: '....o.......o...', hat: 'x.o.x.o.x.o.x.o.', openHat: '..............o.' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X......x..X.....', snare: '....X.....o.X.oo', tom: '.............o.x', hat: 'x.o.x.o.x.o.....' } },
    ],
  },
  {
    // jazz-hop at a café: brushes circling, a rim on 2 and 4, the off-beat eighth landing late
    id: 'cafe', label: msg('Café'), group: msg('Lo-fi'), kit: 'lofi', rotate: 1, micro: [0, 22, 38, 22], lag: { perc: 10, snare: 10 },
    grid: { kick: 'x.......x.....o.', perc: '....x.......x...', shaker: 'xoo.xoo.xoo.xoo.' },
    variations: [
      { label: msg('Vassourinha'), grid: { kick: 'x.......x.......', perc: '....x.......x...', shaker: 'xoxoxoxoxoxoxoxo' } },
      { label: msg('Com caixa'), grid: { kick: 'x.......x.....o.', snare: '....o.......x...', shaker: 'xoo.xoo.xoo.xoo.', hat: '..o.......o.....' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'x.......x.......', perc: '....x...........', snare: '..........o.oxo.', shaker: 'xoo.xoo.xoo.....', tom: '...............x' } },
    ],
  },
  {
    // rain on the window: a far-off kick, a few drops of rim, the brush barely there
    id: 'chuva', label: msg('Chuva'), group: msg('Lo-fi'), kit: 'lofi', rotate: 1, micro: sw(18), lag: { perc: 6 },
    grid: { kick: 'x.........x.....', perc: '........o.......', shaker: 'o.o.o.oo.o.o.o.o' },
    variations: [
      { label: msg('Gotas'), grid: { perc: 'o..o....o..o..o.', shaker: '..o...o...o...o.' } },
      { label: msg('Pulso lento'), grid: { kick: 'x.......x.......', shaker: '..o...o...o...o.', openHat: '..............o.' } },
    ],
  },
  // ---------- Suave ----------
  {
    id: 'breeze', label: msg('Brisa'), group: msg('Suave'), kit: 'soft', rotate: 1, micro: [0, 0, 0, 0],
    grid: { kick: 'o...............', shaker: 'x.o.x.o.x.o.x.o.' },
    variations: [
      { label: msg('Com clave'), grid: { kick: 'o...............', shaker: 'x.o.x.o.x.o.x.o.', perc: 'o..o..o...o.o...' } },
      { label: msg('Mais cheia'), grid: { kick: 'o.......o.......', shaker: 'xooxxooxxooxxoox' } },
      { label: msg('Só ganzá'), grid: { shaker: 'x.o.x.o.x.o.x.o.' } },
    ],
  },
  {
    // the old "Swing" of the scenes: straight on the grid, it takes its lilt from the zone's Balanço
    id: 'fair', label: msg('Feira'), group: msg('Suave'), kit: 'acoustic', rotate: 1, micro: [0, 0, 0, 0],
    grid: { kick: 'X.......X.X.....', clap: '....X.......X...', hat: 'X.o.X.o.X.o.X.o.', shaker: '.o.o.o.o.o.o.o.o' },
    variations: [
      { label: msg('Sem chocalho'), grid: { kick: 'X.......X.X.....', clap: '....X.......X...', hat: 'X.o.X.o.X.o.X.o.' } },
      { label: msg('Com caixa'), grid: { kick: 'X.......X.X.....', clap: '....X.......X...', snare: '....x.......x...', hat: 'X.o.X.o.X.o.X.o.', shaker: '.o.o.o.o.o.o.o.o' } },
      { label: msg('Virada'), ...FILL, grid: { kick: 'X.......X.X.....', clap: '....X.......X.XX', hat: 'X.o.X.o.X.......', tom: '.............x..' } },
    ],
  },
  {
    id: 'pulse', label: msg('Pulso'), group: msg('Suave'), kit: 'soft', rotate: 1, micro: [0, 0, 0, 0],
    grid: { kick: 'x...x...x...x...' },
    variations: [
      { label: msg('Com ganzá'), grid: { kick: 'x...x...x...x...', shaker: '..o...o...o...o.' } },
      { label: msg('Meio pulso'), grid: { kick: 'x.......x.......' } },
      { label: msg('Com clave'), grid: { kick: 'x...x...x...x...', perc: '..o...o...o...o.' } },
    ],
  },
]
export const BEAT_GROUPS: BeatGroup[] = [msg('Pop e rock'), msg('Eletrônica'), msg('Brasil'), msg('Mundo'), msg('Lo-fi'), msg('Suave')]
