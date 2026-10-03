# ChickenChess — plano da engine musical e evolução do produto

Atualizado em 03/10/2026 — v0.12.1. Status: schema 7 MIDI-only com arranjo global, engine Strudel nas 46 fases / 34 cidades, com seis campanhas, onze compassos e seis cenas por preset; Brazilian e World rhythms implementadas com 19 estudos originais. Cada kit tem fotografia própria por época ou contexto musical. Catálogo detalhado em `docs/RHYTHM_ATLAS.md`. Validação de escuta continua pendente. O comportamento atual e suas prioridades estão em `GAME_MECHANICS.md`.

## Investigação mobile — 02/10, pendente

A v0.11.0 publicada apresentou atraso/ruído em Chrome no Redmi informado pelo usuário, em três cidades e com cerca de oito vozes ligadas. Evidência e auditoria estrutural em `docs/CPU_OPTIMIZATION.md`; o runtime mantém o perfil atual de dois buses, 32 fontes e 180 ms. Não há mitigação nova aprovada no aparelho.

Prioridade: comparar reverb, delay e Drive separadamente, medir fontes/caudas e recompilações, e prototipar perfil de saída leve sem modificar os kits salvos. Preservar peças ativadas, MIDI, forma, BPM, regras e mixagem por equipe antes de considerar reduzir notas/polifonia. Headroom/limiter só trata clipping, e lookahead só trata margem de agendamento; ambos precisam de causa medida. O perfil leve é proposta futura, não comportamento implementado.

## Entrega de 02/10 — MIDI-only e arranjo global

Instrumentos passam a ter 1–8 piano rolls explícitos obrigatórios. Foram retirados os painéis de receitas/código editável, forma/variações avançadas, Groove compartilhado e automações, além dos módulos `automation.ts`, `grooves.ts` e `pattern-library.ts`. Fonte sonora, comportamento Pulso/Frase/Sustentado, efeitos, mapeamentos e escolha fixa de variação permanecem; a participação por peça agora referencia a forma global. Os presets Düsseldorf original e Mouth Breather continuam disponíveis em MIDI. Strudel continua executando os loops e gerando o código equivalente para inspeção/exportação; simplificar a edição não troca a engine.

LPF ganha range de 20–20000 Hz com L por repetição do loop, S por entrada de seção e N por ataque; novos controles usam N e limites iguais fixam o corte. A regra de filtro tem autoridade temporária sobre o range no snapshot e sua saída restaura a base. Prioridades e gestos completos estão em `GAME_MECHANICS.md`.

O reset único autorizado da primeira etapa MIDI v5 usou `resetLegacyMusicStorage()` para descartar as chaves musicais `chickenchess:creative:v1`, `chickenchess:creative:v1:kits` e `chickenchess:city-kit:v1:*`, com marcador `chickenchess:music:midi-v5`. Perfil e progresso permaneceram intactos. A etapa v6 mantém as chaves `chickenchess:creative:v5` e `chickenchess:creative:v5:kits` e migra os kits pelo parser, sem novo reset ou exclusão. Imports antigos conservam rolls explícitos ou usam defaults; somente a antiga forma numérica ponderada é convertida quando necessário, sem restaurar frases nem o runtime textual. As menções anteriores à preservação automática de kits descrevem entregas históricas, não o reset MIDI v5.

O budget de importação aumenta de 150.000 para 2.000.000 caracteres de JSON para acomodar presets MIDI formatados, sem ampliar os limites de oito rolls e 128 notas por roll. A primeira reprodução com Drive ou supersaw aguarda `initAudio`/AudioWorklets; essa prontidão cobre Düsseldorf original sem acrescentar espera às notas manuais secas que não exigem esses processadores.

O arranjo global visual foi implementado: schema 7 salva 1–24 seções com ID estável, nome, duração compartilhada e percurso harmônico opcional; cada peça referencia esses IDs para banco MIDI, presença, transposição e reinício. O editor global cria/remove/reordena e renomeia seções, enquanto o painel da peça oferece somente suas atribuições. Pins e regras substituem somente o banco MIDI, preservando o restante do arranjo. A harmonia segue o compasso local da seção no ataque, independentemente da duração/fase do banco; compilador e exportação usam `harmonic-pattern.ts`. Migração v5 → v6 usa a primeira performance temporizada como forma comum e preserva as atribuições por índice, com fallback limitado à forma numérica antiga ou A de quatro pulsos. Comportamento, limites, retorno/cancelamento e prioridades estão em `GAME_MECHANICS.md`. Escuta crítica e medição em aparelho físico continuam separadas da validação de padrões.

Refinamento de 02/10 já implementado: a timeline global marca a próxima seção por clique para entrar ao fim da atual, reordena por arraste e edita em popup por duplo clique. O progresso fica dentro da seção em execução. Kit Harmony usa os percursos salvos; outros planos suspendem sua execução e desabilitam sua edição sem apagar graus. A migração v6 → v7 diferencia essa escolha de um override persistido. Os gestos de cancelamento, limites, regras pendentes e rampas durante transições de seção estão em `GAME_MECHANICS.md`, não na agenda futura.

## Entrega de 01/10 — seis cenas, gravações e ranges

Implementados naquela entrega: seis cenas nos 46 presets, percursos harmônicos E/F nos 45 perfis de piano roll, três bancos gravados novos, afinação/URLs corrigidas e ranges de Drive/Reverb/Swing por loop. Comportamento atual e prioridades ficam em `GAME_MECHANICS.md`; evidência e reprodução em `docs/MUSIC_KIT_REVIEW.md`. Na revisão de 01/10, os kits antigos eram preservados pela migração local; o reset MIDI-only de 02/10 substitui essa política para o armazenamento antigo.

Gate ainda pendente: escuta crítica das formas completas, confronto de identidade de estilo, balanço com formações pequenas/completas e aparelho físico. Renderizações e testes não fecham esse gate. Prioridades de fontes futuras: guitarra rock com amp/palm-mute, aço/acordeão mais expressivos, instrumentos regionais autênticos e articulação/legato para sopros/cordas. Não ampliar automaticamente todos os ranges: swing e drive excessivos podem descaracterizar o estilo.

## Rodada anterior de timbres — entregue e validação pendente

