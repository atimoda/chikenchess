# Pátio: ritmos das zonas (microtempo, timbres, variações e blocos)

Complementa [Zonas e camadas](zones.md), que descreve a Zona sonora, o baixo e as tags. Aqui fica a percussão da zona. Vale em todo Pátio, local e online (a zona é salva com o Pátio); o Templo mantém a música própria.

Módulos: ritmos em `lib/pigchicken/beats.ts`, timbres em `lib/pigchicken/beat-kits.ts`, o que a zona guarda e o que soa em cada semicolcheia em `lib/pigchicken/zone-ambience.ts`, blocos em `lib/pigchicken/sound-zones.ts`, regente em `lib/pigchicken/music.ts` (`createConductor`), amostras em `lib/pigchicken/kit-player.ts`, execução em `ambience` de `components/pigchicken/parquinho.tsx`, painel em `components/pigchicken/sound-zone-panels.tsx` com `beat-grid-editor.tsx` e `components/ui/patio-knob.tsx`.

## Microtempo (17/11, v2.13.0)

- **Unidade:** cada nota guarda a distância da semicolcheia dela em centésimos de semicolcheia, de −50 (meia semicolcheia antes) a +50 (`SHIFT_MAX`). Em milissegundos: `centésimos / 100 × 15000 / bpm`. A 120 bpm, 10 centésimos são 12,5 ms.
- **Perfil do ritmo** (`Beat.micro`): 4 números, um por semicolcheia do tempo (ou 16, um por semicolcheia do compasso). Toda linha da percussão segue o perfil, e também o baixo e a grade para onde as notas dos jogadores são puxadas (`grooveOf`, `toGrid`).
- **Atraso da linha** (`lag`): soma um valor fixo a todas as notas de uma linha (a caixa atrás do tempo, por exemplo). Vale só para a percussão. Uma variação pode ter o `lag` dela.
- **Tempo próprio da nota** (`time` no padrão, `drumTime` na grade da zona): vence o perfil e o atraso.
- **Balanço Swing:** atrasa 33 centésimos o contratempo de cada tempo (casas 3, 7, 11 e 15) só nos ritmos cujo perfil é zero nessa casa, e só nas notas que estão em cima da grade. Nos ritmos com balanço próprio ali (Samba, Bossa nova, Baião, Swing, Afrobeat) ele não muda a percussão. Meio tempo continua puxando as notas dos jogadores para a colcheia.
- **Agendamento:** a cada semicolcheia o jogo agenda a seguinte no relógio de áudio (`conductor.ahead()`), já com o deslocamento de cada nota. A diferença entre o relógio do jogo e o de áudio é suavizada quadro a quadro (2% por quadro; salto direto acima de 30 ms). Medido no Chromium de computador: as notas caem a cerca de 1 ms do previsto.

### O estudo de cada ritmo

Valores em centésimos de semicolcheia, na ordem 1ª, 2ª, 3ª e 4ª semicolcheia do tempo.

| Ritmo | Perfil | Linhas atrasadas | Base |
| --- | --- | --- | --- |
| Samba | 0, +10, −16, −16 | | Medição. A 2ª atrasa e a 3ª e a 4ª adiantam: nem garfinho (0·25·75%) nem tercina (0·33·67%). As casas caem em 27,5%, 46% e 71% do tempo, dentro das faixas medidas no tamborim (25–29%, 42–50%, 67–75%; Gouyon 2007, samba de roda; Naveda et al. 2011). A 120 bpm: +12 ms, −20 ms, −20 ms |
| Bossa nova | 0, +5, −8, −8 | | Derivado: metade do desvio do samba, por ser a mesma célula tocada mais contida. Sem medição própria |
| Baião | 0, +6, −6, −10 | | **Estimativa.** Não encontrei medição publicada do microtempo do baião; o perfil adianta de leve a 3ª e a 4ª, na direção do samba, com menos força |
| Swing (jazz) | 0, +33, +67, −33 | | Grade de tercinas: a colcheia do contratempo cai em 2/3 do tempo. Friberg e Sundström (2002) medem que a proporção muda com o andamento (mais de 2:1 em andamento lento, perto de 1:1 em rápido); aqui ela é fixa em 2:1 |
| Funk | 0, +12, 0, +12 | | Swing de semicolcheia leve (56%), na faixa descrita para bateristas de funk; sem atraso de caixa |
| Boom bap | 0, +22, 0, +22 | caixa +5 | Swing de MPC em torno de 61% (a escala da MPC vai de 50% a 75%; 66% é a tercina) |
| House | 0, +14, 0, +14 | | Swing de bateria eletrônica em 57%. Valor de uso corrente, não medição |
| Techno | 0, +4, 0, +4 | | Quase rígido (52%) |
| Reggae | 0, +20, 0, +20 | bumbo +4, caixa +6 | Semicolcheias balançadas e bateria atrás do tempo. Descrição qualitativa, valores estimados |
| Afrobeat | 0, +14, +3, +14 | caixa +5 | Tony Allen tocava atrás do tempo. Descrição qualitativa, valores estimados |
| Rock | 0, 0, 0, 0 | caixa +6 | Caixa atrás do tempo (backbeat atrasado), descrita em estudos de groove; o tamanho do atraso é estimado |
| Reto, Meio tempo | 0, 0, 0, 0 | caixa +4, +8 | Mesmo princípio do rock, mais leve no Reto e mais largo no Meio tempo |
| Disco | 0, 0, 0, 0 | chimbal aberto +4, caixa +3 | Estimativa |
| Trap | 0, 0, 0, 0 | palma e caixa +6 | Grade rígida de máquina com a palma atrás. Estimativa |
| Reggaeton | 0, 0, 0, 0 | | Rígido; só as caixas das casas 4 e 12 têm +6 |
| Brisa, Feira, Pulso | 0, 0, 0, 0 | | Rígidos |

