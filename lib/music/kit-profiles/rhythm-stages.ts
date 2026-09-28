import { RHYTHM_STAGES, type RhythmStage } from '../../rhythm-stages'
import { beatsPerBar } from '../meter'
import { classical, drums, electro, jazz, keys, strings, world, rhythm, voice, type ProfileSource, type StyleProfile } from './types'

type Palette = { lead: ProfileSource; comp: ProfileSource; bass: ProfileSource; pad: ProfileSource; reply: ProfileSource; low: ProfileSource; back: ProfileSource; top: ProfileSource }
const acoustic: Palette = { lead: world('flute'), comp: strings('nylon'), bass: strings('bass-round'), pad: strings('violin'), reply: strings('steel'), low: world('timpani',0,false), back: drums('wood-rim'), top: drums('tambourine') }
const palettes = {
  samba: { ...acoustic, lead: strings('nylon'), back: world('conga',0,false) },
  choro: { ...acoustic, bass: strings('nylon') },
  frevo: { ...acoustic, lead: jazz('brass'), comp: jazz('brass'), reply: jazz('reed'), low: drums('rock-kick'), back: drums('rock-snare') },
  baiao: { ...acoustic, lead: keys('accordion'), comp: keys('accordion'), top: electro('hat') },
  caipira: { ...acoustic, lead: strings('steel'), reply: keys('accordion'), comp: strings('steel') },
  bossa: { ...acoustic, lead: world('flute'), pad: keys('rhodes'), back: drums('brush'), top: electro('shaker') },
  jazz: { ...acoustic, lead: jazz('reed'), comp: keys('grand'), pad: keys('rhodes'), reply: jazz('brass'), low: jazz('kick',0,false), back: drums('brush'), top: drums('ride') },
  rock: { ...acoustic, lead: strings('crunch-electric'), comp: strings('muted-electric'), bass: strings('bass-pick'), pad: keys('organ'), reply: keys('grand'), low: drums('rock-kick'), back: drums('rock-snare'), top: drums('ride') },
  soul: { ...acoustic, lead: jazz('brass'), comp: keys('grand'), pad: keys('organ'), reply: jazz('formant'), low: drums('rock-kick'), back: drums('rock-snare'), top: drums('ride') },
  reggae: { ...acoustic, lead: strings('muted-electric'), comp: strings('muted-electric'), pad: keys('organ'), reply: keys('clav'), low: drums('rock-kick'), back: drums('wood-rim'), top: electro('hat') },
  baroque: { ...acoustic, lead: classical('violin-sustain'), comp: classical('harpsichord'), bass: classical('cello-sustain'), pad: classical('viola-sustain'), reply: classical('alto-recorder-sustain'), low: classical('cello-pizzicato'), back: classical('violin-pizzicato'), top: classical('alto-recorder-staccato') },
  orchestra: { ...acoustic, lead: classical('violin-sustain',1), comp: classical('violin-pizzicato',2), bass: classical('cello-sustain',1), pad: classical('horn-sustain',1), reply: classical('flute-sustain',1), low: classical('timpani-low',0,false), back: classical('cello-spiccato',1), top: classical('violin-spiccato') },
  turkish: { ...acoustic, lead: strings('steel'), reply: jazz('reed'), back: world('conga',0,false) },
  greek: { ...acoustic, lead: strings('steel'), reply: strings('violin'), comp: strings('nylon') },
  chacarera: { ...acoustic, lead: strings('violin'), comp: strings('nylon'), back: drums('wood-rim') },
} satisfies Record<string, Palette>
interface Study {
  palette: keyof typeof palettes; leadName: string; melodies: [string,string,string,string]
  bass: string; low: string; back: string; top: string; comp: string
  harmony?: StyleProfile['harmony']; sectionBars?: [number,number,number,number]
}
/** Every cell is authored in the stage's own subdivision, not stretched 4/4. */
const studies: Record<string, Study> = {
  'rio-1930': { palette:'samba', leadName:'Cavaquinho sintético', melodies:['0 . 2 4 . 2 . 1','2 4 . 5 4 . 2 .','4 . . 2 . 1 0 .','2 1 0 . 4 2 1 0'], bass:'0 . . 4 0 . 4 .', low:'. . . . 0 . . .', back:'0 . . 0 . . 0 .', top:'0 0 0 0 0 0 0 0', comp:'. 0 . 0 . . 0 .', harmony:'jazz-251' },
  'rio-1910': { palette:'choro', leadName:'Flauta do choro', melodies:['0 1 2 4 3 2 1 0','2 3 4 6 5 4 2 1','4 6 7 . 6 5 4 2','3 2 1 0 -1 1 2 0'], bass:'0 . 4 . 6 5 4 2', low:'0 . . . 0 . . .', back:'. . 0 . . 0 . 0', top:'0 . 0 0 0 . 0 0', comp:'0 . . 0 . 0 . 0', harmony:'circle' },
  'recife-1935': { palette:'frevo', leadName:'Metais do frevo', melodies:['0 2 4 5 4 2 1 0','4 6 7 6 5 4 2 4','7 . 6 5 4 . 2 1','2 4 3 2 1 0 -1 0'], bass:'0 . 4 . 0 . 4 .', low:'0 . . . 0 . . .', back:'. 0 . 0 . 0 0 0', top:'0 . 0 . 0 . 0 .', comp:'. . 0 . . . 0 .', sectionBars:[4,4,4,6] },
  'recife-1950': { palette:'baiao', leadName:'Sanfona do baião', melodies:['0 . 2 4 . 4 2 .','4 . 5 6 . 5 4 2','2 . . 0 . 2 4 .','4 2 0 . 1 2 1 0'], bass:'0 . . 4 . . 0 .', low:'0 . . 0 . . 0 .', back:'. . 0 . . . 0 .', top:'0 0 0 0 0 0 0 0', comp:'. . 0 . . . 0 .', harmony:'cadence' },
  'piracicaba-1940': { palette:'caipira', leadName:'Viola sintética', melodies:['0 2 . 4 2 . 1 0','2 4 . 6 4 . 2 1','4 . 2 . 1 . 0 .','2 1 0 2 4 2 1 0'], bass:'0 . . . 4 . . .', low:'0 . . . 0 . . .', back:'. . 0 . . . 0 .', top:'. 0 . 0 . 0 0 .', comp:'0 . 0 . . 0 . 0', harmony:'circle' },
  'rio-1960': { palette:'bossa', leadName:'Flauta da varanda', melodies:['. 2 . 4 . 6 5 .','4 . 3 . 2 . 1 .','. . 4 6 . 5 . 4','2 . 1 0 . . 2 0'], bass:'0 . . . 4 . . .', low:'0 . . . 0 . . .', back:'0 . . 0 . . 0 .', top:'0 0 0 0 0 0 0 0', comp:'0 . . 0 . 0 . .', harmony:'jazz-251', sectionBars:[4,6,4,6] },
  'new-york-1962': { palette:'jazz', leadName:'Palheta em três', melodies:['0 . 2 4 . 3','2 4 . 6 5 .','4 . . 2 . 1','2 1 0 . -1 0'], bass:'0 . 2 . 4 .', low:'0 . . . . .', back:'. . 0 . 0 .', top:'0 . 0 0 0 .', comp:'. 0 . . 0 .', harmony:'jazz-3625' },
  'london-1977': { palette:'rock', leadName:'Guitarra do refrão', melodies:['0 . . 4 3 .','2 . 4 6 . 5','4 . . 2 . .','2 1 0 4 2 0'], bass:'0 . . 4 . .', low:'0 . . . . 0', back:'. . . 0 . .', top:'0 0 0 0 0 0', comp:'0 . . 0 . .', harmony:'pop-1564', sectionBars:[4,8,4,8] },
  'memphis-1967': { palette:'soul', leadName:'Metais da resposta soul', melodies:['0 . . . 2 . 4 . . 3 . .','2 . . 4 . . 6 . . 5 4 .','4 . . . . . 2 . . 1 . .','2 . 1 0 . . 4 . 2 1 . 0'], bass:'0 . . 2 . . 4 . . 2 . .', low:'0 . . . . . 0 . . . . .', back:'. . . 0 . . . . . 0 . .', top:'0 . 0 0 . 0 0 . 0 0 . 0', comp:'0 2 4 0 2 4 0 2 4 0 2 4', harmony:'doo-wop-1645' },
  'kingston-1973': { palette:'reggae', leadName:'Guitarra de contratempo', melodies:['. 0 . 2 . 4 . 2','. 2 . 4 . 6 . 4','. . . 4 . 2 . 0','. 2 . 1 . 0 . 0'], bass:'0 . . 4 . 2 0 .', low:'. . . . 0 . . .', back:'. . . . 0 . . .', top:'0 0 0 0 0 0 0 0', comp:'. 0 . 0 . 0 . 0', harmony:'descent' },
  'leipzig-1723': { palette:'baroque', leadName:'Violino pastoral', melodies:['0 2 4 2 3 5 4 2 1','2 4 6 4 5 7 6 4 2','4 3 2 1 2 3 2 1 0','2 1 0 -1 0 2 1 -1 0'], bass:'0 . . 4 . . 0 . .', low:'0 . . . . . . . .', back:'. . . 0 . . 0 . .', top:'0 . . . . . . . .', comp:'0 2 4 0 2 4 0 2 4', harmony:'circle' },
  'vienna-1825': { palette:'orchestra', leadName:'Cordas alla breve', melodies:['0 1 2 3 4 2 1 0','4 5 6 7 6 4 2 1','2 . 4 . 6 5 4 2','4 3 2 1 0 2 -1 0'], bass:'0 . . . 4 . . .', low:'0 . . . 0 . . .', back:'. . . . 0 . . .', top:'0 . . . . . . .', comp:'0 . 2 . 4 . 2 .', harmony:'cadence' },
  'oakland-1959': { palette:'jazz', leadName:'Palheta em cinco', melodies:['0 . 2 3 . 4 . 2 . 1','2 . 4 6 . 5 4 . 2 .','4 . . 2 . 1 . . 0 .','2 1 . 0 . 4 3 2 1 0'], bass:'0 . 4 . 2 . 0 . 4 .', low:'0 . . . . . 0 . . .', back:'. . 0 . . . . . 0 .', top:'0 . 0 0 0 . 0 . 0 0', comp:'0 . . 0 . . 0 . 0 .', harmony:'jazz-251' },
  'canterbury-1972': { palette:'rock', leadName:'Órgão em nove', melodies:['0 2 4 6 4 2 1 3 2','2 4 5 7 5 4 3 2 1','4 . 2 1 . 0 2 . 4','4 3 2 1 0 2 4 1 0'], bass:'0 . 4 0 . 2 4 . 2', low:'0 . . 0 . . 0 . .', back:'. . . 0 . . . . 0', top:'0 0 0 0 0 0 0 0 0', comp:'0 . 2 4 . 2 0 . 4', harmony:'rock-6415' },
  'cambridge-1973': { palette:'rock', leadName:'Guitarra em sete', melodies:['0 . 2 . 4 3 2 . 1 . 0 2 1 .','2 . 4 . 6 5 4 . 3 . 2 4 2 .','4 . . . 2 . . . 0 . 1 2 4 .','4 3 2 1 0 . 2 . 4 2 1 0 -1 0'], bass:'0 . 0 4 2 . 0 . 4 . 2 1 0 .', low:'0 . . . 0 . . . 0 . . . 0 .', back:'. . 0 . . . 0 . . . 0 . . 0', top:'0 . 0 . 0 . 0 . 0 . 0 . 0 .', comp:'. . 0 . . . 0 . . . 0 . 0 .', harmony:'descent' },
  'istanbul-1970': { palette:'turkish', leadName:'Cordas de dança em cinco', melodies:['0 1 3 2 1','2 4 3 5 4','4 . 2 1 0','2 1 0 -1 0'], bass:'0 . . 4 .', low:'0 . . 0 .', back:'. . 0 . 0', top:'0 0 0 0 0', comp:'0 . . 0 .', harmony:'descent', sectionBars:[4,6,4,8] },
  'kalamata-1930': { palette:'greek', leadName:'Cordas de roda em sete', melodies:['0 1 2 4 3 2 1','2 3 4 6 5 4 2','4 . 2 1 . 0 1','2 1 0 2 1 -1 0'], bass:'0 . . 4 . 2 .', low:'0 . . 0 . 0 .', back:'. . 0 . 0 . 0', top:'0 0 0 0 0 0 0', comp:'0 . . 0 . 0 .', harmony:'cadence' },
  'santiago-del-estero-1960': { palette:'chacarera', leadName:'Violino da chacarera', melodies:['0 2 4 3 2 1','2 4 6 5 4 2','4 . 2 1 . 0','2 1 0 2 -1 0'], bass:'0 . . 4 . .', low:'0 . 0 . 0 .', back:'. 0 . 0 . 0', top:'0 . . 0 . .', comp:'0 . 0 . 0 .', harmony:'descent' },
}
const all = { active: [true,true,true,true] }
const answer = { active: [false,true,false,true] }
const lift = { active: [false,false,true,true] }
const repeat = (pattern: string) => [pattern,pattern,pattern,pattern]
const chordHits = (pattern: string) => pattern.split(' ').map(cell => cell === '.' ? '.' : '0,2,4').join(' ')
const rotate = (pattern: string, amount: number) => {
  const cells = pattern.split(' ')
  const offset = amount % cells.length
  return [...cells.slice(offset), ...cells.slice(0, offset)].join(' ')
}
const sparse = (pattern: string) => {
  let attack = 0
  return pattern.split(' ').map(cell => cell === '.' ? cell : attack++ % 2 ? '.' : cell).join(' ')
}

