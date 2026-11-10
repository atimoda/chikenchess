# Parâmetros do instrumento: All, Section e Note

Parte das [mecânicas](../../../GAME_MECHANICS.md). Vale no widget Instrument do Criativo e no Piece params da partida (campanha e online), que usam o mesmo editor (`components/creative/instrument-parameters.tsx`).

## Editor único (10/11)

Acima das mini-abas Tuning, Filters, Modulation e Movement fica a escolha **All / Section / Note**. Os knobs usam o visual da aba Tuning em todas as páginas: nome completo embaixo, “?” de ajuda em cima e face verde; seletores (Delay time, LFO target, LFO rate unit, LFO shape, Sidechain source, Instrument role) e Loop the sample ocupam a célula de um knob. Controles sem efeito no momento (ex.: LFO desligado) ficam esmaecidos.

Na partida, o Piece params deixou as abas TOM e FX/MOD e passou a mostrar esse editor, com os valores ao vivo nos knobs de Extra gain, Extra pan, Dotted delay, Low-pass e Reverb e atualização ao soltar o knob. A partida não mostra Instrument gain, Distortion level nem Movement (não os edita); o High-pass dela grava no efeito da peça. Sem instrumento (nenhuma peça selecionada) aparecem só os knobs de efeito da casa (GAIN, PITCH, PAN, DELAY, LPF/HPF, REVERB, DECAY).

## All

É o padrão: os knobs editam o instrumento inteiro, como antes.

## Section

Fica disponível quando uma seção foi escolhida na faixa do arranjo (no Criativo, a faixa do widget 32 voices; na partida, a barra de seções acima das variações e a do Song & Instruments). Um clique numa seção, além de marcá-la como próxima, a escolhe para o editor (um traço verde na base do botão) e abre Section; selecionar uma nota continua tendo prioridade e, ao desmarcá-la, o editor volta à Section. Excluir a seção volta o editor para All.

Em Section, cada knob mostra o valor do All esmaecido e não influencia nada. Mexer nele grava um valor próprio daquela peça naquela seção, e o knob “acorda” com visibilidade plena; um duplo clique num knob acordado apaga o valor próprio e o devolve ao All. Girar um knob esmaecido de volta ao mesmo valor exibido não o personaliza.

Entram em Section: Instrument gain, Attack, Decay, Sustain, Release, Note length, Pitch slide, Slide time, Low-pass, High-pass, Extra gain, Extra pan, Reverb, Play chance, Dotted delay, Drive e quase todo o Modulation (Resonance, Filter envelope, LFO alvo/rate/unidade/profundidade/forma, Vibrato, FM, supersaw, loop do sample). Ficam só no All (somem em Section): Octaves (a seção já tem transposição), Swing, Pitch multiplier, Distortion level, Delay time, Delay feedback, Sidechain, Role e a aba Movement — os do bus de efeitos vazariam para as outras peças do bus.

Nos knobs de range (Low-pass, Reverb, Drive) a seção grava seus próprios limites; a frequência L/S/N continua a do All (os pontinhos não aparecem em Section) e o mesmo sorteio cai dentro dos limites da seção. Se o All não tem range, o valor da seção vale por ataque.

**Áudio.** Os valores ficam no kit, em `arrangement.sections[id].params` de cada peça (campo opcional; kits antigos não mudam, sem migração). A engine monta o padrão MIDI de cada seção já com os valores dela, junto da transposição; a troca acontece exatamente na virada da seção, sem recompilar e sem criar nós de áudio, e só o padrão da seção atual é consultado. Notas que já soavam terminam com os valores da seção anterior. Play chance própria de alguma seção faz cada seção aplicar a sua. A exportação Strudel gera uma declaração por seção personalizada e soa igual.

**Prioridade.** Regras de States & Events vencem a seção: uma regra de LPF, HPF, Resonance, Drive, Reverb, Delay ou Pan remove, enquanto está ativa, o valor próprio das seções para aquele parâmetro; uma regra de ganho multiplica também o Extra gain de cada seção. Ao terminar a regra, os valores das seções voltam. Notas com valores próprios (abaixo) vencem a seção.

Na partida online, os valores por seção viajam junto com os parâmetros da peça; a partida não altera o arranjo compartilhado.

## Note

Fica disponível com uma nota selecionada no MIDI e abre sozinha ao selecioná-la; desmarcar volta à escolha anterior. Mostra uma página só, sem as mini-abas: ACCENT, PAN, CHANCE, RATCHET, CUTOFF, SLIDE ST/SEC com o gráfico e VIB, como antes, e na terceira linha **RELEASE, REVERB, DELAY e DRIVE**. Esses quatro mostram o valor do instrumento esmaecido até a nota ganhar o seu; duplo clique devolve ao instrumento. Drive 0 numa nota deixa a nota limpa mesmo com Drive no instrumento ou na seção. O valor da nota vence a seção e os ranges sorteados. Ficaram de fora parâmetros que criariam uma voz/um nó por nota ou que dividiriam o MIDI em muitas camadas sem ganho musical.
