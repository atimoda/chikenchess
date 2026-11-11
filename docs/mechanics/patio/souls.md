# Pátio: almas capturadas

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). O Passaguá como item fica em [items.md](items.md); as mortes dos aliens e os pássaros em [temple.md](temple.md); os pintinhos em [../chicken/chicks.md](../chicken/chicks.md); o pouso e a fuga dos pássaros nos fios em [sky-and-power.md](sky-and-power.md); o catálogo, o desenho de cada alma, a coleção e o painel em [soul-library.md](soul-library.md).

Código: `lib/pigchicken/souls.ts` (identidade, raridade, abdução; puro), `lib/pigchicken/soul-follow.ts` (voo do bot amigo, ficha de parâmetros e classes; puro), ganchos em `lib/pigchicken/combat.ts` (`markSoul`, `convert`, `spawnUndead`, `strike`, cesto por player, `releaseSoul`, `callSouls`, `freedSouls`), contador em `drawSoulCounter`/`soulCounterBox` (`components/pigchicken/draw/hud.ts`), voo até o contador e almas soltas em `components/pigchicken/draw/souls.ts`, clique no contador em `components/pigchicken/parquinho.tsx` (`onSoulDown`). Testes: `tests/pigchicken-souls.cases.cjs` e `tests/pigchicken-soul-follow.cases.cjs`.

## Identidade da alma (10/11, v2.7.0)

Todo pássaro capturado pelo Passaguá vira uma alma (`Soul`) que guarda de onde veio. Esses eixos decidem qual entrada da biblioteca ela é ([soul-library.md](soul-library.md)), e a entrada dá o desenho e a classe de voo da alma solta. As ajudas de cada classe ainda vão ler o resto.

| Eixo | Valores | De onde sai |
| --- | --- | --- |
| Espécie | Horda (alien das fileiras), Água-viva, Lanterna, Casco, Gêmeos, Mini, Tambor, Dragão (a cabeça conta como Dragão), Pintinho | Dados do alien (`soulSpecies`); o pintinho vem da captura do bando |
| Estado | Viva: a harmonia encheu (morte musical). Morta: morte física, depois ressuscitada por notas | `convert` (viva) e o pássaro morto-vivo (morta) |
| Classe do projétil | Sopro (Flauta, Sax, Trompete), Cordas (Violão, Violino, Harpa), Teclas (Teclado), Percussão (Pandeiro), Rebate (nota de alien rebatida por um golpe) | O instrumento da última nota que entrou na barra antes de ela encher (`shotClass`); sem o item (golpe vindo de outro navegador), vale a voz da nota |
| Tipo de nota | Tônica; Consonante (terça maior ou menor, quinta); Tensão (as outras notas da escala); Sensível (sétima, maior ou menor); Fora da escala (nota que a escala não tem, ou desviada mais de 0,2 semitom) | A mesma última nota, medida no tom e na escala da zona naquele instante (`noteClass`) |
| Arma da morte (só Morta) | Explosão (qualquer explosão), Bala (Pistola, SMG, Rifle, Escopeta, Sniper), Flecha (Arco), Impacto (Taco, golpe de qualquer item, Asa, Bicada, item arremessado) | O golpe que zerou a vida do alien (`weaponClass`); desconhecida conta como Impacto |

- **Sem origem conhecida:** pintinhos não têm classe de projétil nem tipo de nota. Um pássaro que nasceu sem esses dados (por exemplo vindo de outro navegador) fica com eles vazios e a espécie Horda.
- **Raridade** (`soulRarity`): cada eixo soma pontos (Dragão 3, Lanterna 1, Gêmeos 1; Tensão 1, Sensível 2, Fora da escala 3; Morta 1). 0 comum, 1 incomum, 2 a 4 rara, 5 ou mais lendária. Os pesos ficam em `RARITY_POINTS`/`RARITY_AT`.
- **Cor:** a alma viva guarda a cor do alien; a morta, a cor da nota que a ressuscitou (a dos olhos); o pintinho, amarelo. Ela guarda também o tipo de pássaro em que voava, mas depois de capturada é desenhada como a sua entrada da biblioteca.

## Cesto e contador (10/11, v2.7.0)

- **Cesto:** cada player local tem o seu, uma pilha: a última alma capturada fica no topo (`combat.basket`). Vale só durante a sessão; não é salvo nem enviado no Pátio online.
- **Contador:** o círculo à esquerda do avatar mostra quantas almas há no cesto. O arco de dentro toma a cor da alma do topo (cinza claro com o cesto vazio). Ele é o botão de soltar e, com o cesto vazio e almas soltas, o botão Callback (abaixo).

## Abdução (10/11, v2.7.0)

