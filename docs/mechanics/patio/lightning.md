# Pátio: armas de raio (Martelo de Thor, Cajado de Odin) e estado de choque

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). Os dois itens são bastões: pose no corpo, golpe rápido e golpe forte estão em [Armas de bastão](staffs.md); o golpe comum em [Combate](combat.md).

## Itens — 13/11, v2.10.0

Código: `lib/pigchicken/items.ts` (`mjolnir`, `odinstaff`, `MAGIC_IDS`, campos `shock*`, `special*`, `return*`), `lib/pigchicken/shock.ts` (puro: cadeia, estado, piscada, tremor, forma do raio), `lib/pigchicken/combat.ts` (`zap`, `applyShock`, `launch`, `flights`, `bolts`, `special`), `components/pigchicken/draw/shock.ts` (raio-x, raios, clarão, martelo no ar), `lib/pigchicken/sfx.ts` (`zap`, `thunder`, `lightning`, `catch`). Testes: `tests/pigchicken-shock.cases.cjs`.

- **Martelo de Thor** e **Cajado de Odin** são armas de magia, no grupo **Utilitário** do inventário e no grupo **Magia** do painel Itens e da paleta de suportes do Modo editor. Sem munição e sem recarga.
- **Escopo:** Parquinho, Templo e Vila, local ou Pátio online, para cada player local e qualquer dispositivo.
- **Quem leva choque:** aliens, zumbis, mortos-vivos e bonecos de treino vivos. Não levam: botões, convertidos, mortos, alien com escudo inteiro e as galinhas dos players (golpes não acertam players).

## Choque em cadeia

- **Gatilho:** um golpe da arma (rápido ou forte), o martelo em voo ou a arma arremessada pelo Arremesso comum acerta alguém. Golpe que não acerta ninguém não dá choque.
- **Cadeia:** o choque sai de quem levou o golpe e pula, um por vez, para o mais próximo ainda não atingido que esteja a até `alcance` px de qualquer um já atingido; por isso o raio se ramifica. Para depois de `saltos` pulos ou quando não há mais ninguém no alcance.
- **Efeitos em cada atingido:** entra em estado de choque por um tempo curto, fica atordoado nesse tempo (bonecos de treino não andam, então só tremem), perde `shockDrain` da **barra de harmonia** (a barra de música de aliens, zumbis e mortos-vivos) e, se foi atingido por um pulo, leva `shockDamage` de dano. Quem levou o golpe direto já tomou o dano do golpe e não soma o do choque. Zumbi andando ou parado faz a animação de dor.
- **Raios:** um raio violeta e branco, torto e com pequenas ramificações, liga cada par da cadeia; cada pulo aparece 45 ms depois do anterior e dura 0,28 s.
- **Som:** estalo elétrico curto.
- **Rápido × forte (Cajado):** o golpe rápido (Golpe) usa `shockRange`/`shockTime`; o golpe forte carregado (Atirar) usa `heavyShockRange`/`heavyShockTime`, mais longe e mais demorado. O Martelo não tem golpe forte: o Atirar dele é o arremesso que volta.
- **Padrões:** Martelo: alcance 170 px, 3 saltos, 0,35 s, dano 8, tira 10 de harmonia. Cajado: rápido 220 px, 4 saltos, 0,3 s; forte 340 px e 0,7 s; dano 8, tira 12 de harmonia.

## Estado de choque

- **Visual:** quem está em choque treme no lugar e pisca em raio-x: o corpo fica escuro e azulado com um brilho em volta e o esqueleto aparece no meio (esqueleto em pé para zumbi e boneco de treino; caveira com costelas curtas para alien e morto-vivo). No zumbi o esqueleto acompanha a inclinação de cada quadro.
- **Força** (0 a 1): 0,35 no golpe rápido, 0,6 no forte, 1 no especial. Quanto mais forte, mais rápido pisca e mais tremor; perto do fim as piscadas ficam mais lentas e o tremor some.
- **Novo choque sobre outro:** fica o tempo maior e a força maior dos dois.
- **Fim:** o tempo acaba; não há como cancelar antes.

## Especial

- **Gatilho:** o primeiro golpe que acerta alguém depois do intervalo `specialCooldown` (padrão 12 s nos dois). Um item novo já começa com o especial pronto. Golpe no vazio não gasta o especial. O intervalo é de cada item (cada cópia conta o seu).
- **Efeitos:** alcance e saltos maiores (`specialRange`, `specialJumps`), todos os atingidos, inclusive o do golpe direto, levam `specialDamage` além do dano do golpe, e ficam em estado de choque por `specialTime` segundos com força 1. Raios mais grossos, que duram 0,6 s.
- **Efeito por arma** (`specialKind`): **Trovão** no Martelo: um raio grosso cai do céu no primeiro atingido, a tela clareia forte e soa um trovão. **Raio** no Cajado: arcos longos, clarão mais fraco e um estalo de raio.
- **Intervalo no inventário:** o fundo do slot do item fica azul, pulsando de leve, enquanto o especial está pronto; depois de usado, o azul volta a encher de baixo para cima até ficar pronto. É separado das barrinhas de munição embaixo do slot.
- **Padrões:** Martelo: 260 px, 6 saltos, 3 s, dano 25. Cajado: 420 px, 10 saltos, 3,5 s, dano 25.