Quatro bancos originais acrescentam 31 one-shots de cordas/guitarras/baixos, teclas, síntese modulada e bateria acústica. As dez fases do Harmonic songbook deixam de partilhar a mesma guitarra, tecla e bateria; ganham paletas e levadas por estilo. As 17 fases anteriores recebem trocas pontuais de fontes sem mudar suas frases e formas. O kit anterior salvo localmente permanece disponível em Meus kits ao migrar para a nova revisão. Os WAVs, raízes, licenças e regeneração estão em `public/samples/README.md`.

Próximo passo: escuta A/B dos timbres com formações de 4, 8 e 16 peças, em fones e alto-falantes de celular, medindo picos, mascaramento e ataques simultâneos. Os testes de arquivo e eventos não atestam realismo acústico, identidade percebida ou balanço. Só depois dessa escuta escolher quais instrumentos pedem multisamples, variação de articulação por velocidade ou substituição por gravações licenciadas.

## Harmonic songbook — entregue e próximo passo

Dez novas fases cobrem I–V–IV, I–V–vi–IV, vi–IV–I–V, I–vi–IV–V, vi–IV–ii–V, ii7–V7–Imaj7, I–IV–vi–V, iii7–VI7–ii7–V7, IV–I–V e I–IV–V. Cada fase associa uma cidade/época, motivo original, kit de 16 partes e referência de estilo. Os dois planos de jazz executam tétrades reais; os demais continuam com tríades. A segunda entrada vi–IV–I–V da lista de origem foi interpretada como vi–IV–ii–V pelo exemplo Am–F–Dm–G e por ampliar o repertório.

Próxima validação musical: escuta A/B de cada kit com 4, 8 e 16 peças, verificação de registro, balanço e transições harmônicas em aparelho físico. Ajustar arranjo e articulação antes de acrescentar mais progressões ou vozes. As referências de canções são inspirações de linguagem e contexto; a composição do jogo não reproduz melodias gravadas.

## Próxima validação das baladas

Buenos Aires 1940, Dublin 1990 e New Orleans 1953 são composições originais de referência em 3/4, 6/8 e 12/8. A infraestrutura de duração, subdivisão, acento, exportação e edição está implementada. Falta comparar por escuta os timbres sintéticos com instrumentação mais expressiva, dinâmica entre formações pequenas/completas e custo em celular físico. A aprovação dos testes de padrões não equivale a aprovação de qualidade musical; novos estilos devem partir desses ensaios antes de ampliar o catálogo.

## Entrega de 16/09 — composição e comparação

Infotips compactas, piano roll alinhado em todas as linhas, seções próprias com durações assimétricas/pausas/transposições, slides por nota e distorção entregues. Estudo Mouth Breather preserva o material temporal/melódico do script com timbres locais aproximados. As 14 fases receberam arranjos próprios; ao trocar um preset, o kit anterior passa à biblioteca local sem vínculo com a cidade. `MUSIC_STYLE_REFERENCES.md` registra referências, datas, diferenças e limitações. Esta revisão substitui os defaults sorteados; o gerador permanece como ferramenta de experimentação.

Próxima etapa: escutar e comparar as formações pequenas/completas em um aparelho físico, medindo densidade e custo dos quatro buses de efeitos. Os centros harmônicos, tríades, duas progressões com tétrades e condução curta já estão implementados; extensões adicionais e preparação de cadência dependem de escuta A/B. Ajustar ganho, registro, espaços de resposta e articulação dos kits entregues antes de adicionar camadas. Samples acústicos mais expressivos e suporte a legato verdadeiro exigem outra rodada de desenho e validação.

## Próximo ciclo de implementação

**v0.4.0 — Atlas sonoro:** os defaults deixaram de compartilhar o molde fixo de oito baterias mais baixo/harmonia/melodia. Cada cidade agora distribui 16 papéis com timbres, registros, articulações e levadas próprios e usa a forma por peça para variar densidade e protagonismo entre seções. Johannesburg · 1994 acrescenta Kwaito ao mapa. A próxima validação é de escuta: comparar cada kit com 4, 8 e 16 peças, corrigir balanço e motivos que colidam, e repetir as fases mais densas no celular. Depois desse gate, a extensão de maior valor é uma biblioteca de articulações e samples mais expressivos, em vez de aumentar a quantidade de vozes.

**Manchester 1999 — primeiro ajuste de curadoria:** o baixo principal sustenta as quatro seções e sua resposta entra somente em B/D, reduzindo a lacuna de graves nas formações pequenas e a sobreposição entre as duas linhas. Esta escolha ainda precisa de escuta A/B no Criativo e na partida; testes de eventos não aprovam o balanço musical.

**Düsseldorf e New Orleans — segunda rodada:** em Düsseldorf a sequência de diodos apresenta A e deixa a flauta conduzir C/D; em New Orleans as respostas de guitarra e palheta concentram-se em B, deixando o trompete ocupar C/D. Escutar especialmente a passagem de B para C e a densidade de D, em formações de 4, 8 e 16 peças. Os antigos presets ficam como kits soltos em **Meus kits** para comparação, sem um fluxo de versões separado.

**v0.3.4 — Fôlego no celular:** aparelhos restritos usam um bus de efeitos por equipe e os pulsos visuais deixam de renderizar a página completa. Próxima prioridade: (1) repetir no mesmo celular o cenário de cidade e Criativo, observando áudio e resposta visual separadamente; (2) registrar em telemetria local atrasos do scheduler e tarefas longas; (3) criar orçamento por papel musical para densidade e ataques simultâneos apenas se ainda houver falhas; (4) retomar comparação dos planos harmônicos depois desse gate. A simulação permite comparar esses comportamentos antes de ampliar as regras.


**Entregue em 13/09:** Manchester · 1999 / Northern Jazz Breaks é o primeiro default composto a partir de referência, com quatro seções, 11 samples sintéticos novos e separação de épocas no mesmo local. O arquivo FLAC de Get a Move On! foi analisado numericamente; a medição não equivale a uma transcrição auditiva. Próxima escuta com o usuário: avaliar identidade dos sopros, balanço com 16/32 peças e evolução por lances. Primeiro refinar esse kit; depois expandir articulações/motivo-resposta e a harmonia global. Detalhes e limites em `MUSIC_REFERENCE_GET_A_MOVE_ON.md`.

### Decks DJ — base entregue em 13/09 e próxima extensão

