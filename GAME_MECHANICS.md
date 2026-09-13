# ChickenChess — mecânica em funcionamento

Atualizado em 13/09/2026 — v0.3.2 (The Creative). Referência de comportamento atual para desenvolvimento e testes. Ideias futuras ficam no fim e em `MUSIC_ENGINE_PLAN.md`; não são comportamentos já implementados.

## Escopo e dados

A engine Strudel é usada pelas 13 fases cadastradas (12 cidades; Manchester tem duas épocas) e pelo Criativo. Todas compartilham as regras abaixo; sons de interface, introdução e encerramento continuam nativos. A compilação dos loops nativos fica desabilitada quando a fase usa Strudel.

As fases originais têm kits experimentais gerados por sorteio reproduzível (`city-kit-v1`, cidade e semente). Reabrir a fase ou o Criativo conserva esse kit. Uma configuração salva no navegador tem prioridade sobre o default. Os defaults variam BPM, tom, escala, timeline, grooves, frases, fontes, articulações, ganhos, envelopes, filtros, efeitos, automações e mapeamentos; não são ainda reconstruções dos estilos históricos das cidades. O gerador mantém oito vozes percussivas, dois baixos, duas harmonias e quatro vozes de sequência/melodia por equipe, distribuídas independentemente do tipo de peça. Os lados compartilham os papéis correspondentes, com interpretações individuais. Vozes afinadas obedecem à escala comum e a mixagem mantém os limites da engine.

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

Exceção aos defaults aleatórios: `manchester-1999` usa **Northern Jazz Breaks**, composto em `lib/music/manchester-kit.ts`: 123 BPM, Sol dórico, A4/B8/C4/D8 compassos. A tonalidade e as frases são escolhas originais de arranjo inspiradas em Get a Move On!, não uma transcrição medida da gravação. O kit contém bateria, baixo/pergunta e baixo/resposta, palheta principal, barítono, metal, teclas e vogal sintética. Tempos longos/curtos 5:4 estão escritos nos padrões; não há jitter aleatório. Cada peça ativa produz ataques nas quatro seções, inclusive rainhas. Movimento lateral desloca graus lentamente; avanço não transpõe o motivo neste kit. As regras de ativação, cheque, captura e audição continuam as mesmas.

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
- A timeline original de Düsseldorf é A/B/C/B, quatro compassos por seção, em `[0@4 1@4 2@4 1@4]/16`. Um ciclo tem quatro tempos.
- Automações são lidas a cada ataque; não modulam continuamente uma nota que já começou.

## Widgets da partida

| Widget | Conteúdo / controles | Destino real |
| --- | --- | --- |
| Piece Params | Instrumento e casa selecionados; execução de notas/pausas; ganho, oitava ou pitch de sample não afinado, pan, delay, filtros, reverb, decay, ataque, sustain, release e duração | ID selecionado, sem modificar as outras peças |
| Board Params | Volume, BPM, tom, escala; ganho e EQ por equipe; fine pitch e quartz lock comuns; ambiência somente no motor antigo | Contexto da partida e mixagem Strudel por lado |
| Strudel | Estado do áudio/gesto, quantidade de vozes ativas, cheque, seção, compasso e pulso acima do código | Mesmo snapshot/padrões utilizados pela engine |
| Spectrogram | Espectro da saída de áudio | Mixagem real |

Knobs aceitam mouse, toque, roda do mouse e teclado (setas, Home/End). A roda sobre o knob altera o valor; Shift amplia esse passo. Filtros e controles de envelope selecionados usam escala logarítmica. Editar filtro, pan, reverb ou delay remove a automação absoluta desse parâmetro nesta partida, para o knob assumir o controle; editar ganho preserva os acentos e multiplica seu volume. As edições no jogo não sobrescrevem automaticamente o kit salvo da cidade. O monitor do Piece Params reserva a altura para o estado, notas, gráfico e valores de efeitos, evitando que os pulsos redimensionem o widget.

O quadro MIDI da peça selecionada mostra todas as variações salvas, uma abaixo da outra, rotuladas A/B/C/D. Inclui os bancos de groove/automações; quando bancos têm tamanhos diferentes, mostra suas combinações cíclicas (até 12). Na partida, a região tem altura fixa e scroll interno. No Criativo, todas as variações ficam expandidas, usando apenas o scroll da coluna. Cada quadro mostra uma janela de até quatro compassos; a janela da variação atual avança quando necessário, com ponteiro apenas enquanto sua voz está em execução. Peças inativas/pausadas continuam mostrando os padrões salvos, sem ponteiro. Gestos manuais no tabuleiro ocultam o ponteiro de loop; a audição do padrão completo conserva-o. Máscaras de entrada não apagam a composição desenhada. Apenas a voz inspecionada é compilada para essa visualização; janelas são cacheadas, sem recompilar nos ticks do relógio.

