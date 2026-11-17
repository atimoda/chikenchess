# Pátio: almas capturadas

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). O Passaguá como item fica em [items.md](items.md); as mortes dos aliens e os pássaros em [temple.md](temple.md); os pintinhos em [../chicken/chicks.md](../chicken/chicks.md); o pouso e a fuga dos pássaros nos fios em [sky-and-power.md](sky-and-power.md); o catálogo, o desenho de cada alma, a coleção e o painel em [soul-library.md](soul-library.md).

Código: `lib/pigchicken/souls.ts` (identidade, raridade, abdução; puro), `lib/pigchicken/soul-follow.ts` (voo do bot amigo, ficha de parâmetros e classes; puro), `lib/pigchicken/soul-acts.ts` (ajudas e atrapalhos: ficha de ações, classes, relógio; puro), ganchos em `lib/pigchicken/combat.ts` (`markSoul`, `convert`, `spawnUndead`, `strike`, Bag of souls por player, `releaseSoul`, `callSouls`, `freedSouls`, `soulActs`, `soulJobStep`, `aimSkew`, `detune`), Bag of souls em `drawBagOfSouls`/`bagOfSoulsBox` (`components/pigchicken/draw/hud.ts`), voo até a Bag of souls e almas soltas em `components/pigchicken/draw/souls.ts`, clique na Bag of souls em `components/pigchicken/parquinho.tsx` (`onBagDown`). Testes: `tests/pigchicken-souls.cases.cjs`, `tests/pigchicken-soul-follow.cases.cjs` e `tests/pigchicken-soul-acts.cases.cjs`.

## Identidade da alma (10/11, v2.7.0)

Todo pássaro capturado pelo Passaguá vira uma alma (`Soul`) que guarda de onde veio. Esses eixos decidem qual entrada da biblioteca ela é ([soul-library.md](soul-library.md)), e a entrada dá o desenho, a classe de voo e as ações da alma solta. O atrapalho da alma lê ainda a arma da morte e o tipo de nota (abaixo).

| Eixo | Valores | De onde sai |
| --- | --- | --- |
| Espécie | Horda (alien das fileiras), Água-viva, Lanterna, Casco, Gêmeos, Mini, Tambor, Dragão (a cabeça conta como Dragão), Pintinho | Dados do alien (`soulSpecies`); o pintinho vem da captura do bando |
| Estado | Viva: a harmonia encheu (morte musical). Morta: morte física, depois ressuscitada por notas | `convert` (viva) e o pássaro morto-vivo (morta) |
| Classe do projétil | Sopro (Flauta, Sax, Trompete), Cordas (Violão, Violino, Harpa de Lira, Harpa), Teclas (Teclado), Percussão (Pandeiro), Rebate (nota de alien rebatida por um golpe) | O instrumento da última nota que entrou na barra antes de ela encher (`shotClass`); sem o item (golpe vindo de outro navegador), vale a voz da nota |
| Tipo de nota | Tônica; Consonante (terça maior ou menor, quinta); Tensão (as outras notas da escala); Sensível (sétima, maior ou menor); Fora da escala (nota que a escala não tem, ou desviada mais de 0,2 semitom) | A mesma última nota, medida no tom e na escala da zona naquele instante (`noteClass`) |
| Arma da morte (só Morta) | Explosão (qualquer explosão), Bala (Pistola, SMG, Rifle, Escopeta, Sniper), Flecha (Arco), Impacto (Taco, golpe de qualquer item, Asa, Bicada, item arremessado) | O golpe que zerou a vida do alien (`weaponClass`); desconhecida conta como Impacto |

