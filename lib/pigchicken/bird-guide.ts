// The Guia de pássaros: the real birds the souls take after. Two layers: the souls (lib/pigchicken/soul-library.ts)
// are the game's own, and each of their sheets names one real bird of this guide as its inspiration (one bird can
// inspire many souls). A bird here is its names, a few facts, the colours of its drawing, the voice of the souls it
// inspires and its real songs: clips cut from recordings of xeno-canto.org (data/pigchicken/bird-songs.json, written
// by scripts/prepare-bird-songs.py), each with its recordist and licence. Pure: who plays the clips is
// lib/pigchicken/bird-song.ts.
import { msg } from '../i18n'
import SONGS_FILE from '../../data/pigchicken/bird-songs.json'
import type { VoiceId } from './synth'
import type { SoulShot, SoulSpecies, SoulState } from './souls'

export type GuideShape = SoulShot | 'chick'
export type GuideBird = {
  id: string // its scientific name as a slug: the name of its clips too
  sci: string; name: string // scientific and popular (pt-BR)
  game: string // the name it goes by in the game, after both
  family: string; cm: number
  where: string // where it lives
  about: string
  // its drawing: one of the souls' shapes, the size of a pixel and its colours
  shape: GuideShape; pixel: number; body: string; wing: string; belly: string; beak: string
  voice: VoiceId // the synth voice the souls it inspires sing with
}
// kind: a song or a call; xc: its number in xeno-canto's catalogue; by: who recorded it
export type BirdClip = { file: string; kind: 'song' | 'call'; seconds: number; xc: number; by: string; country: string; license: string; licenseUrl: string; url: string }

// the voice of its souls' notes by the shape of its drawing, when it names none (the synth's "piu", 'bird', is kept for
// two rare ones only: it tires quickly)
const SHAPE_VOICE: Record<GuideShape, VoiceId> = { wind: 'flute', strings: 'harp', keys: 'bells', percussion: 'pizz', rebate: 'hum', chick: 'bells' }
const bird = (id: string, sci: string, name: string, game: string, family: string, cm: number, where: string, about: string, shape: GuideShape, colours: [string, string, string, string], voice: VoiceId = SHAPE_VOICE[shape]): GuideBird =>
  ({ id, sci, name, game, family, cm, where, about, shape, pixel: cm < 14 ? 3 : cm < 20 ? 4 : cm < 32 ? 5 : cm < 50 ? 6 : cm < 70 ? 7 : 8, body: colours[0], wing: colours[1], belly: colours[2], beak: colours[3], voice })

