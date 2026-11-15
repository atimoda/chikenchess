# Pátio: Baú e Chave

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). O resto do Modo editor fica em [editor.md](editor.md); as Gaiolas, em [cages.md](cages.md), e as almas, em [souls.md](souls.md).

Código: `lib/pigchicken/chests.ts` (parâmetros, limpeza, regra de abertura e sorteio; puro), elemento `chest` em `lib/pigchicken/layout.ts`, `layout-sync.ts` (cria, move e tira os baús), `combat.ts` (`chests`, `addChest`, `chestNear`, `keys`, `openChest`), desenho em `components/pigchicken/draw/chests.ts`, Editar em `components/pigchicken/chest-fields.tsx`, sons `chest`/`chestLegend`/`locked` em `lib/pigchicken/sfx.ts`. Testes: `tests/pigchicken-chests.cases.cjs`.

## Baú no Modo editor (13/11, v2.10.0)

- **Paleta:** grupo **Baús**, com “Baú simples” e “Baú lendário”. Arrastado para o Pátio, cai no chão ou na plataforma logo abaixo, como suportes e alvos. Tem tamanho fixo (92 × 70), não gira, não colide com nada e é desenhado pelo jogo (camada fixa, como suportes e Gongo). Seleciona, move, tranca, tem gravidade, duplica e apaga como os outros elementos.
- **Editar:**
  - **Raridade:** Simples (brilho amarelo suave) ou Lendário (brilho azul mais forte e mais largo, metal azul-claro).
  - **Abre com:** Livre (qualquer um), Chave ou Merecimento (almas nas gaiolas; até 14/11, Bag of souls). Com Merecimento aparece “Almas nas gaiolas”, de 1 a 999 (padrão 5).
  - **Fecha de novo após (s):** 0 a 600. 0 (padrão): aberto, fica aberto até o Pátio ser aberto de novo. Acima de 0: esse tempo depois de aberto, a tampa fecha e ele pode ser aberto outra vez, com novo sorteio.
  - **Itens:** uma lista de até 12 linhas. Cada linha é um item específico (qualquer item de suporte, inclusive a Chave) ou um sorteio de grupo (Qualquer item, Uma arma, Um instrumento, Um esportivo, Uma habilidade especial, Um item de magia, Uma chave), com a chance de 0 a 100% (padrão 100). “+ Item” acrescenta uma linha com Qualquer item a 100%; o X a tira.
  - **Padrões:** o simples tem uma linha, Qualquer item a 100%. O lendário tem Uma arma 100%, Um instrumento 100% e Um item de magia 50%. Trocar a raridade no Editar não muda a lista. Ambos começam com Abre com Livre.
- **Arrastar um item para dentro (15/11, v2.11.0):** um cartão de item da paleta (Esportivos, Armas, Instrumentos, Habilidades especiais, Magia, Chaves, Gaiolas) arrastado sobre um baú do Pátio (a caixa dele mais 10 unidades em volta) e solto ali entra na lista do baú como uma nova linha desse item, com 100% de chance, em vez de virar um suporte. As linhas que já existiam continuam. Enquanto o cartão está sobre o baú, o baú ganha uma moldura na cor da raridade e, no ponteiro, o desenho do item aparece com o ícone de inserir (caixa com +) no lugar da prévia do suporte. Um baú trancado no editor ou com a lista cheia (12 linhas) não aceita: não mostra o ícone, e o item solto ali vira suporte como sempre. Com baús sobrepostos, vale o da frente. É um passo do histórico (Ctrl+Z desfaz) e funciona com o switch de edição ligado ou desligado. Arrastar um suporte ou item solto que já está no Pátio para cima de um baú só o move. Código: `addChestItem` em `chests.ts`, `chestAt`/`insertInChest`/`InsertHint` em `patio-editor.tsx`.
- **Persistência:** `params.chest` salvo com o layout; valores fora dos limites são presos a eles, linhas com item desconhecido saem.

## Abrir