- **Sem origem conhecida:** pintinhos não têm classe de projétil nem tipo de nota. Um pássaro que nasceu sem esses dados (por exemplo vindo de outro navegador) fica com eles vazios e a espécie Horda.
- **Raridade** (`soulRarity`): cada eixo soma pontos (Dragão 3, Lanterna 1, Gêmeos 1; Tensão 1, Sensível 2, Fora da escala 3; Morta 1). 0 comum, 1 incomum, 2 a 4 rara, 5 ou mais lendária. Os pesos ficam em `RARITY_POINTS`/`RARITY_AT`.
- **Cor:** a alma viva guarda a cor do alien; a morta, a cor da nota que a ressuscitou (a dos olhos); o pintinho, amarelo. Ela guarda também o tipo de pássaro em que voava, mas depois de capturada é desenhada como a sua entrada da biblioteca.

## Gaiolas (15/11, v2.11.0; antes Bag of souls)

- As almas capturadas ficam nas **Gaiolas** de quem capturou: até três por player, cada uma com o seu limite e a sua pilha (a última alma que entrou é a primeira a sair). Sem gaiola o Passaguá não captura: empurra os pintinhos e espanta os pássaros. Regras, aparência, binds e online em [cages.md](cages.md).
- A Bag of souls (o círculo com o número ao lado do avatar, de 10/11 a 14/11) deixou de existir. No código, `combat.bagOfSouls` são as almas da gaiola da frente e `combat.capturedSouls`, as de todas as gaiolas do player.
- **Merecimento:** um Baú pode pedir um mínimo de almas nas gaiolas de quem o abre; elas continuam lá ([chests.md](chests.md)).

## Abdução (10/11, v2.7.0)

- **Gatilho:** o Passaguá acerta um pássaro vivo, um pássaro morto-vivo ou um pintinho (as mesmas regras de alcance de antes).
- **Efeito:** o pássaro some do mundo numa nuvem e a alma voa em curva até a gaiola de quem capturou que tem vaga (a da frente primeiro): sobe primeiro, acelera e encolhe, com brilho e rastro na cor dela, em 0,55 s (`ABDUCT_TIME`). Várias capturadas no mesmo golpe saem uma atrás da outra, a cada 0,08 s (`ABDUCT_GAP`). O texto “+N almas” não aparece mais; a primeira captura de cada entrada da biblioteca mostra o nome dela ([soul-library.md](soul-library.md)).
- **Contagem:** a alma entra na gaiola, e o número sobe, só quando chega a ela; a gaiola brilha azul por 0,45 s.
- **Câmera:** o ponto de partida é do mundo e o de chegada é da tela, então o voo acompanha a câmera e o zoom enquanto dura.
- **Cancelamento:** não há. Se a gaiola de destino deixou o player no meio do voo, a alma vai para outra gaiola dele com vaga ou fica solta com ele.
- **Escopo:** Pátio e Templo, todos os players locais (cada um com as suas gaiolas). No Pátio online cada navegador vê só o voo das próprias capturas; os contadores das gaiolas aparecem para todos.

## Soltar pela gaiola (10/11, v2.7.0; gaiolas desde 15/11)

