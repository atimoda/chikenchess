# Pátio: Vila dos Telhados, casas e interior

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md).

A Vila, o criador de casas do Modo editor, os pisos das fachadas e a entrada nas casas pela porta. O resto do mundo do Pátio (limites, portais, árvores, trampolim) está em [Mundo do Pátio](world.md).

## Vila dos Telhados e criador de casas

- **Cena:** depois do Templo do Gongo, no mesmo mundo, há uma encosta de degraus suaves. O Pátio padrão traz 17 casas editáveis inspiradas na composição de Jorge Tabanera Redondo, com cores de fachada suavizadas e contornos claros sobre bordas escuras nos apoios. A subida do terreno é o Chão da Vila (abaixo). A posição da Vila e do Templo acompanha a quantidade de cenas do Parquinho. O minijogo, o HUD e a música do Templo ficam na área do Templo e a regra de saída de fase vale também ao seguir para a Vila.
- **Atalhos:** perto do início do Pátio, dois pares levam ao Templo e à Vila. Na disposição padrão, as entradas do Templo e da Vila ficam centralizadas sobre as duas plataformas elevadas; o portal de volta ao globo fica sobre a pequena plataforma à esquerda. Cada destino tem seu portal de volta ao ponto de partida correspondente. Vale o novo aperto de Usar dentro do anel, pelo controle ou pelo botão na tela, com o mesmo bloqueio por boneco até sair totalmente do anel. No Modo editor, clique no anel para selecionar e arraste para mover cada entrada independentemente, inclusive as de volta. A seleção do portal tem prioridade quando o anel está sobre outro objeto. Os atalhos seguem as ações dos pares da paleta e ficam inativos enquanto se edita. A atualização de layout reposiciona apenas as entradas padrão que ainda estão em suas coordenadas antigas; portais movidos manualmente e Pátios pessoais preservam suas posições.
- **Criador:** na paleta do Modo editor, as seções de objetos começam abertas e alternam entre aberta e recolhida pelo título, com o mesmo marcador, tipografia e separador do painel Ajustes. As colunas acompanham a largura disponível, com 96 px mínimos por cartão e 6 px de espaço entre eles. Em Casas, cada estilo tem um cartão com uma prévia sorteada que permanece durante a sessão do editor. Clicar no cartão abre o criador com a combinação da prévia. Arrastar o cartão direto ao Pátio sorteia novos parâmetros e dimensões dentro daquele estilo a cada gesto. Ao abrir o painel, a prévia fica fixa acima da lista rolável. Cada seletor tem rótulo à esquerda e uma seta à direita que avança e volta ao primeiro valor no fim da lista. Estilo e Sortear repõem a combinação visual. A fachada distribui as aberturas conforme os parâmetros. Arrastar a prévia para fora insere a casa com o centro da base no ponto de soltura, em um passo de histórico. Cancelar o gesto ou soltar sobre outro painel descarta a inserção e conserva o rascunho. O tamanho inicial da prévia é 380 × 550 unidades. Casas já colocadas conservam suas dimensões.
- **Edição e pisos:** dois cliques numa casa ou outro elemento parametrizável, com o Modo editor ligado e o elemento destrancado, abrem seus parâmetros. Alterações de casa entram ao vivo. Ela pode ser movida, redimensionada, duplicada, trancada ou apagada pelas ações do editor. A base, a linha real do telhado, a verga de cada porta e janela e o peitoril de cada janela são pisos de mão única para todos os bonecos locais. O desenho usa um friso para marcar cada apoio. Dá para saltar de baixo, andar pela inclinação e usar o gesto normal de atravessar pisos para descer. Bloquear tiros ou notas é opcional e usa a caixa da casa. Vale para casas de todas as cenas do Pátio, em lobbies locais ou online.
- **Ocultar colisores atrás (05/11, v2.0.0):** em **Camada e colisões**, a opção começa ligada em todas as casas, inclusive nos layouts antigos, e desligada nos demais elementos de cenário. Aplica-se a objetos visíveis e opacos. A fachada desenhada da casa, ou a caixa girada dos demais objetos, recorta somente as partes cobertas dos pisos e paredes atrás dela. A ordem é a das camadas visuais e dos elementos dentro da camada. Um elemento conserva seus próprios apoios. O terreno da Vila é recortado como qualquer outro piso atrás da fachada. Contatos com os volumes de tiro, nota, bomba e item também respeitam o recorte; as opções de bloquear tiros e notas controlam os volumes de cada objeto. O chão de segurança do mundo continua abaixo da cena. Ao desmarcar, mover, girar, redimensionar, esconder ou tornar o objeto translúcido, o recorte é refeito e os trechos expostos voltam a funcionar. A mudança segue o histórico e é salva no layout. Vale em todas as cenas e lobbies do Pátio para todos os players locais.
- **Chão da Vila (08/11, v2.3.0):** a encosta jogável é o primeiro elemento do layout, um Chão de bioma “Rocha da Vila” (`id` `village-ground`, região da Vila) com “Objeto duro” ligado. Seus pontos, colisões, camada e bioma se editam como os de qualquer Chão (ver [Editor do Pátio](editor.md), Chãos e Paredes); pode ser movido, trancado, duplicado ou apagado. O antigo painel “Chão da Vila” (ícone de montanha) saiu. Pátios salvos antes (layout v4 ou anterior) ganham esse Chão uma vez, com a encosta que tinham editado (`terrain`) ou a padrão. A fileira de terraços ao fundo e a placa continuam decorativas e fixas, e as casas mantêm suas próprias posições ao alterar a encosta.
- **Sliders e dicas dos parâmetros:** Ajustes, Câmera de Mira, Controles, Itens, Volume e os editores do Pátio usam a mesma barra preenchida, com rótulo e valor sobre a barra. Controles consecutivos (sliders, seletores, caixas de marcar, botões de opção, campos e as teclas de Controles) ficam a 2 px um do outro em todos os painéis do PigChicKen (12/11, v2.9.0; antes 3 px só entre sliders), pela classe compartilhada `gap-field` de `app/globals.css`; títulos de seção, divisórias e botões de ação mantêm o próprio espaço. Nos painéis do PigChicKen, as instruções específicas de cada campo aparecem só no hover (`title`), sem uma cópia abaixo do valor; desde 11/11 (v2.8.0) `PatioRange` e `PatioDualRange` não têm mais a opção de mostrar a instrução abaixo, então isso vale também para Câmera de Mira e Ajustes. Os textos gerais do painel permanecem. O painel Itens não repete abaixo da seleção a família nem a informação de persistência. Os valores são aplicados durante o gesto. Setas, Home, End e Page Up/Down ajustam o slider com foco, e soltar o ponteiro devolve o teclado ao jogo. Controles do boneco também usa a mesma barra no globo. As faixas, unidades e ações de restauro seguem cada parâmetro.
- **Persistência:** o layout v4 guarda os atalhos junto aos demais portais, além da semente e parâmetros das casas e do perfil da encosta. Pátios existentes recebem os dois pares nas posições originais uma vez, ao carregar. A posição e o vínculo passam a ser salvos com o Pátio, e pares removidos no v4 continuam removidos. Layouts sem perfil usam o chão padrão. O Pátio padrão salvo em v2 ou anterior recebe a demonstração ao carregar, e a exclusão de casas numa versão v3 é preservada. Cópias novas herdam o Pátio padrão. Pátios personalizados existentes mantêm seus elementos. As posições do chão e dos elementos colocados no Templo ou na Vila são relativas à cena para sobreviver a mudanças na largura do mundo, e os salvamentos seguem o cache local e a revisão do lobby.

