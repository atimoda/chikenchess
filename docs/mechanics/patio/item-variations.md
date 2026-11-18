# Pátio: Próxima variação e variações nas trocas

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). Código: ação `nextVariation` e `ChickenControls.variations` em `lib/chicken/controls.ts`; checkboxes em `components/chicken/chicken-controls-panel.tsx`; leitura em `components/pigchicken/parquinho.tsx` (`variationPress`, `pickVariations`, `groupVariations`); efeito em `lib/pigchicken/combat.ts` (`FrameInput.variation`, `pickVariations`, `groupVariations`). Testes: `tests/chicken-touch.cases.cjs` (bind, migração e checkboxes) e `tests/pigchicken-inventory.cases.cjs` (trocas).

## Próxima variação (18/11, v2.14.0)

- **Bind:** ação nova **Próxima variação** no grupo de itens do painel Controles, logo depois de Próximo utilitário. Padrão **Q** no Primary keyboard; Secondary keyboard e gamepad começam sem bind. **Próxima arma** perde o Q (fica sem tecla no Primary keyboard; RB no gamepad continua).
- **Migração** (marca `variationBind`, uma vez): Próxima arma só perde o Q se ainda estiver só com ele; Próxima variação só recebe o Q se nenhuma ação de nenhum teclado o usa. Binds personalizados ficam como estão.
- **Efeito:** um aperto troca a variação do item da mão.
  - Instrumento com mais de uma escala: a próxima escala, voltando à primeira depois da última. A troca tem os mesmos efeitos de sempre (corta o feixe do violino, toca a recarga da arma da família e mostra o nome da escala sobre a galinha). Com uma escala só, nada acontece.
  - Arma: ainda com um tambor só; o aperto mostra o tambor / pente em volta dela de novo (ver “Tambor” abaixo).
  - Utilitário: ainda sem variações; nada acontece.
- Com a Roda do inventário aberta, o 1º player não troca de variação. Vale para todos os players locais, no Parquinho, no Templo e na Vila. A rodinha do mouse pode ser arrastada para essa linha como para qualquer outra ação.

## Incluir variações nas trocas

- Depois do nome de cinco ações do painel Controles há um checkbox pequeno: **Próximo item** e **Item anterior** “Incluir variações”, **Próximo instrumento** “Incluir escalas”, **Próxima arma** “Incluir tambores” e **Próximo utilitário** “Incluir tipos”. Todos começam desligados; ficam salvos neste navegador com os outros controles (`variations`) e entram no Salvar no game do arquivo de controles padrão.
- **Desligado:** a troca vai direto ao próximo (ou anterior) item, sem passar pelas escalas. Cada instrumento guarda a escala em que estava.
- **Ligado em Próximo item / Item anterior:** o comportamento antigo da troca rápida: num instrumento com mais de uma escala passa primeiro pelas escalas naquele sentido e, sem mais escalas, vai ao item seguinte, chegando na primeira escala (voltando, na última). A rodinha do mouse segue o checkbox da ação para onde cada direção está arrastada (por padrão ↑ Próximo item, ↓ Item anterior). Shift + Próximo item volta e segue o checkbox de Próximo item.
- **Ligado em Próximo instrumento:** com um instrumento na mão, passa pelas escalas dele e, depois da última, vai ao próximo instrumento, que começa na primeira escala. Sendo o único instrumento, volta à primeira escala. Com um item de outro grupo na mão, vai ao primeiro instrumento como antes.
- **Próxima arma / Próximo utilitário:** o checkbox já existe e fica salvo, mas ainda não muda nada (as armas têm um tambor só e os utilitários ainda não têm tipos).
- Números, barra e Roda do inventário continuam trocando de item sem mexer na escala.

## Tambor e pente (18/11, v2.14.0)

Código: estado e geometria puros em `lib/pigchicken/ammo-hud.ts` (`ammoLook`, `hudSlot`, `stepAmmoView`); desenho em `components/pigchicken/draw/ammo-hud.ts` (`drawAmmoHud`, `drawAmmoAround`, `drawAmmoDrops`); ligação em `drawAmmo` de `components/pigchicken/parquinho.tsx`; opções `ammoAround` / `ammoHud` em `lib/pigchicken/settings.ts`. Testes: `tests/pigchicken-ammo-hud.cases.cjs`.

- **Quais itens:** só as armas com pente (Pistola, Submetralhadora, Rifle, Escopeta, Sniper, Lança-foguetes, Arco). Instrumentos, consumíveis, o Taco e a Granada não têm. Pentes de mais de 60 balas mostram 60.
- **Na mira:** um HUD pequeno (raio de 32 px) ao redor da retícula, desenhado junto da retícula de sempre, enquanto ela segura a arma; some quando o mouse está sobre um botão ou painel, como a retícula. Micro-ícones brancos com borda escura fina; vazio = só um contorno claro.
  - Pistola: tambor de revólver (só as câmaras, com a espoleta), marca vermelha do cano em cima; dispara a câmara de cima e gira uma câmara por tiro (0,12 s).
  - Escopeta: tambor de cartuchos (câmaras maiores, com aro e espoleta), marca do cano e giro iguais à Pistola.
  - Submetralhadora: anel em trios. Rifle: dois arcos laterais (esquerdo com a primeira metade). Sniper: balas num arco à direita de um colchete curvo. Lança-foguetes: foguetes nos flancos (pente de 1: só o da direita), com colchetes dos dois lados.
  - Arco: leque de flechas embaixo da mira, cada uma apontando para o centro; gastas da direita para a esquerda. Carregando o tiro, a próxima recua ao longo da própria linha (até 0,3 do raio); ao soltar ela sobe um pouco por essa linha e cai.
  - Nos estilos que não giram, sai a última bala acesa.
- **Em volta:** um anel de balas vistas de lado ao redor do ombro (Escopeta: um tambor de metal com os cartuchos), do tamanho da galinha (×1,5 da escala dela). Aparece ao pegar a arma (outra cópia da mesma arma conta como nova), ao apertar Próxima variação com a arma na mão, ao começar uma recarga e quando a munição sobe; some com o standby das escalas (os números “Fade out depois de” e “Tempo do fade out” da escala Primária no editor de Escalas). Atirar não faz o anel reaparecer: só se ele ainda estiver visível dá para ver o giro e a bala caindo. Não aparece enquanto ela é arrastada.
- **Tiro:** a munição que desceu desde o quadro anterior é um tiro (até 6 balas caindo por quadro). A bala do HUD pula para o lado dela e cai com gravidade (some em 1 s); a do anel cai do topo do anel (0,9 s). Só cai bala na vista que está ligada.
- **Recarga:** as balas acendem conforme a recarga avança; na recarga de um cartucho por vez (Escopeta) cada cartucho aparece quando entra.
- **Opções:** painel Câmera de Mira → “Tambores e pentes”: “Em volta” e “Na mira”, ambos ligados por padrão. Ficam salvos neste navegador para cada pessoa e não entram no Salvar no game.
- **Granada:** pente infinito (`ItemDef.infiniteAmmo`, só no código): não gasta nem recarrega, só respeita a cadência; uma Granada salva vazia volta cheia. O inventário e a linha de estado não mostram a contagem dela. O Pandeiro, que herda da Granada, continua com pente.
- Vale para todos os players locais (cada um com a sua retícula e o seu ombro), no Parquinho, no Templo e na Vila.
