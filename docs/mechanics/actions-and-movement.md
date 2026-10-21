# Ações, efeitos e movimento

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../GAME_MECHANICS.md).

## Ações e efeitos implementados — todas as cidades

| Ação / condição | Efeito musical | Feedback / retorno |
| --- | --- | --- |
| Início da partida | Todos os loops começam inativos, sem acompanhamento oculto | Tabuleiro sem marcas de ativação |
| Primeiro movimento legal | Ativa o loop da peça, preservando o relógio comum | Marca de peça ativa sem sombra no botão nem contorno de 1 px; o brilho animado permanece |
| Duplo clique/toque em uma peça durante a vez das brancas | Alterna o loop dessa peça pelo ID, seja branca ou preta, inclusive antes do primeiro movimento; ao ligar, inicia o transporte se estava parado. Na vez do Stockfish, o gesto não alterna loops | A peça fica selecionada; nos modos que acompanham o turno, Piece Params abre automaticamente se ainda não foi desligado manualmente; no celular, essa abertura mostra o painel de controles |
| Movimentos seguintes | Atualizam graus e pan conforme o mapeamento do instrumento | Casa nova, notas e valores no inspetor |
| Pegar/arrastar no tabuleiro | Suspende o loop somente daquela peça. Toca um ataque/nota na casa inicial e em cada nova casa percorrida; ficar parado não repete a frase | Casa da prévia e pulsos; estado manual no Strudel |
| Arrastar uma peça inativa | Mesma audição manual, sem ativar permanentemente o loop | Ao cancelar continua inativa |
| Soltar na origem, fora, destino ilegal, Escape ou cancelamento | Encerra a voz manual e restaura o acompanhamento da posição confirmada | Some a prévia; o loop volta se a peça está ativa efetivamente |
| Soltar em destino legal | Encerra o gesto, confirma a posição e ativa a peça | Loop segue com a transformação do lance |
| Captura | Remove a voz capturada e seus novos ataques; o atacante conserva seu ID/instrumento | Peça desaparece do tabuleiro e aparece na lista de capturas; quando a fileira conjunta excede a largura disponível, o container da fileira recebe escala proporcional até caber em 100% |
| En passant | Remove a voz do peão na casa de onde foi capturado | Mesmo comportamento de captura |
| Roque | Move e ativa rei e torre | Dois IDs/posições atualizados |
| Promoção | Mantém o ID; no kit equipado, conserva o instrumento desse ID | A peça passa a seguir os movimentos legais do novo tipo |
| **Dar cheque** | **Todas as peças sobreviventes da equipe atacante ficam ativas.** As pausas escritas nos rolls MIDI, as ausências do arranjo por peça e os volumes editados continuam valendo | Todas recebem marca ativa; Strudel informa “CHEQUE · banda branca/preta completa”; Piece Params identifica uma ativação temporária |
| **Sair do cheque** | Remove o efeito de equipe. Voltam a tocar apenas as peças já movimentadas; a configuração-base de ativação retorna | Marcas e indicadores voltam ao estado calculado pelo histórico |
| Undo/redo | Reconstitui posição, capturas, peças já movimentadas e efeito de cheque; anima o deslocamento das peças. Undo leva 120 ms (40% mais rápido que os 200 ms do avanço/Redo) | Edições manuais de som continuam associadas aos IDs |
| Xeque-mate | Encerra a reprodução; vitória do jogador toca uma fanfarra ascendente, transfere a soma dos dois saldos restantes para a cesta e acrescenta o bônus histórico pelos ovos coletados, uma única vez por partida. Vitória da IA toca o som de derrota, 25% mais baixo que antes | Resultado, saldo, pontuação histórica e progresso da fase |
| Empate / afogamento | Encerra a reprodução e executa o som de empate | Resultado da partida |
| Pausar / retomar | Pausar interrompe os loops e desliga Board Params quando está visível; o estado de Mixer e Piece Params segue a configuração do modo e as escolhas manuais. Retomar reinicia o transporte e religa Board Params quando ele aparece; gestos manuais ainda podem ser ouvidos quando pausado. Xeque-mate, empate/afogamento e o botão Win desligam Board Params, Mixer e Piece Params. Ocultar a aba suspende o áudio e cancela o gesto manual; ao voltar, retoma somente se a sessão estava tocando | Indicador de transporte e estado dos widgets |
| Desligar variações de uma peça | Silencia somente o loop automático da peça selecionada; sua composição e sua ativação continuam preservadas | O botão de energia em Piece Params fica marcado; arrastar a peça ainda toca uma nota por casa |
| Solo por peça (S em Piece Params) | Ativa a voz selecionada e silencia temporariamente todas as demais; vários Solos podem tocar juntos. O primeiro Solo guarda as vozes que estavam tocando. Desligar um Solo enquanto outro segue ligado não restaura nada; ao desligar o último, as vozes guardadas voltam se ainda estiverem vivas | Capturas removem seus IDs da restauração; pausa continua parando o transporte. A audição manual segue disponível. A voz em Solo permanece ativa quando seu Solo é desligado |
| Nota musical no cabeçalho da partida | Desliga ou liga a engine generativa inteira. Desligar encerra transporte, loops, prévias, monitor e análise de frequência; o volume configurado é preservado | Ícone de nota fica atenuado quando desligado; sons pontuais da interface permanecem independentes |
| Editar tom/escala | Todas as vozes afinadas usam o novo contexto nos próximos ataques. Samples não afinados mantêm a altura original | Seletores no Mixer e notas executadas em Piece Params |
| Editar BPM/volume | Altera o relógio comum ou a mixagem | Mixer e transporte em Strudel |