Board Params já oferece dois buses de áudio com ganho e EQ independentes, além de fine pitch/quartz lock sobre o relógio comum. O passo seguinte dos decks é um protótipo separado de captura e leitura de áudio por equipe: AudioWorklet com buffer circular limitado (por exemplo, 2–4 compassos), cursor de reprodução variável, crossfade e saída para o mixer. Esse protótipo precisa validar custo, memória, latência e ausência de estalos em celular antes de integrar platters.

Reverse deve ler áudio capturado para trás; inverter a ordem de notas Strudel não reproduz o mesmo efeito. Scratch varia posição e velocidade do leitor pelo gesto. Definir explicitamente pausa, limite do histórico, o que acontece com novas notas durante scratch e o retorno ao relógio musical (crossfade seguido de reencontro quantizado). Strudel pode continuar compondo enquanto o deck manipula a saída capturada. Velocidades independentes por lado exigem decidir sincronização de dois transportes; a implementação atual mantém ambos juntos. Nenhum botão de scratch/reverse fictício foi adicionado.

Na revisão mobile foram retirados reenvios redundantes de acompanhamento, consultas de painéis ocultos e renderizações React a cada pixel de arraste; loops ganham maior antecipação em dispositivos restritos. Próxima medição: aparelho físico, kit completo e interação simultânea, observando falhas de áudio, tempo de frame e custo por voz/efeito. A simulação touch de navegador valida gestos, não aprova qualidade de áudio nem desempenho real.

Na segunda rodada, performances contínuas passaram de máscaras paralelas para `pick` e os loops passaram de até 32 orbits de efeitos para quatro buses compartilhados, dois por equipe. Depois do retorno físico ainda com atraso, aparelhos restritos adotaram o fallback já ensaiado de dois buses, um por equipe, e o pulso visual foi isolado da árvore principal de React. A identidade e os controles por voz continuam nos eventos; o runtime mantém o bus enquanto houver qualquer integrante ativo. O próximo gate técnico é repetir o cenário de 32 vozes no mesmo celular antes de reduzir densidade ou polifonia.

1. **Transições musicais — base entregue:** fila por compasso, cancelamento, fase preservada, rampas de BPM e indicadores. Validar em aparelho físico; limites de seção e preparação harmônica continuam como extensões.
2. **Direção harmônica compartilhada — centros e tríades entregues:** planos por seção deslocam juntos baixo e melodias; vozes sustentadas formam tríades diatônicas com inversões de menor movimento, enquanto o monitor expõe plano, grau, cifra e notas correntes. Próximo passo: comparar A/B com o mesmo histórico de lances e então acrescentar tétrades, extensões e graus preferenciais por estilo.
3. **Groove e articulação:** swing comum configurável, microvariações determinísticas de tempo/velocidade, notas fantasmas e fraseado de pergunta/resposta. Evoluir o vocabulário de timbres e articulações por evidência de escuta. Estudo de Manchester em `MUSIC_REFERENCE_GET_A_MOVE_ON.md`.
4. **Curadoria dos Estados e Eventos:** o preset completo já cobre os 26 gatilhos com intensidades proporcionais à frequência. A próxima rodada é escuta A/B por kit, simplificando ou desabilitando combinações que disputem espaço no arranjo.
5. **Curadoria e orçamento de áudio:** escutar formações de 1, 4, 8, 16 e 32 vozes e cheques, medir picos, densidade e custo em celular físico; comparar o eletrônico original, um kit contrastante e os sorteios. Ajustar limites antes de novos modos/loja/multiplayer.

O sorteio por cidade está implementado; os kits salvos continuam prioritários. A aleatoriedade serve à experimentação, sem substituir a curadoria dos estilos. A referência eletrônica original permanece acessível no Criativo.

### Próxima extensão: acordes e condução de vozes

O preset de reações atual usa somente ações que o runtime executa de fato: BPM, escala, relativa, modo, plano harmônico, transposição, contorno, variação, ganho, filtro e ativação. A tabela exata do comportamento entregue fica em `GAME_MECHANICS.md`.

O `HarmonyPlan` compartilhado e sua ação de reação já existem: escolhem centros em graus da escala por seção e preservam o material de cada voz. Final, saída das rainhas, formação mínima dos dois lados e promoção estreiam essa ação; captura e cheque permanecem mudanças locais/dinâmicas por serem frequentes.

A próxima camada deve representar acorde, voicing e notas-alvo separadamente do centro. Proteções propostas: intervalo mínimo entre modulações estruturais, condução com menor deslocamento possível, registros próprios por papel e prioridade para edição manual. Undo e saída da regra já reconstroem o plano devido sobre a base; essa propriedade precisa ser preservada.

A primeira regra tática coletiva ativa temporariamente a banda atacante durante cheque. O arraste suspende o loop da peça e toca por entrada em casa. Os widgets da partida agora reúnem transporte/código, execução por peça e tom/escala global; a entrada pelo mapa aproxima a câmera do pin antes da fase. Estados táticos mais complexos continuam sujeitos à validação musical da base.

## Modo Criativo (primeira bancada implementada)

O laboratório em `/creative` usa o mesmo `MusicRuntime` das partidas e abre sem introdução, adversário ou validação de movimentos. Ele permite ativar e solar qualquer uma das 32 vozes, mover ou trocar peças livremente, tocar casas temporariamente, editar notas MIDI, a forma global e as atribuições por peça, escolher fonte/comportamento e ajustar timbre, envelope, chance de tocar, filtros, efeitos e os mapeamentos de posição para grau, pan e filtro. Edição textual, receitas, Groove compartilhado e automações foram retirados em v0.11.0.

O rascunho e kits nomeados são guardados no navegador. A exportação/importação JSON conserva todas as identidades e configurações e valida o schema e a compilação dos padrões antes de substituir a sessão atual. Persistência oficial, versionamento de kits, publicação e administração em banco ficam para a camada futura de conteúdo e contas.

### Histórico: primeira curadoria musical de Düsseldorf

Registro da bancada anterior à simplificação MIDI-only. As receitas, máscaras, grooves, automações e schema v4 descritos neste ciclo não fazem parte do comportamento atual; seus módulos foram eliminados em v0.11.0. Fonte sonora, feedback, o estudo Düsseldorf e a curadoria por escuta continuam, agora sobre rolls explícitos. O registro abaixo preserva os objetivos e as decisões daquela entrega.

Os trechos Strudel recebidos formam o corpus de referência. Cada trecho é descrito pelo papel que cumpre (groove, baixo, harmonia, melodia ou textura), separado em componentes reaproveitáveis e comparado no Modo Criativo. As construções que a engine ainda não representa geram requisitos concretos para o modelo, em vez de adicionarmos abstrações sem referência sonora.

