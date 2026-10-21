# Criativo e persistência

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../GAME_MECHANICS.md).

## Criativo e persistência

| Ação | Resultado |
| --- | --- |
| Cidade para experimentar + Carregar kit da cidade | Seleciona qualquer cidade e carrega sua versão salva neste navegador, ou seu kit composto inicial; restaura posições e ativa as 16 brancas para escuta |
| Kit inicial da cidade | Carrega o arranjo composto de fábrica, sem sobrescrever o kit salvo |
| Gerar kit aleatório | Sorteia outra configuração vinculada à cidade escolhida, ativa as 16 brancas e inicia a escuta. Só Salvar kit da fase a adota na próxima partida |
| Düsseldorf original · samples | Carrega o preset de fábrica com 16 brancas; não sobrescreve o kit salvo automaticamente |
| Ícone de energia da peça | Liga/desliga diretamente seu loop, sem exigir lance legal. Durante a audição manual de uma peça inativa, usa o estado visual intermediário; cancelar mantém a peça inativa e confirmar o movimento a ativa |
| Solo | Vários botões Solo podem ficar ligados. Ao ligar o primeiro, o Criativo guarda as vozes que estavam tocando e silencia as demais; ligar/desligar Solos mantém somente as peças marcadas. Ao desligar o último, restaura as vozes guardadas e conserva ativas as peças que passaram por Solo. Pausas MIDI e presença do arranjo por peça continuam valendo |
| Audição manual | O Solo substitui a antiga audição por botão do padrão completo. “Segure para ouvir” foi removido; segurar uma peça continua tocando notas individuais, não a frase inteira |
| Tocar casas | Usa o instrumento selecionado nas casas, sem mover peças |
| Mover/trocar peças | Usa o mesmo desenho, captura do ponteiro e imagem arrastada do tabuleiro da partida; confirma posição e ativa a peça sem regras de xadrez ou Stockfish. Uma casa ocupada troca as peças. A peça original fica oculta até soltar/cancelar |
| Salvar kit da fase | Salva o kit associado à cidade no armazenamento local; a próxima partida usa essa configuração |
| Exportar/importar | JSON v7 com rolls MIDI, fontes, comportamento, arranjo global e atribuições por peça; schema e compilação Strudel são validados |

Não há ainda catálogo oficial em servidor, inventário online ou sincronização automática entre dispositivos. Armazenamento do kit, rascunho criativo e ajustes temporários da partida são camadas distintas.

No Criativo, em desktop, tablet e tela de celular em paisagem, Tabuleiro/Estados e Eventos/Banda ocupam a coluna esquerda, Instrumento a primeira coluna direita e Parâmetros a segunda. A Banda fica no fim da coluna do tabuleiro e mostra diretamente **32 vozes independentes**, sem numeração de painel nem legenda redundante de loop. Cada coluna tem rolagem própria, com barras visuais escondidas (scroll por roda, trackpad e toque preservado); as colunas não têm gap. O seletor de kit ocupa uma faixa inteira acima do transporte. Em celular em retrato, o tabuleiro volta ao topo e os painéis seguem abaixo para preservar a área útil e o toque.
