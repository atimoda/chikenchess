# Pátio: Mesa de chickenchess

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). O Modo editor fica em [editor.md](editor.md), o Arquipélago das Almas em [arquipelago.md](arquipelago.md) e a partida em si em [powers.md](../powers.md) e [board-and-layout.md](../widgets/board-and-layout.md).

Código: regras puras em `lib/pigchicken/chess-table.ts`, fila e partida deste navegador em `lib/pigchicken/chess-table-store.ts`, o quadro do Pátio (Usar, slams, assento) em `components/pigchicken/chess-table-play.ts`, o desenho em `components/pigchicken/draw/chess-table.ts`, a partida sobre o Pátio em `components/pigchicken/patio-chess.tsx` (prop `embed` de `components/chess-game.tsx`). Teste: `tests/pigchicken-chess-table.cases.cjs`.

## O elemento (26/11, v2.19.0)

- Elemento `chesstable` (“Mesa de chickenchess”) do grupo **Jogos** da paleta do Modo editor, de tamanho fixo 440 × 190: uma mesinha de madeira com um tabuleiro de chickenchess e peças em cima e um banquinho de assento vermelho de cada lado. Solto da paleta, cai no chão como os outros elementos que ficam de pé.
- Colisão: a mesa (do tampo ao chão) é um bloco duro, então dá para subir no tampo e não dá para atravessá-la; cada banquinho é um piso de mão única (sobe por baixo, cai com Chocar).
- Parâmetros (Editar → “Ano/cidade” e “Raio do som”, salvos em `params.chessTable`):
  - **Ano/cidade**: “Random” (padrão; uma cidade sorteada a cada partida) ou uma cidade do mapa do chickenchess, na ordem do ano e do nome (“1723 Leipzig”).
  - **Raio do som**: 0 (som desligado), 400, 800, 1200 (padrão), 1600, 2400 ou 3200 unidades.

## As opções embaixo do tampo

- Sob a borda do tampo ficam duas etiquetas no estilo das etiquetas de zona: a cidade (metade esquerda) e o raio (metade direita, “raio 1200” ou “som desligado”).
- **Slam**: pular e cair segurando Chocar em cima do tampo passa a opção daquela metade para o valor seguinte: Random, cada cidade e de volta a Random; o raio sobe os degraus e volta a 0. A etiqueta gira ao trocar. Vale para qualquer player deste navegador e também durante a partida.
- Com uma cidade escolhida, a foto dela aparece numa moldura de polaroid acima da mesa (some com Random).
- O que muda por slam vale enquanto o Pátio está aberto neste navegador e não é salvo no layout; o Editar do Modo editor guarda os valores iniciais.
- O motor da galinha agora avisa um pouso segurando Chocar em qualquer piso (`takeLandSlam`), não só no chão; por enquanto só a mesa usa isso.

## A fila

- Em pé num banquinho (em cima dele ou no chão junto dele), o player vê embaixo `<bind de Usar / pegar> - <ação>`; Usar faz a ação e não pega item nesse quadro:
  - **Entrar na fila**: banquinho livre. O nome do player aparece acima do banquinho.
  - **Sair da fila**: no banquinho em que já está.
  - **Iniciar contra um bot**: já pronto num banquinho e no outro, livre. “Bot” aparece acima desse banquinho, em azul claro.
  - **Entrar no lugar do bot**: durante uma partida contra o bot, para um player que não está nela, no banquinho do bot. A partida segue entre os dois players deste navegador (as duas cores no mesmo tabuleiro).
- Quando os dois banquinhos têm alguém, começa a contagem. Um player fica numa fila só: entrar em outra mesa o tira da anterior. Quem se afasta mais de 700 unidades do meio da mesa sai da fila (não da partida).
- Uma partida por navegador: dois prontos em outra mesa esperam a partida acabar e começam sozinhos depois.

## A partida

- **Contagem**: 3, 2, 1 em números enormes no meio da tela (3 s), com os players já presos nos banquinhos (o banquinho da esquerda joga com as brancas).
- Depois, a partida de chickenchess da campanha aparece transparente sobre o Pátio, abaixo do cabeçalho do Pátio (que continua clicável): o tabuleiro se monta com a mesma entrada da campanha, e os widgets, as cartas, os poderes, a música e o visual são os da campanha. O título e os seletores de tom, escala e progressão ficam centralizados acima do tabuleiro. Os menus da partida abrem por cima do Pátio.
- Contra o bot, as brancas são do player e as pretas do ChickenBot. Entre dois players, ninguém responde sozinho: cada um move na sua vez (o tabuleiro gira para quem joga, e o status diz “White's move” / “Black's move”); os ovos e os poderes da partida são os do lado das brancas.
- **Som**: a música da partida toca com volume cheio até a metade do raio e some suavemente até o raio, medido do primeiro player ao meio da mesa; fora do raio o motor musical da partida desliga (com 2 s de folga para quem anda na borda). Raio 0: sem música. Mudar o raio por slam vale na hora.
- Uma troca de cidade por slam durante a partida troca a cidade (e a música) da partida.
- **Fim**: no xeque-mate, o player deste navegador do lado vencedor ganha uma **Chave de ouro**, uma vez por partida (“Chave de ouro!” e um brilho dourado sobre ele). Empate ou vitória do bot não dão chave. “Sair da partida” (o botão de voltar da campanha) fecha a partida e libera a mesa e os banquinhos.

## Chave de ouro

- Item `chesskey` (“Chave de ouro”), grupo Chaves: consumível em pilha até 9 no grupo Utilitário do inventário, ajustável no painel Itens (grupo Chaves). Só se ganha vencendo na mesa: não está nos suportes, no Item solto nem nos Baús. Não abre Baús (não é uma Chave): abre o [Ativador de grid](mine-activator.md) trancado. Junto de um, Usar gasta uma Chave de ouro e liga a grade do Campo minado para todos.

## No Arquipélago das Almas

- A mesa fica no meio da Arena das Almas (chão do centro), com a Jukebox à esquerda e o Gongo e o Baú à direita. No banco, a migração `202611260001_arquipelago_chess_table.sql` acrescenta a mesa ao layout salvo (uma vez) e só afasta a Jukebox, o Gongo e o Baú se ainda estiverem onde o exemplo os pôs.

## Escopo e limites

- Vale no Pátio local e no online, para os players deste navegador. A fila, as opções por slam e a partida não passam pela rede: outro navegador na mesma sala vê a mesa e as etiquetas salvas, mas não a fila nem a partida deste.
- O modo botões da partida e as cartas podem ser arrastados pelo fundo, como em qualquer partida.
