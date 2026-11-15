# Pátio: armas de bastão (pose, golpe rápido e golpe forte)

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). O golpe comum (fases, rastro, combo, rebate) está em [Golpe e combo](melee.md); inventário, munição do Taco e capturas do Passaguá em [Itens](items.md) e [Almas](souls.md).

## O que é um bastão — 12/11, v2.9.0

Código: `isStaff` em `lib/pigchicken/items.ts` (hoje: todo item `meleeOnly`), `lib/pigchicken/staff-pose.ts` (pose, puro), `lib/pigchicken/held-pose.ts`, `lib/chicken/engine.ts` (`HeldStaff`, `wingReachTransform`), `lib/pigchicken/combat.ts` (`heavyItem`/`heavyT`, `melee(..., heavy)`), `components/pigchicken/staff-pose-editor.tsx`. Testes: `tests/pigchicken-staff.cases.cjs`.

- **Itens:** Taco, Passaguá e, desde 13/11 (v2.10.0), Martelo de Thor e Cajado de Odin, que somam o choque, o especial e (no Martelo) o arremesso que volta no lugar do golpe forte: ver [Armas de raio](lightning.md). Desde 15/11 (v2.11.0) também Boomerang, Baralho vermelho e Baralho azul, em que Atirar arremessa (dois Boomerangs, ou as cartas do baralho) no lugar do golpe forte: ver [Boomerang e baralhos](boomerangs.md). Um item novo marcado `meleeOnly` herda tudo desta página (pose, editor, golpe rápido e golpe forte).
- **Escopo:** Parquinho, Templo e Vila, local ou Pátio online, para cada player local e qualquer dispositivo (teclado, mouse, gamepad, toque).

## Pose no corpo

- **Parado:** o bastão não gira com a mira. A mão da asa segura o ponto `gripX/Y` do desenho do bastão; esse ponto fica em (`staffX`, `staffY`) a partir do ombro (unidades do rig, x para a frente dela, y para baixo) e o bastão fica inclinado em `staffAngle` (0° = apontando para a frente dela, −90° = para cima). A asa gira e estica do ombro até a mão. Tudo é espelhado com o corpo quando ela vira. A mira só inclina o bastão de leve (até 6°: para a frente mirando para baixo, para trás mirando para cima).
- **Padrões:** apoiado no ombro: mão em (38, 34), inclinação −135°; Taco segura em (5, 0), Passaguá em (6, 0).
- **Inverter asa** (`wingFlip`): espelha a asa que segura o bastão ao longo do comprimento, como nos outros itens.
- **Throw:** durante a carga de Arremesso o bastão vai para a mão e segue a pose de Arremesso de todos os itens.
- **Pátio online:** as galinhas dos outros navegadores carregam o bastão na pose padrão do jogo (`DEFAULT_ITEMS`), sem a animação de carga.

## Golpe rápido (bind de Golpe)

O golpe de sempre: fases, combo, rastro, intervalo e parâmetros do grupo **Golpe rápido** (os mesmos campos `melee*`/`trail*`/`combo` dos outros itens). A asa sai da pose do bastão, e não mais da asa em repouso, e volta para ela na recuperação; o ponto `grip` fica na ponta da asa durante o giro.

## Golpe forte (bind de Atirar)