export const GUIDE_BIRDS: readonly GuideBird[] = [
  bird('turdus-rufiventris', 'Turdus rufiventris', msg("Sabiá-laranjeira"), msg("Sabiá Rufiventre"), 'Turdidae', 25, msg("Matas, quintais e praças do Brasil"), msg("Ave símbolo do Brasil. Canta ao amanhecer e ao entardecer, em frases longas e aflautadas."), 'strings', ['#7a6a55', '#5c4f40', '#d9732e', '#d9a441'], 'flute'),
  bird('pitangus-sulphuratus', 'Pitangus sulphuratus', msg("Bem-te-vi"), msg("Bem-te-vi Sulfurato"), 'Tyrannidae', 23, msg("Cidades, campos e beiras de rio"), msg("Grita o próprio nome e enfrenta gaviões para defender o ninho."), 'keys', ['#7a5c3a', '#5a4128', '#ffd23f', '#2b2b2b']),
  bird('passer-domesticus', 'Passer domesticus', msg("Pardal"), msg("Pardal Doméstico"), 'Passeridae', 15, msg("Cidades do mundo todo"), msg("Veio da Europa e vive junto das pessoas, em bandos barulhentos."), 'percussion', ['#a47148', '#6f4a2f', '#d9cdb8', '#3a3a3a']),
  bird('sicalis-flaveola', 'Sicalis flaveola', msg("Canário-da-terra"), msg("Canário Flavéola"), 'Thraupidae', 13.5, msg("Campos e áreas abertas"), msg("O macho canta em estalos e trinados fortes para marcar o território."), 'wind', ['#f2c81e', '#b89a2a', '#ffe45c', '#8a7a5a']),
  bird('athene-cunicularia', 'Athene cunicularia', msg("Coruja-buraqueira"), msg("Coruja Cunicular"), 'Strigidae', 23, msg("Campos, pastos e terrenos baldios"), msg("Mora em buracos no chão e fica ativa também de dia."), 'rebate', ['#8a6f4e', '#6a543a', '#e6d8bd', '#d8cf9a'], 'hum'),
  bird('eupetomena-macroura', 'Eupetomena macroura', msg("Beija-flor-tesoura"), msg("Tesoura Macroura"), 'Trochilidae', 17, msg("Jardins, cerrado e bordas de mata"), msg("Um dos maiores beija-flores do Brasil. Para no ar e defende as flores com valentia."), 'wind', ['#1f7a5c', '#2a2f5e', '#2c3fa8', '#1a1a1a']),
  bird('furnarius-rufus', 'Furnarius rufus', msg("João-de-barro"), msg("João Rufo"), 'Furnariidae', 19, msg("Campos, fazendas e cidades"), msg("Constrói uma casa de barro em forma de forno. O casal canta em dueto."), 'percussion', ['#b5713a', '#8f5528', '#e9d3b0', '#5a4632']),
  bird('vanellus-chilensis', 'Vanellus chilensis', msg("Quero-quero"), msg("Quero-quero Chileno"), 'Charadriidae', 35, msg("Campos, gramados e várzeas"), msg("Sentinela dos campos: dá o alarme a qualquer hora e tem esporões nas asas."), 'strings', ['#9a9a94', '#5e6b4f', '#f2f2ee', '#c9506a'], 'bird'),
  bird('zonotrichia-capensis', 'Zonotrichia capensis', msg("Tico-tico"), msg("Tico-tico Capense"), 'Passerellidae', 15, msg("Do campo à cidade, em quase toda a América do Sul"), msg("Topete listrado e colar ferrugem. Cada região tem o seu dialeto de canto."), 'strings', ['#8a6a48', '#5f4630', '#dcd6c8', '#6a6a6a']),
  bird('thraupis-sayaca', 'Thraupis sayaca', msg("Sanhaço-cinzento"), msg("Sanhaço Saiaca"), 'Thraupidae', 17.5, msg("Pomares, praças e bordas de mata"), msg("Cinza-azulado e comedor de frutas. Canto agudo e apressado."), 'keys', ['#8fa9b8', '#4f8fb0', '#b9c9cf', '#3a3f45']),
  bird('columbina-talpacoti', 'Columbina talpacoti', msg("Rolinha-roxa"), msg("Rolinha Talpacoti"), 'Columbidae', 17, msg("Cidades, roças e campos"), msg("A pombinha mais comum das cidades. Arrulha baixo e repetido."), 'percussion', ['#a8623c', '#8a4f30', '#c98a6a', '#5a4a40'], 'hum'),
  bird('crotophaga-ani', 'Crotophaga ani', msg("Anu-preto"), msg("Anu Crotófago"), 'Cuculidae', 35, msg("Pastos, brejos e capoeiras"), msg("Vive em bandos que cuidam de um ninho só. Todo preto, de bico alto."), 'wind', ['#1c1c22', '#111116', '#2a2a33', '#0c0c0c']),
  bird('troglodytes-musculus', 'Troglodytes musculus', msg("Corruíra"), msg("Corruíra Músculo"), 'Troglodytidae', 12, msg("Quintais, jardins e bordas de mata"), msg("Pequena e inquieta. O canto borbulhante é bem mais alto que o tamanho dela."), 'percussion', ['#96704a', '#7a5838', '#d8c3a0', '#6a5a48'], 'flute'),
  bird('colaptes-campestris', 'Colaptes campestris', msg("Pica-pau-do-campo"), msg("Pica-pau Campestre"), 'Picidae', 30, msg("Campos e cerrados"), msg("Pica-pau que vive no chão dos campos e come formigas e cupins."), 'strings', ['#c9b27a', '#5a5140', '#e8d9a8', '#33332f']),
  bird('rupornis-magnirostris', 'Rupornis magnirostris', msg("Gavião-carijó"), msg("Carijó Magnirrostro"), 'Accipitridae', 36, msg("Bordas de mata, campos e cidades"), msg("O gavião mais comum do Brasil. Grita enquanto plana em círculos."), 'keys', ['#7a6a5a', '#5a4c40', '#d9c7a8', '#e0b83a']),
  bird('coragyps-atratus', 'Coragyps atratus', msg("Urubu-preto"), msg("Urubu Atrato"), 'Cathartidae', 62, msg("Do campo às grandes cidades"), msg("Não tem siringe: só sopra e rosna. Plana por horas nas correntes de ar quente."), 'rebate', ['#18181a', '#0f0f11', '#26262a', '#55524c'], 'hum'),
  bird('ramphastos-toco', 'Ramphastos toco', msg("Tucanuçu"), msg("Tucano Toco"), 'Ramphastidae', 56, msg("Cerrado, Pantanal e matas de galeria"), msg("O maior dos tucanos. O bico enorme é leve e ajuda a perder calor."), 'keys', ['#121214', '#0c0c0e', '#f4f1e6', '#f08a1c'], 'hum'),
  bird('pionus-maximiliani', 'Pionus maximiliani', msg("Maitaca-verde"), msg("Maitaca Maximiliana"), 'Psittacidae', 27, msg("Matas e arvoredos do leste e do centro do Brasil"), msg("Voa em bandos barulhentos, gritando o próprio nome."), 'percussion', ['#3f7a45', '#2f5e36', '#5f8f58', '#d8c36a']),
  bird('pygochelidon-cyanoleuca', 'Pygochelidon cyanoleuca', msg("Andorinha-pequena-de-casa"), msg("Andorinha Cianoleuca"), 'Hirundinidae', 12, msg("Cidades e campos, perto de construções"), msg("Caça insetos em voo e faz o ninho em beirais e telhados."), 'wind', ['#1f2f5e', '#1a2038', '#f2f2ee', '#1a1a1a']),
  bird('ardea-alba', 'Ardea alba', msg("Garça-branca-grande"), msg("Garça Alba"), 'Ardeidae', 90, msg("Lagos, rios, brejos e manguezais"), msg("Toda branca, de pescoço em S. Quase não canta: só grasna rouco."), 'wind', ['#f4f4f0', '#dedede', '#ffffff', '#e8b730'], 'hum'),
  bird('nyctibius-griseus', 'Nyctibius griseus', msg("Urutau"), msg("Urutau Gríseo"), 'Nyctibiidae', 36, msg("Bordas de mata e cerrados"), msg("De dia imita um toco de árvore. À noite solta um lamento que desce a escala: é a mãe-da-lua."), 'rebate', ['#7a6e5e', '#5a5045', '#9a8f7c', '#3a342c'], 'flute'),
  bird('procnias-nudicollis', 'Procnias nudicollis', msg("Araponga"), msg("Araponga Nudicole"), 'Cotingidae', 27, msg("Mata Atlântica"), msg("O grito soa como martelo na bigorna e é um dos mais altos entre as aves."), 'percussion', ['#f2f2f0', '#dcdcdc', '#ffffff', '#2aa198']),
  bird('cyphorhinus-arada', 'Cyphorhinus arada', msg("Uirapuru-verdadeiro"), msg("Uirapuru Arada"), 'Troglodytidae', 12.5, msg("Amazônia"), msg("Canto de flauta da floresta. A lenda diz que a mata se cala para ouvir."), 'strings', ['#8a4a2a', '#5e3a26', '#c9703a', '#2f2a26'], 'flute'),
  bird('tangara-seledon', 'Tangara seledon', msg("Saíra-sete-cores"), msg("Saíra Seledon"), 'Thraupidae', 13.5, msg("Mata Atlântica"), msg("Sete cores na plumagem. Vive em bandos pela copa das árvores."), 'keys', ['#36b37e', '#1c1c22', '#2a7fd0', '#1a1a1a'], 'bird'),
  bird('cariama-cristata', 'Cariama cristata', msg("Seriema"), msg("Seriema Cristata"), 'Cariamidae', 90, msg("Cerrados e campos"), msg("Corre mais do que voa. A gargalhada dela é ouvida a mais de um quilômetro."), 'strings', ['#a89a80', '#7a6e5a', '#d9d0bd', '#d8452a']),
  bird('gallus-gallus', 'Gallus gallus', msg("Galo-doméstico"), msg("Pinto Galo"), 'Phasianidae', 45, msg("Quintais e galinheiros do mundo todo"), msg("Parente da galinha do jogo. O pintinho pia para a mãe o achar."), 'chick', ['#ffd23f', '#f4a261', '#fff3b0', '#f77f00']),
  bird('tyto-furcata', 'Tyto furcata', msg("Suindara"), msg("Suindara Furcata"), 'Tytonidae', 36, msg("Torres, forros e campos abertos"), msg("Rosto em forma de coração. Caça no escuro pelo ouvido e grita como pano rasgando."), 'rebate', ['#d8b878', '#a89070', '#f4efe2', '#e8dcc0'], 'hum'),
  bird('caracara-plancus', 'Caracara plancus', msg("Carcará"), msg("Carcará Planco"), 'Falconidae', 56, msg("Campos, estradas e cidades"), msg("Falcão que anda no chão e come de tudo. Joga a cabeça para trás ao gritar."), 'strings', ['#3a2f28', '#2a221c', '#e6d9bd', '#f08a3a']),
  bird('nyctidromus-albicollis', 'Nyctidromus albicollis', msg("Bacurau"), msg("Bacurau Albicole"), 'Caprimulgidae', 28, msg("Bordas de mata e estradas de terra"), msg("Dorme no chão, camuflado. À noite repete um chamado que parece dizer curiango."), 'wind', ['#7a644a', '#5a4a38', '#a89070', '#2f2a26'], 'flute'),
  bird('mimus-saturninus', 'Mimus saturninus', msg("Sabiá-do-campo"), msg("Sabiá Saturnino"), 'Mimidae', 26, msg("Campos, cerrados e cidades"), msg("Imita o canto de outras aves e emenda tudo numa cantoria só."), 'strings', ['#8a8478', '#5e5a52', '#e6e0d2', '#2f2a26'], 'flute'),
]
const BY_ID = new Map(GUIDE_BIRDS.map(b => [b.id, b]))
export const isGuideBird = (v: unknown): v is string => typeof v === 'string' && BY_ID.has(v)
export const guideBird = (id: string | null | undefined): GuideBird => (id ? BY_ID.get(id) : undefined) ?? GUIDE_BIRDS[0]