Os valores marcados como estimativa ou derivados são pontos de partida: a grade arrastável existe para corrigi-los de ouvido.

## Timbres (17/11, v2.13.0)

- Cada ritmo tem um **kit** (`Beat.kit`, 16 kits em `KITS`): qual gravação toca em cada uma das 8 linhas (Bumbo, Tom, Caixa, Palma, Chimbal, Aberto, Chocalho, Percussão) e como a linha se chama naquele kit. No Samba as linhas são Surdo, Surdo de corte, Caixa, Tamborim, Pandeiro, Agogô agudo, Ganzá e Agogô grave; no Baião, Zabumba, Zabumba aberta, Bacalhau, Pandeiro, Triângulo fechado, Triângulo aberto, Ganzá e Agogô; no Swing, a Condução leva o ritmo e o chimbal fecha no pé.
- **Gravações reais (CC0):** bateria, pratos, congas e pandeirola de `chicken-percussion-v1`; surdos, caixa e tamborim de `chicken-bateria-v1`; pandeiro e agogôs de `chicken-samba-reggae-v2`; e o banco novo `chicken-patio-v1` (palmas, aro, rimshot, chimbal no pé, triângulo, cowbell, cabasa, clave, ganzá, zabumba, bacalhau; 25 gravações), preparado por `scripts/prepare-patio-recordings.py` a partir da Versilian Community Sample Library. Origens em `public/samples/README.md`.
- **Exceção:** House, Techno, Trap e Reggaeton usam `chicken-machines-v1`, as emulações sintetizadas de 808 e 909 que o jogo já tinha. Não são gravações das máquinas. Três papéis são aproximações com gravações reais de outro instrumento: a zabumba é um bumbo de concerto do VCSL afinado 7 semitons acima, o bacalhau é um toque abafado de tambor de moldura e o ganzá é um chocalho pequeno. Não há cuíca.
- **Como toca** (`playKitHit`; desde 25/11, v2.18.0): as tomadas de uma linha se alternam; o volume vem da dinâmica (abaixo) e a força do toque (`tone`, sem o volume) define o brilho: abaixo de 0,85 fecha um filtro passa-baixa (1,8 kHz no toque mais leve até ~11 kHz), e a nota entra com uma rampa de 2 ms (acento) a 6 ms (nota fantasma) em vez de começar seca; o volume varia ±4% ao acaso. Sai no barramento Ambiente.
- **Carga:** os arquivos do kit são baixados na primeira vez que a zona vai tocar (e os da zona que vai entrar, um tempo antes). Enquanto um arquivo não chegou, ou se falhar, a linha toca o tambor sintetizado de antes.

## Música da zona ligada ou desligada (25/11, v2.18.0)

