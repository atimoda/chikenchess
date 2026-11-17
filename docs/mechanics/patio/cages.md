# Pátio: Gaiolas (15/11, v2.11.0)

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). As almas (identidade, voo, ajudas, biblioteca) ficam em [souls.md](souls.md); o Passaguá como item em [items.md](items.md); os pintinhos em [../chicken/chicks.md](../chicken/chicks.md); os fios em [sky-and-power.md](sky-and-power.md).

Código: `lib/pigchicken/cages.ts` (estado, regras e contadores online; puro), `lib/pigchicken/cage-art.ts` (arte SVG e silhueta de cada modelo), `components/pigchicken/draw/cages.ts` (gaiolas penduradas, gaiola no chão, contadores e avatares), ganchos em `lib/pigchicken/combat.ts` (`cages`, `takeCage`, `cageForCatch`, `scareSweep`, `releaseSoul`, `callSouls`, `rotateCages`, `chickReleases`), `lib/chicken/chick-release.ts` (pintinho que volta ao bando). Testes: `tests/pigchicken-cages.cases.cjs`, `tests/pigchicken-souls.cases.cjs`, `tests/pigchicken-sky-power.cases.cjs` (espanto para o fio), `tests/chicken-touch.cases.cjs` (binds), `server/test/room.test.mjs` (mensagem `cages`).

As Gaiolas substituem a Bag of souls: as almas que o Passaguá captura ficam dentro da gaiola de quem capturou, e sem gaiola não se captura nada.

## Modelos

| Item | Nome | Limite no código |
| --- | --- | --- |
| `cage` | Gaiola básica | 8 |
| `cageWire` | Gaiola de arame | 12 |
| `cageConcorde` | Gaiola Concorde | 16 |
| `cageWood` | Gaiola de madeira | 20 |
| `cageArch` | Gaiolão arqueado | 30 |
| `cageFlight` | Voadeira | 50 |

- **Limite de almas:** de 1 a 99. A tabela mostra o valor do código; o padrão do jogo é o que o Salvar no game gravou em `data/pigchicken/default-items.json`, quando difere. O padrão de cada modelo é o parâmetro “Limite de almas” (`cageSouls`) do painel Itens. Um cavalete ou item solto do Modo editor pode ter o seu próprio limite ([editor.md](editor.md)). A gaiola guarda o limite com que nasceu: mudar o padrão vale para as próximas.
- **Painel Itens (16/11, v2.11.1):** a lista do topo tem uma entrada só, “Gaiolas”, no lugar dos seis modelos. Escolhida, o painel mostra os seis modelos um abaixo do outro, todos na mesma escala: a gaiola vazia, ao lado a mesma gaiola cheia até o limite e, embaixo, o controle do limite com o nome do modelo (1 a 99; duplo clique volta ao padrão do modelo). A gaiola cheia é a imagem que o Pátio desenha (`cagePic`), com almas de exemplo de ids 1 a N (`sampleSouls` em `lib/pigchicken/cages.ts`: pássaros de várias espécies, alguns mortos-vivos e um pintinho a cada sete), cada uma no lugar que o jogo dá a esse id; muda junto com o limite. O Padrão do topo volta os seis modelos de uma vez e o Salvar no game grava todos os itens, como antes. Componente: `components/pigchicken/cages-view.tsx`.
- **Categoria:** Gaiolas aparece na paleta do Modo editor, na lista de itens de cavalete, solto e Baú (grupo de sorteio “Uma gaiola”) e no painel Itens. Não é item de mão: não entra no inventário, não tem roda nem arremesso.
- **Ninguém começa com gaiola.** O Pátio padrão tem um cavalete de Gaiola básica no chão, perto da entrada (`rack-cage` em `defaultLayout`). Um Pátio padrão salvo antes (marcado como padrão no banco, layout até v7) recebe o cavalete uma vez ao ser carregado (layout v8); se o admin o tirar e salvar, ele não volta. Os outros Pátios só têm gaiolas se alguém as puser no Modo editor ou num Baú. O cavalete de gaiola já nasce com a primeira e repõe outra 20 s depois de levada (`CAGE_RACK_DELAY`; o tempo é o do cavalete, editável).

## Carregar gaiolas

