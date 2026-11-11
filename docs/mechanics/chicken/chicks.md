# Pintinhos: espécie de ave e bots seguidores

Implementado em 10/11/2026 (v2.7.0). Código: `lib/chicken/species.ts` (espécie), `lib/chicken/chick-art.ts` (estilos e arte), `lib/chicken/chick-follow.ts` (IA de seguir), `components/chicken/chick-flock.tsx` (bando), ganchos `species`/`art`/`setArt`/`setBot` em `lib/chicken/engine.ts`, captura em `lib/pigchicken/combat.ts` (`setCatchables`). Testes: `tests/chicken-chicks.cases.cjs`.

## Espécie

- Toda ave usa o mesmo engine da galinha e mantém todas as mecânicas de movimento (andar, correr, slide, chocar, agarrar paredes e tetos, bater asas, combinações de pulo). A espécie só multiplica os ajustes da configuração central (`CHICK_FACTORS`), então os pintinhos acompanham ao vivo qualquer ajuste feito na galinha.
- **Pintinho** (`species: 'chick'`): escala 0,42 da galinha; andar 0,8 e corrida com o mesmo multiplicador (para conseguir acompanhá-la); pulo 0,32 da altura, pulos no ar perdendo mais força; todos os impulsos dos pulos combinados (chocando, correndo, agachado) a 0,25–0,3; voo fraco (divisor de queda voando 0,45 do da galinha, nunca abaixo de 1,05; atenuadores de queda 0,35–0,4; metade das batidas por pulo, no mínimo uma); asas e passos mais rápidos; cabeça balançando bem menos andando e correndo (cabeça adianta 0,35, inclinação da cabeça na corrida 0,35, balanço do corpo 0,6); escalada 0,55 e pulo de parede 0,6.
- **Restrições da classe:** o pintinho não segura itens nem entra no combate como player, e não cacareja (volume 0).

## Estilos

- Desenho SVG simples no estilo da galinha (sem contorno): corpo redondo de penugem com barriga clara, cabeça grande com olho escuro, bico pequeno, asinha, rabinho em tufo, sem crista nem barbela. A arte desce em relação ao rig da galinha, mostrando só a ponta das pernas.
- **Realistas** (sorteados para o bando inicial): Amarelo-claro, Creme, Preto e creme, Prata, Caramelo, Listrado (listras no dorso e na linha do olho), Chocolate, Ardósia, Carijó (pintas) e Pintado.
- **Coloridos** (já programados, ainda sem uso no jogo; para zonas e eventos que tingem pintinhos com `engine.setArt(chickArt(style))`): Rosa, Verde, Laranja, Roxo e Amarelo forte.

## Bando (globo e Pátio)

- O bando nasce junto com a galinha do jogador (a mãe), pelo `ChickenLayer`: 4 pintinhos (`CHICK_START`), cada um com um estilo realista sorteado (nunca colorido), caem do céu um depois do outro logo depois dela (0,7 s e depois a cada 0,26 s), alternando os lados.
- **Globo** (primeira tela, “Pátio lobby”): seguem a galinha pela tela do globo. Ao entrar no portal, o bando fica para trás com a página.
- **Pátio:** ao entrar em qualquer Pátio (e ao trocar de Pátio pelo portal), nasce um bando novo de 4 sorteados com ela. Seguem a câmera, o chão, as paredes, o teto e o zoom do Pátio como as galinhas dos players locais, e as explosões os empurram. No Pátio online eles existem só na tela de quem joga (não são enviados aos outros); os players locais extras não têm bando. Ignoram teclado, gamepad e toque; podem ser pegos e soltos com o mouse como a galinha. Não olham para o cursor.

## IA de seguir

Cada pintinho tem seu próprio cérebro (`followStep`, a cada quadro, pelo laço do bando) e só aperta as ações normais (esquerda/direita, correr, pular):

- **Descanso:** fica parado (com o idle normal e, de vez em quando, um passinho próprio) enquanto a galinha está dentro da sua distância. Quando ela passa de 1,6× essa distância, espera um tempo de reação próprio (0,15–1,4 s) antes de ir atrás.
- **Seguir:** anda até um ponto próprio ao lado dela (deslocamento sorteado até ±70 px) e corre quando está a mais de 280 px. Ao chegar dentro da distância, volta ao descanso sorteando nova distância (45–170 px), novo ponto e novo tempo de reação, por isso o bando nunca se move junto.
- **Pulinhos:** com a galinha pelo menos 26 px mais alta e a até 240 px de lado, ou com uma parede travando o pintinho por 0,35 s, ele tenta alcançá-la com 2 a 4 toques curtos de Pulo (cada um 0,12–0,3 s, com batidas de asa), depois descansa 1,2–3,5 s antes de tentar de novo.
- **Perdido:** a mais de 1400 px dela por 2,5 s (portal, troca de Pátio, queda), ele cai do céu ao lado dela.
- Enquanto está sendo arrastado pelo mouse ou entrando num portal, o cérebro não aperta nada.

## Captura

- O Passaguá de qualquer player captura os pintinhos no arco do golpe, como os pássaros: o pintinho some numa nuvem e vira uma alma de espécie Pintinho, que voa até o contador de quem capturou e soma 1 ao chegar ([almas](../patio/souls.md)). Pintinhos capturados não voltam até o Pátio ser aberto de novo.
