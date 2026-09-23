# Análise de xadrez: custo e próximos testes

## Configuração atual

A partida usa Stockfish.js 19 Lite, single-thread, em WebAssembly. O arquivo WASM servido tem cerca de 1,7 MiB. Um único worker alterna três trabalhos por posição: avaliação rápida, ranking de todos os lances legais e, quando é a vez da adversária, escolha do lance. Não existe busca ociosa ou ponderação enquanto o usuário pensa.

| Perfil | Hash | Avaliação | Ranking completo | Lance da adversária |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 8 MiB | 4.000 nós / 80 ms | 12.000 nós / 180 ms | 6.000 nós / 100 ms |
| Restrito | 4 MiB | 1.500 nós / 60 ms | 8.000 nós / 120 ms | 2.500 nós / 80 ms |

Cada busca termina no primeiro limite atingido. O ranking usa MultiPV igual à quantidade de lances legais porque encontrar os três piores exige comparar a raiz inteira. Mostrar três itens em vez de cinco reduz desenho e leitura, mas quase não reduz essa parte da busca. A interface só aceita uma iteração na qual todos os lances chegaram à mesma profundidade; se isso não acontece, não inventa a lista dos piores.

## Medição inicial

O comando `node scripts/benchmark-chess.cjs` executa o worker real em cinco posições: inicial, depois de e4, abertura desenvolvida, meio-jogo complexo e mate. Em 22/09/2026, neste computador, todos os rankings completaram:

| Perfil | Inicialização | Avaliação rápida | Ranking (tempo informado pelo motor) | Total por posição |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 295 ms | 12–332 ms | 21–43 ms | 35–377 ms |
| Restrito | 232 ms | 7–252 ms | 10–22 ms | 22–276 ms |

A primeira posição inclui aquecimento do WASM; as seguintes ficaram muito abaixo do teto. A posição inicial marcou +0,26 e a posição após e4, +0,31 no perfil desktop; no perfil restrito, +0,15 e +0,19. Isso confirma apenas que o erro grosseiro anterior desapareceu. Busca tão curta continua sujeita a oscilações e não é análise de torneio.

O benchmark mede latência, nós e profundidade. Ele não mede porcentagem de CPU, impacto no áudio, consumo total de memória nem aquecimento de um celular. Esses quatro itens precisam de perfil em aparelhos reais, com a música e os widgets desejados ligados. O painel Strudel expõe os números de cada posição para facilitar esse teste.

## Alternativas se o custo incomodar

1. **Manter Stockfish e remover as três piores.** MultiPV=3 encontra as melhores com muito menos trabalho e preserva a melhor qualidade por nó. É a redução de custo mais efetiva.
2. **Calcular as piores sob demanda.** A avaliação e as melhores aparecem após o lance; a busca da raiz inteira só começa quando alguém clica em “piores jogadas”. Evita trabalho que talvez não seja usado.
3. **Reduzir os orçamentos dinamicamente.** Dá para usar menos nós enquanto o áudio está pesado ou em aparelhos restritos, aceitando maior variação e mais rankings incompletos.
4. **Usar uma tabela de aberturas no início.** Um pequeno repertório local responde instantaneamente nos primeiros lances. Depois ainda é necessário um motor para posições novas.
5. **Usar um modelo menor ou avaliação estática.** Pode carregar menos e responder rápido, mas perde força, explicabilidade e maturidade. Para xadrez padrão no navegador, Stockfish Lite single-thread continua sendo a referência prática; trocar de framework não elimina o custo de comparar todas as jogadas legais para achar as piores.

A próxima comparação útil é entre a configuração atual e “piores sob demanda”, no mesmo aparelho e mesma cidade, medindo frame time, glitches de áudio, uso de memória e bateria durante 20–30 lances. Se houver impacto perceptível, a segunda opção acima é o primeiro experimento recomendado.