// ---------- the songs ----------
type SongsFile = { source?: string; folder?: string; birds?: Record<string, BirdClip[]> }
const SONGS = SONGS_FILE as SongsFile
export const BIRD_SONGS_SOURCE = SONGS.source ?? 'xeno-canto.org'
export const BIRD_SONGS_FOLDER = SONGS.folder ?? 'samples/birds-v1'
/** the clips of a bird, songs first (none: it has no recording yet) */
export const birdClips = (id: string): readonly BirdClip[] => SONGS.birds?.[id] ?? []
/** one of its clips at random: a song three times out of four, when it has both */
export function pickBirdClip(id: string, rand: () => number = Math.random): BirdClip | null {
  const all = birdClips(id)
  if (!all.length) return null
  const songs = all.filter(c => c.kind === 'song'), calls = all.filter(c => c.kind !== 'song')
  const from = songs.length && calls.length ? (rand() < 0.75 ? songs : calls) : all
  return from[Math.min(from.length - 1, Math.floor(rand() * from.length))]
}
/** every clip with its bird, in the guide's order: the credits */
export const birdCredits = () => GUIDE_BIRDS.flatMap(b => birdClips(b.id).map(clip => ({ bird: b, clip })))

// ---------- the bird each soul takes after, when its sheet says nothing ----------
type Alien = Exclude<SoulSpecies, 'chick'>
// a living soul: by the alien it was and the family of instrument that filled it (wind, strings, keys, percussion, rebate)
const SHOTS: readonly SoulShot[] = ['wind', 'strings', 'keys', 'percussion', 'rebate']
const DAY: Record<Alien, readonly [string, string, string, string, string]> = {
  horde: ['passer-domesticus', 'pygochelidon-cyanoleuca', 'columbina-talpacoti', 'zonotrichia-capensis', 'sicalis-flaveola'],
  jelly: ['ardea-alba', 'eupetomena-macroura', 'tangara-seledon', 'thraupis-sayaca', 'pygochelidon-cyanoleuca'],
  lantern: ['sicalis-flaveola', 'tangara-seledon', 'pitangus-sulphuratus', 'eupetomena-macroura', 'thraupis-sayaca'],
  shell: ['troglodytes-musculus', 'furnarius-rufus', 'columbina-talpacoti', 'colaptes-campestris', 'passer-domesticus'],
  twin: ['furnarius-rufus', 'pionus-maximiliani', 'mimus-saturninus', 'vanellus-chilensis', 'pitangus-sulphuratus'],
  mini: ['zonotrichia-capensis', 'troglodytes-musculus', 'passer-domesticus', 'columbina-talpacoti', 'eupetomena-macroura'],
  drum: ['cariama-cristata', 'ramphastos-toco', 'pionus-maximiliani', 'procnias-nudicollis', 'colaptes-campestris'],
  dragon: ['cyphorhinus-arada', 'turdus-rufiventris', 'mimus-saturninus', 'cariama-cristata', 'ramphastos-toco'],
}
const ALIENS = Object.keys(DAY) as Alien[]
// a dead one: the birds of the night and of carrion, two for each family (the aliens take turns)
const NIGHT: Record<SoulShot, readonly [string, string]> = {
  wind: ['nyctibius-griseus', 'nyctidromus-albicollis'], strings: ['tyto-furcata', 'rupornis-magnirostris'], keys: ['athene-cunicularia', 'crotophaga-ani'],
  percussion: ['caracara-plancus', 'coragyps-atratus'], rebate: ['coragyps-atratus', 'tyto-furcata'],
}
// the game's rare ones
const RARE: Record<string, string> = {
  'rare.fenix': 'turdus-rufiventris', 'rare.dragao-desafinado': 'ramphastos-toco', 'rare.vaga-lume': 'nyctidromus-albicollis', 'rare.metronomo': 'procnias-nudicollis',
  'rare.gemea-ma': 'crotophaga-ani', 'rare.alma-blue': 'thraupis-sayaca', 'rare.quase-la': 'zonotrichia-capensis', 'rare.bumerangue': 'pygochelidon-cyanoleuca',
  'rare.desafinada': 'pionus-maximiliani', 'rare.flechada': 'rupornis-magnirostris', 'rare.estilhaco': 'caracara-plancus', 'rare.bala-perdida': 'coragyps-atratus',
}
/** The bird a soul of the catalogue takes after by the code's rule (a rare one of an admin's: by its state and family). */
export function inspirationOf(e: { id: string; species: SoulSpecies | null; state: SoulState; shot: SoulShot | null }): string {
  if (e.species === 'chick') return 'gallus-gallus'
  const rare = RARE[e.id]
  if (rare) return rare
  const shot = e.shot ?? 'wind', alien = e.species ?? 'horde'
  return e.state === 'dead' ? NIGHT[shot][ALIENS.indexOf(alien) % 2] : DAY[alien][SHOTS.indexOf(shot)]
}
