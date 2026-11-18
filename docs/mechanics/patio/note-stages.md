# Pátio: fases de notas por zona, metas e sequenciadores

Como uma fase de notas (o modo guitar hero do [Templo](temple.md) e das [Músicas](songs.md)) é pedida, onde ela vale, como se ganha e quem pode pará-la. Vale desde 18/11 (v2.14.0) em todos os modos do Pátio (local e online; o layout vai ao lobby como qualquer edição) e para todos os players locais.

Código: pedido, resultado, meta e corações em `lib/pigchicken/note-stage.ts` (`StageRequest`, `StageResult`, `StageGoal`, `createNoteStage`); várias fases ao mesmo tempo em `lib/pigchicken/note-stages.ts` (`createNoteStages`); relógio próprio por `snapshot`/`restore` do maestro em `lib/pigchicken/music.ts`; escolha de cada sequenciador em `lib/pigchicken/song-library.ts` (`pickOf`, `pickSong`, `pigchicken-song-picks-v1`); meta dos sequenciadores e Gongo em `lib/pigchicken/gong.ts`; ligação no jogo em `components/pigchicken/parquinho.tsx`; desenho em `components/pigchicken/note-stage-draw.ts` (`drawJukebox`, `drawVitrola`, HUD, `drawStageDebug`) e `components/pigchicken/temple-draw.ts` (`drawGongTotem`). Testes em `tests/pigchicken-notes.cases.cjs`, `tests/pigchicken-gong.cases.cjs` e `tests/pigchicken-songs.cases.cjs`.

## Pedido e resultado

- **Quem pede:** uma Jukebox ou uma Vitrola toca-discos (Tocar no painel delas), um Gongo (pelas batidas, que apertam Tocar no sequenciador da zona dele), o Gongo do Templo, o Tocar daqui do editor de músicas (rascunho) e, mais tarde, a bomba (Descriptografar; o tipo do pedido já existe, a bomba ainda não).
- **O pedido leva:** a música (uma cópia: mudar a biblioteca durante a música não a altera), o dono (o player cujo leque recebe as notas: quem estava mais perto do Gongo em x; Tocar no painel e o Tocar daqui são do player 1), a zona, quem pediu, o sequenciador, a meta, se conta recorde (o rascunho não conta) e o texto do fim (“Bata no gongo/na vitrola/na jukebox para tocar de novo.”).
- **O resultado** sai no quadro em que a fase acaba: ganhou ou não, por quê (`done`, `accuracy`, `hearts`, `afina`, `left`, `stopped`), a precisão, os pontos, o combo máximo e as contagens. O recorde é gravado só quando ganhou e o pedido conta recorde.

## Zona da fase

- **Zona:** a Zona sonora do mapa onde quem pediu está (o sequenciador, o Gongo, ou a galinha no Tocar daqui; os blocos da Grade de blocos contam como zonas); fora de qualquer uma, a zona própria da cena, a cena inteira, mesmo com as zonas das cenas desligadas.
- **Uma por zona:** cada zona toca no máximo uma fase. Um pedido numa zona que já toca (ou que já tem um pedido na fila) é recusado e nada é interrompido: o sequenciador treme, o neon pisca em vermelho e soa um som abafado. Exceção: o Tocar daqui substitui o rascunho que já toca na zona. Durante a campanha dos aliens do Templo, a zona da cena do Gongo do Templo também recusa.
- **Várias zonas ao mesmo tempo:** zonas diferentes tocam fases diferentes juntas, cada uma com o seu relógio: uma cópia do maestro do Pátio no mesmo tempo, que entra na zona da música na virada do compasso. A música que se ouve é a da fase da zona onde o player 1 está; ao entrar nela, o maestro do Pátio se alinha ao relógio da fase (mesma batida), para os rebates continuarem no tempo.
- **Sair da zona:** se o dono da fase passa 2,5 s fora da zona dela, a música se perde (“Você saiu da zona da música.”). Voltar antes disso zera a conta.
- **Notas e tiros:** cada fase tem a sua fonte de tiros-nota (`stage:<n>`), então o leque, os rebates e os cancelamentos de cada uma não se misturam.