| Estilo no criador | Padrões das referências |
| --- | --- |
| Encosta de ferrugem | Casas sobrepostas, reboco gasto, tábuas, tijolos e telhas em ferrugem e azul, a partir de Jorge Tabanera Redondo. A Vila usa uma paleta suavizada e relevo menos íngreme. |
| Casario empilhado | Fachadas estreitas e altas, reboco ou chapa ondulada, beirais rasos e cores alternadas. |
| Colinas pintadas | Silhuetas simples, textura de tela, aberturas escuras e paletas em grandes manchas de cor. |
| Cidade geométrica | Repetição de janelas em grade, frontões triangulares ou escalonados e blocos de cor. |
| Terraços da lua | Coberturas planas, alvenaria ou pedra, aberturas em arco e luz âmbar. |
| Madeira costeira | Tábuas horizontais ou verticais, duas águas inclinadas, telhas de ardósia e molduras claras. |
| Vila de conto | Telhados curvos ou de mansarda, escamas, venezianas e janelas iluminadas. |
| Cidade ornamental | Torres e frontões variados, fachadas altas em tons suaves, arcos e janelas em ritmo regular. |
| Telhas de festa | Telhados desenhados com losangos, faixas ou escamas, cores contrastantes e esquadrias em arco. |
| Vila-jardim | Casas baixas de reboco claro, telhas coloridas e poucas aberturas. |
| Papel recortado | Blocos de cor com granulado fino na fachada e no telhado. O sorteio varia a largura, a altura, a paleta e o telhado triangular ou trapezoidal, com uma porta central e nenhuma janela por padrão. O criador mantém os controles de fachada e acabamento, e os frisos marcam os apoios. |
| Cubista | Volumes facetados em tons terrosos, recortes, pequenos toldos e variações de terraço. No formato Terraço com muretas, a profundidade ajusta a projeção do telhado e o friso liga os quatro cantos. Cada borda da mureta é um piso de mão única, inclusive as laterais inclinadas. O miolo é decorativo. Ao cair sobre bordas sobrepostas na projeção, vale a primeira que a galinha cruzar na descida. |