O resultado desse ciclo será um kit eletrônico de referência com algumas formações testáveis, métricas simples de densidade/headroom e uma lista pequena de capacidades faltantes — por exemplo progressões harmônicas ou variação determinística. Só então ligaremos estados táticos mais complexos à música, para que esses estados transformem um arranjo que já soa bem em repouso.

As referências recebidas foram triadas em `STRUDEL_REFERENCE_CATALOG.md`. Naquela bancada, nove adaptações iniciais de “Death By Elliptical Eye”, “Bennington” e “Bonespurs” estavam em `lib/music/pattern-library.ts` e podiam ser aplicadas a qualquer peça no inspetor. O módulo e esse fluxo de aplicação foram retirados em 02/10/2026, na v0.11.0.

A formação daquele ciclo, `Düsseldorf · Electro 01`, expandiu a primeira `Elliptical Lab` para todas as 16 peças brancas no Criativo, com os instrumentos correspondentes espelhados nas pretas. A timeline A/B/C/B tinha quatro ciclos por seção; a notação foi corrigida para `[0@4 1@4 2@4 1@4]/16`, pois a anterior alongava a forma por um fator de 16. Naquele editor, máscaras eram editáveis, mas o preset permitia ouvir cada voz ativa sem esperar uma entrada longa, inclusive a rainha. O preset permanece no catálogo MIDI; máscaras editáveis não existem na versão atual.

Os quatro incrementos daquela entrega (registro histórico, anterior a 02/10):

1. **Fontes independentes das peças:** banco local `Chicken Electro · 01`, com 13 samples originais CC0, articulações e opção de seguir a escala. Rei com bumbo e peão com sino melódico foram verificados com o compilador Strudel real e no Criativo.
2. **Automações:** ganho, filtro, pan, reverb e delay aceitam padrões por seção ou curvas seno/rampa. O editor valida limites antes de aplicar; valores são lidos a cada ataque. Modulação contínua de uma nota sustentada e transposição em padrão ficam para outra etapa.
3. **Grooves compartilhados:** trilhas de ritmo e acentos coordenadas pela timeline, atribuíveis a qualquer peça. O editor cria grooves/trilhas e altera uma trilha para todas as vozes vinculadas. A execução usa `struct` e `pickRestart`, sem exigir `pickOut` nem atrelar a distribuição a peões.
4. **Feedback musical:** seção, compasso, pulso, notas/pausas e valores executados; distingue peça inativa, pausa do transporte, solo, carregamento e máscara. Os dados vêm dos padrões compilados e do relógio de áudio.

O JSON v4 conservava fontes, grooves e automações. **Salvar kit da fase** fazia a próxima partida usar a configuração editada, guardada neste navegador. **Düsseldorf original · samples** permitia comparar o preset novo sem sobrescrever automaticamente um kit salvo. Na primeira etapa de 02/10, o schema 5 substituiu esse contrato e o reset único descartou o armazenamento musical antigo; fonte sonora, salvamento e o preset original continuam disponíveis sobre MIDI. Banco oficial, contas e sincronização entre dispositivos continuam futuros.

**Próximo passo:** ouvir este preset no Criativo e na fase em formações pequenas e completas, ajustar balanço, densidade e respostas entre as vozes, e medir um celular físico. Depois de aprovar essa base sonora, experimentar progressão harmônica global e transformações de frase por movimento; estados táticos avançados vêm depois dessa comparação.

### Estabilização para testes móveis

A primeira redução de custo mantém o agendamento de áudio completo e limita trabalho visual: pulsos do tabuleiro são amostrados a 8 Hz em aparelho restrito e 15 Hz no desktop; sliders agrupam recompilações em janelas curtas; o espectrograma desenha no máximo 24 quadros por segundo. Em tela estreita, toque ou aparelho com até quatro núcleos, a partida usa somente o worker de jogada do Stockfish, limita a profundidade efetiva da IA a 6 e não abre espectrograma/código automaticamente. A polifonia fica em 32 vozes nesses aparelhos e 64 nos demais. Uma mixagem densa recebe atenuação progressiva acima de dez loops para recuperar headroom.

Samples agora são carregados sob demanda e reutilizados; padrões de vozes sem mudanças e consultas visuais por ciclo usam cache. O monitor atualiza pequenos componentes em 100 ms no desktop e 150 ms em aparelho restrito, sem reconstruir o editor inteiro. Esta é uma otimização estrutural inicial para viabilizar a escuta. A rodada final de performance precisa medir aparelhos físicos depois que seções, samples, automações e interação estiverem definidas.

## 1. Direção e critério de prioridade

ChickenChess é um instrumento musical coletivo jogado em um tabuleiro e uma biblioteca mundial de música por lugar e época. Cada peça é um membro da banda. A música deve ser prazerosa de ouvir, expressiva de tocar e compreensível de explorar.

A prioridade é uma engine musical configurável, validada com um kit eletrônico em Düsseldorf. Loja, multiplayer, vestiário, expansão do mapa e novos modos aguardam essa validação. Generalidade será comprovada com configurações contrastantes no laboratório, sem produzir antecipadamente todo o catálogo.

Este plano substitui as prioridades anteriores do ROADMAP.md. Chicago como fase inicial, preços, plataforma de banco e modelo comercial do roadmap antigo são ideias históricas, não decisões vigentes.

Invariantes:
- Uma peça possui identidade estável, independente da casa, aparência, instrumento e tipo de movimento de xadrez.
- O loop da peça começa somente no primeiro movimento legal concluído. Selecionar não ativa seu acompanhamento.
- Uma peça capturada deixa de emitir novos eventos. Caudas têm liberação curta configurável; desligamento imediato fica disponível.
- Arrastar modifica uma camada temporária. Cancelar, soltar na origem ou tentar um lance ilegal restaura o estado anterior. Um movimento válido confirma apenas as transformações previstas para o lance.
- Decisão confirmada: pegar uma peça inativa inicia sua execução sonora temporária, permitindo conhecer e experimentar seu instrumento enquanto segura/arrasta, sem confirmar um lance. Ao cancelar, essa execução termina e a peça permanece inativa; ao concluir seu primeiro movimento legal, passa ao acompanhamento ativo. A audição deve representar o instrumento/padrão equipado.
- Todas as vozes afinadas consultam o contexto harmônico comum; percussões não afinadas não precisam receber notas.
- Todo parâmetro visível deve funcionar e explicar o valor efetivamente aplicado.
- Toda ação que altera música tem feedback visual associado à peça, ao controle ou ao transporte.

