import { drums, electro, jazz, keys, rhythm, strings, synths, voice, world, type ProfileSource, type StyleProfile } from './types'
import { HARMONY_PLANS } from '../harmony'

type Palette = 'punk' | 'piano' | 'rock' | 'soul' | 'folk' | 'jazz' | 'indie' | 'swing' | 'southern' | 'blues'

export type HarmonicStageConfig = Omit<StyleProfile, 'parts' | 'swing' | 'sections'> & {
  palette: Palette
  tag: string
  bass: [string, string, string, string]
  lead: [string, string, string, string]
  reply: [string, string, string, string]
  swing?: number
  sections?: number[]
}

const all = { active: [true, true, true, true] }
const chorus = { active: [false, true, false, true] }
const bridge = { active: [false, false, true, true] }
const pulse = ['0 . . . 0 . . .', '0 . . 0 0 . . .', '0 . . . . . 0 .', '0 . . . 0 . 0 .']
const backbeat = ['. . 0 . . . 0 .', '. . 0 . . 0 0 .', '. . 0 . . . . .', '. . 0 . . . 0 0']
const hat = ['0 . 0 . 0 . 0 .', '0 0 0 . 0 0 0 .', '0 . . . 0 . . .', '0 0 0 0 0 0 0 0']
const smallHits = ['. . . 0 . . . 0', '. 0 . . . 0 . .', '. . . . 0 . . .', '. 0 . 0 . . 0 .']
const longTone = ['0 . . . . . . .', '0 . . . . . . .', '0 . . . . . . .', '0 . . . . . . .']
const shortChords = ['0 . . . 0 . . .', '0 . 0 . 0 . . .', '0 . . . . . . .', '0 . 0 . 0 . 0 .']
const counter = ['. . . . 6 . 4 .', '. . 7 . . . 5 .', '. . . . 4 . 2 .', '. 7 . . 5 . 4 .']

type PitchedSources = { bass: ProfileSource; lead: ProfileSource; rhythm: ProfileSource; harmony: ProfileSource; reply: ProfileSource; texture: ProfileSource; secondary: ProfileSource; counter: ProfileSource }

const PITCHED_SOURCES: Record<Palette, PitchedSources> = {
  punk: { bass: strings('bass-pick'), lead: strings('crunch-electric'), rhythm: strings('muted-electric'), harmony: keys('organ'), reply: strings('slide-electric'), texture: synths('analog-pad'), secondary: strings('crunch-electric'), counter: synths('digital-pluck') },
  piano: { bass: strings('bass-round'), lead: keys('grand'), rhythm: keys('upright'), harmony: strings('cello'), reply: synths('choir'), texture: strings('violin'), secondary: keys('celesta'), counter: keys('celesta') },
  rock: { bass: strings('bass-pick'), lead: strings('crunch-electric'), rhythm: strings('muted-electric'), harmony: keys('organ'), reply: strings('slide-electric'), texture: synths('analog-pad'), secondary: keys('clav'), counter: synths('wavetable') },
  soul: { bass: strings('bass-round'), lead: keys('rhodes'), rhythm: keys('clav'), harmony: keys('organ'), reply: synths('choir'), texture: strings('violin'), secondary: keys('grand'), counter: jazz('brass') },
  folk: { bass: strings('bass-round'), lead: strings('steel'), rhythm: strings('nylon'), harmony: strings('cello'), reply: keys('accordion'), texture: strings('violin'), secondary: strings('pizzicato'), counter: world('flute') },
  jazz: { bass: jazz('pluck'), lead: jazz('reed'), rhythm: keys('upright'), harmony: keys('rhodes'), reply: jazz('brass'), texture: strings('cello'), secondary: keys('grand'), counter: keys('celesta') },
  indie: { bass: strings('bass-round'), lead: strings('nylon'), rhythm: strings('steel'), harmony: keys('celesta'), reply: synths('digital-pluck'), texture: synths('analog-pad'), secondary: keys('rhodes'), counter: world('flute') },
  swing: { bass: jazz('pluck'), lead: jazz('brass'), rhythm: keys('upright'), harmony: keys('grand'), reply: jazz('reed'), texture: strings('cello'), secondary: strings('pizzicato'), counter: keys('celesta') },
  southern: { bass: strings('bass-pick'), lead: strings('slide-electric'), rhythm: strings('crunch-electric'), harmony: keys('organ'), reply: strings('steel'), texture: strings('violin'), secondary: keys('clav'), counter: strings('muted-electric') },
  blues: { bass: strings('bass-round'), lead: strings('crunch-electric'), rhythm: keys('upright'), harmony: keys('organ'), reply: strings('slide-electric'), texture: strings('cello'), secondary: keys('rhodes'), counter: jazz('brass') },
}

