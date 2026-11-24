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
| Kits, migração, laboratório | [Criativo e persistência](docs/mechanics/creative.md), [Escopo](docs/mechanics/scope-and-data.md), [Revisões de kits](docs/mechanics/kit-revisions.md), [Kit Tango](docs/mechanics/kit-tango.md), [Kits World ballads](docs/mechanics/kit-ballads.md) , [Kits Blues, Jazz & Rock](docs/mechanics/kit-blues-jazz-rock.md), [Kits Brazilian](docs/mechanics/kit-brazilian.md) [Kits Africa Cult e World](docs/mechanics/kit-world-africa.md) e [Kit Marseille 1997](docs/mechanics/kit-marseille.md) |
| Schema 7, migração do arranjo e LPF L/S/N | [MIDI-only e persistência](docs/mechanics/midi-persistence.md) |
| Forma global, atribuições por peça e harmonia por compasso | [Arranjo global](docs/mechanics/arrangement.md) |
| Regras, transições e BPM | [Estados e Eventos](docs/mechanics/states-and-events.md) e [editor de regras](docs/mechanics/states-and-events-editor.md) |
| Piano roll, seções e slides | [Editor](docs/mechanics/editor.md) e [Arranjo global](docs/mechanics/arrangement.md) |
| Globo, cidades e popups | [Mapa](docs/mechanics/map.md) |
| Galinha: movimento, pulo, shocking jump, portais do globo | [Movimento da galinha](docs/mechanics/chicken/movement.md) |
| Galinha: paredes, teto e limites escaláveis, plataformas e fios por baixo, trocar e inverter de lado, Chocar agarrada, cair do grab por dano | [Paredes, teto e fios](docs/mechanics/chicken/climbing.md) |
| Galinha: controles, teclado, gamepad e Ajustes | [Controles da galinha](docs/mechanics/chicken/controls.md) |
| Galinha: controles de toque no celular (posição dos botões, deslizar entre botões, Correr com analógico, Throw ao soltar, avatar no canto, tela como mira, analógico de mira) | [Controles de toque](docs/mechanics/chicken/touch.md) |
| Pintinhos: espécie de ave menor, estilos de cor, bots que seguem a galinha, captura como almas e Pátio online | [Pintinhos](docs/mechanics/chicken/chicks.md) |
| Personagens Pig (porco) e Ken (raposa): raças do Vestiário, estilos, classe da espécie, desenho no esqueleto da galinha; painéis Personagem e Ajustes; limites do inventário por categoria | [Personagens](docs/mechanics/chicken/characters.md) |
| Pátio: mundo, limites e botão Sol, parallax, portais, árvores, trampolim, volume e desempenho | [Mundo do Pátio](docs/mechanics/patio/world.md) |
| Pátio: Vila dos Telhados, criador de casas, pisos das fachadas, entrar nas casas pela porta (cômodo, andares, fachada que esconde quem está dentro, tiros que ficam no cômodo) | [Vila e casas](docs/mechanics/patio/houses.md) |
| Pátio: espaço abaixo do chão, Salvar no game (Configurações do Pátio, Camadas, Câmera de Mira, Volume, Ajustes) ícones do cabeçalho dos painéis e botão de próximo item dos dropdowns | [Padrões do jogo](docs/mechanics/patio/game-defaults.md) |
| Pátio: modo editor, layout, chãos e paredes, Objeto duro, pares de portais, Item solto | [Editor do Pátio](docs/mechanics/patio/editor.md) |
| Pátio: Suportes de item (tempo e limite de reposição, contador, mesa como plataforma e pouso dos itens) | [Suportes de item](docs/mechanics/patio/racks.md) |
| Pátio: arrastar no Modo editor (Shift reto, qualquer zoom), zoom e panorama sobre elementos, camada de seleção presa à câmera | [Arraste e câmera no Modo editor](docs/mechanics/patio/editor-camera.md) |
| Pátio: Portais de nascimento (vários lugares para nascer, chance de cada um, sorteio ao entrar) | [Portais de nascimento](docs/mechanics/patio/spawn-portals.md) |
| Pátio: Grade de blocos do Campo minado (blocos fechados e abertos, bombas, vão, paredes, lado aberto e fechado, trocar de bloco) | [Grade de blocos](docs/mechanics/patio/mine-grid.md) |
| Pátio: rodada do Campo minado (gangorra de música e dano, bandeira, dúvida, bombas, Chave dourada, detonador, instalar bomba, Filhote, fim da rodada e títulos, rodada no online, Pátio de exemplo Campo minado) | [Rodada do Campo minado](docs/mechanics/patio/mine-round.md) |
| Pátio: salvar/abrir, Playgrounds, Destaques, Pátios de exemplo | [Lobbies do Pátio](docs/mechanics/patio/lobbies.md) |
| Pátio: instrumentos fixos (Harpa de pedais: sentar, tocar parada, duas mãos, dedos na tela, levantar; Bateria: peças, baquetas, atalhos, pedal do chimbal, rufo, editor do kit; Piano de cauda: Estrela sentada, dinâmica pelas binds, levantar com Golpe) | [Instrumentos fixos](docs/mechanics/patio/fixed-instruments.md) |
| Pátio: Baú do Modo editor (abrir por chave ou merecimento, itens com chance, raridade, Pátio online) e item Chave | [Baú e Chave](docs/mechanics/patio/chests.md) |
| Pátio: Quadro de lousa, fantasma de treino e o Pátio Training room | [Treino](docs/mechanics/patio/training.md) |
| Pátio: Arquipélago das Almas (Pátio de exemplo de faixas, inspirado em Deadlock: bases, três faixas de ilhas e fios, centro com prêmios e Baús de chave) | [Arquipélago das Almas](docs/mechanics/patio/arquipelago.md) |
| Pátio: céu e luz (hora, degradê, Randomize, contraluz), profundidade de cenário, postes e torres com fios, presos às camadas do fundo, pássaros nos fios, Pátio de exemplo | [Céu, postes e torres](docs/mechanics/patio/sky-and-power.md) |
| Pátio: aurora no céu (Configurações do Pátio → Aurora) | [Aurora](docs/mechanics/patio/aurora.md) |
| Pátio: brilho dos itens caídos no chão (Configurações do Pátio → Brilho dos itens: coluna de luz, contorno aceso, cor) | [Brilho dos itens](docs/mechanics/patio/item-glow.md) |
| Pátio: mata do fundo (Configurações do Pátio → Mata: Mata ao longe e Mata perto) | [Mata](docs/mechanics/patio/forest.md) |
| Pátio: prédios do fundo (Configurações do Pátio → Prédios: fileiras, modelos, data-centers) | [Prédios](docs/mechanics/patio/skyline.md) |
| Pátio: players, lobby, cores, chat e Pátio online | [Players e online](docs/mechanics/patio/players-and-online.md) |
| Pátio: itens, inventário, roda, consumíveis e explosões | [Itens](docs/mechanics/patio/items.md) |
| Pátio: alinhamento da barra do inventário (Separado, Centralizado, Esquerda, Direita) e trocas de item que repetem enquanto segura | [Barra do inventário](docs/mechanics/patio/inventory-bar.md) |
| Pátio: almas capturadas (identidade, raridade, abdução, soltar, bot amigo, Callback, ajudas e atrapalhos, Pátio online) | [Almas](docs/mechanics/patio/souls.md) |
| Pátio: Gaiolas (modelos e limite de almas, até três por player, captura, negação, espanto sem gaiola, soltar e trocar, contadores e avatares dos players, binds, Pátio online) | [Gaiolas](docs/mechanics/patio/cages.md) |
| Pátio: pássaros e almas que exploram o mapa, lugares de pouso (árvores, plataformas, telhados, objetos), fuga das almas soltas dos outros players, poder de cagar | [Pássaros e almas que exploram](docs/mechanics/patio/birds-explore.md) |
| Pátio: biblioteca de almas (catálogo fixo, receitas raras, desenho de cada alma, coleção no navegador e na conta, painel com Receita, Inspiration e som, editor de fichas para admin) | [Biblioteca de almas](docs/mechanics/patio/soul-library.md) |
| Pátio: Guia de pássaros (aves reais, a ave que inspira cada alma, cantos gravados e créditos, canto real das almas soltas) | [Guia de pássaros](docs/mechanics/patio/bird-guide.md) |
| Pátio: como a galinha segura itens: eixo de giro, boca, mãos das asas, Arco e Flecha e editor de pontos | [Itens na asa](docs/mechanics/patio/held-items.md) |
| Pátio: escalas dos instrumentos (primária, ciclo de quintas, tensão e resolução, Cordas soltas da harpa), troca de escala no inventário, editor de escalas e standby | [Escalas dos instrumentos](docs/mechanics/patio/instrument-scales.md) |
| Pátio: escala Estrela (12 notas numa estrela de hexágonos, eixo do trítono, realce da escala da zona, toque e arraste, RT analógico, dinâmica pelo movimento, acumulador no Correr: rajada, cascata, tercinas) | [Escala Estrela](docs/mechanics/patio/star-scale.md) |
| Pátio: Próxima variação (escala, tambor), os checkboxes “Incluir variações” das trocas de item, tambores e pentes das armas (na mira e em volta), a mira espacial dos instrumentos e itens e a Granada de pente infinito | [Variações dos itens](docs/mechanics/patio/item-variations.md) |
| Pátio: bicada, mira, arremesso e bonecos de treino | [Combate](docs/mechanics/patio/combat.md) |
| Pátio: recuo no ar ao atirar (Recuo no ar de cada arma e instrumento; sopros os mais fortes) | [Recuo no ar](docs/mechanics/patio/recoil.md) |
| Pátio: golpe rápido em quatro tempos, rastro, combo (direção, ângulo, duração, cooldown e alcance de cada golpe; golpe relativo à mira; barra da janela), interrupção e golpe com Atirar segurado | [Golpe e combo](docs/mechanics/patio/melee.md) |
| Pátio: armas de bastão (Taco, Passaguá): pose no corpo e editor, golpe rápido, golpe forte carregado, dano do Passaguá | [Armas de bastão](docs/mechanics/patio/staffs.md) |
| Pátio: Martelo de Thor e Cajado de Odin: choque em cadeia, estado de choque (raio-x), especial com intervalo no slot, arremesso que volta | [Armas de raio](docs/mechanics/patio/lightning.md) |
| Pátio: Boomerang (dois de uma vez) e baralhos de cartas explosivas (vermelho: dano físico; azul: nota guardada e harmonia): ordem, estacionar, estouro, cadeia, retorno | [Boomerang e baralhos](docs/mechanics/patio/boomerangs.md) |
| Pátio: Corrente-gancho (girar a corrente na carga, bolinha laranja de onde gruda, puxar a si até o cenário ou puxar alguém até você) | [Corrente-gancho](docs/mechanics/patio/hook.md) |
| Pátio: zumbis (perseguição, mordida e ronda quando a galinha está fora de alcance) | [Zumbis e hordas](docs/mechanics/patio/enemies.md) |
| Pátio: Templo do Gongo, fase de notas, mortes, pássaros e catálogo de aliens | [Templo](docs/mechanics/patio/temple.md) |
| Pátio: rebate, transformações, zonas sonoras, jukebox, editor de músicas, MIDI | [Músicas](docs/mechanics/patio/songs.md) |
| Pátio: fases de notas por zona (pedido, várias zonas ao mesmo tempo, recusa, meta de precisão e corações, parar), Jukebox, Vitrola toca-discos e Gongo como sequenciadores, Debug da fase de notas | [Fases de notas por zona](docs/mechanics/patio/note-stages.md) |
| Pátio: zonas (nome, gravidade dos planetas, câmera lenta e raio-x), camadas (olho), tags das zonas, música ambiente (drone e percussão), zonas das cenas, paredes com vida | [Zonas e camadas](docs/mechanics/patio/zones.md) |
| Pátio: ritmos das zonas: microtempo (swing) de cada ritmo, timbres gravados, variações, grade com notas arrastáveis, blocos de variação, knobs do painel | [Ritmos das zonas](docs/mechanics/patio/rhythms.md) |
| Admin e catálogos locais | [Admin](docs/mechanics/admin.md) |
| Online 1v1: salas, lobby e convites | [Lobby](docs/mechanics/online/lobby.md) |
| Online 1v1: partidas simultâneas e retorno ao globo | [Globo e recuperação](docs/mechanics/online/globe-and-recovery.md) |
| Online 1v1: contas, perfil e amigos | [Contas](docs/mechanics/online/accounts.md) |
| Online 1v1: partida, confirmação, análise e rede | [Partida online](docs/mechanics/online/match.md) |
| Perfil, pontuação e ovos | [Progresso](docs/mechanics/progression.md) |
| Copiar o histórico completo da partida para relatar bugs | [Match log](docs/mechanics/match-log.md) |
| Páginas legais, links do login/globo e analytics | [Páginas públicas](docs/mechanics/public-pages.md) |
| Freeze, Shield e casas especiais | [Poderes](docs/mechanics/powers.md) |
| Processamento | [Gestos e custo](docs/mechanics/performance.md) |
| Pátio: renderização (camadas que seguem a câmera, qualidade Baixíssima, recorte do cenário, canvas, mira, geometria) | [Renderização do Pátio](docs/mechanics/patio/rendering.md) |