## Interior das casas

Entrar nas casas do Pátio pela porta (16/11, v2.12.0). Vale para toda casa do Modo editor e da Vila dos Telhados, em todos os Pátios, com players locais e no online. As medidas vêm da própria fachada (`lib/pigchicken/houses.ts`).

Código: `lib/pigchicken/house-rooms.ts` (regras puras), `lib/pigchicken/house-rooms-store.ts` (quem está onde), `components/pigchicken/house-doors.tsx`, `components/pigchicken/house-dusk.tsx` (o escurecimento do cenário de fora) (laço por quadro), `components/pigchicken/house-art.tsx` (interior e porta acesa), `components/pigchicken/patio-layout.tsx` (pisos do cômodo). Testes em `tests/pigchicken-house-rooms.cases.cjs`.

### Quais casas

- Dá para entrar numa casa que tenha porta (parâmetro Porta do criador), esteja numa camada atrás dos bonecos (Fundo, Cenário ou Atrás dos bonecos), com as colisões ligadas, visível e fora da profundidade de cenário.
- Uma casa sem porta, numa camada da frente, escondida ou usada como cenário distante continua só fachada.

### Entrar e sair

- **Gatilho:** Usar (o mesmo comando de Pegar: E no teclado, X no gamepad por padrão) com o boneco no chão, em frente à porta: o meio do corpo entre os lados da porta e os pés na altura da base da casa (até um degrau acima ou abaixo).
- Vale um aperto que começou ali. Chegar à porta com Usar já apertado não entra; é preciso soltar e apertar de novo.
- O mesmo gesto, de dentro, sai. Só a porta é passagem: não há outro jeito de entrar ou sair andando.
- Com duas portas ao alcance, vale a mais próxima do corpo.
- Enquanto um player desta tela está em frente a uma porta (por fora ou por dentro), o contorno da porta acende. Não há texto de instrução.
- **Saída forçada:** quem está dentro volta para fora, sem animação, quando é levado para longe do cômodo (portal, viagem de Pátio), quando a casa some, perde a porta ou deixa de ser enterável, e quando o Modo editor liga. Trocar de Pátio começa com todos fora.