- **Toggle:** o primeiro controle do painel da Zona e da Zona da cena, à esquerda do Nome, é um botão quadrado com a nota musical (`Music` do lucide), aceso (amarelo) com a música ligada e apagado com ela desligada, sem texto. Guarda `ambienceOn: true` em `SoundZoneParams` (`lib/pigchicken/sound-zones.ts`); ausente é desligado. Zona nova nasce desligada e **toda zona salva antes do toggle (inclusive as dos Pátios de exemplo e as Zonas das cenas) também fica desligada** até alguém ligar. Os demais campos continuam visíveis e editáveis com ela desligada.
- **O que desliga:** só o som de fundo da zona: batida, baixo/synth e drone/pad. Continuam valendo o Tom, a Escala, os Acordes e o BPM para os instrumentos e a mira, o microtempo e o Balanço da grade das notas, a gravidade, o tempo, o raio-x, as tags, o slam, a cadeia e as paredes. Com a música desligada os arquivos do kit não são baixados.
- **Desligar corta na hora** (“shutdown”): quando a música da zona onde a galinha está é desligada no painel (`createZoneSwitchWatch` em `zone-dynamics.ts`), todo o fundo das zonas que soa ou já está agendado para como um disco quando a vitrola é desligada: em 0,4 s (`RECORD_STOP`) a velocidade cai por igual até quase parar (o tom desce devagar e despenca no fim, `recordStopCurve` no `detune` de cada voz), o som escurece (passa-baixa de 9 kHz a 250 Hz) e some, e as vozes param. O fundo passa por um filtro e um portão próprios (`stopZoneAmbience` em `synth.ts`), então o Templo, os gongos e as notas dos jogadores não são afetados. Até a barra seguinte, quando o regente troca para a zona silenciosa, nada do fundo volta a tocar.
- **Ligar e trocar de zona:** `soundZoneOf` marca a zona do regente com `quiet` e põe isso no id, então ligar chega na próxima barra de compasso, com as camadas entrando uma a uma (abaixo). Entrar numa zona desligada vindo de uma ligada não é desligar: o resto do compasso esmaece (até 20% no último tempo) e o drone some com a rampa de sempre (constante de 0,3 s), sem clique. Sincroniza no online como qualquer campo do layout (cada navegador toca o próprio fundo).
- **Grade de blocos:** os blocos com ritmo sorteado tocam o ritmo deles mesmo com a Zona da cena desligada (o ligar/desligar deles continua sendo “Blocos são zonas” e “Blocos com ritmo”); o baixo da cena só entra no bloco quando a música da cena está ligada. Bloco em Silêncio soa como a cena.

## Dinâmica do fundo (25/11, v2.18.0)

`lib/pigchicken/zone-dynamics.ts` decide como cada nota escrita pela batida é tocada; `zone-ambience.ts` continua dizendo o que está escrito. Tudo é calculado pela barra e pela semicolcheia (sem sorteio na hora), custa algumas multiplicações por nota e a mesma barra toca sempre igual. Vale em todo Pátio e em todo bloco de variação; o Templo não usa.

- **Mixagem:** a batida soa a 70% do que o knob Volume pede, o baixo a 66% e o drone a 75% (`ZONE_MIX`); os knobs continuam indo de 0 a 100%. Pesos por linha: Bumbo 1, Caixa 0,9, Tom e Palma 0,85, Percussão 0,75, Chimbal 0,68, Chocalho 0,62, Aberto 0,6.
- **Peso de cada nota:** a intensidade escrita vezes 0,9 (o acento deixa de ir ao máximo), vezes o lugar no compasso nas linhas que não são graves (tempo 1, colcheia 0,93, semicolcheia 0,86), ±6% de humanização, e a onda da frase de 8 compassos (0,90 · 0,93 · 0,96 · 1 · 0,91 · 0,94 · 0,97 · 1).
- **Entrada das camadas:** depois de um compasso ou mais sem fundo (nenhuma zona com música, zona desligada, Templo), o primeiro compasso toca só Bumbo e Tom, o segundo soma Chimbal e Chocalho, o terceiro Caixa, Palma, Percussão e Aberto; o volume sobe junto (72%, 84%, 94%, 100%). Passar de uma zona com música para outra não recomeça.
- **Menos densidade:** nos dois primeiros compassos de cada frase de 4, um padrão com mais de 4 linhas toca só as 4 mais importantes (Bumbo, Caixa, Palma, Chimbal, Chocalho, Tom, Aberto, Percussão); as outras entram no 3º. Chimbal, Chocalho e Aberto respiram: 30% das notas fracas fora do tempo descansam, na primeira metade da frase 35% das notas entre os tempos descansam, o 6º compasso de cada 8 fica só nas colcheias e o fim da frase abre espaço para a virada. No 6º compasso de 8 o baixo também solta metade das notas entre os tempos.
- **Frases e preenchimentos:** fim do 4º compasso (metade das vezes) uma nota fraca de Caixa (ou Percussão) na última semicolcheia; fim do 8º, três notas crescendo nas três últimas semicolcheias; fim do 16º, o Tom fecha. Nos compassos do meio da frase, de vez em quando (6% das semicolcheias fracas) uma nota fantasma de Caixa, só nas batidas tocadas com caixa e fora das máquinas (House, Techno, Trap, Reggaeton). Nada disso nos ritmos Suave nem nas Viradas, e só onde o kit tem a linha e a casa está livre.
- **Rotação das variações:** com a variação Base escolhida, os compassos 9 a 12 de cada 16 tocam a variação `rotate` do ritmo (uma que colore sem mudar o groove: Reto → Bumbo dobrado, Rock → Com pandeirola, Samba → Agogô, Techno → Minimal etc., em `BEATS`). Não vale com variação escolhida no painel, grade própria ou num bloco de um ciclo (nem no Solo).
- **Grade própria:** mantém todas as notas desenhadas; recebe só os pesos e a entrada das camadas.

