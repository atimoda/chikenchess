import { drums, keys, strings, synths, type ProfileSource, type StyleProfile } from './types'

type Replacement = { source: ProfileSource; name?: string; gain?: number; lpf?: number }
const change = (source: ProfileSource, options: Omit<Replacement, 'source'> = {}): Replacement => ({ source, ...options })

/** Focused swaps keep each authored phrase and section while changing its acoustic role. */
const TIMBRES: Record<string, Record<string, Replacement>> = {
  dusseldorf: {
    'Baixo de laboratório': change(synths('acid')), 'Órgão de transistores': change(keys('organ')),
    'Sequência de diodos': change(synths('digital-pluck')), 'Sinal de teste': change(synths('fm-bell')),
  },
  nyc: {
    'Baixo elétrico sincopado': change(strings('bass-round')), 'Guitarra wah': change(strings('muted-electric')),
    'Piano de salão': change(keys('rhodes')), 'Cordas Philadelphia': change(strings('violin')),
    'Sintetizador luminoso': change(synths('wavetable')),
  },
  chicago: {
    'Baixo ácido': change(synths('acid')), 'Piano Warehouse': change(keys('rhodes')),
    'Órgão triangular': change(keys('organ'), { name: 'Órgão Warehouse' }),
    'Pad de néon': change(synths('analog-pad')), 'Lead de armazém': change(synths('wavetable')),
  },
  detroit: {
    'Baixo Model 500': change(synths('acid')), 'Cordas futuristas': change(synths('analog-pad')),
    'Sequência cromada': change(synths('digital-pluck')), 'Pulso de dados': change(synths('fm-bell')),
    'Sub grave do túnel': change(synths('sub')),
  },
  ibiza: {
    'Baixo morno': change(strings('bass-round')), 'Violão de enseada': change(strings('nylon')),
    'Cordas do horizonte': change(strings('violin')), 'Teclas do terraço': change(keys('rhodes')),
  },
  manchester: {
    'Linha acid 303': change(synths('acid')), 'Piano da Haçienda': change(keys('upright')),
    'Lead de armazém': change(synths('wavetable')), 'Névoa industrial': change(synths('analog-pad')),
    'Guitarra baggy': change(strings('muted-electric')),
  },
  berlin: {
    'Baixo de aço': change(synths('acid')), 'Drone de concreto': change(synths('analog-pad')),
    'Metal percussivo': change(synths('fm-bell')), 'Sequenciador Phrygian': change(synths('wavetable')),
    'Órgão do bunker': change(keys('organ')),
  },
  tokyo: {
    'Marimba digital': change(synths('digital-pluck')), 'Teclas FM': change(synths('fm-bell')),
    'Baixo compacto': change(synths('sub')), 'Cordas pixeladas': change(synths('analog-pad')),
    'Formante robótico': change(synths('choir')),
  },
  london: {
    'Subgrave jungle': change(synths('sub')), 'Rave stab': change(synths('wavetable')),
    'Pad de warehouse': change(synths('analog-pad')), 'Cordas de amanhecer': change(synths('choir')),
  },
  saopaulo: {
    'Baixo de porão': change(synths('acid')), 'Guitarra processada': change(strings('muted-electric')),
    'Marimba de aço': change(synths('fm-bell')), 'Cordas de fumaça': change(synths('analog-pad')),
  },
  paris: {
    'Baixo French touch': change(strings('bass-round')), 'Guitarra filtrada': change(strings('muted-electric')),
    'Lead Da Seine': change(synths('wavetable')), 'Teclas cromadas': change(keys('clav')),
    'Pad analógico': change(synths('analog-pad')), 'Cordas sampleadas': change(strings('violin')),
  },
  vienna: {
    'Contrabaixos': change(strings('cello')), 'Primeiros violinos': change(strings('violin')),
    'Violoncelos': change(strings('cello')), 'Segundos violinos': change(strings('violin')),
    'Pizzicato': change(strings('pizzicato')),
  },
  johannesburg: {
    'Baixo elástico de Jozi': change(strings('bass-round')), 'Piano township': change(keys('rhodes')),
    'Guitarra mbaqanga': change(strings('muted-electric')), 'Coro de bairro': change(synths('choir')),
    'Sintetizador de táxi': change(synths('digital-pluck')),
  },
  'buenos-aires-1940': {
    'Contrabaixo do vals': change(strings('bass-round')), 'Acorde no dois': change(keys('upright')),
    'Acorde no três': change(strings('nylon')), 'Guitarra de resposta': change(strings('nylon')),
    'Frase de violino': change(strings('violin')), 'Pizzicato': change(strings('pizzicato')),
    'Segunda palheta': change(keys('accordion'), { name: 'Acordeão de resposta' }),
  },
  'dublin-1990': {
    'Baixo de dois pulsos': change(strings('bass-round')), 'Guitarra arpejada': change(strings('steel')),
    'Guitarra de volta': change(strings('nylon')), 'Violino que responde': change(strings('violin')),
    'Cordas de bordão': change(strings('cello')), 'Piano discreto': change(keys('upright')),
  },
  'new-orleans-1953': {
    'Piano que rola': change(keys('upright')), 'Guitarra da meia-noite': change(strings('slide-electric')),
    'Guitarra de chamada': change(strings('muted-electric')), 'Órgão de igreja': change(keys('organ')),
    'Contrabaixo acústico': change(strings('bass-round')), 'Cordas do amanhecer': change(strings('cello')),
    'Pandeiro fantasma': change(drums('brush'), { name: 'Escova fantasma' }),
  },
}

export function curateTimbres(cityId: string, profile: StyleProfile): StyleProfile {
  const replacements = TIMBRES[cityId]
  if (!replacements) return profile
  const found = new Set<string>()
  const parts = profile.parts.map(part => {
    const replacement = replacements[part.name]
    if (!replacement) return part
    found.add(part.name)
    return { ...part, ...replacement }
  })
  for (const name of Object.keys(replacements)) if (!found.has(name)) throw new Error(`Timbre sem parte: ${cityId}/${name}`)
  return { ...profile, parts }
}