### O cômodo

- É um retângulo: entre as paredes da casa, do ponto mais baixo do telhado até a base. Acima desse teto a silhueta da parede fica escura (o desvão do telhado).
- **Paredes e teto:** para quem está dentro, são os limites do próprio boneco, com as mesmas regras das bordas do mundo (sólidos, escaláveis, dá para andar pelo teto). Ver [Paredes, teto e fios](../chicken/climbing.md).
- **Térreo:** piso duro. O gesto de atravessar pisos não desce por ele.
- **Andares:** um piso de mão única para cada andar acima do térreo (parâmetro Andares), na divisa entre os andares da fachada. Dá para pular de baixo e descer com o gesto normal. Um andar com menos de 9% da altura da casa não ganha piso próprio.
- Quem está dentro só usa os pisos do cômodo. As vergas, os peitoris e o telhado da fachada, e todos os outros pisos do Pátio, são de quem está fora. Quem está fora nunca usa os pisos de um cômodo.
- O boneco não muda de posição ao entrar ou sair: continua em frente à porta.

### O que se vê

- **De dentro:** enquanto pelo menos um player desta tela está numa casa, a fachada dela some e aparece o interior: parede do fundo escura, pisos dos andares, e janelas e porta como a luz que entra (cor do vidro da casa). O telhado e os contornos continuam.
- **De fora:** a fachada cobre. No online, o boneco e o nome de um player de outro navegador que está numa casa fechada nesta tela não são desenhados. Quando um player desta tela entra na mesma casa, eles aparecem.
- Players locais dividem a tela: basta um deles entrar para a casa abrir para todos desta tela.
- **O resto escurece:** enquanto há uma casa aberta nesta tela, o cenário de fora fica com 40% da luz (céu, montanhas, chão, as outras casas e os demais elementos do Pátio, inclusive os das camadas na frente dos bonecos), e a casa aberta continua clara por cima de tudo isso. O que estiver na frente dela no mundo fica atrás enquanto ela está aberta. Entra e sai em cerca de 0,3 s. Bonecos, itens, inimigos e disparos mantêm as cores, como na luz da hora do dia. Com duas casas abertas (dois players locais), as duas ficam claras.

### Tiros, notas e arremessos

- O que um player atira dentro (tiros, notas de instrumento, foguetes, granadas) e o que arremessa fica no cômodo: para nas paredes, no teto e no térreo. Granadas quicam nelas; foguetes e notas explosivas estouram ali.
- Nada disparado dentro acerta inimigos, alvos ou botões, que estão sempre fora, nem os empurra com a explosão. A mira prevista também para na parede.
- O item arremessado cai no térreo do cômodo.
- Os disparos de fora seguem como antes (a opção de a casa bloquear tiros ou notas não mudou) e não há o que acertar dentro.
- No online, os tiros de um player de outro navegador que nascem dentro de uma casa fechada nesta tela não aparecem; com a casa aberta aqui, aparecem e ficam no cômodo.

### Online

- Cada navegador diz em que casa está cada um dos seus players (mensagem `houses`, quando muda e a cada 2 s). O servidor de jogo repassa aos outros (`server/src/patio-room.mjs`, capacidade `houses`).
- Com um servidor de jogo antigo, sem essa capacidade, ninguém é escondido: cada navegador abre só as casas dos seus próprios players e vê os outros na frente das fachadas.

### Ainda não cobre

- Golpes de perto, Bicada, raio dos cajados e cocô das aves atravessam a fachada nos dois sentidos.
- Pintinhos, almas, gaiolas no chão, itens soltos e inimigos não entram: continuam desenhados na frente da fachada.
- As notas da fase de notas (as que vêm para ser rebatidas) ignoram os cômodos.
- Não há móveis nem itens próprios do interior.