O drop-shadow sob o SVG da peça aparece enquanto seu loop está ativo ou enquanto ela está pressionada por mouse/toque; seleção persistente, isoladamente, não mantém esse brilho. Soltar, cancelar ou perder o foco encerra o brilho temporário. A animação do quadro e os indicadores de ativação seguem suas regras independentes.

**Tom, escala e BPM agora podem responder às regras de Estados e Eventos salvas no kit.** Todo kit de fábrica recebe o preset completo descrito abaixo. Kits antigos que ainda têm exatamente o preset original de cheque são atualizados ao carregar; regras personalizadas são preservadas. As regras são sobreposições da configuração base, não modificações permanentes ou cumulativas do kit. Detalhes abaixo.

A regra padrão de cheque não ressuscita peças capturadas nem ativa a equipe defensora; ela abre a banda atacante e acrescenta 6% de ganho enquanto o estado durar. Essa regra pode ser editada, desabilitada ou removida por kit. Entradas respeitam os próximos ataques do arranjo; não há reinício das frases nem disparo de todas as notas no mesmo instante. Acima de dez loops, a engine atenua a mixagem progressivamente para acomodar a banda.

Prioridades: captura/encerramento/pausa controlam a existência dos loops; o gesto manual substitui a voz da peça segurada; o Solo restringe temporariamente os loops às peças marcadas depois que as regras de cheque são resolvidas; o cheque amplia a formação quando não há Solo; o histórico define a formação permanente, com ativação manual adicional por duplo clique/toque na vez das brancas. Desligar o loop por duplo gesto prevalece sobre a ativação por movimento ou cheque até que ele seja religado no mesmo gesto ou em Piece Params. A escolha manual acompanha a identidade da peça em undo/redo; reiniciar a partida remove ativações manuais e Solos, mas mantém edições do instrumento. Na vez das brancas, um duplo gesto numa peça branca ou preta alterna seu loop; quadrados vazios, gestos durante um arraste e qualquer duplo gesto na vez do Stockfish não alternam o loop. Ganho zero e pausas compostas continuam sendo escolhas musicais válidas.

Na partida, pressionar uma peça com mouse ou toque mantém seu desenho na casa original. O desenho flutuante aparece e acompanha o ponteiro somente após pelo menos 8 px de deslocamento; soltar sem atingir esse limiar não executa movimento. A seleção e a nota manual na pressão continuam disponíveis. O Criativo mantém seu gesto livre anterior. Um arraste iniciado não conta como toque para alternar o loop da peça.

## Movimento e interpretação

- Frases e vozes sustentadas: deslocamento de coluna e avanço relativo à cor deslocam graus da escala segundo os valores do kit. O resultado é limitado, evitando saltos sem controle.
- Comportamento de pulso: mantém os graus ao mover; pan e filtro de prévia continuam respondendo. Uma peça de qualquer tipo pode usar esse comportamento.
- Coluna: posição estéreo segundo a abertura configurada e o pan adicional. O knob de Pan adicional conserva o ajuste salvo: mover horizontalmente muda o valor final enviado ao áudio, não sobrescreve esse ajuste. Abertura zero remove a influência da coluna; o Pan explícito da nota pode substituir o resultado. Na partida, o marcador transitório cinza indica o Pan executado quando há nota no monitor; não representa alteração permanente do knob.
- Altura durante o gesto: limita o filtro temporariamente quando o mapeamento está habilitado.
- O gesto manual toca um grau por casa; não reproduz automaticamente o ritmo, acorde ou frase inteira. Nesta versão, synths também recebem novos ataques por casa com seu envelope. Gate sustentado até soltar e portamento entre casas ainda são futuros.
- O preset comparativo Düsseldorf original · samples tem timeline A/B/C/B, quatro compassos por seção, em `[0@4 1@4 2@4 1@4]/16`. Um ciclo tem quatro tempos.
- Ranges e controles de nota são resolvidos a cada ataque; editar um limite não reescreve uma nota que já começou.

Na campanha e no online, as casas de origem e destino do último lance conservam o filtro invertido e a tonalidade lilás atuais por 2 segundos; então ambas as camadas reduzem sua opacidade à metade ao longo de 0,5 segundo, com `ease-in-out`. Movimento reduzido aplica diretamente o estado final. A animação reinicia a cada novo lance ou restauração do histórico. Aplicar Freeze ou Shield com sucesso limpa imediatamente todo o destaque do último lance, inclusive a transparência extra da cor-base; o próximo lance volta a destacar origem e destino. Armar/cancelar um poder ou uma aplicação recusada conserva o destaque. Undo/Redo recompõem o destaque de acordo com o histórico e os poderes restaurados. O Criativo, sem lances de partida ou poderes, conserva o tabuleiro livre.

### Chance de tocar

O Criativo e Piece Params oferecem **Chance de tocar** por instrumento, de 0 a 100%, com padrão de 100% para kits sem o campo opcional `playChance` do schema 7. O compilador e o código exportado aplicam o modificador nativo Strudel `degradeBy(1 - playChance)` ao fluxo de eventos do loop: 0% remove todos os eventos e 100% mantém todos. Seções, presença, variação fixada ou forçada e demais parâmetros continuam resolvidos normalmente. A chance afeta loops automáticos e prévias de padrão, mas não a nota manual isolada do tabuleiro. Na partida, editar o knob muda somente a voz selecionada na sessão atual e não salva o kit da cidade; no Criativo, salvar o kit conserva o valor. A atualização vale para os próximos ataques agendáveis; captura, pausa, desligar o loop e fim da sessão continuam controlando a existência da voz, e as regras não substituem `playChance`. Soltar, cancelar o ponteiro, perder foco ou pressionar Escape encerra o gesto e mantém o último valor aplicado.