- **Quantas:** até 3 por player (`CAGES_MAX`), cada uma com as suas almas. A primeira é a da frente (a ativa); as outras ficam atrás.
- **Pegar (com lugar):** tendo menos de 3, vale a regra dos outros itens: Usar/Pegar (ou Golpe) sobre uma gaiola no chão ou no cavalete a pega, e passar por cima dela com Pegar seguro (inclusive correndo, quando o Correr também pega) a pega sozinho. A primeira vira a da frente. Tendo alguma, a nova entra atrás e não é selecionada.
- **Com três (17/11, v2.13.0):** a gaiola do chão só é oferecida: fica destacada e o aviso diz “trocar”, os dois em cinza (o mesmo do “equipar” dos itens que ela já carrega; “pegar” continua azul). Passar por cima com Pegar seguro, correndo ou não, não faz nada, e Golpe também não troca. A troca pela gaiola da frente exige um aperto inteiro de Pegar em cima dela: o botão apertado e solto enquanto essa mesma gaiola é o item destacado. Um aperto que começou fora dela, ou que é solto depois de sair dela (mesmo voltando), não troca; outro aperto recomeça. Na troca, a que estava na frente cai ali com as almas dela (sem poder ser pega por 1,2 s). Vale para cada player local, com teclado, gamepad (o X, que também é Correr) e o botão Pegar do toque, em todos os cenários do Pátio. Código: `cageArm` e `grabReleased` (`FrameInput`) em `lib/pigchicken/combat.ts`; até 16/11 a troca saía no aperto e também ao passar com Pegar seguro.
- **No chão:** a gaiola guarda as almas. Quem pega leva as almas junto; elas passam a ser dele sem contar como captura nova na Biblioteca.
- **Trocar de Pátio:** as gaiolas atravessam com o player, na mesma ordem e com as almas dentro ([Troca de mundo](editor.md)); as do chão ficam no Pátio anterior.
- **Sair do jogo:** as gaiolas de um player local que sai caem onde ele estava, com o que têm dentro. Valem só durante a sessão; não são salvas.
- **Merecimento do Baú:** conta as almas de todas as gaiolas de quem abre ([chests.md](chests.md)).

## Na tela

- **As suas (primeiro player):** penduradas no canto superior esquerdo, abaixo da barra do topo. A da frente é grande; as outras duas ficam menores (55%), uma de cada lado, um pouco atrás dela. Embaixo de cada uma, “almas/limite”; a da frente tem o contorno na cor do player.
- **Balanço:** cada gaiola é um pêndulo empurrado pela aceleração da câmera, e leva um empurrãozinho quando uma alma entra ou sai. A gaiola fica para trás da câmera: quando a câmera começa a ir para um lado, ela balança primeiro para o outro (corrigido em 16/11, v2.11.1; antes ela acompanhava a câmera).
- **Entrada:** a gaiola recém-pegada entra balançando, vinda de fora do canto superior esquerdo, em 1,1 s (`CAGE_ENTER`); a secundária entra menor, por trás.
- **Brilho:** azul por 0,45 s quando ganha uma alma, vermelho quando solta uma (`CAGE_FLASH`).
- **Dentro:** cada alma é um desenho parado. Os pássaros ficam em pose de descanso, com a asa recolhida junto ao corpo (16/11, v2.11.1: `SOUL_REST` em `components/pigchicken/draw/soul-art.ts`, a mesma pose das almas pousadas pelo mapa; antes apareciam de asas abertas para cima), espalhados pela gaiola, cada um sempre no mesmo lugar (definido pelo id da alma); os mortos-vivos, cinza com o olho na cor. Os pintinhos ficam na base, com a aparência do pintinho capturado. A gaiola inteira com as almas é um bitmap refeito só quando o conteúdo muda.
- **No chão e no cavalete:** a mesma arte, menor, com “almas/limite” em cima.
- **Celular em pé:** o grupo fica na metade esquerda da tela.
- **Outros players locais:** à esquerda do avatar de cada um (canto superior direito), um contador por gaiola: a silhueta simplificada do modelo com o número de almas, a da frente acesa. Os mesmos brilhos azul e vermelho.

## Capturar