- **Gatilho:** um aperto novo de Atirar com um bastão na asa arma o golpe; segurar carrega; **soltar** dispara. Um toque rápido dispara com carga quase zero. O golpe forte nunca sai no aperto.
- **Carga:** conta de 0 a 1 em `heavyCharge` segundos (padrão 1 s) e fica cheia enquanto o botão continuar segurado. Só começa a contar depois que o intervalo do golpe anterior acabou.
- **Animação de carga:** a mão vai da pose Parado para a pose **Carregando** (`windX/Y`, `windAngle`: padrão mão em (−34, −44), bastão a −205°, com a ponta atrás dela). O avanço é rápido no começo e continua até a carga cheia (`windEase`). O bastão balança (até 4°, crescendo com a carga) e treme com a carga cheia, como no Arremesso. A pose de carga gira com a mira em volta do ombro: mirando para cima o bastão arma mais baixo, mirando para baixo, mais alto (sempre do lado oposto ao golpe). A inclinação vai de `staffAngle` a `windAngle` pelo caminho dos números (−135° → −205° gira por trás; o editor mantém o lado do giro ao arrastar).
- **Efeito da carga:** o alcance da asa vai de `heavyRange` até `heavyRange × heavyReachMax`; o tamanho do bastão desenhado no golpe, o comprimento dele na área de acerto e a espessura do rastro vão de 1× a `heavySizeMax`×. Limites em 1 desligam cada efeito. Dano e empurrão não mudam com a carga.
- **O golpe:** sempre o mesmo movimento (`heavyKind`: Para baixo por padrão; também Para cima, Horizontal, Giro 360° e Relativo à mira, que sai Para cima com a mira acima do horizonte e Para baixo caso contrário), com números próprios: `heavyDamage`, `heavyRange`, `heavyArc`, `heavyCooldown` (intervalo até o próximo golpe, rápido ou forte), `heavyTime` (duração do giro, com as mesmas quatro fases do golpe), `heavyPush` e rastro (`heavyTrailWidth/Time/Wisps/Opacity`; a cor é a do golpe rápido). A asa sai da pose de carga em que estava. Depois de um golpe forte, o combo do golpe rápido recomeça.
- **Cancelamento sem bater:** Golpe apertado durante a carga (sai o golpe rápido no lugar), trocar de item, Deselecionar, começar um Arremesso, interface que bloqueia Atirar (roda, portal, ser carregada) e a bicada de uma alma que trava o item. Depois de cancelar é preciso um aperto novo.
- **Prioridades:** “Golpe novo interrompe o anterior” (`meleeInterrupt`) vale para os dois: desligado, soltar Atirar durante um golpe em andamento não dispara. Soltar durante o intervalo também não dispara.
- **Taco:** o golpe forte gasta um golpe do pente ao sair (não ao apertar). Sem golpe carregado ou recarregando, o aperto faz o clique seco e não arma.
- **Passaguá:** o golpe forte captura como o rápido, com a área maior da carga.
- **Padrões:** Taco: dano 40, alcance 75 px, arco 170°, duração 0,42 s, empurrão 700 px/s, intervalo 0,15 s, limites 1,5× (alcance) e 1,6× (tamanho). Passaguá: dano 0, empurrão 0, alcance 70 px, duração 0,45 s, rastro suave.

## Passaguá: dano, empurrão e forma — 12/11, v2.9.0

- **Correção:** o golpe do Passaguá parava depois das capturas e nunca causava dano nem empurrão, mesmo com “Dano do golpe” e “Empurrão” configurados. Agora, depois de capturar, o mesmo golpe acerta o que sobrou no arco (aliens, zumbis, bonecos de treino, mortos-vivos fora das fases capturáveis, botões) com o dano e o empurrão do item. O que foi capturado (pássaros vivos, mortos-vivos que voam ou saem, almas soltas, pintinhos) some antes e não leva dano nem empurrão.
- **Dano 0** (padrão): nada é ferido, empurrado nem pisca; o empurrão precisa de pelo menos 1 de dano para valer.
- **Forma:** o aro e a rede ficam na mesma direção do cabo, presos na ponta dele (antes ficavam atravessados).

## Editor (Itens → Pontos, só nos bastões)

- **Mão no bastão:** o desenho do bastão com um ponto amarelo; arrastar muda `gripX/Y`.
- **No corpo:** a galinha com o bastão e a asa na pose escolhida nos botões **Parado** / **Carregando**; a outra pose aparece transparente ao fundo. Bolinha amarela (mão): arrastar muda a posição no corpo. Bolinha azul na ponta do bastão: arrastar gira o bastão em volta da mão (a inclinação). Valores de 0,5 em 0,5 u e de 1° em 1°, valendo na hora no Parquinho.
- As barras do grupo ajustam fino e o duplo clique volta o padrão. Os pontos de eixo, asa de trás e saída dos outros itens não aparecem nos bastões.
- **Golpe forte** é um grupo próprio do painel, só nos bastões; o grupo Golpe aparece neles como **Golpe rápido**.
- **Persistência:** campos da ficha como os outros (`pigchicken-items-v1`, `data/pigchicken/default-items.json` pelo Salvar no game).