## Lo-fi (25/11, v2.18.0)

Composições próprias do jogo para um fundo calmo; vale em todo Pátio, como os outros ritmos.

- **Kit `lofi`** (`beat-kits.ts`): as gravações do kit acústico tocadas mais devagar (0,72 a 0,88 da velocidade: mais graves) e abafadas: cada linha tem um teto de brilho (`lp`, de 2,4 kHz no Tom a 5,2 kHz no Chimbal) por onde passa toda nota, e a velocidade oscila ±0,6% a cada nota, como fita. Linhas: Bumbo, Caixa abafada, Estalo, Chimbal, Aberto, Vassourinha, Tom e Aro.
- **Batidas** (grupo **Lo-fi** da Batida, entre Mundo e Suave): **Lo-fi** (bumbo que passa do 2, caixa 12 centésimos atrás, chimbal nos contratempos; swing de semicolcheia 63%; variações Preguiçoso, Com aro, Sem bumbo, Virada; rotação: Com aro), **Café** (jazz-hop de vassourinha, aro no 2 e no 4, a colcheia do contratempo bem atrasada: perfil 0, +22, +38, +22; variações Vassourinha, Com caixa, Virada; rotação: Vassourinha) e **Chuva** (bumbo distante, gotas de aro, vassourinha quase sumindo; swing 59%; variações Gotas, Pulso lento; rotação: Gotas). Perfis de microtempo inventados para o estilo, não medidos.
- **Teclado** (grupo novo do Som do Baixo; timbre `keys` de `playBass` em `synth.ts`): um piano elétrico macio, dois senos levemente desafinados entre si e a oitava acima, com o brilho curto da lâmina no ataque, o corpo que esmorece enquanto segura e solta devagar. O token `j` das linhas toca o acorde do compasso aberto como no piano: a fundamental, a sétima dela acima, a terça e a quinta uma oitava acima (sempre notas do tom). **Teclado lo-fi** comenta o acorde no 1 e antecipa no fim do compasso; **Teclado sustentado** segura um acorde por compasso; **Teclado e baixo** alterna acordes e notas soltas da mão esquerda. Também **Baixo lo-fi** (grupo Baixo): um sub redondo que demora, poucas notas por compasso.
- **Estilos** (grupo **Lo-fi** do Estilo): **Lo-fi** (Mi♭, ii7 V7 Imaj7 vi7, 78 bpm, Lo-fi + Teclado lo-fi), **Café** (Fá, IVmaj7 iii7 ii7 Imaj7, 86 bpm, Café + Teclado e baixo), **Chuva** (Lá dórico, i7 e IV7, 70 bpm, Chuva + Teclado sustentado) e **Madrugada** (Dó menor, VImaj7 iv7 i7 i7, 72 bpm, Lo-fi + Baixo lo-fi).
- **Não verificado:** nada foi ouvido; timbre do teclado, níveis e o quanto o kit está abafado foram escritos por número.

## Variações (17/11, v2.13.0)

- Cada ritmo tem o padrão de base e de 3 a 6 variações (`Beat.variations`), escolhidas no campo **Variação** do painel, que só aparece quando há batida. A zona guarda `ambience.variant` (ausente: base). A última variação dos ritmos principais é uma Virada (Breque no Samba) pensada para 4 tempos.
- Trocar a Batida volta à base. A tag Batida mostra "Samba: Partido alto" numa variação.

