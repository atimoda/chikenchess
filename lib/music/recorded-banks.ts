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
}]
