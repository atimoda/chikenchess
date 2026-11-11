# ChickenChess — mecânica em funcionamento

Índice. Leia só o arquivo do assunto (cada um tem até ~30 KB); ao mudar uma mecânica, atualize esse arquivo. Se um arquivo passar de ~30 KB, divida-o por subassunto e atualize esta tabela.

## Leitura por assunto

| Assunto | Arquivo |
| --- | --- |
| Ativação, captura, cheque, pausa e gesto | [Ações e movimento](docs/mechanics/actions-and-movement.md) |
| Piece/Board Params, Mixer DJ e knobs | [Piece Params](docs/mechanics/widgets/piece-params.md), [All / Section / Note](docs/mechanics/widgets/params-scopes.md), [Mixer](docs/mechanics/mixer.md) e [Chance de tocar](docs/mechanics/actions-and-movement.md) |
| Tabuleiro, layout, cabeçalho, Debug e widgets flutuantes | [Tabuleiro e layout](docs/mechanics/widgets/board-and-layout.md) |
| Análise, Stockfish, Best/Worst e bots | [Análise e bots](docs/mechanics/widgets/analysis-and-bots.md) |
| Barra de chance, abertura e apresentação da partida | [Cabeçalho e abertura](docs/mechanics/match-header-and-intro.md) |
| Kits, migração, laboratório | [Criativo e persistência](docs/mechanics/creative.md), [Escopo](docs/mechanics/scope-and-data.md), [Revisões de kits](docs/mechanics/kit-revisions.md), [Kit Tango](docs/mechanics/kit-tango.md) e [Kits World ballads](docs/mechanics/kit-ballads.md) |
| Schema 7, migração do arranjo e LPF L/S/N | [MIDI-only e persistência](docs/mechanics/midi-persistence.md) |
| Forma global, atribuições por peça e harmonia por compasso | [Arranjo global](docs/mechanics/arrangement.md) |
| Regras, transições e BPM | [Estados e Eventos](docs/mechanics/states-and-events.md) e [editor de regras](docs/mechanics/states-and-events-editor.md) |
| Piano roll, seções e slides | [Editor](docs/mechanics/editor.md) e [Arranjo global](docs/mechanics/arrangement.md) |
| Globo, cidades e popups | [Mapa](docs/mechanics/map.md) |
| Galinha: movimento, paredes, teto e limites escaláveis, pulo, portais do globo | [Movimento da galinha](docs/mechanics/chicken/movement.md) |
| Galinha: controles, teclado, gamepad, toque e Ajustes | [Controles da galinha](docs/mechanics/chicken/controls.md) |
| Pintinhos: espécie de ave menor, estilos de cor, bots que seguem a galinha e captura como almas | [Pintinhos](docs/mechanics/chicken/chicks.md) |
| Pátio: mundo, limites e botão Sol, parallax, portais, Vila, árvores, trampolim, volume e desempenho | [Mundo do Pátio](docs/mechanics/patio/world.md) |
| Pátio: modo editor, layout, chãos e paredes, Objeto duro, pares de portais, salvar/abrir | [Editor do Pátio](docs/mechanics/patio/editor.md) |
| Pátio: céu e luz (hora, degradê, Randomize, contraluz), profundidade de cenário, postes e torres com fios, pássaros nos fios, Pátio de exemplo | [Céu, postes e torres](docs/mechanics/patio/sky-and-power.md) |
| Pátio: players, lobby, cores, chat e Pátio online | [Players e online](docs/mechanics/patio/players-and-online.md) |
| Pátio: itens, inventário, roda, consumíveis e explosões | [Itens](docs/mechanics/patio/items.md) |
| Pátio: almas capturadas (identidade, raridade, cesto, contador e abdução) | [Almas](docs/mechanics/patio/souls.md) |
| Pátio: como a galinha segura itens: eixo de giro, boca, mãos das asas e editor de pontos | [Itens na asa](docs/mechanics/patio/held-items.md) |
| Pátio: escalas dos instrumentos (primária, ciclo de quintas, tensão e resolução) e troca de escala no inventário | [Escalas dos instrumentos](docs/mechanics/patio/instrument-scales.md) |
| Pátio: golpe, bicada, mira, arremesso e bonecos de treino | [Combate](docs/mechanics/patio/combat.md) |
| Pátio: Templo do Gongo, fase de notas, mortes, pássaros e catálogo de aliens | [Templo](docs/mechanics/patio/temple.md) |
| Pátio: rebate, transformações, zonas sonoras, jukebox, editor de músicas, MIDI | [Músicas](docs/mechanics/patio/songs.md) |
| Pátio: camadas (olho), tags das zonas, música ambiente (drone e percussão), zonas das cenas, paredes com vida | [Zonas e camadas](docs/mechanics/patio/zones.md) |
| Admin e catálogos locais | [Admin](docs/mechanics/admin.md) |
| Online 1v1: salas, lobby e convites | [Lobby](docs/mechanics/online/lobby.md) |
| Online 1v1: partidas simultâneas e retorno ao globo | [Globo e recuperação](docs/mechanics/online/globe-and-recovery.md) |
| Online 1v1: contas, perfil e amigos | [Contas](docs/mechanics/online/accounts.md) |
| Online 1v1: partida, confirmação, análise e rede | [Partida online](docs/mechanics/online/match.md) |
| Perfil, pontuação e ovos | [Progresso](docs/mechanics/progression.md) |
| Páginas legais, links do login/globo e analytics | [Páginas públicas](docs/mechanics/public-pages.md) |
| Freeze, Shield e casas especiais | [Poderes](docs/mechanics/powers.md) |
| Processamento | [Gestos e custo](docs/mechanics/performance.md) |