Localização do código e checks: `docs/CODEBASE_MAP.md`. A agenda completa não é pré-requisito de toda alteração.

## Arquivos

| Arquivo | Tamanho |
| --- | --- |
| [Ações, efeitos e movimento](docs/mechanics/actions-and-movement.md) | 11 KB |
| [Admin e catálogos locais](docs/mechanics/admin.md) | 4 KB |
| [Arranjo global e atribuições por peça](docs/mechanics/arrangement.md) | 18 KB |
| [Galinha: controles, teclado, gamepad e ajustes](docs/mechanics/chicken/controls.md) | 30 KB |
| [Galinha: controles de toque](docs/mechanics/chicken/touch.md) | 11 KB |
| [Galinha: movimento, globo e portais](docs/mechanics/chicken/movement.md) | 26 KB |
| [Galinha: paredes, teto, plataformas por baixo e fios](docs/mechanics/chicken/climbing.md) | 17 KB |
| [Pintinhos: espécie, estilos, IA de seguir, captura e online](docs/mechanics/chicken/chicks.md) | 6 KB |
| [Personagens: Pig e Ken](docs/mechanics/chicken/characters.md) | 23 KB |
| [Criativo e persistência](docs/mechanics/creative.md) | 14 KB |
| [Editor de variações](docs/mechanics/editor.md) | 15 KB |
| [Kits: revisões e reconstruções por campanha](docs/mechanics/kit-revisions.md) | 29 KB |
| [Kit Tango — Buenos Aires 1913](docs/mechanics/kit-tango.md) | 6 KB |
| [Kits World ballads — Manchester, Dublin, New Orleans, Memphis e London](docs/mechanics/kit-ballads.md) | 7 KB |
| [Kits Blues, Jazz & Rock](docs/mechanics/kit-blues-jazz-rock.md) | 6 KB |
| [Kits Brazilian — formato por seção, os doze kits](docs/mechanics/kit-brazilian.md) | 9 KB |
| [Kits Africa Cult e World — formato por seção, 29 kits](docs/mechanics/kit-world-africa.md) | 12 KB |
| [Kit Marseille 1997 — clássico sampleado sobre hip hop](docs/mechanics/kit-marseille.md) | 5 KB |
| [Manutenção, ideias e histórico](docs/mechanics/maintenance.md) | 7 KB |
| [Mapa, globo e popups das cidades](docs/mechanics/map.md) | 27 KB |
| [Cabeçalho, barra de chance e abertura da partida](docs/mechanics/match-header-and-intro.md) | 5 KB |
| [Histórico completo da partida (Match log)](docs/mechanics/match-log.md) | 5 KB |
| [MIDI-only e persistência](docs/mechanics/midi-persistence.md) | 5 KB |
| [Mixer DJ na partida](docs/mechanics/mixer.md) | 7 KB |
| [Online 1v1: contas, perfil, amigos e nomes](docs/mechanics/online/accounts.md) | 9 KB |
| [Online 1v1: partidas simultâneas, globo, salas recentes e indisponibilidade](docs/mechanics/online/globe-and-recovery.md) | 8 KB |
| [Online 1v1: salas, lobby, convites e popup](docs/mechanics/online/lobby.md) | 14 KB |
| [Online 1v1: partida, confirmação, análise, áudio e rede](docs/mechanics/online/match.md) | 14 KB |
| [Pátio: combate, mira, bicada e arremesso](docs/mechanics/patio/combat.md) | 24 KB |
| [Pátio: recuo no ar ao atirar](docs/mechanics/patio/recoil.md) | 2 KB |
| [Pátio: golpe e combo](docs/mechanics/patio/melee.md) | 11 KB |
| [Pátio: armas de bastão](docs/mechanics/patio/staffs.md) | 7 KB |
| [Pátio: armas de raio e estado de choque](docs/mechanics/patio/lightning.md) | 9 KB |
| [Pátio: Boomerang e baralhos de cartas](docs/mechanics/patio/boomerangs.md) | 8 KB |
| [Pátio: zumbis e hordas](docs/mechanics/patio/enemies.md) | 2 KB |
| [Pátio: modo editor e layout](docs/mechanics/patio/editor.md) | 21 KB |
| [Pátio: Portais de nascimento](docs/mechanics/patio/spawn-portals.md) | 4 KB |
| [Pátio: Grade de blocos](docs/mechanics/patio/mine-grid.md) | 7 KB |
| [Pátio: Rodada do Campo minado](docs/mechanics/patio/mine-round.md) | 11 KB |
| [Pátio: salvar/abrir, Playgrounds, Destaques](docs/mechanics/patio/lobbies.md) | 10 KB |
| [Pátio: Baú e Chave](docs/mechanics/patio/chests.md) | 6 KB |
| [Pátio: Suportes de item](docs/mechanics/patio/racks.md) | 4 KB |
| [Pátio: instrumentos fixos](docs/mechanics/patio/fixed-instruments.md) | 22 KB |
| [Pátio: Quadro de lousa, fantasma e Training room](docs/mechanics/patio/training.md) | 4 KB |
| [Pátio: Arquipélago das Almas](docs/mechanics/patio/arquipelago.md) | 6 KB |
| [Pátio: padrões do jogo e painéis de configuração](docs/mechanics/patio/game-defaults.md) | 7 KB |
| [Pátio: brilho dos itens](docs/mechanics/patio/item-glow.md) | 2 KB |
| [Pátio: itens, inventário e consumíveis](docs/mechanics/patio/items.md) | 28 KB |
| [Pátio: barra do inventário e trocas que repetem](docs/mechanics/patio/inventory-bar.md) | 4 KB |
| [Pátio: almas capturadas](docs/mechanics/patio/souls.md) | 23 KB |
| [Pátio: Gaiolas](docs/mechanics/patio/cages.md) | 9 KB |
| [Pátio: pássaros e almas que exploram, fuga, cagar](docs/mechanics/patio/birds-explore.md) | 10 KB |
| [Pátio: biblioteca de almas](docs/mechanics/patio/soul-library.md) | 14 KB |
| [Pátio: Guia de pássaros](docs/mechanics/patio/bird-guide.md) | 6 KB |
| [Pátio: escalas dos instrumentos](docs/mechanics/patio/instrument-scales.md) | 27 KB |
| [Pátio: escala Estrela](docs/mechanics/patio/star-scale.md) | 7 KB |
| [Pátio: Próxima variação, variações nas trocas e tambores](docs/mechanics/patio/item-variations.md) | 7 KB |
| [Pátio: players, lobby, chat e online](docs/mechanics/patio/players-and-online.md) | 17 KB |
| [Pátio: rebate, zonas sonoras, jukebox e músicas](docs/mechanics/patio/songs.md) | 20 KB |
| [Pátio: zonas sonoras, camadas e música ambiente](docs/mechanics/patio/zones.md) | 17 KB |
| [Pátio: ritmos das zonas (microtempo, timbres, variações e blocos)](docs/mechanics/patio/rhythms.md) | 10 KB |
| [Pátio: Templo do Gongo, fase de notas, mortes e catálogo de aliens](docs/mechanics/patio/temple.md) | 17 KB |
| [Pátio: mundo, cenário, portais, árvores e trampolim](docs/mechanics/patio/world.md) | 24 KB |
| [Pátio: Vila dos Telhados, casas e interior](docs/mechanics/patio/houses.md) | 14 KB |
| [Gestos e custo de processamento](docs/mechanics/performance.md) | 23 KB |
| [Pátio: renderização e qualidade Baixíssima](docs/mechanics/patio/rendering.md) | 10 KB |
| [Poderes da partida](docs/mechanics/powers.md) | 25 KB |
| [Progresso e ovos dourados](docs/mechanics/progression.md) | 28 KB |
| [Páginas públicas, privacidade e analytics](docs/mechanics/public-pages.md) | 5 KB |
| [Escopo, dados e kits](docs/mechanics/scope-and-data.md) | 18 KB |
| [Estados e Eventos: editor no Criativo](docs/mechanics/states-and-events-editor.md) | 20 KB |
| [Estados e Eventos](docs/mechanics/states-and-events.md) | 9 KB |
| [Widgets: análise, Stockfish, Best/Worst e bots](docs/mechanics/widgets/analysis-and-bots.md) | 18 KB |
| [Widgets: tabuleiro, layout, cabeçalho e Debug](docs/mechanics/widgets/board-and-layout.md) | 20 KB |
| [Widgets: Piece Params, Mixer, Spectrogram e knobs](docs/mechanics/widgets/piece-params.md) | 28 KB |
| [Widgets: parâmetros All / Section / Note](docs/mechanics/widgets/params-scopes.md) | 5 KB |