Widgets flutuantes podem ser arrastados pelas áreas de fundo/conteúdo não interativo. Botões, knobs, sliders, seletores, código selecionável e alças de redimensionamento conservam suas funções. No celular, o botão “Parâmetros musicais” abre os painéis empilhados; nesse painel eles permanecem no fluxo da página, com fundo e controles contidos no próprio widget. Soltar, cancelar toque ou perder foco encerra o arraste.

## Criativo e persistência

| Ação | Resultado |
| --- | --- |
| Cidade para experimentar + Carregar kit da cidade | Seleciona qualquer cidade e carrega sua versão salva neste navegador, ou seu kit aleatório inicial; restaura posições e ativa as 16 brancas para escuta |
| Kit inicial da cidade | Carrega o sorteio reproduzível de fábrica, sem sobrescrever o kit salvo |
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

No Criativo, em desktop, tablet e tela de celular em paisagem, Tabuleiro/Estados e Eventos ocupam a coluna esquerda, Instrumento a primeira coluna direita e Parâmetros/Banda a segunda. Cada coluna tem rolagem própria; as colunas não têm gap. O seletor de kit ocupa uma faixa inteira acima do transporte. Em celular em retrato, o tabuleiro volta ao topo e os painéis seguem abaixo para preservar a área útil e o toque.

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

Ações: transposição de −12 a +12 semitons (2 = um tom), BPM ±30%, escala paralela, relativa maior/menor natural, rotação modal, inversão do contorno melódico, variação A–D, ganho −100 a +100%, filtro passa-baixas 20–20000 Hz e ativação temporária da banda. BPM e troca/relativa/rotação de escala são globais, mesmo se o alvo for uma equipe. Transposição, ganho, filtro, inversão, variação e ativação respeitam o alvo. Inversão espelha graus, não inverte o áudio. Relativa só age sobre maior/menor natural; em outras escalas a UI informa que foi ignorada. “Escala complementar” não recebe definição arbitrária. Forçar variação seleciona também seus bancos de groove e automação.

Regras são aplicadas na ordem salva. Percentuais multiplicam; a última escala, filtro ou variação prevalece. Tudo é recalculado sobre a base, sem deriva; BPM é limitado a 30–240, ganho por peça a 0–2 e fator de afinação final a 1/8–8. Filtro de regra assume o lugar da automação de filtro enquanto ativo; remover a regra restaura a automação original. Transposição não afina samples não afinados. Ativação só alcança peças sobreviventes e ignora máscaras de entrada; o gesto manual continua substituindo o loop da peça.

Quartz lock tem prioridade sobre mudanças de BPM por regras e mantém o BPM original do kit. Edições da base e do mixer permanecem independentes das sobreposições. A atualização atual segue os próximos ataques agendáveis; **troca quantizada por compasso, suavização de BPM e transições harmônicas preparadas ainda são o próximo passo**, não estão implementadas.

Kits JSON continuam no schema 4, com campo aditivo `reactions`. Kits antigos recebem apenas a regra padrão de cheque. Nomes terminados em “ · a2” ou outra casa são normalizados sem esse sufixo ao carregar/validar. A peça arrastada é posicionada no próprio tabuleiro, com compensação de escala e borda, acompanhando mouse/touch.

## Mixer DJ na partida

No Board Params, selecionar Brancas ou Pretas direciona os knobs de ganho (0–1,5) e graves/médios/agudos (−12 a +12 dB) ao áudio daquela equipe, incluindo caudas de efeitos. A equalização usa dois buses reais de Web Audio, depois dos efeitos individuais: graves em 200 Hz, médios em 1 kHz e agudos em 4 kHz. Mudanças têm suavização de 20 ms. Volume geral e atenuação por densidade continuam aplicados antes desses buses.

O relógio continua compartilhado. Fine pitch (±8%) altera BPM e afinação de ambas as equipes, como velocidade de disco; não muda os graus da escala salvos. Quartz lock restaura o BPM original do kit carregado e afinação normal, sobrescrevendo temporariamente BPM base e fine pitch. O slider permanece editável e visualmente apagado; destravar aplica o valor preparado sobre o BPM base. Esses controles são temporários da partida, reiniciam ao carregar cidade e não alteram o kit salvo. Reverse de áudio, scratch, platter e velocidades independentes ainda não existem; não confundir inversão de uma sequência com reprodução reversa do áudio.

## Gestos e custo de processamento

Na partida, o arraste captura o ponteiro na casa estável, inclusive em touch, e move a imagem por transformação de DOM; não depende de eventos no SVG que desaparece ao pegar a peça. As casas percorridas continuam disparando audição e pulsos visuais. Soltar confirma a jogada válida; cancelar/blur/Escape restaura o loop conforme as regras anteriores.