## 2. Três comportamentos de execução, sem três caixas rígidas de instrumentos

Conclusão: três comportamentos básicos são um bom ponto de partida, mas timbre, articulação e forma de execução precisam ser dimensões separadas. Synth é uma fonte sonora, não um comportamento: pode tocar bumbo, baixo sequenciado, acorde ou drone.

| Comportamento | Funcionamento | Exemplos | Controles específicos |
| --- | --- | --- | --- |
| Pulsos / ataques | Eventos discretos de um som, com altura opcional | Bumbo, caixa, chimbal, surdo, palmas, sílaba coral, pizzicato | Ritmo, acento, probabilidade, repetição, duração, escolha de articulação |
| Frases / sequências | Notas ou acordes organizados no tempo | Baixo, melodia vocal, piano, arpejo, metais | Graus, pausas, durações, contorno, oitava, acordes, inversões, legato, variação de frase |
| Sustentação / textura | Vozes mantidas ou renovadas em fronteiras musicais | Cordas, sopro longo, órgão, coral, drone | Gate, respiração, ataque/release, modulação contínua, voicing, transição de notas |

Uma definição pode combinar camadas: ataque de arco + corda sustentada; sílaba vocal + nota; chimbal aberto/fechado compartilhando grupo de corte. O sistema começa com composição desses comportamentos e uma interface de extensão, sem prometer que três presets reproduzem todos os instrumentos do mundo.

Dimensões independentes:
- Fonte: síntese, sample único, multisample afinado; futuras fontes entram por adaptador.
- Altura: não afinada, nota fixa relativa, graus da escala, acordes ou afinação personalizada.
- Polifonia: monofônica, polifônica, limite de vozes, prioridade de substituição.
- Articulação: ataque, envelope, gate, legato, portamento, acento, variantes de sample.
- Papel no arranjo: percussão, baixo, harmonia, textura, destaque. Orienta mixagem e espaço, sem determinar o tipo de peça.
- Interação: toque único, nota enquanto segura, arraste contínuo, retrigger ao entrar em casa, frase disparada.

Os defaults de kit seguem a intenção atual: peões/percussão, cavalos/baixo, torres/sopros e gaitas, bispos/teclas e synths, rei/cordas, rainha/canto e melodia principal. Cada kit pode substituir tudo isso.

## 3. Modelo de dados e separação de responsabilidades

Entidades propostas, serializáveis e versionadas:

| Entidade | Responsabilidade |
| --- | --- |
| PieceInstance | ID por partida, lado, papel de xadrez, casa atual, ativação, instrumento equipado e estado musical persistente |
| InstrumentDefinition | Nome, imagem fantasia, fonte sonora, capacidades, articulações, registro, controles, contexto educativo e referências de assets |
| PatternDefinition | Comportamento, estrutura temporal, notas/graus, acentos, variações e representação editável |
| MappingDefinition | Fonte de informação do jogo, transformação, destino musical, limites e política temporal |
| KitDefinition | Instrumentos/padrões por slot, regras de interação, defaults e imagens; aceita uma biblioteca de componentes reutilizáveis |
| StyleProfile | Gramática de groove, frases, densidade, harmonia, articulações e mixagem próprias do estilo |
| StageDefinition | Cidade, data ou intervalo, estilos, contexto histórico, kit sugerido e condições iniciais |
| SessionMusicState | Relógio, BPM, métrica, tônica, escala/afinação, harmonia atual, forma, seed e controles globais |
| PerformanceOverlay | Seleção, arraste e notas manuais temporárias, sem alterar a posição de xadrez |
| MatchEvent | Evento ordenado e versionado para replay: lance, captura, edição musical, contexto global e performance quando gravada |

Pipeline:

`xadrez → eventos e características → regras de mapeamento → estado musical resolvido → padrões Strudel → áudio e eventos visuais`

O transporte continua rodando enquanto o jogador pensa. Não depende da frequência de jogadas nem do render do React. O estado do tabuleiro não deve reconstruir o motor inteiro.

Strudel é o backend adotado para padrões e reprodução, isolado por um adaptador, e permanece na entrega MIDI-only. A proposta inicial previa confirmar sua adoção após um protótipo de interação e alinhamento com a licença AGPL-3.0 descrita na documentação oficial. O código mostrado/exportado deve representar o padrão executado a partir dos rolls explícitos; manter essa equivalência continua requisito das próximas extensões.

A engine de domínio (peças, kits, estados, regras, presets e interação) é própria do ChickenChess. Strudel fornece a infraestrutura musical; Web Audio continua sendo a base de áudio no navegador. Validar disparo imediato, alteração de notas já sustentadas, cancelamento de vozes e preservação de fase. Se algum gesto exigir uma extensão nativa, integrá-la ao mesmo transporte e à mesma definição de instrumento, sem manter duas composições independentes. Fazer tudo do zero implica assumir sequenciamento, linguagem de padrões, síntese, efeitos e manutenção; só reconsiderar isso diante de requisitos ou incompatibilidades concretas.

Usar um registro de capacidades/parâmetros para gerar UI e validar valores: unidade, faixa, curva linear/logarítmica, passo, default, automação suportada, atualização imediata ou quantizada. Campos desconhecidos ou incompatíveis produzem erro explícito, não são silenciosamente ignorados.

## 4. Estados: dimensões simultâneas, características e eventos

Não criar um único enum como `ativa | ameaçada | selecionada`: uma peça pode satisfazer tudo isso ao mesmo tempo. Catálogo inicial extensível:

### Ciclo de vida
- Inativa: ainda não concluiu movimento.
- Ativa: já concluiu movimento e está no tabuleiro.
- Capturada: não agenda notas novas.
- Promoção: evento que muda o papel de xadrez; por default mantém ID e troca a configuração conforme política do kit.

### Interação local
- Não selecionada / selecionada.
- Segurada / arrastando; casa percorrida e deslocamento contínuo.
- Destino legal / ilegal / origem; cancelamento, perda de foco e término do gesto.
- Modo tocar habilitado; nota manual pressionada/solta.
- Painel em edição; controles bloqueados pelo usuário.