- **Gatilho:** Pegar (a tecla ou botão de Pegar; a tecla de Correr, que também pega item, não abre) com o boneco perto de um baú fechado: até a distância de pegar um item mais 30 px para cada lado, da tampa ao chão do baú. Com vários perto, vale o mais próximo na horizontal.
- **Prioridade:** um item oferecido aos pés (para pegar ou para equipar) vem antes: o Pegar o pega, e a dica do baú some enquanto o item é oferecido. O próximo Pegar abre o baú.
- **Dica:** perto de um baú fechado, aparece embaixo dele, na cor do brilho, “<tecla>: abrir”; se falta algo, em vermelho claro, “precisa de chave” ou “almas nas gaiolas N/M” (almas do player / pedidas). O primeiro player local perto mostra a sua.
- **Fechadura no desenho:** Livre, um trinco; Chave, um cadeado com fechadura; Merecimento, um selo redondo com o número de almas pedido. Some quando a tampa abre.
- **Sem o que pede:** o baú treme por 0,35 s, toca o som de trava e mostra “Precisa de uma chave” ou “Almas nas gaiolas: N/M”.
- **Abrindo:** com Chave, uma chave do inventário de quem abriu é gasta (a última sai do inventário). Com Merecimento, as almas continuam nas gaiolas (contam as de todas as gaiolas de quem abre). A tampa sobe em 0,25 s, sai um facho de luz para cima por 2 s (mais alto no lendário), faíscas na cor da raridade e o som de abertura (rangido e um arpejo; o lendário com mais notas e brilho). Aberto, o brilho fica mais fraco.
- **Itens:** cada linha é sorteada por conta própria pela sua chance; um grupo dá um dos seus itens, ao acaso. Os que saem pulam juntos de cima do baú, lado a lado (30 px entre eles), e caem no chão ou na plataforma em volta, como itens soltos (sem reposição). Ninguém os pega nos primeiros 0,45 s. Nada sorteado: “Vazio”.
- **Mover ou editar um baú aberto** não o fecha; a nova lista vale na próxima abertura.
- **Escopo:** todos os Pátios e modos, todos os players locais (cada um com as suas chaves e as suas gaiolas).

## No Pátio online (13/11, v2.10.0)

`lib/pigchicken/net-chests.ts` (dados e regras), envio em `lib/pigchicken/net-world-sync.ts`, `sendNetChests` em `lib/chicken/online-room.ts`, repasse em `server/src/patio-room.mjs` (`onChests`); testes em `tests/pigchicken-chests.cases.cjs` e `server/test/room.test.mjs`.

- **Abrir:** quem abre confere a chave ou as almas do próprio player, abre na hora e avisa todos os navegadores (`chests` com `o: 1`). Nos outros, o baú abre também, com a tampa subindo, o facho de luz, as faíscas e o som. Os itens saem só no navegador de quem abriu (os itens no chão são de cada navegador, como os dos suportes).
- **Lista do dono:** o dono do lobby manda a cada 2 s, e quando alguém entra, os baús abertos no mundo dele e há quanto tempo. Quem entrou depois vê esses baús já abertos, sem animação nem som. O relógio de “Fecha de novo após” segue o do dono. Um baú que está fechado no dono fecha nos outros, menos um aberto ali há menos de 3 s (o aviso ainda está a caminho do dono).
- **Ao mesmo tempo:** dois navegadores que abrem o mesmo baú antes de o aviso de um chegar ao outro abrem os dois, e cada um recebe os seus itens.
- **Servidor:** só repassa, conferindo tamanho e ritmo (até 64 baús por mensagem); a lista sem `o` vale só do dono. Ele avisa em `hello.caps.chests`; com um servidor antigo os baús ficam locais em cada navegador.

## Chave (13/11, v2.10.0)

- Item `key` (“Chave”), grupo Chaves: suportes da paleta (grupo Chaves), Item solto, baús e painel Itens. Tempo de reposição padrão do suporte: 0,1 s, como os consumíveis.
- Fica em pilha, até 9, no grupo Utilitário do inventário; pegar outra soma à pilha.
- Atirar com a chave na mão não faz nada; Golpe e arremesso funcionam como em qualquer consumível. No painel Itens ela mostra os mesmos grupos de um consumível, menos Efeito.