- **Gatilho:** o Passaguá acerta um pássaro vivo, um pássaro morto-vivo ou um pintinho (as mesmas regras de alcance de antes).
- **Efeito:** o pássaro some do mundo numa nuvem e a alma voa em curva até o contador de quem capturou: sobe primeiro, acelera e encolhe, com brilho e rastro na cor dela, em 0,55 s (`ABDUCT_TIME`). Várias capturadas no mesmo golpe saem uma atrás da outra, a cada 0,08 s (`ABDUCT_GAP`). O texto “+N almas” não aparece mais; a primeira captura de cada entrada da biblioteca mostra o nome dela ([soul-library.md](soul-library.md)).
- **Contagem:** a alma entra no cesto, e o número sobe, só quando chega ao contador; o círculo cresce e volta em 0,3 s (`SOUL_PULSE`).
- **Câmera:** o ponto de partida é do mundo e o de chegada é da tela, então o voo acompanha a câmera e o zoom enquanto dura.
- **Cancelamento:** não há. Se o player que capturou sair do lobby antes de a alma chegar, ela se perde.
- **Escopo:** Pátio e Templo, todos os players locais (cada um com o seu contador). No Pátio online cada navegador vê só as próprias capturas.

## Soltar pelo contador (10/11, v2.7.0)

- **Gatilho:** clique ou toque no contador de um player com almas no cesto. Qualquer ponteiro vale para qualquer contador (o mouse solta as almas do player 2 clicando no contador dele). O clique não atira, não bica e não faz a galinha andar. Não vale com a tecla de câmera segurada nem com um painel por cima.
- **Efeito:** sai a alma do topo do cesto, a última capturada (`combat.releaseSoul`), uma por clique. Ela nasce pequena no ponto do mundo que está embaixo do contador naquele instante, cresce em 0,35 s e voa para o seu lugar perto do dono. O número desce na hora e o contador pulsa.
- **Aparência:** o desenho da entrada dela na biblioteca (forma pela família do instrumento; a morta, cinza com o olho na cor), com um brilho redondo na cor da alma. Com mais de um player local, um anel na cor do dono em volta de cada uma.
- **Mouse em cima:** quando um clique faria algo (cesto com almas, ou Callback), o contador acende na cor do player, a mira some e o cursor vira o de botão.
- **Sem tecla nem botão de controle ainda:** só clique ou toque.
- **Escopo:** Pátio e Templo, todos os players locais. As almas soltas valem só na sessão e, no Pátio online, cada navegador vê só as suas.

## Bot amigo (10/11, v2.7.0)

A alma solta voa junto do dono (`soulFollowStep`, uma vez por quadro, para as almas de todos os players locais).

- **Lugar:** ao lado do dono, a `dist` px para um lado, e acima dele: altura 0 é a cabeça, altura 1 é o topo do céu que a câmera mostra (60 px abaixo dele). Cada alma tem um jeito próprio por cima da classe: distância de 0,8 a 1,25 vezes e altura 0,1 para mais ou para menos.
- **Descanso:** o lugar fica parado no mundo enquanto o dono anda por perto. Ali a alma faz o seu padrão, vagueia um pouco (inquietação) e, se a classe tiver, dá uma voltinha de tempos em tempos. Quieta, ela olha para o dono.
- **Seguir:** quando o dono fica a mais que a `folga` do lugar, e depois da `reação`, o lugar passa a acompanhar o dono e a alma voa até ele na sua velocidade, freando ao chegar; a menos de 28 px ela descansa de novo. Lado “qualquer”: ela fica do lado em que já está.
- **Ficou para trás:** além da folga, ela voa mais rápido, até 3 vezes a velocidade (1 vez a mais a cada 250 px). A mais de 2600 px (portal, Templo), ela entra pela lateral, a 900 px do lugar.
- **Paredes:** o lugar nunca fica a menos de 40 px das paredes do mundo; se cairia fora, vai para o outro lado do dono.
- **Sem amontoar:** dois lugares a menos de 64 px um do outro se afastam aos poucos (até 140 px de desvio para cada alma), e cada alma guarda o desvio.
- **Dono saiu do jogo:** as almas soltas dele sobem e vão embora em 5 s.

Ficha de parâmetros (`SoulFollowParams`; limites em `SOUL_FOLLOW_RANGES`). Ainda não há painel para editar: os valores ficam no código.

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

## Callback (10/11, v2.7.0)

- **Gatilho:** com o cesto vazio e ao menos uma alma do player solta, o contador mostra “Call back” e fica preenchido na cor do player. Um clique ou toque nele chama as almas (`combat.callSouls`).
- **Efeito:** todas as almas soltas daquele player voltam para o contador, uma a cada 0,2 s (`CALLBACK_GAP`), da mais perto do boneco para a mais longe (distância medida no instante do clique). Cada uma faz o mesmo voo da abdução e conta ao chegar.
- **Proteção:** um clique até 0,5 s depois de soltar uma alma não chama ninguém (`CALLBACK_GUARD`), para o último clique de uma sequência não desfazer tudo.
- **Depois:** assim que a primeira chega, o contador volta a mostrar o número, e um clique solta de novo.
- **Cancelamento:** não há; uma alma chamada pode ser capturada por um Passaguá antes de partir.

## Captura de alma solta (10/11, v2.7.0)

- O Passaguá de qualquer player local captura almas soltas no arco do golpe, com a mesma abdução. A alma (a mesma, com a identidade dela) vai para o cesto de quem capturou: a de outro player muda de dono; a própria volta para o próprio cesto.

## Ainda não implementado

Tecla e botão de controle para soltar e chamar, painel para editar a ficha, pouso das almas soltas nos fios e fuga de outros players, roubo no Pátio online e as ajudas (e atrapalhos) de cada classe. O plano está fora do código, no documento “Almas capturadas: plano”.