### Relações táticas simultâneas
- Atacada: contagem exata e IDs/tipos/valores dos atacantes.
- Atacando: contagem exata e IDs/tipos/valores dos alvos.
- Defendida / defendendo: relações com peças aliadas, definidas separadamente de captura legal.
- Atacando rei; atacando rainha; rei em xeque; xeque duplo.
- Cravada; bloqueada; mobilidade e alcance controlado.
- Opcional posterior: garfo, espeto, ataque descoberto, peça pendurada. Exigem definições verificáveis antes de expor controles.

Contagens não param em 3: presets podem agrupar 1, 2 e 3+, mas a informação original permanece. Distinguir casas atacadas geometricamente de lances legais; peças cravadas, peões e reis tornam essa distinção importante. Mobilidade fora do turno precisa de semântica explícita, sem adulterar o estado da partida para consultar movimentos.

### Características contínuas e históricas
- Coluna, fileira, distância ao centro, avanço relativo ao próprio lado.
- Mobilidade normalizada, quantidade de casas controladas, material aliado/oponente.
- Deslocamento horizontal/vertical, distância e direção do último lance.
- Número de movimentos da peça, tempo musical desde seu último movimento, capturas feitas.
- Distância aos reis e proximidade a peças relevantes, quando útil ao kit.

### Eventos transitórios
- Primeiro movimento, movimento, captura realizada/sofrida.
- Roque (rei e torre), en passant, promoção.
- Começou/terminou ameaça, começou/terminou xeque.
- Lance ilegal, seleção, entrada em casa durante arraste, cancelamento.
- Desfazer/refazer, reinício, mudança de kit e edição de parâmetro.
- Xeque-mate e empate são eventos/estados da partida. No xadrez normal o rei não é capturado. Crédito musical à peça do lance final pode existir sem inventar um estado de captura do rei.

### Estados expressivos derivados
- Neutro, excitado, tenso, destaque recente, resposta, resolução.
- São receitas musicais de kit, derivadas das informações acima; não fatos de xadrez mutuamente exclusivos.
- Destaque da última peça movimentada dura uma quantidade configurável de tempos/compassos, com entrada e saída suaves. Não manter ganho extra indefinidamente até outro lance.

### Sessão e transporte
- Preparação, tocando, pausado, encerrando, finalizado.
- Abertura/meio/final como características opcionais; lado da vez, resultado e tipo de empate.
- Seção/frase/compasso/tempo atual; mudanças harmônicas pendentes.
- Estados de mute/solo de mixagem são independentes do ciclo de vida e do destaque.

## 5. Regras configuráveis e resolução de conflitos

Uma regra declara: fonte → condição → transformação → parâmetro → duração → prioridade → quantização.

Exemplos:
- Avanço do peão → densidade entre limites → acrescentar ghost notes preservando ataques essenciais.
- Movimento lateral do cavalo → deslocar motivo por graus da escala → próximo compasso.
- Mobilidade do bispo → selecionar uma entre frases de complexidade crescente.
- Ameaça à rainha → variação de articulação por dois compassos.
- Rei em xeque → aumentar tensão de filtro/voicing; resolver suavemente quando sair do xeque.
- Arraste em coluna → filtro; fileira → grau/registro → overlay temporário.

Transformações: normalização, curva, faixa, limiar com histerese, tabela de escolha, soma, multiplicação, substituição, rotação, seleção ponderada com seed e duração musical. Restringir destinos às capacidades do instrumento.

Ordem proposta: preset → edições persistentes do usuário → mapeamentos habilitados → overlay de performance → limites finais e mixagem. Bloquear um parâmetro impede que mapeamentos automáticos o substituam. Cada destino declara como combina regras; empates de prioridade têm ordem estável. A UI mostra valor base, modulação, resultado e a causa.

Separar regras instantâneas de regras acumulativas. Uma transposição por movimento é aplicada uma vez pelo evento, não em cada render ou reavaliação da posição. Limitar registro evita que dezenas de movimentos empurrem a voz para fora da faixa útil.

Mudanças globais de BPM/escala passam por um árbitro comum, com limites e prioridade. Várias peças não podem disputar diretamente o relógio. No online, alterações compartilhadas seguirão política de permissões da sessão, ainda a definir.

## 6. Harmonia, groove e forma

- Contexto harmônico único: tônica, escala, afinação, registro de referência e acorde/progressão opcionais.
- Padrões armazenam graus e intervalos; conversão para frequência fica na execução.
- Distinguir semitom, tom e grau: avançar um grau não equivale sempre a subir um tom. A UI deve nomear a operação corretamente.
- Escala fixa inicial para Düsseldorf, mais um preset de progressão compartilhada para comparação. Modulações futuras alteram o contexto de todas as vozes afinadas na mesma fronteira musical.
- Notas sustentadas usam política explícita na troca harmônica: liberar, retunar suavemente ou manter a cauda. Início: liberar/rearticular na fronteira configurada.
- Afinacões/coleções personalizadas são extensão prevista; não limitar todo o catálogo mundial à maior/menor nem tratar categorias geográficas como um único ritmo.
- Ritmos e frases podem atravessar vários compassos, conter subdivisões, pausas, pesos e camadas. Não limitar o modelo a arrays de 16 passos.
- Padrões essenciais, respostas e ornamentos têm prioridades diferentes. Variação respeita densidade, registro e espaço entre vozes.
- Probabilidade reprodutível com seed por sessão/peça/ciclo. Humanização deve ser configurável e servir ao estilo; não adicionar jitter aleatório a toda bateria eletrônica.
- Delay em divisões musicais; groove e métrica compartilhados, com offsets por instrumento.
- Mixagem com headroom, limites de polifonia, buses de efeitos e proteção de saída. Capturas não devem aumentar automaticamente o volume das peças restantes de forma abrupta.

## 7. O que aproveitar de “A Certain Buzz”

O trecho fornecido sugere uma composição hierárquica: um seletor de seções (`song`), escolhas coordenadas de harmonia e frases, subdivisões e pausas dentro dos motivos, bateria complementar e articulação controlada. Isso é uma referência estrutural, ainda sem avaliação auditiva ou execução do trecho nesta etapa.

A harmonia do exemplo muda raízes e modos entre seções. Ela pode ser traduzida para um contexto global evolutivo; não equivale a manter uma única escala fixa durante toda a música.

Separar bd e sd em peões deve preservar o relógio e a posição na frase da bateria original. Não reiniciar cada padrão quando a peça se move. Uma peça que entra depois se encaixa na fase musical da sessão.