function percussion(palette: Palette) {
  const acoustic = ['punk', 'rock', 'southern', 'blues'].includes(palette)
  const sparse = ['piano', 'folk', 'indie'].includes(palette)
  const jazzKit = palette === 'jazz' || palette === 'swing'
  return {
    kick: acoustic ? drums('rock-kick') : jazzKit ? jazz('kick', 0, false) : sparse ? drums('rock-kick') : electro('kick', 1),
    snare: acoustic ? drums('rock-snare') : jazzKit ? jazz('snare', 0, false) : sparse ? drums('brush') : drums('room-clap'),
    hat: jazzKit ? drums('ride') : sparse ? drums('tambourine') : electro('hat', acoustic ? 1 : 0),
    accent: jazzKit ? drums('wood-rim') : sparse ? drums('brush') : drums('room-clap'),
    air: jazzKit ? drums('ride') : sparse ? drums('tambourine') : electro('open-hat'),
    fill: acoustic ? drums('rock-snare') : jazzKit ? jazz('snare', 1, false) : drums('wood-rim'),
  }
}

const rockPulse = ['0 . . 0 0 . . .', '0 . 0 . 0 . . 0', '0 . . . 0 . . 0', '0 0 . 0 0 . 0 .']
const softPulse = ['0 . . . . . 0 .', '0 . . . 0 . . .', '0 . . . . . 0 .', '0 . . 0 . . 0 .']
const jazzPulse = ['0 . . . . . . .', '0 . . . 0 . . .', '0 . . . . . 0 .', '0 . . 0 . . . .']
const shuffleHat = ['0 . 0 0 . 0 0 .', '0 . 0 0 . 0 0 0', '0 . . 0 . 0 0 .', '0 . 0 0 . 0 0 .']
const gentleHat = ['0 . . . 0 . . .', '0 . 0 . 0 . . .', '0 . . . 0 . . .', '0 . 0 . 0 . 0 .']
function beatPatterns(palette: Palette) {
  const acoustic = ['punk', 'rock', 'southern', 'blues'].includes(palette)
  const sparse = ['piano', 'folk', 'indie'].includes(palette)
  const shuffle = ['jazz', 'swing', 'blues', 'southern'].includes(palette)
  return { kick: acoustic ? rockPulse : sparse ? softPulse : shuffle ? jazzPulse : pulse,
    snare: palette === 'piano' || palette === 'folk' ? ['. . . . 0 . . .', '. . 0 . . . . .', '. . . . 0 . . .', '. . 0 . . . 0 .'] : backbeat,
    hat: shuffle ? shuffleHat : sparse ? gentleHat : hat,
  }
}

// Motifs are written at their sounding scale degree; the runtime shifts each section by its chord root.
function relativePatterns(config: HarmonicStageConfig, patterns: readonly string[]) {
  const degrees = HARMONY_PLANS[config.harmony].degrees
  return patterns.map((pattern, index) => pattern.replace(/-?\d+/g, token => String(Number(token) - degrees[index % degrees.length])))
}