function profileFor(stage: RhythmStage): StyleProfile {
  const study = studies[stage.id]
  const sound = palettes[study.palette]
  const n = study.melodies[0].split(' ').length
  const held = ['0',...Array(n-1).fill('.')].join(' ')
  const ending = [...Array(n-2).fill('.'),'0','0'].join(' ')
  const comp = ['soul','baroque','orchestra'].includes(study.palette) || stage.id === 'canterbury-1972' ? study.comp : chordHits(study.comp)
  const lead = study.melodies
  const reply = lead.map(pattern => pattern.split(' ').map((cell,index) => index < Math.floor(n/2) ? '.' : cell).join(' '))
  const baroque = study.palette === 'baroque'
  const orchestra = study.palette === 'orchestra'
  const classicalKit = baroque || orchestra
  const compSections = classicalKit ? [comp, rotate(comp, 2), sparse(rotate(comp, 1)), rotate(comp, 1)] : [comp, comp, sparse(comp), comp]
  const bassSections = classicalKit ? [study.bass, rotate(study.bass, 2), sparse(rotate(study.bass, 1)), rotate(study.bass, 3)] : [study.bass, study.bass, sparse(study.bass), study.bass]
  const backSections = classicalKit ? [study.back, rotate(study.back, 1), sparse(study.back), rotate(study.back, 3)] : repeat(study.back)
  const topSections = classicalKit ? [study.top, rotate(study.top, 2), sparse(study.top), rotate(study.top, 1)] : [study.top, study.top, sparse(study.top), study.top]
  const baroqueCoda = classical('harpsichord', 1)
  const orchestraCoda = classical('violin-pizzicato', 1)
  return {
    name: `${stage.name} · ${stage.genre}`, meter: stage.meter, bpm: stage.bpm, root: stage.root, scale: stage.scale,
    harmony: study.harmony ?? 'cadence', swing: 0,
    sections: (study.sectionBars ?? [4,4,2,4]).map(bars => bars * beatsPerBar(stage.meter)),
    reference: classicalKit
      ? `Estudo original de ${stage.genre}; ${stage.year} é ambientação. Timbres preparados de gravações CC0 da VCSL e VSCO 2 CE.`
      : `Estudo original de ${stage.genre}; ${stage.year} é ambientação. Timbres sintéticos locais, sem transcrição de gravações.`,
    url: 'https://viva.pressbooks.pub/openmusictheory/part/rhythm-and-meter/',
    parts: [
      voice('melody', study.leadName, stage.id === 'canterbury-1972' ? keys('organ') : sound.lead, lead, {
        bars: 1, gain: classicalKit ? .115 : .15, octave: 4, arrangement: all, gate: .8,
        lpf: baroque ? 8200 : orchestra ? 7600 : 7000, hpf: classicalKit ? 180 : 100,
        effects: classicalKit ? { pan: -.08, reverb: .16 } : undefined,
      }),
      rhythm('Fundação grave', sound.low, classicalKit ? [study.low, rotate(study.low, 1), sparse(study.low), rotate(study.low, 2)] : repeat(study.low), {
        gain: baroque ? .035 : orchestra ? .055 : .20, arrangement: all,
        lpf: baroque ? 9000 : orchestra ? 1500 : 12000,
      }),
      voice('bass', 'Baixo principal', sound.bass, bassSections, {
        bars: 1, gain: classicalKit ? .15 : .22, octave: 2, arrangement: all, gate: .8,
        lpf: classicalKit ? 1900 : 2400, hpf: classicalKit ? 40 : 25,
        effects: classicalKit ? { pan: -.16, reverb: .1 } : undefined,
      }),
      rhythm('Resposta da percussão', sound.back, backSections, {
        gain: baroque ? .04 : orchestra ? .045 : .11, arrangement: all,
        lpf: baroque ? 6200 : orchestra ? 5000 : 12000,
      }),
      voice('response', 'Acordes rítmicos', sound.comp, compSections, {
        bars: 1, gain: classicalKit ? .075 : .10, octave: 3, gate: .42, arrangement: all,
        lpf: baroque ? 5800 : orchestra ? 7000 : 7000, hpf: classicalKit ? 180 : 100,
        effects: classicalKit ? { pan: -.22, reverb: .12 } : { pan: -.18 },
      }),
      rhythm('Subdivisão leve', sound.top, topSections, {
        gain: baroque ? .018 : orchestra ? .025 : .04, arrangement: all,
        hpf: classicalKit ? 500 : 3200, lpf: classicalKit ? 7800 : 12000,
      }),
      voice('response', 'Contracanto', sound.reply, reply, {
        bars: 1, gain: classicalKit ? .06 : .075, octave: 4, arrangement: answer,
        effects: { pan: classicalKit ? .22 : .2, ...(classicalKit ? { reverb: .18 } : {}) },
        lpf: baroque ? 7800 : orchestra ? 8500 : 7000, hpf: classicalKit ? 280 : 100,
      }),
      rhythm('Fecho da frase', classicalKit ? classical('timpani-high', 1, false) : drums('wood-rim'), repeat(ending), {
        gain: baroque ? .018 : orchestra ? .03 : .045, arrangement: answer, lpf: classicalKit ? 1800 : 12000,
      }),
      voice('harmony', 'Sustentação harmônica', sound.pad, repeat(held), {
        bars: 2, gain: classicalKit ? .032 : .055, octave: 3, arrangement: lift,
        attack: classicalKit ? .22 : .18, release: classicalKit ? .48 : .35,
        lpf: baroque ? 5200 : orchestra ? 3600 : 4200, hpf: classicalKit ? 180 : 100,
        effects: classicalKit ? { pan: .12, reverb: .2 } : undefined,
      }),
      rhythm('Acento seco', classicalKit ? classical('violin-pizzicato', 3) : electro('shaker'), repeat(study.back), {
        gain: classicalKit ? .022 : .025, arrangement: answer, hpf: classicalKit ? 250 : 20, lpf: classicalKit ? 7800 : 12000,
      }),
      voice('melody', 'Variação do motivo', sound.reply, [lead[2], lead[3], lead[0], lead[1]], {
        bars: 2, gain: classicalKit ? .045 : .06, octave: 4, arrangement: lift,
        lpf: classicalKit ? 7800 : 7000, effects: classicalKit ? { pan: .16, reverb: .17 } : undefined,
      }),
      rhythm('Virada discreta', baroque ? sound.low : orchestra ? classical('timpani-low', 1, false) : drums('brush'),
        classicalKit ? [ending, rotate(ending, 1), sparse(ending), rotate(ending, 2)] : repeat(ending), {
          gain: baroque ? .025 : orchestra ? .035 : .04, arrangement: lift, lpf: classicalKit ? 1700 : 12000,
        }),
      voice('harmony', 'Acordes abertos', sound.pad, repeat(comp), {
        bars: 2, gain: classicalKit ? .028 : .045, octave: 4, arrangement: answer,
        attack: classicalKit ? .16 : .12, release: classicalKit ? .3 : .35,
        effects: { reverb: classicalKit ? .2 : .16 },
        lpf: baroque ? 6200 : orchestra ? 4000 : 4200, hpf: classicalKit ? 220 : 100,
      }),
      voice('response', 'Bordão de resposta', sound.bass, repeat(sparse(study.bass)), {
        bars: 2, gain: classicalKit ? .045 : .06, octave: 3, arrangement: lift, lpf: classicalKit ? 2800 : 7000,
      }),
      voice('texture', 'Pedal de fecho', baroque ? classical('cello-sustain', 1) : orchestra ? sound.pad : strings('cello'), repeat(held), {
        bars: 4, gain: classicalKit ? .022 : .03, octave: 3, arrangement: lift,
        attack: classicalKit ? .42 : .35, release: classicalKit ? .65 : .5,
        lpf: baroque ? 1900 : orchestra ? 3400 : 4200, hpf: classicalKit ? 45 : 100,
        effects: classicalKit ? { pan: .18, reverb: .22 } : undefined,
      }),
      voice('response', 'Coda dedilhada', baroque ? baroqueCoda : orchestra ? orchestraCoda : sound.comp,
        [reply[3], rotate(reply[2], 1), reply[1], rotate(reply[0], 2)], {
          bars: 1, gain: classicalKit ? .035 : .045, octave: 4, arrangement: answer,
          lpf: classicalKit ? 6900 : 7000, hpf: classicalKit ? 200 : 100,
          effects: classicalKit ? { pan: .12, reverb: .14 } : undefined,
        }),
    ],
  }
}
export const RHYTHM_STAGE_PROFILES: Record<string, StyleProfile> = Object.fromEntries(RHYTHM_STAGES.filter(stage => stage.id in studies).map(stage => [stage.id,profileFor(stage)]))