Localização do código e checks: `docs/CODEBASE_MAP.md`. A agenda completa não é pré-requisito de toda alteração.

## Arquivos

| Arquivo | Tamanho |
| --- | --- |
| [Ações, efeitos e movimento](docs/mechanics/actions-and-movement.md) | 11 KB |
| [Admin e catálogos locais](docs/mechanics/admin.md) | 4 KB |
| [Arranjo global e atribuições por peça](docs/mechanics/arrangement.md) | 18 KB |
| [Galinha: controles, teclado, gamepad e ajustes](docs/mechanics/chicken/controls.md) | 24 KB |
| [Galinha: movimento, globo e portais](docs/mechanics/chicken/movement.md) | 28 KB |
| [Pintinhos: espécie, estilos, IA de seguir e captura](docs/mechanics/chicken/chicks.md) | 4 KB |
| [Criativo e persistência](docs/mechanics/creative.md) | 14 KB |
| [Editor de variações](docs/mechanics/editor.md) | 15 KB |
| [Kits: revisões e reconstruções por campanha](docs/mechanics/kit-revisions.md) | 29 KB |
| [Kit Tango — Buenos Aires 1913](docs/mechanics/kit-tango.md) | 6 KB |
| [Kits World ballads — Manchester, Dublin, New Orleans, Memphis e London](docs/mechanics/kit-ballads.md) | 7 KB |
| [Manutenção, ideias e histórico](docs/mechanics/maintenance.md) | 7 KB |
| [Mapa, globo e popups das cidades](docs/mechanics/map.md) | 27 KB |
| [Cabeçalho, barra de chance e abertura da partida](docs/mechanics/match-header-and-intro.md) | 5 KB |
| [MIDI-only e persistência](docs/mechanics/midi-persistence.md) | 5 KB |
| [Mixer DJ na partida](docs/mechanics/mixer.md) | 7 KB |
| [Online 1v1: contas, perfil, amigos e nomes](docs/mechanics/online/accounts.md) | 9 KB |
| [Online 1v1: partidas simultâneas, globo, salas recentes e indisponibilidade](docs/mechanics/online/globe-and-recovery.md) | 8 KB |
| [Online 1v1: salas, lobby, convites e popup](docs/mechanics/online/lobby.md) | 14 KB |
| [Online 1v1: partida, confirmação, análise, áudio e rede](docs/mechanics/online/match.md) | 14 KB |
| [Pátio: combate, mira, golpe, bicada e arremesso](docs/mechanics/patio/combat.md) | 29 KB |
| [Pátio: modo editor, layout e salvar/abrir](docs/mechanics/patio/editor.md) | 17 KB |
| [Pátio: itens, inventário e consumíveis](docs/mechanics/patio/items.md) | 28 KB |
| [Pátio: almas capturadas](docs/mechanics/patio/souls.md) | 5 KB |
| [Pátio: escalas dos instrumentos](docs/mechanics/patio/instrument-scales.md) | 5 KB |
| [Pátio: players, lobby, chat e online](docs/mechanics/patio/players-and-online.md) | 12 KB |
| [Pátio: rebate, zonas sonoras, jukebox e músicas](docs/mechanics/patio/songs.md) | 20 KB |
| [Pátio: zonas sonoras, camadas e música ambiente](docs/mechanics/patio/zones.md) | 10 KB |
| [Pátio: Templo do Gongo, fase de notas, mortes e catálogo de aliens](docs/mechanics/patio/temple.md) | 17 KB |
| [Pátio: mundo, cenário, portais, Vila, árvores e trampolim](docs/mechanics/patio/world.md) | 25 KB |
| [Gestos e custo de processamento](docs/mechanics/performance.md) | 21 KB |
| [Poderes da partida](docs/mechanics/powers.md) | 25 KB |
| [Progresso e ovos dourados](docs/mechanics/progression.md) | 27 KB |
| [Páginas públicas, privacidade e analytics](docs/mechanics/public-pages.md) | 5 KB |
| [Escopo, dados e kits](docs/mechanics/scope-and-data.md) | 18 KB |
| [Estados e Eventos: editor no Criativo](docs/mechanics/states-and-events-editor.md) | 20 KB |
| [Estados e Eventos](docs/mechanics/states-and-events.md) | 9 KB |
| [Widgets: análise, Stockfish, Best/Worst e bots](docs/mechanics/widgets/analysis-and-bots.md) | 18 KB |
| [Widgets: tabuleiro, layout, cabeçalho e Debug](docs/mechanics/widgets/board-and-layout.md) | 20 KB |
| [Widgets: Piece Params, Mixer, Spectrogram e knobs](docs/mechanics/widgets/piece-params.md) | 28 KB |
| [Widgets: parâmetros All / Section / Note](docs/mechanics/widgets/params-scopes.md) | 5 KB |
