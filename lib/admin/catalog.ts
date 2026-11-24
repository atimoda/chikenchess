import { cities } from '../cities-data'
import { STYLE_PROFILES } from '../music/kit-profiles/catalog'

export type AdminEntryKind = 'strings' | 'string-groups' | 'text-map' | 'campaigns' | 'ranks' | 'bots' | 'egg-rewards' | 'names' | 'music-profile' | 'music-preset' | 'music-reactions' | 'chicken-controls' | 'pigchicken-items' | 'pigchicken-scales' | 'pigchicken-souls' | 'pigchicken-patio'
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
  ui('move-messages', 'Jogadas e sequências', 'Mensagens de Best, Worst, ovos recolhidos com outra peça, sequências e jogada única.', 'string-groups'),
  ui('city-descriptions', 'Descrições das fases', 'Textos culturais exibidos nos cartões do globo.', 'text-map'),
  ui('campaigns', 'Campanhas', 'Nomes das campanhas; os IDs são preservados.', 'campaigns'),
  ui('rank-titles', 'Títulos dos ranks', 'Nomes dos níveis; os limites de pontuação são preservados.', 'ranks'),
  ui('bots', 'Perfis dos bots', 'Configurações de dificuldade, atraso e poderes dos bots Pure Chess e ChickenBot.', 'bots'),
  { ...ui('egg-rewards', 'Recompensas de ovos', 'Teto de golden eggs na partida, quantos lances Best/Worst rendem ovos conforme o número de lances possíveis, e quanto tempo os ovos ficam nas casas depois das setas.', 'egg-rewards'), group: 'Regras da partida' },
  { ...ui('baptism-names', 'Nomes de batismo', 'Títulos, adjetivos, substantivos e epítetos. Depois de salvar, gere a migração para publicar o catálogo no Supabase.', 'names'), group: 'Contas' },
  { id: 'chicken-controls', title: 'Controles padrão', group: 'Pátio', kind: 'chicken-controls', path: 'data/chicken/default-controls.json',
    description: 'Binds e opções do painel Controles para quem nunca mexeu neles e para Restaurar padrão. O painel Controles grava aqui com Salvar no game.' },
  { id: 'pigchicken-items', title: 'Itens padrão (armas e instrumentos)', group: 'Pátio', kind: 'pigchicken-items', path: 'data/pigchicken/default-items.json',
    description: 'Números e opções de cada item do painel Itens (armas, instrumentos, esportivos, consumíveis, asa e bicada) para quem nunca mexeu neles. O painel Itens grava aqui com Salvar no game.' },
  { id: 'pigchicken-scales', title: 'Escalas dos instrumentos', group: 'Pátio', kind: 'pigchicken-scales', path: 'data/pigchicken/default-scales.json',
    description: 'Números de cada escala do painel Escalas (standby e fade out da camada Escalas, forma dos gráficos) para quem nunca mexeu neles. O painel Escalas grava aqui com Salvar no game.' },
  { id: 'pigchicken-souls', title: 'Almas (fichas da biblioteca)', group: 'Pátio', kind: 'pigchicken-souls', path: 'data/pigchicken/default-souls.json',
    description: 'O que muda nas fichas das almas em relação ao código (nome, raridade, voo, aparência) e a lista das raras com as receitas. O editor da Biblioteca de almas grava aqui com Salvar no game.' },
  { id: 'pigchicken-patio', title: 'Pátio padrão (configurações, camadas, câmera, volume e grade)', group: 'Pátio', kind: 'pigchicken-patio', path: 'data/pigchicken/default-patio.json',
    description: 'settings: o que um Pátio vazio novo recebe (Configurações do Pátio). layers: o painel Camadas de um Pátio que não salvou o seu. camera: o painel Câmera de Mira para quem nunca mexeu nele e para Padrão. volume: o painel Volume, do mesmo jeito. mineGrid: o painel Grade de blocos de um Pátio que não salvou a sua grade (um novo também), menos Ligar. Cada painel grava a sua parte com Salvar no game.' },
  { id: 'reactions', title: 'Estados e Eventos globais', group: 'Kits musicais', kind: 'music-reactions', path: 'data/music/reactions.json',
    description: 'Regras oficiais de Estados e Eventos usadas por todos os kits; cada kit pode sobrescrever gatilhos no Criativo.' },
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
