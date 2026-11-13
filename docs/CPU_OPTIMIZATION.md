# CPU: arraste e padrões — v0.3.4

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

## Retorno do celular e terceira implementação — 21/09

O teste físico da v0.3.3 ainda apresentou atraso nas cidades e, em menor grau, no Criativo. As duas telas já usavam o mesmo runtime, compilador compacto e quatro buses; portanto a diferença restante não era uma otimização restrita ao editor. A partida também recebia cada pulso pelo estado React do componente completo, fazendo tabuleiro, controles e widgets participarem de atualizações visuais recorrentes.

Na v0.3.4, os pulsos passam por uma store externa e apenas um overlay do tabuleiro assina as mudanças. A página não recebe mais `setState` por ataque. Aparelhos detectados como restritos usam ainda dois buses de efeitos, um por equipe, configuração que no ensaio anterior manteve as 32 vozes e não registrou `skip query: too late`; desktop conserva quatro. Notas, polifonia configurada, filtros, envelopes, pan e quantidade do send de cada evento permanecem. O compartilhamento maior pode aproximar a textura das caudas de peças da mesma equipe. A melhora final precisa ser repetida no mesmo celular e no build de produção.


## Retorno físico da v0.11.0 — Redmi / Chrome, 02/10

O usuário testou a v0.11.0 publicada no Xiaomi informado como Redmi 13 Pro, com Chrome. Em três cidades não identificadas, o início toca bem; por volta de oito vozes ativadas surgem atrasos, e com mais vozes o áudio chega a ruído e perde o tempo. É evidência física de falha da experiência, não uma medição do limite exato de CPU. Navegador/build foram confirmados; não há trace, sequência de jogadas, kits locais, temperatura ou saída de áudio registrada.

O perfil restrito atual já seleciona dois buses de efeitos, polifonia máxima de 32 fontes, janela de 180 ms, pulsos visuais limitados a 8 Hz e monitor de 150 ms. A detecção considera viewport menor que 768 px, ponteiro coarse ou até quatro cores; oito cores não impedem a classificação restrita no celular. Esses cortes não limitam a oito as peças nem removem processamento por nota. O Drive positivo cria um AudioWorklet de distorção por ataque no Superdough instalado. Reverb e delay são compartilhados por orbit, mas sends/filtros/envelopes/fontes continuam por ataque. Caudas e acordes ampliam a quantidade de fontes simultâneas. A atenuação atual por quantidade de loops só começa acima de dez; não é um limiter de pico e não prova ausência de clipping.

### Auditoria reproduzível, sem alteração de áudio

`node scripts/benchmark-mobile-audio.cjs` consulta o Strudel real dos kits de fábrica em Node, com grupos de 4/8/16/32 peças em ordem fixa de slots, dois buses e toda a forma A–F. Argumentos permitem escolher outras cidades. Mede ataques, notas no mesmo onset, sends/Drive positivos, fontes e tempo de compilação/consulta. Não reproduz uma partida real, não mede DSP, Redmi, memória, aquecimento ou clipping. Exportar/consultar um evento com room positivo não equivale a criar um convolver por nota.

Na execução de 02/10, com oito peças na fixture:

| Kit | Notas por segundo, média da forma | Maior número de notas no mesmo onset | Notas com Drive / total | Notas com reverb / total |
| --- | ---: | ---: | ---: | ---: |
| Memphis 1967 | 5,96 | 8 | 0 / 547 | 547 / 547 |
| Manchester 1999 | 12,40 | 10 | 0 / 750 | 750 / 750 |
| Detroit | 7,66 | 7 | 113 / 423 | 423 / 423 |
| Vienna | 4,83 | 8 | 0 / 311 | 311 / 311 |

Oito peças não são oito fontes DSP: Manchester já tem dez notas no mesmo ataque, antes das caudas anteriores. Drive não pode ser tratado como causa universal: nesta fixture, está ausente em três kits. Reverb é um primeiro experimento abrangente; sua causalidade atual ainda precisa de comparação no aparelho. A compilação nova do lote de oito vozes de Memphis custou cerca de 189 ms nesta execução; é custo de uma construção completa em Node, sem o cache da sessão, e não um tempo medido por jogada ou no celular. É sinal para medir recompilações durante movimentos/trocas de seção, separadamente da sobrecarga sustentada de DSP.

### Próximos experimentos, ainda não implementados