## Grade com notas arrastáveis (17/11, v2.13.0)

- **A grade da batida** (sempre aberta, logo abaixo de Batida e Variação, desde 17/11; antes ficava recolhida em “Editar a batida”) mostra uma linha por instrumento do kit, com o nome dele, e 16 casas. Clicar numa casa vazia cria a nota no lugar que o ritmo dá àquela casa. Clicar numa nota passa por normal → acento → apaga.
- **Arrastar** uma nota para os lados a leva a qualquer ponto do compasso. Passando da metade do caminho ela vira nota da casa vizinha, se estiver livre; com a vizinha ocupada, ela para a meia semicolcheia da casa dela. Ela gruda (3 centésimos) na grade rígida e no lugar do ritmo. Durante o arraste aparece a distância em ms no andamento do bloco e em % da semicolcheia. Com a nota em foco, as setas movem 1 centésimo (Shift: 5).
- Ao mexer, a zona guarda a grade própria (`drums`) e o tempo de cada nota fora da grade (`drumTime`); Batida e Variação mostram "Própria" e os timbres continuam os do ritmo de origem. Escolher outra Batida ou Variação descarta a grade própria.

## Blocos de variação (17/11, v2.13.0)

- Um **bloco** é um conjunto completo de Harmonia (Tom, Escala, Acordes de, Progressão), Ritmo (BPM, Batida, Variação, Balanço, grade, volume) e Baixo (Som, Oitava, volume). A zona tem de 1 a 10 blocos (`ZONE_BLOCKS_MAX`): o primeiro é a própria zona, os outros ficam em `blocks`.
- **Painel:** a seção Blocos mostra uma aba numerada por bloco; os campos abaixo são os do bloco escolhido. **+** cria um bloco logo depois do escolhido, cópia dele já na próxima variação do ritmo (com os tempos e repetições sugeridos por ela: as Viradas entram com 4 tempos). **−** remove o bloco escolhido; removido o primeiro, o segundo vira a zona. O Estilo aplica ao bloco escolhido ([Estilos](zones.md)).
- Com mais de um bloco aparecem **Tempos** (1 a 64, padrão 16: quantos tempos do bloco tocam em cada passada; 4 tempos são um compasso), **Repete** (1 a 16×: quantas passadas antes do próximo bloco) e **Solo**.
- **Como toca:** os blocos tocam em ordem e voltam ao primeiro. Cada passada começa numa barra de compasso com a progressão do início. Se Tempos não é múltiplo de 4, o resto do compasso é pulado e a próxima passada começa no primeiro tempo. O andamento, o tom e a escala do bloco valem para os instrumentos, a mira e as notas rebatidas enquanto ele toca. Zona nova entra na barra de compasso, como antes, no primeiro bloco.
- **Solo** (ligado ao abrir o painel): enquanto o painel está aberto, toca só o bloco escolhido, em laço, para ouvir a edição. Desligado, ou com o painel fechado, toca o ciclo inteiro. Não é salvo e vale só no navegador de quem edita.
- As tags da zona mostram e mudam o primeiro bloco. Os padrões de mudança das Paredes com vida também mudam só o primeiro bloco.

## Painel (17/11, v2.13.0)

- Ritmo, numa linha: knob **Volume** (da batida, 0 a 100% do Ambiente), knob **BPM** (o antigo Andamento), **Batida** e **Balanço**. Baixo: knob **Volume**, **Som** e **Oitava**.
- **Knob** (`PatioKnob`): arrastar para a direita ou para cima aumenta (160 px cobrem a faixa), setas mudam um passo (Shift: dez), Home e End vão aos extremos, duplo clique volta ao valor inicial. O valor aparece dentro do knob.

## Não verificado

- Nada foi ouvido: nem os timbres, nem o balanço de cada ritmo, nem as variações. Os testes (`tests/pigchicken-rhythms.cases.cjs`) cobrem os dados, a existência dos arquivos, o tempo de cada nota, a grade, os blocos e o regente; a precisão de ±1 ms foi medida num Chromium de computador, não em celular.
- O nível de cada gravação na mixagem foi ajustado por número, não de ouvido.
- A dinâmica de 25/11 (mixagem mais baixa, pesos, entrada das camadas, respiros, viradas e rotação) foi escrita e testada por número, sem ouvir; os valores são ponto de partida para ajuste de ouvido.
