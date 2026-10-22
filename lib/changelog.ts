export { RELEASE_LABEL } from './release'

// User-facing release history shared by the map, game and Creative studio.
export const CHANGELOG = [
  {
    version: '1.6.6',
    date: '21/10/2026',
    title: 'Movimento automático do crossfader nunca silencia um time',
    groups: [
      { title: 'Mixer', items: [
        'O movimento automático do Crossfader a cada jogada agora mantém o Gain de cada time entre 0,25 e 1,25: o time com menos chance continua sempre com um pouco de volume. Arrastando o Crossfader manualmente, ele continua indo de 0 a 1,5, com o centro em 0,75.',
      ] },
      { title: 'Online', items: [
        'Voltar a uma partida online já iniciada pula a tela de abertura e entra direto na montagem do tabuleiro.',
        'No globo, a miniatura de cada partida em andamento mostra a posição atual, incluindo casas congeladas (azul-gelo) e com Shield (contorno dourado).',
        'O botão "Create lobby" agora fica sempre visível ao final de "Public rooms", com fundo verde, e cria na hora um lobby público com o kit Random.',
        'A aba "Rooms" passou a se chamar "Lobbies" e traz os botões "Create Public Room" e "Create Private Room", que criam o lobby direto, sem a tela de configuração.',
        'O botão de fechar dos popups "You won!", "You lost" e "Draw" agora leva de volta ao globo.',
        'O online baixa bem menos dados: editar peças numa partida e atualizar a lista de partidas em andamento no globo agora trazem só o que mudou, em vez de tudo de novo. Uma aba de partida esquecida aberta também deixa de baixar a partida a cada reconexão, e cada ajuste de peça chega ao outro jogador só com o parâmetro alterado. A lista de salas públicas do globo se atualiza sala a sala, sem recarregar a lista inteira.',
      ] },
      { title: 'Partida', items: [
        'Na campanha e no online, o contador de golden eggs do adversário passou para o lado esquerdo, acima do tabuleiro, com a mesma largura e o mesmo espaçamento do contador do jogador; as peças capturadas pelo adversário ficam à direita, alinhadas pela direita.',
        'O status "Your move" fica centralizado logo abaixo da linha de peças capturadas; no turno do adversário, a mensagem aparece centralizada acima do tabuleiro, sobre a linha de capturas de cima.',
        'No tablet/desktop, o resize do tabuleiro permite crescer mais: até as cartas de super-poderes ficarem cerca de 33% visíveis.',
      ] },
      { title: 'Debug', items: [
        'No widget Debug, os botões passaram a se chamar Piece, Stockfish, Bot e Eggs.',
        'Novo botão Moves no Debug: por 2 golden eggs, mostra no tabuleiro as 10 melhores jogadas da posição, em vez das 3 do Best moves.',
        'Novo switch Code no Debug, ligado por padrão, para mostrar ou esconder o código no fundo da partida.',
        'O widget Bot Control ficou mais compacto, e os campos numéricos ganharam botões − e + que continuam ajustando o valor enquanto ficam pressionados. Os mesmos botões do modo Criativo também passaram a repetir ao segurar.',
        'O widget Debug Stockfish ganhou a mesma aparência dos demais widgets, com o botão de energia que o fecha.',
      ] },
      { title: 'Tips', items: [
        'As tips do início da partida voltam a avançar: cada nova partida mostra a próxima tip, até acabarem, em vez de repetir sempre a primeira para quem está conectado ao modo online (inclusive como convidado).',
      ] },
    ],
  },
  {
    version: '1.6.5',
    date: '19/10/2026',
    title: 'Criação de lobby no globo, crossfader dinâmico por chance e iluminação de peças ativas por ganho',
    groups: [
      { title: 'Globo e salas online', items: [
        'No popup das cidades no globo, o botão "Create room" foi renomeado para "Create lobby", com cursor crosshair e timbre grave multi-oscilador no sintetizador ao passar o mouse.',
        'Ao clicar em "Create lobby", o botão fica desabilitado e exibe o rótulo "Waiting response" com um ícone animado de espera enquanto aguarda a resposta do servidor, mantendo a resposta sonora ao ponteiro.',
        'No globo, o botão inferior "Rooms" foi removido e o título "Public rooms" tornou-se clicável para abrir diretamente o popup de salas.',
        'Os títulos "Games in progress" e "Public rooms" no globo agora são exibidos na cor branca.',
      ] },
      { title: 'Mixer e dinâmica visual', items: [
        'O Crossfader possui recuo de 10px de cada lado em relação à largura do painel do Mixer.',
        'O Crossfader alterna suavemente de lado a cada jogada com transição de 0,3s (ease-in-out) a cada movimento e atualização da barra de Chance, movendo-se com profundidade proporcional à chance atual da equipe da vez (-1 a 0 para o time de cima e 0 a +1 para o time de baixo).',
        'O botão do slider do crossfader passa a funcionar também como botão de Play/Pause em cliques simples (sem arraste), exibindo o ícone centralizado de Play/Pause no lugar do antigo traço vertical; durante o arraste do slider, o ícone de Play/Pause fica oculto. O botão possui fundo com 15% de transparência para revelar sutilmente o Spectrogram e borda com efeito de hover que acende com brilho na cor do kit da fase.',
        'O antigo botão separado de Play/Pause abaixo do Crossfader foi removido, integrando o controle de reprodução diretamente ao botão do Crossfader.',
        'O fundo com espectrograma foi migrado para o fundo do Crossfader (opção "as Crossfader background" nas Preferências), com dois espectrogramas simultâneos que crescem a partir do centro vertical para cima e para baixo, com o lado direito invertido horizontalmente.',
        'O widget individual do Spectrogram agora exibe dois espectrogramas por equipe lado a lado, com o time de cima na esquerda e o time de baixo na direita invertido horizontalmente.',
        'Adicionada a configuração "Crossfader" no submenu Preferências ("Sync with player\'s chance" / "Manual only") para habilitar ou desabilitar a sincronização automática com a barra de Chance.',
        'A iluminação das casas ativas no tabuleiro passa a acompanhar o Gain do seu kit no Mixer (com ganho 0 o brilho da casa é zerado; a partir de 1 atinge intensidade máxima), enquanto o dropshadow da própria peça ativa permanece aceso com intensidade fixa enquanto a peça estiver ativada musicalmente.',
      ] },
    ],
  },
  {
    version: '1.6.4',
    date: '18/10/2026',
    title: 'Aviso de nova versão, espectrograma no Play/Pause, alerta sonoro e migração integrada de perfil visitante',
    groups: [
      { title: 'Interface e atualização', items: [
        'Quando uma nova versão é publicada com a aba já aberta, um popup branco aparece no canto inferior esquerdo com a mensagem "There is a new version available!" e um link para atualizar a tela.',
        'Adicionada a preferência "Spectrogram" nas Preferências da partida, permitindo alternar entre o modo "Widget" e o modo "as Play/Pause button background" (com o espectrograma exibido no fundo do botão Play/Pause dentro do Mixer).',
      ] },
      { title: 'Online e notificações', items: [
        'Ao entrar em uma conta registrada, o perfil visitante local é migrado automaticamente para a conta: golden eggs viram pontos históricos, amigos e pontos são unificados e uma tela de resumo informa os itens transferidos com botão "Ok!".',
        'Quando passa a ser a vez do jogador em uma partida online ativa (com o jogador no globo ou com a aba em segundo plano), o jogo toca um aviso sonoro e exibe a notificação "Your turn against [oponente].".',
        'Avisos sonoros de entrada de jogador no lobby e aceite de pedido de amizade agora tocam mesmo quando a aba do navegador está em segundo plano.',
        'A escuta em tempo real de salas públicas no globo agora fica ativa somente enquanto o jogador está no globo com a aba visível, reduzindo o consumo de rede em segundo plano.',
      ] },
    ],
  },
  {
    version: '1.6.3',
    date: '17/10/2026',
    title: 'Correção no Freeze do ChickenBot e layout de peças capturadas',
    groups: [
      { title: 'Interface e layout', items: [
        'O contador cinza de ovos do adversário foi reposicionado para o canto superior direito acima do tabuleiro, e as peças capturadas pelo jogador passaram para a linha abaixo do tabuleiro, alinhadas ao topo e à esquerda e se estendendo continuamente em direção ao contador de golden eggs.',
      ] },
      { title: 'Inteligência artificial', items: [
        'O ChickenBot não congela mais as próprias peças ao sortear o congelamento da casa de destino de jogadas de captura adversárias, priorizando a peça atacante.',
      ] },
    ],
  },
  {
    version: '1.6.2',
    date: '16/10/2026',
    title: 'Lobby desacoplado, convite a amigos e ajustes de perfil',
    groups: [
      { title: 'Interface e popups', items: [
        'Rooms, Friends e Profile agora fecham automaticamente ao clicar fora da janela flutuante.',
        'O ambiente de preparação de partida foi desacoplado e agora opera em um popup dedicado de Lobby, com título Lobby e acesso direto pelo novo botão Lobby no mapa ou em Return to lobby na lista de salas.',
        'No painel de Profile, o botão Logout foi reposicionado ao lado direito de Reset Save com a mesma identidade visual compacta.',
        'No painel de Profile, adicionado o botão RESET TIPS para reiniciar a contagem de tips visualizadas para 0, permitindo vê-las novamente desde o início nas partidas seguintes.',
        'No painel de Friends, cada amigo aceito agora exibe o botão Create game para criar imediatamente uma partida casual privada.',
        'A opção de remover amizade foi movida para um menu de três pontinhos no canto superior direito do cartão do amigo, que também inclui a nova opção Hide.',
        'Amigos ocultados podem ser restaurados informando seu Profile Code ou Email na busca de amigos, reexibindo o perfil sem gerar notificações duplicadas para o outro jogador.',
        'As partidas (campanha e online) passam a exibir tips sequenciais configuradas no Admin em um popup modal sobre o tabuleiro, uma por partida, até que todas tenham sido visualizadas.',
        'No Admin, adicionada a personalização do catálogo de Tips de abertura de partida (data/ui/match-tips.json), permitindo cadastrar e reordenar as dicas do jogo.',
        'A tela de abertura de partidas personalizadas (online e vs bot de lobby) exibe o título da cidade e o ano na mesma linha (TITULO ANO), seguidos da linha com os estilos musicais entre parênteses e, abaixo dela, a linha com o confronto entre os jogadores.',
        'A linha com os contadores de ovos e o indicador de turno ("Your turn" / "Your move") foi reposicionada para baixo do tabuleiro, logo acima das cartas de super-poderes.',
        'Adicionado o botão Create lobby no globo, posicionado abaixo da lista de Games in progress, com atalho direto para a criação de uma nova sala.',
        'Nos botões de Games in progress no globo, o ícone de entrar foi substituído por uma miniatura simplificada em tempo real do tabuleiro sob a perspectiva do jogador, com 3 px de padding para a borda do botão.',
        'Partidas em andamento com status Waiting for opponent agora recebem borda cinza no botão do globo.',
        'O título Games in progress no globo foi padronizado na mesma fonte e tipografia de Public rooms.',
        'A frase de abertura do globo agora exibe diretamente uma única opção sorteada aleatoriamente, sem piscar previamente a primeira frase do catálogo durante o carregamento.',
        'Nas telas de partida (campanha e online), o botão de voltar ao mapa foi movido para o canto superior esquerdo ao lado do ano da cidade, e seu ícone foi substituído pelo globo com grade segmentada de latitudes e longitudes.',
        'Ao ganhar golden eggs em uma jogada, os ovos agora flutuam cerca de 50 px acima da peça com ease-in-out, pausam por 0,7 s e depois voam em direção ao contador de ovos também com ease-in-out.',
        'Clicar em uma casa vazia do tabuleiro agora de-seleciona a peça selecionada, limpando a indicação de jogadas e os painéis de parâmetros.',
        'No mobile, clicar e arrastar a partir de casas vazias agora rola a tela verticalmente, permitindo scrollar a página através das casas desocupadas do tabuleiro.',
        'O cálculo dos limites de posicionamento dos popups no globo agora atualiza imediatamente no resize da tela, reancorando popups abertos e evitando que travem em posições ou limites antigos durante o arraste.',
        'Em telas widescreen e desktop, os popups do globo agora se movem livremente por toda a tela durante o arraste, sem agarre próximo à circunferência e contidos apenas pelas bordas da janela.',
        'Tentar capturar uma peça congelada agora exibe o aviso em formato de balão (toast), aplica uma leve trepidação na peça atacante e toca um efeito sonoro de recusa.',
        'Freeze e Shield agora só são armados ou verificam saldo ao confirmar o clique na soltura sobre a carta ou botão, cancelando a ação se o usuário arrastar a carta (assim como no Mulligan).',
        'Nos modos de partida (campanha e online), o botão de versão no canto inferior direito agora só é exibido quando o modo View code / Debug está ativado.',
        'Em mobile, o botão do globo (Home) foi posicionado na mesma linha dos botões de ação do cabeçalho, enquanto o título da cidade e os seletores de tom, escala e harmonia ocupam a linha imediatamente abaixo.',
        'O seletor Difficulty foi renomeado para Bot level e ampliado para 8 perfis divididos entre PureChess Bot (Easy, Medium, Hard, Expert e Jedi Pure Chess) e ChickenBot (Easy, Expert e Jedi ChickenBot).',
        'Os bots PureChess jogam apenas xadrez clássico (com Jedi Pure Chess escolhendo sempre a melhor jogada possível em 3 segundos) e ocultam o contador e as animações de golden eggs do bot.',
        'Os bots ChickenBot ganham e exibem animações de golden eggs em suas jogadas, usam Freeze e Shield conforme a barra de chance e a contagem de turnos (com 1 segundo de intervalo antes da jogada normal), sacodem o contador de ovos quando falta saldo para um poder e buscam jogadas Worst controladas para coletar 3 golden eggs.',
        'Adicionado o widget Bot control no modo Debug para ajustar os parâmetros do bot em tempo real durante a partida, incluindo o botão Salvar bot quando executado no modo Admin local para gravar no catálogo do jogo.',
        'A legenda de turno durante a vez adversária agora exibe "Bot thinking..." contra o bot e "Opponent thinking..." no modo multiplayer online.',
        'Adicionada a preferência "Chance position" no menu Preferências da partida com as opções "Board\'s side" (padrão) e "Footer": em Board\'s side, a barra de chance fica posicionada verticalmente no lado esquerdo do tabuleiro, com opacidade normal (100%), espessura de 2 px e distância de 8 px em relação ao tabuleiro, mantendo o histórico de lances no rodapé; em Footer, a barra volta à base da tela abaixo do histórico.',
        'As cartas e botões de Freeze e Shield agora usam touch-action manipulation (igual às demais cartas), permitindo arrastar e rolar a tela em mobile sobre qualquer uma delas.',
        'Easy ChickenBot passa a ser o bot padrão selecionado ao iniciar uma partida contra o computador.',
        'O bloqueio dos atalhos Best moves e Worst moves após o uso de super-poderes agora se aplica exclusivamente ao jogador que utilizou o poder, mantendo as opções disponíveis para o adversário.',
        'As cartas de super-poderes em cooldown ou indisponíveis agora são renderizadas em estilo totalmente preto e branco (monocromático).',
        'O Freeze executado pelo ChickenBot sorteia com 50% de probabilidade entre congelar a casa de origem da peça ou a casa de destino da jogada.',
        'O contador de golden eggs do adversário (online) e do Bot (contra IA) passa a ser renderizado na cor cinza, tanto na borda quanto no ícone de ovo metálico.',
        'No widget Bot control, foram removidas as bordas das linhas internas de parâmetros e da base do título, e o redimensionamento vertical foi destravado com alça de resize dedicada.',
        'No hover da carta e do botão de Mulligan, exibe os movimentos que seriam desfeitos criando cópias fantasma com 50% de transparência que retornam às casas anteriores com aceleração e desaceleração suaves (ease-in-out) na metade da velocidade normal, sem mover as peças reais do tabuleiro e sendo excluídas no mouse leave ou na execução do Mulligan.',
      ] },
    ],
  },
  {
    version: '1.6.1',
    date: '13/10/2026',
    title: 'Catálogo dinâmico de kits online e criação de salas',
    groups: [
      { title: 'Salas e partidas online', items: [
        'O seletor de kits nas salas online agora sincroniza dinamicamente com o banco de dados do servidor, disponibilizando todas as 60 cidades cadastradas.',
        'A tela de criação de sala agora inclui a seleção do kit da equipe, permitindo definir o kit inicial antes de abrir a sala pública ou privada.',
        'Corrigida a rejeição INVALID_KIT ao criar salas ou escolher kits das novas campanhas Brazilian e African Rhythms.',
      ] },
    ],
  },
  {
    version: '1.6.0',
    date: '12/10/2026',
    title: 'Campanha African Rhythms e novos kits musicais',
    groups: [
      { title: 'Kits musicais e campanha', items: [
        'Inaugurada a nova campanha African Rhythms com 12 estudos de ritmos populares africanos: Luanda 1982 (Kizomba), Luanda 1965 (Semba), Lagos 1975 (Afrobeat), Essaouira 1980 (Gnawa), Maputo 1978 (Marrabenta), Dakar 1985 (Mbalax), Luanda 1996 (Kuduro), Harare 1981 (Chimurenga), Kinshasa 1978 (Soukous), Lagos 1982 (Jùjú), Gaza 1987 (Majika) e Kisumu 1980 (Benga).',
        'Cada fase traz arranjos dedicados com 16 papéis instrumentais, 6 variações completas por voz, 6 seções compostas (A a F) com contrastes harmônicos autorais e instrumentos fiéis aos gêneros, como guembri, krakebs, mbira, sabar, congas, dikanza e talking drum.',
        'Adicionadas duas novas cidades à campanha Brazilian: Recife 1975 (Maracatu de baque virado) e Rio de Janeiro 1995 (Funk carioca).',
        'Recife 1975 traz o cortejo solene e sincopado do Maracatu de baque virado a 108 BPM em 4/4, com alfaias graves (marcador, meador e virador), clave de ferro do gonguê, rufos de tarol, caixa de guerra, xequerê, toadas de sax tenor, respostas de trompete e trombone e harmonia modal em D Mixolídio.',
        'Rio de Janeiro 1995 recria a era clássica dos bailes de galpão e paredões de som a 128 BPM em 4/4, com batidão sincopado estilo Volt Mix / Miami Bass, sub-bass retumbante de TR-808, caixas e palmas estaladas, cowbell sincopado, baixo synth ácido, stabs de metais, piano elétrico e clima nostálgico de Funk Melody em F Menor Natural.',
        'Fotografias históricas de reuniões comunitárias e celebrações culturais vinculadas a todas as novas fases, além de frases de abertura em inglês curtas e enigmáticas e botões de início limitados a 4 palavras.',
      ] },
    ],
  },
  {
    version: '1.5.0',
    date: '11/10/2026',
    title: 'Perfil, salas e bot de campanha',
    groups: [
      { title: 'Interface', items: [
        'Rooms, Friends, Profile e Room mostram abas e conteúdo em inglês; o endereço da conta aparece mascarado e pode ser revelado pelo ícone de olho.',
        'Profile code identifica o código público, Logout encerra a sessão e o progresso de campanha aparece como Campaign (Cities Conquered).',
        'Join by ID não tem borda superior; o X para sair fica dentro da aba Room sem cobrir o rótulo; Invite a friend fica sob a espera no lobby, com a confirmação de cópia logo abaixo e hover azul-escuro, e Refresh friends fica à esquerda com rotação lenta.',
        'A lista de kits do globo mostra o ano antes da cidade e usa a mesma fonte e o mesmo tamanho responsivo do título da partida; o estilo musical continua aparecendo no hover.',
        'Os títulos das campanhas usam a tipografia das cidades e o mesmo espaçamento de linha; há uma linha vazia antes de cada título, exceto o primeiro. A lista só centraliza um pin após 1 segundo de hover, ou imediatamente ao abrir seu popup. CAMPAIGN ganhou um ícone de montanha com bandeira.',
        'O som reverso acompanha os 0,5 s de abertura do popup; fechar usa um chimbau aberto gravado, mais suave e sem repetição.',
        'Public rooms e seus cartões usam a mesma tipografia responsiva das cidades da lista de campanhas.',
        'A lista de cidades mostra os rótulos em maiúsculas, com linhas mais próximas e áreas de hover/touch contínuas em desktop e mobile.',
        'Nos popups, o título mostra “cidade, ano” sem etiqueta separada; os botões de kits da mesma cidade exibem apenas o ano.',
        'O hover dos pins toca um bumbo de bateria gravado, com pequenas variações de afinação e intensidade que favorecem toques mais suaves.',
        'O botão X fecha somente com clique/toque simples; se o gesto virar arraste, o popup permanece aberto, e o botão e a conexão ao pin acompanham exatamente o ponto pressionado até a soltura. Enquanto pressionado, o popup oscila preso ao botão e o chimbau aberto termina em fade-out no pointer up.',
        'Arrastar o corpo do popup reduz a escala a 92%, ancorada no ponto pressionado, e o desloca sem rotação; ao soltar, retorna sem balanço. O fundo do seletor de épocas permite arrastar o popup.',
      ] },
      { title: 'Salas e campanha', items: [
        'Insert Bot pode ser usado com kit Random; ao iniciar a campanha, uma cidade é sorteada uma vez e o mesmo kit vale para jogador e bot. Se outra pessoa entrar antes, ocupa a vaga e o bot sai; a mensagem de espera some enquanto o bot estiver inserido ou a sala estiver cheia. Remove fica à esquerda do Ready para retirar o bot; seu estado mostra Choosing a kit e fica pronto em dois segundos. Ao confirmar I’m ready!, a campanha abre com o kit escolhido.',
        'Public e Private mostram cursor de clique quando habilitados.',
      ] },
    ],
  },
  {
    version: '1.4.0',
    date: '10/10/2026',
    title: 'Analytics, partidas e salas públicas',
    groups: [
      { title: 'Analytics', items: [
        'O site mede visualizações de páginas, início e conclusão das partidas, duração observada e uso de Freeze, Shield, Undo, Redo, Best e Worst, além de resultado, lances, Golden Eggs, cidade e kits, sem enviar lances individuais ou nomes/IDs de jogadores.',
      ] },
      { title: 'Salas e partidas online', items: [
        'Salas sem interação por 30 minutos são encerradas automaticamente, saem da lista do globo e liberam as vagas; partidas iniciadas continuam salvas.',
        'Tentar novamente em Games in progress mostra o carregamento e a mensagem retornada quando as partidas não podem ser consultadas.',
      ] },
      { title: 'Interface', items: [
        'Estou pronto! e Cancelar pronto têm a mesma largura e ficam alinhados à direita na janela da sala; Cancelar pronto mantém o fundo transparente.',
      ] },
    ],
  },
  {
    version: '1.2.1',
    date: '09/10/2026',
    title: 'Cartas, tabuleiro e partidas simultâneas',
    groups: [
      { title: 'Online', items: [
        'Você pode manter várias partidas em andamento e entrar em novas salas sem encerrar as anteriores.',
        'Games in progress aparece no globo acima das salas públicas, com acesso a cada partida e indicação de quem está na vez.',
        'Ao entrar no site, o globo permanece aberto. Voltar ao mapa durante a partida conserva o jogo; desistência e oferta de empate ficam nas ações do adversário.',
      ] },
      { title: 'Correções', items: [
        'O retorno do login Google informa o motivo mesmo quando o navegador separa a janela de autenticação da página do jogo, incluindo a orientação para entrar numa conta já existente.',
      ] },
      { title: 'Interface', items: [
        'Freeze ganha cristais azuis e Shield um escudo dourado; ao terminar, desaparecem rapidamente com um som curto. Tentar capturar uma peça congelada mostra um aviso.',
        'Mulligan retorna as peças mais devagar e gira a carta; a mão forma um arco, entra deslizando e deixa os números dos preços visíveis.',
        'O contador avisa sempre que faltam ovos para uma ação; Play/Pause ocupa a largura interna do Mixer com borda suave.',
        'Os super-poderes aparecem como cartas inclinadas e sobrepostas abaixo do tabuleiro; passar o cursor ou focar uma carta revela seu preço.',
        'Preferências permite alternar entre Modo cards e Modo botões e lembra a escolha neste navegador; abre sem bloquear o tabuleiro e pode ser reaberto normalmente.',
        'Play/Pause fica abaixo do Crossfader no Mixer; Redo aparece somente no Modo botões. Reiniciar jogo sai do cabeçalho da campanha.',
        'Mulligan e Undo passam a custar 2 ovos, na campanha e no online.',
        'O tabuleiro pode ser redimensionado pelos quatro cantos em tablet e desktop, na campanha, no online e no Criativo; mantém o formato quadrado e acompanha os widgets.',
        'Redimensionar o tabuleiro atualiza as linhas conectoras sem mover os widgets abertos; quatro símbolos nos cantos ficam mais discretos e 5 px mais afastados das quinas.',
        'Salas, Amigos e Perfil abrem centralizados no globo e continuam arrastáveis, com o mapa acessível ao redor.',
        'Arrastar Salas, Amigos ou Perfil move somente a janela; a rotação do globo acompanha melhor o deslocamento do dedo quando o zoom está reduzido.',
      ] },
      { title: 'Ovos', items: [
        'O vencedor leva os ovos restantes dos dois jogadores; no empate, a soma é dividida entre ambos. Se o total for ímpar, as pretas recebem o ovo restante.',
        'Na vitória ou no empate, os ovos saem dos contadores, sobem um pouco e fazem uma curva até a cesta da conta.',
        'A cesta mostra o número exato de ovos até dez; depois mantém dez mais um por centena no saldo, até vinte ovos visuais.',
      ] },
    ],
  },
  {
    version: '1.1.0',
    date: '08/10/2026',
    title: 'Salas, kits e manutenção Admin',
    groups: [
      { title: 'Admin', items: [
        'Contas administradoras ganham o botão Admin à direita de Creative no globo, com uma página própria para manutenção dos catálogos.',
        'O Admin local permite editar, validar e salvar frases de abertura, introduções, mensagens de jogadas, descrições, campanhas, títulos dos ranks e palavras dos nomes de batismo diretamente nos arquivos JSON do projeto.',
        'Os 45 perfis musicais e os três presets MIDI ficam acessíveis pelo painel, com atalho para o Criativo. A extração preserva os kits existentes.',
        'Rascunhos podem ser cancelados ou salvos antes de trocar de arquivo; conflitos com alterações externas são informados sem sobrescrever o arquivo. Os nomes de batismo preparam uma atualização para publicação no Supabase.',
      ] },
      { title: 'Online e mapa', items: [
        'Public e Private criam a sala diretamente. A entrada por ID aceita o código completo de 32 caracteres. Dentro da sala, apenas o criador vê os controles de visibilidade; participantes não veem Public/Private. O criador atualiza a listagem pública ao mudar a opção.',
        'Random passa a ser a primeira opção e o padrão do kit de cada equipe. O sorteio acontece quando os dois confirmam Começar e permanece o mesmo ao reconectar.',
        'Os popups das cidades oferecem CREATE ROOM: abre uma sala pública com o kit da cidade selecionado. Conquered aparece sobre a foto, no canto superior direito.',
        'Salas, Amigos e Perfil ficam sem título e descrição redundantes; o rodapé repetido do perfil sai e Sair da sala usa o desenho contornado de porta aberta e seta do ícone anexado.',
        'A aba Perfil reúne o conteúdo de Golden eggs, com edição do nick, código da conta, progresso e ações de perfil; o botão de ovos abre diretamente essa aba, e o link de login fica somente nela. Nome público vazio volta ao nome de batismo e oculta a linha secundária; o link de backup do perfil visitante fica na mesma linha de Reset Save.',
        'Salas e Amigos ficam no canto superior esquerdo, sem escurecer ou bloquear o mapa. O conteúdo longo rola no viewport da janela, inclusive no celular.',
        'Rooms, Friends e Creative ficam juntos no rodapé direito. O globo mostra as cinco salas públicas mais recentes, atualizadas ao vivo, com entrada animada e Ver todas quando houver mais salas; Atualizar salas gira durante a consulta.',
        'About e Release notes compartilham um popup com duas abas. About fica oculto no cabeçalho do celular em posição vertical; as duas abas continuam acessíveis pelo botão da versão.',
        'Public e Private são botões preenchidos na criação e transparentes dentro da sala, onde a opção ativa ganha destaque. No cartão da cidade, CAMPAIGN recebe um pin da cor local e CREATE ROOM fica abaixo dele, à direita, com ícone de porta, borda verde e synth verde/lilás mais grave. As salas públicas recentes mostram um ícone de entrada.',
        'A aba Release notes volta a rolar dentro do espaço disponível no popup compartilhado com About.',
        'O código curto da sala usa cinco algarismos; a sala aberta ganha uma aba Room XXXXX e o convite continua copiando o link completo em uma linha compacta.',
        'Instrumentos da banda fica sob o estilo do kit, sem contagem. Cancelar pronto desfaz explicitamente a confirmação enquanto a sala continua aberta; a confirmação do segundo participante inicia a partida.',
        'A janela de Salas/Amigos pode ser arrastada por áreas livres, sem interferir em botões, links ou campos. O login não repete o texto explicativo sobre recuperar o perfil.',
        'O lápis de edição do nome fica à direita do nome na mesma linha; no hover mantém fundo transparente, borda e brilho verdes, com ícone branco. O perfil mostra Baptismal name com dois-pontos e, logo abaixo, Código de perfil na mesma tipografia.',
        'O painel não muda o cursor durante o arraste; o seletor de visibilidade perdeu a linha explicativa e Join ganhou o ícone de entrada.',
        'Na prévia do kit, nome e estilo ficam centralizados ao lado da foto; os instrumentos expandidos ocupam toda a largura abaixo dela. O cartão pronto ganha fundo verde suave; Cancelar pronto fica transparente com borda verde. A prévia Random não repete rótulo ou explicação.',
        'Adicionar amigo destaca ícone e texto em branco com borda verde no hover, como os atalhos do globo.',
        'Sair da sala fica à esquerda da ação de prontidão, com texto branco sem fundo no hover; o ícone de atualizar busca o estado atual da sala no servidor. Status Pronto ganha um check verde fluorescente.',
        'As abas inativas da janela online ficam com texto branco e borda verde no hover ou foco.',
        'No cartão da sala, Adicionar amigo fica como ícone à esquerda do nome do participante, com borda verde e rótulo acessível.',
        'Estou pronto! mantém o tamanho e reduz pela metade o espaçamento lateral interno.',
        'Copiar convite aparece como link branco com ícone ao lado do código; Public e Private mantêm o cursor normal; dentro da sala, os controles só aparecem para o criador.',
        'No celular, Campanhas ocupa somente a largura do rótulo, com o padding preservado.',
        'Nos popups das cidades, a fotografia ocupa a largura toda e o padding começa nas informações abaixo dela.',
        'Abas inativas ficam sem fundo no hover, e a aba selecionada mantém seu fundo verde suave.',
        'A aba Amigos remove o status Lista ao vivo e esconde mensagens de vazio quando Amigos ou Pedidos recebidos não têm registros.',
        'Criar uma sala nova encerra a sala anterior do jogador e cria outra na mesma operação; uma partida ativa impede a troca.',
        'Qualquer parte da foto ou do título/estilo do kit abre ou recolhe os instrumentos; o seletor perde o rótulo visível e o ícone de amizade ganha borda verde.',
        'Voltar à sua sala fica abaixo de Criar sala com a mesma altura e metade do espaçamento; destaca texto e borda verdes no hover.',

      ] },
      { title: 'Abertura e partida', items: [
        'A frase de abertura é sorteada entre três opções em inglês, incluindo The history of music, through a game of chess. e Making bad moves isn’t so bad.',
        'Best e Worst bloqueiam somente o próprio botão enquanto suas sugestões estão visíveis; o outro pode substituí-las na campanha e no online.',
        'Aplicar Freeze ou Shield limpa o destaque da última jogada. Após cada novo lance, o destaque espera 2 segundos e esmaece até a metade em 0,5 segundo.',
      ] },
      { title: 'Poderes', items: [
        'Tentar arrastar uma peça congelada para fora de sua casa provoca uma breve tremida e um som de gelo, mantendo a peça imóvel e sem tocar seu instrumento.',
        'Shield mantém o fundo normal da casa e mostra somente o escudo; a textura de gelo fica exclusiva do Freeze.',
      ] },
    ],
  },
  {
    version: '1.0.1',
    date: '05/10/2026',
    title: 'Salas, avisos e interface mobile',
    groups: [
      { title: 'Correções', items: [
        'O perfil de Golden eggs e a dica inicial da campanha voltam a abrir sem interromper o jogo. O perfil também recebe uma descrição para leitores de tela.',
      ] },
      { title: 'Online', items: [
        'Quando alguém entra na sua sala, um aviso temporário mostra o nome da pessoa, acompanhado do som e realce da sala. O aceite de um pedido de amizade também aparece como aviso na tela.',
        'Salas, Amigos e Perfil se adaptam ao celular, com rolagem da tela do modal e sem barras internas no cartão ou nas listas.',
        'Entrar em outra sala libera automaticamente sua vaga anterior. Se o destino estiver cheio ou indisponível, você permanece na sala atual. Erros aparecem acima do botão de entrada; convites preservam seus dados ao carregar a sessão.',
        'O convidado acompanha os kits e a prontidão ao entrar; quando os dois confirmam Começar, ambos seguem para a mesma partida, sem precisar recarregar.',
        'A partida online usa a mesma abertura de cidade, cabeçalho, posição dos controles, widgets arrastáveis no desktop, coluna no celular, conexões e rodapé com histórico e avaliação da campanha. Os dois jogadores veem o tema escolhido pelo criador da sala.',
        'Tom, escala e harmonia podem ser alterados por qualquer jogador e são compartilhados e recuperados ao reconectar; o Mixer continua local.',
        'Lances válidos online permanecem no destino com a peça translúcida enquanto aguardam confirmação, sem voltar à origem. A confirmação normaliza a peça; uma recusa restaura a posição confirmada e mostra o erro.',
      ] },
    ],
  },
  {
    version: '1.0.0',
    date: '04/10/2026',
    title: 'ChickenChess 1v1 casual online',
    groups: [
      { title: 'Contas e amigos', items: [
        'O globo oferece login com Google ou código por email, preservando o perfil visitante ao vincular uma conta. Visitantes encontram “Sign in to save your profile” no popup de ovos.',
        'Se o Google já pertence a uma conta ChickenChess, o login identifica a conta existente e orienta a entrar novamente para escolher qual progresso conservar, sem descartar o perfil visitante. Falhas na confirmação do login mostram a causa recebida em vez de um aviso genérico.',
        'O popup de Golden eggs mostra o email da conta conectada e o botão Sair da conta; o logout também continua disponível na aba Perfil do online.',
        'O perfil tem nome e código público; amizades começam com um pedido e exigem aceite. Há listas de amigos e pedidos enviados/recebidos.',
        'Novos perfis recebem um nome de batismo permanente, sorteado entre 304 títulos, adjetivos e termos divertidos de galinhas, xadrez, música e outras invenções. O nome público continua editável e pode ser importado do Google; perfis existentes mantêm seus nomes.',
        'Privacy Policy e Terms of Service têm páginas públicas em inglês, com links no About e no login que preservam a tela atual ao abrir outra aba.',
        'A abertura do site deixa de exibir a apresentação textual antes do globo; a espera inicial fica sem conteúdo redundante.',
      ] },
      { title: 'Salas e partida online', items: [
        '1v1 casual online abre a lista de salas públicas, entrada por ID e criação de sala pública ou privada, com link de convite.',
        'Os botões 1v1 casual online e Amigos ganham borda e brilho verdes com texto branco no hover, como o Modo Criativo.',
        'Cada pessoa escolhe seu kit e confirma Começar. A chegada de outra pessoa avisa com som e realce; a partida começa quando ambas confirmam.',
        'As duas equipes usam poderes na própria vez e pagam os mesmos custos. Best/Worst mostram as mesmas sugestões aos dois jogadores; Undo volta até a vez de quem usou e Redo restaura sua continuação.',
        'Best e Worst podem ser usados por qualquer jogador durante a vez de qualquer equipe. Enquanto as sugestões ficam visíveis por três segundos, ambos os botões aguardam para evitar novos pedidos e gastos; Freeze e Shield continuam exclusivos da própria vez.',
        'A equipe local fica embaixo. O adversário tem popup de perfil, conexão, Adicionar amigo e preferência individual de parâmetros musicais.',
        'A composição reúne as peças dos dois kits sobre uma forma comum. Os parâmetros adversários ficam bloqueados quando a sincronização está ligada; Mixer, Solo, audição e arraste são locais.',
        'Play/Pause controla somente a música, retomada pelo próximo lance. O globo oferece desistência e empate; o resultado permite convidar para outra partida.',
        'Ações confirmadas podem ser recuperadas após reconexão sem repetir custos ou recompensas. Salas e login exigem a configuração do projeto Supabase.',
        'A conexão aguarda o recebimento das atualizações ficar pronto. Ações simultâneas devolvem conflitos sem travar, e uma confirmação pendente mantém Retry disponível após reconexão ou recarga.',
      ] },
      { title: 'Poderes da partida', items: [
        'Freeze cancela a tentativa que deixaria o adversário sem jogadas legais, sem gastar ovos, e avisa “Você não pode deixar seu oponente sem jogadas.”. A proteção vale na campanha e para as duas equipes online.',
        'A avaliação com poderes carrega seu Worker JavaScript na versão publicada, mantendo a busca fora da interface na campanha e no online.',
      ] },
    ],
  },
  {
    "version": "0.14.3",
    "date": "03/10/2026",
    "title": "Widgets e controles da partida",
    "groups": [
      {
        "title": "Partida",
        "items": [
          "O retorno ao mapa fica depois de Maximizar, no extremo direito do cabeçalho; seu globo mantém apenas a circunferência e os pontos coloridos.",
          "O controle de dificuldade do cabeçalho identifica-se como Dificuldade do Bot e conserva a cor da cidade no foco e no clique; o botão do mapa segue a mesma cor.",
          "O Mixer termina cerca de 20 px abaixo do crossfader, sem o espaço livre que ocupava antes.",
          "Tom, Escala e Harmonia passam do Mixer para o lado do nome da cidade; o cabeçalho quebra linha no celular e permanece acessível sobre os widgets.",
          "Best e Worst ficam indisponíveis enquanto Freeze ou Shield estiver ativo no tabuleiro e voltam após o fim dos poderes.",
          "Congelar uma peça que dá cheque e mover outra peça, ou usar Shield no rei, não interrompe mais a partida com erro; a música acompanha os poderes, o descongelamento e Undo/Redo.",
          "As casas da última jogada deixam aparecer mais a imagem de fundo e recebem um lilás mais discreto; peças e marcadores mantêm as cores normais.",
          "Freeze aplica textura gelada às peças afetadas, e o ícone Shield fica sem a marca de seleção.",
          "Os ícones de Freeze e Shield acompanham o ponteiro 10 px acima e à esquerda. A textura de gelo varia sua rotação entre as casas, mantendo o mesmo desenho na prévia e no efeito aplicado.",
          "A avaliação de jogadas após aplicar Freeze ou Shield roda em segundo plano, evitando que a busca trave a interface e atrapalhe o agendamento da música.",
          "No modo de escolher uma casa para Freeze ou Shield, o cursor permanece como mão aberta durante o percurso. Peças congeladas ficam fixas na casa, sem iniciar arraste.",
          "Peças com Shield não podem capturar nem ser capturadas por qualquer equipe, inclusive por en passant; tentativas do jogador mostram o aviso da peça protegida ou o popup de proteção do alvo.",
          "Freeze e Shield podem ser levados do botão até uma casa por arraste ou escolhidos por clique; clicar fora do tabuleiro no modo de escolha ou soltar o arraste fora cancela sem gastar ovos. Freeze mostra gelo na prévia; Shield mostra um escudo sobre a peça. As casas tocam gelo craquelando ou metal, e Freeze deixa um rastro que descongela em 2 segundos.",
          "Freeze e Shield usam cursor de pegar; Best e Worst usam cursor de clique. As dicas descrevem congelar/proteger por uma rodada e ver as três melhores/piores jogadas.",
          "O novo widget Piece Debug mostra a fonte sonora e as configurações adicionais da peça selecionada, abaixo de Piece Params; o botão Piece debug no Debug abre ou fecha esse painel.",
          "Quando nenhuma peça está selecionada, Piece Params mostra “No piece selected” no cabeçalho.",
          "O título do Piece Debug fica centralizado no cabeçalho. Seu único conector aponta para o alvo mais próximo: a peça selecionada ou Piece Params.",
          "Em Piece Params, o valor acompanha o arraste e é aplicado ao áudio uma vez ao soltar; o marcador cinza sinaliza esse modo.",
          "O botão S ao lado do loop em Piece Params isola uma ou mais peças; ao desligar o último Solo, retornam as vozes que já tocavam e continuam vivas.",
          "O botão de variações em Piece Params mostra M e continua controlando apenas o loop automático da peça.",
          "Worst ocupa o espaço que era de Freeze, Freeze vai para o de Shield e Shield para o de Worst; os sons de hover continuam ligados às posições.",
          "Sair de Worst ou Freeze pelo mouse toca chimbal fechado com volume 40% menor que no hover.",
          "O pitch do som de Freeze varia um pouco mais ao passar entre casas durante o arraste.",
          "Shield protege o próprio rei e bloqueia a entrada adversária pelas mesmas regras para brancas e pretas, conforme a equipe que aplicou o poder.",
          "Os knobs acompanham o ângulo do toque ou ponteiro; valores únicos ficam centralizados no dial e os dois limites de range aparecem empilhados no centro.",
          "Piece Params redimensiona verticalmente entre as abas de variação e 90% da tela; a atualização visual do MIDI pausa quando ele fica totalmente oculto. Piece Debug só é montado quando aberto.",
          "O realce lilás da última jogada mantém a intensidade atual por 1 segundo e depois cai suavemente à metade em 2 segundos.",
          "Os símbolos ✓/× atrás da peça recomendada por Best/Worst ficam ocultos no modo Chicken Chess e continuam disponíveis como opção para outros modos.",
          "O título da fase usa Bitcount Prop Single, mostra ano e nome em maiúsculas na cor da fase e fica sem fundo.",
          "Desligar música fecha Mixer, Spectrogram, Piece Params e Piece Debug e esconde todas as linhas de conexão; religar restaura o estado e a ordem desses widgets.",
          "Piece Params conecta-se à peça selecionada; Piece Debug liga-se somente ao destino mais próximo entre ela e Piece Params.",
          "O histórico de jogadas fica transparente. O controle de versão passa para o canto inferior direito, sobrepondo o histórico e a barra de avaliação com recuos iguais das bordas."
        ]
      },
      {
        "title": "Criativo e Mixer",
        "items": [
          "Nos ranges de oitava, Drive, Reverb, Swing e passa-baixas, desmarcar L/S/N deixa um valor fixo; ao selecionar L/S/N, os limites começam a 25% do curso acima e abaixo do valor atual. N vem selecionado por padrão.",
          "Arrastar a metade esquerda do range controla o limite menor e a metade direita controla o maior; os cursores também podem ser arrastados diretamente. No hover, só o cursor correspondente à metade fica branco.",
          "A borda do dial de range fica branca enquanto ele é arrastado.",
          "Os marcadores usam a cor da cidade e ficam brancos no hover. No arraste, Piece Params mostra o marcador cinza; Criativo e Mixer continuam com atualização imediata e marcador na cor da cidade.",
          "No Criativo, vários botões Solo podem ficar ligados juntos; as vozes que tocavam antes do primeiro Solo retornam quando o último é desligado.",
          "Os botões L/S/N dos ranges usam os nomes acessíveis e tooltips “Shuffle value every LOOP”, “Shuffle value every SESSION” e “Shuffle value every NOTE”."
        ]
      },
      {
        "title": "Entrada da partida",
        "items": [
          "O tabuleiro fica parado enquanto suas casas surgem uma a uma em ordem aleatória; os widgets chegam voando pelas laterais e param perto do tabuleiro.",
          "Depois de arrastar um widget, sua posição não muda sozinha; o cálculo automático só roda na montagem e ao redimensionar a janela."
        ]
      }
    ]
  },
  {
    "version": "0.11.0",
    "date": "02/10/2026",
    "title": "MIDI explícito, arranjo global e ranges por loop, seção e nota",
    "groups": [
      {
        "title": "Música",
        "items": [
          "Os knobs Range de oitava, Drive, Reverb e Swing oferecem três bolinhas L/S/N no Criativo e em Piece Params: sorteio por loop, seção ou ataque.",
          "Notas simultâneas de acordes compartilham o sorteio; Swing por ataque conserva sua ordem e kits anteriores mantêm a frequência original, com indicação de oitava por compasso quando legada.",
          "A ajuda de Pan esclarece que o knob conserva o ajuste adicional salvo, enquanto a coluna da peça muda a posição estéreo do áudio conforme a abertura do tabuleiro.",
          "O knob Chance de tocar controla a frequência dos eventos de cada voz no Criativo e em Piece Params; kits antigos começam em 100%, e o ajuste da partida não é salvo no kit da cidade.",
          "Todos os kits e estudos usam notas explícitas no editor MIDI; os painéis Receitas e código Strudel, Forma e variações e Groove compartilhado, e o modo Padrão Strudel, foram retirados.",
          "Ritmos, acentos e slides foram incorporados às notas; automações foram simplificadas em parâmetros e ranges, incluindo um novo Range L/S/N no passa-baixas.",
          "A primeira etapa MIDI desta entrega reiniciou uma vez os rascunhos e kits personalizados antigos, sem alterar conquistas, ovos ou pontos; a migração seguinte para o arranjo global preserva os kits MIDI já salvos.",
          "O Criativo oferece Arranjo global para nomear, ordenar, adicionar/remover e definir a duração das seções; cada peça escolhe seu banco MIDI, presença, transposição e reinício nesse mesmo relógio.",
          "Cada seção pode definir um percurso harmônico por compasso, independente da duração do loop; o relógio mostra seus nomes personalizados e as pausas das peças.",
          "Fixar uma variação ou forçá-la por regra troca somente o banco MIDI: as pausas, transposições e o reinício de cada seção continuam valendo. Reordenar seções conserva as escolhas de todas as peças.",
          "Ao abrir o Criativo, o painel Arranjo global mantém seu rótulo acessível sem gerar divergência de hidratação no React.",
          "No Arranjo global, clique marca a próxima seção para entrar ao fim da atual, arraste reordena e duplo clique abre a edição. Excluir uma seção preserva os bancos MIDI das peças.",
          "O progresso aparece dentro da seção tocando; os limites deixam de ocupar uma linha e são informados quando uma edição tenta ultrapassá-los.",
          "Kit Harmony usa os graus das seções. Outros planos desabilitam sua edição sem apagá-los; voltar a Kit Harmony recupera o percurso salvo. Kits com harmonia própria selecionam essa opção automaticamente.",
          "Adicionar seção virou um + no final da faixa. O popup reúne só os campos, com ajuda no nome, lixeira à esquerda e Cancelar/Salvar à direita; a linha repetida de execução foi retirada.",
          "No Criativo, os controles mostram Volume e BPM sem ajuda extra, e a faixa das seções fica integrada à base do painel de transporte.",
          "Na partida, histórico e barra de avaliação ocupam o rodapé em largura total; o Mixer ganhou 20 px livres abaixo do crossfader."
        ]
      }
    ]
  },
  {
    "version": "0.9.0",
    "date": "01/10/2026",
    "title": "Freeze, Shield e novos arranjos musicais",
    "groups": [
      {
        "title": "Música",
        "items": [
          "Os 46 kits de cidades agora têm seis cenas A–F, com pontes mais espaçadas, respostas e retornos; E e F dos kits de piano roll também mudam os acordes a cada compasso.",
          "Três bancos novos oferecem piano, sax, marimba, guitarras, violão de nylon, baixo e percussão gravados, com dinâmicas e tomadas alternativas; os bancos anteriores continuam disponíveis para kits salvos.",
          "Drive, Reverb e Swing ganharam knobs Range no Criativo e em Piece Params: um valor por repetição completa da variação, inclusive quando ela volta na música; limites iguais deixam o parâmetro fixo.",
          "Samples com sustenidos nos nomes agora carregam corretamente; os novos mapas de sax, marimba e baixo respeitam a oitava real das gravações.",
          "A música aguarda a preparação do Drive quando necessário; Drive zero deixa o som seco, sem erro de processador na primeira reprodução.",
          "Abrir o Criativo não gera mais o aviso de renderização dos indicadores dos knobs, sem alterar os valores dos instrumentos.",
          "Variações no Criativo e na partida usam uma grade por vez, com abas que quebram linha sem scroll e botões +/− para criar/remover bancos; subdivisão, reverse, sorteio de notas e duração ficam abaixo do MIDI.",
          "Note params reúne quatro knobs 30% menores: Slide e Tempo dentro do box da curva, Acento e Pan à direita, antes da lixeira, tanto no Criativo quanto na partida.",
          "O Criativo mostra a harmonia atual entre parênteses no rótulo do seletor e usa espaços entre as notas; o painel duplicado Relógio e transições foi removido, reunindo BPM, unidade do pulso, rampa e regras pendentes no transporte.",
          "Volume geral e BPM viraram knobs na linha superior do Criativo; a curva de BPM fica na linha inferior à esquerda, sem aviso quando não há rampa. Tempo do slide também usa knob.",
          "A ajuda de Comportamento detalha Pulso, Frase e Sustentado, suas diferenças na harmonia e a relação com fonte, parâmetros e gesto manual.",
          "Knobs de Volume, BPM e Range seguem a paleta verde do Criativo; as ajudas dos parâmetros ficam acima dos rótulos e explicam a unidade do BPM, Avançar meio-lance e a multiplicação dos dois ganhos.",
          "Notas avulsas de clique/arraste não iniciam nem recompilam os loops ou alteram o relógio; a partida antecipa os samples, o MIDI desenha notas explícitas sem preparar a música inteira e seu cursor não simula um loop desligado. A ajuda do filtro esclarece a audição manual.",
          "Kits antigos são preservados em Meus kits antes de atualizar a instrumentação e as seções da cidade."
        ]
      },
      {
        "title": "Partida",
        "items": [
          "Best, Freeze, Undo/Play/Redo, Shield e Worst compartilham a linha abaixo do tabuleiro, nessa ordem; o status passa para a faixa superior com os ovos, e Tom/Escala/Progressão ficam no Mixer, abaixo do crossfader. Mutar a música também apaga a iluminação musical do tabuleiro.",
          "As casas da última jogada ficam no negativo da cor do tabuleiro; Pause mantém apenas o som de hover, Play toca somente bumbo com o volume original, e Voltar jogada toca caixa no clique.",
          "Undo, Play/Pause e Redo ficam 20% menores; os hovers de Undo/Redo caem mais 20%, os de Play/Pause 15% e Freeze 15%. Sair de Best pelo mouse toca um chimbal aberto um pouco mais curto que o de Worst.",
          "No celular vertical, as conexões entre widgets e tabuleiro ficam ocultas, e deslizar sobre widgets desligados permite rolar a página. Celulares compatíveis vibram brevemente quando a IA joga.",
          "Debug inclui temporariamente Get eggs: a cada dez cliques, acrescenta dez ovos ao saldo da partida para facilitar os testes.",
          "As últimas sugestões Best/Worst vistas continuam rendendo ovos e a mensagem correspondente mesmo quando o Stockfish muda o ranking; novas opções do ranking atual também podem premiar sem terem aparecido nas setas.",
          "Best moves com score abaixo de −1 peão mostram a primeira frase em laranja, com uma nova lista de incentivo para boas escolhas em posições difíceis.",
          "Pause também congela a espera para a IA jogar, incluindo os 5 segundos após avançar o histórico; Play retoma o tempo restante somente na mesma posição.",
          "No celular, Piece Params, Mixer, Spectrogram e Debug ficam numa coluna abaixo do tabuleiro, com a mesma largura e rolagem conjunta; o botão Parâmetros musicais e seu diálogo foram retirados.",
          "No desktop, os widgets começam centralizados nas laterais com uma pequena variação horizontal; acompanham o resize até a distância mínima de 20 px do tabuleiro, podendo ficar parcialmente fora da tela.",
          "Dois cliques no pegador do crossfader centralizam a mistura dos times.",
          "BLACKS e WHITES ficam acima das colunas de knobs do Mixer; o centro da faixa de mistura passa a mostrar CROSSFADER.",
          "A vitória mostra uma cesta ilustrada com ovos chegando e som de queda, saldo atualizado, pontos e um botão Return to map maior. Os ovos restantes vão para a cesta; os coletados durante a partida também rendem um bônus de pontos históricos, mesmo quando foram gastos.",
          "Os knobs dos dois times no Mixer compartilham uma coluna central de rótulos, inclusive quando o painel fica estreito.",
          "A linha de seletores musicais e ovos e a faixa de peças capturadas mantêm a largura do tabuleiro em telas menores.",
          "O Mixer agora abre no tamanho compacto de 180 × 430 px, mantendo os rótulos entre as duas colunas de knobs.",
          "Peças congeladas não podem ser capturadas nem ameaçam o rei enquanto o gelo durar; o rei do jogador com Shield pode ocupar uma casa normalmente atacada.",
          "Durante os poderes, Best e Worst comparam os lances e respostas permitidos pelas novas regras; a adversária também respeita essas respostas. Sem poderes ativos, a análise continua com Stockfish.",
          "Undo e Redo restauram Freeze e Shield conforme a posição de cada meia-jogada, sem cobrar os poderes outra vez; uma nova continuação descarta a antiga.",
          "Freeze e Shield agora avisam sobre ovos insuficientes já no botão e mostram seu ícone junto ao cursor enquanto uma casa é escolhida; o gasto só acontece na aplicação.",
          "Os preços dos controles pagos aparecem acima da borda direita, com um pequeno ovo dourado no lugar da palavra egg.",
          "Spectrogram inicia com a largura do Mixer e sua altura mínima, podendo ser estreitado até a mesma largura mínima do Mixer.",
          "O preço de Freeze e Shield aparece imediatamente no hover ou foco; o botão de energia das variações voltou ao canto superior direito de Piece Params.",
          "Tom, Escala e Progressão mostram só a borda no hover; as opções selecionadas nos menus ficam brancas sem bolinha nem espaço reservado, e a barra de rolagem usa o fundo do menu.",
          "Debug começa com a mesma largura do Mixer e a menor altura permitida; Spectrogram inicia na coluna esquerda, abaixo do Mixer e acima do Debug.",
          "O menu de dificuldade mostra apenas Dificulty:, deixa a opção ativa em preto sobre a cor da cidade e escurece o hover das demais opções; os preços usam marcador branco -1 ou -3 em vermelho escuro, sem atraso, e o cabeçalho reúne View code / Debug, Restart game, música e tela cheia nessa ordem, com legendas no hover; Debug oferece Debug SF e Force win, e Restart game pede confirmação."
        ]
      }
    ]
  },
  {
    "version": "0.8.1",
    "date": "30/09/2026",
    "title": "Controles da partida, crossfader e ovos",
    "groups": [
      {
        "title": "Partida",
        "items": [
          "Mixer, Debug, Piece Params e Spectrogram ganharam posições padrão mais equilibradas ao redor do tabuleiro, com pequenas variações aleatórias ao iniciar cada partida.",
          "O botão Code também controla a disponibilidade do widget Debug: ambos começam desligados, e ocultar o código fecha Debug e sua sobreposição do Stockfish.",
          "Histórico de jogadas e avaliação ficam acima de Tom, Escala e Progressão; o status da vez aparece abaixo do tabuleiro, entre Freeze e Shield e antes de Best/Worst moves.",
          "Os knobs do Mixer agora formam pilhas verticais com rótulos laterais; o widget pode ser redimensionado.",
          "Cada modo escolhe se Mixer e Piece Params acompanham a vez; nas campanhas atuais contra IA, ambos ficam ativos durante todos os turnos, e os botões manuais continuam disponíveis.",
          "Na vez do jogador, o loop e os parâmetros de peças pretas também podem ser editados; o status da vez adversária diz “Thinking...”.",
          "No mapa, o texto “golden eggs” recolhe após cinco segundos e volta com animação reversa no hover ou foco; há 6 px entre o saldo e o rótulo.",
          "No mapa, o saldo global de ovos fica à direita do botão Maximizar; na partida, os saldos dos dois lados ladeiam Tom, Escala e Progressão.",
          "O preço dos controles pagos fica encostado ao canto do botão e some sem animação ao sair do hover; após 1,5 s também desaparece em toque.",
          "Mixer e Debug podem ficar mais estreitos; o Mixer recolhe os rótulos dos knobs em larguras compactas e mantém todos os controles visíveis sem rolagem interna.",
          "Na entrada da partida, o brilho do nome da cidade apaga primeiro e o texto desaparece em seguida ao longo de 1 s.",
          "Ao tentar usar um recurso sem ovos, um som curto e o balanço do ícone avisam que a ação foi bloqueada.",
          "O botão de energia das variações agora tem o mesmo tamanho dos demais botões da fileira, com ícone reduzido.",
          "No mapa, cartões de cidade podem ficar até 80% fora da tela após a abertura, mantendo pelo menos 20% visíveis; ao abrir, entram totalmente visíveis na horizontal. O globo retoma o giro ao sair de um pin.",
          "O Mixer ganhou um crossfader graduado com pegador vertical mais alto e trilho mais curto, que encaixa no zero; BLACKS e WHITES ficam alinhados às marcas das extremidades, com 35% de branco nos ticks. O traço central do pegador fica com 25% de opacidade. O indicador dos knobs usa a cor da cidade no hover e fica branco durante o arraste. Gain fica no fim dos grupos, LPF/HPF no começo e os títulos centrais ocultos.",
          "Cada lado começa a partida com 1 ovo; as recompensas de lance aumentam o saldo do jogador, e ações pagas o consomem. Ao vencer, ele recebe no saldo global os ovos que restaram na partida. O contador do Stockfish fica à esquerda dos seletores musicais, em cinza apagado.",
          "A barra de avaliação transita diretamente entre posições; Undo anima as peças de volta em 40% menos tempo que o avanço.",
          "Mixer, seletores de tom/escala/progressão e Piece Params acompanham os valores musicais resolvidos pelas regras ativas, incluindo o BPM durante rampas.",
          "Os botões de energia dos widgets ficam acessíveis acima do tabuleiro, mesmo quando o painel está atrás dele; ligar traz o painel à frente. Nos modos que acompanham o turno, Mixer e Piece Params também podem ser reabertos manualmente durante a vez do Stockfish até a próxima mudança de turno.",
          "O botão de energia das variações acompanha o tamanho e o raio das abas. Os valores transitórios de ganho, filtro, pan, reverb e delay agora piscam como traços cinza nos knobs correspondentes.",
          "Os botões de energia dos widgets também servem para arrastá-los e, desligados, mostram fundo com 50% de opacidade.",
          "Freeze e Shield ficam ao lado do estado da jogada: escolha qualquer peça ou casa vazia por 3 ovos. Gelo impede a próxima jogada da peça ou congela quem entrar na casa; Shield impede a resposta do Stockfish de ocupar a casa protegida.",
          "Ao refazer uma meia-jogada que deixa a vez com o Stockfish, a IA responde após 5 segundos mesmo que ainda existam lances na pilha de Redo; continuar navegando cancela essa contagem, e uma nova resposta da IA descarta a continuação antiga."
        ]
      },
      {
        "title": "Música",
        "items": [
          "O Criativo e Piece Params ganharam o knob Range: escolha dois valores de oitava em qualquer ordem, com o intervalo destacado pela cor da cidade; uma oitava é sorteada por compasso."
        ]
      }
    ]
  },
  {
    "version": "0.7.0",
    "date": "29/09/2026",
    "title": "Análise e controles da partida",
    "groups": [
      {
        "title": "Partida",
        "items": [
          "O Debug stockfish mostra acima das linhas ao vivo os mesmos valores da última profundidade completa usados nas setas de Best/Worst moves, deixando clara a diferença entre as duas leituras.",
          "No desktop, a análise das melhores e piores jogadas busca até a profundidade 15, com limite de 30 segundos. Enquanto as setas estão abertas, número e cor da etiqueta acompanham cada novo ranking completo; scores negativos até −1,00 ficam laranja e abaixo disso ficam vermelhos.",
          "Os ovos de um lance Best com score inferior a −1,00 ou mate contra o jogador seguem a classificação Worst indicada pela etiqueta vermelha, usando a avaliação do próprio lance.",
          "A adversária joga entre 1 e 5 segundos após o lance do jogador, mesmo enquanto o ranking longo continua; sua busca curta tem prioridade.",
          "As casas da última jogada ficam 50% mais escuras. Lances Best/Worst podem render ovos já com um ranking completo provisório, que voam da casa jogada até o saldo. O preço dos botões fica no canto superior direito, e a frase do lance some quando o total de ovos começa a desaparecer.",
          "Piece Params ganhou Swing adicional ao ritmo do kit, Slide de afinação e Tempo do slide. Os dois controles de slide aparecem desabilitados em samples não afinados.",
          "Em desktop, os painéis de áudio ficam alinhados em torno do tabuleiro; o status da jogada sobe para antes das peças capturadas, e a energia do loop passa para a linha das abas de variação."
        ]
      }
    ]
  },
  {
    "version": "0.6.0",
    "date": "28/09/2026",
    "title": "Partida, controles e recompensas",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "O grid do globo ficou mais denso no equador, mais espaçado perto dos polos e escurece seus pontos no lado sem sol; bandeiras conquistadas se movem três vezes mais devagar.",
          "Durante a entrada, o logo e o slogan diminuem acompanhando a escala aparente do globo.",
          "O botão do perfil agora mostra um ovo dourado no lugar do ícone de galinha."
        ]
      },
      {
        "title": "Partida e progresso",
        "items": [
          "No primeiro lance, Mixer e Piece Params se abrem automaticamente; Board Params aparece no motor antigo. No celular, o painel de parâmetros também aparece.",
          "O preço dos botões aparece no canto inferior direito; peças só brilham enquanto o loop está ativo ou durante o toque, e ovos gastos giram sempre no sentido anti-horário.",
          "Best moves custa 1 ovo; preços usam 'egg' no singular e aparecem após 0,3 s de hover/foco. O som de hover de Undo e Redo ficou 33% mais baixo.",
          "Redo agora é gratuito e os preços da fileira exibem espaço entre '$' e o valor.",
          "Undo após checkmate retoma automaticamente o som e os painéis da partida.",
          "Botões liga/desliga mostram drop-shadow azul no hover somente quando o widget está desligado.",
          "O Debug recorta apenas o conteúdo interno e mostra uma barra de rolagem fina, translúcida e mais clara no hover.",
          "Os knobs de Piece Params mostram a cor da cidade na borda durante o hover, como no Mixer.",
          "O botão de voltar ao mapa fica disponível durante as telas de introdução da partida.",
          "As pontas das setas de Best/Worst moves ficaram 33% menores e os traços usam 70% de opacidade; a primeira frase some instantaneamente após 1,9 s e inicia o fade-out do bônus.",
          "O clique Play/Pause ganhou uma caixa mais natural, 20% mais baixa em média e com variação por toque.",
          "Ovos gastos agora voam com ease-in e giro aleatório; Worst moves custa 1 ovo e os preços dos botões usam '$' em vez de sinal de menos.",
          "Reset Save retorna o saldo inicial e libera novamente a dica única da partida.",
          "Uma dica aparece uma única vez; Best moves, Undo e Redo passam a custar 1 ovo dourado cada.",
          "O Rank fica abaixo do Historical score e a barra de rolagem do popup não aparece durante a entrada na partida.",
          "Uma das três melhores jogadas rende 1 ovo dourado; uma das três piores rende 3, quando o ranking da posição estiver completo.",
          "A casa mostra um check verde ou X vermelho; ovos bônus saem do botão Best moves ou Worst moves correspondente e voam até o contador. A primeira ocorrência de cada tipo recebe um aviso.",
          "Pausar ou terminar a partida desliga Board Params e Mixer; retomar religa os dois painéis.",
          "O preenchimento branco do termômetro de avaliação fica com 25% de opacidade quando a reprodução iniciada está pausada ou a partida terminou, sem transição de opacidade.",
          "O preço fica sobreposto no canto inferior direito sem alterar a altura do botão; o nome e os ícones de Undo/Redo permanecem centralizados verticalmente; após uma ação válida, o preço cresce 30% e desaparece com fade.",
          "A faixa preenchida dos sliders de Volume e BPM fica 50% mais transparente quando o Mixer está desligado.",
          "O container da fileira de peças capturadas recebe escala proporcional para caber na largura disponível quando necessário.",
          "Tom e Escala ficam lado a lado à esquerda no Mixer, com fonte igual a “Your move”; Progressão fica à direita e os itens usam hover com cor da cidade escurecida em 50%.",
          "A Progressão mostra uma sequência curta quando fechada e a sequência em algarismos romanos com o gênero ao abrir o menu.",
          "Um Best move que perde mais de 1 peão frente à melhor linha da mesma busca passa a contar como Worst quando jogado; sua seta permanece verde, mas número e borda ficam vermelhos. Impactos negativos menores ficam laranja.",
          "Best/Worst agora mostram o score correto do próprio lance, inclusive mate contra o jogador; jogadas obrigatórias mostram Ok/Yep e não rendem ovos.",
          "A análise do Stockfish busca mais nós, amplia posições táticas, descarta rankings incompletos do cache e tenta recuperar o motor após falhas. Undo/Redo rápido acompanha o histórico atual; a barra de chance volta ao centro ao mudar de posição e distingue melhor avaliações muito altas ou baixas.",
          "Best/Worst agora acompanham novas profundidades da busca enquanto suas setas estão abertas; só o ranking final pode render ovos. O botão Debug stockfish abre uma janela arrastável ao lado do tabuleiro com leitura ao vivo das linhas, scores, profundidade, variantes e mensagens UCI."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "Leipzig 1723 e Vienna 1825 ganham gravações CC0 de violino, cordas, madeiras, cravo, trompa e tímpanos, com novas articulações, frases e mixagem própria."
        ]
      },
      {
        "title": "Entrada e apresentação",
        "items": [
          "Clique ou temporizador inicia juntos o som, o fade do brilho (2 s) e a transição do fundo para preto e branco (3 s); 3 s depois do som, os textos somem em 1,5 s sem se mover."
        ]
      },
      {
        "title": "Interface e controles",
        "items": [
          "Volume e BPM mostram rótulo preto a 69% e valor branco a 50%, sem fundo; o rótulo tem 6 px à esquerda e o valor, 5 px à direita. O thumb fica centrado; o BPM atualiza o transporte na soltura, enquanto o balão de variação recalcula a cada movimento em relação ao valor configurado no início do arraste. Nos menus, a opção selecionada fica branca e o hover usa a cor da cidade escurecida.",
          "Na linha inferior do Mixer, os rótulos dos knobs ficam abaixo dos controles; a legenda central usa o mesmo cinza dos rótulos.",
          "Piece Params organiza os knobs em cinco colunas; no hover e no toque/pressionamento, metade do indicador fica fora da circunferência.",
          "A legenda do Mixer fica em inglês, usa “/” e acompanha a ordem dos lados no tabuleiro.",
          "Quando o saldo zera, o texto e a borda do contador de ovos ficam vermelhos.",
          "Alertas somem após 3 segundos; avisos com botão de ação permanecem até interação. A mensagem de saldo informa quantos ovos faltam."
        ]
      }
    ]
  },
  {
    "version": "0.5.1",
    "date": "27/09/2026",
    "title": "Campanhas, popups e sons da cidade",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "A grade do globo agora aparece como pontos; cada local ocupa um ponto livre próximo da sua posição real, evitando pins no mesmo lugar.",
          "O botão Campanhas no celular agora fica mais perto do logo.",
          "Os cartões das cidades agora se ajustam à área visível; em telas baixas, seu conteúdo pode rolar dentro do cartão.",
          "Os contornos dos continentes ficam 33% mais claros no lado sombreado do globo.",
          "Hover direto dos pins 15% mais baixo; o clique para entrar agora responde com um bumbo grave.",
          "Nova foto do Largo do Pelourinho em Salvador 1992."
        ]
      },
      {
        "title": "Partida e progresso",
        "items": [
          "Novos cartões de cidade abrem perto do centro vertical da tela, com uma pequena variação de altura."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "A vitória agora toca uma corneta alegre em notas ascendentes; mais suave e mais longa que o som de derrota.",
          "13 samples e uma foto do Pelourinho dão o clima da Salvador de 1992.",
          "Metais de verdade! Trompete, trombone e percussões agora usam gravações acústicas.",
          "Salvador na área! Novo samba-reggae inspirado no Olodum de 1992: surdos intercalados, percussões em resposta e metais nos cavalos e nas torres."
        ]
      },
      {
        "title": "Entrada e apresentação",
        "items": [
          "Sons de derrota e de entrada em “Enter board” agora estão 25% mais baixos.",
          "O toque da tela de cidade chega 1 segundo depois."
        ]
      }
    ]
  },
  {
    "version": "0.5.0",
    "date": "26/09/2026",
    "title": "Novas campanhas e controles musicais",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "Novas cidades chegam com fotos dos seus lugares; cada época mostra a imagem correspondente.",
          "New Orleans agora usa uma fotografia noturna do French Quarter, em vez da foto do Rio de Janeiro.",
          "Brazilian chega com samba, choro, frevo, baião, sertanejo de raiz e bossa nova. World Rhythms põe reggae, chacarera e danças gregas e turcas no mapa."
        ]
      },
      {
        "title": "Partida e progresso",
        "items": [
          "Tom da partida na cor da cidade; subdivisão da grade com opção selecionada em verde.",
          "O cartão de cidade e estilo/ano permanece na tela por mais 1 segundo, e o desbotamento da imagem de fundo leva mais 2 segundos.",
          "O knob de filtro por equipe agora aparece como “LPF/HPF”, sem espaços.",
          "A legenda central das equipes mostra apenas “BRANCAS · PRETAS”.",
          "Brancas e Pretas agora compartilham uma legenda central entre as duas linhas de knobs do Mixer.",
          "Os seletores de Tom e Escala agora mostram borda apenas no hover ou foco, como o de Progressão.",
          "No Mixer, o nome da equipe de cima fica abaixo dos knobs e o da equipe de baixo fica acima.",
          "Cada equipe ganhou um knob LPF/HPF no Mixer, com o mesmo controle de passa-baixas e passa-altas do Piece Params.",
          "O novo filtro atua na mixagem da equipe depois dos efeitos e da equalização.",
          "As equipes do Mixer seguem a ordem vertical do tabuleiro, com os nomes centralizados abaixo dos controles.",
          "Os controles de equalização aparecem na ordem Hi, Mid e Low.",
          "O texto do código no fundo ficou com 75% de opacidade, e a lista de progressões só mostra borda no hover.",
          "Os rótulos e áreas livres dos knobs em Piece Params podem ser usados para arrastar o painel.",
          "Os hovers e saídas de Best moves e Worst moves ficaram cerca de 20% mais altos.",
          "Os knobs de parâmetros agora aparecem acima do painel de variações em Piece Params.",
          "A legenda de cópia fica mais próxima do ícone e muda para “copied!” após copiar o código.",
          "Sair de Best moves ou Worst moves com mouse ou toque repete o chimbal fechado com leve variação aleatória.",
          "Ao sair de Worst moves com mouse ou toque, o botão toca o mesmo chimbal fechado usado no hover de Best moves.",
          "Best moves agora usa chimbal fechado no hover e Worst moves usa chimbal aberto; os dois sons ficaram um pouco mais altos.",
          "O status Your move / AI analysing agora fica logo abaixo do tabuleiro, acima dos controles de Undo, Play e Redo.",
          "Os valores dos knobs acompanham a cor do ponteiro, que se aproxima da borda; o texto ficou menor e um pouco mais baixo.",
          "O código deixou de aparecer dentro do Debug; a visualização sobre o fundo continua no botão Code, e a cópia tem uma dica no hover.",
          "As labels OITAVA e DURAÇÃO foram traduzidas para Octave e Length."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "Cada kit ganhou sua foto de época, agora em alta resolução.",
          "O percentual do BPM acompanha o slider na hora. Sem tirar o ponteiro!",
          "18 fases novas: jazz, rock, soul, pastoral e orquestra em compassos variados.",
          "Afinação, envelope, filtros e efeitos agora cabem em knobs compactos, com valor e ajuda à mão.",
          "Slide de afinação e seu tempo agora moram em Afinação e envelope.",
          "O slider de BPM mostra a variação percentual prevista acima do ponteiro."
        ]
      },
      {
        "title": "Criativo e edição",
        "items": [
          "Criativo agora aceita 2/4, 9/8, 2/2, 5/4, 5/8, 7/4 e 7/8; o relógio também explica BPM e agrupamentos.",
          "Editor, kits, seções e exportação acompanham os novos compassos."
        ]
      },
      {
        "title": "Interface e controles",
        "items": [
          "Pin da variação: 2 px maior e verdinho da borda iluminada.",
          "Changelog sem avisos duplicados. Pode abrir sem susto!"
        ]
      }
    ]
  },
  {
    "version": "0.4.4",
    "date": "25/09/2026",
    "title": "Mapa, popups e gestos",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "San Diego, Berkeley, San Francisco, Columbus e Jacksonville receberam fotografias próprias, no lugar da foto repetida de Chicago.",
          "A roda do mouse sobre a área vazia da lista agora percorre também as campanhas, mantendo a interação com o globo ao fundo.",
          "Trocar a época de uma cidade abre o novo cartão na posição do anterior, 10 px mais abaixo.",
          "A centralização do pin termina na velocidade do giro de espera; cada novo cartão alterna o zoom entre 69% e 150%.",
          "Fechar tudo encerra os cartões em sequência aleatória; cada cidade mantém sua cor de destaque.",
          "O hover na lista aproxima o pin do centro com um giro inicial mais rápido e segue na velocidade de espera sem parar no centro.",
          "As bandeiras fecham o balanço do tecido sem salto; no giro de espera, a haste inclina mais e o tecido balança com mais suavidade.",
          "Manchester 1999 aparece somente em World ballads.",
          "As bandeiras do globo ficaram mais claras, misturam verde com a cor da cidade, trazem símbolos ligados ao estilo musical e dobram mais durante o balanço.",
          "O ícone da lista assume a cor da cidade no hover; passar pelo pin rola a lista suavemente para mostrar a cidade.",
          "A bandeira do globo balança pela base em um oito suave, com uma leve ondulação no tecido; o ícone da lista fica parado à direita da cidade.",
          "Cidades conquistadas agora exibem bandeiras animadas na lista e no globo, com balanço lento e sombra sutil.",
          "Ao passar por uma cidade na lista, o eixo do giro de espera conduz seu pin ao centro da tela pelo caminho mais curto, sem mover a câmera ou mudar a velocidade.",
          "Lista e globo agora se destacam juntos, com som mais suave e variado.",
          "Ao passar por uma cidade na lista, o pin correspondente também destaca e o eixo do giro de espera se orienta para ela, mantendo a velocidade do globo.",
          "As etiquetas para trocar a época deixam mais claro que são clicáveis.",
          "Clicar num pin aproxima-o 30% do caminho até o centro pelo giro do globo; a rotação continua no mesmo eixo à velocidade de espera.",
          "Fechar tudo permanece acima dos cartões e os fecha numa sequência um pouco mais espaçada, alternando chimbal aberto e fechado.",
          "O fundo dos cartões deixa o globo mais visível, e a troca de épocas aparece abaixo da descrição, alinhada à direita antes de Enter board.",
          "A listagem das campanhas continua rolando com roda, trackpad, toque e arraste, mas não mostra mais a barra de rolagem."
        ]
      },
      {
        "title": "Partida e progresso",
        "items": [
          "Os valores dos knobs agora aparecem dentro do círculo, logo abaixo do centro.",
          "O bumbo de hover de Undo, Play e Redo ganhou um pouco mais de variação de volume e altura.",
          "A peça fica na casa ao pressionar e só acompanha o ponteiro depois de iniciar um arraste, evitando o salto durante o duplo clique ou toque.",
          "Undo, Play e Redo ganharam pequena variação no bumbo de hover; Best e Worst moves usam chimbais diferentes no hover e assobios ascendentes ou descendentes no clique.",
          "O botão de Best ou Worst moves acionado fica indisponível enquanto suas setas estão visíveis.",
          "Duplo clique ou toque numa peça sua liga ou desliga seu loop e pode abrir Piece Params automaticamente; desligar o painel manualmente impede novas aberturas automáticas.",
          "Best moves e Worst moves agora ficam nas pontas da linha de Undo, Play e Redo, como botões sem ícones."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "O novo botão Code mostra o código Strudel atualizado sobre a fotografia de fundo, sem bloquear a partida.",
          "O estilo musical continua ao lado da cidade enquanto seu cartão está aberto.",
          "O hover direto no pin ganhou um bumbo eletrônico mais grave e forte; o hover da lista conserva seu som anterior.",
          "Passar por uma fase na lista mostra seu estilo musical ao lado do ano.",
          "O som de hover ficou mais grave e suave, com uma cauda curta de eco.",
          "Títulos mostram só o estilo; descrições e aberturas apresentam a cultura musical de cada fase sem repetir cidade ou ano.",
          "Quatro bancos novos trazem guitarras, baixos, pianos, órgão, FM, pads e percussões com timbres variados.",
          "As dez fases do Harmonic songbook ganham instrumentos e levadas próprios por estilo; os kits anteriores também recebem timbres mais adequados a cada cidade.",
          "Ao carregar um preset atualizado, a versão salva anteriormente fica em Meus kits para comparação."
        ]
      },
      {
        "title": "Entrada e apresentação",
        "items": [
          "O botão final das frases troca os sons de hover e clique entre si.",
          "O toque de entrada passa a soar na apresentação da cidade, 1 segundo após clicar no botão."
        ]
      }
    ]
  },
  {
    "version": "0.4.3",
    "date": "24/09/2026",
    "title": "Harmonic songbook e biblioteca de kits",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "A campanha Harmonic songbook reúne dez fases novas, cada uma com uma sequência de acordes, cidade, época e kit editável próprios.",
          "Os botões de época nos popups mostram o estilo correto de cada fase e se distribuem em mais de uma linha quando necessário.",
          "A lista ganha texto maior, subtítulos em maiúsculas e hover verde; os marcadores saem e cliques passam pelas áreas vazias.",
          "Os popups das cidades ficam numa camada acima da lista de campanhas quando se sobrepõem a ela.",
          "O globo só centraliza uma cidade da lista ao clicar; hover realça apenas o texto e os itens têm mais espaço entre si."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "O jazz ganha acordes de sétima em ii–V–I e iii–VI–ii–V; baixos, melodias e respostas acompanham o centro de cada seção.",
          "Meus kits aparece no seletor mesmo sem kits salvos e agora reúne os estudos Mouth Breather e Düsseldorf original.",
          "Um problema no rascunho atual não impede a biblioteca de kits de carregar.",
          "Em Düsseldorf, a flauta ganha espaço quando entra em destaque; em New Orleans, guitarra e palheta deixam o final para o trompete.",
          "O baixo principal acompanha as quatro seções de Manchester 1999; a segunda linha responde apenas nas partes mais cheias.",
          "Clicar em outra peça toca seu sample no primeiro clique; carregar os painéis do novo instrumento não interrompe o ataque."
        ]
      },
      {
        "title": "Criativo e edição",
        "items": [
          "Ao atualizar o kit de uma cidade, a versão anterior aparece em Meus kits com nome próprio e sem vínculo com a fase. O botão Kit anterior sai da bancada.",
          "Ao carregar essa cidade, o kit anterior fica disponível para comparação no Criativo.",
          "O áudio do Criativo é iniciado no gesto, corrigindo o silêncio no primeiro clique e ao arrastar peças.",
          "Atravessar casas toca uma nota por casa sem atualizar toda a bancada a cada ataque."
        ]
      }
    ]
  },
  {
    "version": "0.4.2",
    "date": "23/09/2026",
    "title": "Criativo, campanhas e mapa",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "As fases agora aparecem em três campanhas numa lista à esquerda do globo; hover centraliza a cidade e clique abre seu popup.",
          "Buenos Aires, Dublin e New Orleans chegam à campanha World ballads, junto com Manchester 1999; Vienna aparece em Classical music.",
          "O logotipo fica maior ao lado do nome no painel Sobre.",
          "O logotipo aparece nos ícones do navegador e nas prévias ao compartilhar; controles do cabeçalho e informações de contato foram atualizados.",
          "A pontuação histórica aparece em cinza e usa “points” como unidade.",
          "Durante o arraste e o giro, popups fora da esfera ficam no máximo 50 px além da circunferência visível.",
          "Popups de cidade recortam o fundo nos cantos arredondados; versão e Modo Criativo ficam clicáveis em toda a área, com hover escuro consistente.",
          "Os botões do globo usam hover escuro; o perfil mostra os ovos ao lado do avatar e exibe as cidades conquistadas com título atualizado.",
          "O perfil e a redefinição do progresso ficam no popup do avatar com a contagem de ovos; Modo Criativo fica no canto inferior esquerdo.",
          "Clicar no pin de uma cidade com popup aberto agora fecha esse popup.",
          "A roda do mouse continua controlando o zoom do globo mesmo quando o cursor está sobre um popup.",
          "Os cartões das cidades permanecem à frente das linhas e vêm para a frente dos outros popups ao serem clicados ou arrastados.",
          "A linha dos pins ocultos agora procura o ponto mais próximo da circunferência visível, no mesmo lado da cidade.",
          "Quando um pin fica atrás do globo, sua linha se conecta à borda visível mais próxima e volta ao pin quando ele reaparece.",
          "Os popups deixam de mostrar BPM e recompensa; o selo CONQUERED permanece visível no rodapé das cidades conquistadas.",
          "A foto de Johannesburg volta a carregar no popup."
        ]
      },
      {
        "title": "Partida e progresso",
        "items": [
          "As peças ocupam mais espaço nas casas, que voltam a ter cantos retos.",
          "Duplo clique numa peça alterna sua ativação no modo Mover, sem mudar sua posição.",
          "A aba da variação fica mais discreta durante seções em que a peça não está presente; o pin sobe para ficar acima do botão.",
          "Os botões de edição da variação destacam o hover; o pin da variação fixada aparece acima da aba sem aumentar a fileira.",
          "Os sliders de Board Params e os botões de energia dos widgets acompanham as cores da cidade, com branco desligado e azul no hover.",
          "O espectrograma usa o fundo do widget, ocupa melhor sua área e capta picos entre as frequências exibidas.",
          "O cabeçalho mostra a dificuldade selecionada com espaçamento uniforme entre os controles; os links de melhores e piores jogadas usam cinza.",
          "A área vazia ao redor do tabuleiro e dos controles de jogo deixa passar os gestos para os widgets posicionados atrás.",
          "Alterar a dificuldade durante a análise ou a espera reinicia a busca com o nível escolhido; o menu identifica o nível real do Stockfish.",
          "Os atalhos de melhores/piores jogadas têm mais espaço acima e usam barra como separador.",
          "Rank, ovos e pontuação aparecem juntos sem cartão separado; o avatar ganha destaque e os ícones de ovo e conquista ficam nos indicadores correspondentes.",
          "Cidades conquistadas agora exibem o selo CONQUERED junto da recompensa, deixando o título livre para o nome da cidade.",
          "Favicons e ícones do app exibem a silhueta do logotipo sem um quadrado de fundo."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "O tabuleiro livre permite que o primeiro clique do mouse desbloqueie o áudio antes de tocar e arrastar a peça.",
          "Segurar e atravessar casas dispara as notas mesmo enquanto os efeitos de áudio ainda estão carregando.",
          "Arrastar uma peça volta a tocar uma nota por casa mesmo quando o áudio ainda estava suspenso.",
          "As casas ativas deixam de ter sombra no botão e contorno de 1 px; a borda branca da seleção permanece.",
          "Três composições originais exploram 3/4, 6/8 e 12/8, com duração real dos compassos, acentos e relógio próprios."
        ]
      },
      {
        "title": "Criativo e edição",
        "items": [
          "Ao soltar rapidamente uma peça no Criativo, a prévia permanece por até 500 ms.",
          "O Criativo usa o mesmo tabuleiro visual e o mesmo arraste da partida, com movimentos livres e sem adversária.",
          "A partida agora usa o compasso do kit também no editor de variações e no relógio musical.",
          "O Criativo permite escolher o compasso; kits antigos continuam em 4/4.",
          "A grade abre com duas partes em 3/4 e três partes em 6/8 ou 12/8; a escolha ainda pode ser ajustada livremente.",
          "Modo Criativo fica ao lado da versão; o botão de tela cheia destaca e amplia o ícone no hover, e o perfil mostra “golden eggs” sem moldura."
        ]
      },
      {
        "title": "Entrada e apresentação",
        "items": [
          "O gênero e o ano aparecem sem negrito e sem cursor de ponteiro na tela de introdução."
        ]
      }
    ]
  },
  {
    "version": "0.4.1",
    "date": "22/09/2026",
    "title": "Widgets, análise e edição musical",
    "groups": [
      {
        "title": "Partida e progresso",
        "items": [
          "Widgets desligados podem ser arrastados também sobre seus controles, sem que knobs ou sliders bloqueiem o gesto.",
          "O estado Your move/AI Analysing aparece entre os botões de controle e o histórico de jogadas.",
          "O mixer ganhou um widget próprio com controles simultâneos para Brancas e Pretas; Low, Mid e Hi substituem os nomes longos do EQ.",
          "Os nomes dos knobs aparecem acima dos controles, e os valores ficam abaixo. O contorno das peças pretas ficou mais suave.",
          "A barra de chance fica sem número; o estado da partida aparece centralizado abaixo dela, antes dos atalhos de melhores e piores jogadas.",
          "Piece Params combina LPF e HPF num controle centralizado e ganha Drive para a distorção da peça.",
          "Todas as fases começam com a IA no Easy; após calcular, ela espera de 0,5 a 3 segundos antes de jogar.",
          "Os knobs mostram rótulos em maiúsculas e valores brancos; os atalhos de jogadas não exibem mais “Bisbilhotar”.",
          "As peças pretas recebem contorno branco para preservar detalhes internos e silhuetas sobre todas as casas.",
          "Gain, LPF, pan, room e delay permanecem visíveis entre ataques; com Piece Params desligado, o cabeçalho deixa de atualizar o estado da voz.",
          "As listas de três melhores e três piores jogadas saem do widget, mantendo as setas disponíveis sob a barra de avaliação.",
          "Subdivisão, inversão, randomização e duração ficam juntos na barra de ações; o liga/desliga do loop vai para o canto superior direito do widget.",
          "Slide, tempo, acento e pan usam sliders compactos em duas colunas; pan começa centralizado e a exclusão usa um botão de lixeira junto ao gráfico.",
          "Ao desligar o loop, todo o bloco de variações fica esmaecido enquanto a audição manual da peça continua disponível.",
          "O tempo do slide de cada nota passa a usar um slider e mantém o valor em segundos visível durante o ajuste.",
          "O botão de energia desliga os loops automáticos da peça sem impedir as notas avulsas tocadas ao arrastá-la pelo tabuleiro.",
          "A barra mostra avaliação a favor das brancas, sem a antiga porcentagem invertida de Chance; o número acompanha a divisão visual e mates têm indicação própria.",
          "Os links sob a barra desenham por três segundos as três melhores ou piores jogadas, com setas verdes/vermelhas e a variação esperada na ponta.",
          "Um único worker compartilha o trabalho da análise e da adversária, com limites de tempo e nós e reutilização das posições já analisadas.",
          "A avaliação aparece antes do ranking; o painel informa tempo de busca, nós e profundidade para acompanhar o custo.",
          "Comparações incompletas são sinalizadas, e undo/reset descartam respostas e jogadas antigas.",
          "O ranking reaproveita a mesma busca do termômetro e exibe notação SAN com avaliação relativa ao lado que joga.",
          "A instrução de arrastar uma peça sai do monitor; a contagem de vozes ativas permanece.",
          "A análise passa por uma fila serial ligada ao FEN: respostas atrasadas não podem mais sobrescrever o termômetro depois de undo/redo."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "O áudio pausa ao sair da aba e volta apenas se a sessão estava tocando.",
          "Distorção e seu nível ficam em Filtros e efeitos; as dicas esclarecem o arranjo compartilhado e o slide da peça.",
          "Escolher Timbre sintetizado funciona mesmo após usar samples e muda a fonte para Síntese.",
          "O slide de nota começa em 0,5 s; sliders nos valores padrão aparecem cinza e ficam azuis quando ajustados.",
          "O som pausa ao sair da aba e volta apenas se a partida já estava tocando.",
          "Os widgets usam borda fina, título branco, botões de energia consistentes e podem ser arrastados pelo corpo; Strudel passa a se chamar Debug.",
          "Harmonia agora passa a reunir o rótulo e o acorde numa única linha, sem repetir a seção corrente.",
          "Desligar o loop remove também a borda e o sombreado de peça ativa no tabuleiro, mantendo a ativação musical guardada e a audição manual disponível.",
          "Inverter passa a espelhar as notas no tempo dentro da duração inteira da variação, mantendo alturas e durações e trocando a direção de cada slide.",
          "Padrões em mini-notação também espelham sequências, pausas e grupos temporais sem desmontar acordes simultâneos.",
          "As ações por ícone invertem ou randomizam somente as alturas da variação escolhida, preservando seu ritmo e sua duração.",
          "Stockfish Lite real substitui a engine simplificada na análise e nas jogadas da adversária.",
          "O Strudel também mostra as três melhores e três piores opções estimadas, com origem, destino e promoção explícitos.",
          "O debug do Strudel lista os cinco melhores e os cinco piores movimentos legais assim que a análise da posição fica pronta.",
          "A análise deixa de esperar o atraso artificial da adversária; os 200–700 ms continuam somente para dar ritmo à resposta da IA.",
          "O widget Strudel mostra a harmonia corrente, com seção, grau, acorde, notas e plano harmônico, usando a mesma tipografia das demais linhas de debug.",
          "Cliques rápidos conservam somente a posição mais recente na fila, enquanto retornos a um FEN completo já analisado usam o cache correspondente."
        ]
      },
      {
        "title": "Criativo e edição",
        "items": [
          "O duplo clique apaga notas do piano roll, e Alt ao arrastar duplica a nota com duração e parâmetros de articulação preservados.",
          "O editor compacto perde a borda externa e ganha espaço entre o piano roll e os sliders de articulação.",
          "Os seletores harmônicos da partida e do Criativo mostram primeiro a progressão e depois seu nome, como I–IV–V–I - Cadência.",
          "O comprimento horizontal da rampa agora acompanha o tempo do slide, sem repetir os valores numa legenda sob o gráfico.",
          "A variação fixada recebe um pin acima da aba, e o painel ampliado mostra editor e parâmetros da execução sem rolagem vertical interna.",
          "O estado da voz acompanha o código da casa no subtítulo, e o editor remove títulos e campos redundantes.",
          "A distância do slide de cada nota passa a usar um slider de −24 a +24 semitons, com o valor corrente sempre visível.",
          "Piece Params permite editar as notas da variação corrente com o mesmo piano roll do Criativo."
        ]
      },
      {
        "title": "Entrada e apresentação",
        "items": [
          "O nome da cidade aparece maior, com gênero e ano logo abaixo, sem o antigo quadro de informações.",
          "A partida começa automaticamente após quatro segundos; clicar em qualquer ponto da apresentação antecipa a entrada."
        ]
      },
      {
        "title": "Desempenho e manutenção",
        "items": [
          "A Chance também volta a ser calculada em celulares e aparelhos restritos, usando profundidade menor para limitar o uso de CPU."
        ]
      }
    ]
  },
  {
    "version": "0.4.0",
    "date": "21/09/2026",
    "title": "Widgets da partida e motor musical",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "O globo conserva sua velocidade de espera quando um popup está aberto; somente o cartão percorre a tela três vezes mais devagar.",
          "Marcadores que estão atrás da esfera deixam de responder a hover, clique e toque.",
          "Arrastar o popup de uma cidade não interrompe o giro automático do globo.",
          "Com um popup aberto, o giro de espera e o quadro ancorado ao pin passam a um terço da velocidade.",
          "O botão do changelog deixa de depender do ID variável do gatilho Radix, eliminando a divergência de hidratação em aria-controls.",
          "O mapa passa a ter 13 cidades e 14 fases; Manchester continua com as épocas de 1988 e 1999."
        ]
      },
      {
        "title": "Partida e progresso",
        "items": [
          "A Progressão altera o plano harmônico base da partida, mantendo a prioridade temporária das influências de Estado e Evento.",
          "A área vazia do cabeçalho deixa os cliques passarem para widgets posicionados atrás dela; os controles visíveis continuam interativos.",
          "Arrastar uma peça volta a tocar uma nota avulsa na casa inicial e em cada nova casa atravessada.",
          "A posição do destaque e a prévia transitória são atualizadas sem renderizar novamente a partida inteira a cada nota.",
          "Cada perfil começa com 10 ovos dourados; toda vitória de cidade, inclusive repetida, concede mais 10 ovos.",
          "Cada ovo recebido também vale um ponto histórico. Gastar ovos no futuro preservará a pontuação, as vitórias e as cidades conquistadas.",
          "Perfis antigos são migrados pela quantidade real de vitórias, sem transformar os antigos prêmios de 1.000/200 pontos em milhares de ovos.",
          "As 32 vozes compartilham quatro reverbs, mantendo os controles de cada peça.",
          "Capturar ou desativar uma peça não interrompe outras vozes do mesmo bus. Audições pelo tabuleiro continuam isoladas e podem ser canceladas imediatamente."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "Spectrogram e Strudel deixam de abrir automaticamente no primeiro lance.",
          "Board Params reúne Tom, Escala e Progressão na mesma linha e remove fine pitch, quartz lock e as legendas auxiliares de tom e mixer.",
          "Piece Params passa a usar a imagem da peça e o nome do instrumento como cabeçalho.",
          "O monitor mostra somente a variação corrente; abas A–H permitem fixar uma variação e um segundo clique devolve o controle à sequência musical.",
          "Com o widget desligado, o monitor de variações permanece desmontado para não consumir processamento.",
          "O gesto reutiliza o mesmo canal de áudio manual até a soltura, evitando recriar efeitos por casa e reduzindo a pequena trava do arraste.",
          "Cada cidade ganhou levadas, timbres e harmonia próprios. Cada peça também ganhou seu papel na banda.",
          "Bases, respostas e solos se alternam ao longo das seções para abrir espaço na música.",
          "Nova cidade dedicada ao Kwaito: house desacelerado a 108 BPM, piano township, baixo elástico, conga, shaker, pandeiro, guitarra mbaqanga e chamadas vocais.",
          "Kits salvos da coleção anterior recebem backup local recuperável quando a nova versão da cidade é carregada pela primeira vez.",
          "Desktop mantém dois buses por equipe, enquanto audições manuais continuam isoladas e podem ser canceladas imediatamente.",
          "Arraste, monitor e código Strudel evitam recomputações desnecessárias; a exportação de 32 vozes passa a declarar apenas quatro orbits.",
          "Planos harmônicos por seção movem baixo e melodias em conjunto; vozes sustentadas podem formar tríades com inversões de menor deslocamento.",
          "O relógio mostra centro, acorde e notas da harmonia atual, e regras podem trocar o plano temporariamente sem reescrever o kit.",
          "Todos os Estados e Eventos recebem defaults musicais proporcionais à frequência e importância do gatilho, inclusive nos kits existentes.",
          "Kits salvos e padrões aparecem juntos no seletor principal, com a cidade vinculada ao lado do nome quando existir.",
          "Cada cidade mantém no máximo um kit vinculado; ao substituir o vínculo, o kit anterior permanece salvo sem cidade."
        ]
      },
      {
        "title": "Criativo e edição",
        "items": [
          "As formas valem no Criativo e nas partidas. Capturas, movimentos, cheque, Solo e edição continuam acompanhando a identidade de cada peça.",
          "Os pulsos musicais atualizam somente o pequeno marcador do tabuleiro; a partida e a bancada Criativo deixam de renderizar a tela inteira a cada ataque.",
          "Estados e Eventos foram separados em listas, aceitam liga/desliga pelo editor e indicam claramente qual regra está sendo editada.",
          "Controles do transporte, variações, Solo, lista de vozes e edição numérica foram reorganizados para leitura e operação mais diretas."
        ]
      },
      {
        "title": "Entrada e apresentação",
        "items": [
          "Arranjos contínuos consultam somente a variação em execução; reinícios de frase continuam respeitando a entrada de cada seção."
        ]
      },
      {
        "title": "Desempenho e manutenção",
        "items": [
          "Celulares usam menos reverbs ao mesmo tempo, sem perder vozes ou controles."
        ]
      }
    ]
  },
  {
    "version": "0.3.2",
    "date": "16/09/2026",
    "title": "The Creative",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "Correção do sentido do giro do globo com dois dedos."
        ]
      },
      {
        "title": "Partida e progresso",
        "items": [
          "Roques, capturas, perda de famílias de peças, formação mínima, promoções, en passant e saída de cheque com duração configurável.",
          "Correção do alinhamento da peça arrastada; botão Segure para ouvir removido. Solo continua disponível para ouvir a frase completa."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "Slide global ou por nota, acentos e pan individuais, intensidade e nível da distorção.",
          "Estudo Mouth Breather: 17 etapas, guitarra em camadas, baixo quebrado e bateria distribuída.",
          "Kits compostos para as 13 fases, oito samples sintéticos novos e backup recuperável dos kits anteriores.",
          "Duração independente por variação, grade de tercinas e loops de comprimentos diferentes sobre o mesmo BPM.",
          "Opção por regra de aguardar a virada do compasso, com indicação de pendências e persistência no kit.",
          "Simulador de estados e eventos abaixo do tabuleiro, com regras salvas em cada kit e aplicadas também na partida.",
          "Transposição, BPM, escala paralela/relativa, rotação modal, inversão melódica, variação, ganho, filtro e ativação por equipe.",
          "Seletor de kit acima do transporte, colunas sem gap, variações expandidas e nomes de instrumento sem sufixo de casa."
        ]
      },
      {
        "title": "Criativo e edição",
        "items": [
          "Ajuda em círculos ? com hover, foco e toque; piano roll corrigido para editar todas as linhas visíveis.",
          "Transições preparadas no relógio de áudio e rampas de BPM por regra, com curva, ponteiro e destino no Criativo.",
          "Até oito variações selecionáveis, conversão para piano roll, desenho/movimento/duração de notas com mouse e restauração do padrão original.",
          "Scrollbars dos painéis escondidas, mantendo rolagem por mouse, trackpad e toque.",
          "Versões renomeadas para a série v0.3; versão atual v0.3.2 — The Creative."
        ]
      },
      {
        "title": "Entrada e apresentação",
        "items": [
          "Seções por peça com durações diferentes, entradas/pausas, transposição e reinício opcional da frase."
        ]
      },
      {
        "title": "Interface e controles",
        "items": [
          "Catálogo compartilhado de 19 escalas/aliases, incluindo blues, tons inteiros, diminutas, modos e cromática."
        ]
      }
    ]
  },
  {
    "version": "0.3.1",
    "date": "13/09/2026",
    "title": "Peças que fazem música",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "Manchester mantém 1988 e ganha seletor de época no popup; kits e progresso separados. Links diretos do Criativo carregam a cidade escolhida.",
          "Correções de touch em Enter board, arraste das peças com audição das casas e isolamento do cursor do globo.",
          "Giro do globo com dois dedos, retomada estável do giro automático e quadro de apresentação arrastável.",
          "Litorais vetoriais mais discretos, grade geográfica e linha do popup 50% mais escura quando o pin está atrás do planeta.",
          "Menos atualizações de padrões, gráficos ocultos e renderizações durante o arraste; menor resolução do globo em dispositivos restritos.",
          "Ajustes no arraste do globo e dos popups, incluindo a liberação do mouse sem deixar o mundo preso ao ponteiro.",
          "Pressionar um popup o reduz em torno do ponto clicado; sons acompanham pressão, arraste e soltura. Botão de fechar sem recorte.",
          "Giro de espera com popups abertos; hover pausa o giro e amplia o pin em 15%. Cidades conquistadas recebem uma bandeira verde.",
          "Voo com zoom até a cidade ao entrar na fase, com respeito à preferência de movimento reduzido.",
          "Litorais geográficos reais sem fronteiras regionais, fundo de galáxias suave, sol com halo e iluminação compartilhada pelo globo e pela lua.",
          "Reward aparece no rodapé dos popups com o valor da próxima vitória. Clique dos pins 70% mais baixo e hover 30% mais baixo."
        ]
      },
      {
        "title": "Partida e progresso",
        "items": [
          "Fonte sonora, comportamento e tipo de peça são independentes: qualquer peça pode ser percussão, sequência ou voz sustentada.",
          "Arrastar interrompe o loop da peça e toca as casas percorridas, inclusive para peças inativas. Cancelar restaura o estado anterior.",
          "Dar cheque ativa temporariamente toda a banda atacante sobrevivente. Sair do cheque devolve a ativação ao histórico de movimentos.",
          "Peça acompanha mouse/toque no arraste; casas uniformes e audição sem seleção acidental de texto.",
          "Widgets arrastáveis pelo fundo, textos com espaço reservado, controles móveis e knobs com mouse, toque, teclado e roda do mouse.",
          "Histórico de versões acessível pelo número da versão, com rolagem interna."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "Nova época Northern Jazz Breaks, inspirada em Get a Move On! de Mr. Scruff: 123 BPM, quatro seções e motivos de sopro com respostas.",
          "Board Params com ganho e equalização por equipe; fine pitch comum e quartz lock no BPM original do kit.",
          "Todas as 12 cidades usam a nova mecânica. Kits experimentais aleatórios e reproduzíveis variam fontes, frases, grooves, timbres, efeitos e movimentos.",
          "Banco local de samples, variações de articulação, samples afinados, biblioteca de receitas, frases A/B/C/D e grooves compartilhados.",
          "Automações de ganho, filtro, pan, reverb e delay, além de tom, escala, BPM e volume comuns à banda.",
          "Padrões compilados em cache, samples compartilhados, atualizações visuais agrupadas e atenuação para formações grandes.",
          "Uma peça começa seu loop após o primeiro movimento; capturas removem a voz. Roque, en passant, promoção e undo/redo preservam as identidades musicais.",
          "Notas, pausas, estados e pulsos visuais acompanham o áudio. Todas as variações salvas aparecem em quadros MIDI, com ponteiro na variação em execução.",
          "Carregar, editar e salvar kits de qualquer cidade para a próxima partida; gerar novas variações e comparar com o Düsseldorf original.",
          "Piece Params inclui notas e envelope; Board Params edita tom e escala; Strudel reúne código, seção, compasso e estado do áudio."
        ]
      },
      {
        "title": "Criativo e edição",
        "items": [
          "Banco Chicken Jazz com 11 samples sintéticos originais de palhetas, metais, baixo, teclas, vogal e bateria, disponíveis para qualquer peça no Criativo.",
          "Strudel integrado ao jogo e ao Criativo, com um relógio comum e 32 instrumentos independentes.",
          "Rascunho e kits locais, exportação/importação JSON validada. Carregar uma cidade no Criativo ativa as 16 brancas para escuta."
        ]
      },
      {
        "title": "Entrada e apresentação",
        "items": [
          "Correções na duração das seções, nas entradas das vozes, na audição da rainha e nos ganhos dos presets.",
          "Modo Criativo sem introdução ou adversário, com tabuleiro livre, audição, solo, ativação individual e edição de instrumentos."
        ]
      },
      {
        "title": "Desempenho e manutenção",
        "items": [
          "Tabuleiro fixo à esquerda em telas largas, duas colunas de edição com rolagem independente e disposição vertical no celular em retrato."
        ]
      }
    ]
  },
  {
    "version": "0.3.0",
    "date": "",
    "title": "The Distribution",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "Mapa de cidades e fases de xadrez contra IA, progressão local e interface de jogo que serviram de base à evolução musical da versão 3.1."
        ]
      }
    ]
  },
  {
    "version": "0.2.2",
    "date": "08/02/2026",
    "title": "Peças em movimento",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "O globo ficou 3d, como um planeta flutuando no espaço."
        ]
      }
    ]
  },
  {
    "version": "0.2.1",
    "date": "02/02/2026",
    "title": "Primeiro editor musical",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "O globo ficou mais interativo."
        ]
      },
      {
        "title": "Criativo e edição",
        "items": [
          "Editor musical básico para experimentar sons e ideias no tabuleiro."
        ]
      }
    ]
  },
  {
    "version": "0.2.0",
    "date": "16/01/2026",
    "title": "O tabuleiro começa a tocar",
    "groups": [
      {
        "title": "Mapa e cidades",
        "items": [
          "Espectrograma e mapa-múndi pra escolher uma cidade."
        ]
      },
      {
        "title": "Música e kits",
        "items": [
          "Kits músicais diferentes, vinculados a cidades pra representar estilos musicais."
        ]
      }
    ]
  },
  {
    "version": "0.1.0",
    "date": "05/01/2026",
    "title": "Primeiros sons no tabuleiro",
    "groups": [
      {
        "title": "Música e kits",
        "items": [
          "Tabuleiro de xadrez integrado com strudel para orchestração musical. Cada peça ativa uma linha de código-música no strudel."
        ]
      }
    ]
  }
]
