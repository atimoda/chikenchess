import { RHYTHM_STAGES, type RhythmStage } from '../../rhythm-stages'
import { beatsPerBar } from '../meter'
import { drums, electro, jazz, keys, strings, world, rhythm, voice, type ProfileSource, type StyleProfile } from './types'

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
  baroque: { ...acoustic, lead: strings('violin'), comp: strings('pizzicato'), bass: strings('cello'), pad: strings('violin'), reply: world('flute'), back: strings('pizzicato'), top: keys('celesta') },
  orchestra: { ...acoustic, lead: strings('violin'), comp: strings('pizzicato'), bass: strings('cello'), pad: jazz('brass'), reply: world('flute'), back: world('timpani',0,false), top: world('crash',0,false) },
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
  const baroque = study.palette === 'baroque' || study.palette === 'orchestra'
  return {
    name: `${stage.name} · ${stage.genre}`, meter: stage.meter, bpm: stage.bpm, root: stage.root, scale: stage.scale,
    harmony: study.harmony ?? 'cadence', swing: 0,
    sections: (study.sectionBars ?? [4,4,2,4]).map(bars => bars * beatsPerBar(stage.meter)),
    reference: `Estudo original de ${stage.genre}; ${stage.year} é ambientação. Timbres sintéticos locais, sem transcrição de gravações.`,
    url: 'https://viva.pressbooks.pub/openmusictheory/part/rhythm-and-meter/',
    parts: [
      voice('melody',study.leadName,stage.id==='canterbury-1972'?keys('organ'):sound.lead,lead,{bars:1,gain:.15,octave:4,arrangement:all,gate:.8}),
      rhythm('Fundação grave',sound.low,repeat(study.low),{gain:baroque ? .05 : .20,arrangement:all}),
      voice('bass','Baixo principal',sound.bass,[study.bass,study.bass,sparse(study.bass),study.bass],{bars:1,gain:.22,octave:2,arrangement:all,gate:.8,lpf:2400}),
      rhythm('Resposta da percussão',sound.back,repeat(study.back),{gain:baroque ? .035 : .11,arrangement:all}),
      voice('response','Acordes rítmicos',sound.comp,[comp,comp,sparse(comp),comp],{bars:1,gain:.10,octave:3,gate:.42,arrangement:all,effects:{pan:-.18}}),
      rhythm('Subdivisão leve',sound.top,[study.top,study.top,sparse(study.top),study.top],{gain:baroque ? .02 : .04,arrangement:all,hpf:3200}),
      voice('response','Contracanto',sound.reply,reply,{bars:1,gain:.075,octave:4,arrangement:answer,effects:{pan:.2}}),
      rhythm('Fecho da frase',drums('wood-rim'),repeat(ending),{gain:.045,arrangement:answer}),
      voice('harmony','Sustentação harmônica',sound.pad,repeat(held),{bars:2,gain:.055,octave:3,arrangement:lift,attack:.18,release:.35}),
      rhythm('Acento seco',electro('shaker'),repeat(study.back),{gain:.025,arrangement:answer}),
      voice('melody','Variação do motivo',sound.reply,[lead[2],lead[3],lead[0],lead[1]],{bars:2,gain:.06,octave:4,arrangement:lift}),
      rhythm('Virada discreta',baroque?sound.low:drums('brush'),repeat(ending),{gain:.04,arrangement:lift}),
      voice('harmony','Acordes abertos',sound.pad,repeat(comp),{bars:2,gain:.045,octave:4,arrangement:answer,attack:.12,effects:{reverb:.16}}),
      voice('response','Bordão de resposta',sound.bass,repeat(sparse(study.bass)),{bars:2,gain:.06,octave:3,arrangement:lift}),
      voice('texture','Pedal de fecho',baroque?strings('cello'):keys('organ'),repeat(held),{bars:4,gain:.03,octave:3,arrangement:lift,attack:.35,release:.5}),
      voice('response','Coda dedilhada',sound.comp,[reply[3],reply[2],reply[1],reply[0]],{bars:1,gain:.045,octave:4,arrangement:answer}),
    ],
  }
}
export const RHYTHM_STAGE_PROFILES: Record<string, StyleProfile> = Object.fromEntries(RHYTHM_STAGES.filter(stage => stage.id in studies).map(stage => [stage.id,profileFor(stage)]))
