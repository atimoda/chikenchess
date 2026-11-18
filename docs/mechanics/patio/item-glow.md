# Pátio: brilho dos itens

Comportamento atual (17/11, v2.13.0). Vale em todos os modos do Pátio (local, online, Modo editor), para todos os players.

Código: `lib/pigchicken/item-glow.ts` (valor salvo, normalização e a aparência por intensidade, `itemGlowLook`), `components/pigchicken/draw/item-glow.ts` (desenho da coluna, da luz no chão e do contorno), chamado em `drawWorld` de `components/pigchicken/draw/world.ts`; controle em `components/pigchicken/patio-settings-panel.tsx`. Testes: `tests/pigchicken-item-glow.cases.cjs`.

## O que é

- **Configurações do Pátio → Brilho dos itens** (`settings.itemGlow = { amount, color }`): um slider de 0 a 100% e, ao lado, um quadrado com a cor do brilho, que abre o seletor de cor.
- **0 (Desligado):** nada muda no desenho dos itens. É o padrão: Pátios salvos sem o ajuste ficam sem brilho. Duplo clique no slider volta a 0.
- **Com brilho:** cada item caído no chão (`combat.pickups`: itens dos suportes, Itens soltos, itens largados ou derrubados) ganha:
  - uma **coluna de luz** em pé no lugar do item, mais forte embaixo e no meio (quase branca ali), sumindo para cima e para os lados, com uma respiração leve;
  - uma **luz no chão** embaixo dele;
  - um **contorno aceso** em volta do desenho do item (luz difusa mais uma borda nítida), por baixo do item e por baixo do contorno azul/cinza de “pegar/trocar”.
- **Intensidade:** valores baixos ficam bem mais suaves (coluna baixa, estreita e quase transparente, contorno fino); a 100% é a coluna alta e forte da referência (cerca de 250 u de altura). A opacidade da coluna cresce mais que linearmente, para a parte de baixo do slider ser sutil.
- **Cor:** uma só para todos os itens, dourada (`#ffc93c`) por padrão. Mudar a cor com o brilho em 0 guarda a cor para quando ligar.
- **Gaiolas no chão:** só a coluna e a luz no chão; o contorno não se aplica ao desenho da gaiola.
- **Itens em voo** (arremessados) e itens nas mãos ou no inventário não brilham.

## Quem muda e onde fica salvo

- Quem pode editar o Pátio muda; os demais veem o valor (“Brilho dos itens: Desligado / N%”). Salvo com o Pátio como o resto de `settings`, então vale para todos no online.
- **Salvar no game** (admin) leva o brilho para `data/pigchicken/default-patio.json`, para Pátios vazios novos (`PATIO_DEFAULT_KEYS`). O **Padrão** do cabeçalho não mexe no brilho.

## Fora do escopo atual

- Cor por raridade do item (planejado para depois): hoje a cor é uma só, do Pátio.