O acompanhamento só é reenviado ao scheduler quando seus padrões mudam, não a cada casa atravessada em uma audição. Painéis musicais fechados não montam os gráficos; código Strudel oculto não é regenerado, e o monitor periódico consulta padrões apenas com assinantes. Dispositivos restritos usam DPR 1 no globo e agendamento de loops com antecipação de 180 ms (desktop 100 ms); audição manual mantém seu caminho de baixa latência. Esses cortes de trabalho não equivalem a aprovação de desempenho/áudio em celular físico.

## Mapa e entrada na fase

- Abrir uma cidade orienta a câmera para seu pin; popups podem ser reposicionados.
- Controles do globo escutam somente seu canvas, isolados dos popups. O cursor grab pertence ao canvas e é removido na saída da tela. Touch em Enter board não inicia arraste do mundo.
- Arrastar interrompe a centralização anterior. O giro automático espera terminar o gesto e mais 800 ms, sem inércia concorrente. Dois dedos mantêm o pinch e acrescentam giro do globo pelo ângulo entre os dedos; isso não gira o tabuleiro da partida.
- Na apresentação da cidade, o quadro de informações pode ser arrastado pelo fundo com mouse ou touch; Start match fica acima dele. No cabeçalho mobile, Modo Criativo fica na linha abaixo de About/maximizar.
- Segurar o fundo de um popup reduz a escala para 92%, usando o ponto pressionado como origem; não há rotação durante esse gesto. O arraste mantém o whistle contínuo e acrescenta ataques curtos na pressão, durante o deslocamento e ao soltar. Botões internos conservam suas próprias ações e sons.
- Um popup aberto não interrompe o giro de espera: depois de a câmera terminar de centralizar a cidade, o globo volta a girar. Passar o cursor sobre um pin pausa esse giro e amplia o pin em 15%; ao sair, o relógio de espera volta a contar.
- Cidades conquistadas são lidas do perfil local e ganham uma bandeira verde acima do pin, além do halo de conquista existente.
- “Enter board” conduz a câmera à cidade por cerca de 1,4 s e só então abre a fase. A direção considera a rotação atual do globo; comandos de câmera ficam suspensos durante essa transição.
- A preferência de movimento reduzido encurta a transição. A introdução atual da fase continua existindo após a chegada.
- A superfície usa o litoral geográfico real do Natural Earth 1:110m, incluindo ilhas principais, convertido do SVG local em segmentos vetoriais sobre a esfera, sem textura rasterizada nem fronteiras regionais. O traço é mais escuro e recebe sombreado pela direção do sol. A grade de latitudes/longitudes a cada 15° permanece visível. O detalhe geográfico continua limitado à resolução da fonte cartográfica. O sol tem halo radial e a lua é pequena e fosca, iluminada pela direção do sol. Nenhum efeito de áudio depende desse fundo.
- A linha entre popup e pin fica com 50% da opacidade quando o pin passa para trás do horizonte da esfera; volta à opacidade normal quando reaparece. A posição real do pin e a perspectiva da câmera determinam essa mudança, sem atualização React por frame.
- O título do popup não exibe pontos de recompensa. O rodapé mostra `Reward: X PTS`, usando o valor real da próxima vitória: 1.000 na primeira conquista ou 200 na repetição.
- O clique de um pin (tom e prato reverso de abertura) usa 30% do ganho anterior, redução de 70%; o pulso de hover usa 70%, redução de 30%. Sons de arraste dos popups e do botão Enter board conservam seus ajustes.
- Clicar em `v0.3.2` abre o changelog com rolagem interna, disponível no mapa, na partida e no Criativo. Escape, botão de fechar ou clique fora encerram o popup; o histórico fica em `lib/changelog.ts`.

## Estados e ideias ainda não associados à engine Strudel

Contagem de ameaças sofridas/produzidas, ameaça à rainha, mobilidade legal, proximidade do rei, estados “tenso/excitado”, bônus de captura, destaque elaborado da última peça, progressões harmônicas e modulação por vitória provável não estão implementados. Vantagem material e eventos abaixo já podem controlar parâmetros por regras do kit. O efeito de equipe durante cheque é a primeira regra tática coletiva.

ChickenChess cooperativo/invertido, ovos de ouro, multiplayer, vestiário, administração/publicação de kits e mundo por época continuam planejados. A partida atual segue o xadrez clássico contra IA.

## Manutenção e verificação

Toda mudança de regra, gesto, controle ou persistência deve atualizar a linha correspondente neste documento, com gatilho, efeito, retorno/prioridade e escopo. `MUSIC_ENGINE_PLAN.md` mantém a agenda futura; este documento descreve o presente.

Fontes principais: `lib/music/model.ts`, `lib/music/runtime.ts`, `hooks/use-music.ts`, `components/chess-game.tsx`, `components/creative-studio.tsx`, `components/ui/draggable.tsx`, `components/globe-component.tsx`. Regressões em `tests/music.test.cjs` cobrem cheque/saída/mate/capturas/undo, interrupção do loop no arraste, cancelamento, frase pelo botão e chegada ao pin.