- **Gatilho:** Passaguá sobre pássaro vivo, pássaro morto-vivo, alma solta ou pintinho, com ao menos uma gaiola.
- **Efeito:** a alma faz o voo de abdução até a gaiola da frente e conta nela ao chegar. O lugar fica reservado desde a captura.
- **Gaiola cheia:** se a da frente não tem vaga, a primeira gaiola com vaga vem para a frente sozinha e recebe a alma.
- **Nenhuma vaga:** o que não cabe fica onde está (não é capturado nem espantado), as gaiolas tremem por 0,45 s (`CAGE_DENY`) e toca o som de negado. Num golpe sobre vários, entram os que cabem.
- **Gaiola que saiu no meio do voo:** a alma vai para outra gaiola do mesmo player com vaga; sem nenhuma, fica solta com ele (o pintinho volta ao bando).

## Sem gaiola: espantar

- **Gatilho:** Passaguá de um player sem nenhuma gaiola.
- **Pintinhos:** levam um empurrão para longe do golpe e para cima; não são capturados. Os de outro navegador não se mexem.
- **Pássaros (vivos e mortos-vivos voando):** são espantados com o mesmo voo rápido da abdução até um lugar livre, sorteado, de um fio de energia visível na tela, longe de quem espantou, e pousam ali. Sem fio à vista, vão para um ponto qualquer da tela longe do boneco. Continuam soltos, de ninguém, e podem ser capturados depois.
- **Almas soltas** não são afetadas.

## Soltar, trocar e chamar

- **Soltar:** clique ou toque na gaiola da frente, ou a bind “Soltar alma”. Sai a última alma que entrou naquela gaiola, uma por vez, e só dela; as outras gaiolas não são tocadas. O pássaro nasce onde a gaiola está na tela e voa com o dono ([souls.md](souls.md)).
- **Pintinho:** a “alma pintinho” solta volta a ser pintinho, com a mesma aparência, e entra no bando da primeira galinha deste navegador, caindo de onde a gaiola está.
- **Trocar:** clique ou toque numa gaiola de trás: ela troca de lugar com a da frente. A bind “Trocar de gaiola” traz a próxima para a frente (a da frente vai para o fim). Segurar “Soltar alma” por 0,4 s (`CAGE_HOLD`) com duas ou mais gaiolas também troca; nesse caso a alma só sai ao soltar a tecla antes disso.
- **Callback:** com a gaiola da frente vazia e almas do player soltas, ela mostra “Callback”; o clique (ou a bind) chama as almas de volta, uma a cada 0,2 s, primeiro para a da frente e depois para as outras. Voltam só as que cabem; se nenhuma cabe, as gaiolas tremem.
- **Qualquer ponteiro vale para qualquer gaiola** (o mouse solta as almas do player 2 clicando no contador dele). O clique não atira, não bica e não faz a galinha andar.

## Binds (15/11)

| Ação | Teclado primário | Teclado secundário | Gamepad |
| --- | --- | --- | --- |
| Soltar alma (segurar: trocar) | H | End | L3 |
| Trocar de gaiola | Y | Home | sem botão (L3 segurado) |

Detalhes e migração em [../chicken/controls.md](../chicken/controls.md).

## Avatares dos outros players

- **Na tela:** sobre a cabeça de cada outro player (local ou de outro navegador) que carrega gaiola, o avatar dele com os contadores em silhueta ao lado.
- **Fora da tela:** o avatar fica na borda da tela na direção onde o boneco está, com uma seta, tenha gaiola ou não; os contadores ficam do lado de dentro.
- **Players locais** (2 a 4) só ganham o avatar de borda; na tela, os contadores deles já estão ao lado do avatar do canto.

## No Pátio online

- **Enviado:** cada navegador manda as gaiolas das suas galinhas (`cages`: modelo, almas e limite de cada uma, até 3 por galinha e 4 galinhas) quando mudam, no máximo a cada 250 ms, e tudo de novo a cada 2 s. Os outros mostram os contadores e o brilho azul ou vermelho quando o número muda.
- **Servidor:** só repassa, conferindo tamanho e ritmo; avisa em `hello.caps.cages` que conhece a mensagem. Com um servidor antigo o navegador não a envia e os contadores dos outros não aparecem.
- **Não enviado:** as gaiolas no chão e nos cavaletes são de cada navegador (como os outros itens do chão); o conteúdo de cada gaiola (só o número vai) e o espanto dos pássaros vivos.

## Escopo

Pátio e Templo, todos os players locais e o Pátio online. A segunda parte (pássaros e almas que exploram o mapa e pousam em árvores, plataformas e objetos, e o poder de cagar) está em [Pássaros e almas que exploram](birds-explore.md).
