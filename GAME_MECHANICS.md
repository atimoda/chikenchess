# ChickenChess — mecânica em funcionamento

Atualizado em 12/09/2026. Referência de comportamento atual para desenvolvimento e testes. Ideias futuras ficam no fim e em `MUSIC_ENGINE_PLAN.md`; não são comportamentos já implementados.

## Escopo e dados

A engine Strudel é usada pelas 12 cidades cadastradas e pelo Criativo. Todas compartilham as regras abaixo; sons de interface, introdução e encerramento continuam nativos. A compilação dos loops nativos fica desabilitada quando a fase usa Strudel.

Cada cidade tem um kit experimental gerado por sorteio reproduzível (`city-kit-v1`, cidade e semente). Reabrir a fase ou o Criativo conserva esse kit. Uma configuração salva no navegador tem prioridade sobre o default. Os defaults variam BPM, tom, escala, timeline, grooves, frases, fontes, articulações, ganhos, envelopes, filtros, efeitos, automações e mapeamentos; não são ainda reconstruções dos estilos históricos das cidades. O gerador mantém oito vozes percussivas, dois baixos, duas harmonias e quatro vozes de sequência/melodia por equipe, distribuídas independentemente do tipo de peça. Os lados compartilham os papéis correspondentes, com interpretações individuais. Vozes afinadas obedecem à escala comum e a mixagem mantém os limites da engine.

| Dado | Significado | Duração / origem |
| --- | --- | --- |
| ID da peça | Cor e casa inicial, por exemplo `w:e1`; acompanha a peça ao mover/capturar/promover | Histórico legal da partida |
| Instrumento | Fonte, comportamento, notas, articulação, envelope, automações e vínculo de groove | Kit equipado no ID; independente do tipo de peça |
| Já movimentada | A peça completou pelo menos um lance; no roque entram rei e torre | Reconstituído pelo histórico, inclusive undo/redo |
| Ativa efetiva | Já movimentada **ou** pertence à equipe que está dando cheque | Calculada a cada lance; cheque não modifica o histórico |
| Ativação por cheque | Peça sobrevivente que ainda não se moveu, mas está tocando pelo efeito de equipe | Temporária, termina ao sair do cheque |
| Gesto manual | Peça e casa que estão sendo percorridas, em camada separada | Enquanto segura/arrasta; não altera posição nem ativação permanente |
| Contexto musical | Tom, escala, BPM, volume, timeline e grooves comuns | Kit da cidade + ajustes desta partida |

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

**Tom, escala e BPM não mudam automaticamente por eventos de xadrez nesta versão.** São definidos pelo kit carregado e podem ser editados pelo usuário. Carregar/gerar outro kit no Criativo pode trocar os três. Cheque, captura, roque e promoção afetam as vozes conforme a tabela, mas não modulam esse contexto global. Propostas de eventos raros estão em `MUSIC_ENGINE_PLAN.md`, ainda sem execução.

O efeito de cheque não ressuscita peças capturadas, não ativa a equipe defensora e não aumenta automaticamente BPM ou ganho. Entradas respeitam os próximos ataques do arranjo; não há reinício das frases nem disparo de todas as notas no mesmo instante. Acima de dez loops, a engine atenua a mixagem progressivamente para acomodar a banda.

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
| Board Params | Volume, BPM, tom e escala; controles de ambiência somente no motor antigo | Contexto de todas as vozes da partida |
| Strudel | Estado do áudio/gesto, quantidade de vozes ativas, cheque, seção, compasso e pulso acima do código | Mesmo snapshot/padrões utilizados pela engine |
| Spectrogram | Espectro da saída de áudio | Mixagem real |

Knobs aceitam mouse, toque, roda do mouse e teclado (setas, Home/End). A roda sobre o knob altera o valor; Shift amplia esse passo. Filtros e controles de envelope selecionados usam escala logarítmica. Editar filtro, pan, reverb ou delay remove a automação absoluta desse parâmetro nesta partida, para o knob assumir o controle; editar ganho preserva os acentos e multiplica seu volume. As edições no jogo não sobrescrevem automaticamente o kit salvo da cidade. O monitor do Piece Params reserva a altura para o estado, notas, gráfico e valores de efeitos, evitando que os pulsos redimensionem o widget.

