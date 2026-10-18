import { cities } from '../cities-data'
import { STYLE_PROFILES } from '../music/kit-profiles/catalog'

export type AdminEntryKind = 'strings' | 'string-groups' | 'text-map' | 'campaigns' | 'ranks' | 'bots' | 'names' | 'music-profile' | 'music-preset'
export interface AdminEntry {
  id: string
  title: string
  group: string
  description: string
  path: string
  kind: AdminEntryKind
  cityId?: string
}

const ui = (id: string, title: string, description: string, kind: AdminEntryKind): AdminEntry => ({ id, title, description, kind, group: 'Textos e interface', path: `data/ui/${id}.json` })
export const ADMIN_ENTRIES: AdminEntry[] = [
  ui('opening-phrases', 'Abertura do globo', 'Frase sorteada ao entrar no mapa.', 'strings'),
  ui('match-tips', 'Tips de abertura', 'Dicas exibidas sequencialmente na abertura das primeiras partidas.', 'strings'),
  ui('city-intros', 'Introduções das fases', 'Frases de abertura por cidade e época.', 'string-groups'),
  ui('move-messages', 'Jogadas e sequências', 'Mensagens de Best, Worst, sequências e jogada única.', 'string-groups'),
  ui('city-descriptions', 'Descrições das fases', 'Textos culturais exibidos nos cartões do globo.', 'text-map'),
  ui('campaigns', 'Campanhas', 'Nomes das campanhas; os IDs são preservados.', 'campaigns'),
  ui('rank-titles', 'Títulos dos ranks', 'Nomes dos níveis; os limites de pontuação são preservados.', 'ranks'),
  ui('bots', 'Perfis dos bots', 'Configurações de dificuldade, atraso e poderes dos bots Pure Chess e ChickenBot.', 'bots'),
  { ...ui('baptism-names', 'Nomes de batismo', 'Títulos, adjetivos, substantivos e epítetos. Depois de salvar, gere a migração para publicar o catálogo no Supabase.', 'names'), group: 'Contas' },
  ...Object.keys(STYLE_PROFILES).map(cityId => {
    const city = cities.find(item => item.id === cityId)!
    return { id: `profile:${cityId}`, title: `${city.year} · ${city.name}`, group: 'Kits musicais', kind: 'music-profile' as const, cityId,
      description: `${city.genre}. Perfil autoral normalizado, com a curadoria existente incorporada.`, path: `data/music/profiles/${cityId}.json` }
  }),
  ...[
    ['manchester-1999', 'Manchester 1999', 'manchester-1999'],
    ['dusseldorf-original', 'Düsseldorf · Electro 01', 'dusseldorf'],
    ['mouth-breather', 'Mouth Breather · estudo eefano', undefined],
  ].map(([id, title, cityId]) => ({ id: `preset:${id}`, title: title!, cityId, group: 'Presets MIDI', kind: 'music-preset' as const, description: 'Kit completo em JSON, no mesmo formato de exportação do Criativo.', path: `public/presets/${id}.json` })),
]
