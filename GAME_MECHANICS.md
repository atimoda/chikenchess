# ChickenChess — mecânica em funcionamento

Atualizado em 25/10/2026 — v1.9.0 (Electronic World refeito com kits fiéis aos estilos, reações próprias por kit e bancos de máquinas e vozes eletrônicas; novas fases Goa 1994 · psytrance, Bristol 1994 · trip-hop, Croydon 2006 · dubstep e Durban 2016 · gqom; Legacy kits no Criativo; Game dynamics e novas influências em States & Events; abas TOM e FX/MOD com filtro, delay próprio, LFO, vibrato, FM, supersaw, loop e sidechain; fills e rolls de 16 compassos; samples em Opus/AAC; lance premiado bloqueado pelo teto de ovos volta a pagar depois de Undo). Referência de comportamento atual para desenvolvimento e testes. Ideias futuras ficam em `docs/mechanics/maintenance.md` e em `MUSIC_ENGINE_PLAN.md`; não são comportamentos já implementados.

## Leitura por assunto

| Assunto | Seção a consultar |
| --- | --- |
| Ativação, captura, cheque, pausa e gesto | [Ações e efeitos](docs/mechanics/actions-and-movement.md#ações-e-efeitos-implementados--todas-as-cidades) e [Movimento](docs/mechanics/actions-and-movement.md#movimento-e-interpretação) |
| Piece/Board Params e DJ | [Widgets](docs/mechanics/widgets.md#widgets-da-partida), [Mixer](docs/mechanics/mixer.md#mixer-dj-na-partida) e [Chance de tocar](docs/mechanics/actions-and-movement.md#chance-de-tocar) |
| Kits, migração, laboratório | [Criativo e persistência](docs/mechanics/creative.md#criativo-e-persistência) e [Escopo](docs/mechanics/scope-and-data.md#escopo-e-dados) |
| Schema 7, migração do arranjo e LPF L/S/N | [MIDI-only e persistência](docs/mechanics/midi-persistence.md#midi-only-e-persistência--0210-v0110) |
| Forma global, atribuições por peça e harmonia por compasso | [Arranjo global](docs/mechanics/arrangement.md#arranjo-global-e-atribuições-por-peça--0210) |
| Regras, transições e BPM | [Estados e Eventos](docs/mechanics/states-and-events.md#estados-e-eventos--v032) |
| Piano roll, seções e slides | [Editor](docs/mechanics/editor.md#editor-de-variações--v0414) e [Arranjo global](docs/mechanics/arrangement.md#arranjo-global-e-atribuições-por-peça--0210) |
| Globo e cidades | [Mapa](docs/mechanics/map.md#mapa-e-entrada-na-fase) |
| Admin e catálogos locais | [Admin](docs/mechanics/admin.md#admin-e-catálogos-locais--0810-v110) |
| Partidas simultâneas e retorno ao globo | [1v1 casual online](docs/mechanics/online.md#1v1-casual-online--0410-v100) |
| Perfil, pontuação e ovos | [Progresso](docs/mechanics/progression.md#progresso-e-ovos-dourados) |
| Páginas legais e links do login/globo | [Páginas públicas](docs/mechanics/public-pages.md#páginas-públicas-e-privacidade--0410) |
| Analytics de partidas | [Páginas públicas](docs/mechanics/public-pages.md#páginas-públicas-e-privacidade--0410) |
| Freeze, Shield e casas especiais | [Poderes da partida](docs/mechanics/powers.md#poderes-da-partida) |
| Processamento | [Gestos e custo](docs/mechanics/performance.md#gestos-e-custo-de-processamento) |

Localização do código e checks: `docs/CODEBASE_MAP.md`. Consulte as seções relacionadas ao pedido, incluindo suas prioridades; a agenda completa não é pré-requisito de toda alteração.

## Arquivos

Cada assunto vive em `docs/mechanics/`. Leia só o arquivo do assunto; ao mudar uma mecânica, atualize esse arquivo.

| Arquivo | Tamanho |
| --- | --- |
| [1v1 casual online](docs/mechanics/online.md) | 42 KB |
| [Admin e catálogos locais](docs/mechanics/admin.md) | 3 KB |
| [Páginas públicas, privacidade e analytics](docs/mechanics/public-pages.md) | 5 KB |
| [MIDI-only e persistência](docs/mechanics/midi-persistence.md) | 4 KB |
| [Escopo, dados e kits](docs/mechanics/scope-and-data.md) | 21 KB |
| [Progresso e ovos dourados](docs/mechanics/progression.md) | 16 KB |
| [Poderes da partida](docs/mechanics/powers.md) | 22 KB |
| [Ações, efeitos e movimento](docs/mechanics/actions-and-movement.md) | 11 KB |
| [Widgets da partida](docs/mechanics/widgets.md) | 47 KB |
| [Criativo e persistência](docs/mechanics/creative.md) | 3 KB |
| [Estados e Eventos](docs/mechanics/states-and-events.md) | 18 KB |
| [Mixer DJ na partida](docs/mechanics/mixer.md) | 7 KB |
| [Gestos e custo de processamento](docs/mechanics/performance.md) | 6 KB |
| [Mapa e entrada na fase](docs/mechanics/map.md) | 23 KB |
| [Manutenção, ideias e histórico](docs/mechanics/maintenance.md) | 7 KB |
| [Editor de variações](docs/mechanics/editor.md) | 12 KB |
| [Arranjo global e atribuições por peça](docs/mechanics/arrangement.md) | 13 KB |
