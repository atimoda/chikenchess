# CPU: arraste e padrões — v0.3.3

Branch: `codex/cpu-drag-optimization`. O código exportado não é avaliado pelo playback: `pattern-compiler.ts` constrói objetos Strudel; `code-export.ts` produz texto. Otimizar só o texto não resolve o arraste.

## Mudanças implementadas

- Cruzar casas da mesma peça atualiza apenas a voz manual. Entrada/saída ainda resolvem a banda para suspender/restaurar o loop correto. Contexto já rodando não passa novamente pelo unlock/refresh. Carregamento e cancelamento conservam a verificação de identidade do gesto.
- Cache fraco por `VoiceSpec` evita serializar novamente o mesmo objeto durante consultas do monitor. Mudanças reais de snapshot continuam usando assinatura/compilação.
- No Criativo, mover a imagem usa transformação de DOM, não estado React por pixel. Leitura/editor foram memoizados com callback estável; seus relógios continuam funcionando. Código fechado não é gerado.
- `manual-reverb-cache.ts`: adaptador para o orbit do Superdough instalado. Reutiliza somente buffers de impulso já gerados, em cache de até oito configurações por runtime. Cada nota recebe um convolver novo; caudas e áudio de peças diferentes não são compartilhados. Impulso ainda pendente ou configuração nova usa a fábrica original. IR customizado conserva o caminho original. Dispose limpa o cache. O ruído aleatório que forma o reverb fica estável entre casas, em vez de ser sorteado de novo; não se promete equivalência de waveform bit a bit.
- `roll-optimizer.ts`: representação intermediária de lanes/segmentos para notas explícitas. Agrupa velocity, slide/tempo e pan iguais; acordes exigem início e duração idênticos. Sobreposições ficam em lanes diferentes, inclusive notas repetidas. Não congela padrões algorítmicos numa janela finita.
- Compilador usa segmentos diretamente; exportador emite mini-notation ponderada. Bancos fixos compilam somente a variação necessária. O exportador evita stacks unitários/vazios e mostra KB, stacks, timeCat, orbits e filtros declarados. Essas contagens NÃO são medições de nós DSP ativos.

## Avaliação das sugestões recebidas

| Sugestão | Decisão e motivo |
| --- | --- |
| 1–3, 12–14: agrupar eventos/velocity/acordes e emitir `@` | Implementado para piano rolls. Runtime evita o parser textual: ele aumentou muito o custo de compilação. A exportação remove resíduos abaixo de 1e-12; testes comparam tempo a 1e-10. |
| 4: stacks redundantes | Exportador remove stacks com zero/um elemento; lanes únicas não precisam de stack no compilador. |
| 5: substituir seleção e máscaras por `arrange` | Não aplicado automaticamente. Há loops com fase global, reinício por seção e seletores editáveis. São semânticas diferentes, não aliases. |
| 6: simplificar automações/pickRestart | Preservado: bancos de groove e automação podem ter comprimentos independentes. Exportação usa factories explícitas. |
| 7: dois orbits | A primeira rodada preservou orbits individuais. Depois de medir 32/2/4 buses no Strudel, a segunda rodada adotou quatro: dois por equipe. O runtime passou a remover um bus somente quando sua última voz sai; audições permanecem isoladas. |
| 8 e 11: omitir defaults/efeitos zerados | Não removidos indiscriminadamente. Superdough já ignora o send de delay quando o nível é zero; limpar texto não eliminaria um nó existente. Defaults dependem de fonte/automação. |
| 9–10: remover filtros, ADSR e clip de drums | Não aplicado: esses valores fazem parte do timbre/articulação atuais, mesmo em frequências extremas. Não são equivalência sonora comprovada. |
| 15: priorizar música e custo real | Testes de eventos/exportação, regressões de gesto e benchmarks separados. Código menor não é prova de CPU menor. |
| 16: métricas | Contagens estruturais opcionais no painel de código do Criativo, calculadas somente quando aberto. Não inventamos número finito de eventos para padrões potencialmente infinitos. |

Evidência local dos efeitos/semântica: `node_modules/superdough/superdoughoutput.mjs` (`Orbit.getReverb`, `disconnect`); `reverbGen.mjs` (geração por amostra e filtragem offline); `superdough.mjs` (send de delay condicional); `@strudel/core/pick.mjs` e `pattern.mjs` (restartJoin/arrange). O adaptador deve ser revalidado quando atualizar Strudel.

## Medições e limites

`node scripts/benchmark-drag.cjs`: 64 casas, 16 vozes de Manchester, Strudel real e WebAudio simulado. Antes: 128 refreshes, 3904 consultas ao cache de padrões, mediana 3,42 ms. Depois: 1 refresh, 1054 consultas, mediana ~1,17 ms. Inclui monitor; não mede DSP, latência acústica ou celular físico.

`node scripts/benchmark-rolls.cjs`: 128 rolls por cidade, cinco consultas de oito ciclos. Em uma execução, Düsseldorf: consultas 255 → 209 ms; Vienna: 152 → 113 ms. Compilação agrupada custa mais (33 → 107 ms e 24 → 35 ms), amortizada pelas consultas repetidas; por isso é feita apenas quando o padrão muda, nunca a cada casa. Fazer o runtime analisar mini-notation custou 326/283 ms de compilação e foi descartado. Benchmarks de Node/JIT variam; a contagem de eventos permaneceu igual.

