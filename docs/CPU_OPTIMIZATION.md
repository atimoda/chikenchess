# CPU: arraste e padrões — v0.3.2

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
| 7: dois orbits | Não aplicado. Cancelamento/captura desconectam o orbit individual; compartilhar derrubaria outras peças e alteraria efeitos. O cache de impulso reduz regeneração sem fundir esses canais. |
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
