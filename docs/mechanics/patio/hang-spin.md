# Notas giratórias da escala Hangdrum — 25/11, v2.18.0; da escala desde 26/11, v2.19.0

Parte de [Escalas dos instrumentos](instrument-scales.md) (seção Hangdrum). É um comportamento da **escala** Hangdrum, não do item: vale igual para qualquer instrumento que toque nela (o Hangdrum ou outro com a escala ligada em Itens → Escalas), com os mesmos controles. Movimentos parecidos para outras escalas são agenda futura, ainda não implementados.

## Gatilho

- Atirar com a escala Hangdrum como escala atual (o item Hangdrum ou qualquer instrumento com essa escala ligada), com a mira dentro de uma bola (`touch` sem batida) e **Giro na bola** da escala maior que 0. O Tiro instantâneo nunca gira. Com o instrumento noutra escala (troca rápida), a nota vai reta.
- Fora das bolas a batida (`hangSlap`) continua como antes: vai reta e não gira. Com Giro na bola em Desligado, a nota também vai reta, como antes.

## Movimento

- **Viagem** (“Nota é disparada até a região da nota”, ligado): a nota sai da boca do instrumento e persegue o centro da bola, na velocidade do item; a bola anda com a galinha. Entra na órbita quando chega ao raio dela, no ângulo em que chegou. Desligado: a nota nasce na órbita, no ângulo da mira.
- **Giro:** dentro do círculo da bola, num raio de 60% do raio da bola (`ORBIT_FILL`), no sentido horário, uma volta por tempo do andamento da zona; o ding gira na metade da velocidade. Como o ding é centrado no ombro, a nota dele gira em volta da própria galinha. Várias notas na mesma bola (com “Cada nota interrompe a anterior” desligado) se espalham igualmente pelo círculo.
- A forma do hang (posição e tamanho da bola) fica como estava no disparo; o tamanho da camada Escalas e a posição da galinha valem os de agora.
- Durante o giro a nota não tem alcance, Bullet Magnetism, rebate, paredes nem chão.

## Acerto e fim

- A nota girando acerta como uma nota comum: dá a harmonia com o mesmo dano e some ao passar da perfuração do item (a Filhote também enche a barra).
- Acaba quando o tempo termina, quando acerta alguém, quando é cortada por outra nota da mesma bola, quando a camada da galinha salta mais de 600 px num passo (portal, teletransporte), quando o player sai, ou quando o player passa de 24 notas girando (a mais antiga sai). Some como as notas comuns, sem efeito extra.
- Trocar de item ou de escala **não** encerra: dá para lançar várias notas e trocar logo para outra arma ou instrumento, com as notas girando em volta.

## Controles (Escalas → Hangdrum → Notas giratórias)

- Ficam em `ScaleParams` da escala `hang` (`lib/pigchicken/scale-params.ts`), não no item: um valor para todos os instrumentos na escala. Até 25/11 eram do item (`ItemDef.hangSpin`/`hangTravel`/`hangChoke`); valores salvos assim são ignorados e a escala usa os seus.
- **Giro na bola** (`hangSpin`): Desligado (0), 1 a 60 s, Duração da nota (61: o slider Duração da nota do instrumento que tocou) e ∞ (62: até acertar, ser cortada ou a galinha sair). Padrão: Duração da nota.
- **Nota é disparada até a região da nota** (`hangTravel`, 0/1, padrão ligado): caixa de marcar, só aparece com o giro ligado.
- **Cada nota interrompe a anterior** (`hangChoke`, 0/1, padrão ligado; caixa de marcar): tocar uma bola corta o som da última nota tocada nela (some em 0,04 s) e tira de cena a nota que girava nela. Bolas diferentes soam e giram juntas; a batida não corta nada. Vale também com o giro desligado.
- Salvos com os números da escala: no navegador, no Salvar no Pátio, no Salvar no game (`data/pigchicken/default-scales.json`) e voltam no Padrão e no Reverter para o padrão do painel Escalas.

## Online

- A nota vai aos outros navegadores com a órbita (`ob` no `NetShot` 'b': centro da bola em relação ao corpo da galinha, raio, velocidade, tempo ou ∞, número, viagem, ângulo e bola). Lá ela gira em volta da galinha daquele navegador mais perto de onde estava, sem dano. Quando a nota acaba aqui, por qualquer motivo, sai um `ox` com o número dela e ela some lá também. O corte do som continua só local.

## Escopo

Todos os players locais no Parquinho, Templo e Vila, e os Pátios online. Código: `lib/pigchicken/note-orbit.ts` (matemática pura), `scale-params.ts` (controles), `components/pigchicken/scales-panel.tsx` (caixas de marcar `toggle`, rótulo `format`, `shown`), `combat.ts` (`shoot`, `stepBullet`, `cutBall`, `spinCap`, `orbitCenter`, `spreadOrbits`, `orbitOut`, `remoteOrbit`). Testes em `tests/pigchicken-note-orbit.cases.cjs`. Conferido no navegador o painel e as notas girando em volta da galinha; o som do corte não foi ouvido em aparelho.