/** Shared 16-slot arrangement; each city's bass, melody, reply and palette are authored separately. */
export function harmonicStageProfile(config: HarmonicStageConfig): StyleProfile {
  const sound = { ...PITCHED_SOURCES[config.palette], ...percussion(config.palette) }
  const beats = beatPatterns(config.palette)
  const jazzKit = ['jazz', 'swing', 'blues', 'soul'].includes(config.palette)
  const soft = ['piano', 'soul', 'folk', 'jazz', 'indie', 'swing'].includes(config.palette)
  const drive = soft ? .34 : .46
  return {
    name: config.name, bpm: config.bpm, root: config.root, scale: config.scale, harmony: config.harmony,
    swing: config.swing ?? (jazzKit ? .11 : 0), sections: config.sections ?? Array.from({ length: config.harmony === 'jazz-251' || config.harmony === 'pop-punk-154' || config.harmony === 'southern-rock-415' || config.harmony === 'blues-145' ? 3 : 4 }, () => 16),
    reference: config.reference, url: config.url,
    parts: [
      voice('bass', `Baixo ${config.tag}`, sound.bass, relativePatterns(config, config.bass), { bars: 2, gain: soft ? .22 : .29, lpf: 2300, arrangement: all }),
      rhythm(`Pulso ${config.tag}`, sound.kick, beats.kick, { gain: drive, arrangement: all }),
      voice('response', `Acordes ${config.tag}`, sound.rhythm, shortChords, { bars: 2, octave: 3, gain: soft ? .10 : .15, gate: .55, arrangement: { active: [true, true, false, true] } }),
      rhythm(`Caixa ${config.tag}`, sound.snare, beats.snare, { gain: soft ? .14 : .27, arrangement: all }),
      voice('harmony', `Base harmônica ${config.tag}`, sound.harmony, longTone, { bars: 2, octave: 3, gain: .09, attack: .12, release: .36, arrangement: all }),
      rhythm(`Tempo miúdo ${config.tag}`, sound.hat, beats.hat, { gain: soft ? .06 : .10, hpf: 4500, arrangement: all }),
      voice('melody', `Motivo ${config.tag}`, sound.lead, relativePatterns(config, config.lead), { bars: 2, octave: 4, gain: soft ? .13 : .18, gate: .68, arrangement: all, effects: { pan: -.18 } }),
      rhythm(`Contratempo ${config.tag}`, sound.accent, smallHits, { gain: .075, arrangement: chorus }),
      voice('response', `Resposta ${config.tag}`, sound.reply, relativePatterns(config, config.reply), { bars: 2, octave: 4, gain: .105, gate: .58, arrangement: chorus, effects: { pan: .24, delay: .08 } }),
      rhythm(`Virada ${config.tag}`, sound.fill, smallHits, { gain: .11, arrangement: chorus }),
      voice('harmony', `Camada ${config.tag}`, sound.secondary, shortChords, { bars: 2, octave: 4, gain: .075, attack: .018, release: .2, arrangement: { active: [false, true, true, true] } }),
      rhythm(`Acento ${config.tag}`, sound.accent, backbeat, { gain: .065, arrangement: chorus }),
      voice('texture', `Fundo ${config.tag}`, sound.texture, longTone, { bars: 4, octave: 4, gain: .038, attack: .55, release: .8, arrangement: bridge, effects: { reverb: .3 } }),
      rhythm(`Ar ${config.tag}`, sound.air, smallHits, { gain: .055, arrangement: chorus }),
      voice('melody', `Contralinha ${config.tag}`, sound.counter, counter, { bars: 2, octave: 5, gain: .065, arrangement: bridge, effects: { reverb: .2 } }),
      rhythm(`Fecho ${config.tag}`, world('crash', 0, false), ['. . . . . . . 0', '. . . . . . . 0', '. . . . . . . 0', '. . . . . . . 0'], { gain: .05, arrangement: bridge }),
    ],
  }
}
