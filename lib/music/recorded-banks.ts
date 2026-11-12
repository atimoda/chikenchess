import type { SampleBank } from './sample-banks'

const multisample = (bank: string, asset: string, name: string, notes: string[], layers: string[], octaveShift = 0) => ({
  id: asset, name, variants: layers.map((layer, index) => {
    // Source libraries use different octave conventions. Keys describe measured
    // sounding pitch; filenames retain the immutable source manifest identity.
    const keymap = Object.fromEntries(notes.map(note => [note.replace(/\d$/, octave => String(Number(octave) + octaveShift)), `/samples/${bank}/${asset}-${index}-${note}.ogg`]))
    return { name: layer, file: Object.values(keymap)[0], keymap }
  }),
})
const hit = (asset: string, name: string) => ({ id: asset, name,
  variants: ['Tomada 1', 'Tomada 2'].map((name, index) => ({ name, file: `/samples/chicken-percussion-v1/${asset}-${index}.ogg` })),
})

export const RECORDED_BANKS: SampleBank[] = [{
  id: 'chicken-band-v1', name: 'Chicken Band · piano, sax e marimba gravados',
  credit: 'Versilian Community Sample Library · gravações CC0; scripts/prepare-band-recordings.py', license: 'CC0-1.0',
  assets: [
    multisample('chicken-band-v1', 'piano', 'Piano de cauda Steinway B', ['c2', 'c3', 'c4', 'c5'], ['Piano', 'Forte']),
    multisample('chicken-band-v1', 'tenor-sax', 'Saxofone tenor sem vibrato', ['c3', 'e3', 'f#3', 'c4', 'e4', 'f#4'], ['Suave', 'Forte'], 1),
    multisample('chicken-band-v1', 'marimba', 'Marimba acústica', ['c2', 'c4', 'c6'], ['Suave', 'Forte'], 1),
  ],
}, {
  id: 'chicken-percussion-v1', name: 'Chicken Percussion · ataques e tomadas acústicas',
  credit: 'VCSL e Virtuosity Drums · gravações CC0; scripts/prepare-band-recordings.py e prepare-acoustic-extras.py', license: 'CC0-1.0',
  assets: [hit('kick', 'Bumbo de bateria'), hit('ride', 'Ride de bateria'), hit('snare', 'Caixa com esteira'), hit('ghost-snare', 'Caixa leve'), hit('hat', 'Chimbal fechado'),
    hit('open-hat', 'Chimbal aberto'), hit('tom', 'Tom com baqueta'), hit('conga', 'Conga aberta'),
    hit('muted-conga', 'Conga abafada'), hit('bongo', 'Bongô'), hit('shaker', 'Shaker grande'),
    hit('tambourine', 'Pandeireta de platinelas'), hit('cymbal-tip', 'Prato suspenso com baqueta'), hit('crash', 'Prato suspenso'),
  ],
}, {
  id: 'chicken-guitars-v1', name: 'Chicken Guitars · guitarras e baixo gravados',
  credit: 'Karoryfer Samples e Freepats Spanish Classical Guitar · CC0; scripts/prepare-guitar-recordings.py e prepare-acoustic-extras.py', license: 'CC0-1.0',
  assets: [
    multisample('chicken-guitars-v1', 'clean', 'Guitarra hollowbody limpa', ['e2', 'g2', 'c3', 'e3', 'g3', 'c4'], ['Tomada 1', 'Tomada 2']),
    multisample('chicken-guitars-v1', 'muted', 'Guitarra hollowbody staccato', ['e2', 'g2', 'c3', 'e3', 'g3', 'c4'], ['Tomada 1', 'Tomada 2']),
    multisample('chicken-guitars-v1', 'bass', 'Baixo hollowbody dedilhado', ['c2', 'e2', 'g2', 'c3'], ['Tomada 1', 'Tomada 2'], -1),
    multisample('chicken-guitars-v1', 'nylon', 'Violão clássico de nylon', ['e2', 'g2', 'c3', 'e3', 'g3', 'c4'], ['Gravação']),
  ],
}, {
  // Amplifiers rendered offline (chords intermodulate before the amp, as on a real guitar).
  id: 'chicken-amps-v1', name: 'Chicken Amps · guitarras amplificadas',
  credit: 'Karoryfer Black and Green Guitars e Big Little Bass · gravações diretas CC0, passadas por modelos de amplificador e caixa; gaita sintetizada; scripts/prepare-amp-recordings.py', license: 'CC0-1.0',
  assets: [
    multisample('chicken-amps-v1', 'tweed', 'Guitarra em valvulado tweed (blues, no limite da saturação)', ['e2', 'a2', 'd3', 'g3', 'c4', 'f4', 'a4', 'd5'], ['Tweed']),
    multisample('chicken-amps-v1', 'crunch', 'Guitarra crunch (stack britânico)', ['e2', 'a2', 'd3', 'g3', 'c4', 'f4', 'a4'], ['Crunch']),
    multisample('chicken-amps-v1', 'lead', 'Guitarra solo com overdrive e sustain', ['a2', 'd3', 'g3', 'c4', 'f4', 'a4', 'd5'], ['Lead']),
    multisample('chicken-amps-v1', 'power', 'Power chords (fundamental, quinta e oitava)', ['e2', 'g2', 'c3', 'e3', 'g3'], ['High gain', 'Fuzz']),
    multisample('chicken-amps-v1', 'chug', 'Power chords abafados com a palma (palm mute)', ['e2', 'g2', 'c3', 'e3', 'g3'], ['High gain']),
    multisample('chicken-amps-v1', 'fuzz', 'Guitarra solo com fuzz', ['a2', 'd3', 'g3', 'c4', 'f4', 'a4', 'd5'], ['Fuzz']),
    multisample('chicken-amps-v1', 'jangle', 'Guitarra de 12 cordas com compressor (jangle)', ['e2', 'a2', 'd3', 'g3', 'c4', 'f4', 'a4'], ['12 cordas']),
    multisample('chicken-amps-v1', 'chorus', 'Guitarra limpa com chorus', ['e2', 'a2', 'd3', 'g3', 'c4', 'f4', 'a4'], ['Chorus']),
    multisample('chicken-amps-v1', 'harp', 'Gaita de blues amplificada', ['c4', 'f4', 'a4', 'd5', 'g5'], ['Amplificada']),
    multisample('chicken-amps-v1', 'rock-bass', 'Baixo de rock com valvulado', ['c1', 'e1', 'g1', 'c2'], ['Grind']),
  ],
}, {
  id: 'chicken-voices-v1', name: 'Chicken Voices · grupo vocal',
  credit: 'ChickenChess · vozes sintetizadas por modelo fonte-filtro (pulso glótico e formantes), amostradas a cada poucos semitons; scripts/generate-vocal-group.py', license: 'CC0-1.0',
  assets: [
    multisample('chicken-voices-v1', 'ooh', 'Grupo vocal em "ooh"', ['a2', 'd3', 'g3', 'c4', 'f4', 'a4'], ['Ooh']),
    multisample('chicken-voices-v1', 'aah', 'Grupo vocal em "aah"', ['a2', 'd3', 'g3', 'c4', 'f4', 'a4'], ['Aah']),
    multisample('chicken-voices-v1', 'doo-wah', 'Sílabas curtas do grupo vocal', ['a2', 'd3', 'g3', 'c4', 'f4', 'a4'], ['Doo', 'Wah']),
    multisample('chicken-voices-v1', 'bass-bom', 'Baixo vocal em "bom"', ['e1', 'a1', 'd2', 'g2', 'c3'], ['Bom']),
    multisample('chicken-voices-v1', 'falsetto', 'Falsete em "oo"', ['c4', 'f4', 'a4', 'd5', 'g5'], ['Oo']),
  ],
}, {
  id: 'chicken-bateria-v1', name: 'Chicken Bateria · escola de samba',
  credit: 'Versilian Community Sample Library · gravações CC0 afinadas e moldadas como surdos, caixa, tamborim, chocalho, reco-reco e apito; scripts/prepare-bateria-recordings.py', license: 'CC0-1.0',
  assets: [
    ['surdo-primeira', 'Surdo de primeira (aberto)'], ['surdo-primeira-leve', 'Surdo de primeira (leve)'], ['surdo-mao', 'Surdo abafado com a mão'],
    ['surdo-terceira', 'Surdo de terceira'], ['caixa', 'Caixa de guerra'], ['caixa-leve', 'Caixa de guerra (leve)'],
    ['tamborim', 'Tamborim'], ['tamborim-abafado', 'Tamborim abafado'], ['chocalho', 'Chocalho de platinelas'],
    ['chocalho-acento', 'Chocalho (acento)'], ['reco-reco', 'Reco-reco'], ['apito', 'Apito do mestre'], ['apito-longo', 'Apito longo'],
  ].map(([id, name]) => ({ id, name, variants: [{ name: 'Gravação', file: `/samples/chicken-bateria-v1/${id}-0.ogg` }] })),
}]
