import { harmonicStageProfile, type HarmonicStageConfig } from './harmonic-stage-factory'

// Original motifs and arrangements inspired by each scene; no song melody is transcribed.
const stages: Record<string, HarmonicStageConfig> = {
  'san-diego-1999': {
    name: 'San Diego · skate radio', bpm: 148, root: 'C', scale: 'Maior', harmony: 'pop-punk-154', palette: 'punk', tag: 'Skate',
    bass: ['0 . 0 . 4 . 4 .', '4 . 4 . 0 . 4 .', '3 . 3 . 4 . 0 .', '0 0 . 0 4 . 3 .'],
    lead: ['0 . 2 4 . 2 0 .', '4 . 5 4 2 . 0 .', '3 . 4 5 . 4 2 .', '7 . 5 4 2 . 0 .'],
    reply: ['. . 4 . 2 . . .', '. . 7 . 5 . . .', '. . 5 . 3 . . .', '. 7 . 5 4 . . .'],
    reference: 'Blink-182, All the Small Things (1999), para energia pop punk; frases originais sobre I–V–IV.',
    url: 'https://www.blink182.com/',
  },
  'london-1970': {
    name: 'London · piano de coro', bpm: 72, root: 'C', scale: 'Maior', harmony: 'pop-1564', palette: 'piano', tag: 'Coro',
    bass: ['0 . . 4 . 0 . .', '4 . . 1 . 4 . .', '5 . . 2 . 5 . .', '3 . . 0 . 3 . .'],
    lead: ['4 . 5 . 4 2 . .', '2 . 4 . 5 . 4 .', '5 . 7 . 5 4 . .', '3 . 4 2 . 0 . .'],
    reply: ['. . 7 . 5 . . .', '. . 5 . 4 . . .', '. . 9 . 7 . . .', '. . 5 . 3 . . .'],
    reference: 'The Beatles, Let It Be (1970), como referência de piano e coro; motivo original.',
    url: 'https://www.thebeatles.com/let-it-be',
  },
  'berkeley-2004': {
    name: 'Berkeley · estrada noturna', bpm: 84, root: 'E', scale: 'Maior', harmony: 'rock-6415', palette: 'rock', tag: 'Estrada',
    bass: ['5 . 5 . 2 . 5 .', '3 . 3 . 0 . 3 .', '0 . 0 . 4 . 0 .', '4 . 4 . 1 . 4 .'],
    lead: ['5 . 7 . 5 4 . .', '3 . 5 . 4 . 2 .', '0 . 2 . 4 2 . .', '4 . 6 . 7 . 4 .'],
    reply: ['. . 9 . 7 . . .', '. . 7 . 5 . . .', '. . 4 . 2 . . .', '. . 6 . 4 . . .'],
    reference: 'Green Day, Boulevard of Broken Dreams (2004), para clima de rock; frase original.',
    url: 'https://greenday.com/music/american-idiot/',
  },
  'new-york-1961': {
    name: 'New York · soul de esquina', bpm: 116, root: 'A', scale: 'Maior', harmony: 'doo-wop-1645', palette: 'soul', tag: 'Soul',
    bass: ['0 . 4 . 7 . 4 .', '5 . 2 . 5 . 2 .', '3 . 0 . 3 . 0 .', '4 . 1 . 4 . 1 .'],
    lead: ['0 . 2 4 . 5 . .', '5 . 4 2 . 0 . .', '3 . 4 5 . 7 . .', '4 . 2 . 1 0 . .'],
    reply: ['. . 7 . 5 . . .', '. . 9 . 7 . . .', '. . 5 . 3 . . .', '. . 6 . 4 . . .'],
    reference: 'Ben E. King, Stand by Me (1961), como referência de doo-wop e soul; material melódico original.',
    url: 'https://www.songhall.org/profile/Ben_E_King',
  },
  'san-francisco-1993': {
    name: 'San Francisco · folk elétrico', bpm: 132, root: 'C', scale: 'Maior', harmony: 'folk-rock-6425', palette: 'folk', tag: 'Folk',
    bass: ['5 . . 2 5 . . 2', '3 . . 0 3 . . 0', '1 . . 5 1 . . 5', '4 . . 1 4 . . 1'],
    lead: ['5 . 4 . 2 0 . .', '3 . 5 . 4 2 . .', '1 . 2 4 . 5 . .', '4 . 6 . 5 4 . .'],
    reply: ['. 9 . . 7 . . .', '. 7 . . 5 . . .', '. 5 . . 4 . . .', '. 6 . . 4 . . .'],
    reference: 'Counting Crows, Mr. Jones (1993), versos Am–F–Dm–G; arranjo e motivo originais.',
    url: 'https://www.countingcrows.com/music',
  },
  'paris-1945': {
    name: 'Paris · folhas de outono', bpm: 112, root: 'C', scale: 'Maior', harmony: 'jazz-251', palette: 'jazz', tag: 'Club',
    bass: ['1 . 5 . 8 . 5 .', '4 . 1 . 7 . 4 .', '0 . 4 . 7 . 4 .', '1 . 8 . 5 . 1 .'],
    lead: ['1 . 3 5 . 7 . .', '4 . 6 8 . 7 . .', '7 . 5 4 . 2 . .', '1 . 2 3 . 0 . .'],
    reply: ['. . 8 . 7 . . .', '. . 9 . 7 . . .', '. . 11 . 9 . . .', '. . 5 . 3 . . .'],
    reference: 'Joseph Kosma, Les Feuilles mortes (1945), ambiente de chanson e linguagem ii–V–I do jazz; melodia original.',
    url: 'https://www.jazzstandards.com/compositions-0/autumnleaves.htm',
  },
  'columbus-2013': {
    name: 'Columbus · indie acústico', bpm: 124, root: 'C', scale: 'Maior', harmony: 'indie-pop-1465', palette: 'indie', tag: 'Indie',
    bass: ['0 . 4 . 0 . 4 .', '3 . 0 . 3 . 0 .', '5 . 2 . 5 . 2 .', '4 . 1 . 4 . 1 .'],
    lead: ['7 . 5 4 . 2 . .', '3 . 5 7 . 5 . .', '5 . 7 9 . 7 . .', '4 . 6 7 . 4 . .'],
    reply: ['. . 4 . 7 . . .', '. . 5 . 9 . . .', '. . 7 . 5 . . .', '. . 6 . 4 . . .'],
    reference: 'Twenty One Pilots, House of Gold (2013), para levada acústica; composição original.',
    url: 'https://www.musicnotes.com/sheetmusic/twenty-one-pilots/house-of-gold/MN0130249',
  },
  'new-york-1930': {
    name: 'New York · turnaround', bpm: 144, root: 'C', scale: 'Maior', harmony: 'jazz-3625', palette: 'swing', tag: 'Swing', swing: .16,
    bass: ['2 . 6 . 9 . 6 .', '5 . 2 . 9 . 5 .', '1 . 5 . 8 . 5 .', '4 . 1 . 8 . 4 .'],
    lead: ['2 . 4 6 . 7 . .', '5 . 7 9 . 8 . .', '1 . 3 5 . 6 . .', '4 . 6 8 . 7 . .'],
    reply: ['. . 9 . 7 . . .', '. . 10 . 9 . . .', '. . 8 . 6 . . .', '. . 9 . 7 . . .'],
    reference: 'Gershwin, I Got Rhythm (1930), para o espírito do rhythm changes; turnaround original iii7–VI7–ii7–V7.',
    url: 'https://gershwin.com/songs/i-got-rhythm/',
  },
  'jacksonville-1974': {
    name: 'Jacksonville · estrada sulista', bpm: 98, root: 'C', scale: 'Maior', harmony: 'southern-rock-415', palette: 'southern', tag: 'Sul',
    bass: ['3 . 0 . 3 . 0 .', '0 . 4 . 0 . 4 .', '4 . 1 . 4 . 1 .', '3 . 7 . 4 . 0 .'],
    lead: ['3 . 5 7 . 5 . .', '0 . 2 4 . 5 . .', '4 . 6 7 . 6 . .', '3 . 4 5 . 2 . .'],
    reply: ['. . 10 . 7 . . .', '. . 7 . 4 . . .', '. . 9 . 7 . . .', '. . 7 . 5 . . .'],
    reference: 'Lynyrd Skynyrd, Sweet Home Alabama (1974), inspiração de timbre sulista; a canção usa D–C–G, não IV–I–V.',
    url: 'https://www.lynyrdskynyrd.com/music/',
  },
  'chicago-1958': {
    name: 'Chicago · blues elétrico', bpm: 164, root: 'C', scale: 'Maior', harmony: 'blues-145', palette: 'blues', tag: 'Blues', swing: .08,
    bass: ['0 . 2 . 4 . 5 .', '3 . 5 . 7 . 8 .', '4 . 6 . 8 . 9 .', '0 . 4 . 7 . 4 .'],
    lead: ['0 . 2 3 . 4 . .', '3 . 5 6 . 7 . .', '4 . 6 7 . 9 . .', '7 . 5 4 . 2 0 .'],
    reply: ['. . 7 . 5 . . .', '. . 10 . 8 . . .', '. . 11 . 9 . . .', '. . 7 . 4 . . .'],
    reference: 'Chuck Berry, Johnny B. Goode (1958), para blues elétrico e guitarra; motivo original.',
    url: 'https://www.chessrecords.com/artist/chuck-berry/',
  },
}

export const HARMONIC_STAGE_PROFILES = Object.fromEntries(
  Object.entries(stages).map(([id, config]) => [id, harmonicStageProfile(config)]),
)