O texto colado contém escapes de formatação e ocorrências como `***2`; guardar o original como referência e normalizar/validar no runtime antes de assumir que é executável. Não alterar silenciosamente a intenção do autor.

O editor visual deve representar estrutura temporal, não só uma grade fixa: alternância entre ciclos, agrupamentos/subdivisões, repetição, duração/peso, pausas, acordes e bancos de frases. Começar com o subconjunto útil a Düsseldorf e ampliar pelo uso.

Proposta histórica de modo código, fora do escopo atual: não prometer conversão visual bidirecional de JavaScript Strudel arbitrário. A ideia era guardar código autoral e expor macros declaradas, mantendo construções não suportadas visualmente em modo código. A entrega v0.11.0 usa somente notas explícitas para edição e mantém código Strudel gerado para inspeção/exportação; não há retorno de um editor autoral previsto; o arranjo global visual já foi entregue.

## 8. Interação sonora e modo tocar

Separar três ações:
- Selecionar: fixa o inspetor da peça; não muda o lance e não silencia a banda.
- Destaque: eleva temporariamente presença e elaboração após um lance, com orçamento de densidade/ganho.
- Solo de mixagem (entregue em v0.12.0): os botões S isolam uma ou mais peças e restauram, ao sair do último Solo, as vozes que tocavam e continuam vivas.

Modo tocar é explícito para evitar conflito entre clicar uma casa para jogar xadrez e clicar para tocar uma nota. No modo normal, casas válidas efetuam lances. No modo tocar, casas vazias são pads/notas da peça selecionada; tecla/botão retorna a mover. Funciona com mouse, teclado e toque.

Políticas por instrumento: percussão escolhe articulação/intensidade; frase afinada escolhe grau e registro; sustentação mantém gate até soltar. Arraste temporário pode filtrar a voz existente ou disparar notas por entrada em casa, com limite de retrigger. Nenhum gesto toca indefinidamente após cancelamento/perda de foco.

Performance manual local pode ser imediata; transformações estruturais do acompanhamento são quantizadas. Solo manual de peça ainda inativa não inicia seu loop. O comportamento de fundo durante improviso (continuar, reduzir ou suspender sua frase) é configurável.

## 9. Interface de experimentação e feedback

Inspetor persistente identifica peça, instrumento, estado, origem do preset e participação no arranjo. Não fecha quando a IA joga; acompanha o ID se a peça mudar de casa. Se capturada, mostra o estado e permite inspeção, sem continuar o loop.

Áreas:
1. Performance: ganho, mute, solo, intensidade, oitava e macros do instrumento.
2. Som: fonte, articulação, envelope, filtros, efeitos e polifonia conforme capacidades.
3. Ritmo/frase: grade e editor de graus/durações, alternâncias, acentos, probabilidade, frases A/B e cursor.
4. Comportamento: regras de posição, movimento, ameaça, captura e interação; ativar/desativar e bloquear controles.
5. Código: execução real, validar/aplicar, erro localizado e última versão válida.
6. Presets: salvar cópia, nomear, comparar A/B, restaurar, exportar/importar e histórico de edição separado do undo de xadrez.

Knobs também terão campo numérico, unidades, teclado e toque. Filtros usam escala logarítmica. UI distingue “aplicado agora” de “entra no próximo compasso”.

Feedback deriva dos mesmos eventos agendados para áudio, alinhado ao tempo de reprodução e considerando latência, não de timers decorativos. Cada nota pulsa na peça; duração pode aparecer como halo; intensidade e timbre usam sinais distintos; casa tocada mostra grau/nota; arraste mostra valor temporário; ameaças indicam a modulação ativa. Prever redução de movimento e comunicação que não dependa só de cor. Não desenhar todas as relações táticas permanentemente.

## 10. Kit inicial de Düsseldorf

Proposta para teste, não reconstrução histórica definitiva:
- Peões: bumbo, caixa, chimbal fechado/aberto, clap, tom, rim e percussão eletrônica; funções complementares entre os lados.
- Cavalos: baixo monofônico, com opção supersaw filtrada e alternativa simples para comparação.
- Torres: synth de sopro/metais com frases de resposta.
- Bispos: teclas/synth sequenciado e arpejado.
- Rei: cordas sintetizadas sustentadas.
- Rainha: melodia principal sintetizada, com variante vocal/vocoder quando houver asset apropriado.

Começar com BPM sugerido pela fase atual e testar alternativas; o exemplo a 175 BPM é referência de organização, não obrigação de tempo ou estética.

A ativação por primeiro movimento e o silêncio por captura são preservados mesmo se uma abertura demorar a trazer o baixo ou o rei. Compor padrões que funcionem em formações incompletas; não criar instrumentos invisíveis para preencher automaticamente a banda. Um backing track só existirá como opção explícita futura.

## 11. Etapas de implementação e portas de validação

### Etapa 0 — referência e diagnóstico reproduzível
- Preservar comportamento atual para comparação; corrigir erros de TypeScript que impedem validação.
- Executar e ouvir a referência Strudel normalizada.
- Criar cenários reproduzíveis: poucas peças, banda densa, captura, arraste cancelado, xeque, roque, promoção, en passant e undo/redo.
- Criar laboratório com peças reais e controles para comparar presets; simulações não mudam regras da partida real.

### Etapa 1 — transporte e integração real do Strudel
- Inicialização pelo gesto do usuário, carregamento de assets, start/stop idempotentes e descarte de vozes.
- Um relógio comum; atualização de padrões preserva fase; BPM e mudanças harmônicas com fronteira explícita.
- Adaptador com agendamento de feedback visual, tratamento de erro e manutenção do último padrão válido.
- Carregar dependências/assets de forma que vs IA possa funcionar sem rede após instalação/cache previsto; “vs IA” e “sem conexão” serão testados separadamente.
- Validar timing, pausa, CPU sob interação e mixagem antes de ampliar timbres.

### Etapa 2 — vozes persistentes e modelo configurável
- IDs das peças, três comportamentos, definições de instrumento/kit e registro de parâmetros.
- Ciclo inativa/ativa/capturada; roque, promoção, en passant; snapshots/eventos restauram estado musical no undo/redo.
- Contexto tonal comum e separação entre estado confirmado e overlay temporário.
- Prova de generalidade no laboratório: percussão, baixo sequenciado e voz sustentada; trocar timbre/papel por configuração.

