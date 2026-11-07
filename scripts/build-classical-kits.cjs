// Compose the three Classical campaigns from original 16-bar melodic periods.
// Run: node scripts/build-classical-kits.cjs. Acoustic sources are prepared with
// scripts/prepare-orchestra-recordings.py. Profiles are the plain MIDI baseline;
// the official kits add phrasing, dynamics and small deterministic timing offsets.
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('../tests/helpers/music.cjs')
const scores = require('./classical/scores.cjs')
const { TRIGGERS } = loadTs('lib/music/reactions.ts')
const { cities } = loadTs('lib/cities-data.ts')
const { createStyledCityKit, CITY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
const { validateOfficialKit, styleProfileSchema } = loadTs('lib/admin/validation.ts')
const root = path.resolve(__dirname, '..')
const slots = ['a1','a2','b1','b2','c1','c2','d1','d2','e1','e2','f1','f2','g1','g2','h1','h2']
const sectionBanks = [0,1,6,2,3,4,2,5,6,7]
const sectionBars = [8,16,16,8,16,8,16,8,16,8]
const labels = ['Intro','Verse','Solo','Interlude','Chorus','Bridge','Interlude','Chorus','Solo','Outro']
// One root per local bar, repeated for the second half of the long period.
const roots = [
  [0,0,3,3,1,4,4,0], [0,0,4,4,5,1,4,0],
  [0,0,3,1,4,4,4,0], [0,3,0,4,5,1,4,0],
  [5,5,1,1,3,0,4,4], [0,3,0,4,5,1,4,0],
  [0,0,4,4,5,1,4,0], [0,3,1,4,0,4,0,0],
]

function parseMelody(rows, ticks) {
  return rows.map(row => {
    const events = row.split(' ').map(cell => {
      const [degree, length] = cell.split(':')
      return { degree: degree === '.' ? null : Number(degree), length: Number(length) }
    })
    if (events.reduce((sum, event) => sum + event.length, 0) !== ticks) throw Error(`Invalid bar: ${row}`)
    return events
  })
}

function chordTone(chordRoot, target) {
  const tones = [0,2,4].flatMap(interval => [-7,0,7].map(octave => chordRoot + interval + octave))
  return tones.reduce((best, degree) => Math.abs(degree-target) < Math.abs(best-target) ? degree : best)
}

function barEvents(events, bar, ticks, chordRoot) {
  let position = 0
  return events.flatMap(event => {
    const start = bar + position / ticks
    position += event.length
    if (event.degree === null) return []
    return [{ start, duration: event.length / ticks, degree: event.degree - chordRoot, velocity: .7 }]
  })
}

function cadence(bar, ticks) {
  return bar % 8 === 7 ? [{degree:0,length:ticks-2},{degree:null,length:2}] : null
}

// Each string desk owns a line, register and articulation. Eight pawn voices
// form one section with divided inner lines, rather than eight unison copies.
function composeRoll(score, role, bank) {
  const ticks = score.meter === '9/8' ? 9 : 8
  const theme = parseMelody(score.theme, ticks)
  const song = parseMelody(score.song, ticks)
  const notes = []
  for (let bar = 0; bar < 16; bar++) {
    const chordRoot = roots[bank][bar % 8]
    const lowRoot = chordRoot >= 4 ? chordRoot - 7 : chordRoot
    const lyrical = [0,2,6].includes(bank)
    let events
    if (role === 'violin1' || role === 'flute' || role === 'soloOboe' || role === 'clarinet') {
      events = (lyrical ? song : theme)[bar]
      if (bank === 0 && bar % 4 > 1) events = [{degree:null,length:ticks}]
      if (bank === 4) events = theme[(bar+4)%16].map(event => ({...event,degree:event.degree === null ? null : 7-event.degree}))
      if (bank === 7 && bar >= 4) events = [{degree:chordTone(chordRoot,bar % 2 ? 0 : 4),length:ticks-1},{degree:null,length:1}]
      if (bank === 7 && bar >= 12) events = [{degree:null,length:ticks}]
    } else if (role === 'violin2') {
      events = (lyrical ? song : theme)[bar].map(event => ({...event, degree:event.degree === null ? null : event.degree-2}))
      if (score.meter === '9/8' && !lyrical) {
        // Short imitative entries followed by a chordal resolution.
        events = [{degree:null,length:3},{degree:chordTone(chordRoot,4),length:2},{degree:chordTone(chordRoot,2),length:1},{degree:chordTone(chordRoot,0),length:3}]
      }
    } else if (role === 'violinShort') {
      const shape = score.meter === '9/8' ? [0,2,4,2,0,2,4,2,4] : [0,4,2,4,0,4,2,4]
      events = shape.map((offset,index) => ({degree:chordRoot+offset,length:1}))
      if (lyrical) events = [{degree:chordTone(chordRoot,4),length:ticks/2},{degree:null,length:ticks/2}]
    } else if (role === 'viola1' || role === 'viola2') {
      const target = role === 'viola1' ? 4 : 0
      const degree = chordTone(chordRoot,target)
      events = lyrical ? [{degree,length:ticks-1},{degree:null,length:1}] : [
        {degree,length:ticks/2},{degree:chordTone(chordRoot,target+2),length:ticks/2},
      ]
    } else if (role === 'cello' || role === 'bass' || role === 'bassoon') {
      events = [{degree:lowRoot,length:lyrical ? ticks-1 : ticks/2}]
      events.push(lyrical ? {degree:null,length:1} : {degree:chordTone(chordRoot,lowRoot+4),length:ticks/2})
      if (role === 'cello' && bank === 4) events = [lowRoot,lowRoot+2,lowRoot+4,lowRoot+2].map(degree=>({degree,length:ticks/4}))
    } else if (role === 'celloPizz') {
      events = [{degree:lowRoot,length:1},{degree:null,length:ticks/2-1},{degree:chordTone(chordRoot,lowRoot+4),length:1},{degree:null,length:ticks/2-1}]
    } else if (role === 'continuo') {
      events = [0,2,4].map(offset=>({degree:chordRoot+offset,length:ticks/3}))
    } else if (role === 'horn' || role === 'trumpet') {
      const degree = chordTone(chordRoot,role === 'horn' ? 0 : 7)
      events = [{degree,length:ticks/2},{degree:null,length:ticks/2}]
      if (bar % 4 !== 0 && bar % 8 !== 6) events = [{degree:null,length:ticks}]
    } else if (role === 'timpani') {
      events = [{degree:0,length:1},{degree:null,length:ticks-1}]
      if (![0,6,7,14,15].includes(bar)) events = [{degree:null,length:ticks}]
    } else {
      // Wind choir answers in the holes of the main eight-bar sentence.
      events = bar % 4 < 2 ? [{degree:null,length:ticks}] : [
        {degree:chordTone(chordRoot,4),length:ticks/2},{degree:chordTone(chordRoot,2),length:ticks/2},
      ]
    }
    if (bank === 7 && bar >= 6 && bar < 8 && role !== 'timpani') events = cadence(bar,ticks) || events
    notes.push(...barEvents(events,bar,ticks,role === 'timpani' ? 0 : chordRoot))
  }
  return { bars:16,notes }
}

function profilePattern(roll, ticks) {
  const resolution = ticks * 4
  const tokens = Array(16*resolution).fill('.')
  for (const note of roll.notes) {
    const start = Math.round(note.start*resolution)
    const end = Math.round((note.start+note.duration)*resolution)
    tokens[start] = `${note.degree}_`
    if (end < tokens.length && tokens[end] === '.') tokens[end] = '0?0'
  }
  return tokens.join(' ')
}

const stringParts = [
  ['a2','Primeiros violinos','violin1','orchestra-violin',4,.17,-.42],
  ['b2','Segundos violinos','violin2','orchestra-violin',4,.12,-.24],
  ['c2','Violinos em détaché','violinShort','violin-spiccato',4,.085,-.32],
  ['d2','Violas cantabile','viola1','orchestra-viola',3,.14,.02],
  ['e2','Violas de resposta','viola2','orchestra-viola',3,.1,.12],
  ['f2','Violoncelos cantabile','cello','orchestra-cello',3,.19,.25],
  ['g2','Violoncelos pizzicato','celloPizz','orchestra-cello-pizz',3,.105,.32],
  ['h2','Contrabaixos','bass','orchestra-bass',2,.24,.4],
]
function backParts(city) {
  if (city === 'leipzig-1723') return [
    ['a1','Flauta doce I','wind','alto-recorder-sustain',4,.115,-.12],
    ['b1','Oboé I','soloOboe','orchestra-oboe',4,.14,-.05],
    ['c1','Fagote do contínuo','bassoon','orchestra-bassoon',3,.14,.08],
    ['d1','Flauta concertante','flute','orchestra-flute',4,.19,-.05],
    ['e1','Cravo do contínuo','continuo','harpsichord',3,.1,0],
    ['f1','Oboé II','wind','orchestra-oboe',4,.105,.12],
    ['g1','Flauta doce II','wind','alto-recorder-staccato',4,.075,.15],
    ['h1','Trompa pastoral','horn','orchestra-horn',3,.07,.2],
  ]
  return [
    ['a1','Flauta concertante','flute','orchestra-flute',4,.15,-.12],
    ['b1',city === 'vienna' ? 'Oboé I' : 'Clarinete cantabile',city === 'vienna' ? 'wind' : 'clarinet',city === 'vienna' ? 'orchestra-oboe' : 'orchestra-clarinet',4,.14,0],
    ['c1',city === 'vienna' ? 'Fagote I' : 'Oboé de resposta',city === 'vienna' ? 'bassoon' : 'wind',city === 'vienna' ? 'orchestra-bassoon' : 'orchestra-oboe',3,.13,.1],
    ['d1',city === 'vienna' ? 'Oboé concertante' : 'Trompa concertante',city === 'vienna' ? 'soloOboe' : 'horn',city === 'vienna' ? 'orchestra-oboe' : 'orchestra-horn',4,.18,0],
    ['e1',city === 'vienna' ? 'Trompas em diálogo' : 'Fagote cantabile',city === 'vienna' ? 'horn' : 'bassoon',city === 'vienna' ? 'orchestra-horn' : 'orchestra-bassoon',3,.14,-.15],
    ['f1','Trompete de concerto','trumpet','orchestra-trumpet',4,.085,.2],
    ['g1',city === 'vienna' ? 'Fagote II' : 'Clarinete de resposta','wind',city === 'vienna' ? 'orchestra-bassoon' : 'orchestra-clarinet',3,.11,.16],
    ['h1','Tímpanos de cadência','timpani','timpani-low',2,.23,.25],
  ]
}

function presence(role, bank) {
  if (role === 'bass') return true
  if (role === 'continuo') return bank !== 6
  if (role === 'timpani' || role === 'trumpet') return [3,5,7].includes(bank)
  if (role === 'horn') return [0,3,4,5,7].includes(bank)
  if (role === 'violinShort') return [1,3,4,5,7].includes(bank)
  if (role === 'viola2' || role === 'celloPizz') return [1,2,3,5,7].includes(bank)
  if (role === 'violin1') return [0,1,3,4,5,7].includes(bank)
  if (role === 'violin2') return bank !== 6
  if (role === 'flute') return [2,6,7].includes(bank)
  if (role === 'soloOboe' || role === 'clarinet') return [1,2,4,5,6].includes(bank)
  if (role === 'wind') return [0,2,3,5,6].includes(bank)
  return true
}

function reactions(city) {
  const action = (type,value) => ({type,value,scale:'Maior',harmony:'static'})
  const rule = (trigger,actions,duration=2) => ({id:`${city}-${trigger}`,trigger,enabled:true,quantize:true,target:'both',duration,actions})
  const rules = [rule('opening',[action('gain',-3)],1),rule('firstCastle',[action('variation',3)],4),
    rule('check',[action('gain',1)],1),rule('queenCapture',[action('variation',2)],2),
    rule('quiet',[action('variation',6)],2),rule('endgame',[action('variation',5)],1)]
  return { overrides: Object.keys(TRIGGERS), rules }
}

async function main() {
  const { saveOfficialKit } = await import(path.join(root,'scripts/admin/official-kits.mjs'))
  for (const [cityId, score] of Object.entries(scores)) {
    const parts = [...stringParts,...backParts(cityId)].sort((a,b)=>slots.indexOf(a[0])-slots.indexOf(b[0]))
    const rolls = parts.map(([, ,role])=>Array.from({length:8},(_,bank)=>composeRoll(score,role,bank)))
    const ticks = score.meter === '9/8' ? 9 : 8
    const pulses = score.meter === '9/8' ? 3 : score.meter === '2/2' ? 2 : 4
    const profile = {
      name:score.name,bpm:score.bpm,meter:score.meter,root:score.root,scale:'Maior',harmony:'kit',swing:0,
      sections:sectionBars.map(bars=>bars*pulses),sectionLabels:labels,
      harmonicSequences:sectionBanks.map(bank=>roots[bank]),reactions:reactions(cityId),
      parts:parts.map(([slot,name,role,asset,octave,gain,pan],index)=>({
        name,role:role === 'bass' || role === 'cello' ? 'bass' : role === 'violin1' || role === 'flute' || role === 'soloOboe' || role === 'clarinet' ? 'melody' : role === 'timpani' ? 'rhythm' : 'harmony',
        behavior:'phrase',source:{kind:'sample',bank:'classical',asset,variant:0,pitched:role !== 'timpani'},
        patterns:rolls[index].map(roll=>profilePattern(roll,ticks)),bars:Array(8).fill(16),
        octave,gain: gain * 4,attack:slot[1] === '2' && !['violinShort','celloPizz'].includes(role) ? .045 : .012,
        decay:.4,sustain:.85,release:role === 'timpani' ? .3 : .13,clip:1,gate:.9,lpf:role === 'trumpet' ? 6500 : 12000,hpf:role === 'bass' ? 30 : 55,
        mapping:{fileDegrees:0,rankDegrees:0,panWidth:0,previewFilter:false},effects:{pan,reverb:role === 'bass' ? .12 : .22,delay:0},
        arrangement:{active:sectionBanks.map(bank=>presence(role,bank)),variations:sectionBanks,
          transpose:sectionBanks.map((bank,index)=>index === 3 || index === 6 ? score.secondaryTranspose : 0),restart:true},
      })),
      reference:'Estudo orquestral original para '+cityId+'; frases próprias, referência de linguagem e instrumentação histórica',
      url:cityId === 'leipzig-1723' ? 'https://www.bach-digital.de/' : cityId === 'vienna' ? 'https://kv.mozarteum.at/en/work/symphony-in-c-4426' : 'https://www.beethoven.de/en/work/view/5556714292117504/',
    }
    styleProfileSchema.parse(profile)
    fs.writeFileSync(path.join(root,'data/music/profiles',`${cityId}.json`),JSON.stringify(profile,null,2)+'\n')
    const kit = createStyledCityKit(cities.find(city=>city.id===cityId),profile)
    for (const piece of kit.pieces) {
      const slot = piece.color === 'w' ? piece.origin : `${piece.origin[0]}${9-Number(piece.origin[1])}`
      const index = parts.findIndex(part=>part[0]===slot)
      const role = parts[index][2]
      kit.instruments[piece.id].pianoRolls = rolls[index].map((roll,bank)=>({bars:16,notes:roll.notes.map((note,i)=>{
        const bar = Math.floor(note.start)
        const swell = [0,.025,.055,.08,.06,.035,.015,-.06][bar%8]
        const dynamic = [ .48,.64,.5,.78,.62,.75,.5,.65 ][bank]
        const velocity = Math.max(.24,Math.min(.95,dynamic+swell+(i%3-1)*.018))
        const short = ['violinShort','celloPizz','continuo','timpani'].includes(role)
        const offset = note.start === Math.floor(note.start) ? 0 : ((index%3)-1)*.0012
        const start = Number((note.start + offset).toFixed(6))
        const duration = Math.min(16 - start, Number(Math.max(1/64, note.duration * (short ? .48 : .94)).toFixed(6)))
        return {...note, start, duration, velocity: Number(velocity.toFixed(4))}

      })}))
    }
    await saveOfficialKit(root,cityId,validateOfficialKit(cityId,kit,CITY_STYLE_REVISIONS[cityId]))
    console.log(`${cityId}: ${kit.arrangement.sections.length} sections, ${sectionBars.reduce((a,b)=>a+b)} bars, 8 MIDI banks / voice`)
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})
