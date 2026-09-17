# ChickenChess — mecânica em funcionamento

Atualizado em 16/09/2026 — v0.3.2 (The Creative). Referência de comportamento atual para desenvolvimento e testes. Ideias futuras ficam no fim e em `MUSIC_ENGINE_PLAN.md`; não são comportamentos já implementados.

## Leitura por assunto

| Assunto | Seção a consultar |
| --- | --- |
| Ativação, captura, cheque, pausa e gesto | [Ações e efeitos](#ações-e-efeitos-implementados--todas-as-cidades) e [Movimento](#movimento-e-interpretação) |
| Piece/Board Params e DJ | [Widgets](#widgets-da-partida) e [Mixer](#mixer-dj-na-partida) |
| Kits, migração, laboratório | [Criativo e persistência](#criativo-e-persistência) e [Escopo](#escopo-e-dados) |
| Regras, transições e BPM | [Estados e Eventos](#estados-e-eventos--v032) |
| Piano roll, seções e slides | [Editor](#editor-de-variações--v032) e [Seções próprias](#seções-próprias-slides-e-ajuda-contextual--1609) |
| Globo e cidades | [Mapa](#mapa-e-entrada-na-fase) |
| Processamento | [Gestos e custo](#gestos-e-custo-de-processamento) |

Localização do código e checks: `docs/CODEBASE_MAP.md`. Consulte as seções relacionadas ao pedido, incluindo suas prioridades; a agenda completa não é pré-requisito de toda alteração.

## Escopo e dados

A engine Strudel é usada pelas 13 fases cadastradas (12 cidades; Manchester tem duas épocas) e pelo Criativo. Todas compartilham as regras abaixo; sons de interface, introdução e encerramento continuam nativos. A compilação dos loops nativos fica desabilitada quando a fase usa Strudel.

As 13 fases usam kits compostos por contexto de cidade/época em `lib/music/styled-kits.ts`, incluindo Northern Jazz Breaks de Manchester 1999. Referências e limites históricos estão em `MUSIC_STYLE_REFERENCES.md`. O botão de sorteio continua disponível separadamente. Os papéis sonoros independem do tipo de peça; Vienna usa peões afinados, cordas/madeiras e tímpano. As cidades eletrônicas mantêm fundamentos rítmicos regulares ou quebrados, com linhas de comprimentos distintos e variações de filtro, acento, fonte e presença.

A coleção tem `catalogRevision`. Na primeira leitura de um kit salvo anterior à revisão atual, o navegador guarda seu JSON exato em uma chave de backup por cidade/revisão e adota o novo default. **Kit anterior** recupera a cópia para comparar/exportar; **Salvar kit da fase** pode adotá-la novamente. Saves feitos pelo Criativo recebem a revisão atual, inclusive kits importados/antigos restaurados, e conservam prioridade nas próximas leituras. Se não for possível gravar o backup ou o novo kit, conserva-se o salvo antigo. A atualização é local e por cidade, conforme ela é carregada; não publica dados em servidor.

| Dado | Significado | Duração / origem |
| --- | --- | --- |
| ID da peça | Cor e casa inicial, por exemplo `w:e1`; acompanha a peça ao mover/capturar/promover | Histórico legal da partida |
| Instrumento | Fonte, comportamento, notas, articulação, envelope, automações e vínculo de groove | Kit equipado no ID; independente do tipo de peça |
| Já movimentada | A peça completou pelo menos um lance; no roque entram rei e torre | Reconstituído pelo histórico, inclusive undo/redo |
| Ativa efetiva | Já movimentada **ou** pertence à equipe que está dando cheque | Calculada a cada lance; cheque não modifica o histórico |
| Ativação por cheque | Peça sobrevivente que ainda não se moveu, mas está tocando pelo efeito de equipe | Temporária, termina ao sair do cheque |
| Gesto manual | Peça e casa que estão sendo percorridas, em camada separada | Enquanto segura/arrasta; não altera posição nem ativação permanente |
| Contexto musical | Tom, escala, BPM, volume, timeline e grooves comuns | Kit da cidade + ajustes desta partida |

### Manchester · 1999 — kit composto

O default composto de `manchester-1999` usa **Northern Jazz Breaks**, composto em `lib/music/manchester-kit.ts`: 123 BPM, Sol dórico, A4/B8/C4/D8 compassos. A tonalidade e as frases são escolhas originais de arranjo inspiradas em Get a Move On!, não uma transcrição medida da gravação. O kit contém bateria, baixo/pergunta e baixo/resposta, palheta principal, barítono, metal, teclas e vogal sintética. Tempos longos/curtos 5:4 estão escritos nos padrões; não há jitter aleatório. Cada peça ativa produz ataques nas quatro seções, inclusive rainhas. Movimento lateral desloca graus lentamente; avanço não transpõe o motivo neste kit. As regras de ativação, cheque, captura e audição continuam as mesmas.

O banco local `chicken-jazz-v1` traz 11 one-shots sintetizados, gerados por `scripts/generate-jazz-samples.py`, sem recortes da gravação fornecida. Qualquer peça/kit pode selecionar esses sons no Criativo. Raízes dos samples afinados são explícitas; buffers são compartilhados e carregados sob demanda. Exportação JSON e código Strudel estão em `public/presets/manchester-1999.*`, regenerados por `node scripts/export-manchester-kit.cjs`.

Manchester 1988 mantém seu ID, kit e salvamento. As duas épocas compartilham um pin geográfico, com seletor 1988/1999 no popup. Vitória/progresso/kit salvo são independentes por ID; a bandeira do local aparece se qualquer época estiver conquistada. Os seletores do Criativo mostram cidade e ano. `/creative?city=manchester-1999` carrega o kit dessa fase com 16 brancas ativas, mas aguarda um gesto para iniciar áudio; o kit salvo localmente tem prioridade sobre o default.

## Ações e efeitos implementados — todas as cidades

| Ação / condição | Efeito musical | Feedback / retorno |
| --- | --- | --- |
| Início da partida | Todos os loops começam inativos, sem acompanhamento oculto | Tabuleiro sem marcas de ativação |
| Primeiro movimento legal | Ativa o loop da peça, preservando o relógio comum | Marca de peça ativa; pulsos dos ataques |
| Movimentos seguintes | Atualizam graus e pan conforme o mapeamento do instrumento | Casa nova, notas e valores no inspetor |
| Pegar/arrastar no tabuleiro | Suspende o loop somente daquela peça. Toca um ataque/nota na casa inicial e em cada nova casa percorrida; ficar parado não repete a frase | Casa da prévia e pulsos; estado manual no Strudel |
| Arrastar uma peça inativa | Mesma audição manual, sem ativar permanentemente o loop | Ao cancelar continua inativa |
| Soltar na origem, fora, destino ilegal, Escape ou cancelamento | Encerra a voz manual e restaura o acompanhamento da posição confirmada | Some a prévia; o loop volta se a peça está ativa efetivamente |
| Soltar em destino legal | Encerra o gesto, confirma a posição e ativa a peça | Loop segue com a transformação do lance |
| Captura | Remove a voz capturada e seus novos ataques; o atacante conserva seu ID/instrumento | Peça desaparece do tabuleiro e aparece na lista de capturas |
| En passant | Remove a voz do peão na casa de onde foi capturado | Mesmo comportamento de captura |
| Roque | Move e ativa rei e torre | Dois IDs/posições atualizados |
| Promoção | Mantém o ID; no kit equipado, conserva o instrumento desse ID | A peça passa a seguir os movimentos legais do novo tipo |
| **Dar cheque** | **Todas as peças sobreviventes da equipe atacante ficam ativas.** Suas máscaras de entrada são temporariamente ignoradas. As pausas internas das frases/grooves e os volumes editados continuam valendo | Todas recebem marca ativa; Strudel informa “CHEQUE · banda branca/preta completa”; Piece Params identifica uma ativação temporária |
| **Sair do cheque** | Remove o efeito de equipe. Voltam a tocar apenas as peças já movimentadas; máscaras originais voltam a valer | Marcas e indicadores voltam ao estado calculado pelo histórico |
| Undo/redo | Reconstitui posição, capturas, peças já movimentadas e efeito de cheque | Edições manuais de som continuam associadas aos IDs |
| Xeque-mate | Encerra a reprodução e executa o som de encerramento; o encerramento tem prioridade sobre a banda do cheque | Resultado e recompensa/progresso existentes da fase |
| Empate / afogamento | Encerra a reprodução e executa o som de empate | Resultado da partida |
| Pausar / retomar | Pausa todos os loops. Retomar reinicia o transporte; gestos manuais ainda podem ser ouvidos quando pausado | Indicador de transporte |
| Editar tom/escala | Todas as vozes afinadas usam o novo contexto nos próximos ataques. Samples não afinados mantêm a altura original | Seletores em Board Params e notas executadas em Piece Params |
| Editar BPM/volume | Altera o relógio comum ou a mixagem | Board Params e transporte em Strudel |

**Tom, escala e BPM agora podem responder às regras de Estados e Eventos salvas no kit.** Por padrão, só existe a regra de ativar a banda atacante durante cheque; nenhum kit antigo recebe modulações automáticas novas sem edição. As regras são sobreposições da configuração base, não modificações permanentes ou cumulativas do kit. Detalhes abaixo.

A regra padrão de cheque não ressuscita peças capturadas, não ativa a equipe defensora e não aumenta BPM ou ganho. Essa regra pode ser editada, desabilitada ou removida por kit. Entradas respeitam os próximos ataques do arranjo; não há reinício das frases nem disparo de todas as notas no mesmo instante. Acima de dez loops, a engine atenua a mixagem progressivamente para acomodar a banda.

Prioridades: captura/encerramento/pausa controlam a existência dos loops; o gesto manual substitui a voz da peça segurada; o cheque amplia a formação temporariamente; o histórico define a formação permanente. Ganho zero e pausas compostas continuam sendo escolhas musicais válidas.

## Movimento e interpretação

- Frases e vozes sustentadas: deslocamento de coluna e avanço relativo à cor deslocam graus da escala segundo os valores do kit. O resultado é limitado, evitando saltos sem controle.
- Comportamento de pulso: mantém os graus ao mover; pan e filtro de prévia continuam respondendo. Uma peça de qualquer tipo pode usar esse comportamento.
- Coluna: posição estéreo segundo a abertura configurada e o pan adicional.
- Altura durante o gesto: limita o filtro temporariamente quando o mapeamento está habilitado.
- O gesto manual toca um grau por casa; não reproduz automaticamente groove, acorde ou frase inteira. Nesta versão, synths também recebem novos ataques por casa com seu envelope. Gate sustentado até soltar e portamento entre casas ainda são futuros.
- O preset comparativo Düsseldorf original · samples tem timeline A/B/C/B, quatro compassos por seção, em `[0@4 1@4 2@4 1@4]/16`. Um ciclo tem quatro tempos.
- Automações são lidas a cada ataque; não modulam continuamente uma nota que já começou.

## Widgets da partida

| Widget | Conteúdo / controles | Destino real |
| --- | --- | --- |
| Piece Params | Instrumento e casa selecionados; execução de notas/pausas; ganho, oitava ou pitch de sample não afinado, pan, delay, filtros, reverb, decay, ataque, sustain, release e duração | ID selecionado, sem modificar as outras peças |
| Board Params | Volume, BPM, tom, escala; ganho e EQ por equipe; fine pitch e quartz lock comuns; ambiência somente no motor antigo | Contexto da partida e mixagem Strudel por lado |
| Strudel | Estado do áudio/gesto, quantidade de vozes ativas, cheque, seção, compasso e pulso acima do código | Mesmo snapshot/padrões utilizados pela engine |
| Spectrogram | Espectro da saída de áudio | Mixagem real |

Knobs aceitam mouse, toque, roda do mouse e teclado (setas, Home/End). A roda sobre o knob altera o valor; Shift amplia esse passo. Filtros e controles de envelope selecionados usam escala logarítmica. Editar filtro, pan, reverb ou delay remove a automação absoluta desse parâmetro nesta partida, para o knob assumir o controle; editar ganho preserva os acentos e multiplica seu volume. As edições no jogo não sobrescrevem automaticamente o kit salvo da cidade. O monitor do Piece Params reserva a altura para o estado, notas, gráfico e valores de efeitos, evitando que os pulsos redimensionem o widget.

O quadro MIDI da peça selecionada mostra todas as variações salvas, uma abaixo da outra, rotuladas por letras. Inclui os bancos de groove/automações; quando bancos têm tamanhos diferentes, mostra suas combinações cíclicas (até 24 na inspeção da partida; até oito variações editáveis no Criativo). Na partida, a região tem altura fixa e scroll interno. No Criativo, todas as variações ficam expandidas, usando apenas o scroll da coluna. Cada quadro mostra uma janela de até quatro compassos; a janela da variação atual avança quando necessário, com ponteiro apenas enquanto sua voz está em execução. Peças inativas/pausadas continuam mostrando os padrões salvos, sem ponteiro. Gestos manuais no tabuleiro ocultam o ponteiro de loop; a audição do padrão completo conserva-o. Máscaras de entrada não apagam a composição desenhada. Apenas a voz inspecionada é compilada para essa visualização; janelas são cacheadas, sem recompilar nos ticks do relógio.

Widgets flutuantes podem ser arrastados pelas áreas de fundo/conteúdo não interativo. Botões, knobs, sliders, seletores, código selecionável e alças de redimensionamento conservam suas funções. No celular, o botão “Parâmetros musicais” abre os painéis empilhados; nesse painel eles permanecem no fluxo da página, com fundo e controles contidos no próprio widget. Soltar, cancelar toque ou perder foco encerra o arraste.

## Criativo e persistência

| Ação | Resultado |
| --- | --- |
| Cidade para experimentar + Carregar kit da cidade | Seleciona qualquer cidade e carrega sua versão salva neste navegador, ou seu kit composto inicial; restaura posições e ativa as 16 brancas para escuta |
| Kit inicial da cidade | Carrega o arranjo composto de fábrica, sem sobrescrever o kit salvo |
| Gerar kit aleatório | Sorteia outra configuração vinculada à cidade escolhida, ativa as 16 brancas e inicia a escuta. Só Salvar kit da fase a adota na próxima partida |
| Düsseldorf original · samples | Carrega o preset de fábrica com 16 brancas; não sobrescreve o kit salvo automaticamente |
| Ativar/silenciar uma peça | Liga/desliga diretamente seu loop, sem exigir lance legal |
| Solo | Ouve só a peça escolhida, ignorando sua máscara de entrada |
| Solo | Também substitui a antiga audição por botão do padrão completo. O botão “Segure para ouvir” foi removido do Criativo; segurar uma peça continua tocando notas individuais, não a frase inteira |
| Tocar casas | Usa o instrumento selecionado nas casas, sem mover peças |
| Mover/trocar peças | Tabuleiro livre; confirma posição e ativa a peça sem regras de xadrez. Durante o arraste, a própria peça acompanha ponteiro ou toque; a peça original fica oculta até soltar/cancelar |
| Salvar kit da fase | Salva o kit associado à cidade no armazenamento local; a próxima partida usa essa configuração |
| Exportar/importar | JSON v4 com fontes, padrões, grooves, automações e parâmetros; schema e Strudel são validados |

Não há ainda catálogo oficial em servidor, inventário online ou sincronização automática entre dispositivos. Armazenamento do kit, rascunho criativo e ajustes temporários da partida são camadas distintas.

No Criativo, em desktop, tablet e tela de celular em paisagem, Tabuleiro/Estados e Eventos ocupam a coluna esquerda, Instrumento a primeira coluna direita e Parâmetros/Banda a segunda. Cada coluna tem rolagem própria, com barras visuais escondidas (scroll por roda, trackpad e toque preservado); as colunas não têm gap. O seletor de kit ocupa uma faixa inteira acima do transporte. Em celular em retrato, o tabuleiro volta ao topo e os painéis seguem abaixo para preservar a área útil e o toque.

## Estados e Eventos — v0.3.2

O bloco abaixo do tabuleiro no Criativo permite escolher um estado, o lado do gatilho e disparar eventos sem alterar a posição das peças. Exibe BPM/escala resultantes e as influências em execução. O catálogo completo lista todos os gatilhos disponíveis. A simulação fica apenas na sessão: carregar outro kit limpa-a; salvar/exportar guarda regras e limiar, nunca os eventos simulados. A partida usa o mesmo aplicador de regras, com estados/eventos reconstruídos do histórico legal; undo/redo não duplica efeitos. O widget Strudel mostra as influências ativas na partida.

| Tipo | Gatilhos / critério |
| --- | --- |
| Fase contínua | Final com até 10 peças no total; caso contrário abertura até 20 meios-lances, depois meio-jogo |
| Situações contínuas | Cheque, mate, afogamento, repetição tripla, material insuficiente, empate, vantagem material de pelo menos 5 pontos (peão 1, cavalo/bispo 3, torre 5, rainha 9) |
| Eventos | Primeiro/segundo roque, primeira captura/qualquer captura, captura de rainha, transição para nenhuma rainha, transição para nenhum cavalo/torre/bispo de um lado, promoção/subpromoção, en passant, saída de cheque |
| Formação mínima | Cruzar o limite configurado de peças **restantes** por lado (inclui rei, padrão 4), em um ou nos dois lados. Não mede peças musicalmente ativas |
| Trecho quieto | Completar 10 meios-lances consecutivos sem captura nem movimento de peão |

Em cheque/mate, o lado do gatilho é o atacante. Em perda de uma família/formação mínima de um lado, é o lado afetado. Nos demais eventos, é quem executou o lance; nas fases/empates é quem tem a vez. O Criativo permite escolher explicitamente esse lado. A partida pode ter estados simultâneos; o dropdown do Criativo isola um estado por vez para comparação. No Criativo, simular mate/empate não encerra a bancada; na partida o encerramento real continua tendo prioridade sobre áudio e ativação.

Cada regra tem gatilho, habilitação, alvo (ambos, brancas, pretas, lado do gatilho, oponente), ações e, para eventos, duração de 1–32 **meios-lances**. Regra de estado deixa de agir ao sair dele. Evento deixa de agir quando o histórico avança sua duração; nova ocorrência renova o efeito, não soma outra aplicação da mesma regra. “Avançar meio-lance” e “Limpar simulação” permitem verificar a expiração/retorno.

Ações: transposição de −12 a +12 semitons (2 = um tom), BPM ±30%, escala paralela, relativa maior/menor natural, rotação modal, inversão do contorno melódico, variação A–H, ganho −100 a +100%, filtro passa-baixas 20–20000 Hz e ativação temporária da banda. BPM e troca/relativa/rotação de escala são globais, mesmo se o alvo for uma equipe. Transposição, ganho, filtro, inversão, variação e ativação respeitam o alvo. Inversão espelha graus, não inverte o áudio. Relativa só age sobre maior/menor natural; em outras escalas a UI informa que foi ignorada. “Escala complementar” não recebe definição arbitrária. Forçar variação seleciona também seus bancos de groove e automação.

Regras são aplicadas na ordem salva. Percentuais multiplicam; a última escala, filtro ou variação prevalece. Tudo é recalculado sobre a base, sem deriva; BPM é limitado a 30–240, ganho por peça a 0–2 e fator de afinação final a 1/8–8. Filtro de regra assume o lugar da automação de filtro enquanto ativo; remover a regra restaura a automação original. Transposição não afina samples não afinados. Ativação só alcança peças sobreviventes e ignora máscaras de entrada; o gesto manual continua substituindo o loop da peça.

Quartz lock tem prioridade sobre mudanças de BPM por regras e mantém o BPM original do kit. Edições da base e do mixer permanecem independentes das sobreposições. Cada regra possui **Aplicar na virada do compasso**, salvo no kit (`quantize`, default falso para preservar kits antigos). Desmarcado: entrada/edição/retorno seguem os próximos ataques agendáveis. Marcado: segura a influência anterior até a fila do agendador atingir o próximo ciclo de quatro tempos ainda disponível, tanto no Criativo como na partida. A interface indica regras aguardando. Alterações sucessivas antes da virada substituem a pendência; um evento que expira antes dela não deixa efeito atrasado. Pausar, carregar outro kit, remover a regra ou desmarcar a opção aplica/cancela a pendência imediatamente. Remover/desabilitar uma regra é possível durante a simulação; desabilitar com quantização marcada aguarda a virada para retirar a influência. Edições da base continuam imediatas, sem congelar o kit inteiro.

**Agendamento de áudio:** `MusicTransport` consulta padrões Strudel antecipadamente, pelo relógio de `AudioContext`, em janelas limitadas que separam as viradas. A fila de regras aplica as pendências antes de consultar o primeiro ataque do compasso escolhido; React e o monitor visual não decidem mais o momento das notas. Uma edição usa o próximo compasso ainda não agendado (pode ser o seguinte ao próximo audível se a janela já avançou). Ataques recebem timestamps absolutos; eventos atrasados por suspensão não são disparados em rajada, e a retomada usa uma virada disponível. Notas já agendadas e caudas em execução não são reescritas.

A ação de BPM oferece **Rampa de BPM: 0–16 compassos**. Zero troca diretamente; acima de zero o BPM varia linearmente em posição musical, com conversão analítica entre ciclos e segundos. Interromper uma rampa parte do BPM alcançado e preserva a posição do transporte. Quando várias regras mudam juntas, usa-se a maior duração de rampa entre as ações de BPM envolvidas; a saída também usa a rampa da regra anterior. Pausa/carregamento eliminam pendências e retomam o transporte em zero no valor base/resultante atual. Quartz lock tem prioridade e ignora a rampa para fixar o BPM original. Avanço de rampa não recompila os padrões por frame. A duração de notas já agendadas não é recalculada por uma mudança posterior.

O Criativo mostra BPM atual/destino e avanço no transporte superior. Abaixo do tabuleiro, **Relógio e transições** acrescenta curva com ponteiro, quatro tempos, notas disponíveis e contagem até cada regra pendente. Esses indicadores seguem o relógio de áudio; a cadência visual pode ser menor que a precisão dos timestamps de áudio. Precisão validada com relógio simulado e navegador; escuta/desempenho em aparelho físico continuam pendentes.

Kits JSON continuam no schema 4, com campo aditivo `reactions`. Kits antigos recebem apenas a regra padrão de cheque. Nomes terminados em “ · a2” ou outra casa são normalizados sem esse sufixo ao carregar/validar. A peça arrastada é posicionada no próprio tabuleiro, com compensação de escala e borda, acompanhando mouse/touch.

## Mixer DJ na partida

No Board Params, selecionar Brancas ou Pretas direciona os knobs de ganho (0–1,5) e graves/médios/agudos (−12 a +12 dB) ao áudio daquela equipe, incluindo caudas de efeitos. A equalização usa dois buses reais de Web Audio, depois dos efeitos individuais: graves em 200 Hz, médios em 1 kHz e agudos em 4 kHz. Mudanças têm suavização de 20 ms. Volume geral e atenuação por densidade continuam aplicados antes desses buses.

O relógio continua compartilhado. Fine pitch (±8%) altera BPM e afinação de ambas as equipes, como velocidade de disco; não muda os graus da escala salvos. Quartz lock restaura o BPM original do kit carregado e afinação normal, sobrescrevendo temporariamente BPM base e fine pitch. O slider permanece editável e visualmente apagado; destravar aplica o valor preparado sobre o BPM base. Esses controles são temporários da partida, reiniciam ao carregar cidade e não alteram o kit salvo. Reverse de áudio, scratch, platter e velocidades independentes ainda não existem; não confundir inversão de uma sequência com reprodução reversa do áudio.

## Gestos e custo de processamento

Na partida, o arraste captura o ponteiro na casa estável, inclusive em touch, e move a imagem por transformação de DOM; não depende de eventos no SVG que desaparece ao pegar a peça. As casas percorridas continuam disparando audição e pulsos visuais. Soltar confirma a jogada válida; cancelar/blur/Escape restaura o loop conforme as regras anteriores.

O acompanhamento só é reenviado ao scheduler quando seus padrões mudam, não a cada casa atravessada em uma audição. Painéis musicais fechados não montam os gráficos; código Strudel oculto não é regenerado, e o monitor periódico consulta padrões apenas com assinantes. Dispositivos restritos usam DPR 1 no globo e agendamento de loops com antecipação de 180 ms (desktop 100 ms); audição manual mantém seu caminho de baixa latência. Esses cortes de trabalho não equivalem a aprovação de desempenho/áudio em celular físico.

### Otimização de arraste e exportação — 16/09

Durante a travessia entre casas da mesma peça, só a voz manual muda; entrada e saída do gesto continuam suspendendo/restaurando a banda. Notas, cancelamento, carregamento, cheque e prioridades anteriores permanecem. No Criativo, a imagem acompanha mouse/toque por transformação de DOM; soltura/cancelamento remove a imagem temporária. O código Strudel é gerado somente com seu painel aberto, onde aparecem contagens estruturais (não nós DSP ativos).

O reverb manual reutiliza o buffer de impulso por configuração, com cache limitado ao runtime; cada ataque conserva seu próprio nó, e a cauda cancelada não retorna na casa seguinte. O impulso aleatório deixa de ser regenerado em toda casa, mantendo a mesma configuração acústica. Alterar configuração ou encontrar buffer ainda pendente usa a fábrica original. Encerrar o runtime limpa o cache. Loops continuam com orbits individuais.

Notas explícitas são agrupadas por início/duração e controles compatíveis; sobreposições permanecem separadas. Playback consome segmentos diretamente e exportação usa mini-notation ponderada. Seções, andamento, instrumentos, envelopes e regras não mudam; saves conservam o schema atual. Decisões, medições e limitações em `docs/CPU_OPTIMIZATION.md`.

## Mapa e entrada na fase

- Abrir uma cidade orienta a câmera para seu pin; popups podem ser reposicionados.
- Controles do globo escutam somente seu canvas, isolados dos popups. O cursor grab pertence ao canvas e é removido na saída da tela. Touch em Enter board não inicia arraste do mundo.
- Arrastar interrompe a centralização anterior. O giro automático espera terminar o gesto e mais 800 ms, sem inércia concorrente. Dois dedos mantêm o pinch e acrescentam giro do globo no mesmo sentido visual do gesto pelo ângulo entre os dedos (sinal do roll da câmera corrigido); isso não gira o tabuleiro da partida.
- Na apresentação da cidade, o quadro de informações pode ser arrastado pelo fundo com mouse ou touch; Start match fica acima dele. No cabeçalho mobile, Modo Criativo fica na linha abaixo de About/maximizar.
- Segurar o fundo de um popup reduz a escala para 92%, usando o ponto pressionado como origem; não há rotação durante esse gesto. O arraste mantém o whistle contínuo e acrescenta ataques curtos na pressão, durante o deslocamento e ao soltar. Botões internos conservam suas próprias ações e sons.
- Um popup aberto não interrompe o giro de espera: depois de a câmera terminar de centralizar a cidade, o globo volta a girar. Passar o cursor sobre um pin pausa esse giro e amplia o pin em 15%; ao sair, o relógio de espera volta a contar.
- Cidades conquistadas são lidas do perfil local e ganham uma bandeira verde acima do pin, além do halo de conquista existente.
- “Enter board” conduz a câmera à cidade por cerca de 1,4 s e só então abre a fase. A direção considera a rotação atual do globo; comandos de câmera ficam suspensos durante essa transição.
- A preferência de movimento reduzido encurta a transição. A introdução atual da fase continua existindo após a chegada.
- A superfície usa o litoral geográfico real do Natural Earth 1:110m, incluindo ilhas principais, convertido do SVG local em segmentos vetoriais sobre a esfera, sem textura rasterizada nem fronteiras regionais. O traço do contorno dos continentes usa a cor verde neon (`#39ff14`), com sombreado suave pela direção do sol. A grade de latitudes/longitudes a cada 15° permanece visível. O detalhe geográfico continua limitado à resolução da fonte cartográfica. O sol tem halo radial e a lua é pequena e fosca, iluminada pela direção do sol. Nenhum efeito de áudio depende desse fundo.
- A linha entre popup e pin fica com 50% da opacidade quando o pin passa para trás do horizonte da esfera; volta à opacidade normal quando reaparece. A posição real do pin e a perspectiva da câmera determinam essa mudança, sem atualização React por frame.
- O título do popup não exibe pontos de recompensa. O rodapé mostra `Reward: X PTS`, usando o valor real da próxima vitória: 1.000 na primeira conquista ou 200 na repetição.
- O clique de um pin (tom e prato reverso de abertura) usa 30% do ganho anterior, redução de 70%; o pulso de hover usa 70%, redução de 30%. Sons de arraste dos popups e do botão Enter board conservam seus ajustes.
- Clicar em `v0.3.2` abre o changelog com rolagem interna, disponível no mapa, na partida e no Criativo. Escape, botão de fechar ou clique fora encerram o popup; o histórico fica em `lib/changelog.ts`.

## Estados e ideias ainda não associados à engine Strudel

Contagem de ameaças sofridas/produzidas, ameaça à rainha, mobilidade legal, proximidade do rei, estados “tenso/excitado”, bônus de captura, destaque elaborado da última peça, progressões harmônicas e modulação por vitória provável não estão implementados. Vantagem material e eventos abaixo já podem controlar parâmetros por regras do kit. O efeito de equipe durante cheque é a primeira regra tática coletiva.

ChickenChess cooperativo/invertido, ovos de ouro, multiplayer, vestiário, administração/publicação de kits e mundo por época continuam planejados. A partida atual segue o xadrez clássico contra IA.

## Manutenção e verificação

Toda mudança de regra, gesto, controle ou persistência deve atualizar a linha correspondente neste documento, com gatilho, efeito, retorno/prioridade e escopo. `MUSIC_ENGINE_PLAN.md` mantém a agenda futura; este documento descreve o presente.

Fontes principais: `lib/music/model.ts`, `lib/music/runtime-session.ts` e módulos descritos em `docs/CODEBASE_MAP.md`, `hooks/use-music.ts`, `components/chess-game.tsx`, `components/creative-studio.tsx`, `components/ui/draggable.tsx`, `components/globe-component.tsx`. Regressões em `tests/music.test.cjs` cobrem cheque/saída/mate/capturas/undo, interrupção do loop no arraste, cancelamento, frase pelo botão e chegada ao pin.

### Catálogo de escalas compartilhado

`lib/music/scales.ts` é a fonte única para tom/escala do kit e ações de estados/eventos, validada na importação e preservada no salvamento. Além das seis coleções anteriores: Blues menor/maior, Whole tone, duas Octatonic/Diminished (tom–semitom e semitom–tom), Harmônica menor, Melódica menor ascendente/jazz, Phrygian, Lydian, Lydian dominant, Locrian, Aeolian e Chromatic. Aeolian é um alias sonoro de Menor natural. Rotação modal admite 0–11 graus, reduzidos pelo tamanho da coleção; relativa maior/menor só atua nas respectivas coleções, incluindo Aeolian. A menor melódica não muda automaticamente ao descer. Kits de fábrica aleatórios mantêm as seis escolhas originais para preservar seeds existentes; novas variações aleatórias exploram o catálogo completo.

As coleções usam temperamento igual de 12 semitons: não representam ainda afinações microtonais, regras de direção ou ornamentação de todas as tradições. Referência teórica: [Open Music Theory — Collections](https://viva.pressbooks.pub/openmusictheory/chapter/collections/). Afinações e gramáticas melódicas específicas ficam na agenda futura.

### Editor de variações — v0.3.2

No Criativo, cada peça possui até oito variações A–H. Clicar no título força aquela variação; **Seguir arranjo** volta à timeline comum. A escolha fica no instrumento e é salva no kit; a variação forçada por uma regra ativa tem prioridade. Selecionar não ativa uma peça inativa nem inicia sozinho o transporte. Uma seleção fixa conserva a fase global e toca o padrão completo, sem reiniciá-lo a cada compasso.

**Editar notas desta variação** converte quatro compassos do padrão/groove selecionado em notas explícitas (até 128), preservando o texto original para restauração. Trata-se de uma janela finita: variações algorítmicas posteriores à janela não são transcritas. O editor mostra graus da escala, notas, grade e ponteiro. Mouse: arrastar área vazia desenha; arrastar nota move; borda direita altera duração; duplo clique remove; Escape/pointercancel cancela o gesto. Ao soltar, a alteração entra nos próximos ataques disponíveis; Desfazer edição alterna com a edição anterior. Toque mantém scroll e controles; desenho por touch ainda não está habilitado.

Cada variação convertida permite duração de 0,25 a 8 compassos, em incrementos de um tempo. Encurtar remove notas fora da janela e recorta as que cruzam o limite. A grade escolhe quatro partes por tempo ou tercinas. Loops explícitos conservam fase global: uma peça pode repetir a cada três tempos e outra a cada quatro; são comprimentos independentes sobre o mesmo BPM. A duração distinta permite polimetria, e a grade ternária contra a quaternária permite relações polirrítmicas. O ponteiro de cada loop usa seu comprimento. A nota mantém grau, início, duração e velocidade; todas continuam respondendo à escala e aos mapeamentos da peça.

Variações explícitas são a fonte de ritmo daquela variação; o groove salvo continua disponível para as variações de texto e para **Restaurar padrão Strudel**. Automação, fonte, filtros e demais controles continuam aplicados. O código Strudel exibido inclui `timeCat`/notas explícitas. Aplicar o formulário de mini-notação ou uma receita substitui a edição visual e volta à fonte textual; salvar/exportar preserva `pianoRolls`, `selectedVariation` e `rampBars` em campos aditivos do schema 4. Durações de rampas e notas são limitadas e validadas na importação.


### Seções próprias, slides e ajuda contextual — 16/09

No Criativo, **Fraseado e seções da peça** habilita um arranjo por instrumento: até 24 blocos, 0,25–64 tempos por bloco, até 512 tempos no total. Cada bloco escolhe variação A–H, presença/pausa e transposição cromática de −24 a +24 semitons. A faixa proporcional mostra os comprimentos, a seção em execução e sua porcentagem; clicar nela seleciona o bloco para editar. Desabilitar arranjo próprio volta à timeline global. Pausar/recarregar reinicia o transporte e a forma.

Com **Reiniciar frase na entrada da seção**, a engine usa `pickRestart`, inclusive para piano rolls. Desmarcado, a seleção mascara loops com fase global, permitindo comprimentos independentes. Uma variação fixa escolhida no título ignora o arranjo próprio; a variação forçada por regra tem prioridade sobre ambas. **Seguir arranjo** remove a escolha fixa. A presença de um bloco é uma pausa composta, não ativação de peça: não ressuscita capturas, não ativa peças inativas e continua respeitada durante o cheque. Gesto manual suspende todo o arranjo da peça e toca a casa; ao soltar ele reencontra a posição do relógio, conforme ativação real. Transposição de bloco é cromática e pode sair da escala; samples não afinados não são transpostos.

Distorção: intensidade 0–10 e nível 0–1. O segundo controle corresponde a `distortvol` do Strudel, não a um crossfade linear garantido entre sinal seco e molhado. Slide global: envelope de −24 a +24 semitons e ataque de 0,001–2 s. Automações `penv`, `patt` e `distort` escolhem valores por ataque; o envelope de pitch evolui continuamente dentro da nota. Uma nota explícita pode guardar seu próprio slide/tempo, acento e pan. Slide diferente de zero e pan explícito substituem esses controles globais naquele ataque; slide zero herda o global. Notas com slide aparecem em laranja. Não há ligação automática/portamento entre ataques nem sustentação contínua ao atravessar casas.

Todas as linhas visíveis do piano roll são selecionáveis com mouse. O SVG ocupa a área inteira do editor, sem faixas internas de letterboxing que desalinhem ponteiro e notas. O domínio continua limitado a ±48 graus; não promete reprodução de graves/agudos extremos pelo alto-falante de celular. Os ponteiros usam o início da seção quando a frase reinicia e a fase global no modo contínuo.

Kits compostos diretamente em notas explícitas usam `pianoOnly`; não exibem um botão de restauração que apagaria a composição em favor de uma nota fictícia. Variações convertidas de mini-notação continuam podendo restaurar seu texto original. Aplicar texto/receita substitui a edição visual e remove essa marca. JSON v4 preserva todos os novos campos aditivos, validados por limites. O código Strudel exportado inclui seções, transposição, pausas, distorção, pitch por nota e pan; é uma fotografia do snapshot e não incorpora o histórico futuro de regras do jogo.

As instruções do Criativo ficam em **? dentro de um círculo preto**, junto ao rótulo ou título. Hover/foco mostra a dica; clique/toque fixa e um segundo clique/toque fecha. Escape ou pressão fora também fecha. A dica é posicionada no viewport por portal, acompanha scroll/resize e tem rolagem própria quando necessário, sem ser cortada pelas colunas. Abrir a dica não modifica campos nem aciona o cabeçalho/controle que a contém. Valores efetivos, estados, erros e resultados permanecem visíveis.

**Estudo Mouth Breather** carrega o preset separado de seis peças ativas, sem vincular/sobrescrever uma cidade. Tem 17 seções e 488 tempos a 215 BPM; as partes originais de guitarra e baixo foram comparadas com consultas Strudel ao exemplo fornecido. Fontes, limitações e regeneração estão em `MUSIC_STYLE_REFERENCES.md`. O banco Chicken World pode ser usado por qualquer peça nas fases ou no Criativo. Carregar uma cidade volta às 16 brancas ativas na bancada; partidas continuam começando silenciosas.


### Reorganização interna — 16/09

Contratos, especificações de voz, compilação, exportação, inspeção e carregamento foram extraídos da fachada `runtime.ts`; a sessão continua dona do relógio, mixer, gestos e cancelamento. Perfis de cidades ficam em `kit-profiles/`, com o mesmo compositor e dados. O painel de parâmetros do Criativo recebe valores/callbacks e mantém o estado no compositor da tela. Testes foram separados por assunto com agregação compatível. Nenhum gatilho, efeito, prioridade, retorno, escopo por modo ou formato salvo mudou nesta reorganização. A revisão de processamento da aplicação é uma etapa posterior.
