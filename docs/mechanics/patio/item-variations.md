# Pátio: Próxima variação e variações nas trocas

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). Código: ação `nextVariation` e `ChickenControls.variations` em `lib/chicken/controls.ts`; checkboxes em `components/chicken/chicken-controls-panel.tsx`; leitura em `components/pigchicken/parquinho.tsx` (`variationPress`, `pickVariations`, `groupVariations`); efeito em `lib/pigchicken/combat.ts` (`FrameInput.variation`, `pickVariations`, `groupVariations`). Testes: `tests/chicken-touch.cases.cjs` (bind, migração e checkboxes) e `tests/pigchicken-inventory.cases.cjs` (trocas).

## Próxima variação (17/11, v2.13.0)

- **Bind:** ação nova **Próxima variação** no grupo de itens do painel Controles, logo depois de Próximo utilitário. Padrão **Q** no Primary keyboard; Secondary keyboard e gamepad começam sem bind. **Próxima arma** perde o Q (fica sem tecla no Primary keyboard; RB no gamepad continua).
- **Migração** (marca `variationBind`, uma vez): Próxima arma só perde o Q se ainda estiver só com ele; Próxima variação só recebe o Q se nenhuma ação de nenhum teclado o usa. Binds personalizados ficam como estão.
- **Efeito:** um aperto troca a variação do item da mão.
  - Instrumento com mais de uma escala: a próxima escala, voltando à primeira depois da última. A troca tem os mesmos efeitos de sempre (corta o feixe do violino, toca a recarga da arma da família e mostra o nome da escala sobre a galinha). Com uma escala só, nada acontece.
  - Arma: o tambor (a desenhar; ver “Tambor” abaixo). Por enquanto nada muda.
  - Utilitário: ainda sem variações; nada acontece.
- Com a Roda do inventário aberta, o 1º player não troca de variação. Vale para todos os players locais, no Parquinho, no Templo e na Vila. A rodinha do mouse pode ser arrastada para essa linha como para qualquer outra ação.

## Incluir variações nas trocas

- Depois do nome de cinco ações do painel Controles há um checkbox pequeno: **Próximo item** e **Item anterior** “Incluir variações”, **Próximo instrumento** “Incluir escalas”, **Próxima arma** “Incluir tambores” e **Próximo utilitário** “Incluir tipos”. Todos começam desligados; ficam salvos neste navegador com os outros controles (`variations`) e entram no Salvar no game do arquivo de controles padrão.
- **Desligado:** a troca vai direto ao próximo (ou anterior) item, sem passar pelas escalas. Cada instrumento guarda a escala em que estava.
- **Ligado em Próximo item / Item anterior:** o comportamento antigo da troca rápida: num instrumento com mais de uma escala passa primeiro pelas escalas naquele sentido e, sem mais escalas, vai ao item seguinte, chegando na primeira escala (voltando, na última). A rodinha do mouse segue o checkbox da ação para onde cada direção está arrastada (por padrão ↑ Próximo item, ↓ Item anterior). Shift + Próximo item volta e segue o checkbox de Próximo item.
- **Ligado em Próximo instrumento:** com um instrumento na mão, passa pelas escalas dele e, depois da última, vai ao próximo instrumento, que começa na primeira escala. Sendo o único instrumento, volta à primeira escala. Com um item de outro grupo na mão, vai ao primeiro instrumento como antes.
- **Próxima arma / Próximo utilitário:** o checkbox já existe e fica salvo, mas ainda não muda nada (as armas têm um tambor só e os utilitários ainda não têm tipos).
- Números, barra e Roda do inventário continuam trocando de item sem mexer na escala.

## Tambor

Em planejamento: o desenho de tambores e pentes ainda está sendo decidido.