## Arremesso que volta (Martelo, bind de Atirar)

- **Gatilho:** como o golpe forte dos bastões: um aperto novo de Atirar arma, segurar carrega, **soltar** arremessa. A asa faz a mesma animação de carga.
- **Carga:** de 0 a 1 em `returnCharge` segundos (padrão 0,8 s). A distância vai de `returnRange × returnMin` (padrão 50%, o arremesso já sai meio forte) até `returnRange` (720 px); o dano vai de 50% a 100% de `returnDamage` (35).
- **Mira:** enquanto carrega, uma linha pontilhada mostra o caminho de ida sem mexer a mira (com a curvatura mínima), até onde o martelo vira, cortada onde bateria numa parede ou no chão.
- **Voo:** a `returnSpeed` (1300 px/s), girando, pelo caminho curvo descrito abaixo. Acerta cada alvo uma vez na ida e uma na volta, com dano, empurrão `returnPush` e o choque em cadeia (ou o especial, se estiver pronto). Vira ao chegar à distância, bater em parede, chão ou plataforma; na volta atravessa o cenário, acelera e persegue o peito de quem arremessou.
- **Curvatura** (13/11; `lib/pigchicken/return-flight.ts`): `returnCurveMin` e `returnCurveMax`, em graus que cada perna do caminho dobra (padrão 16° e 70°).
  - *Sem mexer a mira:* vale a mínima. O martelo sai inclinado metade da mínima para cima da mira, passa por cima da linha da mira, vira exatamente sobre ela e volta por baixo, fechando um laço. Arremessado para a esquerda, o desenho é espelhado. Com a mínima em 0 ele vai e volta em linha reta.
  - *Mexendo a mira com ele no ar:* a curva puxa para o lado em que a mira girou desde o arremesso (mira para cima, dobra para cima; para baixo, para baixo), na ida e na volta. Quanto mais longe a mira estiver da direção do arremesso, mais dobra: da mínima até a máxima, que vale com 35° de giro ou mais. Giros menores que 4° não trocam o lado (o tremor da mão não vira a curva). A dobra segue a mira em cerca de um décimo de segundo, então a troca de lado é uma virada suave.
  - *Ida:* é a direção do martelo que gira, no total da curvatura ao longo da distância do arremesso. *Volta:* ele contorna a dona para o mesmo lado, cada vez menos conforme chega perto (desvio de metade da curvatura, no máximo 57°), e sempre chega.
  - Máxima menor que a mínima vale como a mínima. A distância percorrida na ida não muda com a curva.
- **Enquanto está no ar:** a asa fica vazia, o item aparece apagado no slot e Atirar, Golpe e Arremesso desse slot ficam sem efeito; trocar de slot continua valendo, mas a troca por um item do chão é recusada com o martelo no ar.
- **Chegada:** a 34 px do peito ele volta para a asa, com um som de pegada. Se quem arremessou saiu do jogo, o martelo cai no chão como item solto.
- **Arremesso comum:** o bind de Arremesso continua jogando a arma como qualquer item (ela fica no chão); ao acertar alguém também dá o choque.

## Pátio online

- O dono do mundo decide dano, harmonia e atordoamento. Em quem segue, o inimigo treme na hora e o golpe vai ao dono com o choque (`sh` em `NetHit`: tempo, força, harmonia), como os outros acertos.
- O estado de choque de cada inimigo viaja junto do inimigo (índice 18 de `NetFoe`), então todos veem o mesmo raio-x.
- Raios, clarão e som chegam como disparos (`NetShot` `z`); o martelo no ar como `hm`, desenhado indo e voltando ao ponto de saída, sem dano no navegador de quem só assiste. Lá ele faz o laço da curvatura mínima; a curva que a dona conduz com a mira não é transmitida (os acertos valem pelo caminho de quem arremessou).

## Painel Itens

- Grupos **Choque** e **Especial** aparecem só nos bastões; **Arremesso que volta** só no Martelo, no lugar de **Golpe forte**. O **Efeito** do especial (Trovão ou Raio) é uma escolha do grupo Especial. `Alcance` do choque em 0 desliga o choque do item; `Intervalo` do especial em 0 desliga o especial.

## Fora do escopo atual

- Choque nas galinhas dos players e choque em fios elétricos do cenário não existem.
- Os dois itens não foram colocados nos Pátios de exemplo; aparecem por suporte do Modo editor (paleta Magia) ou Item solto.