O quadro MIDI da peça selecionada mostra todas as variações salvas, uma abaixo da outra, rotuladas A/B/C/D. Inclui os bancos de groove/automações; quando bancos têm tamanhos diferentes, mostra suas combinações cíclicas (até 12). A região tem altura fixa e scroll interno. Cada quadro mostra uma janela de até quatro compassos; a janela da variação atual avança quando necessário, com ponteiro apenas enquanto sua voz está em execução. Peças inativas/pausadas continuam mostrando os padrões salvos, sem ponteiro. Gestos manuais no tabuleiro ocultam o ponteiro de loop; a audição do padrão completo conserva-o. Máscaras de entrada não apagam a composição desenhada. Apenas a voz inspecionada é compilada para essa visualização; janelas são cacheadas, sem recompilar nos ticks do relógio.

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
| Segure para ouvir | Audição temporária do **padrão completo**, distinta do gesto manual no tabuleiro |
| Tocar casas | Usa o instrumento selecionado nas casas, sem mover peças |
| Mover/trocar peças | Tabuleiro livre; confirma posição e ativa a peça sem regras de xadrez. Durante o arraste, a própria peça acompanha ponteiro ou toque; a peça original fica oculta até soltar/cancelar |
| Salvar kit da fase | Salva o kit associado à cidade no armazenamento local; a próxima partida usa essa configuração |
| Exportar/importar | JSON v4 com fontes, padrões, grooves, automações e parâmetros; schema e Strudel são validados |

Não há ainda catálogo oficial em servidor, inventário online ou sincronização automática entre dispositivos. Armazenamento do kit, rascunho criativo e ajustes temporários da partida são camadas distintas.

No Criativo, em desktop, tablet e tela de celular em paisagem, o tabuleiro permanece à esquerda enquanto Instrumento ocupa a primeira coluna de edição e Parâmetros/Banda a segunda; cada coluna da direita rola internamente. Em celular em retrato, o tabuleiro volta ao topo e os painéis seguem abaixo para preservar a área útil e o toque.

## Mapa e entrada na fase

- Abrir uma cidade orienta a câmera para seu pin; popups podem ser reposicionados.
- Segurar o fundo de um popup reduz a escala para 92%, usando o ponto pressionado como origem; não há rotação durante esse gesto. O arraste mantém o whistle contínuo e acrescenta ataques curtos na pressão, durante o deslocamento e ao soltar. Botões internos conservam suas próprias ações e sons.
- Um popup aberto não interrompe o giro de espera: depois de a câmera terminar de centralizar a cidade, o globo volta a girar. Passar o cursor sobre um pin pausa esse giro e amplia o pin em 15%; ao sair, o relógio de espera volta a contar.
- Cidades conquistadas são lidas do perfil local e ganham uma bandeira verde acima do pin, além do halo de conquista existente.
- “Enter board” conduz a câmera à cidade por cerca de 1,4 s e só então abre a fase. A direção considera a rotação atual do globo; comandos de câmera ficam suspensos durante essa transição.
- A preferência de movimento reduzido encurta a transição. A introdução atual da fase continua existindo após a chegada.
- A superfície usa o litoral geográfico real do Natural Earth 1:110m, incluindo ilhas principais, em textura local equiretangular alinhada aos pins, sem fronteiras regionais. Terra e lua recebem a mesma luz pontual na posição do sol; luz ambiente suave mantém o lado escuro legível. O sol é pequeno, com halo radial transparente, e a lua é menor e fosca, com iluminação variando pela direção do sol. Nenhum efeito de áudio depende desse fundo.
- O título do popup não exibe pontos de recompensa. O rodapé mostra `Reward: X PTS`, usando o valor real da próxima vitória: 1.000 na primeira conquista ou 200 na repetição.
- O clique de um pin (tom e prato reverso de abertura) usa 30% do ganho anterior, redução de 70%; o pulso de hover usa 70%, redução de 30%. Sons de arraste dos popups e do botão Enter board conservam seus ajustes.
- Clicar em `v3.1` abre o changelog com rolagem interna, disponível no mapa, na partida e no Criativo. Escape, botão de fechar ou clique fora encerram o popup; o histórico fica em `lib/changelog.ts`.

## Estados e ideias ainda não associados à engine Strudel

Contagem de ameaças sofridas/produzidas, ameaça à rainha, mobilidade legal, material, proximidade do rei, estados “tenso/excitado”, bônus de captura, destaque elaborado da última peça, alterações automáticas de BPM/tom por situação, progressões harmônicas e modulação por vitória provável não estão implementados. O efeito de equipe durante cheque é a primeira regra tática coletiva.

ChickenChess cooperativo/invertido, ovos de ouro, multiplayer, vestiário, administração/publicação de kits e mundo por época continuam planejados. A partida atual segue o xadrez clássico contra IA.

## Manutenção e verificação

Toda mudança de regra, gesto, controle ou persistência deve atualizar a linha correspondente neste documento, com gatilho, efeito, retorno/prioridade e escopo. `MUSIC_ENGINE_PLAN.md` mantém a agenda futura; este documento descreve o presente.

Fontes principais: `lib/music/model.ts`, `lib/music/runtime.ts`, `hooks/use-music.ts`, `components/chess-game.tsx`, `components/creative-studio.tsx`, `components/ui/draggable.tsx`, `components/globe-component.tsx`. Regressões em `tests/music.test.cjs` cobrem cheque/saída/mate/capturas/undo, interrupção do loop no arraste, cancelamento, frase pelo botão e chegada ao pin.