1. Medir no mesmo Chrome/aparelho um trecho fixo com 4/8/12/16 peças, com assets aquecidos, widgets/Code desligados, comparando original, sem reverb, sem delay e sem Drive separadamente. Medir atrasos do scheduler, capacidade de renderização, crescimento de nós/fontes ao longo de minutos e pico de saída. Repetir reduzindo vozes para verificar recuperação; só piorar com o tempo, sem recuperação, exige investigação de retenção/caudas/aquecimento.
2. Prototipar perfil leve de runtime para celular: primeiro reduzir custo do reverb (impulso mais curto ou ambiência alternativa; reduzir apenas o send não elimina o convolver), bypass real de Drive e filtros neutros quando aplicável. Conservar notas, BPM, arranjo, ativações, reações, equipe/pan e kits salvos. As reações/ranges continuam resolvidos e só a saída recebe a política do perfil; alterações de timbre devem ser explícitas.
3. Medir compilação e query separadamente. Pré-compilar/cachear trechos independentes de movimento ou resolver/preparar fora do trecho crítico pode ajudar às pausas de jogadas; não corrige sozinho DSP sobrecarregado. Aumentar lookahead ajuda bloqueios curtos de JS, não aumenta o orçamento de renderização do áudio.
4. Só se o perfil de efeitos não bastar, testar limite de fontes simultâneas e caudas mais curtas com prioridade musical. Reduzir 32 → 16/24 fontes altera notas/caudas e precisa de validação; evitar um corte indiscriminado de peças ativas ou aumentar polifonia para tentar corrigir ruído.
5. Separar proteção contra soma de volumes (headroom/limiter, se houver clipping medido) de redução de CPU. Limiter não recupera notas atrasadas nem deadline perdido.

