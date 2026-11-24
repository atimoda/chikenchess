export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.17.0',
    date: '24/11/2026',
    title: 'Pátio: Golpe desenhado; estilos prontos na Zona; brilho dos itens com uma cor por grupo; luneta da Sniper; recuo no ar em todas as armas e instrumentos; caminhada lenta pelo analógico; Perfil e Amigos como abas no título do Vestiário; Pátio abre com “Carregando…” em vez da versão antiga; Gerar de MIDI com a música inteira; inventário do celular em pé alinhado; Baixo + Pulo e diagonais para trocar de bloco na Grade; abas no Modo editor e painel fixo em cima ou embaixo; balão do chat no lugar com zoom; câmera acompanha o boneco sugado pelo portal e corre entre os portais de um par; zoom até 800% e Full Size',
    groups: [
      { title: 'Pátio: Golpe desenhado', items: [
        'O golpe do clique direito do mouse agora sai ao soltar o botão, não mais ao apertar. Um clique simples dá o golpe do combo na hora, mirado no ponto clicado; se o ponto estiver longe, ela também anda até lá (com Clique direito: point and click ligado no item), sem esperar chegar para golpear. Saíram o golpe adiado até o destino e o golpe na hora quando algo encostava nela.',
        'Clicar com o botão direito e arrastar em volta da galinha desenha o golpe: enquanto segura, uma linha fina mostra o desenho, e ao soltar a asa refaz o mesmo movimento, nos mesmos ângulos e na mesma velocidade, com um rastro que segue o desenho. Cada coisa por onde a asa passa é atingida na hora em que ela passa.',
        'Com um instrumento na asa, cada nota por onde o golpe passa toca o som de golpe daquela nota, no momento em que é alcançada.',
        'No celular: tocar no Punch dá o golpe do combo como antes; arrastar o Punch para fora do círculo desenha o golpe a partir de onde ela mira. Arrastar o dedo na tela perto dela também desenha, a partir do ponto tocado; um toque sem arrastar continua atirando ali.',
      ] },
      { title: 'Pátio: céu até o teto nos Pátios altos', items: [
        'Num Pátio com Altura limite acima do padrão (até 8000), o céu agora vai até o teto do mundo, em vez de ficar preto a partir de certa altura. A passagem para a cor do alto sobe junto, como num Pátio de altura padrão.',
      ] },
      { title: 'Pátio: Training room refeito', items: [
        'O Training room agora ensina 21 movimentos em três seções: Básico, Paredes e teto e Chocar. Cada estação tem a lousa com os botões e o fantasminha que faz o movimento quando você chega perto.',
        'No fim, a seção Combate e itens: uma lousa para pegar e trocar itens, com uma Flauta e uma Pistola nos suportes, e outra para atirar, tocar, golpear e arremessar, com três alvos de treino.',
        'Movimentos novos na lousa (e no Fantasma do Quadro de lousa no Modo editor): Trocar de lado na caixa, Fios do poste, Chocar, Pulo chocando na parede, Pulo chocando no teto e Chocar agarrada.',
        'Ao lado da entrada, portais levam direto ao começo de Paredes e teto, de Chocar e de Combate e itens; no começo de cada seção, um portal volta à entrada.',
      ] },
      { title: 'Painéis: Reverter para o padrão', items: [
        'Todo painel com Salvar no game agora termina com o botão Reverter para o padrão, logo à esquerda do Salvar no game: Personagem, Ajustes, Câmera de Mira, Controles, Configurações do Pátio, Camadas, Volume, Escalas, Itens e Biblioteca de almas. O ícone de seta circular do cabeçalho saiu.',
        'Reverter para o padrão volta todos os campos do painel, de modo que um Salvar no game logo depois não tem nada a gravar. Configurações do Pátio agora volta também céu, montanhas, floresta, prédios, nuvens, neve, aurora, zoom, Zonas das cenas, Fundo da Vila e brilho dos itens; Escalas e Itens voltam todas as escalas e todos os itens.',
        'Personagem: Reverter para o padrão volta à versão salva no game, então reverter e salvar logo depois não lista nada e nenhum parâmetro fica amarelo (antes Controle no ar e Multiplicador da corrida do Ken e Espalhada dos itens do Pig ficavam). O padrão dos Kids no código também passou a ser o salvo (cabeça, corpo e 3 instrumentos, 3 armas e 3 utilitários).',
        'Kids: a regra Não pega bastões nem armas de golpe vem desligada, então os Kids pegam qualquer item, inclusive Taco, Passaguá, Boomerang, Corrente-gancho, Martelo de Thor, Cajado de Odin e baralhos, até o limite de cada categoria.',
        'Personagem: a seta do cabeçalho virou Desfazer a última alteração. Ela desfaz uma alteração por vez (arrastar um knob conta como uma) e fica apagada quando tudo volta ao que está salvo no game.',
        'Câmera de Mira e Ajustes: o Salvar no game de cada um grava só os seus campos.',
      ] },
      { title: 'Pátio: painel Grade de blocos', items: [
        'O painel Grade de blocos ganhou Salvar no game (admin) e Reverter para o padrão no fim. Os ajustes salvos no game, menos ligar a grade, viram o padrão de todo Pátio novo e de todo Pátio que ainda não tinha a sua grade. Reverter volta os ajustes ao padrão e deixa a grade ligada ou desligada como estava.',
        'Em cima do painel, três botões lado a lado no lugar da caixa e dos dois botões de antes: Ligar/Desligar, Resetar e Números. Ligar/Desligar e Números ficam amarelos enquanto ligados; com a grade desligada, Resetar e Números ficam apagados.',
      ] },
      { title: 'Pátio: trocar de bloco na Grade', items: [
        'No chão de uma sala com outro bloco fechado embaixo, Baixo + Pulo agora passa para o bloco de baixo, como Chocar + Pulo, em vez do super pulo. Sem bloco fechado embaixo, ou com uma direção junto, continua o super pulo.',
        'Com Cantos em octógono e vão: em pé na rampa de baixo por dentro de uma sala, Baixo + Pulo passa para o bloco da diagonal de baixo; pendurada no teto inclinado de cima, Cima + Pulo passa para o bloco da diagonal de cima. Só quando há um bloco fechado naquela diagonal.',
        'A hit-area de cada pose agora vale para os vãos entre blocos: com a caixa de Agachado ou de Chocando mais baixa que o vão, o boneco passa agachado ou chocando, e lá dentro continua nessa pose até sair. Paredes e tetos duros também medem o boneco pela caixa da pose em que ele está.',
        'Quem sai de uma sala sem trocar de bloco (atravessando uma parede por um objeto que cruza a grade, por um empurrão ou por um bug) e vai parar no vão entre os blocos passa a ver a grade do lado de fora.',
      ] },
      { title: 'Pátio: estilos prontos na Zona', items: [
        'O primeiro dropdown do painel da Zona (e da Zona da cena), agora Estilo, traz além das cenas um estilo pronto para cada ritmo: Pop, Balada, Rock, Disco, Funk, Jazz, House, Techno, Trap, Boom bap, Bossa nova, Samba, Baião, Reggae, Reggaeton, Afrobeat e Pulso. Escolher um preenche o bloco inteiro: tom, escala, acordes, progressão, BPM, batida e baixo.',
        'O dropdown mostra o estilo que a zona ainda tem e volta a “Escolher estilo…” quando algo muda. Nova progressão I vi ii V (samba).',
        'As seções do painel (Blocos, Harmonia, Ritmo, Baixo, Gravidade, Notas e regras) abrem e fecham pelo título amarelo, como no painel Personagem. Corpos virou a seção Gravidade.',
      ] },
      { title: 'Pátio: brilho dos itens', items: [
        'O brilho dos itens no chão agora tem uma cor por grupo: armas em roxo, utilitários (esportivos, magia, chaves, itens da Grade de blocos e gaiolas) em azul, consumíveis (Bear Gummy, Cok) em verde e instrumentos no dourado de antes.',
        'Em Configurações do Pátio, embaixo do slider Brilho dos itens, um quadrado de cor para cada grupo (Instrumentos, Armas, Utilitários, Consumíveis) muda a cor daquele grupo. Pátios que já tinham uma cor escolhida a mantêm nos instrumentos.',
      ] },
      { title: 'Vestiário: Perfil e Amigos no título', items: [
        'Perfil e Amigos saíram da fileira das partes do boneco e viraram abas no título do painel, ao lado de Vestiário. Cada aba troca o conteúdo do próprio painel (o seu perfil, ou a lista de amigos com Invite), sem abrir outra janela por cima; Vestiário volta para o boneco.',
      ] },
      { title: 'Pátio: abrir sem versão antiga e sem dicas piscando', items: [
        'Ao abrir um Pátio (o padrão inclusive), aparece “Carregando…” até chegar a versão salva no servidor, em vez de mostrar por alguns segundos a cópia antiga guardada no aparelho e depois trocar. Sem conexão, ou se o servidor demorar mais de 6 s, a cópia do aparelho aparece como antes.',
        'Os balões de dica dos alvos de treino não piscam mais na tela durante o carregamento do Pátio: só aparecem quando o alvo é destruído.',
      ] },
      { title: 'Pátio: Gerar de MIDI com a música inteira', items: [
        'Arquivos MIDI com mensagens de sistema (SysEx, como o reset General MIDI que muitos arquivos trazem no começo) eram lidos errado: as notas das faixas depois da mensagem iam parar milhares de compassos adiante, e a música gerada tinha só os aliens do começo. Agora a leitura confere com a de outros programas em 18 MIDIs reais testados.',
        'As faixas dividem os lugares: uma bateria constante não toma mais todas as notas da dificuldade. Num MIDI completo com bateria, o Médio que gerava cerca de 25 aliens só de bumbo e caixa agora gera mais de 200, com melodia, baixo e acompanhamento.',
        'Músicas longas nas dificuldades altas não perdem mais o final: quando passariam de 400 aliens, as notas são agrupadas em aliens maiores em vez de cortar o fim.',
      ] },
      { title: 'Pátio: inventário no celular em pé', items: [
        'No celular em pé, a fileira de itens do 1º player no alto da tela segue o alinhamento de Controles → Inventário, como a barra de baixo do desktop e do tablet. No padrão (Separado), os instrumentos ficam encostados na borda esquerda e as armas e os utilitários ficam à direita, junto do avatar; Centralizado, Esquerda e Direita também valem. O nome do item escolhido aparece embaixo da casa dele.',
      ] },
      { title: 'Pátio: recuo no ar ao atirar', items: [
        'Todas as armas e instrumentos agora empurram para trás quem atira no ar, a cada tiro ou nota, no sentido contrário ao da mira. No chão nada muda.',
        'Os sopros são os que mais empurram: Trompete (agora com um terço da força de antes), Flauta e Sax. Depois vêm Teclado, Violão, Violino (enquanto o arco toca), Harpa de Lira, Pandeiro e Hangdrum; entre as armas, Lança-foguetes, Escopeta e Sniper empurram mais, Pistola, Rifle, Arco, Granada e Submetralhadora bem pouco.',
        'Tiros carregados (Arco, Harpa de Lira, Granada) empurram conforme a carga. A força de cada item fica em Itens → Manuseio → Recuo no ar; quem já tinha mudado esse valor mantém o seu.',
      ] },
      { title: 'Pátio: mira treme ao atirar recarregando', items: [
        'Apertar Atirar enquanto a arma ou o instrumento recarrega faz a mira dar uma tremidinha rápida, além do clique, mostrando que o tiro não saiu.',
      ] },
      { title: 'Analógico de movimento: caminhada lenta e profundidade da mira', items: [
        'Empurrar o analógico de movimento (gamepad ou celular) menos de 80% faz a galinha caminhar devagar; empurrado até o fim, ela anda na velocidade normal. Correr, as setas, o teclado e o direcional do gamepad continuam na velocidade normal.',
        'A velocidade da caminhada lenta é ajustável em Controles → Analógicos (“Caminhada lenta”, padrão 0,5x).',
        'Quando o analógico de mira não está em uso, o quanto o analógico de movimento está empurrado aproxima ou afasta a mira do boneco. Usando o analógico de mira, é ele quem decide a distância, como antes.',
      ] },
      { title: 'Controles de toque: arrastar o Pular', items: [
        'Um dedo que encosta no Pular e arrasta empurra o analógico de movimento, como já fazia o Correr. Só vale para toques que começam no Pular: chegar nele arrastando do Correr ou do Chocar não muda nada.',
      ] },
      { title: 'Pátio: luneta da Sniper', items: [
        'Segurando Atirar com a Sniper, ela mira pela luneta: a câmera avança na direção da mira e se afasta, mostrando mais longe, sem tirar a galinha da tela. Soltar atira e a câmera volta.',
        'Uma lupa redonda aparece na ponta da mira e aumenta os aliens, zumbis, bonecos, itens e tiros que estão embaixo dela, para acertar com mais precisão.',
        'No analógico e nas setas, a retícula vai mais longe enquanto mira; com o mouse ela continua no cursor.',
        'Itens → Luneta: ligar a luneta em qualquer arma ou instrumento e ajustar o tempo para mirar, quanto a câmera avança e afasta, a distância da retícula e o tamanho e o aumento da lupa. Cada arma guarda os seus números. Só a Sniper vem com a luneta ligada.',
      ] },
      { title: 'Galinha: trocar de fio no cruzamento', items: [
        'Andando em cima de um fio de poste ou torre, segurando Cima junto com a direção, ao passar por outro fio que cruza o seu ela muda para o que sobe mais para aquele lado, como ao subir numa parede. Segurando Agachar com a direção, muda para o que desce mais. Sem Cima nem Agachar, continua no mesmo fio.',
      ] },
      { title: 'Pátio: abas no Modo editor e balão do chat', items: [
        'O topo do painel do Modo editor virou uma fileira de abas: Elementos (os cartões para arrastar), Zonas, Camadas, Grade, Pátio e Câmera. Com a edição ligada, a aba escolhida fica com a borda verde e mostra o seu painel logo abaixo, dentro do Modo editor: Camadas, Grade de blocos, Configurações do Pátio e Câmera de Mira; Zonas liga a camada das zonas e mostra o slider dela e os elementos de Música.',
        'Clicar na aba de um painel que já está aberto solto fecha o solto e abre o painel dentro da aba. Abrir pelo cabeçalho o painel da aba que está aberta volta a aba para Elementos.',
        'Com a edição desligada, os cartões continuam à mostra e os botões abrem e fecham os painéis soltos, como os do cabeçalho; Zonas liga e desliga a camada. As abas passam para a linha de baixo quando o painel fica estreito.',
        'Com o Modo editor fixo na lateral e a edição ligada, dois cliques num elemento ou numa zona abrem o painel dele numa aba nova do Modo editor, com o nome do elemento, em vez de cobrir o painel inteiro. O mesmo vale para Camada e colisões, casas, árvores e a Zona da cena. A aba some ao escolher outra aba ou ao tirar a seleção, e volta a aba que estava antes.',
        'O painel fixo do Modo editor pode ficar em cima (logo abaixo do cabeçalho, que continua no topo) ou embaixo, além de à direita: com ele fixo, botões Fixar em cima, Fixar embaixo e Fixar à direita no título; o do lado atual solta o painel. Em cima e embaixo, a divisória muda a altura. O Pátio, a câmera, o zoom, a mira e os cliques passam a usar só o espaço que sobra.',
        'O balão do chat volta a ficar em cima da cabeça da galinha com qualquer zoom da câmera, inclusive com o Modo editor fixo na lateral.',
      ] },
      { title: 'Pátio: câmera vai junto para o portal e zoom até 800%', items: [
        'Quando a galinha é sugada por um portal longe da tela (ao trocar de Pátio, por exemplo), a câmera desliza junto com ela até o portal, na mesma curva, em vez de ficar parada onde ela estava. Com o portal já à vista, a câmera não se mexe.',
        'Num par de portais do mesmo Pátio, a câmera corre do portal de entrada até o de saída enquanto a galinha sai dele, em vez de pular de uma vez, mostrando onde fica um portal em relação ao outro.',
        'Ao trocar de Pátio e nos pares de portais, o boneco agora entra e sai no lugar certo do anel com qualquer zoom e com o Modo editor fixo em cima.',
        'Configurações do Pátio → Zoom: o ponto da direita agora vai até 800% (antes 400%), e a ponta esquerda, que afasta até o Pátio inteiro caber na tela, passou a se chamar Full Size.',
      ] },
    ],
  },
  {
    version: '2.16.0',
    date: '23/11/2026',
    title: 'Pátio: Praça dos Portais como novo Pátio padrão, Sala de armas e instrumentos, Grid com loot e Arquipélago das Almas; prêmio para quem vence a música da Jukebox ou da Vitrola; Novo Pátio vazio por padrão; andar até o ponto clicado, golpe do clique direito e Golpe que só pega o item',
    groups: [
      { title: 'Pátio: Praça dos Portais e novos Pátios de exemplo', items: [
        'Praça dos Portais: o novo Pátio padrão, um menu do jogo. Na praça ficam os portais para o Training room, a Sala de armas e instrumentos, o Grid com loot e o Arquipélago das Almas, e, em plataformas no alto, os portais para Campo minado, Vales e ilhas no céu e Pôr do sol com torres. O Pátio padrão de antes continua em Destaques.',
        'Sala de armas e instrumentos: uma sala branca sem fim com todos os itens do jogo em prateleiras (armas, instrumentos, esportivos e magia, especiais e chaves, gaiolas), cada um voltando ao suporte 1 s depois de pego, os instrumentos fixos (Harpa, Bateria, Piano de cauda) e um estande de bonecos de treino no fim.',
        'Grid com loot: a Grade de blocos ligada no mundo todo, sem bombas. Os blocos abrem com música e dano, um terço deles nasce com até 3 itens numa prateleira e um quinto toca um ritmo. Três blocos livres no chão para nascer, cada um com um portal de volta à praça.',
        'Os três ficam em Destaques, com a conta admin como criador, e podem ser editados no Modo editor.',
      ] },
      { title: 'Pátio: Arquipélago das Almas', items: [
        'Arquipélago das Almas: um Pátio de exemplo grande, inspirado em Deadlock, para até 13 players. Duas bases nas pontas (Galinheiro e Chiqueiro), cada uma com três portais de nascimento (no chão, na ilha do meio e na ilha alta), Gaiolas e uma loja de Baús que abrem com almas.',
        'Três faixas de base a base: a de baixo no chão, sob os fios de uma linha de postes, e duas de ilhas flutuantes ligadas pelos fios das torres de energia (dá para andar por cima e se pendurar por baixo). Entre elas, ilhotas com trampolins, Baús que podem ter chave e botões de hordas.',
        'Cada região tem seu bioma, sua música e seus itens: deserto com armas de fogo, vulcão com explosivos, floresta com arco e bumerangue, neve com sniper, jardins e feira no céu com instrumentos.',
        'No centro, quatro lugares empilhados (arena, Coração, Santuário e o Altar da Lua, com a gravidade da Lua), cada um com uma Jukebox ou Vitrola que dá chave e itens especiais a quem vence a música, e Baús lendários que só abrem com chave.',
      ] },
      { title: 'Pátio: prêmio da Jukebox e da Vitrola', items: [
        'Jukebox e Vitrola ganharam no Editar a lista “Prêmio ao vencer”, igual à dos itens do Baú (itens ou sorteios, cada um com a sua chance). Vencendo a música pedida por elas, os itens do prêmio pulam de cima delas. Vazia por padrão.',
      ] },
      { title: 'Pátio: Novo Pátio', items: [
        'Playgrounds tem um botão só, “Novo Pátio”, que abre o gerador já em Empty (sem bioma). Basic biome continua como opção. O botão “Novo Pátio padrão” saiu. O Destino “Pátio novo” dos portais também começa em Empty.',
      ] },
      { title: 'Pátio: andar até o ponto clicado', items: [
        'Agachar, Correr e Chocar não cancelam mais a caminhada até o ponto clicado (ou tocado, ou até o botão de um portal): ela continua indo para lá, agachada, correndo ou chocando. Esquerda, direita, olhar pra cima e Pular continuam parando a caminhada.',
        'Ela para em cima do ponto clicado em vez de passar dele, inclusive correndo.',
        'Soltar Chocar no meio da caminhada não a deixa parada chocando: ela segue andando. Com velocidades de chocar ou de agachar em 0 ela espera parada enquanto o botão está apertado e volta a andar ao soltar.',
      ] },
      { title: 'Pátio: golpe', items: [
        'Clicar com o botão direito longe da galinha fazia ela andar até o ponto antes de golpear. Agora, se nesse instante um boneco (inimigo, boneco de treino ou outro player) ou um projétil já estiver encostando nela, o golpe sai na hora, sem andar.',
        'Golpe em cima de um item (encostado na galinha) só pega o item, sem o movimento do golpe, quando não há inimigo ao alcance do golpe. Com um inimigo ao alcance, ou com o item só ao alcance do golpe, o golpe sai e pega o item como antes.',
        'Pendurada de cabeça para baixo ou agarrada numa parede, a área em que ela pega itens gira junto com ela: pendurada sob uma caixa, não pega mais os itens nem abre os Baús que estão em cima dela.',
        'A área de acerto dos itens no chão ficou 33% maior.',
      ] },
      { title: 'Pátio: cantos dos passarinhos', items: [
        'Os passarinhos (o alien convertido e o morto-vivo que volta como pássaro) assobiam com gravações reais da ave deles (pardal, bem-te-vi, sabiá, canário-da-terra, coruja-buraqueira) no lugar do piu do sintetizador. A nota que eles lançam e que dá para rebater continua igual.',
        'O piu do sintetizador saiu das notas das almas: cada ave toca as notas numa voz da família dela (flauta, harpa, sinos, pizzicato ou zumbido). Só o quero-quero e a saíra-sete-cores, que aparecem pouco, ainda piam.',
        'As almas soltas cantam o canto real da ave delas com mais frequência (40% a cada volta do relógio, antes 15%, e podem repetir depois de 6 s, antes 12 s).',
      ] },
      { title: 'Pátio: desenho', items: [
        'A Harpa da ilha do Pátio padrão e tudo o que fica no alto da tela (itens, almas, efeitos) não são mais cortados numa linha reta na base do cabeçalho: aparecem inteiros através da faixa do cabeçalho, como o cenário.',
      ] },
    ],
  },
  {
    version: '2.15.0',
    date: '20/11/2026',
    title: 'Simulador de voz de galinha em chickenchess.com/chicken-voice-simulator; créditos completos no About; Piano de cauda e a escala Estrela: as 12 notas numa estrela de hexágonos, tocadas por clique e arraste, com dinâmica pelo movimento e o acumulador de notas no Correr; Pátio sem piscadas no celular ao andar e qualidade gráfica Baixíssima; Tela como mira no celular: tocar atira, anda até lá e pega o item; analógico de mira atira ao soltar e fica escondido por padrão; arrastar o botão Roda escolhe o item; nova posição dos botões de toque; Shift esquerdo sai do Pegar',
    groups: [
      { title: 'Simulador de voz de galinha', items: [
        'Página nova em /chicken-voice-simulator: um sintetizador que simula o corpo da galinha (sacos aéreos, siringe, traqueia, laringe, garganta e bico) em vez de usar gravações. Ela cacareja, choca, canta de galo, pia como pintinho, dá alarme e chama para comer.',
        'Botão Sing: a galinha canta a letra digitada numa melodia escolhida, transformando cada sílaba no que o bico, a laringe e a garganta dela conseguem fazer. Um controle passa de pintinho a galinha e a galo.',
        'O endereço chickenchess.com/chicken-voice-simulator abre a página direto, sem ficar preso em redirecionamentos nem cair em página não encontrada.',
      ] },
      { title: 'About: créditos', items: [
        'A aba Credits do About agora mostra quem fez o jogo (ideia original do xadrez musical: Thiago Atimoda e Rodrigo Zecchinelli; desenvolvimento: Thiago Atimoda, com link para o Instagram de cada um), quem criou o Pigchicken (gameplay, lore e história originais: Lila Zara e Uirá Fedatto Horta; arte visual inspirada nos desenhos da filha de Thiago), o Strudel como motor musical, o simulador de voz de galinha feito sobre o Chimera e as IAs usadas para programar, além das gravações de pássaros e do globo que já estavam lá.',
      ] },
      { title: 'Pátio: escala Estrela', items: [
        'Escala nova, Estrela: as 12 notas espalhadas numa estrela de seis pontas feita de hexágonos. Cada direção que sai do meio é um intervalo (semitons, tons inteiros, terças menores, terças maiores, quartas); a metade direita sobe a partir do Ré e a esquerda é o espelho dela, descendo. O eixo do meio (o trítono) não toca. Com as pontas de 8 casas, a estrela cobre umas sete oitavas, a extensão de um piano.',
        'As teclas pretas têm fundo escuro e as brancas fundo claro, sem outras cores. A estrela é suave (um pouco transparente) e as notas fora da escala da zona ficam bem mais transparentes; as da escala ganham uma borda dourada, sem sair do lugar: todas as notas continuam tocáveis. No painel Escalas, “Opacidade da estrela” e “Notas fora da escala” ajustam as duas transparências.',
        'Clicar numa nota toca a nota; arrastar com o clique apertado toca cada nota em que encostar. No celular, sentada no Piano de cauda, cada dedo (até dois) toca e arrasta do mesmo jeito.',
        'No gamepad, o analógico direito anda pelas notas pela profundidade da mira (a casa mirada fica contornada). Com o RT apertado, em qualquer profundidade, as notas tocam durante o arraste, como o mouse, e o volume segue o quanto o RT está apertado (em gamepads com gatilho analógico; nos outros, é só apertado ou solto).',
        'Dinâmica pelo movimento: chocando parada ppp, chocando andando pp, agachada p, em pé mp, correndo mf, pulando f e voando (segurando Pular no ar) ff. A dinâmica aparece pequena embaixo da estrela.',
        'Acumulador no Correr: as notas tocadas com Correr segurado ficam marcadas com um anel azul. Ao soltar Correr, elas saem todas juntas (rajada). Saindo da corrida para um slide (Agachar segurado ao soltar Correr), saem em cascata, na ordem em que foram tocadas, a uma fusa de distância. Saindo para o Chocar (Chocar segurado), saem em tercinas, e sair do Chocar interrompe as que faltam.',
        'Qualquer instrumento pode ligar a Estrela em Itens → Música → Escalas. No painel Escalas, “Níveis de notas” (3 a 10, padrão 8) muda quantas notas a estrela tem sem mudar o tamanho dela: menos níveis, menos notas e casas maiores. Com 3 ainda estão todas as 12 notas, em umas três oitavas.',
      ] },
      { title: 'Pátio: Piano de cauda', items: [
        'Instrumento fixo novo no Modo editor, grupo Música: o Piano de cauda, com banqueta. Pegar perto da banqueta senta; a escala dele é a Estrela, com som de piano novo (cordas marteladas, mais brilhante quanto mais forte).',
        'Sentada no piano ela não se move, mas as binds valem como se ela se movesse: Chocar, Agachar, Correr e Pular mudam a dinâmica (Pular segurado vira ff) e o Correr acumula as notas. Por isso Pular e Correr não levantam do piano: levanta com Pegar (E no teclado), com Golpe (Y no gamepad) ou com o botão Sair do celular.',
        'Sentada, a estrela fica sempre à vista e cabe inteira na tela.',
      ] },
      { title: 'Pátio: fundo e números da grade sem piscar ao andar', items: [
        'No celular, o fundo (céu, montanhas, mata) e os números da Grade de blocos piscavam toda vez que a galinha andava. A cada passo o navegador redesenhava do zero o mundo, cada camada do fundo e as camadas da frente; agora elas só deslizam, já desenhadas. Vale em todos os Pátios, local e online, e no Modo editor.',
        'Com zoom diferente de 100%, o Pátio continua redesenhando as camadas para ficarem nítidas naquele zoom, como antes.',
      ] },
      { title: 'Qualidade gráfica Baixíssima', items: [
        'Novo nível em “Qualidade e efeitos gráficos” (Preferências e painel Camadas do Pátio): Baixíssima, para celulares lentos e antigos. É a Baixa sem o cenário que só enfeita: o fundo do Pátio fica só com o céu (sem sol, estrelas, lua, aurora, nuvens, montanhas, prédios, mata e neve) e saem as Árvores em que não se sobe, os Pinheiros, as Ameixeiras e o cenário em profundidade própria.',
        'Fica tudo o que conta no jogo: chãos, plataformas, casas, Postes e Torres (os fios são pisáveis), árvores em que se sobe ou anda, o que bloqueia tiros ou notas, itens, bonecos, portais e a Grade de blocos. No Modo editor tudo aparece, para editar.',
        'Só se escolhe à mão: “Ajustar automaticamente” continua parando na Baixa.',
      ] },
      { title: 'Controles de toque: a tela como mira', items: [
        'Tocar no cenário mira e atira ali na hora, como o clique do mouse (com as mãos vazias, bica). Segurando o dedo, a mira segue o dedo e a arma continua atirando.',
        'Um toque rápido também faz a galinha andar até lá, com ou sem item na asa. O analógico de movimento e as teclas têm prioridade: mexer neles para a caminhada.',
        'Tocar no item do chão em que ela está encostada, ou no instrumento fixo ou no Baú ao lado dela, faz Pegar em vez de atirar ou andar. Vale também para o clique do mouse.',
        'No painel Controles, em Touch Controls: “Tela serve como mira” (ligado por padrão) e “Exibir analógico touch de mira” (desligado por padrão).',
      ] },
      { title: 'Controles de toque: analógico de mira e posição dos botões', items: [
        'Soltar o analógico de mira antes da borda (onde ele ainda não atira sozinho) dá um tiro na direção em que ele estava.',
        'Botão Roda: segurando, abre a roda do inventário como antes; arrastando o dedo para um lado, escolhe o item daquele lado da roda, e soltar equipa. Dá para trocar de item com um dedo só, num gesto rápido.',
        'Nova posição padrão dos botões: analógico de movimento um pouco mais para dentro e para cima, Pular, Chocar e Correr num arco baixo, Punch, Throw e Roda num arco acima deles, Pegar sobre a Roda e o analógico de mira acima do Punch. Botões que você já tinha movido ficam onde estão; “Padrão” em Editar posição dos botões volta todos para a nova posição.',
      ] },
      { title: 'Teclado', items: [
        'Shift esquerdo deixa de ser tecla padrão de Usar / pegar item (continua em Correr). Quem ainda estava no padrão antigo (E + Shift esq.) perde o Shift esq. no Pegar; quem configurou outra combinação não muda.',
      ] },
    ],
  },
  {
    version: '2.14.0',
    date: '18/11/2026',
    title: 'Tambores e pentes das armas e ação Próxima variação; Aim Assist nos instrumentos, Bullet Magnetism nos aliens, e o Teclado e o Violino nos blocos do Campo minado; Pátio: alinhamento da barra de itens (separado, centralizado, à esquerda ou à direita) e trocas por grupo que repetem enquanto o botão fica segurado; Editor de hit-area dos personagens no Vestiário (admin); admin troca de espécie mesmo sendo kid; Vestiário sem o aviso “meio apagado”; Item novo no Pátio: Corrente-gancho, que gruda no cenário e puxa você até lá, ou fisga um boneco e puxa ele até você; botão Camadas no painel do Modo editor e elementos trancados deixam o clique passar para os de trás; Prédios no fundo do Pátio (cidade, skyline flat, torres de código e data-centers) e duas árvores novas na Mata; Cor da dúvida e Spawn de itens na Grade de blocos; mesa do Suporte de item vira plataforma e contagem regressiva da reposição; painel Personagem (com a miniatura do seu boneco e a coluna Kids) separado de Ajustes, limites do inventário por categoria e Golpe rápido de volta nos kids; botões do cabeçalho do Pátio centralizados no desktop; zonas das cenas embaixo do chão, pisáveis: um slam (cair de um pulo segurando Chocar) troca o valor pisado, com transição de painel de aeroporto; fases de notas por zona, com meta de precisão e corações, e a Vitrola toca-discos; Pátio abre sem mostrar antes uma cópia antiga e o Playgrounds aberto mostra na hora o Pátio recém-salvo; o portal de chegada do Pátio se fecha depois que a galinha sai dele; Friends dentro do Pátio para chamar um amigo para o seu lobby, com aviso e botão Entrar para quem foi chamado, e abas Perfil e Amigos no Vestiário; Ativador de grid de campo minado',
    groups: [
      { title: 'Pátio: Ativador de grid de campo minado', items: [
        'Elemento novo no Modo editor, grupo Grade de blocos: o Ativador de grid de campo minado, um botão azul grande com duas barras em volta da cúpula. As notas dos instrumentos enchem a de música (azul) e tiros, explosões, Golpes e Bicadas enchem a de dano (vermelha). No Editar dele: Notas até ativar e Dano até ativar.',
        'A primeira barra que enche liga a grade de blocos para todos no Pátio: pela música, com os blocos tocando como Zonas sonoras; pelo dano, sem elas. Assim os próprios players ligam o Campo minado, sem depender do dono do Pátio.',
        'Com a grade à mostra, o Ativador fica pequeno e cinza, e notas e tiros passam por ele sem contar. Ele volta a ser o botão azul quando a rodada termina ou quando quem cuida do Pátio desmarca Grade ligada no painel; enchido de novo depois do fim da rodada, começa uma rodada nova.',
        'No online, o dono da sala soma as notas e o dano de todos e liga a grade para a sala inteira.',
      ] },
      { title: 'Pátio: Prédios no fundo', items: [
        'Categoria nova “Prédios” nas Configurações do Pátio, logo depois de Mata: até quatro fileiras de prédios ao fundo, cada uma criada a partir de um modelo (Cidade, Skyline flat, Torres de código ou Data-center) e salva com o Pátio, em todos os modos.',
        'Cada fileira ajusta tudo: Profundidade (de quase junto do chão até atrás das montanhas), Elevação, Névoa, Altura e Largura com as suas variações, Densidade, Vãos, Aglomerado (grupos com os mais altos no meio), Recuos no topo, Anexos, Lateral (uma face estreita de topo inclinado), Coisas no teto e Antenas.',
        'A fachada tem sete padrões: janelas, grade de linhas, listras verticais, listras horizontais, misturado, código (janelas de app com barra de três bolinhas e linhas de texto) e servidores (racks com luzinhas), com tamanho e espaço das janelas, contraste, luzes acesas e as cores da parede, da fachada e das luzes. Largos e altos, os prédios viram data-centers enormes.',
        'A cor de cada fileira vem do céu na profundidade dela, como as montanhas, e as mais distantes ficam mais claras com a névoa. “Sortear forma” desenha outros prédios com os mesmos ajustes.',
        'Cada fileira tem “Posição”, que escolhe entre quais montanhas e fileiras da Mata ela fica (por exemplo “Entre as Montanhas 1 e 2”), para pôr um data-center no meio das cordilheiras sem procurar a Profundidade certa.',
      ] },
      { title: 'Pátio: árvores novas na Mata', items: [
        'Na Mata (Mata ao longe e Mata perto), duas formas novas de árvore: Copas em nuvem, altas e contornadas por montinhos, e Guarda-chuvas, de copa larga e achatada dobrada pelo vento, com a ponta curvada e tronco grosso em Y.',
        'O controle Pinheiros virou quatro: Pinheiros, Copas redondas, Copas em nuvem e Guarda-chuvas, em proporção entre si (cada um mostra a parte das árvores que tem). Com os valores de antes, as fileiras continuam iguais.',
      ] },
      { title: 'Pátio: fases de notas por zona', items: [
        'Cada música agora toca na zona onde começou (a Zona sonora ali, ou a cena). Zonas diferentes podem tocar músicas diferentes ao mesmo tempo, cada uma no seu tempo; você ouve a da zona onde está.',
        'Uma zona toca uma música por vez: pedir outra ali não interrompe nada, o aparelho treme, pisca em vermelho e faz um som abafado.',
        'Sair da zona da música por 2,5 s perde a música.',
        'As notas vêm para o leque de quem começou a música: quem estava mais perto do Gongo, ou quem apertou Tocar.',
        'A Jukebox e a Vitrola têm uma meta no Editar: Precisão mínima (padrão: nenhuma) e Corações (padrão 3). Os corações aparecem antes do nome da música; cada alien que chega em você tira um, com 1,4 s de proteção. Sem corações, ou terminando abaixo da precisão mínima, a música se perde.',
        'O piu do kid anula notas como a Bicada.',
        'Cada Jukebox e cada Vitrola guarda a sua música escolhida.',
      ] },
      { title: 'Pátio: Gongo e Vitrola toca-discos', items: [
        'Elemento novo no grupo Música do Modo editor: Vitrola toca-discos, com corneta dourada. Funciona como a Jukebox, e a manivela gira enquanto a música toca.',
        'O Gongo não tem mais música própria: ao completar as batidas, aperta Tocar na Jukebox ou Vitrola mais perto dele, na zona dele. Saíram os campos Música e Título do Editar dele. Sobre ele aparece só a contagem (0/5), sempre visível.',
        'Nova caixa “Debug da fase de notas” em Camadas, que mostra o estado de cada música tocando: zona, batida, corações, afinação, acertos e precisão contra a meta.',
      ] },
      { title: 'Pátio: tambores e pentes', items: [
        'Cada arma mostra as balas que ainda tem num HUD pequeno ao lado da mira, com um desenho por arma: tambor de revólver na Pistola, tambor de cartuchos na Escopeta, anel em trios na Submetralhadora, arcos dos lados no Rifle, uma fileira em arco na Sniper, os flancos no Lança-foguetes e um leque de flechas embaixo da mira no Arco. As balas vazias ficam só no contorno.',
        'A cada tiro a bala do HUD pula para fora e cai; na Pistola e na Escopeta o tambor gira uma câmara. No Arco, as flechas saem da direita para a esquerda, a próxima recua enquanto você carrega e sobe um pouco ao soltar. Na recarga as balas vão acendendo.',
        'Em volta da galinha, o pente aparece como um anel de balas (na Escopeta, um tambor de metal) quando você pega a arma, aperta Próxima variação (Q) ou recarrega, e some no mesmo tempo das escalas. Atirando logo em seguida dá para ver o anel girar e a bala cair.',
        'No painel Câmera de Mira, “Tambores e pentes” tem os checkboxes “Em volta” e “Na mira”, os dois ligados por padrão, salvos só para você.',
        'A Granada agora tem pente infinito: não acaba nem recarrega, só respeita a cadência. O Pandeiro continua com o pente dele.',
        'Na recarga, a mira não mostra mais o círculo girando, em nenhum item: as balas acendendo no tambor ou pente e o clique seco ao tentar atirar já mostram que está recarregando.',
      ] },
      { title: 'Pátio: mira espacial dos instrumentos e itens', items: [
        'Os instrumentos e os itens que atiram ganham um anel de neon em volta da mira, com um desenho por classe: pontos na Flauta, barras com o arpejo indo e voltando no Sax, trios nos lados no Trompete, roseta de três anéis no Violão, quatro arcadas que escoam com o feixe no Violino, teclado em anel no Teclado, aro com platinelas no Pandeiro, lira de 12 cordas na Harpa de Lira e oito campos de nota no Hangdrum.',
        'A nota que sai se solta do anel e flutua até sumir, e a próxima acende na cor do grau sob a mira. As notas que voltam sozinhas enchem o anel aos poucos, e Próxima variação (Q) faz o anel religar numa varredura.',
        'Baralhos: leque de 14 cartas sobre a mira, a próxima levantada e as que estão longe só em contorno; o 7 e o Ás brilham mais e tremem. Boomerang: duas meias-luas, uma por asa. Martelo de Thor e Cajado de Odin: bobina do especial, com faíscas quando está pronto, e o anel interno do martelo na mão ou da carga do golpe forte. Corrente-gancho: elos girando enquanto carrega. Granada: pulso da carga e da cadência. Taco: oito blocos dos golpes.',
        'Usa o mesmo checkbox “Na mira” de Tambores e pentes.',
      ] },
      { title: 'Pátio: Próxima variação', items: [
        'Ação nova “Próxima variação” no painel Controles, na tecla Q (Próxima arma fica sem tecla no teclado e continua no RB). Com um instrumento na mão ela passa para a próxima escala, voltando à primeira depois da última.',
        'Próximo item, Item anterior e a rodinha do mouse agora vão direto para o próximo item, sem passar pelas escalas. Para voltar ao jeito antigo, marque “Incluir variações” na frente da ação no painel Controles. Próximo instrumento ganhou “Incluir escalas” (passa pelas escalas do instrumento da mão antes do próximo), e Próxima arma e Próximo utilitário ganharam “Incluir tambores” e “Incluir tipos”, que ainda não mudam nada.',
      ] },
      { title: 'Pátio: clique direito point and click', items: [
        'O botão direito do mouse agora é point and click no Golpe: clicando num ponto fora do alcance, ela anda até lá e dá o golpe nele ao chegar, em vez de golpear o ar. Dentro do alcance o golpe sai na hora, como antes. Vale para todas as armas, instrumentos, bastões e a mão vazia (Asa, Correntada e Rabada).',
        'Cada item tem a opção “Clique direito: point and click” no painel Itens, no grupo Golpe (Golpe rápido nos bastões), ligada por padrão. Desligada, o botão direito volta a ser o golpe comum. Andar, outro Golpe ou trocar para um item com a opção desligada cancela a ida.',
      ] },
      { title: 'Pátio: instrumentos', items: [
        'Novo ajuste “Aim Assist” (Itens → Música, de 0 a 100%, desligado por padrão) em cada instrumento. Ao tocar, se houver um inimigo na mesma célula da escala em que a mira está (a faixa do leque, a região do gráfico, o pedaço da espiral, a casa do campo harmônico, a nota do hang ou a corda), o tiro vira para ele: em 100% vai exatamente nele, sem espalhamento; em 50% vai até a metade do caminho. Sem inimigo na célula, o tiro vai onde a mira está. A célula continua além do desenho, na mesma direção. Vale para as notas, os acordes, o feixe do violino e as cordas; a Bateria não tem.',
        'O tiro do Teclado agora estoura na parede do bloco fechado em que acerta, como o foguete, em vez de atravessar os blocos e estourar longe dali. O traço do tiro termina onde ele estourou; e uma nota que quica numa parede desenha o caminho com o quique, em vez de uma linha reta até onde parou.',
        'O feixe do Violino agora para na parede de um bloco fechado e enche a barra de música dele: conta uma nota a cada semicolcheia enquanto fica ali (só do lado aberto, como as outras notas).',
      ] },
      { title: 'Pátio: painéis Personagem e Ajustes', items: [
        'O antigo painel Ajustes virou Personagem, com as mesmas características dos personagens (colunas Chi, Pig e Ken). O botão dele no cabeçalho mostra só o contorno do seu próprio boneco, na forma da skin atual, inclusive de kid.',
        'Novo painel Ajustes, logo ao lado, só com os ajustes universais: Notas no ritmo (quantizar), Tambores e pentes (Em volta, Na mira), que saíram da Câmera de Mira, e Debug.',
        'Grupo novo Inventário em Personagem: o máximo de instrumentos, armas e utilitários que cada personagem carrega (0 a 30, padrão 30), com valor próprio para Chi, Pig e Ken. Com a categoria cheia, Pegar só troca pelo item da mão se ele for da mesma categoria; senão aparece “Limite de instrumentos/armas/utilitários” sobre o item. O Limite do inventário do Pátio continua valendo para o total.',
        'Coluna nova Kids em Personagem, ao lado de Chi, Pig e Ken: o movimento e o tamanho do kid (e dos pintinhos que seguem a galinha) por fator sobre a galinha, e quantos itens de cada categoria ele carrega (padrão 1 de cada).',
        'Grupo Kids em Personagem com uma caixa para cada limitação, todas ligadas como antes: Imortal, Itens caem ao virar kid, Não pega bastões nem armas de golpe, Só uma Gaiola, Não arremessa, Mão vazia pia, Sem cacarejo e Campo minado: só instrumentos e bombas. Notas para crescer e Espalhada dos itens vieram para esse grupo.',
        'Os filhotes agora se chamam Kids em toda a interface: a coluna e o grupo em Personagem, a aba do Vestiário, a Hit-area, o placar do Campo minado e o Piu piu no painel Itens.',
        'Parâmetro novo “Cabeça fica para trás (máximo)” em Personagem → Andar (corpo e cabeça): o quanto a cabeça fica para trás andando antes do bote para a frente. Nos Kids o padrão ficou bem menor, então o pintinho não joga mais a cabeça tanto para trás a cada passo.',
        'O Golpe rápido voltou para os kids: com item na mão ele golpeia, e de mão vazia dá a bicada. A caixa “Sem Golpe rápido” traz de volta o jeito antigo (Golpe pia).',
      ] },
      { title: 'Pátio: Grade de blocos', items: [
        'Cor nova “Cor da dúvida” no grupo Cores do painel Grade de blocos, laranja claro por padrão (duplo clique volta a ele): pinta as notas que caem numa bandeira, a barra que enche até a dúvida e a interrogação.',
        'Sair de um bloco fechado por qualquer caminho (por uma plataforma que atravessa a parede, escalando o vão para fora da grade) agora troca a vista para o lado de fora: o vão ao lado de um bloco aberto, o espaço acima da grade e as margens contam como lado aberto. Só o vão entre blocos fechados mantém o lado que você tinha.',
        'Grupo novo “Spawn de itens” no painel Grade de blocos: cada bloco tem uma chance de nascer com itens (Blocos com itens, padrão 15%), de 1 até o máximo de Itens por bloco (padrão 2), lado a lado numa plataforma em lugar sorteado no meio do bloco. Dá para ajustar a chance de cada grupo (Armas, Instrumentos e Utilitários, 33% cada) e, na lista de cada grupo, a de cada item (10% cada); 0 tira do sorteio. Sortear muda os blocos, as plataformas e os itens, e os itens pegos voltam quando a grade é resetada.',
        'Trocar de bloco ficou mais fácil: agarrado numa parede com outra sala atrás, Esquerda ou Direita (a que aponta para a parede) + Pulo já atravessa; pendurado no teto, Cima + Pulo vai para a sala de cima. Na diagonal não atravessa. Chocar + Pulo continua valendo.',
      ] },
      { title: 'Aliens: Bullet Magnetism', items: [
        'Parâmetro novo “Bullet Magnetism” (painel Aliens → Corpo, de 0 a 100%) em cada variação: o alien puxa para si os tiros e as notas rebatidas que passam perto, mais quanto mais perto passam, e as notas fazem uma curva no caminho. Em 100% ele suga todos os tiros da tela; com mais de um em 100%, o mais perto do tiro leva.',
        'Cada espécie veio com o seu valor, em média perto de 20%: os grandes e lentos puxam mais (Casco 30%, Dragão 25%), os pequenos e rápidos quase nada (Mini 0%). Alguns exageram: Bronze 60%, Baixo 55% e Bumbo 50%.',
        'Variação nova “Ímã” (Casco): puxa 100%, suga todas as notas da tela e tem vida 400 para durar mais.',
      ] },
      { title: 'Pátio: inventário', items: [
        'Opção nova em Controles → Inventário para alinhar a barra de itens de baixo: Centralizado (como era), Separado (instrumentos no canto esquerdo, armas e utilitários no canto direito), Esquerda ou Direita. Separado é o novo padrão. Arrastar um item de um lado para o outro continua mudando o grupo dele.',
        'Próximo instrumento, Próxima arma e Próximo utilitário agora repetem a troca enquanto o botão fica segurado, como Próximo item e Item anterior: troca na hora, de novo depois de “Repetir troca após segurar” e depois a cada “Intervalo entre trocas”. Antes esses atalhos (Tab, Q, F, LB, RB e B no padrão) trocavam uma vez só por aperto.',
        'Na Câmera de Mira saiu o aviso sobre zona morta e ímã dos analógicos.',
      ] },
      { title: 'Vestiário', items: [
        'A conta admin não fica mais presa no kid: o Vestiário abre na aba Kids, mas mantém as abas Raças e peças, e escolher uma raça ou peça volta a adulto com esse visual, em qualquer espécie.',
        'Saiu o aviso “meio apagado: ainda não liberado (dá pra testar)” do rodapé do Vestiário.',
        'Novo botão Hit-area no Vestiário (só admin): mostra sobre a prévia a caixa do corpo e a barra de vida de Chi, Pig, Ken e Kids. Arraste a caixa, a borda, o topo e a barra, ou digite os números, e grave com Salvar no game, que mostra a lista do que muda antes. A caixa é o que explosões, notas, cartas e cagados acertam, e é a mesma da camada Hit-boxes.',
        'A Hit-area agora tem uma caixa por pose: Em pé, Agachado, Chocando, No ar, Sentado e Agarrado (parede ou teto, onde a caixa gira com a superfície). A prévia mostra o boneco de verdade em cada pose. Pose sem caixa própria usa a Em pé.',
      ] },
      { title: 'Pátio: Corrente-gancho', items: [
        'Item novo nos Esportivos (painel Itens, suportes do Modo editor e Baú): uma algema de ferro no pulso, um pedaço de corrente e um gancho grande na ponta. Pensado para o Pig, mas qualquer personagem pode usar.',
        'Segure Atirar e o braço sobe girando a corrente com o gancho, cada vez mais rápido. Ao soltar, o gancho voa reto para onde você mira, puxando a corrente atrás de si.',
        'Se o gancho bate numa parede, num chão, numa plataforma ou num objeto, ele gruda e puxa você até lá; em cima de uma plataforma, você aterrissa nela. Quanto mais tempo girando, mais forte o puxão.',
        'Se fisga um alien, um zumbi, um morto-vivo, um boneco de treino ou outro player deste aparelho, ele leva um pouco de dano e é puxado até você. O zumbi fica onde foi puxado; o alien volta para a fileira e o boneco de treino para o lugar, como depois de uma explosão.',
        'Enquanto mira com o gancho na mão, uma bolinha laranja mostra onde ele vai grudar. Sem nada ao alcance (900 px), a bolinha não aparece.',
        'Apertar Atirar de novo com o gancho fora solta o gancho na hora, e a corrente volta para a mão. Golpe dá uma pancada com o gancho, com combo, como os outros esportivos.',
        'No Pátio online, os outros players veem a corrente indo e voltando.',
      ] },
      { title: 'Modo editor', items: [
        'Botão Camadas (olho) no painel do Modo editor, à direita de Zonas: abre e fecha o mesmo painel Camadas do olho do cabeçalho.',
        'Um elemento trancado (cadeado) não atrapalha mais o clique: clicar, arrastar ou dar dois cliques em cima dele pega o elemento que está atrás ou em volta, e o contorno de passar o mouse aparece nesse de trás. Assim dá para alcançar uma camada de trás trancando a da frente, sem tirá-la do lugar. Onde não há nada além dele, o clique ainda seleciona o trancado, para destrancar.',
      ] },
      { title: 'Pátio: Suporte de item', items: [
        'A mesa do Suporte de item agora é uma plataforma: dá para pousar e andar em cima dela, escalar as laterais e descer com Agachar + Pulo, como nas outras plataformas. Andando pelo chão você continua atravessando a mesa e pegando o item como antes.',
        'Os itens também pousam no tampo das mesas: o que você larga, arremessa ou sai de um baú para em cima da mesa, e com suportes empilhados o item de cada um cai entre as pernas dele e fica em cima da mesa de baixo, em vez de todos irem parar no chão.',
        'Enquanto um suporte espera para repor o item, aparece no lugar onde o item nasce a contagem regressiva até ele voltar, de 0,1 em 0,1 s, no mesmo texto do nome do item.',
        'No Modo editor, um suporte (ou outro elemento) com Gravidade que cai em cima de um suporte para no tampo da mesa dele, em vez de atravessar até o chão. Soltar da paleta em cima de um suporte também apoia na mesa.',
      ] },
      { title: 'Pátio: botão Aliens', items: [
        'O botão ALIENS ganhou limite de uso, no Editar do botão no Modo editor: “Limite de apertos” (1 a 50 ou ∞) a cada “A cada” (5 s a 10 min), por padrão 10 por minuto. Atingido o limite, o botão fica cinza e mostra embaixo a contagem regressiva até poder ser apertado de novo, como o Suporte de item.',
        '“Intervalo mínimo” entre um aperto e o próximo, de 0,1 a 3 s (padrão 0,3 s): o botão fica cinza nesse intervalo.',
      ] },
      { title: 'Pátio: zonas das cenas pisáveis', items: [
        'A faixa com a zona de cada cena saiu de cima do chão e ficou logo embaixo dele, com a linha de cima encostada no limite do chão principal: o cenário fica livre e a faixa marca onde o chão termina.',
        'Os parâmetros da faixa agora são pisáveis: cair de um pulo no chão segurando Chocar (um slam), com qualquer personagem e qualquer player local, passa o parâmetro que ficou embaixo para o próximo valor da lista, como um clique nele no Modo editor. O andamento sobe de 10 em 10 e volta ao mínimo depois do máximo; o nome da zona não muda. Vale para quem pode editar o Pátio, dentro e fora do Modo editor, com a camada Zonas visível, e fica salvo no Pátio como uma mudança pelo painel.',
        'Quando um valor das tags das zonas muda (pelo slam, pelo clique ou pelas paredes com vida), o texto antigo desce dentro da própria tag e o novo entra por cima, como num painel de aeroporto.',
      ] },
      { title: 'Pátio: cabeçalho', items: [
        'No desktop, os botões do Modo editor até a Grade de blocos ficam centralizados na tela. Quando não cabem centralizados, ficam a um botão de distância dos outros grupos. No celular nada muda.',
      ] },
      { title: 'Pátio: abrir e salvar Pátios', items: [
        'Ao abrir o Pátio padrão, não aparece mais por um instante uma versão antiga dele antes da atual: a cópia guardada no navegador em /patio e a do link do Pátio agora são a mesma.',
        'Um Pátio que este navegador ainda não conhece abre direto como ele é, em vez de mostrar antes o Pátio padrão.',
        'Quando o armazenamento do navegador enche, as cópias de Pátios que já estão salvos no servidor dão lugar, e o Pátio aberto continua sendo guardado.',
        'Com o painel Playgrounds aberto, um Pátio novo aparece na lista assim que é salvo ou ganha nome.',
      ] },
      { title: 'Pátio: portal de entrada', items: [
        'O portal por onde a galinha chega no Pátio se fecha logo depois que ela sai dele: incha um pouco, gira mais rápido, as faíscas são sugadas para o centro e ele encolhe até sumir num ponto de luz. Para voltar ao globo, use o botão Globo no canto da tela. Os Portais de nascimento fazem o mesmo.',
        'O portal reabre só para alguém sair dele ou ser sugado ao trocar de Pátio, e fecha de novo em seguida. No Modo editor eles ficam abertos para serem arrastados.',
      ] },
      { title: 'Online: Profile code de 9 dígitos', items: [
        'O Profile code agora tem 9 números, na ordem de cadastro: a primeira conta é 000000001 e cada conta nova pega o próximo. As contas existentes foram renumeradas pela data de cadastro.',
        'Em Friends, Add aceita o código sem os zeros à esquerda (12 acha 000000012), o código antigo de 16 caracteres ou o email.',
        'Amigos ocultados continuam ocultos depois da troca de código.',
      ] },
      { title: 'Online: chamar amigos para o seu lobby', items: [
        'No cabeçalho do Pátio, ao lado de Players, o botão Friends abre o mesmo painel de amigos do globo (adicionar por código ou email, aceitar, ocultar, remover), agora com “Invite” em cada amigo. “Invite friend” no painel Players abre esse painel.',
        'Invite chama o amigo para o seu lobby: o Pátio aberto e, no online, a sua sala. Se você estiver no modo local, o Pátio entra no online antes de mandar o convite.',
        'Quem é chamado vê um aviso “Fulano chamou você para o Pátio …” com o botão Entrar, no globo, numa partida ou no Pátio, mesmo com a aba em segundo plano. Entrar abre o Pátio já no online, na sala de quem chamou. O convite vale por 10 minutos e aparece uma vez por navegador.',
        'No globo, Create game em Friends cria o lobby privado e já chama o amigo para ele, com o mesmo aviso.',
        'No Vestiário, as abas Perfil e Amigos, no fim da fileira, abrem o painel do seu perfil (o mesmo do globo) e o painel Friends.',
        'Copy link do painel Players agora leva ao Pátio aberto e à sua sala online; antes, depois de trocar de Pátio pelo Playgrounds, o link podia levar ao Pátio padrão.',
      ] },
    ],
  },
]

export const CHANGELOG = [...RECENT, ...CHANGELOG_ARCHIVE]