- **Gatilho:** clique ou toque na gaiola da frente de um player com almas nela, ou a bind “Soltar alma” (H, End, L3). Qualquer ponteiro vale para qualquer gaiola (o mouse solta as almas do player 2 clicando no contador dele). O clique não atira, não bica e não faz a galinha andar. Não vale com a tecla de câmera segurada nem com um painel por cima.
- **Efeito:** sai a última alma que entrou na gaiola da frente (`combat.releaseSoul`), uma por clique, só dela. Ela nasce pequena no ponto do mundo que está embaixo da gaiola naquele instante, cresce em 0,35 s e voa para o seu lugar perto do dono. O número desce na hora e a gaiola brilha vermelho. Uma alma pintinho não vira pássaro: volta a ser pintinho do bando ([cages.md](cages.md#soltar-trocar-e-chamar)).
- **Aparência:** o desenho da entrada dela na biblioteca (forma pela família do instrumento; a morta, cinza com o olho na cor), com um brilho redondo na cor da alma. Com mais de um player local, um anel na cor do dono em volta de cada uma.
- **Mouse em cima:** quando um clique faria algo (gaiola da frente com almas, Callback, ou uma gaiola de trás, que troca de lugar com a da frente), a mira some e o cursor vira o de botão.
- **Escopo:** Pátio e Templo, todos os players locais. As almas soltas valem só na sessão. No Pátio online aparecem para todos os navegadores ([abaixo](#no-pátio-online-1111-v280)).

## Bot amigo (10/11, v2.7.0)

A alma solta voa junto do dono (`soulFollowStep`, uma vez por quadro, para as almas de todos os players locais).

- **Lugar:** ao lado do dono, a `dist` px para um lado, e acima dele: altura 0 é a cabeça, altura 1 é o topo do céu que a câmera mostra (60 px abaixo dele). Cada alma tem um jeito próprio por cima da classe: distância de 0,8 a 1,25 vezes e altura 0,1 para mais ou para menos.
- **Descanso:** o lugar fica parado no mundo enquanto o dono anda por perto. Ali a alma faz o seu padrão, vagueia um pouco (inquietação) e, se a classe tiver, dá uma voltinha de tempos em tempos. Quieta, ela olha para o dono.
- **Seguir:** quando o dono fica a mais que a `folga` do lugar, e depois da `reação`, o lugar passa a acompanhar o dono e a alma voa até ele na sua velocidade, freando ao chegar; a menos de 28 px ela descansa de novo. Lado “qualquer”: ela fica do lado em que já está.
- **Ficou para trás:** além da folga, ela voa mais rápido, até 3 vezes a velocidade (1 vez a mais a cada 250 px). A mais de 2600 px (portal, Templo), ela entra pela lateral, a 900 px do lugar.
- **Paredes:** o lugar nunca fica a menos de 40 px das paredes do mundo; se cairia fora, vai para o outro lado do dono.
- **Sem amontoar:** dois lugares a menos de 64 px um do outro se afastam aos poucos (até 140 px de desvio para cada alma), e cada alma guarda o desvio.
- **Dono saiu do jogo:** as almas soltas dele sobem e vão embora em 5 s.
- **Explorar (15/11):** depois de um tempo em descanso a alma sai para pousar num fio, numa árvore, numa plataforma ou num objeto perto do dono, descansa lá e volta; enquanto está fora, o bot amigo não a move. Regras, parâmetros (`roam`, `roamRange`, `perchTime` e os gostos por lugar) e valores por classe em [Pássaros e almas que exploram](birds-explore.md#almas-soltas-que-exploram).
- **Fugir dos outros players:** a alma se afasta de quem não é o dono e pode largar o lugar onde pousou. Regras e parâmetros (`alert`, `flee`) em [Pássaros e almas que exploram](birds-explore.md#almas-soltas-que-fogem-dos-outros-players).

Ficha de parâmetros (`SoulFollowParams`; limites em `SOUL_FOLLOW_RANGES`). Os números de cada alma se editam no editor de fichas da Biblioteca de almas, só para admin ([soul-library.md](soul-library.md)); os das classes ficam no código.

| Parâmetro | Faixa | O que faz |
| --- | --- | --- |
| `dist` | 20 a 600 px | Distância lateral do lugar (na órbita, o raio) |
| `height` | 0 a 1 | Altura do lugar, da cabeça ao topo do céu |
| `leash` (folga) | 0 a 1500 px | Quanto o dono se afasta do lugar antes de ela seguir |
| `speed` | 60 a 600 px/s | Velocidade de voo |
| `accel` | 0,5 a 10 | Quão rápido pega velocidade e quão tarde freia |
| `react` | 0 a 2 s | Demora para notar que o dono saiu |
| `side` | atrás, na frente, qualquer | De que lado do dono fica |
| `pattern` | parada, círculo, oito, vai e vem, zigue-zague, órbita no dono, saltos na batida | O que faz no lugar |
| `patternSize` | 0 a 300 px | Largura do padrão |
| `patternTime` | 0,5 a 12 s | Duração de uma volta do padrão |
| `loopEvery` | 0 a 30 s | Intervalo das voltinhas no descanso (0: nunca) |
| `restless` | 0 a 1 | Quanto vagueia em volta do lugar |

Classes (`SOUL_CLASSES`). A alma voa na classe da sua entrada da biblioteca: a da família do instrumento (`soulClassOf`), ou a própria de uma rara:

| Classe | Alma | dist | altura | folga | velocidade | No lugar |
| --- | --- | --- | --- | --- | --- | --- |
| Sentinela | Sopro, e alma sem classe de projétil | 220 | 0,7 | 450 | 260 | Parada, voltinha a cada 8 s |
| Patrulheira | Cordas | 160 | 0,5 | 300 | 300 | Oito de 110 px em 5 s |
| Escolta | Teclas | 70 | 0,05 | 80 | 420 | Órbita em volta da cabeça do dono, 2,6 s por volta; reage em 0,1 s |
| Ritmada | Percussão | 180 | 0,5 | 250 | 320 | Um salto para o outro lado a cada batida da música |
| Preguiçosa | Rebate | 300 | 0,6 | 1100 | 200 | Parada; demora 1,2 s para notar |
| Pintinho | Espécie Pintinho | 80 | 0,08 | 160 | 300 | Vai e vem curto, inquieta |

## Portais (15/11, v2.11.0)

- **Gatilho:** o dono entra em qualquer portal (par de portais, portal para outro Pátio, portal de entrada numa troca de Pátio, volta ao globo). O Parquinho informa a cada quadro quem está num portal (`engine.getPortalTransit` → `combat.setSoulPortals`).
- **Efeito:** as almas soltas dele (não as que estão nas gaiolas) largam o que faziam, deixam de estar chamadas de volta e são sugadas junto: cada uma voa de onde estava até o centro do portal e encolhe até sumir, no mesmo tempo e curva do boneco (950 ms). Lá dentro não aparecem, não agem, não podem ser capturadas nem chamadas.
- **Saída:** quando o dono surge de um portal, elas saem do centro dele, pequenas como ao sair da gaiola, e voltam a segui-lo. Num par de portais é o outro portal; numa troca de Pátio é o portal de entrada do Pátio novo (elas atravessam como almas soltas, não entram na Bag of souls).
- **Cancelamento:** se a entrada é desfeita sem chegada (o Pátio de destino não existe mais), reaparecem junto do dono.
- **Online:** os outros navegadores veem o boneco sendo sugado para o portal (`components/chicken/online-chickens.tsx`: no estado `portal` o navegador dele envia a posição do portal e os outros tocam a mesma animação; em `portalArrival`, a de chegada; o nome some enquanto ele está dentro) e as almas dele encolhendo até o portal: o tamanho viaja como sexto valor de cada alma em `souls` (`[id, x, y, face, who?, k?]`, `lib/pigchicken/net-souls.ts`), só enquanto é menor que 1. Uma cópia que some já encolhida não solta a nuvenzinha.
- **Escopo:** Pátio e Templo, local e online, todos os players locais.

## Callback (10/11, v2.7.0)

- **Gatilho:** com a gaiola da frente vazia e ao menos uma alma do player solta, ela mostra “Callback” preenchido na cor do player. Um clique ou toque nela, ou a bind “Soltar alma”, chama as almas (`combat.callSouls`).
- **Efeito:** as almas soltas daquele player que ainda cabem nas gaiolas dele voltam (para a da frente primeiro), uma a cada 0,2 s (`CALLBACK_GAP`), da mais perto do boneco para a mais longe (distância medida no instante do clique). Cada uma faz o mesmo voo da abdução e conta ao chegar.
- **Proteção:** um clique até 0,5 s depois de soltar uma alma não chama ninguém (`CALLBACK_GUARD`), para o último clique de uma sequência não desfazer tudo.
- **Depois:** assim que a primeira chega, a gaiola volta a mostrar o número, e um clique solta de novo. Se nenhuma cabe, as gaiolas tremem e ninguém volta.
- **Cancelamento:** não há; uma alma chamada pode ser capturada por um Passaguá antes de partir.

## Captura de alma solta (10/11, v2.7.0)

- O Passaguá de qualquer player local captura almas soltas no arco do golpe, com a mesma abdução. A alma (a mesma, com a identidade dela) vai para a gaiola de quem capturou: a de outro player muda de dono; a própria volta para a própria gaiola. Sem vaga em nenhuma gaiola, ela fica solta.

## Ajudas e atrapalhos (11/11, v2.8.0)

A alma solta age pelo dono, e às vezes contra ele (`lib/pigchicken/soul-acts.ts`; os efeitos em `combat.ts`). Cada alma tem uma ficha de ações (`SoulActParams`) que vem da entrada dela na biblioteca: os números da classe de voo, a chance da Morta pela raridade e, por cima, os próprios da entrada (`entryActParams`). O admin muda tudo no grupo Ações do editor de fichas ([soul-library.md](soul-library.md)).

| Parâmetro | Faixa | Padrão |
| --- | --- | --- |
| Ajuda | Nenhuma, Cantar nas harmonias, Cantar no tempo, Buscar item, Avisar perigo, Degrau no ar | A da classe |
| A cada | 1 a 30 s | 6 s |
| Alcance | 50 a 800 px | 300 px |
| Força da ajuda | 0 a 1 | 0,5 |
| Atrapalho | O da própria alma, Nenhum, Empurrar, Quicar, Desviar a mira, Bicar, Desafinar | O da própria alma |
| Chance de atrapalhar | 0 a 1 | Viva 0; Morta pela raridade |
| Força do atrapalho | 0 a 1 | 0,3 |

- **Relógio:** a primeira volta chega entre 40% e 100% de “A cada” depois de solta; as outras, a cada “A cada”. Em cada volta a alma sorteia o atrapalho pela chance. Se não sair, fica pronta e ajuda assim que houver o que fazer; feita a ajuda, o intervalo recomeça. Pronta e sem o que fazer, continua sorteando o atrapalho a cada volta.
- **Canto real e voz (17/11, v2.13.0):** em cada volta do relógio a alma também sorteia o canto gravado da ave que a inspira (“Canto real”, 15% por padrão), sem mudar o que faz naquela volta. As notas que ela toca usam a voz dessa ave. Regras em [Guia de pássaros](bird-guide.md).
- **Recado:** para buscar item, ser degrau ou atrapalhar de perto, ela larga o lugar e voa reto até o ponto, a 2,2 vezes a velocidade dela (520 px/s no mínimo). Desiste depois de 4 s (9 s carregando item, 1,5 s no degrau) e volta ao lugar.
- **Cancelamento:** chamada pelo Callback, capturada por um Passaguá ou com o dono fora do jogo, ela para o que fazia; o item que carregava cai de onde ela está.

### Ajudas

| Classe | Ajuda | Números próprios |
| --- | --- | --- |
| Sentinela | Cantar nas harmonias | Alcance 600 |
| Patrulheira | Avisar perigo | Alcance 520 |
| Escolta | Degrau no ar | |
| Ritmada | Cantar no tempo | A cada 3 s, alcance 450, força 0,35 |
| Preguiçosa | Buscar item | A cada 10 s, alcance 600 |
| Pintinho | Nenhuma | |

- **Cantar nas harmonias:** com um inimigo que nota enche (alien, zumbi ou morto-vivo que ainda não é pássaro, sem escudo total) a até Alcance da alma, ela canta uma nota do acorde da zona, uma oitava acima, na voz do pássaro que ela era; cada canto anda uma nota no acorde. O símbolo da nota aparece sobre a alma e um rastro de faíscas vai até o inimigo mais perto. A harmonia dele sobe 20 × Força da ajuda (10 no padrão), como uma nota de instrumento sem atordoar: vale “Dano só no tom”, o inimigo responde e, com a barra cheia, vira pássaro. A nota da alma não troca a marca que decide que alma o pássaro será (vale a última nota do player); se ninguém tocou nele, fica a família da alma que cantou. Bonecos de treino ficam de fora.
- **Cantar no tempo:** a mesma nota, só no quadro em que a batida vira, valendo 1,5 vez.
- **Buscar item:** com um item solto no chão (arremessado, ou largado numa troca; os dos cavaletes não) a até Alcance da alma, a mais de 110 px do dono, que o dono não carrega e para o qual tem lugar (ou consumível que ainda cabe na pilha), ela voa até ele, pega, leva até 50 px acima da cabeça do dono e solta. O item vai pendurado embaixo dela e ninguém o pega no ar; solto, cai aos pés do dono, que pega com Pegar. Duas almas não vão ao mesmo item; se alguém o pegar antes, ela desiste.
- **Avisar perigo:** com um inimigo (alien, zumbi ou morto-vivo de pé) a até Alcance do dono e do lado para o qual ele está de costas, ela dá dois pios curtos e um “!” vermelho aparece sobre ela e sobre o inimigo mais perto. Não repete o mesmo inimigo antes de 3 intervalos.
- **Degrau no ar:** com o dono no ar há 0,3 s ou mais, caindo a 220 px/s ou mais, a 150 px ou mais do chão embaixo dele, e a alma a até Alcance dele, ela mergulha até debaixo dos pés (500 px/s mais rápida que a queda). Ao chegar, a queda zera e ele sai para cima a 520 a 980 px/s conforme a Força da ajuda (750 no padrão, pouco mais que um pulo), com faíscas e duas notas. Se ele pousar antes, ela desiste e só fica pronta na volta seguinte.

### Atrapalhos

- **Tipo:** “O da própria alma” (padrão) lê a alma: a Morta atrapalha pela arma que a matou; a Viva de nota Fora da escala desafina; as outras Vivas não atrapalham. A ficha pode fixar outro tipo, ou Nenhum.
- **Chance:** a da Morta vem da raridade da entrada (comum 10%, incomum 20%, rara 30%, lendária 45%); a da Viva é 0. A alma de nota Fora da escala soma 15% (até 100%).
- **Aviso:** a alma que vem atrapalhar deixa um rastro vermelho no voo. Capturá-la com o Passaguá antes de ela chegar cancela.

| Atrapalho | De quem, no padrão | Efeito (Força do atrapalho de 0 a 1) |
| --- | --- | --- |
| Empurrar | Morta por Explosão | Voa até o lado do dono e estoura sem dano: empurrão radial de 500 a 1500, raio de 230 px, um pouco para cima, em todo boneco e pintinho no raio |
| Quicar | Morta por Bala | Vai aos pés dele e ele quica: sobe a 420 a 1000 px/s, com até 160 px/s para um lado |
| Desviar a mira | Morta por Flecha | Passa na frente dele e a mira balança até 12° a 55°, por 0,7 a 1,6 s, cada vez menos. Vale para arma, instrumento e arremesso (`combat.aimSkew`, somado à mira em `parquinho.tsx`) |
| Bicar | Morta por Impacto | Bica a cabeça: tranco de 160 a 520 px/s para longe dela, e Atirar e Golpe não respondem por 0,25 a 0,9 s |
| Desafinar | Viva de nota Fora da escala | De onde está, canta um intervalo azedo e mostra “♭”. Por 3 a 9 s as notas do dono saem 0,5 semitom fora, no som e na nota: em zona com “Dano só no tom” não enchem harmonia, e o pássaro que nascer delas conta como Fora da escala |

- **Escopo:** Pátio e Templo, todos os players locais. Cada alma age sobre o próprio dono; o empurrão pega quem estiver no raio. No Pátio online os outros navegadores veem a alma voar, mas não as notas, os avisos, o item carregado nem os atrapalhos; a harmonia que ela enche num inimigo do lobby vale para todos.

## No Pátio online (11/11, v2.8.0)

`lib/pigchicken/net-souls.ts` (dados e regras), `lib/pigchicken/net-world-sync.ts` (envio), ganchos em `combat.ts`, repasse em `server/src/patio-room.mjs`; testes em `tests/pigchicken-net-souls.cases.cjs` e `server/test/room.test.mjs`.

- **Quem decide:** cada navegador simula as almas que os seus players soltaram e manda todas 10 vezes por segundo (`souls`: id, posição e lado; o que a alma é vai só na primeira vez, e tudo de novo a cada 2 s ou quando alguém entra; até 64 por navegador). Os outros desenham cópias que deslizam até a posição recebida (saltam acima de 400 px), com o desenho da entrada da biblioteca e um anel na cor do navegador dono. As cópias não agem.
- **Roubo:** o Passaguá de um player sobre a cópia mostra a nuvem na hora, esconde a cópia e pede a alma ao navegador que a simula (`take`). Esse navegador tira a alma do ar (ela larga o que carregava) e responde com o que ela é (`give`); só então ela voa até a gaiola de quem pediu e conta nela (a vaga fica reservada desde o pedido). Conta também como captura na Biblioteca de quem roubou. Com dois pedidos pela mesma alma, o primeiro a chegar leva e o segundo não recebe nada. Sem resposta em 1,5 s (`TAKE_WAIT`) a cópia volta a aparecer; uma resposta depois de 3 s é ignorada.
- **Sumiço:** quando a alma deixa de ser enviada (Callback, capturada, o navegador saiu do lobby), a cópia some numa nuvem. Sair do online apaga as cópias; as almas soltas deste navegador continuam, locais.
- **Pássaro morto-vivo:** é um inimigo do dono do lobby. Num navegador que não é o dono, o Passaguá sobre ele some com a cópia e faz o mesmo pedido ao dono do lobby, que tira o pássaro do mundo e responde com a alma morta (espécie, instrumento, nota e a arma que o matou, que só ele conhece). Antes, a cópia capturada voltava em até 2 s e dava outra alma.
- **Pássaro vivo:** continua de cada tela: cada navegador vê nascer o seu quando o alien vira pássaro e pode capturar o seu. Ele lembra a última nota que aquele navegador tocou no alien; sem nota dali, instrumento e nota ficam em branco. A nota cantada por uma alma enche a harmonia no dono do lobby sem mudar o que o alien lembra.
- **Pintinho de outro navegador:** os bandos de todos aparecem em todos ([pintinhos](../chicken/chicks.md#no-pátio-online-11112026-v280)). O Passaguá sobre o pintinho de outro navegador esconde a cópia e faz o mesmo pedido ao navegador dono (`take` do tipo `c`), que tira o pintinho do seu bando e responde com a alma Pintinho.
- **Servidor:** só repassa, conferindo tamanho, quantidade e ritmo (`souls` para os outros; `take` e `give` só para o navegador indicado). Ele avisa em `hello.caps.souls` que conhece essas mensagens; com um servidor antigo o navegador não as envia (uma mensagem desconhecida derruba a conexão) e as almas ficam locais.
- **Gaiolas:** os contadores de cada player vão para todos ([cages.md](cages.md#no-pátio-online)). **Não enviado:** o voo da alma até a gaiola dos outros.

## Ainda não implementado

Tecla e botão de controle para soltar e chamar. O plano está fora do código, no documento “Almas capturadas: plano”.
