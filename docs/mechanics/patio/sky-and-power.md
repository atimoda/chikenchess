# Pátio: céu e luz, profundidade, postes e torres, pássaros nos fios

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). O parallax de fundo e os limites do mundo ficam em [world.md](world.md); o editor em geral em [editor.md](editor.md).

## Céu e luz (10/11, v2.7.0)

`lib/pigchicken/sky.ts` (parâmetros, horas, Randomize, `skyLook`), `components/pigchicken/parallax.tsx` (desenho), `components/pigchicken/sky-fields.tsx` (painel), `ParquinhoWorld`/`ParquinhoForeground` em `components/pigchicken/parquinho.tsx` (filtro de luz).

- **Onde:** Configurações do Pátio (botão Sol), seção **Céu e luz**, para quem pode editar o Pátio. Fica salvo no layout (`settings.sky`), em todos os modos do Pátio (local e online). Sem `sky`, o Pátio mantém o entardecer clássico do código; o botão **Clássico** volta a ele.
- **Hora do dia** (00:00 a 24:00): posição do sol (nasce ~6 h, se põe ~18:30, atrás das montanhas quando baixo) e da lua à noite, estrelas de noite, e a luz sobre o cenário. Com **Cores pela hora** ligado, o degradê do céu segue uma sequência de horas-chave (madrugada, aurora, manhã, dia, tarde, hora dourada, pôr do sol, crepúsculo, hora azul, noite) interpolada.
- **Degradê em faixas:** desligando Cores pela hora (ou mexendo numa cor), o céu vira uma lista de 2 a 8 cores, do Topo ao Horizonte, cada uma com cor e posição (0 a 100%), botão **+ Cor** (entra no maior intervalo, com a cor que já estava ali) e × para tirar. A miniatura ao lado mostra o degradê e o sol.
- **Randomize:** sorteia hora (na maioria nascer/pôr do sol, às vezes noite ou dia), 3 a 7 faixas de cor que vão de um tom frio no topo a um quente no horizonte, sol, brilho, nuvens, textura, névoa, contraluz e se há montanhas e mata. Mantém a Luz no pátio já escolhida.
- **Sol:** Tamanho e Brilho (halo e a faixa de luz ao longo do horizonte embaixo dele, mais forte perto do horizonte). **Nuvens:** quantidade (0 tira todas), coloridas pelo sol e pelo céu. **Textura:** grão suave com estrias horizontais por cima do céu (um ladrilho gerado uma vez por intensidade, em `soft-light`). **Névoa:** montanhas, mata e tudo que está em profundidade some na cor do horizonte. **Montanhas** e **Mata ao longe** ligam e desligam essas camadas do parallax.
- **Contraluz e Luz no pátio:** o cenário do layout (chão, plataformas, casas, árvores, Templo e Vila, nas camadas Fundo, Cenário, Atrás dos bonecos e Frente) recebe um filtro CSS `brightness/saturate/sepia` calculado da hora (Luz no pátio = quanto a hora pesa) e do Contraluz (escurece até silhueta, mais forte com o sol baixo). Galinhas, pintinhos, aliens, pássaros, itens e tiros ficam com as cores próprias. As montanhas e a mata do fundo usam a mesma conta para escolher a cor. Os postes, torres e fios não passam pelo filtro: já usam a cor de silhueta do céu (variáveis `--patio-sil`, `--patio-horizon` e `--patio-haze` na raiz da página).

## Profundidade (parallax) de qualquer cenário (10/11, v2.7.0)

`LayoutElement.depth` em `lib/pigchicken/layout.ts`, `followDepth`/`setCameraRestY`/`depthOffset`/`onCameraMove` em `lib/pigchicken/live-camera.ts`, `DepthLayer` em `components/pigchicken/patio-layout.tsx`.

- Em **Camada e colisões** (e no Editar de postes e torres), o slider **Profundidade** vai de “No chão” (0) a 95%. Com profundidade, o elemento passa pela tela mais devagar que o chão (a (1 − p) da velocidade), como as montanhas. Vale para todo cenário que não é coisa do jogo nem música (plataformas, casas, árvores, chãos, paredes, postes, torres…).
- Em profundidade o elemento é **só cenário**: sem pisar, tiros, notas, rebate, Objeto duro, gravidade nem recorte de colisores; não pertence ao Templo nem à Vila. O `x`/`y` guardados são os da câmera em 0 (horizontal) e na altura de repouso (vertical: o chão perto do pé da tela), então um poste posto no horizonte fica no horizonte em qualquer tamanho de tela e só sobe quando a câmera sobe.
- Mudar a profundidade mantém o elemento onde ele está na tela agora. No editor, a área de seleção, os cantos e a barra acompanham a profundidade; soltar da paleta sempre começa no chão (0).
- Cenário em profundidade (exceto postes e torres) fica mais transparente com a profundidade e a Névoa (some no céu).

## Postes de energia e Torres de transmissão (10/11, v2.7.0)