### Etapa 3 — composição do kit eletrônico
- Construir motivos complementares e variações em vários compassos.
- Testar movimentos como transformações limitadas, harmonia comum, destaque temporário e tensão/resolução.
- Ajustar densidade para até 32 vozes potenciais sem descartar arbitrariamente peças ativas.
- Comparar regras isoladamente antes de acumular modulações.

### Etapa 4 — tocar, arrastar e editar em tempo real
- Gestos reversíveis, modo tocar explícito e feedback sincronizado.
- Inspetor por capacidades, sequenciador inicial, notas/graus, controles globais e mapeamentos.
- Presets locais, A/B, travas, exportação/importação e código real.

### Etapa 5 — validação musical conjunta (obrigatória)
- Ouvir e jogar aberturas diferentes, partidas lentas, partidas longas e finais com poucas peças.
- Comparar groove fixo/variável, escala fixa/progressão e transformações por direção/mobilidade.
- Critérios subjetivos com o usuário: vontade de continuar ouvindo, groove reconhecível, evolução sem fadiga, contribuição identificável de cada peça e prazer de improvisar.
- Critérios técnicos: todos os controles afetam o destino certo; cancelamento restaura o estado; captura encerra novos ataques; editar não reinicia o transporte; contexto harmônico compartilhado; replay reconstitui decisões musicais.
- Não declarar “música boa” apenas porque testes passam. Só avançar para produto amplo quando a experiência auditiva for aprovada pelo usuário.

### Etapa 6 — autoria e catálogo oficial
- Evoluir o editor local para admin: rascunho → validação de schema/assets/padrões → audição → publicação versionada.
- Banco de definições separado de inventário/propriedade dos usuários. Conta possui referência ao item, não código duplicado.
- Salvar nomes, imagens fantasia, créditos, referências culturais, versões, dependências e compatibilidade.
- Partidas fixam versões para preservar replay. Código autoral local não vira automaticamente código oficial executado por todos.
- Escolher banco e infraestrutura quando esses fluxos estiverem comprovados. Não implementar loja antes de autoria e compatibilidade.

### Etapa 7 — modos, multiplayer e vestiário
- Classic Chess: regras/objetivo convencional, vs IA e posteriormente online.
- ChickenChess: proposta cooperativa/invertida; dar mate faz perder, empate recompensa ambos, longevidade e marcos musicais geram ovos de ouro.
- Definir antes de implementar: abandono, desconexão, timeout, repetição, regra dos lances sem captura/peão, empate automático, acordo de encerramento e limites de farm. Regras legais e condições de término podem diferir por modo, explicitamente.
- “Ganhar perde” precisa de distinção entre resultado de xadrez e recompensa do modo; não inferir que abandonar concede a mesma recompensa.
- Bônus candidatos: dez jogadas sem captura; esclarecer se jogada é um lance individual ou par de lances. Definir distribuição dos ovos em vitória invertida/empate e limites antes da economia.
- Vestiário equipa instrumentos/aparências conquistados em slots legais. Mistura de kits precisa de contexto musical, registro e orçamento de densidade comuns.
- Online sincroniza eventos, versões, seed e tempo musical; cada cliente sintetiza localmente. Definir compensação de relógio/latência, fronteiras futuras para mudanças comuns, reconexão e política para performance manual remota. Determinismo musical não promete áudio idêntico bit a bit entre dispositivos.
- Separar gestos locais exploratórios de mudanças compartilhadas para que o arraste de um usuário não sobrescreva silenciosamente a música do outro.

### Etapa 8 — mundo e história musical
- Lobby com mapa e slider temporal, fases por cidade/intervalo histórico e conexões entre tradições.
- Conteúdo educativo por instrumento, padrão e estilo; curadoria e atribuição, sem reduzir continentes/países a um único gênero.
- Catálogo de interesse registrado: alternative, escola de samba, blues, orquestra clássica, country, dance, electronic, hip-hop, jazz, pop, ópera, MPB, rock'n'roll, metal, post-rock, reggae, anime, trip-hop, industrial, minimal, folk, tradições chinesas, tradições africanas, funk e new age. São categorias iniciais heterogêneas a organizar; duplicatas removidas, sem perder a intenção.
- Loja, progressão, conquistas e monetização serão definidos depois; não adotar automaticamente valores do roadmap antigo.

## 12. Decisões abertas para os experimentos

- Articulação da audição confirmada ao pegar peça inativa: execução temporária do padrão e resposta ao arraste conforme o instrumento; ajustar entrada/saída e retrigger, preservando a descoberta sonora antes do primeiro lance.
- Duração/força do destaque recente e sua relação com a improvisação manual.
- Escala fixa versus progressão global e quais fatores podem modulá-la.
- Mapeamentos por direção: graus, rotação rítmica, registro ou seleção de frase.
- Caudas após captura e restauração temporal no undo: transporte deve continuar por default, estado musical volta ao snapshot.
- Alcance do editor visual inicial e macros expostas pelo modo código.
- Política musical entre os lados: timbres complementares, variação do mesmo kit e mistura de kits.

Essas decisões são variáveis de laboratório. Não bloqueiam a definição de IDs, eventos, transporte, configurações versionadas e camadas temporárias.

## 13. Referências técnicas consultadas

- Integração Strudel: https://strudel.cc/technical-manual/project-start/
- Mini-notation e estrutura temporal: https://strudel.cc/learn/mini-notation/
- Funções tonais: https://strudel.cc/learn/tonal/
- Referência musical fornecida pelo usuário: “A Certain Buzz”, atribuição no trecho a eefano; ainda requer normalização e execução antes de usá-la como fixture técnica.

A v0.3.2 inclui catálogo compartilhado de 19 nomes de escalas (Aeolian equivale à menor natural), opção de espera por compasso por regra e indicadores de pendência. O agendamento agora usa diretamente o relógio de áudio; afinações além de 12-TET e menor melódica dependente da direção ainda são futuras.

Entregue neste ciclo: scheduler por AudioContext com fila em limites de compasso, rampas de BPM 0–16 compassos e visualização de transições; seleção A–H e editor de notas com mouse, duração independente e grade binária/ternária no Criativo; centros harmônicos compartilhados, tríades diatônicas e condução curta entre seções. Próxima etapa de composição: graus preferenciais por estilo, tétrades/extensões e arranjo adaptativo. Editor touch, gramáticas melódicas e modulações harmônicas preparadas continuam futuros.
