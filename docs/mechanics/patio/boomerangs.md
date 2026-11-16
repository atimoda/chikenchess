# Pátio: Boomerang e baralhos de cartas (Baralho vermelho, Baralho azul)

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). Os três itens são bastões e usam o arremesso que volta do Martelo de Thor, sem raio: pose no corpo e golpe rápido em [Armas de bastão](staffs.md); o arremesso que volta (carga, curva, chegada) em [Armas de raio](lightning.md); o golpe comum em [Combate](combat.md).

## Itens — 15/11, v2.11.0

Código: `lib/pigchicken/items.ts` (`boomerang`, `cardsRed`, `cardsBlue`, `DECK_IDS`, campos `returnCount` e `deck*`), `lib/pigchicken/cards.ts` (puro: ordem do baralho, próxima carta, destino, alcance do estouro, contato), `lib/pigchicken/combat.ts` (`leaves`/`arrives`, `throwCard`, `stepCards`, `burstCard`, `chainCards`, `cards`, `nextCard`, `inHand`, `setAimPoint`), `components/pigchicken/draw/cards.ts` (cartas no mundo), `components/pigchicken/draw/hud.ts` (próxima carta e barrinhas no slot), `lib/pigchicken/art.ts` (artes), `lib/chicken/engine.ts` e `lib/pigchicken/held-pose.ts` (segundo Boomerang na asa de trás), `lib/pigchicken/net-world.ts` (`cd`, `cb`, `cx`).

- **Boomerang** é um esportivo (grupo **Esportivos** do painel Itens, da paleta de suportes do Modo editor e do Baú). **Baralho vermelho** e **Baralho azul** são itens de magia (grupo **Magia**). No inventário, Boomerang e Baralho vermelho ficam no grupo **Utilitário**; o Baralho azul é um instrumento (sinos, escala do Pátio) e fica com os instrumentos.
- Sem munição, sem recarga, sem choque e sem especial. O bind de **Golpe** (botão direito) é o golpe rápido de bastão dos três, com combo.
- **Escopo:** Parquinho, Templo e Vila, local ou Pátio online, para cada player local e qualquer dispositivo.

## Boomerang

- **Gatilho e voo:** o arremesso que volta do Martelo (aperto de Atirar arma, segurar carrega, soltar arremessa; linha pontilhada de mira; curva conduzida pela mira; acerta cada alvo uma vez na ida e uma na volta), com dano físico e empurrão, sem raio. Vai mais longe que o Martelo.
- **Dois de uma vez** (`returnCount`, padrão 2): a galinha segura um em cada asa. O primeiro arremesso leva um; com um no ar ela continua com o outro na asa da frente, pode dar Golpe e arremessar o segundo. Com os dois no ar a asa fica vazia, o item aparece apagado no slot e Atirar e Golpe ficam sem efeito até um deles voltar para a asa.
- **Slot:** barrinhas embaixo do slot mostram quantos estão na asa (como munição).
- **Uma asa por arremesso** (16/11; `Owned.back`, `off`/`back` em `held-pose.ts`, `lib/chicken/engine.ts`): com dois na mão, o segundo fica parado na asa de trás e só a asa da frente carrega, golpeia e arremessa. Com o da frente no ar, o que sobrou continua na asa de trás, que passa a fazer tudo com ele (carga, golpe e arremesso, desenhado atrás do corpo) enquanto a asa da frente fica vazia. O primeiro que volta vai para a asa da frente. Só nos players deste navegador; nos bonecos de outros navegadores aparece um, na asa da frente.
- **Arremesso comum e troca:** com algum Boomerang no ar, o bind de Arremesso não joga o item e a troca por um item do chão é recusada. Se quem arremessou sai do jogo, o item cai no chão quando o último chega.
- **Padrões:** distância 1100 px (mínimo 50% sem carga), velocidade 1200 px/s, carga 0,8 s, dano 24 (12 sem carga), empurrão 380, curvatura 30° a 85°; golpe 14 de dano.

## Baralhos