`lib/pigchicken/power-lines.ts` (modelos, pontos de fixação, ligação), `components/pigchicken/power-art.tsx` (desenho e fios), elementos `pole`/`tower` em `layout.ts`, paleta e `PowerFields` em `patio-editor.tsx`.

- **Paleta → Energia:** Postes (Madeira com uma cruzeta, Madeira com duas cruzetas, Concreto de rua) e Torres (Treliça com dois braços, Cabeça de gato, Três níveis). Ao soltar, entram no tamanho do modelo, plantados no piso logo abaixo, na camada Fundo e sem colisão. Redimensionar estica o desenho e os pontos dos fios juntos.
- **Fios automáticos:** cada poste/torre se liga ao vizinho seguinte, ordenados pelo centro em x, entre os do mesmo tipo, **modelo** e **Linha** (1 a 4); um fio por ponto de fixação do modelo. Pôr, apagar, mover ou trocar o modelo/linha refaz as ligações na hora. Cada fio é uma curva que cai no meio (**Caimento dos fios**, 0 a 100%, do poste da esquerda) com **Espessura** de 1 a 8 px (mais fina em profundidade).
- **Profundidades diferentes:** quando os dois postes de um fio estão na mesma profundidade, o fio só desliza com a câmera; quando estão em profundidades diferentes (uma fila de torres indo para o fundo), as pontas do fio são recalculadas a cada movimento da câmera, então o fio continua preso nos dois. Um fio é desenhado na camada do poste da esquerda.
- **Cor:** a silhueta do céu, misturada com o horizonte pela profundidade (as do fundo somem na névoa). No editor, a miniatura da paleta aparece clara.

## Pássaros nos fios (10/11, v2.7.0)

`lib/pigchicken/bird-perch.ts` (puro), `BirdType.perch` em `lib/pigchicken/birds.ts`, integração em `lib/pigchicken/combat.ts` (pássaros vivos e mortos-vivos) e `components/pigchicken/parquinho.tsx` (fios, câmera e posição dos players a cada quadro).

- **Quando:** um pássaro vivo, na hora em que iria embora (depois de rodear ou pousar no chão, ou logo depois de surgir se o tipo vai direto embora), e um pássaro morto-vivo depois de rodear 2,5 s, sorteiam **chance de pousar**; com fios no Pátio, voam até um lugar livre num fio a até o **alcance** (1800 px), escolhido entre os mais próximos com espaçamento mínimo entre pássaros (enfileirados como notas numa pauta). Sem lugar livre, seguem como antes.
- **No fio:** ficam presos ao ponto do fio (que se mexe com a profundidade dos postes), continuam assobiando, e podem ser capturados pelo Passaguá normalmente. O tempo total nos fios é o **tempo pousado** (±25%); acabando, voam embora como antes (os mortos-vivos entram em Saindo).
- **Fuga:** com um player mais perto que o **raio de alerta**, depois de um pequeno susto (mais curto quanto maior a força da fuga), o pássaro anda de lado pelo fio para longe do player, devagar. Se o player chega a 60% do raio, uma vez por aproximação e respeitando a **recarga**, ele sorteia a **força da fuga** e, se sair, voa para outro lugar livre longe do player, a no máximo a **velocidade de fuga** (fração da corrida da galinha, ~510 px/s), sempre mais devagar que ela. Depois de 4 voos assim, ou sem outro lugar livre, ele vai embora.
- **Parâmetros por tipo** (`BirdPerchParams`, padrão entre parênteses; faixas em `BIRD_PERCH_RANGES`): raio de alerta `alert` (140 px), força da fuga `flee` (0,4), velocidade de fuga `fleeSpeed` (0,6), recarga `cooldown` (1,5 s), chance de pousar `perchChance` (0,3), tempo pousado `perchTime` (10 s), espaçamento `spacing` (34 px) e alcance `range` (1800 px). Pardal e Sabiá pousam bastante; Canário é o mais arisco (alerta 220, força 0,85); Coruja quase não se importa (alerta 90, força 0,15, 22 s no fio). `fleeFrom` dá só o passo de fuga, para outros comportamentos reaproveitarem.

## Pátio de exemplo: pôr do sol com torres (10/11, v2.7.0)

`lib/pigchicken/example-patios.ts`; botão **Novo Pátio de exemplo: pôr do sol com torres** no painel Playgrounds (`newPatio(creatorId, 'sunset')`). Um Pátio de 3 telas com céu de pôr do sol em 8 faixas e contraluz forte, sem montanhas: torres pequenas no horizonte (profundidade 80%), uma fila de torres de Três níveis que vai para o fundo (cada uma mais funda e menor, com os fios ligando profundidades diferentes), torres Cabeça de gato no meio (50%), torres grandes perto (25%), postes de madeira no caminho com fios ao alcance de plataformas, palmeiras e pinheiros em profundidade e na frente, suportes do Passaguá e da Flauta e o botão Soltar aliens (aliens harmonizados viram pássaros que pousam nos fios). Fica guardado neste navegador na hora, como o Pátio vazio.
