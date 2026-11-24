# Pátio: brilho dos itens

Comportamento atual (17/11, v2.13.0; cores por grupo 24/11, v2.16.1). Vale em todos os modos do Pátio (local, online, Modo editor), para todos os players.

Código: `lib/pigchicken/item-glow.ts` (valor salvo, normalização, grupo e cor de cada item, `itemGlowGroup`/`itemGlowColor`, e a aparência por intensidade, `itemGlowLook`), `components/pigchicken/draw/item-glow.ts` (desenho da coluna, da luz no chão e do contorno), chamado em `drawWorld` de `components/pigchicken/draw/world.ts`; controle em `components/pigchicken/patio-settings-panel.tsx`. Testes: `tests/pigchicken-item-glow.cases.cjs`.

## O que é

- **Configurações do Pátio → Brilho dos itens** (`settings.itemGlow = { amount, colors: { instrument, weapon, utility, consumable } }`): um slider de 0 a 100% e, embaixo, um quadrado de cor por grupo (Instrumentos, Armas, Utilitários, Consumíveis), cada um abrindo o seletor de cor daquele grupo.
- **0 (Desligado):** nada muda no desenho dos itens. É o padrão: Pátios salvos sem o ajuste ficam sem brilho. Duplo clique no slider volta a 0.
- **Com brilho:** cada item caído no chão (`combat.pickups`: itens dos suportes, Itens soltos, itens largados ou derrubados) ganha:
  - uma **coluna de luz** em pé no lugar do item, mais forte embaixo e no meio (quase branca ali), sumindo para cima e para os lados, com uma respiração leve;
  - uma **luz no chão** embaixo dele;
  - um **contorno aceso** em volta do desenho do item (luz difusa mais uma borda nítida), por baixo do item e por baixo do contorno azul/cinza de “pegar/trocar”.
- **Intensidade:** valores baixos ficam bem mais suaves (coluna baixa, estreita e quase transparente, contorno fino); a 100% é a coluna alta e forte da referência (cerca de 250 u de altura). A opacidade da coluna cresce mais que linearmente, para a parte de baixo do slider ser sutil.
- **Cor por grupo do item** (`itemGlowGroup`): **Instrumentos** (instrumentos e os fixos) dourado `#ffc93c`; **Armas** (Pistola, SMG, Rifle, Pump, Sniper, Lançador, Granada, Arco) roxo `#b05cff`; **Consumíveis** (Bear Gummy, Cok) verde `#3ddc84`; **Utilitários** (todo o resto: esportivos, magia, chaves, Chave dourada e Bomba da Grade de blocos, gaiolas) azul `#3d8bff`. O grupo vem do tipo do item, não do grupo em que o player o arrastou no inventário. Coluna, luz no chão e contorno usam a cor do grupo.
- Mudar uma cor com o brilho em 0 guarda as cores para quando ligar. Com brilho 0 e as cores padrão, o ajuste sai de `settings`. Duplo clique no slider zera só a intensidade, não as cores.
- **Pátios salvos antes dos grupos** (`itemGlow.color`, uma cor só): essa cor passa a ser a dos Instrumentos; os outros grupos recebem as cores padrão.
- **Gaiolas no chão:** só a coluna e a luz no chão; o contorno não se aplica ao desenho da gaiola.
- **Itens em voo** (arremessados) e itens nas mãos ou no inventário não brilham.

## Quem muda e onde fica salvo

- Quem pode editar o Pátio muda; os demais veem o valor (“Brilho dos itens: Desligado / N%”). Salvo com o Pátio como o resto de `settings`, então vale para todos no online.
- **Salvar no game** (admin) leva o brilho para `data/pigchicken/default-patio.json`, para Pátios vazios novos (`PATIO_DEFAULT_KEYS`). O **Padrão** do cabeçalho não mexe no brilho.

## Fora do escopo atual

- Cor por raridade do item (planejado para depois): hoje a cor é a do grupo, do Pátio.