Referências primárias: [perfil de Web Audio no Chrome](https://web.dev/articles/profiling-web-audio-apps-in-chrome) explica deadlines, glitches e GC; [métricas WebAudio](https://developer.chrome.com/docs/devtools/webaudio) descreve Render Capacity. Uma medição de Node ou emulação desktop não aprova desempenho no Redmi. Nenhuma simplificação desta seção foi aplicada ao playback; agenda em `docs/music/MUSIC_ENGINE_PLAN.md`.


## Retorno do Redmi Note 13 e quarta rodada — 22/10, v1.6.7

O usuário testou a v1.6.6 publicada num Xiaomi Redmi Note 13: o som melhorou (rasgos só em alguns momentos), mas o FPS continuava sofrível, com movimentos “lagados”. Reproduzimos no build de produção em Chromium headless com viewport 393×873, DPR 2,75, toque, CPU limitada a 4×, Detroit, oito peças ativas e Piece Params aberto numa peça (`isConstrainedDevice()` verdadeiro). Medimos FPS por `requestAnimationFrame`, ocupação da thread principal pelo Profiler, alterações de DOM e o maior intervalo entre dois ticks do agendador (acima da antecipação, ataques são descartados ou atrasados).

Diagnóstico: (1) a animação do lance fazia `setState` a cada quadro e re-renderizava o tabuleiro inteiro; (2) o React 19 reescreve `innerHTML` sempre que o objeto de `dangerouslySetInnerHTML` muda, então cada render do tabuleiro re-parseava o SVG das 32 peças (≈15 vezes em 1,5 s em volta de um lance, ~700 alterações de DOM); (3) Piece Params/piano roll e Mixer re-renderizavam a cada frame do monitor; (4) com a página ocupada, o tick do agendador atrasava além dos 180 ms de antecipação. Desligar sombras/filtros no headless não mudou o resultado de forma consistente, mas o rasterizador do headless não representa a GPU do celular.

Média de três execuções alternadas, antes (v1.6.6) → depois:

| Cenário | FPS | Thread principal ocupada | Alterações de DOM | Maior quadro |
| --- | ---: | ---: | ---: | ---: |
| 8 s tocando, peça selecionada | 37,8 → 48,8 | 79% → 64% | 381 → 324 | 1544 → 889 ms |
| 0,5 s do próprio lance | 18,6 → 24,2 | 92% → 96% | 701 → 289 | 817 → 444 ms |
| 5 s da resposta do bot | 35,5 → 38,7 | 79% → 80% | 546 → 275 | 633 → 605 ms |

Mudanças em `docs/mechanics/performance.md`. Persistem no headless travadas isoladas de 0,5–1,5 s (o tick do agendador também atrasa nelas); a antecipação de 300 ms não cobre essas, e a resposta do bot/análise ainda ocupa a thread. Próximos passos, se o aparelho ainda engasgar: medir no Redmi com o Performance do Chrome remoto, separar o custo de GPU (brilho pulsante das casas ativas, drop-shadows das peças, `backdrop-filter` do último lance) e avaliar mover o agendador para um Worker.

### Thread de áudio — mesmo dia, depois do segundo teste no Redmi

Com o preview acima, o usuário relatou que o áudio ainda “quebra”, distorce e atrasa no Xiaomi. Medimos a thread de renderização de áudio (trace `audio`, 10 s, Detroit, 14 peças ativas, perfil restrito). Pico da saída somada das equipes: 0,26, sem amostras acima de 1. Logo, a distorção relatada não veio de clipping nesse cenário, e sim de underruns.

| Variante (mesma sessão) | Thread de áudio em tempo real | Convolução em segundo plano |
| --- | ---: | ---: |
| Original, dois convolvers (um por bus) | ~1,1–1,4 s / 10 s | ~0,3–0,5 s |
| Sem reverb | ~0,5 s | 0 |
| Impulso truncado (1–1,5 s) ou mono | sem melhora consistente | um pouco menor |

O reverb é a maior parcela do áudio; drive, filtros e quantidade de nós por nota pesam pouco. Encurtar ou tornar mono o impulso não reduziu o custo em tempo real, porque o que pesa é cada convolver ativo. A implementação passou a usar um único convolver para os dois buses no celular. Em três execuções alternadas contra a v1.6.6: thread de áudio 1,44 s → 0,93 s por 10 s (−35%) e convolução em segundo plano 0,44 s → 0,18 s (−59%), com o mesmo pico de saída. Se ainda não bastar, o próximo passo é desligar o reverb no celular (cerca de −45% adicional), o que muda o timbre e por isso fica para decisão do usuário.

## Consulta por compasso no agendador — 13/11, v2.10.0

O perfil de CPU das fases Blues, Jazz & Rock no celular emulado mostrou ~29% da thread principal dentro de `queryArc`: o tique do agendador consultava a pilha das 32 vozes em fatias de até 1/16 de compasso, e o monitor dos painéis consultava o compasso outra vez. Em Node, as mesmas notas custavam de 10 a 59 vezes menos pedidas em compassos inteiros.

`MusicTransport` agora guarda, por voz, o compasso consultado (`setPatterns`, `barHaps`) e cada tique só recorta o seu trecho; o compasso seguinte é adiantado um sexto das vozes por tique. Comportamento em `docs/mechanics/performance.md`.

Medição A/B no mesmo dia, builds de produção da `main` e desta mudança servidos localmente e intercalados: Chromium, tela 393×873, toque, CPU 4× mais lenta, nível Média, 32 peças tocando no Criativo por 20 s. Emulação, não aparelho físico.

| Fase | FPS antes | FPS depois | Script ms/s antes | Script ms/s depois | Nós de áudio/s antes | depois |
| --- | --- | --- | --- | --- | --- | --- |
| Paris 1945 | 10,8 | 44,5 | 737 | 191 | 241 | 475 |
| San Diego 1999 | 12,0 | 48,5 | 670 | 164 | 245 | 325 |
| New York 1961 | 15,0 | 53,5 | 649 | 150 | 383 | 390 |
| New York 1930 | 18,3 | 44,9 | 620 | 190 | 233 | 454 |
| Columbus 2013 | 28,0 | 55,3 | 577 | 134 | 228 | 227 |
| Chicago 1958 | 31,2 | 56,0 | 545 | 122 | 164 | 165 |
| Cambridge 1973 | 32,0 | 55,7 | 505 | 100 | 145 | 143 |
| Detroit | 36,2 | 46,6 | 391 | 160 | 336 | 390 |
| Manchester 1999 | 47,9 | 56,6 | 369 | 101 | 87 | 110 |

Antes, o console registrou nota atrasada ou pulada em 5 das 9 fases; depois, em nenhuma. Nas fases mais pesadas o build anterior criava cerca de metade dos nós de áudio: o agendador chegava atrasado e descartava ataques. Sem limitar a CPU os dois builds criam o mesmo número de nós (New York 1930: 442 e 445/s; Paris 1945: 487 e 487/s), então a mudança não dobra notas, e o script cai de ~250 para ~44 ms/s. A igualdade de ataques entre compasso inteiro e fatias foi conferida nos 83 kits oficiais (8 compassos, perfil leve, 21.248 pares voz/compasso, zero diferenças).

O que resta por quadro nessas fases é principalmente estilo, layout e pintura dos painéis do Criativo (tarefa total de 500 a 765 ms/s com script de 100 a 190 ms/s) e a criação de nós por nota.