- **Ordem:** 14 cartas, jogadas na ordem do baralho começando pelo Coringa no lugar do Ás: Coringa (★), 2, 3, 4, 5, 6, 7, 8, 9, 10, Valete, Dama, Rei, Ás. Depois do Ás a ordem recomeça no Coringa. Carta que está fora (no ar, estacionada ou voltando) não está no baralho: a próxima jogada é a próxima carta da ordem que ainda está nele. O slot mostra, no canto, a carta que sai a seguir (dourada quando é o 7 ou o Ás) e barrinhas com quantas cartas restam.
- **Gatilho:** um aperto de Atirar joga a próxima carta; segurando, sai mais uma a cada `deckGap` (0,2 s). Não há carga.
- **Destino:** onde está a mira (o cursor; com direcional ou teclado, a distância do retículo), no máximo a `returnRange` (800 px) e no mínimo a 40 px. A carta voa em linha reta, girando, a `returnSpeed` (1100 px/s); se bate em parede, plataforma ou chão antes, para ali.
- **Estacionada:** chegando, fica flutuando no lugar, balançando de leve, por tempo indeterminado.
- **Limite:** até `returnCount` cartas fora ao mesmo tempo (padrão e máximo 14). Com todas fora, Atirar e Golpe ficam sem efeito e o item aparece apagado no slot, até uma carta estourar ou voltar.
- **Estouro por contato:** a carta estoura quando alguém encosta nela (a `deckTouch`, 26 px, do corpo), em qualquer momento: na ida, estacionada ou na volta. Encostam: aliens, zumbis, mortos-vivos e bonecos de treino vivos (boneco quebrado só para a carta azul), os outros players locais e, no online, as galinhas dos outros navegadores. Não encostam: quem jogou a carta, pintinhos, almas, botões, alien com escudo inteiro e morto-vivo em forma de pássaro.
- **7 e Ás:** a sétima e a décima quarta carta da ordem estouram sozinhas ao chegar ao destino (ou onde pararam), e o estouro delas tem o raio multiplicado por `deckBig` (2×), também quando estouram por contato ou em cadeia. No ar elas brilham.
- **Cadeia:** todo estouro que alcança outra carta (de qualquer baralho deste navegador, em qualquer fase) faz essa carta estourar 0,09 s depois; ela pisca na cor dela antes. Cartas próximas estouram em sequência.
- **Baralho vermelho (dano físico):** raio `explodeRadius` (110 px), dano `explodeDamage` (45) no centro caindo até 0 na borda, empurrão `explodePush` (700) em inimigos e players dentro do raio (inclusive quem jogou), som de explosão.
- **Baralho azul (dano musical):** ao ser jogada, a carta guarda a nota da escala em que a mira estava (a mesma nota que um instrumento tocaria), e fica em silêncio. Quando estoura, toca essa nota (voz de sinos, `noteLen`) e dá harmonia nessa nota a quem está no raio (`explodeDamage` 40 no centro, metade na borda), com o atordoamento `stun` (0,3 s) e empurrão `explodePush` (500). A carta azul tem o símbolo ♪ na cor da nota guardada.
- **Retorno:** cada carta estacionada volta quando o peito de quem a jogou fica a mais de `deckLeash` (1000 px) dela. Na volta ela atravessa o cenário, acelera, persegue a dona e entra no baralho ao chegar (som de pegada), sem estourar; se encosta em alguém no caminho, estoura. Uma carta que estoura ou volta fica disponível de novo.
- **Arremesso comum e troca:** com alguma carta fora, o bind de Arremesso não joga o baralho e a troca por um item do chão é recusada.
- **Saída do jogo e troca de Pátio:** se quem jogou sai do jogo, as cartas dela somem numa nuvenzinha. Na troca de Pátio as cartas fora voltam ao baralho, que continua da carta em que estava.

## Pátio online

- O Boomerang no ar viaja como o Martelo (`NetShot` `hm`).
- Cartas: `cd` (carta jogada: número, de onde, para onde, velocidade, cor da nota), `cb` (voltando, ou sumiu) e `cx` (estourou: lugar, raio, nota). Nos outros navegadores a carta só é desenhada; quem decide contato, estouro e cadeia é o navegador de quem jogou, e o dano e a harmonia seguem ao dono do mundo como os outros acertos.
- O estouro recebido empurra os players deste navegador que estão no raio, mostra o clarão, toca o som ou a nota e faz estourar as cartas deste navegador que alcança.
- Uma carta de outro navegador que fica estacionada some sozinha depois de 90 s sem notícia (mensagem perdida).

## Painel Itens

- **Arremesso que volta** (Boomerang e baralhos): no Boomerang, os mesmos ajustes do Martelo mais **Quantos de uma vez** (`returnCount`, 1 a 14). Nos baralhos ficam só **Distância máxima** (até onde uma carta vai), **Velocidade** e **Cartas fora ao mesmo tempo** (`returnCount`); dano, empurrão, carga, mínimo e curvatura do arremesso não aparecem (não valem para cartas).
- **Baralho** (só nos baralhos): **Distância de retorno** (`deckLeash`, 100 a 4000 px), **Explosão do 7 e do Ás** (`deckBig`, 1 a 4×), **Área de contato** (`deckTouch`, 4 a 120 px) e **Intervalo entre cartas** (`deckGap`, 0,05 a 2 s).
- Raio, dano e empurrão do estouro ficam no grupo **Explosão**, como nas granadas (sem pavio nem quique); nota, voz e escala do Baralho azul no grupo **Música**.
- `returnCount` aparece também no Martelo (padrão 1).

## Fora do escopo atual

- Os três itens não foram colocados nos Pátios de exemplo; aparecem por suporte do Modo editor (paletas Esportivos e Magia), Item solto ou Baú.
- No online, a curva que a dona conduz no Boomerang não é transmitida (como no Martelo).
