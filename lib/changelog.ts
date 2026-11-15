export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.11.0',
    date: '15/11/2026',
    title: 'Gaiolas no Pátio: as almas ficam em gaiolas de seis modelos, até três por jogador; trocar de Pátio agora troca o mundo inteiro; Best em posição ruim não dobra mais para 6 ovos; botão para copiar o histórico completo da partida; arco e flecha puxado como de verdade no Pátio; combos do Pátio com duração, cooldown e alcance por golpe e golpe relativo à mira; Mute no painel Volume do Pátio; rajada só enquanto segura Atirar; rei não pode mais encostar numa peça congelada; Modo editor do Pátio sem travar ao arrastar elementos',
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
        'Limites desta primeira parte: no Pátio online as gaiolas do chão são de cada navegador, e os contadores dos outros jogadores só aparecem depois que o servidor de jogo for atualizado.',
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
  {
    version: '2.10.0',
    date: '13/11/2026',
    title: 'Pátio Training room e Quadro de lousa; portais para outro Pátio e gerador de Pátio novo; postes presos ao fundo; Martelo de Thor e Cajado de Odin; fase Marseille 1997 · Orchestral rap na campanha Classical; qualidade gráfica e sonora com ajuste automático; Baú no Modo editor e Bag of souls',
    groups: [
      { title: 'Qualidade e desempenho', items: [
        'Preferências (no globo, na partida, no online e no Criativo) e o painel Camadas do Pátio ganham “Qualidade e efeitos gráficos” e “Qualidade e efeitos sonoros”, cada um com Alta, Média e Baixa. No primeiro acesso os dois níveis vêm da capacidade do aparelho; depois, a escolha fica salva neste navegador e vale em todos os modos.',
        'Abaixo deles, “Ajustar automaticamente” vem ligada: em qualquer aparelho, inclusive computador, quando o jogo trava por vários segundos a qualidade gráfica desce um nível, e quando a música atrasa ou falha a qualidade sonora desce um nível, com um aviso curto. Ela nunca sobe sozinha; desligar e religar a caixa volta aos níveis do aparelho.',
        'Gráficos em Baixa: o jogo roda a 30 quadros por segundo e o cenário do Pátio fica parado (árvores, pétalas, lanternas, nuvens e neve). Sons em Baixa: os loops tocam sem reverb e com menos fontes simultâneas. Média é o que os celulares já usavam, e Alta, o que os computadores já usavam. As notas e o arranjo são os mesmos nos três níveis.',
        'Trocar o nível sonoro com a música tocando vale na hora e pode cortar uma vez as caudas que estavam soando.',
        'A música pesa bem menos no aparelho, em todos os modos: o agendador passou a consultar cada instrumento uma vez por compasso, e os painéis usam a mesma consulta. Num celular mediano emulado com 32 peças tocando, as fases mais densas (Paris 1945, New York 1930, San Diego 1999) deixaram de perder notas e foram de 11 a 18 para cerca de 45 quadros por segundo. As notas e o arranjo são os mesmos.',
        'Com o Contador de FPS ligado e algum som do jogo tocando, ele mostra também “atrasos” (vezes em que o agendador da música chegou atrasado) e “falhas” (cortes na saída de áudio contados pelo navegador), somados desde a abertura da página. Servem para dizer, no seu aparelho, se a música está travando e por quê.',
      ] },
      { title: 'Classical', items: [
        'Nova fase Marseille 1997 · Orchestral rap, a sétima da campanha: violinos em lamento, cravo recortado, violoncelos em spiccato e piano tirados de um "disco" clássico, em loop sobre um breakbeat empoeirado com o swing do sampler, baixo sub, scratches do DJ e orchestra hits.',
        'A música tem forma completa: o disco começa sozinho com piano e chiado de vinil e os instrumentos entram um a um; o refrão abre com violino solo, coro e trompas; o interlúdio é um coral suave; a quebra junta a orquestra inteira nos mesmos acentos; o solo de violino barroco conversa com o scratch.',
        'Os lances da partida levam a cada parte, como nas outras fases: refrão no primeiro roque, quebra no xeque, interlúdio ao perder a dama e final no mate.',
        'A cidade tem foto do Vieux-Port, texto de abertura e descrição no mapa.',
      ] },
      { title: 'Pátio', items: [
        'Novo Pátio de exemplo em Destaques, Training room: 15 estações em sequência, do andar e correr ao pulo chocando no ar, cada uma com as plataformas, caixas, paredes, buraco ou trampolim que o movimento pede. No fim, um portal leva de volta ao começo.',
        'Novo elemento Quadro de lousa (grupo Treino do Modo editor): uma lousa verde com o texto que você escrever em giz branco. Em Editar, escolha o texto e, se quiser, um movimento para o fantasma.',
        'Com um movimento escolhido, ao chegar perto da lousa aparece uma galinha fantasma, branca e meio transparente, repetindo a sequência de botões do movimento; ela some quando você se afasta. Escolher o movimento já escreve os botões na lousa.',
        'No Modo editor, a paleta de Portais ganha “Portal para outro Pátio”: um portal sozinho que leva ao Pátio escolhido no painel Editar (o Pátio padrão, os seus, os favoritos, os em destaque ou os deste navegador). Um portal de um Par de portais também pode trocar o Destino para “Outro Pátio”.',
        'Ao entrar num desses portais, todos os players locais são sugados por ele e saem do portal de entrada do outro Pátio.',
        'Se o Pátio do destino não existe mais, a galinha volta pelo mesmo portal e aparece “Este pátio não existe mais...”. O portal continua lá, e o painel Editar dele avisa quem edita para escolher outro destino.',
        'Gerador de Pátio novo: “Pátio novo” no Destino do portal cria um Pátio e já liga o portal a ele, sem sair de onde está; no Playgrounds, “Novo Pátio do zero” substitui “Novo Pátio vazio”. Há duas opções: Empty (só o portal de entrada) e Basic biome (chão com morros, árvores, moitas, pedras e árvores ao fundo, sorteados num bioma de campo, pinheiral, neve ou deserto), com o slider Densidade, de Desmatado a Floresta.',
        'No Editar de um poste ou torre, Camadas do fundo lista as camadas do cenário ao longe (céu, nuvens, cada cordilheira e as matas). Apontar uma mostra só ela; escolher prende o poste num ponto fixo dela, de pé na crista da montanha ou no chão da mata, e daí ele anda junto com a camada em qualquer tela. Os fios até uma torre mais perto acompanham, dando a profundidade da linha indo para o fundo. Escolher de novo solta, mantendo a profundidade.',
        'Nos fios dos postes e torres, Chocar + Pulo põe a galinha pendurada de cabeça para baixo debaixo do fio, e de volta em cima, como nas caixas, em vez de atravessar o fio. Pendurada, ela anda pelo fio e passa para o seguinte no poste; Pulo para o lado contrário e subir com Cima também a penduram.',
        'O painel Itens abre já na arma ou no instrumento que a sua galinha está segurando; de mãos vazias, abre na Bicada.',
        'Novo elemento Baú (grupo Baús do Modo editor), simples ou lendário: o simples brilha num amarelo suave, o lendário num azul mais forte. Perto dele, Pegar abre: a tampa sobe, sai um facho de luz e os itens pulam para fora.',
        'Em Editar, “Abre com” escolhe Livre, Chave (gasta uma chave do inventário) ou Merecimento (pede um mínimo de almas na Bag of souls, que continuam lá). Sem o que ele pede, o baú treme e diz o que falta; de perto, ele já mostra o que pede.',
        'Os itens do baú são uma lista: cada linha é um item específico ou um sorteio (qualquer item, uma arma, um instrumento, um esportivo, uma habilidade especial, um item de magia ou uma chave), com a sua chance em %. “Fecha de novo após” deixa o baú abrir outra vez, com novo sorteio; com 0, ele fica aberto.',
        'No Pátio online, abrir um baú abre para todos, com a tampa, a luz e o som; os itens saem para quem abriu. Quem entra depois vê os baús que já estão abertos.',
        'Novo item Chave: fica em pilha (até 9) no grupo Utilitário do inventário e entra em suportes (paleta Chaves), Item solto e baús.',
        'O contador de almas ao lado do avatar passa a se chamar Bag of souls.',
        'Itens → Combo: cada golpe da sequência agora tem dois seletores, a direção (para baixo, para cima, horizontal ou giro) e o ângulo que ele cobre. Dois golpes na mesma direção podem ter ângulos diferentes. Os ângulos já vêm iguais aos de antes, e combos ajustados neste navegador mantêm os arcos que tinham. “Arco para cima” e “Arco horizontal” saem do painel.',
        'Montanhas bem altas (Inclinação e Altura no máximo) não têm mais o topo cortado numa linha reta: os picos sobem o quanto a configuração pedir e só a moldura do Pátio os corta. O brilho de um sol alto, a lua e as estrelas mais altas também deixam de ser cortados.',
        'Configurações do Pátio ganham a categoria Aurora: cortinas de luz no céu, atrás das nuvens e das montanhas, com Intensidade (0 = desligada, como em todo Pátio até agora), Cor e Cor do alto, Faixas, Largura, Altura dos raios, Altura no céu, Ondulação, Raios, Movimento e Só à noite (ligado, ela aparece com o céu escuro e some de dia, como as estrelas). Sortear forma desenha outras cortinas e Padrão tira a aurora.',
        'A aurora segue a qualidade gráfica: em Alta balança e cintila, em Média só balança e em Baixa fica parada.',
      ] },
      { title: 'Martelo de Thor e Cajado de Odin', items: [
        'Dois itens novos de magia, no grupo Utilitário do inventário. No Modo editor, os suportes ficam na paleta Magia; também podem entrar como Item solto.',
        'Choque em cadeia: o golpe que acerta alguém dá choque nele e o raio pula, um por vez, para aliens, zumbis, mortos-vivos e bonecos de treino por perto, ramificando. Cada atingido treme, fica parado por um instante e perde um pouco da barra de harmonia. O Cajado alcança mais longe e pula mais vezes que o Martelo.',
        'Estado de choque: quem leva choque pisca em raio-x, com o corpo escuro e o esqueleto aparecendo no meio. Quanto mais forte o choque, mais rápido pisca e mais treme.',
        'Especial: o primeiro golpe que acerta depois de 12 s sai mais forte, alcança mais alvos, causa mais dano e deixa todos em raio-x por cerca de 3 s. No Martelo cai um raio do céu com trovão e clarão; no Cajado saem arcos longos com estalo de raio.',
        'O fundo do slot do item fica azul quando o especial está pronto e, depois de usado, volta a encher de baixo para cima. É separado das barrinhas de munição.',
        'Martelo de Thor: Atirar arremessa o martelo em linha reta e ele volta para a asa. Segurar carrega para ir mais longe e bater mais forte, e um toque rápido já sai com metade da distância. Uma linha pontilhada mostra até onde ele vai. Ele acerta e dá choque na ida e na volta.',
        'O arremesso do Martelo agora faz curva: sem mexer a mira ele vai por cima da linha da mira e volta por baixo, em laço. Com ele no ar, girar a mira puxa a curva para esse lado, na ida e na volta, e quanto mais longe a mira, mais ele dobra. Em Itens → Arremesso que volta, Curvatura mínima (0 = vai e volta reto, como antes) e Curvatura máxima.',
        'Cajado de Odin: Golpe dá o golpe rápido, com choque curto; Atirar carrega o golpe forte, com choque mais longo e de maior alcance.',
        'Em Itens, os grupos Choque, Especial e Arremesso que volta ajustam alcance, saltos, tempos, danos e intervalo.',
      ] },
    ],
  },
]

export const CHANGELOG = [...RECENT, ...CHANGELOG_ARCHIVE]