## Meta e corações

- **Meta:** quem pede define a precisão mínima no fim (0 a 100%) e os corações (1 a 9). Jukebox e Vitrola têm no Editar **Precisão mínima** (passo de 5%; 0 mostra “Nenhuma”, o padrão) e **Corações** (padrão 3). O Gongo usa a meta do sequenciador que ele aciona. O Tocar daqui usa sem mínimo e 3 corações.
- **Corações:** aparecem no HUD da fase, antes do nome da música. Um alien que chega nela tira um coração (“-♥”, som de dano) e dá 1,4 s em que outro toque não tira coração; o toque continua baixando a afinação e zerando o combo, como antes. Sem corações, a música se perde (“Os aliens te derrubaram.”).
- **Precisão no fim:** se a música chega ao fim abaixo da precisão mínima, ela se perde (“N% de precisão, a meta era M%.”), sem recorde.
- **Afinação:** continua igual: notas perdidas e toques baixam a barra; em zero, a música se perde.

## Parar

- **Parar** no painel do sequenciador para a fase que ele começou (banner “Música parada”).
- **Batidas de parar** de um Gongo param a fase da zona dele.
- **Pedra Recomeçar:** 3 batidas param a fase da zona dela.
- **Parar** do editor de músicas para o rascunho.
- A fase de uma bomba nunca é parada de fora.

## Sequenciadores e Gongo

- **Jukebox e Vitrola toca-discos** (grupo Música da paleta): cada uma guarda a sua música escolhida neste navegador (`pigchicken-song-picks-v1`, por botão `jukebox:<id>`/`vitrola:<id>`; a do Templo é `jukebox`). Bater numa delas abre o painel da biblioteca com o título “Jukebox” ou “Vitrola toca-discos”; Tocar começa a escolhida dela, na zona dela; o disco Campanha do Gongo começa a campanha do Templo. Enquanto a sua fase toca, Tocar vira Parar.
- **Vitrola toca-discos:** caixa de madeira com o disco girando (um brilho que gira), braço da agulha, pescoço e corneta de 8 pétalas dourada (caixa de 150 × 190 no layout; área de acerto de 130 × 180), que cai no chão ou na plataforma logo abaixo. Enquanto toca, a manivela do canto de baixo à direita gira uma volta a cada 2 batidas e a corneta pulsa na batida; recusada, treme e pisca em vermelho.
- **Gongo:** não tem música própria. O Editar perdeu Música e Título; ficaram Batidas para começar, Batidas para parar, Esquecer as batidas, Gongo do Templo e Lâmpadas. Sem texto acima dele: só a contagem “0/5”, sempre visível na trave de cima. Ao completar as batidas, aperta Tocar na Jukebox ou Vitrola mais perto dele na zona dele (senão, na zona da cena dele), com o dono sendo o player mais perto; sem sequenciador, som abafado. Enquanto a zona dele toca uma fase, as batidas contam para pará-la (sem parada configurada, som abafado).
- **Gongo do Templo:** continua (com ele ligado, as batidas começam a campanha dos aliens ou a música escolhida no sequenciador da zona dele, como no [Templo](temple.md)).

## Depuração

**Camadas → Debug da fase de notas** (padrão desligado, guardado com as outras camadas) mostra no canto de baixo à esquerda um bloco por fase: música, quem pediu, dono do leque, zona e estado; batida do relógio dela, afinação, corações e tempo fora da zona; PERFEITO, BOM, FORA, perdidas, anuladas, passarinhos e abates (com as notas que os abates impediram); notas disparadas, precisão contra a mínima (verde quando atinge, vermelha quando não) e pontos; e os acertos de cada player (com as anuladas).