Exportação Mouth Breather: 19102 → 6610 bytes, mantendo equivalência de notas/timing/articulação nos testes. Arquivos JSON de kits não mudaram.

Chrome headless, Manchester: 16 reverbs na formação; após 24 travessias + cancelamento, 18 no total (audição e retomada do loop). Persistiram tarefas longas no ambiente de desenvolvimento; isto não é aprovação de desempenho mobile. Testes de navegador verificam áudio não silencioso, editor, código sob demanda, gesto/cancelamento e toque emulado. Medir build de produção em celular físico ainda é necessário para avaliar a experiência final.

## Segunda investigação: 32 vozes e score Strudel (sem mudança de produção)

Esta rodada foi executada antes de qualquer alteração no compilador ou na arquitetura de áudio. O kit Detroit com as 32 peças ativas exporta 66.143 bytes, 85 `stack`, 112 declarações de variação, 40 máscaras, 284 declarações de filtro e 32 orbits. Nos kits padrão, a exportação completa fica entre 60,4 e 64,6 KB, exceto Manchester 1999 com 35 KB; todos continuam com 32 orbits. Portanto, tamanho do texto não explica sozinho o travamento sustentado.

O Superdough cria um `Orbit` por número e cada orbit cria seu próprio reverb e delay quando recebe eventos com esses sends. Um ensaio sintético controlado no Strudel REPL, com carga representativa, manteve entre as variantes as mesmas 32 vozes, notas, densidade, timbres, envelopes, filtros, pan, volumes e sends, alterando somente a distribuição de orbits. Em uma janela diagnóstica de cinco segundos:

| Variante | Orbits | Reverbs | Delays | `skip query: too late` |
| --- | ---: | ---: | ---: | ---: |
| Uma por peça, como hoje | 32 | 32 | 4 | 3 |
| Uma por equipe | 2 | 2 | 2 | 0 |
| Duas por equipe | 4 | 4 | 2 | 0 |
| 32 orbits, reverb desligado | 32 | 0 | 4 | 0 |

O ensaio mostra que a multiplicação de reverbs por peça é o primeiro alvo, não os filtros ou o tamanho do score. Quatro buses de efeitos, dois por equipe, são o compromisso inicial mais conservador: reduzem os convolvers em 8×, preservam duas caudas decorrelacionadas por lado e mantêm gain, pan, filtros, envelopes e sends por evento. A implementação exige separar identidade da voz do bus de efeitos, manter referência dos orbits compartilhados e nunca desconectar o bus inteiro ao capturar/desativar uma única peça. Dois buses são ainda mais baratos, mas alteram um pouco mais a textura aleatória das caudas. Desligar reverb funciona como fallback de dispositivo restrito, mas muda o arranjo e não deve ser a solução principal.

A árvore de padrões também possui trabalho evitável. Oito vozes contínuas selecionam cinco passos com `stack(part.mask(...))`; isso consulta todos os ramos para depois descartar quatro. O protótipo substituiu apenas essas seleções por `pick([...], selector)`, que mantém a fase global sem reiniciar a variação. A equivalência foi confirmada em 6.336 pares voz/compasso de todos os kits padrão e em 80 compassos do score exportado de Detroit, comparando início, fim, nota/sample, gain, filtro, pan e room. No benchmark de Detroit, sete consultas de 80 ciclos com 7.158 eventos por rodada:

| Estrutura | Compilação mediana | Consulta mediana |
| --- | ---: | ---: |
| Máscaras atuais | 110–119 ms | 1.163–1.199 ms |
| `pick` para vozes contínuas | 110–113 ms | 567–637 ms |

O ganho de consulta foi de 47–51%, sem reduzir eventos. Na exportação, a mesma troca removeu as 40 máscaras, reduziu 85 → 77 stacks e 66.143 → 63.439 bytes. Mover todos os controles para depois do seletor não melhorou a compilação e tornou a consulta mais lenta; essa alternativa foi descartada. Compilar somente a seção corrente ainda exige troca segura exatamente na virada e não teve evidência estável suficiente nesta rodada.

## Implementação resultante — 20/09

Seleções contínuas de performance agora usam `pick`; seleções com reinício continuam em `pickRestart`. O teste compara 24 compassos de eventos e controles contra a árvore anterior de máscaras. No score Detroit completo, isso elimina as 40 máscaras de seleção e reduz 85 → 77 stacks. Uma repetição quente do benchmark deu 622 → 611 ms para a mesma consulta; a diferença foi pequena nessa rodada, portanto a redução inicial de 47–51% não é tratada como ganho garantido de CPU.

Os 32 loops agora se distribuem em quatro orbits de efeitos, dois por equipe. Cada ataque preserva filtro, ganho, pan, envelope e sends; audição manual usa orbit exclusivo. A remoção é por referência de bus: capturar/desativar uma voz não derruba suas companheiras, e a última voz desconecta o orbit. O score Detroit completo ficou em 63.417 bytes, 77 stacks, 284 filtros, zero máscaras e quatro orbits. O teste sintético anterior indica quatro reverbs em vez de 32 e nenhum `skip query: too late` na janela de cinco segundos, mas a aprovação final ainda depende do build de produção em celular físico.
