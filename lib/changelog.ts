export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.12.0',
    date: '16/11/2026',
    title: 'Pátio: dá para entrar nas casas pela porta',
    groups: [
      { title: 'Pátio: interior das casas', items: [
        'Em frente à porta de uma casa, Usar (o mesmo comando de Pegar) entra nela; de dentro, o mesmo gesto na porta sai. O contorno da porta acende quando o boneco está no lugar certo.',
        'Enquanto você está dentro de uma casa, o resto do cenário escurece e só a casa fica clara; ao sair, a luz volta.',
        'Ao entrar, a fachada some na sua tela e aparece o interior: um cômodo entre as paredes, com um piso para cada andar da casa. Dá para pular de um andar para o outro e descer com o gesto de atravessar pisos; as paredes e o teto seguram o boneco como as bordas do mundo.',
        'Vale para as casas da Vila dos Telhados e para qualquer casa com porta colocada no Modo editor, em todos os Pátios e para todos os players locais.',
        'O que você atira ou arremessa dentro da casa fica no cômodo e não acerta inimigos do lado de fora.',
        'No Pátio online, quem está dentro de uma casa fica escondido pela fachada para quem está fora, e aparece para quem entra na mesma casa. Isso depende do servidor de jogo atualizado; até lá, os outros jogadores continuam aparecendo na frente das casas.',
      ] },
    ],
  },
  {
    version: '2.11.0',
    date: '15/11/2026',
    title: 'Gaiolas no Pátio: as almas ficam em gaiolas de seis modelos, até três por jogador; almas e pássaros exploram o mapa, pousam em árvores, plataformas e objetos, e algumas aves cagam; trocar de Pátio agora troca o mundo inteiro; Best em posição ruim não dobra mais para 6 ovos; botão para copiar o histórico completo da partida; arco e flecha puxado como de verdade no Pátio; combos do Pátio com duração, cooldown e alcance por golpe e golpe relativo à mira; Mute no painel Volume do Pátio; rajada só enquanto segura Atirar; rei não pode mais encostar numa peça congelada; Modo editor do Pátio sem travar ao arrastar elementos',
    groups: [
      { title: 'Pátio: Gaiolas', items: [
        'Nova categoria de item, Gaiolas, em seis modelos com arte própria: Gaiola básica (8 almas), de arame (12), Concorde (16), de madeira (20), Gaiolão arqueado (30) e Voadeira (50). O limite de almas de cada modelo é ajustável no painel Itens, e cada cavalete ou item solto do Modo editor pode ter o seu. Elas também entram na lista de itens do Baú.',
        'As gaiolas substituem a Bag of souls. Ninguém começa com gaiola: o Pátio padrão tem uma Gaiola básica para pegar no chão, perto da entrada. Ela não ocupa o inventário.',
        'Cada jogador leva até três gaiolas, cada uma com as suas almas. A sua fica pendurada no canto superior esquerdo da tela: uma grande na frente e até duas menores atrás, uma de cada lado. Elas balançam com o movimento da câmera, e uma gaiola recém-pegada entra balançando, vinda de fora da tela.',
        'As almas capturadas vão para a gaiola da frente. Se ela está cheia, a primeira gaiola com vaga vem para a frente sozinha; se nenhuma tem vaga, as gaiolas tremem e o pássaro fica onde está.',
        'Clicar ou tocar na gaiola da frente solta uma alma dela (só dela); clicar numa de trás troca essa gaiola de lugar com a da frente. Com a da frente vazia e almas soltas, ela vira o botão Callback, e voltam só as almas que cabem.',
        'Com três gaiolas, Pegar uma gaiola do chão troca a sua gaiola da frente por ela. As almas continuam dentro de cada gaiola, também no chão: quem pega a gaiola leva as almas junto.',
        'Dentro da gaiola as almas são desenhos parados: os pássaros espalhados pela gaiola e os pintinhos na base. Um pintinho capturado continua pintinho e, solto, volta para o bando como pintinho.',
        'Sem gaiola, o Passaguá não captura: empurra os pintinhos e espanta os pássaros, que voam num instante até um fio de energia visível na tela e pousam nele (sem fio à vista, vão para um canto da tela longe de você).',
        'Os contadores de almas agora são a silhueta de cada gaiola com o número dentro, e piscam azul quando a gaiola ganha uma alma e vermelho quando solta uma. O avatar dos outros jogadores aparece sobre o boneco deles com esses contadores; quando o boneco sai da tela, o avatar fica na borda, na direção onde ele está. No Pátio online todos veem os contadores de todos.',
        'Binds novas: Soltar alma em H (teclado primário), End (secundário) e L3 (gamepad); Trocar de gaiola em Y e Home, ou segurando L3. No teclado secundário, Arremessar e Golpe ficam em \\ e [; no gamepad, a Roda do inventário deixa de ter botão. O painel Controles passa a listar também as binds fixas de zoom e movimento da câmera.',
        'No Pátio online as gaiolas do chão são de cada navegador, e os contadores dos outros jogadores só aparecem depois que o servidor de jogo for atualizado.',
      ] },
      { title: 'Pátio: pássaros e almas que exploram', items: [
        'As almas soltas não ficam mais o tempo todo em volta do dono: depois de um descanso, saem para pousar num fio de energia, numa árvore, numa plataforma, num telhado ou em cima de um objeto por perto, ficam um tempo ali de asas fechadas, olhando para o dono, e voltam (ou emendam outro lugar). Se o dono se afasta muito, elas voltam na hora.',
        'Cada classe de alma explora do seu jeito: a Preguiçosa sai muito e fica bastante tempo pousada, a Patrulheira vai longe e troca logo de lugar, a Escolta quase não larga o dono e a alma pintinho não sai.',
        'Os pássaros vivos também pousam em árvores, plataformas, telhados e objetos, não só nos fios. Cada tipo tem o seu gosto: o Pardal gosta de plataformas e objetos, o Sabiá e a Coruja preferem árvores.',
        'Novo poder de algumas aves: cagar. Têm o poder as almas das espécies mini, gêmeos e tambor, e os pássaros Pardal e Bem-te-vi. O pássaro só solta quando há um boneco embaixo dele. Em inimigos e no Alvo de treino o cagado tira vida (pouca: de 1 a 4). Como as galinhas não têm vida no Pátio, nelas ele dá um tranco pequeno e deixa uma mancha nas costas por alguns segundos.',
        'As almas vivas poupam o dono; as almas mortas cagam também nele. Os outros jogadores nunca são poupados.',
        'Editor de fichas da Biblioteca de almas (admin): novo grupo Exploração (Explorar, Alcance, Tempo pousada e o gosto por Fios, Árvores, Plataformas e Objetos) e, em Ações, Cagar a cada, Dano do cagado e Poupar o dono.',
        'No Pátio online, cagados, manchas e almas de asas fechadas aparecem só no navegador de quem os vê acontecer; o dano em inimigos é compartilhado.',
      ] },
      { title: 'Pátio', items: [
        'Modo editor: arrastar um item da paleta (arma, instrumento, esportivo, habilidade, magia, chave ou gaiola) para cima de um baú do Pátio coloca o item dentro do baú, com 100% de chance de sair. Enquanto o item está sobre o baú, o baú acende e aparece o ícone de inserir no ponteiro. Fora de um baú, o item continua virando suporte.',
        'A rodinha do mouse inverteu: rolar para cima vai ao Próximo item e para baixo ao Item anterior.',
        'Segurar Alt (o bind Edição) para abrir ou fechar o painel do Modo editor agora leva 0,75 s, metade do tempo de antes.',
        'Trocar de Pátio agora é uma mudança completa de mundo: o Pátio em que você estava é fechado e nada dele aparece no novo. Antes, aliens, zumbis, pássaros, tiros e outras coisas do Pátio anterior continuavam no Pátio aberto (um Pátio novo vazio aparecia com aliens). Vale no modo local e no online, por qualquer caminho: Playgrounds, Próximo / Anterior, Pátio novo, portal para outro Pátio.',
        'Para o Pátio novo vão só os bonecos, o inventário de cada um e as gaiolas com as almas dentro. As almas que estavam soltas saem do portal junto com o dono.',
        'Ao entrar em qualquer portal, as almas soltas do boneco são sugadas junto com ele e saem com ele do outro lado.',
        'No online, você vê o boneco de outro player e as almas dele sendo sugados para o portal, e surgindo do portal de chegada.',
        'A animação de entrar e sair de um portal dura 0,2 s a mais (0,95 s).',
        'O Arco agora é manuseado como um arco de verdade: a asa de trás segura o arco parado, à frente do corpo, e a asa da frente segura a flecha na corda. Ao segurar Atirar, a asa da frente puxa a flecha para trás e a corda dobra junto; ao soltar, a corda volta e a flecha sai. Sem flechas ou recarregando, a corda fica vazia.',
        'Em Itens → Pontos, o arco e a flecha aparecem como desenhos separados e há a caixa “Arco e Flecha”, que liga esse manuseio. O ponto Asa é onde a asa da frente segura a flecha (a flecha e a corda acompanham o ponto), o ponto Asa de trás é onde a outra asa segura o arco, e a barra “Puxada da flecha” define quanto a flecha recua com a carga cheia (linha tracejada no desenho).',
        'Itens → Combo: cada golpe do combo ganhou três ajustes, além da direção e do ângulo: duração (em vezes a Duração do giro do item, para golpes mais lentos ou mais rápidos), cooldown (tempo em que o próximo golpe fica bloqueado, para não dar golpes sem parar) e alcance (em vezes o alcance do item). Os cinco controles seguem a ordem do título da lista (Direção / Ângulo / Duração / Cooldown / Alcance), ficam numa linha só quando cabem e quebram a linha sozinhos quando o painel é estreito.',
        'O ângulo de cada golpe do combo agora é uma bolinha que mostra a fatia coberta: clique e arraste para os lados ou para cima e para baixo para mudar, como um knob. O número aparece pequeno ao lado.',
        'Abaixo de “Janela do combo” há uma barra fina que enche a cada golpe e esvazia durante a janela, para ver o tempo que resta para continuar a sequência. Ela só funciona com o painel Itens aberto.',
        'Nova direção de golpe “Relativo à mira”, nos golpes do combo e no Movimento do golpe forte: com a mira acima do horizonte o golpe sai para cima, e com a mira abaixo, para baixo.',
        'O painel Volume ganhou o botão Mute, à esquerda de Padrão: silencia todo o som do Pátio (e os cacarejos e o portal no globo) sem mexer nos volumes. Com ele ligado os sliders ficam cinza, mas continuam ajustáveis, e os valores voltam a valer ao desligar.',
        'Armas e instrumentos de rajada (como o Trompete) agora disparam só enquanto Atirar está segurado: soltar no meio interrompe a rajada, então você escolhe quantos tiros ou notas saem. Um toque rápido solta um só. Segurar até o fim dispara a rajada inteira, como antes. No painel Itens, em Disparo, a opção “Rajada só enquanto segura Atirar” aparece nos itens em modo Rajada e vem ligada; desligada, um aperto volta a disparar a rajada inteira. Vale no Parquinho, no Templo e na Vila, local ou online.',
        'No Modo editor, arrastar uma zona sonora, um portal ou qualquer outro elemento por um tempo não gera mais o erro “Maximum update depth exceeded”: os portais do Pátio deixaram de se redesenhar a cada passo do arraste.',
      ] },
      { title: 'Partida', items: [
        'Quando você está perdendo por mais de 1 peão, um lance da lista Best continua pagando 3 ovos, mas agora conta na sequência de Best e nunca dobra. Antes ele entrava na sequência de Worst, e a partir do terceiro lance premiado seguido todo Best e todo Worst pagava 6 ovos, sem parar. Os 6 ovos voltam a exigir três Worst de verdade seguidos. Vale na campanha, para os ChickenBots e no online.',
        'Preferências da partida ganhou “Match log”, com o botão Copy: copia o histórico completo da partida, uma linha por acontecimento, com cada lance (posição, lances possíveis, listas Best e Worst com os scores, classificação, sequência e ovos pagos), Freeze e Shield, Undo, Redo, Mulligan e cada vez que as setas foram abertas. Serve para colar numa conversa ao relatar um bug. Vale na campanha e no online.',
        'Um rei não pode mais ir para uma casa que uma peça adversária congelada alcançaria, nem descobrir essa ameaça movendo outra peça. Antes, o adversário (inclusive o bot) podia congelar o seu rei e encostar o rei dele ao lado; quando os poderes se desfaziam por falta de jogadas, os dois reis ficavam vizinhos. Vale na campanha, contra os bots e no online.',
      ] },
    ],
  },
  {
    version: '2.10.1',
    date: '14/11/2026',
    title: 'Correções do Pátio com zoom: nuvens grandes inteiras e prévia do arraste no tamanho certo',
    groups: [
      { title: 'Pátio', items: [
        'Nuvens Suaves com Tamanho acima do normal não aparecem mais cortadas retas no topo.',
        'Com a câmera no alto do Pátio, nuvens e cenário com profundidade não somem mais antes de sair da tela.',
        'No Modo editor, ao arrastar uma casa ou árvore para o Pátio com zoom diferente de 100%, a prévia aparece do tamanho que o elemento terá ao ser solto, em vez de gigante (ou pequena).',
      ] },
    ],
  },
]

export const CHANGELOG = [...RECENT, ...CHANGELOG_ARCHIVE]
