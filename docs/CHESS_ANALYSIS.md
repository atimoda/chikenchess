# Análise de xadrez: custo e próximos testes

## Configuração atual

A partida usa Stockfish.js 19 Lite, single-thread, em WebAssembly. O arquivo WASM servido tem cerca de 1,7 MiB. Um único worker alterna três trabalhos por posição: avaliação rápida, escolha curta do lance da adversária quando é a vez das pretas, e ranking de todos os lances legais. Não existe busca ociosa ou ponderação enquanto o usuário pensa.

| Perfil | Hash | Avaliação | Ranking completo | Lance da adversária |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 8 MiB | 6.000 nós / 120 ms | profundidade 15, até 25.000.000 nós / 30 s | 6.000 nós / 100 ms |
| Restrito | 4 MiB | 2.500 nós / 80 ms | 40.000 nós / 350 ms | 2.500 nós / 80 ms |

Cada busca termina no primeiro limite atingido. No desktop, o ranking normal e o tático compartilham o alvo de profundidade 15 e os mesmos tetos; no perfil restrito, mate ou vantagem absoluta de pelo menos dez peões na avaliação rápida ampliam o ranking para 120.000 nós / 700 ms. O ranking usa MultiPV igual à quantidade de lances legais porque encontrar os três piores exige comparar a raiz inteira. Mostrar três itens em vez de cinco reduz desenho e leitura, mas quase não reduz essa parte da busca. A interface só aceita uma iteração na qual todos os lances chegaram à mesma profundidade; se isso não acontece, não inventa a lista dos piores nem guarda o ranking no cache. As diferenças entre lances usam a melhor linha dessa mesma iteração. O botão Debug stockfish exibe as linhas recebidas durante a busca, inclusive variantes. Best/Worst mostram prévias a cada iteração completa; as setas abertas acompanham novas profundidades, recalculando número e cor da etiqueta a partir do score exibido em cada ranking completo. Uma iteração completa da posição anterior já pode premiar o lance do jogador antes de `bestmove`. A resposta da adversária é sorteada para 1–5 s após o lance do jogador e usa a candidata legal disponível nesse instante; o ranking longo não bloqueia esse prazo.

## Medição inicial

O comando `node scripts/benchmark-chess.cjs` executa o worker real em cinco posições: inicial, depois de e4, abertura desenvolvida, meio-jogo complexo e mate. Em 22/09/2026, neste computador, todos os rankings completaram:

| Perfil | Inicialização | Avaliação rápida | Ranking (tempo informado pelo motor) | Total por posição |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 295 ms | 12–332 ms | 21–43 ms | 35–377 ms |
| Restrito | 232 ms | 7–252 ms | 10–22 ms | 22–276 ms |

A primeira posição inclui aquecimento do WASM; as seguintes ficaram muito abaixo do teto. A posição inicial marcou +0,26 e a posição após e4, +0,31 no perfil desktop; no perfil restrito, +0,15 e +0,19. Isso confirma apenas que o erro grosseiro anterior desapareceu. Busca tão curta continua sujeita a oscilações e não é análise de torneio.

Em 29/09/2026, no computador de desenvolvimento, medições isoladas anteriores à escolha do alvo atual mostraram: a posição do primeiro print do Debug (19 lances) completou profundidade 22 em 26,6 s / 17,1 milhões de nós; a do segundo print completou 21 em 14,5 s / 9,9 milhões de nós e iniciou 22 antes do teto de 20 s; um meio-jogo com 48 lances completou apenas 16 em 18,2 s / 12,1 milhões de nós. O alvo foi reduzido posteriormente para 15. Essas medições não incluem áudio nem representam desempenho de outros computadores.

O benchmark mede latência, nós e profundidade. Os números da tabela acima são da configuração antiga, preservados como linha de base, não representam os orçamentos atuais. Ele não mede porcentagem de CPU, impacto no áudio, consumo total de memória nem aquecimento de um celular. Esses quatro itens precisam de perfil em aparelhos reais, com a música e os widgets desejados ligados. O Debug stockfish expõe os números de cada posição para facilitar esse teste.

## Alternativas se o custo incomodar

1. **Manter Stockfish e remover as três piores.** MultiPV=3 encontra as melhores com muito menos trabalho e preserva a melhor qualidade por nó. É a redução de custo mais efetiva.
2. **Calcular as piores sob demanda.** A avaliação e as melhores aparecem após o lance; a busca da raiz inteira só começa quando alguém clica em “piores jogadas”. Evita trabalho que talvez não seja usado.
3. **Reduzir os orçamentos dinamicamente.** Dá para usar menos nós enquanto o áudio está pesado ou em aparelhos restritos, aceitando maior variação e mais rankings incompletos.
4. **Usar uma tabela de aberturas no início.** Um pequeno repertório local responde instantaneamente nos primeiros lances. Depois ainda é necessário um motor para posições novas.
5. **Usar um modelo menor ou avaliação estática.** Pode carregar menos e responder rápido, mas perde força, explicabilidade e maturidade. Para xadrez padrão no navegador, Stockfish Lite single-thread continua sendo a referência prática; trocar de framework não elimina o custo de comparar todas as jogadas legais para achar as piores.

A próxima comparação útil é entre a configuração atual e “piores sob demanda”, no mesmo aparelho e mesma cidade, medindo frame time, glitches de áudio, uso de memória e bateria durante 20–30 lances. Se houver impacto perceptível, a segunda opção acima é o primeiro experimento recomendado.
