// Release history before the three most recent versions. Kept apart so agents editing the
// changelog only open lib/changelog.ts; entries here no longer change, they are only shown in the release notes.
export const CHANGELOG_ARCHIVE = [
  {
    version: '2.12.0',
    date: '16/11/2026',
    title: 'Campo minado no Pátio: Grade de blocos com paredes e dois lados, gangorra de música e dano, bandeira, bombas, detonador e Filhote, com a rodada compartilhada no online e um Pátio de exemplo; Portais de nascimento no Modo editor, cada um com a sua chance; gaiolas penduradas balançam para o lado certo; painel Itens com os seis modelos de gaiola numa tela só; almas em pose de descanso na gaiola e pousadas; cada Boomerang sai de uma asa; itens param em cima dos chãos com contorno, e a galinha agachada agarra a beirada deles; estrelas a qualquer hora do dia; dá para entrar nas casas pela porta; os elementos do Templo e da Vila ficam no lugar ao mudar a largura do Pátio; cada Pátio escolhe a faixa de zoom, até ver o Pátio inteiro; e botão de próximo item ao lado dos dropdowns dos painéis',
    groups: [
      { title: 'Pátio: Grade de blocos', items: [
        'A Grade de blocos tem um painel próprio: o botão de grade no topo do Pátio, ao lado do Sol, que fica amarelo enquanto a grade está ligada. No painel, Grade ligada e Resetar grade ficam em cima, e os ajustes abrem em grupos: Blocos, Música e dano, Bombas e Cores. Quem não pode editar o Pátio vê o botão enquanto a grade está ligada, com os ajustes apagados. Ligada (pelo criador ou pelo padrinho do Pátio), ela cobre o Pátio com blocos quadrados fechados, do chão ao teto, e sorteia uma bomba em cada um pela chance escolhida. Dá para ajustar o tamanho do bloco, o vão entre os blocos, a chance de bomba, se as paredes barram a passagem, e resetar a grade.',
        'Cada galinha está de um lado: aberto ou fechado, conforme o bloco em que está. As paredes dos blocos fechados separam os dois. Quem está do lado aberto anda pelos blocos abertos, pelo vão e por cima dos fechados, e vê o número de bombas em volta de cada bloco aberto; quem está do lado fechado vê o interior dos blocos fechados e as bombas. Os blocos do outro lado ficam cobertos.',
        'Com vão, cada bloco fechado é uma sala. Do lado fechado, Chocar + Pulo em pé no chão, pendurada no teto ou agarrada numa parede leva para o bloco fechado vizinho daquele lado. Na parede que dá para um bloco aberto o gesto não troca. Sem vão, os blocos fechados vizinhos formam um espaço só.',
        'No Editar do Portal de entrada e dos Portais de nascimento, “Bloco liberado” faz o bloco daquele portal começar aberto e sem bomba. Em Camadas, o slider Grade controla a opacidade do desenho.',
        'Os botões do topo, os avatares, os controles de toque, o inventário e as Gaiolas ficam na frente dos blocos da grade, em vez de quase sumir atrás de um bloco fechado.',
      ] },
      { title: 'Pátio: rodada do Campo minado', items: [
        'O fundo de cada bloco fechado é uma gangorra que começa cinza. Notas de instrumento de quem está do lado aberto a enchem de azul, tiros de armas de fogo a enchem de vermelho, e um desfaz o outro. As rachaduras aumentam com o vermelho. O golpe do Martelo de Thor e do Cajado de Odin devolve o bloco ao cinza.',
        'Azul cheio hasteia a bandeira: o bloco continua fechado e deixa de sofrer dano de tiros. Mais notas em cima da bandeira enchem uma barra amarela, que a troca por uma interrogação; em dúvida, o bloco volta a sofrer dano.',
        'Vermelho cheio libera o bloco. Sem bomba, ele abre e mostra o número de bombas em volta. Com bomba, ela explode: o bloco vira cratera e morre quem está nele e nos blocos abertos vizinhos.',
        'Quem morre vira Filhote, um pintinho na cor do player, que ainda toca instrumentos mas não atira. Volta a ser adulto desarmando uma bomba (lado fechado) ou hasteando a bandeira num bloco que tem bomba (lado aberto).',
        'Do lado fechado, perto da bomba do bloco, Usar desarma com uma Chave dourada, pega a bomba desarmada (o bloco abre sem explodir), rearma com Baixo segurado ou, num bloco em dúvida, aperta o detonador. A contagem aparece no bloco; se a bandeira subir de novo a tempo, a explosão fica contida no bloco.',
        'Com a Bomba na asa, quem está do lado fechado aperta Atirar para instalá-la no bloco aberto vizinho, contornado de vermelho: ele fecha de novo com a bomba armada. Quem começa a rodada do lado fechado ganha bombas.',
        'A rodada termina quando não sobra bloco fechado sem bomba. Aparece um painel com o que cada player fez e os títulos Desbravador, Guardião, Sapador e Minador, com prêmios. Dispensar fecha o painel; Resetar grade começa outra rodada.',
        'Ajustes novos em Grade de blocos: Notas quicam nas paredes (desligado por padrão: as notas atravessam os blocos e contam ao entrar), notas até a bandeira e até a dúvida, dano até liberar o bloco, Lado de dentro quebra paredes (ligado por padrão: tiros, explosões e golpes de quem está do lado fechado também contam como dano; desligado, só o lado aberto quebra), giro da gangorra, tempo do detonador, bombas iniciais, as três cores e Opacidade das paredes. Chave dourada e Bomba entram na paleta de suportes e nos Baús.',
        'O Golpe também mexe na gangorra do bloco cuja parede ele alcança: com a asa ou com uma arma soma dano, e com um instrumento na asa vale notas e diminui o dano (só do lado aberto). A Bicada conta como um Golpe com a asa, com o dano configurado nela.',
        'Cantos em octógono, no painel Grade de blocos: um slider corta os cantos de cada bloco, de quadrado até um octógono de lados iguais. O canto cortado vira espaço entre os blocos, com parede inclinada: dá para andar pela rampa de cima, escalar até ela e contornar o canto por dentro da sala; notas e tiros também batem nela. A fileira do chão mantém os cantos de baixo.',
        'Para o admin, o painel Grade de blocos tem duas opções de debug, que valem só no navegador dele: ver as bombas de todos os blocos e ver o número de todos os blocos.',
        'No online a rodada é uma só para a sala: o dono da sala guarda a grade, e as notas, os tiros, o Usar na bomba e as bombas instaladas de todos passam por ele e aparecem para todo mundo. O painel do fim mostra os players de todos os navegadores, o Filhote de outro navegador aparece como pintinho, e só o dono da sala reseta a grade. Depende do servidor de jogo atualizado; sem isso, cada navegador segue com a própria rodada.',
        'Pátio de exemplo novo, “Campo minado”, em Destaques: 13 por 4 blocos em três cenas. Nasce-se em um de três blocos liberados no chão, cada um com um instrumento e uma arma, ou dentro de um de dois blocos fechados, com bombas no inventário e uma Chave dourada ao lado. Há mais armas, chaves e dois Baús dentro da grade.',
      ] },
      { title: 'Pátio: Portais de nascimento', items: [
        'O Modo editor ganhou o Portal de nascimento, no grupo Portais da paleta: mais um lugar onde a galinha pode nascer ao entrar no Pátio, além do Portal de entrada. Ele tem o mesmo anel, mas não leva a lugar nenhum; pode ser movido, duplicado e apagado.',
        'Com dois ou mais portais (o de entrada conta), o Editar de cada um mostra “Chance de nascer aqui”, de 0 a 100%. A soma é sempre 100%: mexer num slider redistribui a diferença entre os outros na proporção do que cada um tinha. Um portal novo entra com a parte igual, e apagar um devolve a parte dele aos outros.',
        'Ao abrir um Pátio (chegando do globo, trocando de Pátio ou recarregando a página), o jogo sorteia o portal pelas chances. Sorteado um Portal de nascimento, a galinha sai de dentro do anel dele; no Portal de entrada, ela começa ao lado do anel, como antes. Os Pátios com um portal só continuam iguais.',
      ] },
      { title: 'Pátio: Gaiolas', items: [
        'As gaiolas penduradas agora balançam para o lado certo: quando a câmera vai para um lado, elas ficam para trás e começam o balanço para o outro, em vez de acompanhar a câmera.',
        'No painel Itens, os seis modelos de gaiola viraram uma entrada só, “Gaiolas”: ela mostra os seis um abaixo do outro, cada um vazio e, ao lado, cheio até o limite, com as almas nos lugares em que o jogo as põe. Mexer no limite de almas de um modelo muda a gaiola cheia na hora. O Padrão do topo volta os seis de uma vez.',
        'As almas dentro da gaiola agora ficam em pose de descanso, com a asa recolhida junto ao corpo; as almas pousadas pelo mapa também.',
        'As almas soltas agora fogem dos outros jogadores: perto do dono, afastam-se de quem chega; pousadas pelo mapa, podem voar de volta para o dono. Capturar a alma de outro jogador continua possível, mas pede uma corrida. Cada ficha tem Susto e Fuga no editor, no fim do grupo Voo.',
      ] },
      { title: 'Pátio: Boomerang', items: [
        'Cada arremesso do Boomerang usa uma asa só: o primeiro sai da asa da frente, enquanto o da asa de trás fica parado; o segundo sai da asa de trás, que carrega, golpeia e arremessa com ele enquanto a asa da frente fica vazia. O que volta primeiro vai para a asa da frente.',
      ] },
      { title: 'Pátio: Chãos e paredes', items: [
        'Os itens não atravessam mais os chãos com contorno (Rocha da Vila, Campo, Deserto, Neve e Vulcânico): o item de um suporte posto em cima de um chão, um item largado ou arremessado e as granadas pousam na linha de cima do contorno. Os zumbis também ficam em cima desses chãos e acompanham as subidas e descidas suaves.',
        'Andando agachada até a beirada de um chão ou parede com contorno, a galinha agora agarra a parede que desce dali e continua descendo por ela, como já fazia nas plataformas flutuantes. Antes ela caía da beirada.',
      ] },
      { title: 'Galinha: agarrar', items: [
        'O shocking jump (soltar Pulo com Chocar segurado) agora agarra sozinho o teto duro em que a cabeça bate na subida, como o bloco de cima no vão da Grade de blocos, a parte de baixo de um Chão ou Parede com Objeto duro e o teto do mundo. Antes era preciso segurar Cima. Segurando Baixo ou Agachar ela não agarra, e a parte de baixo das plataformas flutuantes continua atravessável.',
        'Ajuste novo em Ajustes → Agarrar: “Cair do grab após” (dano). Agarrada numa parede ou pendurada num teto, a galinha se segura, sem ser empurrada, até o dano recebido desde que agarrou chegar a esse valor; o golpe que completa o valor a derruba. Contam as explosões (foguetes, granadas, notas explosivas, bombas do Campo minado), o estouro das cartas e a cagada dos pássaros. O padrão é 5, bem baixo: qualquer explosão derruba e uma cagada fraca sozinha não. Em 0, qualquer golpe derruba.',
      ] },
      { title: 'Pátio: Zoom', items: [
        'Nas Configurações do Pátio há o slider “Zoom”, com dois pontos: o da esquerda é até onde a câmera afasta e o da direita até onde ela aproxima (até 400%). Na ponta esquerda, “Pátio inteiro”, ela afasta até o Pátio todo caber na tela, do teto ao chão e de uma borda à outra. Sem mexer, a faixa continua 50%–250%.',
        'Afastando além da largura do mundo, o Pátio fica no meio da tela, e as montanhas, matas e estrelas do fundo se estendem para cobrir o Pátio inteiro.',
      ] },
      { title: 'Pátio: Céu', items: [
        'Nas Configurações do Pátio, a categoria Estrelas ganhou a opção “Mostrar estrelas a qualquer hora do dia” (desligada por padrão). Ligada, as estrelas aparecem mesmo com o céu claro, com o brilho escolhido em Intensidade. A aurora continua seguindo o próprio “Só à noite”.',
      ] },
      { title: 'Pátio: interior das casas', items: [
        'Em frente à porta de uma casa, Usar (o mesmo comando de Pegar) entra nela; de dentro, o mesmo gesto na porta sai. O contorno da porta acende quando o boneco está no lugar certo.',
        'Enquanto você está dentro de uma casa, o resto do cenário escurece e só a casa fica clara; ao sair, a luz volta.',
        'Ao entrar, a fachada some na sua tela e aparece o interior: um cômodo entre as paredes, com um piso para cada andar da casa. Dá para pular de um andar para o outro e descer com o gesto de atravessar pisos; as paredes e o teto seguram o boneco como as bordas do mundo.',
        'Vale para as casas da Vila dos Telhados e para qualquer casa com porta colocada no Modo editor, em todos os Pátios e para todos os players locais.',
        'O que você atira ou arremessa dentro da casa fica no cômodo e não acerta inimigos do lado de fora.',
        'Com a Grade de blocos, o número de um bloco aberto agora fica atrás dos elementos do Pátio. Uma casa na frente esconde o número, que só aparece para quem entra nela pela porta.',
        'No Pátio online, quem está dentro de uma casa fica escondido pela fachada para quem está fora, e aparece para quem entra na mesma casa. Isso depende do servidor de jogo atualizado; até lá, os outros jogadores continuam aparecendo na frente das casas.',
      ] },
      { title: 'Pátio: largura e elementos do Templo e da Vila', items: [
        'As casas da Vila, o Chão da Vila, os portais de volta dos atalhos e tudo o que foi posto nas cenas do Templo e da Vila agora são elementos soltos como os outros: mudar a Largura limite do Pátio não os move mais junto com o Templo e a Vila. O que passa do fim do mundo some, continua salvo e reaparece no mesmo lugar ao alargar de novo.',
        'Ao estreitar o Pátio, o que estava no fim do Parquinho passa a aparecer nas cenas do Templo e da Vila, em vez de sumir já no fim do Parquinho.',
        'Os Pátios salvos antes abrem com tudo no mesmo lugar em que estava; o que a largura escondia continua escondido.',
      ] },
      { title: 'Servidor', items: [
        'Um salvamento em conflito (alguém salvou outra versão antes) não fica mais sendo repetido sem parar no servidor: o aviso de conflito chega na hora e o servidor não sobrecarrega. Vale para Pátios, perfil, músicas, configuração da galinha e lances das partidas online.',
      ] },
      { title: 'Pátio: painéis', items: [
        'Todo dropdown dos painéis do Pátio ganhou ao lado um botão verde de próximo item: cada toque escolhe a opção seguinte da lista e, depois da última, volta à primeira. Vale no Editar da Zona sonora e na Zona da cena, nas Faixas fixas, no Editar dos outros elementos e nos painéis Itens, Catálogo de aliens, Biblioteca de almas, Escalas, Playgrounds, Câmera de Mira, Ajustes, MIDI e editor de músicas. O botão que já existia nos editores de casas e de árvores ficou com o mesmo fundo verde.',
        'Nos painéis Editar, Camada, Zona da cena, Salvar Pátio, Playgrounds e perfil, as bordas de redimensionar não saem mais do lugar quando o conteúdo é rolado. Antes, a área de arrastar a borda se deslocava junto com a rolagem.',
        'No painel Volume, o botão Mute agora mostra a palavra “MUTE” em vez do ícone de alto-falante; ligado, ele continua destacado.',
      ] },
      { title: 'Pátio: Modo editor', items: [
        'O Modo editor se desliga sozinho depois de 5 minutos sem nenhuma edição no mapa, com um aviso curto. As mudanças pendentes continuam indo para o servidor pelo salvamento automático.',
      ] },
    ],
  },
  {
    version: '2.11.0',
    date: '15/11/2026',
    title: 'Gaiolas no Pátio: as almas ficam em gaiolas de seis modelos, até três por jogador; almas e pássaros exploram o mapa, pousam em árvores, plataformas e objetos, e algumas aves cagam; trocar de Pátio agora troca o mundo inteiro; Best em posição ruim não dobra mais para 6 ovos; botão para copiar o histórico completo da partida; arco e flecha puxado como de verdade no Pátio; combos do Pátio com duração, cooldown e alcance por golpe e golpe relativo à mira; Mute no painel Volume do Pátio; rajada só enquanto segura Atirar; Boomerang e baralhos de cartas explosivas no Pátio; rei não pode mais encostar numa peça congelada; Modo editor do Pátio sem travar ao arrastar elementos; Bateria acústica como instrumento fixo no Pátio',
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
      { title: 'Pátio: Boomerang e baralhos', items: [
        'Três itens novos, que usam o arremesso que vai e volta do Martelo de Thor, sem raio. O botão direito (Golpe) dá o golpe normal com os três. Eles aparecem no painel Itens, na paleta de suportes do Modo editor (Boomerang em Esportivos, baralhos em Magia), como Item solto e na lista de itens do Baú.',
        'Boomerang: dano físico, vai mais longe que o Martelo (1100 px) e segue a curva da mira. A galinha leva dois, um em cada asa: dá para arremessar o segundo com o primeiro no ar, e com os dois fora só dá para arremessar (ou golpear) de novo quando um volta para a asa. Barrinhas no slot mostram quantos estão na mão.',
        'Baralho vermelho e Baralho azul: Atirar joga uma carta até onde a mira está (no máximo 800 px), e ela fica estacionada, flutuando. Segurar Atirar joga uma carta atrás da outra. Parede, plataforma ou chão no caminho param a carta ali.',
        'As cartas saem na ordem do baralho, começando por um Coringa no lugar do Ás: Coringa, 2 a 10, Valete, Dama, Rei e Ás. O slot mostra a próxima carta. Até 14 cartas ficam fora ao mesmo tempo; a que estoura ou volta fica disponível de novo.',
        'A carta estoura quando alguém encosta nela (alien, zumbi, boneco de treino, outro player), na ida, estacionada ou na volta. Quem jogou não a dispara.',
        'O 7 e o Ás estouram sozinhos ao chegar ao destino, com o dobro do raio. Todo estouro que alcança outras cartas faz elas estourarem também, uma depois da outra: cartas próximas viram uma cadeia.',
        'Baralho vermelho: estouro de dano físico, com empurrão.',
        'Baralho azul: cada carta guarda a nota da escala em que a mira estava quando foi jogada e fica em silêncio; ao estourar toca essa nota, dá dano musical (harmonia) nessa nota a quem está no raio e empurra um pouco. O símbolo da carta tem a cor da nota guardada.',
        'Quando quem jogou se afasta mais de 1000 px de uma carta estacionada, ela volta para a mão sem estourar; se encontra alguém no caminho, estoura.',
        'Itens: o grupo “Arremesso que volta” ganhou “Quantos de uma vez”, e os baralhos têm o grupo “Baralho”, com Distância de retorno, Explosão do 7 e do Ás, Área de contato e Intervalo entre cartas. Raio, dano e empurrão do estouro ficam em Explosão.',
        'O limite máximo do inventário do Pátio passou de 25 para 30 itens, para caber um de cada. Pátios que salvaram um limite menor continuam com o deles.',
        'No Pátio online todos veem as cartas e os estouros, e o estouro empurra os players de todos os navegadores.',
      ] },
      { title: 'Pátio: Harpa de Lira e Harpa', items: [
        'A Harpa de até agora passa a se chamar Harpa de Lira. Ela continua igual: o mesmo som, o mesmo glissando da carga e o mesmo lugar nas prateleiras, e os Pátios e inventários salvos seguem valendo.',
        'Escala nova para os instrumentos: Cordas soltas, as cordas de uma harpa em volta da galinha. Cada corda toca só a nota dela; as de Dó são vermelhas e as de Fá azuis. Liga em Itens → Música → Escalas, em qualquer instrumento (na Harpa de Lira, por exemplo).',
        'Cordas soltas: apertar Atirar toca a corda da mira; arrastar a mira com Atirar apertado toca toda corda em que ela entra (arpejo); mover a mira ao longo da corda que acabou de tocar desliza a nota até um semitom (glissando).',
        'Cordas soltas: tocar no meio da corda dá o harmônico (uma oitava acima, com timbre próprio); abaixo do começo da corda, o bemol; acima do fim, o sustenido. Tocar de novo uma corda que ainda soa corta a nota anterior, que some da tela.',
        'Cordas soltas: as cordas se afinam pelo tom da zona, como os pedais da harpa. No painel Escalas dá para escolher de 16 a 48 cordas (22 por padrão), onde elas começam e terminam e o tamanho do ponto do harmônico.',
        'Som novo para os instrumentos: Harpa (harpa de pedais), em Itens → Música → Som. As notas soam por alguns segundos, as graves por mais tempo.',
        'Itens → Música ganhou “Tremolo: reage a”: ao giro da mira (como sempre foi) ou ao movimento ao longo da corda (afastar a mira sobe a nota, aproximar desce).',
        'Instrumento novo e fixo: a Harpa, uma harpa de pedais com banqueta que fica parada no Pátio. No Modo editor ela está na paleta, em Música; em Editar dá para virá-la para o outro lado.',
        'Harpa: perto da banqueta, Pegar senta (a dica “tocar” aparece embaixo dela). Sentada, a galinha não anda nem pula: só a mira e Atirar valem, tocando as Cordas soltas com o som de Harpa. Pegar de novo ou Pular levanta; uma explosão ou um portal também. Sentada ela não é arrastada: clicar em cima dela toca as cordas ali.',
        'Harpa: sentada, as cordas aparecem sempre em volta dela, mesmo com a camada Escalas desligada, e a câmera a mantém no meio da tela. Só um player por harpa. A ficha dela fica em Itens → Instrumentos fixos.',
        'Harpa com duas mãos no gamepad: o analógico direito é a mão da frente e o esquerdo a de trás, cada um acendendo a sua corda. Atirar toca as duas, a do esquerdo primeiro e a do direito logo depois, no ritmo da música (Itens → Música → Atraso entre as mãos: juntas, fusa, semicolcheia, colcheia ou semínima). Segurando Atirar, cada analógico toca as cordas novas em que entra. Analógico solto é mão fora das cordas.',
        'Harpa no gamepad e no teclado: a força do analógico escolhe o lugar na corda (pouco: bemol; metade: harmônico; tudo: nota natural) e segurar Correr dá o sustenido.',
        'Harpa no Pátio online: os outros veem quem está sentado, na pose sentada, e ouvem as notas tocadas. Uma harpa ocupada por alguém de outro navegador não oferece lugar.',
        'Pátio padrão: a Harpa fica numa ilha flutuante no meio da primeira cena, entre as plataformas dos portais do Templo e da Vila e um degrau abaixo delas, com a Harpa inteira à vista a partir do chão. O Pátio padrão já salvo ganha a ilha e a Harpa sozinho ao abrir.',
        'Harpa: sentada, a câmera sobe o que for preciso para a harpa e as cordas caberem inteiras na tela, também em telas baixas.',
        'Harpa no celular: sentada, os dedos tocam as cordas direto na tela (dois dedos, duas mãos) e os controles de andar somem. O botão de Pegar vira Tocar ao lado da harpa e Sair enquanto ela está sentada.',
        'O Pátio agora toca até 24 notas ao mesmo tempo (eram 18), para as cordas da harpa soarem juntas. Vale conferir no celular se o som continua limpo.',
      ] },
      { title: 'Pátio: prévia das escalas', items: [
        'Painel Escalas: toda escala mostra agora o seu desenho logo abaixo da lista, sempre visível enquanto você rola os números. Ele muda na hora quando você mexe na Forma (divisa dos anéis, miolo vazio, cordas) e segue o tom da zona do Pátio e o instrumento que está na mão.',
        'Passar o mouse ou o dedo sobre a prévia acende a célula que a mira tocaria ali. A Bateria continua com o gráfico do editor do kit.',
      ] },
      { title: 'Pátio: Bateria (instrumento fixo)', items: [
        'Instrumento novo e fixo: a Bateria, um kit acústico com banqueta que fica parado no Pátio. No Modo editor ela está na paleta, em Música; em Editar dá para virá-la para o outro lado. Perto da banqueta, Pegar senta; Pegar de novo ou Pular levanta. Um player por bateria.',
        'Sentada, aparece em volta da galinha a escala Bateria: um botão redondo grande por peça (Ataque, China, Tom 1, Tom 2, Splash, Chimbal, Condução com o Sino no meio, Caixa, Bumbo e Surdo). Não precisa de Atirar: cada clique do mouse ou dedo na tela dá uma batida na peça embaixo, mais fraca perto da borda.',
        'Clicar entre as peças, dentro da escala, dá barulhinhos de ferragem sorteados (aro, baqueta com baqueta, casco, estante, borda de prato), nunca o mesmo duas vezes seguidas.',
        'Gamepad: cada analógico é uma baqueta independente. Saindo do repouso, toca a primeira peça que encontra e depois toda peça em que entrar; quanto mais rápido o movimento, mais forte a batida. Ataque e China ficam atrás dos tons, fora do alcance dos analógicos: tocam por L3 e R3.',
        'Atalhos padrão: Bumbo em andar para a direita e RB; Caixa em andar para cima, RT e LT; Chimbal fechado em andar para a esquerda e LB; Chimbal aberto em andar para baixo e LT; Ataque em L3; China em R3. “Andar” são as teclas e o direcional de cada player (no teclado, D, W, A e S ou as setas).',
        'LT é o pedal do Chimbal: quanto mais fundo, mais aberto ele soa (um arco em volta do botão mostra a abertura), e soltar fecha o som na hora. Com o pedal aberto, o Chimbal tocado por LB, clique ou baqueta soa aberto também.',
        'LT e RT na Caixa: um puxão brusco dá uma batida, mais forte quanto mais rápido; um movimento lento faz o rufo, mais forte e mais rápido quanto mais fundo. O rufo pode ser desligado no editor do kit. Em gamepad sem gatilho analógico, o gatilho vale como botão comum.',
        'A escala Bateria tem enquadramento próprio: nunca sai da tela (perto de uma borda desliza para dentro e, grande demais, encolhe até caber) e tem tamanho e deslocamento ajustáveis em Escalas → Bateria → Kit → Enquadramento no Pátio. O tamanho dela não segue mais o “Escalas (Tamanho)” das camadas.',
        'Editor do kit: no painel Escalas, escala Bateria, grupo Kit. O mesmo gráfico com as peças arrastáveis, o tamanho de cada uma, a opção “Atrás das outras” e os atalhos de cada peça (uma tecla ou botão capturado na hora, ou uma direção de andar). O botão Padrão volta ao desenho original. Fica salvo neste navegador.',
        'Som novo: Bateria acústica, sintetizada (bumbo, caixa com esteira, três tambores e seis pratos). Cada batida solta uma nota em voo na direção da peça, e as peças do kit se mexem no cenário quando tocadas.',
        'No Pátio online os outros veem quem está sentado e ouvem as batidas; a abertura contínua do Chimbal e o rufo soam só para quem toca.',
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
  {
    version: '2.9.0',
    date: '12/11/2026',
    title: 'Campanha Blues, Jazz & Rock recriada com 13 músicas novas; campanha World com 13 estilos novos, Africa Cult recomposta com percussões mais naturais e campanha Brazilian revista, com dez kits recompostos por seção e duas fases novas, Chula e Chamamé; Pátios em Destaque e Item solto no editor; golpe forte carregado para Taco e Passaguá',
    groups: [
      { title: 'World', items: [
        'A campanha passa de 4 para 17 fases. Oito estilos novos: Jerez 1970 · Flamenco (bulerías em doze tempos, com palmas, taconeo, nudillos, violões e cante), Havana 1950 · Son cubano (clave, bongó, tres no montuno, trompete e coro), Barranquilla 1960 · Cumbia (tambora, llamador, maracas, gaitas e acordeão), Guča 1975 · Čoček (banda de metais dos Bálcãs em nove), Cairo 1960 · Baladi (tabla, riq, oud, qanun, cordas, acordeão e nay), Amritsar 1980 · Bhangra (dhol, tumbi e gritos em resposta), Ubud 1935 · Gamelan (metalofones entrelaçados, gongos e escala de cinco notas) e Lima 1975 · Festejo (cajón, quijada, cajita e violões em 12/8).',
        'Cinco estilos da Oceania: Yirrkala 1960 · Manikay (clapsticks, yidaki e a linha descendente do cantor), Papeete 1960 · Ōte\'a (tō\'ere, pahu e fa\'atete), Honolulu 1935 · Hula (steel guitar, ukulele, contrabaixo e ipu), Rotorua 1920 · Haka (chamada do líder, resposta do grupo, pés e percussão corporal) e Port Moresby 1970 · String band (violões, ukuleles, baixo de bambu e vozes em harmonia). Manikay e Haka são estudos originais da forma, sem cantos nem textos tradicionais.',
        'Reggae, Anatolian rock, Kalamatianos e Chacarera foram recompostos por seção, com introdução, versos, refrão, solo, quebra e final próprios e reações da partida que levam a cada parte.',
        'Cada cidade nova tem foto, texto de abertura e descrição no mapa.',
      ] },
      { title: 'Africa Cult', items: [
        'As 12 músicas foram recompostas por seção. As percussões soam mais naturais: cada golpe varia de força, de cor e de afinação como numa mão de verdade, os timbres estridentes saíram ou ficaram mais baixos e os tambores de cada estilo têm sons diferentes entre si.',
        'As introduções agora soam como introduções: começam com parte da banda, sem voz, metais nem refrão (guembri e qraqeb no Gnawa, mbira e hosho no Chimurenga, nyatiti e orutu no Benga), e os outros instrumentos entram nas seções seguintes.',
        'Cada música ficou mais fiel ao estilo: o sebene de guitarras no Soukous, as rajadas de sabar no Mbalax, os krakebs em galope no Gnawa, a mbira cíclica com hosho no Chimurenga, a timbila no Majika, as guitarras gêmeas do Benga, o saxofone tenor na Marrabenta e os tambores ngoma no Semba no lugar dos metais.',
      ] },
      { title: 'Campanha', items: [
        'A campanha Harmonic songbook agora se chama Blues, Jazz & Rock. A fase Canterbury 1972 (Progressive pastoral) saiu, e os estilos aparecem só com o nome do gênero, sem "/": Electric blues, Swing, Gypsy jazz, Cool jazz, Jazz waltz, Doo-wop, Piano pop, Progressive rock, Southern rock, Pop punk, Folk rock, Alternative rock e Indie pop.',
        'As 13 músicas foram compostas de novo, cada uma com forma completa (introdução, temas, solos, quebras e final), harmonia por compasso e Estados e Eventos próprios: o blues de 12 compassos em Chicago, AABA de big band em New York 1930, la pompe cigana em Paris, jazz em cinco em Oakland, valsa de jazz em três em New York 1962, doo-wop com modulação no último refrão, piano pop orquestrado em London, rock progressivo em sete em Cambridge, guitarras gêmeas em Jacksonville, pop punk em San Diego, folk rock com 12 cordas e bandolim em San Francisco, rock alternativo com tremolo e parede de fuzz em Berkeley e indie pop com ukulele e drop de sintetizador em Columbus.',
        'Jazz e blues ganharam swing de verdade: as colcheias puxam para a tercina, com a intensidade de cada estilo. Oakland passa a 160 BPM, Paris a 184, New York 1930 a 152, New York 1961 a 128 e San Diego a 164.',
        'Ao abrir uma dessas fases, uma cópia salva da versão anterior do kit é trocada pela nova.',
        'Ordem das campanhas no mapa: Brazilian e Africa Cult aparecem acima de Blues, Jazz & Rock, e World vem depois.',
        'Cada estilo aparece com um nome só, sem "/" nem complementos: Baião, Sertanejo raiz, Maracatu, Samba-enredo, Chula, Anatolian rock, Kalamatianos, Chacarera, Gnawa, Soukous, Jùjú e Benga.',
        'Ao abrir uma fase de Brazilian, Africa Cult ou World, uma cópia salva da versão anterior do kit é trocada pela nova.',
      ] },
      { title: 'Timbres', items: [
        'Novas guitarras elétricas, gravadas de verdade e passadas por amplificadores: tweed no blues e no slide, crunch e lead no southern rock, power chords e palm mute no pop punk, fuzz no rock progressivo e alternativo, 12 cordas no folk rock e limpa com chorus e tremolo. Também entram um baixo de rock valvulado e uma gaita de blues amplificada.',
        'Novo grupo vocal (sintetizado): "ooh", "aah", "doo-wah", baixo "bom" e falsete, usados no doo-wop e em vocais de apoio de outras fases.',
      ] },
      { title: 'Criativo', items: [
        'O campo Harmony de uma seção aceita até 16 graus (antes 8), para caber um blues de 12 compassos ou uma forma de 16 numa seção só.',
      ] },
      { title: 'Brazilian', items: [
        'Duas fases novas: Santo Amaro 1960 · Chula (samba de roda do Recôncavo, com viola machete, cantadores em terças, relativo da roda, pandeiro, palmas e prato e faca) e Campo Grande 1975 · Chamamé (6/8 com acordeonas em terças, violões no arrastre, contrabaixo, violino no chamamé triste e o grito do sapucay). A campanha passa a ter 12 fases.',
        'Choro, Samba, Sertanejo raiz, Baião, Bossa nova, Samba-enredo e Funk carioca foram recompostos: cada música tem 9 ou 10 seções, com uma parte mais suave (roda, moda de viola, toada, madrugada) e outra mais tensa (partido-alto, catira, arrasta-pé, ponte, surdos dobrando), e as reações da partida levam a elas.',
        'Ritmos mais humanos em todos esses kits: as semicolcheias têm a ginga de cada estilo, os golpes variam de força como numa mão de verdade, alguns só às vezes tocam, e as melodias crescem e respiram por frase.',
        'Samba-enredo: o surdo ficou grave, forte e marcante, as caixas deixaram de soar como metralhadora (dinâmica de mão e menos camadas ao mesmo tempo) e o refrão ficou mais aberto.',
        'Bossa nova: chimbal suave, um pouco atrás do tempo, com semicolcheias que aparecem e somem e nunca dois compassos iguais.',
        'Choro: clarinete no lugar do flautim, pandeiro e ganzá com timbres gravados e linhas melódicas mais suaves e cantadas.',
        'Funk carioca: batidão grave e forte nos drops, sub 808 com saturação, Rhodes nos stabs e mais dinâmica entre intro, pré-refrão, drop e montagem.',
        'Sertanejo raiz e Baião: violão, contrabaixo, pandeiro, ganzá, pífano (flauta doce) e agogô com timbres gravados; a dupla caipira canta em terças na região de tenor.',
        'Frevo, Maracatu e Samba-reggae também foram recompostos por seção: o frevo com a orquestra de metais e palhetas em pergunta e resposta, o maracatu com alfaias, gonguê, caixa, agbê e a loa do mestre respondida pelo coro da nação, e o samba-reggae com os surdos complementares do bloco, repique, trompete, trombone e coro.',
        'Samba, Sertanejo raiz, Baião, Chula e Chamamé: as figuras de percussão escritas em um compasso agora soam em todos os compassos; antes, algumas só tocavam no primeiro de cada quatro.',
      ] },
      { title: 'Pátio', items: [
        'Playgrounds ficou mais largo e com só dois botões no topo: Novo Pátio padrão e Novo Pátio vazio. Abaixo, três blocos que abrem e fecham: Destaques, Favoritos e Salvos.',
        'Destaques: o admin destaca Pátios pelo botão de medalha, e eles aparecem para todo mundo no primeiro bloco, junto do Pátio padrão.',
        'Os Pátios de exemplo Pôr do sol com torres e Vales e ilhas no céu deixaram de ser botões e viraram Pátios normais do admin, em Destaques.',
        'Pátio vazio (e qualquer Pátio aberto depois de outro) não traz mais itens soltos do Pátio anterior.',
        'Apagar um Suporte de item no Modo editor deixa o Item solto no lugar: ele não reaparece depois de pego, pode ser selecionado e apagado, e fica salvo no Pátio. Assim dá para fazer um Pátio com um único item.',
        'Salvar Pátio: o aviso do estado do Pátio, quem vira padrinho e o auto-save agora ficam juntos no fim do painel.',
        'Correr por cima de um item que você já tem não troca mais o item da mão: a tecla de Correr (Shift no padrão) continua pegando itens novos, mas só a tecla própria de pegar (E/P) ou o botão do toque fazem o Equipar.',
        'Zumbis não se amontoam mais embaixo da galinha quando ela está numa plataforma: cada um ronda por perto, anda até um ponto ao lado dela, para olhando para ela e muda de lado, e volta a atacar quando ela desce.',
        'Novo painel Escalas (ícone de nota no cabeçalho do Pátio), no estilo do painel Itens: escolha a escala na lista do topo (ela acompanha a escala do instrumento na mão) e ajuste os números dela. Padrão volta a escala aos valores do game; o admin grava tudo com Salvar no game.',
        'As escalas entram em standby: depois de 0,5 s sem tocar o instrumento, a camada Escalas some em 1,5 s. Cada escala tem Fade out (standby) depois de (0,1 a 3 s), Tempo do fade out (0,1 a 5 s), Visibilidade em standby (0 a 100%, padrão 0%) e Visibilidade da célula mirada (padrão 33%: em standby a célula da mira continua aparecendo; em 0 ela some junto). Atirar, golpear ou trocar de escala ou de item faz a escala voltar na hora.',
        'Ciclo de quintas e Tensão e resolução ganharam Divisa dos anéis (até onde vai o anel de dentro, que decide qual anel a mira toca) e Miolo vazio; o Campo harmônico ganhou Miolo vazio.',
        'Camadas ganhou a caixa Prevenir fadeout das escalas (desligada por padrão): ligada, as escalas ficam sempre visíveis.',
        'Painéis do PigChicKen mais compactos: sliders, seletores, caixas de marcar, botões de opção e as teclas de Controles ficam a 2 px um do outro em todos os painéis (Volume, Camadas, Configurações do Pátio, Câmera de Mira, Controles, Ajustes, Itens, Catálogo de aliens, Biblioteca de almas, editores de árvore, casa, elementos, zonas, músicas e Gerar de MIDI).',
        'Armas de bastão (Taco e Passaguá) ganharam o golpe forte: segure Atirar para carregar e solte para bater. Enquanto carrega, a asa leva o bastão para trás e ele fica balançando; quanto mais tempo segurando, mais longe o golpe chega e maiores ficam o bastão e o rastro, até os limites de cada item. O golpe de sempre continua no botão de Golpe, agora como golpe rápido.',
        'Itens → Golpe forte (Taco e Passaguá): dano, alcance, arco, intervalo, duração, empurrão, rastro e movimento próprios, mais o tempo de carga e os limites de alcance e de tamanho com a carga cheia.',
        'Taco e Passaguá agora ficam apoiados no ombro, e Itens → Pontos virou um editor visual para eles: arraste o ponto do bastão que a mão da asa segura, a posição da mão no corpo e a bolinha da ponta (inclinação), parado e carregando o golpe forte.',
        'Passaguá: com Dano do golpe e Empurrão configurados, o golpe agora fere e empurra aliens, zumbis e bonecos (antes não fazia nada neles). Aves e almas capturáveis continuam sendo capturadas sem levar o golpe. A redinha ficou na mesma direção do cabo, presa na ponta.',
        'Celular: arrastar a partir de Correr move o analógico de movimento, então dá para correr e escolher a direção com o mesmo dedo; passando por cima de Chocar ou Pular, esses botões também são apertados.',
        'Celular: Pular, Chocar e Correr funcionam com um dedo só deslizando: o botão onde o dedo encostou fica apertado até soltar, e cada botão por onde ele passa é apertado enquanto o dedo estiver em cima. Botões sobrepostos (posicionados em Editar posição dos botões) são apertados juntos num toque só, para combos.',
        'Celular: Throw arremessa ao soltar o dedo. Um toque arremessa na hora, sem carga, para onde o analógico de movimento aponta ou para onde a galinha olha; arrastar para fora do botão mira no ângulo do arraste e carrega até soltar.',
        'Celular: o avatar e o contador de almas capturadas de cada player ficam sempre no canto superior direito, mesmo quando a linha do inventário foi movida.',
      ] },
    ],
  },
  {
    version: '2.8.0',
    date: '11/11/2026',
    title: 'Ajudas e atrapalhos das almas soltas, almas soltas, pintinhos e roubo no Pátio online, editor das fichas de almas para admin e coleção de almas na conta; zonas sonoras em silêncio, com batidas, baixos e limites arrastáveis',
    groups: [
      { title: 'Pátio', items: [
        'Configurações do Pátio ganhou Espaço abaixo do chão: quanto chão aparece abaixo dos bonecos, no pé da tela, onde fica a barra do inventário. Era fixo em 100 px; agora vai de 30 a 400 px e fica salvo com cada Pátio. No celular em pé, o espaço continua sendo o dos controles de toque.',
        'Para contas admin, o botão Salvar no game aparece no fim dos painéis Configurações do Pátio, Câmera de Mira, Camadas e Volume e grava, pelo Admin local, os valores do painel como padrão do jogo: as configurações que um Pátio vazio novo recebe, a Câmera de Mira e os volumes de quem nunca mexeu neles e as Camadas dos Pátios que não salvaram as suas. Vale para todos depois do deploy.',
        'Ajustes da galinha: a fileira de botões do topo saiu. Desfazer, Padrão (o antigo Valores do código) e Debug viraram ícones no cabeçalho, ao lado do fechar, e Salvar padrão virou Salvar no game, no fim do painel, só para admin. Em Configurações do Pátio, Câmera de Mira e Volume, Padrão também virou ícone, e o cabeçalho do Volume fica fixo no topo com uma linha divisória, como nos outros painéis.',
        'O vibrato natural dos instrumentos (a ondulação que a nota tem sozinha, mesmo com a mira parada) saiu do código e virou parâmetro em Itens → Música: profundidade (em cents; 0 deixa a nota reta), velocidade e atraso. Flauta, sax, trompete e violino começam com os valores que já soavam; os outros começam em zero e também podem ganhar vibrato. A onda do feixe do violino agora acompanha o som: segue a profundidade do vibrato e fica mais alta enquanto o tremolo da mira entorta a nota.',
        'Biblioteca de almas, para admin: o lápis no cabeçalho do painel liga a edição das fichas. Cada alma abre com nome, raridade, classe de voo, forma, tamanho do pixel, cores e olho brilhante para mudar, mais os números de voo só dela por cima dos da classe.',
        'Nas almas raras o admin também edita a receita (espécies, estado, instrumentos, notas e armas), muda a ordem na lista (a primeira receita que serve leva a alma), cria uma nova, duplica qualquer alma como rara e exclui.',
        'O que o admin muda nas fichas vale na hora no próprio navegador, inclusive para as almas que já voam soltas. Padrão volta uma ficha, ou todas, para as do game, e Salvar no game grava as fichas pelo Admin local para publicar para todos.',
        'No mundo, a alma capturada continua com a cor do alien que ela era (a morta, com o olho na cor da nota), menos nas cores que a ficha dela mudou.',
        'A coleção da Biblioteca de almas passa a ser guardada na conta de quem está logado: o que você captura num navegador aparece nos outros, e cada aparelho fica com tudo o que os outros encontraram (por alma, a maior contagem, a primeira data e todas as notas e armas). Visitantes continuam com a coleção só no navegador. Depende de uma migração nova no Supabase: enquanto ela não for aplicada, a coleção fica no navegador e o painel avisa.',
        'No alto da Biblioteca de almas, uma linha mostra onde a coleção está guardada: neste navegador, sincronizando ou na sua conta.',
        'Almas soltas agora ajudam o dono, cada uma conforme a classe de voo: a Sentinela canta notas do acorde no inimigo mais perto e enche a harmonia dele, a Ritmada faz o mesmo no tempo da batida, a Preguiçosa busca o item arremessado ou largado e solta aos pés do dono, a Patrulheira avisa com pios e um “!” do inimigo que vem pelas costas, e a Escolta mergulha para ser um degrau no ar quando o dono cai de alto. O Pintinho só acompanha.',
        'Almas mortas às vezes atrapalham, pela arma que as matou: a de explosão empurra, a de bala faz o dono quicar, a de flecha balança a mira e a de impacto bica e trava o item por um instante. A chance cresce com a raridade, e a alma que vem atrapalhar deixa um rastro vermelho: dá para capturá-la com o Passaguá antes. Almas de nota fora da escala desafinam as notas do dono por alguns segundos.',
        'Biblioteca de almas: a ficha de cada alma mostra a ajuda que ela dá e o atrapalho. Para admin, o grupo Ações do editor muda o tipo de ajuda, o intervalo, o alcance e a força, e o tipo, a chance e a força do atrapalho de cada alma.',
        'Pátio online: as almas que cada um solta agora aparecem para todos os navegadores do lobby, com um anel na cor de quem soltou. O Passaguá captura a alma solta de outro jogador: ela some numa nuvem, sai das almas dele, voa para o seu contador e entra na sua Biblioteca. Se dois tentam ao mesmo tempo, só o primeiro leva.',
        'Pátio online: o pássaro morto-vivo agora é capturado uma vez só, por quem acertar primeiro. Antes, quem não era o dono do lobby capturava o mesmo pássaro várias vezes, e a alma vinha sem instrumento, nota e arma.',
        'Pátio online: o pássaro que nasce de um alien na tela de quem não é o dono do lobby agora lembra o instrumento e a nota que aquele jogador tocou, e vira a alma certa na Biblioteca.',
        'Pátio online: os pintinhos de cada jogador agora aparecem para todos os navegadores do lobby, com a mesma cor e os mesmos movimentos. O Passaguá captura o pintinho de outro jogador: ele some do bando dele e a alma voa para o seu contador. Se dois tentam ao mesmo tempo, só o primeiro leva.',
        'Todo painel flutuante, na primeira vez que abre, aparece centralizado junto ao botão que o abriu (abaixo dele, ou acima se não couber); depois de arrastado ou redimensionado, volta ao lugar escolhido. O último painel aberto sempre fica por cima dos outros, inclusive o Camadas e o Volume.',
        'O Pátio perde o botão Preferências: Contador de FPS e Limitar a 240 FPS passam para o painel Camadas, abaixo de Hit-boxes. Em todos os modos, a opção “Mostrar contador de FPS” passa a se chamar Contador de FPS.',
        'Em Playgrounds, cada Pátio das listas Salvos e Favoritos tem uma estrela para favoritar ou desfavoritar ali mesmo.',
        'Configurações do Pátio e Câmera de Mira ficam com o título fixo no topo enquanto o conteúdo rola; Configurações do Pátio perde a nota do fim, e as instruções dos sliders da Câmera de Mira e dos Ajustes aparecem só ao passar o mouse.',
        'Com o Modo editor fixo na lateral, os painéis de configuração dos elementos (editar elemento, camada e colisões, zona da cena, casas e árvores) abrem por cima dele, cobrindo-o inteiro, em vez de ocupar a área do jogo; ao fechá-los, o Modo editor volta a aparecer.',
        'Zonas sonoras começam em Silêncio: as zonas das cenas e toda Zona sonora nova não tocam batida nem baixo até você escolher (o tom, a escala e o andamento continuam valendo para os instrumentos). Vale para o Novo Pátio vazio e para qualquer cena que o Pátio ainda não tinha mudado; zonas que já estavam salvas continuam tocando como antes.',
        'No painel da zona, Batida escolhe o ritmo entre vários estilos (Reto, Meio tempo, Swing, Rock, Disco, Funk, House, Techno, Trap, Boom bap, Bossa nova, Samba, Baião, Reggae, Reggaeton, Afrobeat, Brisa, Feira e Pulso), com volume próprio, e Editar a batida abre uma grade de 16 passos por tambor para montar a sua: cada clique passa por normal, acento e pausa.',
        'Baixo escolhe o grave da zona: Drone, Drone grave ou Pad sustentados, linhas de baixo (Pulsado, Colcheias, Oitavas, Caminhando, Sincopado, Reggae, Baião, Bossa nova) e figuras de synth (Arpejo, Arpejo rápido, Sequência ácida, Contratempo, Acordes no contratempo), todos seguindo o acorde do compasso, com oitava e volume próprios.',
        'A zona de cada cena agora é uma Zona sonora grudada no chão: abre o mesmo painel das outras e ganha Cadeia do ambiente, Pássaros da zona e Troca a música ao entrar. Só não tem prioridade nem paredes, porque qualquer Zona sonora do mapa vence a da cena.',
        'No Modo editor, com a camada Zonas ligada, passar o mouse no limite de uma zona mostra o cursor de redimensionar e arrastar muda o limite: os quatro lados de cada Zona sonora (duas zonas encostadas movem o limite juntas) e a linha tracejada entre as zonas de duas cenas vizinhas.',
        'O painel da zona ficou mais enxuto, em blocos Harmonia, Ritmo e Baixo, com o resto recolhido em Notas e regras; Predefinição copia uma das cenas com o som que ela tinha, ou volta ao Silêncio. As tags da zona ganham Batida e Baixo.',
        'O Pátio vazio e o Pátio de exemplo do pôr do sol nascem sem o Templo do Gongo (gongo, jukebox e os suportes de armas da entrada) e sem a Vila no fim; em Configurações do Pátio, Templo e Vila liga ou desliga os dois em qualquer Pátio.',
        'Montanhas: Altura agora sobe as cordilheiras na tela, o antigo Altura virou Inclinação, Cordilheiras vai até 6, Relevo sombreia as encostas, e a neve ganha Pontas (línguas descendo pelas encostas) e Sombra azulada.',
        'Céu e luz ganha Cor do sol e Alcance do brilho; Configurações do Pátio ganham as categorias Estrelas (quantidade, tamanho e intensidade) e Nuvens: quantidade, tamanho, altura no céu, espalhamento, opacidade, suavidade, volume, vento, cor e Sortear forma.',
        'A textura do céu ganha Tamanho, Estrias, Grão e a mistura com o céu (Suave, Forte, Escurece ou Clareia), e não mostra mais emenda entre os ladrilhos.',
        'Com o zoom-out total, as montanhas e a mata do fundo descem até o pé da tela (sem a faixa do céu por baixo), e tudo o que fica além do limite do Pátio é preto.',
        'Postes e torres: o botão Ligar fios, no Editar, liga o selecionado a qualquer outro do mesmo tipo com um clique (de qualquer modelo e em qualquer lugar), e clicar de novo desliga; a seleção segue para o recém-ligado, para ir montando a linha. Duplicar um poste ou torre já traz a cópia ligada, e o seletor Linha saiu.',
        'Montanhas ganham Tipo de pico (Ondulado, Pontudo ou Geométrico), Degradê, Opacidade (uma cordilheira deixa ver a de trás) e Contorno com cor; com Relevo, Sombra escolhe entre Encostas, Meio a meio (o pico rachado do topo ao pé) e Vincos.',
        'A neve das montanhas passa a cair em cada pico, do tamanho dele, e ganha Borda (Línguas, Ondas, Suave, Estrias ou Aresta), Lado da luz (a neve puxada para a encosta iluminada) e Cor da neve; a neve ficou mais clara.',
        'Nova categoria Neve caindo nas Configurações do Pátio: flocos sobre as montanhas e as matas, com quantidade, tamanho, velocidade, vento e opacidade.',
        'Céu e luz: Suavidade do sol (do disco recortado a uma mancha de luz), Posição e Altura do sol livres da hora, Cor do brilho separada da cor do sol e Brilho até 200%. Com Curvatura, Anéis em volta do sol centra o degradê no próprio sol e Tamanho dos anéis espalha as cores.',
        'Playgrounds ganha Novo Pátio de exemplo: vales e ilhas no céu. É um Pátio da largura padrão todo preenchido: seis biomas no chão (Campina, Floresta gigante, Deserto, Vulcão, Montanha nevada e Vila de conto), cada um com sua vila, árvores, itens e música; três camadas de ilhas flutuantes com casas até Asgard, no topo; postes e torres ligando as regiões e as camadas; escadas de plataformas, trampolins e portais para subir. Um martelo de pedra na cratera do vulcão e um cajado de madeira em Asgard marcam o lugar do martelo de Thor e do cajado de Odin.',
        'Nuvens ganham o tipo Cumulus: montes altos de gomos iluminados do lado do sol, com Gomos, Desfiado (contorno esfumaçado) e Cor da sombra; Tamanho vai até 600%. O vento agora move as nuvens sem redesenhá-las.',
        'Sem nenhum item, a barra do inventário fica escondida (nem a casa vazia aparece) e volta assim que ela pega o primeiro item; vale para todos os players locais.',
        'No Modo editor, o grupo Música ganha o Gongo e a Jukebox para pôr em qualquer lugar do Pátio, mesmo sem o Templo. A Jukebox abre a lista de músicas para escolher e tocar; o Gongo já vem com uma música escolhida nas configurações e a toca depois de um número de batidas. Uma música começada por eles toca onde a galinha estiver, sem perder ao sair da cena.',
        'Configurações do Gongo: a música, o título acima dele (vazio, nenhum texto aparece), quantas batidas para começar, quantas batidas durante a música para pará-la (ou nunca), depois de quantos segundos sem bater ele esquece a contagem (ou nunca) e se mostra as lâmpadas das batidas.',
        'Na Jukebox, enquanto uma música (ou a Campanha do Gongo) toca, o botão Tocar vira Parar.',
        'Editor de música: o botão + Alien põe um alien no cursor, e escolher uma variação na lista ao lado já põe um alien dela; o nome da música é editado direto no título; as pausas podem ser arrastadas para outro compasso; arrastar na régua de tempo move o cursor e a prévia acompanha (com a música tocando, ao soltar ela segue dali); Tom, Escala e Cor perdem os rótulos.',
        'Novo instrumento, o Hangdrum, no fim da prateleira dos instrumentos do Pátio padrão. Ele toca na escala Hangdrum: a nota central grande e grave (a tônica da zona) e uma fileira de 8 notas em volta, subindo a escala da zona em zigue-zague como num hang de verdade. Mirar numa nota toca a nota limpa; mirar no espaço entre elas dá uma batida percussiva, com o grave do corpo e a nota mais perto soando de leve.',
        'Itens → Hangdrum: Tipo de som escolhe o timbre (Hang clássico, Handpan nitretado ou Handpan inox, este com o som mais longo), e Fileiras e Notas por fileira montam até 2 fileiras de 5 a 9 notas. A escala Hangdrum também pode ser ligada nos outros instrumentos, e a camada Escalas desenha o hang com as notas.',
        'Galinha em cima de uma caixa flutuante: Chocar + Pulo, ou andar para o lado + Chocar + Pulo, agora a fazem inverter de lado, ficando pendurada embaixo da caixa (e, pendurada, voltar para cima). Baixo + Chocar + Pulo desce da plataforma e Cima + Chocar + Pulo continua impulsionando para o alto.',
        'Modo editor: Del apaga o elemento selecionado na hora, sem confirmação (Ctrl+Z desfaz). Ctrl+D não duplica mais, para não copiar sem querer; Duplicar fica no botão da barra.',
        'O painel Editar de cada elemento ganhou uma lixeira Excluir ao lado do fechar. É o jeito fácil de apagar uma Zona sonora aberta pela tag do nome.',
        'Teclado secundário: Del e Backspace saem de Próximo item e Recarregar, também nos controles já salvos.',
      ] },
      { title: 'Mapa', items: [
        'Na lista de campanhas do globo, as cidades da África, das campanhas World e as últimas do Brazilian voltam a aparecer: no fim da lista algumas linhas ficavam invisíveis depois da animação de entrada.',
      ] },
    ],
  },
  {
    version: '2.7.0',
    date: '10/11/2026',
    title: 'Escalas alternativas nos instrumentos, sopros na boca, asas segurando os itens e música ambiente afinada',
    groups: [
      { title: 'Pátio', items: [
        'Flauta, sax e trompete ficam presos pela ponta do bocal no bico da galinha e giram a partir dali ao mirar; a cabeça passa a ficar na frente da asa enquanto ela toca. A mira e a saída das notas acompanham o novo eixo.',
        'As asas seguram os instrumentos: a ponta da asa da frente e a da asa de trás ficam sempre encostadas num ponto de cada instrumento, girando e esticando como já acontecia com o arco do violino (que continua com a asa enquanto toca).',
        'Em Itens, o novo grupo Pontos mostra o desenho do item com o Eixo, a Asa, a Asa de trás e a Saída do tiro para arrastar com o mouse ou o dedo, a escolha de onde o eixo fica preso (ombro ou boca) e se cada asa segura o item. Vale também para as armas, com as asas desligadas por padrão. O Salvar no game do painel Itens grava esses pontos junto com o resto.',
        'No Pátio online, o item na mão das galinhas dos outros players gira com a mira de quem joga (os olhos acompanham) e usa os mesmos pontos.',
        'No Pátio online, as galinhas dos outros players agarradas a paredes, tetos e rampas aparecem viradas para a superfície, com a mesma pose de escalada, em vez de flutuar no ar.',
        'Itens → Pontos ganha Inverter asa (vertical): as asas que seguram o item ficam espelhadas ao longo do comprimento, para não ficarem de cabeça para baixo quando giram muito. Vem marcado na flauta, no sax e no trompete.',
        'A camada Escalas some enquanto a galinha é arrastada pelo mouse ou pelo toque e volta ao soltar.',
        'No Modo Editor, o tronco escalável das árvores deixa de agarrar a galinha só por ela andar contra ele no chão: agora funciona como os colliders flutuantes, e a escalada começa apertando Cima perto do tronco.',
        'Escalas alternativas nos instrumentos: além da Escala primária (o leque de sempre), cada instrumento pode tocar o Ciclo de quintas e Tensão e resolução. Nelas a direção da mira escolhe um dos 12 setores e a distância escolhe o anel: com o mouse vale onde o cursor está; no analógico, empurrado pela metade toca o anel de dentro e esticado inteiro o de fora. Cada região tem um acorde fixo.',
        'Ciclo de quintas: acordes maiores por fora (C em cima, G, D…) e as relativas menores por dentro. Tensão e resolução: diminutos e dissonantes no miolo e, nas bolinhas em volta, o acorde que resolve cada um.',
        'Num instrumento com várias escalas, a rodinha do mouse e a troca rápida passam pelas escalas antes de ir para o próximo item; cada troca de escala faz o som de recarga da arma da família do instrumento e mostra o nome da escala. Em Itens → Música → Escalas dá para ligar e desligar cada uma (todas vêm ligadas nos instrumentos).',
        'Com a camada Escalas ligada, as escalas redondas aparecem como gráfico em volta da galinha, com a região da mira acesa.',
        'Nova escala Espiral nos instrumentos: as notas da escala da zona viram pedaços de uma espiral em volta da galinha, do grave (por fora) ao agudo (por dentro), uma volta por oitava; a mira escolhe o pedaço pela direção e pela distância. Em Itens → Música, “Espiral descendente” inverte para do agudo ao grave.',
        'Nos gráficos das escalas, cada acorde aparece em cifra (C, Am, B°7, G7♭9…) com o grau em cima (I, vi, V, vii°7…, em relação à tônica da zona); na Espiral, cada nota mostra a letra e o número do grau.',
        'Nova escala Campo harmônico nos instrumentos: uma roda com as 7 casas do tom da zona (I ii iii IV V vi vii° em tom maior), cada uma com o acorde em cifra e o grau. A roda gira para a tonalidade da música onde a galinha está (o I fica onde a tônica está no ciclo de quintas: Dó em cima, Sol um pouco à direita…), então cada zona pede outro ângulo; o contorno claro marca a casa do acorde que está tocando.',
        'No painel da zona sonora (e da cena), Dano nos inimigos pode valer só para notas do tom ou só para o acorde da hora; as outras notas resvalam cinza sem harmonizar. Vem em Todas as notas.',
        'No inventário, em cima de cada instrumento, bolinhas desenham o padrão do Arpejador (subindo, descendo, sobe e desce, aleatório, frase ou uma linha reta quando desligado), coloridas no item da mão. Clicar ou tocar nelas passa para o próximo padrão, sem equipar nem atirar, e o painel Itens acompanha.',
        'Violino com arpejo ligado toca pizzicato: notas curtas pinçadas no ritmo do arpejo, em vez do feixe contínuo; com o arpejador desligado, continua o feixe de sempre.',
        'O drone de fundo das zonas toca a terça de cada acorde, então dá para ouvir se ele é maior, menor ou diminuto, e a quinta do acorde em vez de uma quinta fixa.',
        'O drone muda de nota na virada do compasso, sem deslizar entre uma nota e outra, e o grave fica perto da tônica em vez de saltar uma oitava.',
        'Os acordes de cada zona sempre combinam com a escala: trocar a escala, o Random e as mudanças de modo escolhem acordes que contêm todas as notas dela. No painel da zona, os acordes que desafinam com a escala aparecem marcados.',
        'Ao passar o mouse por botões e painéis, a mira e o círculo de volume somem e aparece o cursor normal; ao voltar para o jogo, a mira reaparece.',
        'A Bicada também pega itens novos do chão, pelo corpo ao soltar e pela área do bico ao acertar, sem tirar a galinha de mãos vazias. A camada Hit-boxes passa a mostrar os itens no chão, o alcance dos pés para pegar e o cone da Bicada.',
        'Segurar o bind Edição (Alt ou Cmd) por 1,5 s mostra ou esconde o painel do Modo editor sem mudar o switch de edição; um toque rápido continua ligando e desligando a edição.',
        'Esc fecha o último painel aberto, inclusive o Modo editor fixo na lateral; com um elemento selecionado no editor, o primeiro Esc só tira a seleção.',
        'No Modo editor, as áreas de seleção ficam sempre em cima dos objetos da tela atual: ao abrir o painel ou religar a edição com a câmera longe do começo, elas não mostram mais objetos de outra tela. Com zoom, o fundo do parallax e as camadas do editor também ficam no lugar ao abrir ou arrastar o painel fixo.',
        'Para contas admin, o botão Salvar no game no painel Controles (ao lado de Restaurar padrão) e no fim do painel Itens grava, no Admin local, os controles ou os números de todos os itens como o padrão do jogo; depois do deploy, vale para quem nunca mexeu neles (e para Restaurar padrão nos Controles).',
        'Com o painel Itens aberto, equipar um item com o boneco principal troca o item mostrado no painel para ele.',
        'Enquanto Chocar fixo, segurar Agachar mostra a pose agachada; soltar Agachar restaura a pose chocando sem liberar a trava.',
        'Todos os instrumentos miram na hora: o Giro da mira passa a 0 por padrão (Sax, Violino e Teclado giravam devagar). Quem tinha mudado esse número mantém o seu.',
        'Andando por Chãos com rampas suaves, a galinha passa pelas dobras e pelos picos do piso sem ficar presa andando no lugar nem tremer; subindo uma rampa, ela acompanha o piso sem pousos repetidos. O degrau automático só acontece na beirada solta de um piso.',
        'Pintinhos: quatro pintinhos seguem a galinha desde o globo, caindo do céu logo depois dela, e em cada Pátio que ela entra nasce um bando novo de quatro. Cada um tem uma cor natural sorteada (amarelo, creme, preto e creme, prata, caramelo, listrado, chocolate, ardósia, carijó ou pintado). Eles andam, correm e batem asas como a galinha, em tamanho de pintinho, com pulo e voo bem mais fracos e a cabeça balançando pouco; param a distâncias diferentes, demoram tempos diferentes para voltar a correr atrás dela, dão pulinhos para alcançá-la quando ela sobe e descem pelas plataformas quando ela está embaixo.',
        'O Passaguá captura os pintinhos como os pássaros: cada um soma uma alma no contador de quem pegou.',
        'Capturar com o Passaguá ganha abdução: cada pássaro ou pintinho capturado voa em curva até o contador de almas de quem pegou, encolhendo e deixando um rastro, e o número só sobe quando ele chega, com o contador pulsando. Vários no mesmo golpe chegam um atrás do outro. O texto “+N almas” sai.',
        'Cada alma capturada guarda de onde veio: a espécie do alien, se virou pássaro pela música (viva) ou foi morta e ressuscitada (morta), a família do instrumento e o tipo da nota que a completou e, nas mortas, a arma que matou. O arco de dentro do contador toma a cor da última alma capturada. A família do instrumento decide como a alma voa quando é solta; o resto é a base da biblioteca.',
        'Clicar ou tocar no contador de almas solta a última alma capturada: ela sai do contador, cresce e passa a voar junto de quem soltou, como um bot amigo. Cada clique solta mais uma; com o mouse em cima, o contador acende e o cursor volta ao normal.',
        'Cada alma solta segue do seu jeito, pela família do instrumento que a criou: a de sopro (Sentinela) observa de longe e do alto e dá uma voltinha de vez em quando; a de cordas (Patrulheira) patrulha em oito; a de teclas (Escolta) gira em volta da cabeça da galinha; a de percussão (Ritmada) salta de um lado para o outro na batida; a de rebate (Preguiçosa) deixa a galinha ir bem longe antes de ir atrás; a de pintinho fica baixa e perto. Elas esperam a galinha se afastar para seguir, apertam o voo quando ficam para trás e não se amontoam.',
        'Com o cesto vazio e almas soltas, o contador vira o botão Callback: um clique chama todas de volta para o contador, uma a cada 0,2 s, da mais perto da galinha para a mais longe.',
        'O Passaguá também captura almas soltas: a de outro player passa para o cesto de quem capturou, e a própria volta para o cesto.',
        'Biblioteca de almas: o botão do pássaro no cabeçalho do Pátio abre a coleção das 88 almas do jogo, por espécie de alien, mais o Pintinho e 12 raras. As que você nunca capturou aparecem só como silhueta preta; a primeira captura revela o desenho, o nome e a raridade, e o nome sobe na tela onde ela foi capturada. A coleção fica salva neste navegador.',
        'Cada alma da biblioteca é sempre a mesma combinação de espécie do alien, viva ou morta e família do instrumento (Assobio de Lanterna, Réquiem de Água-viva, Eco da Horda…). O tipo da nota e a arma que matou viram estrelas dentro de cada alma: a ficha mostra as que você já viu e esconde as que faltam, e uma ★ sobe na tela quando você ganha uma nova. Combinações especiais dão almas raras com nome e voo próprios, como Fênix, Alma Blue e Gêmea Má.',
        'As almas capturadas ganham desenho próprio pela família do instrumento: rabo comprido (sopro), topete (cordas), barriga de teclas (teclas), gorducha (percussão) e coruja (rebate). Voando para o contador ou soltas, as vivas aparecem na cor do alien que eram, as mortas em cinza com o olho brilhando, e as raras com as suas cores.',
        'Clicar ou tocar no botão de qualquer portal do Pátio (a volta ao globo e os pares de portais) faz a galinha andar até ele e entrar sozinha ao encostar, como no portal do globo; mexer a galinha no caminho cancela a ida.',
        'A galinha com bico de galinha-d’angola ganha voz própria, recortada de uma gravação real: o “tô fraco” toca no grupo Grito, o cacarejo fraquinho em Suave, Médio e Murmúrio e o cacarejo forte (e chato) em Forte. Os grupos ligados e o som de cada movimento continuam os da classe.',
        'O Catálogo de aliens abre leve: os cartões ficam parados e só o alien sob o mouse (ou o aberto) se mexe. No jogo, aliens e pássaros são desenhados bem mais rápido, para fases com muitos deles na tela ao mesmo tempo, sem mudar o visual.',
        'Novo grupo Energia no Modo editor: Postes de energia (madeira com uma ou duas cruzetas, concreto de rua) e Torres de transmissão (treliça, cabeça de gato, três níveis). Cada novo poste ou torre do mesmo modelo e da mesma Linha (1 a 4) se liga sozinho com fios ao vizinho mais próximo; no Editar dá para trocar o modelo, a linha, o caimento e a espessura dos fios.',
        'Qualquer cenário sem colisão pode ganhar Profundidade (Camada e colisões): ele passa pela tela mais devagar, como as montanhas, e vira só cenário. Torres perto e longe ficam cada uma na sua profundidade, e os fios entre postes de profundidades diferentes continuam presos nos dois enquanto a câmera anda.',
        'Configurações do Pátio ganham Céu e luz: hora do dia (sol, lua, estrelas e a luz sobre o cenário), cores do céu pela hora ou em até 8 faixas de cor escolhidas uma a uma, tamanho e brilho do sol, nuvens, textura, névoa, contraluz (o cenário vira silhueta contra o céu) e luz no pátio, montanhas e mata ao longe, e um botão Randomize. Clássico volta ao entardecer de sempre.',
        'Os pássaros que saem voando, vivos e mortos-vivos, podem pousar nos fios, enfileirados como notas numa pauta, e ficar um tempo parados. Quando alguém chega perto eles andam de lado pelo fio e às vezes voam para outro ponto, sempre mais devagar que a galinha; cada tipo de pássaro tem o seu jeito (o canário é o mais arisco, a coruja quase não se importa).',
        'Em Configurações do Pátio, Zonas das cenas pode ser desligado: as cenas deixam de tocar a zona delas e só as Zonas sonoras do mapa mudam a música.',
        'Playgrounds ganha Novo Pátio de exemplo: pôr do sol com torres, com céu em contraluz, torres em várias profundidades, postes com fios ao alcance das plataformas, palmeiras, o Passaguá e o botão de soltar aliens.',
        'O céu pode ter faixas curvas: Curvatura, Centro e Centro abaixo do horizonte em Céu e luz fazem anéis em volta do sol.',
        'Configurações do Pátio ganham as categorias expansíveis Céu e luz e Montanhas (cordilheiras, altura, recorte, neve nos picos, cor e Sortear forma); os títulos das categorias dos painéis ficam amarelos.',
        'Trocar o modelo de um poste ou torre troca o da linha inteira ligada a ele, e Fios como plataforma (ligado por padrão) deixa a galinha pousar e andar nos fios.',
      ] },
      { title: 'Música', items: [
        'Buenos Aires vira 1913 Buenos Aires - Tango, com o kit refeito do zero e inspirado nos tangos que fizeram a tangomania de Paris (El Choclo, La Morocha). São oito seções em Ré menor: a introdução soa como um disco antigo e se abre no Tema A do bandoneón; depois vêm o tema lírico do violino, o arrastre em 3-3-2 com chicharra, o trío de violoncelo e flauta, a variación do bandoneón e o chan-chan final.',
        'O Tango reage à partida: o cheque puxa o arrastre, perder a dama traz o lamento do violino, lances quietos levam ao trío, o primeiro roque passa à relativa maior, o final acelera para a variación e o xeque-mate toca o chan-chan.',
        'O Tango não trava mais a partida: as durações das notas passam a cair na grade do relógio musical, e cada peça ativada entra sem congelar a tela.',
        'A campanha World ballads ganha músicas novas, refeitas do zero e sem “ballad” no nome: 1999 Manchester - Nu-jazz breaks (breaks empoeirados, flauta, Rhodes e contrabaixo, com um desvio de bossa e um break big beat), 1990 Dublin - Irish jig session (um air lento sobre o bordão e duas jigs passando entre whistle, rabeca, flauta e concertina, com quebra de sapateado e um lamento de harpa), 1953 New Orleans - Rhythm & blues (tercinas de piano, boogie, sax com blue notes, desfile de second line e stop-time), 1967 Memphis - Southern soul (órgão, guitarra em sextas, metais, quebra gospel e o último refrão meio tom acima) e 1977 London - Arena rock in six (piano, guitarras em harmonia, coro, interlúdio de music hall e o último refrão um tom acima).',
        'Cada uma tem dez ou onze seções com a banda mudando de uma para outra, timbres gravados sempre que existem, introduções que soam como disco antigo, fills e reações próprias à partida (cheque puxa o contraste, perder a dama traz o lamento, lances quietos acalmam, o xeque-mate toca o final).',
        'Kits em 6/8 e 12/8 compilam bem mais rápido ao ativar as peças: uma sobra de arredondamento nas pausas entre notas deixava cada peça levando quase um segundo.',
        '1953 New Orleans mais suave: o piano das tercinas varia o desenho de compasso a compasso, com as notas fracas mais baixas e algumas aparecendo só às vezes; piano e sax sem notas estouradas; o sax e o piano com timbre mais aveludado (menos agudo, ataque e cauda mais macios, um pouco mais de reverb).',
        'Nas cinco músicas da campanha World ballads, o Low-pass do Piece Parameters passa a funcionar desde o primeiro lance: a abertura não segura mais o filtro de todas as peças nos primeiros 20 lances (o som de disco antigo fica só na Intro).',
        'Na faixa de seções, um clique simples na seção já selecionada tira a seleção.',
        'Com uma peça em Solo, ativar outra peça (pelo clique ou automaticamente por um lance) desliga o Solo, e as peças que tocavam antes voltam a tocar.',
      ] },
      { title: 'Interface', items: [
        'No Criativo, a aba Modulation do Instrument ganha o visual da aba Tuning: nome completo e ajuda em cada controle, knobs verdes e seletores na mesma célula dos knobs.',
        'No editor de parâmetros dos instrumentos (Criativo e partida), as abas All / Section / Note ficam acima de Tuning/Filters/Modulation/Movement. All edita o instrumento inteiro; Section personaliza os knobs só na seção selecionada (clicar numa seção já abre essa aba) e Note só nas notas selecionadas no editor MIDI. Os knobs ainda herdados aparecem apagados com o valor de All e acordam ao serem mexidos; duplo clique devolve o knob ao valor herdado.',
        'A partida passa a usar o mesmo editor de parâmetros do Criativo, e as notas do editor MIDI ganham Release, Reverb, Delay e Drive próprios.',
        'No Piece params da partida, as ajudas “?” dos parâmetros saem (continuam no Criativo) e a janela também redimensiona na horizontal.',
        'No editor de parâmetros (Criativo e partida), Tuning e Filters viram uma só aba, Filters & Tuning, com os filtros primeiro; as mini-abas ficam sem borda e sai a linha acima de All / Section / Note.',
        'No lobby, o botão de embaralhar ao lado do título Random sorteia um kit do catálogo disponível e ganha destaque no hover; Random volta a ser apenas um título.',
        'Abrir um link de convite de lobby já coloca o jogador dentro da sala, sem precisar clicar em Join lobby; se a sala estiver cheia ou encerrada, o lobby aparece com o aviso.',
        'Create Public Lobby e Create Private Lobby usam fundo escuro, borda verde sólida e rótulo verde.',
        'Na tela Perfil salvo (e no resumo da migração do perfil visitante), saem o aviso sobre a cópia do visitante e o rodapé dos termos de uso; eles ficam só na tela de login/cadastro.',
        'No lobby aberto, Exit fica à esquerda de I’m ready! na linha inferior; a saída sai do cabeçalho.',
        'Quando um lobby fecha, o popup mostra apenas a mensagem centralizada e o link Back to lobbies.',
        'O botão de perfil do mapa mostra só o saldo de ovos e o ícone; o texto “golden eggs” não aparece mais.',
        'O botão RESET TIPS saiu da aba Profile.',
        'No perfil, Baptismal name, Profile code e Mail ficam em três linhas igualmente espaçadas à esquerda de RESET SAVE e LOGOUT; a parte não conquistada da barra da campanha ganha traços verticais verdes discretos.',
        'Depois de copiar o convite do lobby, a confirmação mostra “Send to your friend” em verde na linha seguinte.',
        'Nos painéis do PigChicKen, as instruções dos parâmetros ficam no hover do campo; a cópia abaixo some para dar espaço ao nome e ao valor.',
        'No painel Itens, a frase de família e persistência abaixo da seleção sai; as listas de sliders ficam com 3 px entre campos em todos os painéis que usam essa barra.',
        'No popup de lobby, as linhas dos jogadores ficam sem cartões; uma divisória fina separa cada participante.',
        'Na escalação do lobby, o número da casa aparece à esquerda do ícone da peça.',
      ] },
    ],
  },
  {
    version: '2.5.0',
    date: '09/11/2026',
    title: 'Inventário em grupos, arrastar itens e atalhos por grupo',
    groups: [
      { title: 'Mapa', items: [
        'O globo começa em modo neon e só passa ao realista quando o jogador escolhe esse modo; o ícone do botão muda suavemente no hover.',
        'Ao passar o mouse por uma cidade, o nome completo do estilo musical aparece na mesma linha, sem reticências nem quebra.',
      ] },
      { title: 'Interface', items: [
        'Os cabeçalhos dos painéis continuam arrastáveis, sem cursor de movimento, inclusive nos painéis do PigChicKen.',
      ] },
      { title: 'Lobby', items: [
        'Os ícones de Play saíram das linhas de instrumentos do lobby; passar o mouse ou tocar na linha continua tocando a prévia, e o fundo do ícone da peça fica verde no hover.',
        'O dado agora sorteia outro kit na hora. Foto, títulos e instrumentos são substituídos deslizando para baixo dentro de cada linha, com pequenos atrasos variados entre eles.',
      ] },
      { title: 'Pátio', items: [
        'O inventário comporta até 25 itens. O limite de cada Pátio fica em Configurações do Pátio → Limite do inventário (padrão 25); baixar o limite não tira itens de ninguém, só não deixa pegar novos.',
        'As teclas 1–9 continuam selecionando os nove primeiros itens e 0 seleciona o décimo; a barra também mostra 0 sob esse slot.',
        'Em Playgrounds, qualquer usuário pode excluir um Pátio guardado só neste navegador. A ação pede confirmação, remove a cópia local e, se ela estava aberta, volta ao Pátio padrão sem salvar as mudanças descartadas; cópias no servidor não são apagadas.',
        'Golpe também pega itens novos ao alcance e guarda no inventário sem trocar o que está equipado; sem espaço, o item fica no chão e Usar / pegar continua fazendo a troca habitual. Além do corpo, a área do próprio golpe pega os itens que ela encosta, mesmo um pouco mais longe.',
        'Ao selecionar um item, a indicação temporária mostra só o nome branco e a munição/doses em cinza, sem miniatura, fundo, borda ou sombra.',
        'Os itens ficam em três grupos, nesta ordem: instrumentos, armas e o resto (esportivos, consumíveis e utilitários). Cada item pego entra no fim do seu grupo. Na barra, um espaço maior e uma linha colorida separam os grupos, e as casas encolhem para caber na tela.',
        'Clique e arraste um item da barra para mudar sua posição; soltando ao lado de um item de outro grupo, ele passa para esse grupo. Um clique sem arrastar continua equipando.',
        'O analógico de movimento (gamepad ou tela) mira em todas as direções, inclusive para baixo com a galinha no chão. O teclado de um player sem mouse (por exemplo o Secondary keyboard passado para outro player no painel Players) mira nas 8 direções pelas teclas de movimento; o teclado que tem o mouse junto continua sem mirar pelas setas. Mouse ou analógico de mira parados devolvem a mira ao movimento depois do tempo de Câmera de Mira → Mira parada volta para o movimento. Os players adicionais também miram pelo analógico esquerdo quando não usam o direito.',
        'O painel Controles do boneco passa a se chamar Controles: o título Movimentos e seu botão de ajuda saíram, a grade de binds ganha a coluna Mouse (botões fixos, só leitura), Na tela (celular) vira Touch Controls com os botões Sempre visível e Nunca mostrar, e o checkbox Cacarejos fica no painel Volume do Pátio, junto do volume Galinha, e não aparece no painel Controles; o link Pátio da Galinha também saiu desse painel.',
        'Com um controle de PlayStation conectado (identificado pelo fabricante Sony), os botões aparecem com os nomes dele (✕ ○ □ △ L1 R1 L2 R2 Create Options) no painel Controles e nas dicas do jogo; as atribuições são as mesmas. Os demais controles seguem com os nomes de Xbox.',
        'A barra de baixo fica centralizada na tela: instrumentos, depois armas e depois utilitários, lado a lado, sem a linha colorida acima de cada grupo. Quando a barra não cabe na tela nem com as casas no tamanho mínimo, ela desliza para deixar o item da mão o mais perto possível do centro (nos primeiros e últimos itens ele fica mais para um lado). Em celulares e telas estreitas (menos de 768 px) as teclas dos grupos e os números 1–9 e 0 sob as casas não aparecem. À esquerda do primeiro item de cada grupo aparece a tecla do atalho do grupo (TAB, Q, F, ou LB, RB, B no gamepad).',
        'Os efeitos visuais dos consumíveis também acumulam: cada dose de Maryjane deixa a sombra dourada do estado búdico mais intensa, e tomar Cok junto mostra as bolhas ao mesmo tempo que a sombra, sem um anular o outro (mais doses de Cok, mais bolhas).',
        'A Maryjane agora se chama Bear Gummy e seu desenho mostra um único ursinho.',
        'O som de equipar um instrumento ficou bem mais suave: as duas notas entram devagar e bem mais baixas, sem estalo.',
        'Novo parâmetro Tremolo nos instrumentos (Itens → Música): a nota sempre começa afinada e, girando a mira dentro da mesma faixa do leque depois disso (cada grau de giro vale o mesmo, a distância não conta), o som dela entorta levemente, mais quanto maior o valor. O parâmetro Tremolo: limite define até quantos semitons a nota sobe ou desce (padrão meio semitom, dentro do próprio grau). Instrumentos sem trastes (o violino, com o maior valor) deslizam livremente entre as notas em vez de pular de grau. Flauta, violão, sax e trompete têm valores próprios; harpa, pandeiro e teclado vêm com zero.',
        'Instrumentos tocam mais baixo com a mira perto da galinha e mais alto longe, no máximo a partir da borda do leque de escalas; no analógico, do ponto em que ele começa a registrar (descontada a zona morta) até a borda. Itens → Música → Volume pela distância é um slider de dois pontos (mínimo e máximo); juntos, o volume não varia. Um círculo semitransparente em volta da mira cresce e encolhe com o volume. Todos os instrumentos vêm com variação, o violino com a maior.',
        'O golpe melee dos instrumentos agora toca a nota da faixa do leque para onde a mira aponta (mais alto mirando para cima) e sobe o acorde a partir dela; Itens → Música → Notas do golpe escolhe quantas notas (1 a 4).',
        'No cabeçalho do Pátio, Modo editor e Camadas ficam imediatamente antes de Players e lobby.',
        'O portal de entrada do Pátio (o de volta ao globo) pode ser movido no Modo editor, mas não pode ser apagado nem duplicado. A chegada do globo e o início da galinha acompanham a nova posição.',
        'Em Playgrounds, “+ Novo Pátio” virou “+ Novo Pátio padrão” (sem a instrução dentro do botão) e ganhou ao lado “+ Novo Pátio vazio”, que cria um Pátio só com o portal de entrada.',
        'Ao trocar de Pátio, a galinha é sugada pelo portal de entrada do Pátio atual e sai pelo portal de entrada do Pátio novo.',
        'Novo botão no painel do Modo editor (ícone de painel lateral) fixa o painel no lado direito da tela: o Pátio passa a ocupar só o espaço à esquerda, e a divisória entre os dois muda a largura arrastando. Clicar de novo volta ao painel flutuante; a escolha e a largura ficam guardadas.',
        'No título do Modo editor, um switch liga e desliga a edição sem fechar o painel: desligado, os elementos não podem ser selecionados nem movidos e os portais voltam a funcionar, mas ainda dá para arrastar elementos do painel para o Pátio. Abrir o painel liga o switch.',
        'Novo bind Edição no painel Controles (grupo Pátio): apertar e soltar Alt/Option ou Cmd liga e desliga a edição do Modo editor, mesmo com o painel fechado. Atalhos como Cmd+Z continuam funcionando normalmente.',
      ] },
      { title: 'Zonas sonoras', items: [
        'O rótulo de cada zona sonora virou uma fileira de tags, uma por parâmetro, mostrando só o valor: nome, tom, escala, acordes, balanço, andamento, progressão, cadeia, prioridade, troca a música, pássaros, vida das paredes, padrão de mudança e cor.',
        'No editor, clicar numa tag passa para o próximo valor sem abrir o painel; a progressão anda para trás numa lista de progressões populares e, da primeira, volta para a última. Andamento, prioridade e vida são sliders do tamanho da tag: arraste em qualquer ponto dela. Clicar no nome abre a configuração completa.',
        'Um olho novo no cabeçalho do Pátio abre o painel Camadas: Fundo, Zonas e Escalas têm um slider de 0 a 100% (0 desliga, acima disso é a opacidade; padrões 100%, 33% e 0%) e Hit-boxes mostra as áreas de acerto dos golpes e as caixas dos alvos, dos bonecos, dos tiros e das notas. Fora do editor as tags das zonas só informam os valores, sem fundo e sem clique.',
        'Camada Escalas (para testes): em volta de cada boneco com um instrumento, o leque da mira aparece dividido onde a nota muda, com o nome da nota e o grau na escala atual escritos pequenos em cada faixa.',
        'Camadas por Pátio: quem pode editar o Pátio ganha o botão Salvar no pátio, e ao entrar num Pátio as camadas voltam às que ele guardou (ou aos padrões). Escalas (Tamanho) vai até 3x e o novo Escalas (Degradê) vai de cor chapada (0) a um degradê bem suave (100%). Escalas passa a se chamar Escalas (Visibilidade), e o novo Escalas (Linhas) controla a visibilidade das linhas divisórias do leque.',
        'A zona de cada cena (Campo, Noite, Feira, Céu, Porão), que vale para a coluna inteira da cena, agora pode ser editada pelas tags da faixa do chão ou no painel Zona da cena; fica salva no Pátio.',
        'Paredes com vida: com Vida das paredes acima de 0, as notas quicam nas bordas da zona e cada quique tira 1 ponto. Quando a vida zera, a zona muda pelo padrão escolhido (Random, Tempo dobrado, Acelerando, Troca de levada, Sobe meio tom, Ciclo de quintas, Relativa, Homônima, Troca de modo, Próxima progressão, Retrógrada, Penta ↔ diatônica, Espelho, Contracanto, Oitava acima) e a vida enche de novo.',
      ] },
      { title: 'Pátio online', items: [
        'Aliens, zumbis, aliens de treino e os mortos-vivos que eles deixam agora são os mesmos para todo o lobby: o dono do lobby comanda os inimigos, e os acertos de qualquer player (tiros, notas, explosões, golpes e arremessos) valem para todos, inclusive matar, virar passarinho ou curar.',
        'Os botões SOLTAR ALIENS / SOLTAR ZUMBIS e os inimigos de treino do editor funcionam para qualquer player e aparecem para todos; os zumbis vão atrás da galinha mais próxima, de qualquer navegador.',
        'Os tiros, notas e itens arremessados dos outros players aparecem voando na sua tela; as explosões deles empurram a sua galinha. Quando o dono sai, o próximo continua com os mesmos inimigos.',
      ] },
      { title: 'Galinha', items: [
        'No Pátio, dá para pegar a galinha com o mouse ou o dedo e arrastá-la pelo cenário; ao soltar, ela cai com o embalo do arraste. Enquanto está pendurada, só Arremessar funciona: andar, pular, atirar, golpear, pegar, trocar de item e a roda ficam bloqueados até soltá-la.',
        'No Pátio, de mãos vazias, clicar ou tocar num ponto do cenário faz a galinha andar até lá (como no globo). Com o mouse, o clique esquerdo sem item continua bicando e também a faz andar até o ponto.',
        'Com point-and-click ativo, clicar em Enter no portal faz a galinha caminhar até ele e entrar automaticamente; assumir o movimento cancela o automático.',
        'Olhando para cima no ar, encostar os pés numa lateral vertical de plataforma flutuante também agarra automaticamente; os outros controles de movimento ainda fazem passar direto.',
        'No painel Controles, Agachar aparece antes de Chocar, o rótulo Golpe (melee) passa a Golpe de perto e as bordas dos valores ficam visíveis só no hover, foco ou edição.',
        'Novos atalhos: Próximo instrumento (Tab, LB), Próxima arma (Q, RB) e Próximo utilitário (F, B) percorrem só aquele grupo, na ordem da barra, começando pelo primeiro quando o item da mão é de outro grupo. Próximo utilitário também passa pela casa vazia (mãos vazias). Próximo item e Item anterior continuam passando por todo o inventário pela rodinha do mouse e pelo teclado secundário (Del e \'); no teclado principal e no gamepad ficam sem atalho padrão.',
        'Sem nenhum instrumento no inventário, Próximo instrumento funciona como Item anterior; sem nenhuma arma, Próxima arma funciona como Próximo item.',
        'Para abrir espaço: Roda do inventário passa de Q para T, Deselecionar item de F para B e, no gamepad, Golpe passa de B para Y e Arremessar de Y para R3 (que deixa de ser o segundo botão de Pular). Atalhos personalizados são preservados.',
      ] },
      { title: 'Perfil', items: [
        'O painel do perfil (aberto pelo avatar, com as abas Lobbies, Friends e Profile) ganhou a aba Vestiário, por enquanto ainda sem conteúdo.',
        'Login por Google ou código de email termina mesmo quando uma transferência opcional do perfil visitante falha; sem progresso visitante, essa transferência nem é iniciada, e uma cópia existente continua guardada para tentar integrar depois.',
      ] },
    ],
  },
  {
    version: '2.4.0',
    date: '08/11/2026',
    title: 'Movimentos novos, zoom e panorama, Passaguá e spawners no Pátio',
    groups: [{ title: 'Instrumentos', items: ['A lista Song & Instruments fica mais compacta, com metade do espaçamento vertical e sem divisórias entre instrumentos.'] }, { title: 'Perfil', items: ['O saldo com o texto golden eggs sempre visível, os pontos com um ovo cinza, o título do rank sem o prefixo Rank: e a campanha aparecem de forma compacta abaixo do código do perfil, antes do acesso à conta.', 'O link de download de backups de visitante foi removido do perfil.', 'O login por email ficou mais simples: o checkbox Já tenho uma conta e o aviso do perfil visitante saíram. Email me a code descobre sozinho se o email já tem conta; quem é novo recebe um e-mail de boas-vindas com o código, e quem já tem conta recebe só o código de login.'] }, { title: 'Mapa', items: ['Trocar o ano desliza o conteúdo dentro do mesmo popup; escolher uma época na lista reutiliza e centraliza o cartão da cidade. O texto do About foi revisado.', 'O pin compartilhado volta a destacar ao passar o mouse por qualquer época de uma cidade. Os botões de ano das cidades com várias épocas agora ficam alinhados à esquerda.'] }, { title: 'Lobby', items: ['Passe o mouse ou toque nos instrumentos da escalação para ouvir uma nota de cada peça.', 'Random mantém seu título e oferece Select a kit abaixo, com links de ano e cidade; a escolha substitui o dropdown. Um dado ao lado da foto do kit permite voltar ao sorteio. Os participantes aparecem com avatar ao lado do nome.', 'Public e Private ficam no topo da sala, com Lobby em verde, o código branco no botão selecionado e os ícones de sair, atualizar e fechar lado a lado.', 'Sua sala aparece primeiro em verde no mapa e substitui o botão Create lobby enquanto estiver ocupada. O atalho do estúdio agora se chama Creative Mode.', 'Os atalhos de Lobby e Friends passam para o topo do mapa; Creative fica na coluna da direita, abaixo de Create lobby. O cabeçalho da lista agora diz Public lobbies; os botões dizem Create Public Lobby e Create Private Lobby, o atalho para a sala aberta diz My lobby e a chamada Have a room ID? foi removida. No popup de cidade, LOBBY e CAMPAIGN ficam lado a lado na proporção 40/60; LOBBY reutiliza a sala aberta do jogador e troca seu kit pela cidade selecionada, ou cria uma sala pública com esse kit quando ele ainda não está em um lobby.', 'A foto e o título do kit ficam à direita do nome do jogador; a escalação começa aberta abaixo, em quatro colunas com ícones das peças; ela se expande e se retrai suavemente, respeitando movimento reduzido, e se adapta à largura da tela.', 'Release notes agora é um link textual ao lado do logotipo, no canto superior esquerdo do mapa.'] }, { title: 'Galinha', items: [
      'Os ímãs de oito ângulos agora têm forças independentes para movimentação e mira. Zero desliga cada um, e a mira começa sem ímã.',
      'No salto carregado no ar, os joelhos dobram mais enquanto você segura e as pernas se abrem ao soltar. O ângulo máximo pode ser ajustado em Combinações.',
      'No Secondary keyboard, Chocar / cair / travar mira passa da seta para baixo para /, Usar / pegar item vai para P e Item anterior para \', e ] (Atirar), [ (Golpe), ; (Pular / voar) e \\ (Arremessar) entram como segunda tecla, e a seta para baixo vira a segunda tecla de Agachar / slide / super pulo. Atalhos personalizados são preservados.',
      'Z passa a ser uma segunda tecla de Pulo; G continua Arremessar. Atalhos personalizados são preservados.',
      'As orientações sobre teclados e gamepad ficam no botão de ajuda ao lado de Movimentos; o parágrafo introdutório do painel foi removido.',
      'Segurar Chocar + Pulo no ar carrega o salto: o multiplicador cresce de 2× até 4× em dois segundos. Ao atingir o tempo, a velocidade vertical muda uma vez; os três ajustes ficam em Combinações.',
      'A galinha agora escala os quatro limites: subindo uma parede até o teto ela vira a quina e anda de cabeça para baixo por ele, e desce pela outra parede. No globo, os limites são as bordas da tela.',
      'Pulando com Cima segurado por baixo de uma plataforma flutuante, ela se pendura de cabeça para baixo e anda por baixo dela; nas quinas passa para as laterais e sobe até o topo. O Pulo a solta e ela volta a ficar de pé.',
      'Nas plataformas flutuantes ela troca de lado: pulando segurando o lado contrário ao que olha, ela fica de cabeça para baixo debaixo da plataforma (ou volta para cima), e numa lateral pula para a lateral oposta. Paredes e chãos duros não deixam trocar.',
      'Invert vertical side on horizontal floating platforms: em pé numa plataforma flutuante, Agachar + Chocar + Pulo juntos (sem andar para os lados) a deixam de cabeça para baixo debaixo dela, em vez de cair. Só Agachar + Pulo ou só Chocar + Pulo continuam descendo pela plataforma.',
      'Andando agachada até a ponta de uma plataforma, ela agarra a lateral em vez de cair; subindo pela lateral ela passa para cima da plataforma, e subindo por dentro de uma caixa fica pendurada debaixo do topo.',
      'De cabeça para baixo, Cima a encolhe e Baixo estica a cabeça para o chão (os controles de olhar e agachar se invertem).',
      'Numa plataforma flutuante, pular chocando com Cima segurado (ou sem direção) agora sobe; ela só desce pela plataforma andando para o lado ou segurando para baixo.',
      'No gamepad, o primeiro shocking jump no chão não sai mais fraco: apertar LT logo depois do A (com A ainda segurado) conta como a preparação do salto em vez de um pulo comum.',
      'Shift esq. (teclado principal) e Shift dir. (teclado secundário) também usam / pegam item, como o X do gamepad, além de correr. No gamepad, LB volta um item e RB avança; Correr fica no X. Atalhos personalizados são preservados.',
      'Os ajustes feitos no Pátio passam a ser padrões da galinha: aceleração 4500, andar de costas 50%, atenuador de queda segurando para Cima 40% e segurando para baixo 69%. Configurações personalizadas continuam preservadas.',
      'Próximo item e Item anterior repetem quando segurados: primeira troca imediata, repetição após 1,5 s e depois a cada 0,3 s. Atraso e intervalo podem ser ajustados em Controles do boneco → Inventário. As dicas explicativas das seções Inventário e Analógicos saíram do painel.',
    ] }, { title: 'Pátio', items: [
      'Os parâmetros de armas e instrumentos ajustados no painel Itens viraram padrões: a carga, cadência, pentes, alcances e demais valores escolhidos no PigChicken passam a valer em novos Pátios e ao restaurar os valores de código. Configurações personalizadas salvas continuam preservadas.',
      'Maryjane e Cok acumulam: várias doses (do mesmo item ou dos dois) somam o efeito, com os multiplicadores se multiplicando, e cada dose termina no seu tempo. O tempo restante aparece no fundo do quadradinho do item no inventário, que perde a cor de cima para baixo, com ×N quando há mais de uma dose ativa.',
      'Depois de arremessar um item, a mão passa para o item anterior a ele no inventário, e não mais para o primeiro.',
      'Novo botão com ícone de Sol no cabeçalho: abre as Configurações do Pátio atual, com largura limite (telas) e altura limite (do chão ao teto). Os valores são salvos junto com o Pátio e só quem pode editá-lo muda; a largura saiu do painel Câmera de Mira.',
      'Uma borda preta de 10 px marca os limites de todo Pátio e da tela do globo. A câmera para no teto do Pátio.',
      'O trajeto pontilhado de arremessos e os traçados das armas agora vão ficando transparentes ao longo do caminho, até sumirem na ponta final.',
      'Com Atirar segurado, trocar para outra arma ou instrumento faz o novo item começar imediatamente: semiautomáticas e rajadas disparam, automáticas continuam, cargas começam a carregar e Sniper dispara ao soltar. Consumíveis não são ativados pela troca.',
      'A área horizontal para destacar e pegar itens no chão ficou 15% mais larga.',
      'No Pátio padrão, o portal do Templo e o da Vila ficam sobre as plataformas elevadas, e o portal para o globo fica sobre a plataforma pequena à esquerda. Entradas padrão antigas são reposicionadas; portais movidos manualmente e Pátios pessoais ficam como estavam.',
      'No cabeçalho, Modo editor fica ao lado de Salvar Pátio, e Players e lobby passa para antes do Chat.',
      'Nova seção Chãos e paredes no Modo editor: 5 chãos (Rocha da Vila, Campo, Deserto, Neve e Vulcânico) e 3 paredes (Tijolos, Pedra e Madeira), que se selecionam, movem, redimensionam, duplicam e apagam como os outros objetos. Dois cliques escolhem o bioma ou o tipo de parede.',
      'Com um chão ou parede selecionado, os pontos do contorno aparecem em volta do objeto inteiro, inclusive a parte de trás: clique numa linha da borda para criar um ponto, arraste para mover e dê dois cliques num ponto para removê-lo. O desenho e a colisão seguem o contorno.',
      'Nova opção Objeto duro em Camada e colisões (ligada nos chãos e paredes, e disponível em plataformas, terraços e pilares): os bonecos não atravessam o objeto por baixo, pelos lados nem descendo por ele, sobem rampas e degraus baixos dele andando e escalam suas paredes.',
      'O Chão da Vila virou um desses chãos, com a mesma encosta (inclusive a que você tinha editado), e o painel separado do Chão da Vila saiu.',
      'O Golpe sai mesmo com Atirar segurado nas armas e instrumentos que atiram: ele interrompe os tiros (e a carga ou o feixe) enquanto dura e, se Atirar ainda estiver segurado quando o golpe termina, ela volta a atirar. Com o mouse, o botão direito agora funciona com o esquerdo segurado.',
      'Com mais de um player local, cada player além do primeiro volta a ter o inventário pequeno ao lado esquerdo do próprio avatar, no canto superior direito. O inventário grande do primeiro player continua embaixo, agora alinhado à direita da tela.',
      'O número de balas deu lugar a uma barra na parte de baixo de cada item, em toda a largura e dividida em uma parte por bala: as carregadas ficam acesas e as que estão voltando (recarga ou recarga gradual) aparecem enchendo em tom claro. Habilidades especiais continuam mostrando o número de doses.',
      'O Taco tem 8 golpes seguidos: cada golpe gasta um, vazio ele só faz o clique seco e recarrega sozinho.',
      'Taco e Passaguá ficam em Esportivos. O Passaguá captura pássaros vivos e pássaros mortos-vivos voando; cada captura vira uma alma no contador circular à esquerda do avatar de quem a capturou.',
      'No editor, cada Alvo de treino agora pode soltar um alien de espécie aleatória do Catálogo ou um zumbi de mutação aleatória.',
      'Backquote (`) reúne zoom e panorama: segure a tecla e use a roda para aproximar/afastar, ou clique e arraste o cenário com o botão esquerdo para mover a câmera. Caps Lock sai do atalho. Uma lupa semitransparente no canto superior esquerdo indica o modo, com cursor de mão no arraste. Menu + analógico direito no gamepad também panoramiza pelo cenário, até os limites do mundo; soltar o atalho conserva o panorama, e só mover a galinha faz a câmera voltar rapidamente a segui-la. Backquote + clique na rodinha restaura 100% ao apertar o botão central; Select + R3 também restaura 100% sem pular. Ambos os resets encerram o panorama e recentralizam imediatamente a câmera na galinha principal, retomando o acompanhamento. Rolar para baixo continua afastando. O acompanhamento leva em conta a área visível após o zoom para manter a galinha enquadrada nos dois eixos. O recorte e a área de desenho também acompanham o zoom-out, evitando zumbis e outros objetos cortados ou desaparecendo antes de sair da tela.',
      'Para usar um portal com mouse ou toque, comece e solte o clique dentro do mesmo anel. Um clique iniciado ou terminado fora cancela a entrada.',
      'Nova recarga automática gradual por item (Itens → Munição): a cada intervalo sem usar o item, balas voltam sozinhas, na quantidade escolhida (padrão 1). Instrumentos e o Taco recuperam uma a cada 0,5 s; as armas de tiro começam com ela desligada.',
      'Armas e instrumentos não quebram mais com os golpes; com Quebra depois de em 0 o painel mostra “0 (nunca quebra)”. Itens ajustados antes mantêm os números que você mudou.',
      'Os painéis flutuantes do Pátio (Configurações, Volume, Itens, Players, editor e os outros) agora se arrastam por qualquer parte que não seja botão, campo ou slider, não só pelo título. No celular, numa lista que rola, o dedo rola a lista e o título continua arrastando. Clicar ou arrastar um painel o traz para a frente dos outros, e o painel que abre aparece na frente.',
    ] }],
  },
  {
    version: '2.2.0',
    date: '07/11/2026',
    title: 'Pátio online, morte e morto-vivo, pássaros por tipo, Catálogo de aliens, a jukebox do Templo, o editor de músicas, as músicas na conta, o gerador MIDI, seis viagens Classical e pulsos simultâneos',
    groups: [
      { title: 'Pátio', items: [
        'Pátio online: ligar Online no painel Players (ou no portal do globo) leva você ao lobby público aberto mais antigo do Pátio, com até 13 navegadores. Você vê as galinhas dos outros com o visual, o nome em cima e o item na mão; cada navegador tem uma cor, e quem joga com mais de uma galinha aparece numerada.',
        'No lobby online, o dono é quem criou o Pátio ou, sem ele, quem chegou primeiro. Só o dono remove players, abre ou fecha o lobby (Público) e marca quem edita. O passador de lobby do cabeçalho anda pelos lobbies públicos abertos. Visitantes jogam só com um nome.',
        'Até 4 players locais por computador, também no modo Local.',
        'Modo editor ao vivo no lobby online: as mudanças do dono e de quem ele liberou aparecem na hora para todos, e quem entra depois já vê o Pátio editado. Só o dono salva no servidor, sem conflitos entre quem edita junto.',
        'Novo histórico do chat: uma telinha semitransparente no canto lista as mensagens com o nick de quem enviou e pode ser rolada. Escrever continua igual (Enter), com o balão em cima da galinha.',
        'Cada alien tem duas mortes, as duas no tempo da música: derrubado por golpe, tiro ou arremesso, toca um tambor que depende da espécie (bloco de madeira na água-viva, taiko na concha, palmas na lanterna); convertido por notas, toca um acorde ou arpejo.',
        'Um alien derrubado deixa um morto-vivo: cinza, de olhos vermelhos, ele cai duro girando, quica cada vez menos e fica deitado onde caiu. Depois de um tempo levanta e anda pelo chão como um robô aspirador, virando nas bordas das plataformas e nas paredes. É inofensivo, e a galinha pode subir nele.',
        'Notas enchem a barra do morto-vivo de novo e o trazem de volta como pássaro morto-vivo, com os olhos na cor da nota e o canto em menor. Armas destroem o morto-vivo de vez. Quando a música acaba, cada um vai embora depois do seu próprio tempo; no máximo 40 ficam ao mesmo tempo.',
        'Os aliens convertidos viram pássaros de verdade, de cinco tipos (pardal, bem-te-vi, sabiá, canário e coruja), cada um com sua cor, seu canto na escala e seu jeito de voar. Cada lugar tem seus pássaros, e a Zona sonora pode escolher os dela. De vez em quando eles assobiam uma nota que a galinha pode rebater.',
        'Novo Catálogo de aliens (ícone de fantasma no cabeçalho): cada alien das músicas é uma variação, uma espécie com seus parâmetros de corpo, movimento, tiro, rebate, sons e morto-vivo. Os cartões mostram o desenho animado; clicar abre os parâmetros, com botões para ouvir o disparo e as duas mortes, duplicar e voltar ao padrão. Fica salvo neste navegador.',
        'Primeira leva de variações: Sino, Baixo e Neon (água-viva), Flauta, Brasa e Papel (lanterna), Taiko e Bronze (casco), Terças e Eco (gêmeos), Chocalho e Faísca (mini), Palmas, Caixa e Bumbo (tambor, em que rebater vira batida) e Fogo e Jade (dragão, com escala própria).',
        'O disco do Templo do Gongo virou uma jukebox de neon. Bata nela para abrir o painel de músicas: uma grade de capas com a Campanha do Gongo e as músicas, com bpm, tom, duração e recorde. A escolhida é a que o gongo começa. Tocar começa na hora, e Salvar como guarda uma cópia com outro nome neste navegador.',
        'Cada música ganha uma capa desenhada a partir da própria sequência de aliens: Sulco, como um vinil visto de cima, ou Grade, como um piano roll. Nas músicas salvas, dá para trocar o estilo, as cores e o fundo da capa.',
        'Novo editor de músicas (Editar e Nova música, na jukebox): a música vira uma linha do tempo em compassos, com uma linha por faixa do leque e cada alien como um bloco do aparecimento ao encostar, com as notas em pontos. Arraste no tempo ou entre as faixas, dê duplo clique para criar um alien, Ctrl+clique para pôr nota e botão direito para tirar. Tem copiar, colar no cursor, desfazer e refazer, zoom, grade, tom, escala, bpm e uma prévia do semicírculo em volta da galinha. Tocar daqui toca o rascunho no templo a partir do compasso do cursor.',
        'As músicas ganham pausas e falas. Uma pausa abre compassos sem aliens, com só o fundo tocando ou em silêncio total. Uma fala tem quem fala (o narrador, o Gongo, a galinha ou um alien do catálogo), o texto, o tempo na tela, o lugar (o banner do meio, um balão sobre quem fala ou uma faixa embaixo do placar) e um blip de voz a cada letra.',
        'Quem entra com a conta guarda as músicas nela: cada música salva, editada ou apagada vai para a conta, e as feitas em outro aparelho aparecem na jukebox. Se a mesma música mudou nos dois lugares, a da conta fica e a deste aparelho vira uma cópia. A jukebox diz onde as músicas estão, e o admin vê as músicas de todos, podendo ouvir ou copiar cada uma.',
        'Novo Gerar de MIDI na jukebox: escolha um arquivo .mid, as faixas que entram e o alien de cada uma (a bateria vira bumbo, caixa, palmas e chocalho), a dificuldade, o tom e os compassos. O gerador alinha as notas na grade, deixa só as que a dificuldade aguenta, encaixa tudo nas faixas do leque e junta as notas seguidas em aliens de 5 a 15 tiros. Dá para ouvir no templo antes, e a música abre no editor para ajustar.',
      ] },
      { title: 'Música', items: [
        'A campanha Classical ganha três músicas originais: Venice 1725 · Baroque concerto, Copenhagen 1869 · Nordic piano concerto e Paris 1913 · Modernist ballet. Cada uma tem doze seções, novos contrastes, regiões harmônicas e diálogos próprios entre as peças.',
        'Mais contrabaixos arco e pizzicato, piano de cauda em duas mãos, trombone e percussão orquestral gravada — incluindo bumbo sinfônico e tam-tam — ampliam a paleta. Os novos kits alternam ritornelos, solos, cadência de piano, passagens líricas e ritmos assimétricos.',
        'Os três kits Classical foram reconstruídos com cordas nos oito peões e madeiras, metais, cravo ou tímpanos na fileira de trás. Novas gravações acústicas, frases de dezesseis compassos, dinâmica e dez seções dão mais espaço para solos, diálogos, desenvolvimento e retomadas.',
        'Vienna 1780 agora se chama Viennese Sinfonietta. Leipzig 1723 tem uma direção pastoral barroca e Vienna 1825 ganha uma abertura romântica em alla breve, com regiões harmônicas contrastantes.',
        'Todas as peças que tocam juntas podem mostrar o pulso de nota ao mesmo tempo. Preferências ganhou Pulsos simultâneos no tabuleiro, ligado por padrão e salvo no navegador. Desligar volta ao destaque de uma peça por vez no Criativo, na campanha e no online.',
      ] },
      { title: 'Criativo', items: ['O contador de ovos foi removido do tabuleiro do Criativo.', 'Avisos como Kit carregado somem automaticamente após alguns segundos. O botão de fechar fica reservado aos alertas que precisam de confirmação de leitura, como falhas ao preservar ou salvar o rascunho.'] },
    ],
  },
  {
    version: '2.1.0',
    date: '06/11/2026',
    title: 'Golpe com rastro de ar, Bicada que anula bombas, fase de notas, o Taco, as zonas sonoras e a revisão dos kits Electronic World',
    groups: [
      { title: 'Pátio', items: [
        'O Golpe ganhou preparação, golpe rápido, continuação e recuperação, com um rastro de ar creme que se desfaz soltando fiapos. O acerto acontece no instante do golpe, com um clarão e um tranco curto na tela.',
        'Golpes em sequência alternam para baixo, para cima, na horizontal ao redor da galinha e um giro de 360° no quarto, que acerta em volta toda.',
        'Em Itens → Combo, cada item define a ordem dos golpes (até seis), a janela para o próximo golpe continuar a sequência e o arco de acerto dos golpes para cima e horizontal.',
        'No desktop e no tablet, a barra de itens fica embaixo, no centro, com casas maiores, a tecla de cada uma, a munição e o desgaste. Ao trocar de item, o nome aparece por um instante. O mundo subiu para a galinha não ficar atrás da barra.',
        'Novas teclas padrão no teclado principal: V atira, C dá o golpe, X também choca e Z também arremessa. Controles salvos nos padrões antigos passam para os novos; teclas personalizadas ficam como estão.',
        'Em Itens → Golpe, cada item tem espessura, duração, fiapos, opacidade e cor do rastro. Nos instrumentos, o rastro pega a cor da nota do acorde.',
        'A Bicada agora defende: acertar o bico numa bomba ou no fogo do Templo do Gongo anula o projétil numa nuvenzinha, sem perder coração.',
        'Golpes sem espera: o intervalo entre golpes agora é zero em todos os itens, e um golpe novo interrompe o anterior na hora, para dar para acertar notas seguidas. Em Itens → Golpe, cada item pode desligar essa interrupção.',
        'Templo do Gongo: um disco perto da pedra Recomeçar toca a música Teste das Notas, a primeira fase do modo guitar hero. Os aliens chegam de vários lados em volta da galinha e atiram notas de luz no tempo da música; rebata cada uma com qualquer golpe quando ela chegar no anel em volta dela (PERFEITO, BOM ou FORA) e mande de volta nos aliens para virarem passarinhos. A Bicada só anula a nota. Notas perdidas baixam a barra de afinação.',
        'Novo item Taco, só de golpe: a nota rebatida sai mais rápida com um tok de madeira. Cada item agora transforma as notas que rebate do seu jeito (a Flauta sobe uma oitava, o Trompete faz power chord, o Violão dedilha a tríade, a Submetralhadora faz um rufo…), e em Itens → Rebate dá para montar a cadeia de transformações, o snap e a velocidade de cada um. Nas fases, o leque fixa a nota e o item enfeita.',
        'Modo editor: novo grupo Música. A Zona sonora é um retângulo invisível com tom, escala, andamento e uma cadeia de transformações: ao entrar, a música muda, e as notas rebatidas ali seguem a escala dela. As Faixas fixas desenham um leque ou colunas de notas no mapa que afinam toda nota rebatida ou que passa por elas. Qualquer plataforma pode Rebater notas, fazendo a nota quicar e tocar de novo com a cadeia do taco, a dela ou sem mudar. O botão Zonas sonoras mostra tudo isso no editor.',
      ] },
      { title: 'Música', items: [
        'New York 1977 ganhou flauta e cordas menos agudas, mais espaço entre as respostas e foco no groove de baixo e guitarra.',
        'Ibiza 1986 foi recomposto: base Balearic Beat com piano, violão, synth suave e percussão, alternando trechos de pista e respiro.',
        'Manchester 1988 agora se chama Acid House: linha ácida com acentos e slides em primeiro plano, menos efeitos de rave e viradas mais curtas.',
        'London 1992 agora se chama Jungle: breaks com mais variação, subgrave com espaço e respostas dub no lugar do hoover dominante.',
        'Os quatro kits passam a ter oito seções: novos Pre-Chorus, Hooks, Bridges e Turnaround alternam momentos mais intensos e mais espaçados, com progressões visíveis em Harmony.',
        'Düsseldorf agora é Krautrock: bateria orgânica, guitarras, órgão e flauta substituem o synth-pop; Solo e Bridge abrem novos contrastes. Chicago alterna seus hooks e ganha Pre-Chorus e Bridge.',
        'Tokyo agora é Minimal: sons suaves entram aos poucos, células deslocadas se cruzam e novos Turnaround e Bridge exploram o silêncio.',
        'São Paulo agora é Hard Techno, com ride 909 mais suave e variado, menos agudos contínuos e novos Bridge e Turnaround. Bristol preserva o teremim modulado, suaviza o chimbal e ganha Pre-Chorus e Bridge.',
        'Goa agora é Psytrance: mantém as frases anteriores, refina discretamente os agudos e acrescenta Hook, Bridge e Turnaround com novos contrastes rítmicos.',
      ] },
      { title: 'Criativo e Pátio', items: [
        'Arrastar ou segurar sobre rótulos, painéis e menus não seleciona mais texto por acidente. A seleção continua disponível dentro dos campos editáveis.',
        'No Criativo, arrastar o painel de vozes aberto deixa de interromper a interface com um erro. As linhas acompanham o painel até a posição final.',
      ] },
    ],
  },
  {
    version: '2.0.0',
    date: '05/11/2026',
    title: 'Vila dos Telhados, criadores de casas e árvores, trampolins e novos controles do Pátio',
    groups: [
      { title: 'ChickenChess e Pátio', items: [
        'Contador discreto de FPS no canto inferior esquerdo e limite de 240 FPS, ambos ligados por padrão. Em Preferências, é possível desligar cada um separadamente. A escolha acompanha os modos do jogo neste navegador.',
      ] },
      { title: 'Pátio', items: [
        'O editor de árvores ganhou setas Próximo, pontas ajustáveis, balanço do tronco e teste de rajada. As folhas se distribuem pelas pontas dos galhos, com frondes na palmeira e raminhos pendentes no salgueiro. Há Ipês de várias cores e árvores gigantes, como a sequoia e o eucalipto Centurião.',
        'Camada e colisões ganhou “Ocultar colisores atrás”. As fachadas das casas já recortam por padrão os trechos cobertos das rampas e dos outros colisores do cenário. É possível desligar por objeto ou ligar em outros elementos opacos.',
        'Portais respondem a um novo aperto de Usar dentro do anel. Atravessar correndo, inclusive com o botão compartilhado do gamepad seguro, deixa o boneco seguir.',
        'O Modo editor ganhou dezoito estilos de árvores e moitas com prévia e sorteio por estilo. Personalize o tronco, os galhos, a copa, as cores e efeitos de vento, pétalas, folhas ou pólen. Troncos escaláveis e apoios nos galhos e grupos de folhas podem ser ligados separadamente.',
        'Arraste Trampolim da seção Plataformas e dê dois cliques para editar. Escolha a direção do impulso e um de cinco níveis de força. Cada nível tem sua própria cor e quantidade de molas.',
        'Abrir e Salvar ficam logo à direita do globo no cabeçalho do Pátio. O título mostra o nome do Pátio atual e acrescenta “(não salvo)” na mesma linha quando há alterações pendentes.',
        'Os portais de ida e volta do Templo do Gongo e da Vila dos Telhados podem ser selecionados e movidos no Modo editor. Cada posição fica salva com o Pátio.',
        'O Pátio padrão ganhou a Vila dos Telhados, uma vila colorida em degraus depois do Templo do Gongo. Dá para andar pelas inclinações dos telhados e pousar nos peitoris e acima das janelas e portas. Dois portais perto da entrada fazem a ida e a volta pelo Templo e pela Vila.',
        'No Modo editor, o criador de casas combina doze estilos com telhados, revestimentos, cores e fachadas ajustáveis. Veja a prévia, sorteie variações e insira a casa onde quiser no Pátio. As casas ficam no layout e podem ser redimensionadas, editadas ou duplicadas.',
        'O estilo Papel recortado traz casas com blocos de cor, granulado fino e uma porta central. O sorteio alterna proporções e telhados triangulares ou trapezoidais.',
        'O estilo Cubista traz fachadas facetadas e terraços em perspectiva. Nas versões com muretas, a galinha pode pousar nas quatro bordas marcadas.',
        'O criador de casas agora tem prévia fixa para arrastar ao Pátio e setas para experimentar a próxima opção dos seletores. Cada estilo ganhou um cartão com prévia na paleta. Arraste o cartão para sortear uma casa daquele estilo. As seções usam os títulos expansíveis de Ajustes e ganham colunas ao alargar o painel. Casas novas ficaram maiores e suas bases também são plataformas.',
        'O Modo editor tem um ícone de lápis no cabeçalho. Dois cliques abrem os parâmetros de uma casa ou outro elemento editável. O ícone de montanha permite editar a encosta da Vila, com pontos móveis e histórico. Os sliders do Pátio seguem o visual do painel Ajustes.',
        'O Pátio reduz o trabalho fora da tela e separa as animações do cenário do Templo do Gongo, evitando redesenhar o prédio inteiro a cada quadro. Mira, inventário e portais também usam menos processamento; em aparelhos de toque, o canvas usa resolução mais leve.',
        'No tablet/celular, arrastar o fundo ou os botões do cabeçalho do Pátio não rola mais a página. O bloqueio também vale no globo, preservando a rolagem dentro dos painéis.',
        'Correr no touch também pega itens do chão por padrão. A opção pode ser desligada em Controles do boneco → Na tela (celular). Cada botão touch agora pode ser posicionado individualmente; layouts antigos são preservados. A lista de movimentos ganhou rótulos mais curtos e mais espaço entre os tipos de input.',
        'Nova bind Deselecionar item, padrão F: deixa as mãos vazias sem perder itens, inclusive com inventário cheio. Cancela arremessos e ataques em preparação, fecha a roda sem equipar e pode ser personalizada nos controles.',
        'Ao começar Throw, o item e a asa agora transitam da pose atual para a pose de arremesso, sem saltar de posição/ângulo. Novo controle Velocidade da transição do arremesso em Ajustes → Arremesso (1×: cerca de 0,2 s). Cancelar ou trocar de item limpa a pose, inclusive ao reequipar depois.',
        'Ajustes ganhou a seção Arremesso, reunindo parada no ar, a nova parada no chão e o ângulo visual. No chão, o padrão é 90% de redução: carregar Throw permite caminhar/correr a 10% da velocidade em vez de travar totalmente. Os valores 0% e 100% permitem movimento normal ou parada total.',
        'Novo Ângulo de Arremesso em Ajustes → Arremesso, com padrão 45°: durante Throw, todos os tipos de item inclinam visualmente para cima. O ajuste não altera a direção física nem a trajetória do arremesso.',
        'Suportes de itens ganharam Tempo de reposição no editor, de 0 a 300 segundos. Consumíveis repõem em 0,1 s por padrão; armas e instrumentos mantêm 2 s. Cada suporte repõe sua própria coleta, mesmo perto de outro do mesmo item.',
        'Na mira normal com consumíveis, a asa inclina no máximo 25° para cada lado da pose padrão e o item permanece de pé com uma leve inclinação. Durante Throw, a asa fica livre e o item recebe o Ângulo de Arremesso.',
        'Nova Bicada: sem item selecionado, segurar Atirar recolhe o pescoço e já mantém o bico alinhado com a mira, acompanhando sua direção; soltar lança o bico na direção da mira, com retorno automático. Golpe conserva a asada. Itens → Armas → Bicada permite ajustar dano, alcance, arco, intervalo, duração, empurrão e recuo do pescoço para todos os jogadores locais, no Parquinho e no Templo. Padrões: alcance de 85 px, arco de 160°, intervalo de 0,1 s e duração de 0,16 s.',
        'Segurar Shift ao apertar Próximo item seleciona o item anterior. Funciona também com binds personalizados e outros jogadores locais; mudar Shift com o botão ainda apertado não troca de item novamente.',
        'Andar de costas passou do painel Câmera de Mira para Ajustes → Movimento, com padrão de 55% da velocidade normal. Valores antigos personalizados são preservados na configuração da galinha.',
      ] },
    ],
  },
  {
    version: '1.15.0',
    date: '04/11/2026',
    title: 'Boost ao levantar, habilidades Maryjane e Cok e tabuleiro estável no mobile',
    groups: [
      { title: 'ChickenChess', items: [
        'No mobile, rolar a partida e voltar rapidamente ao topo não desloca mais o tabuleiro nem as cartas por cima dos outros elementos. Casas vazias permitem rolar a página; o arraste das peças continua funcionando. A correção vale também para o Criativo.',
      ] },
      { title: 'Pátio', items: [
        'Portais só entram automaticamente com Correr segurado naquele momento, sem reaproveitar apertos antigos. O boneco surge no centro do portal de destino, crescendo e ganhando opacidade; instrução e retorno ficam bloqueados até ele sair completamente do anel, inclusive na volta ao globo.',
        'Modo editor ganhou Par de portais: arrastar cria duas entradas ligadas, que podem ser posicionadas separadamente. Cada uma permite texto próprio e instrução sempre visível ou ao encostar/passar o ponteiro. Duplicar e apagar trabalham com o par inteiro; os vínculos são salvos com o Pátio.',
        'Confirmar a entrada num portal agora para o boneco imediatamente e o faz desaparecer encolhendo e ficando transparente até o centro do anel, tanto na ida ao Pátio quanto na volta ao globo.',
        'Pandeiro dispara uma nota musical. A asa gira livremente com a mira e durante Throw; granadas acompanham o giro, e consumíveis ficam de pé na mão com uma leve inclinação. Comidas ganham som de mastigação e bebidas, som de goles; o estado búdico mantém o brilho sem o círculo amarelo no rosto. Os olhos acompanham a mira dos analógicos e do toque.',
        'No teclado, Throw fica somente no G, Próximo item passa para Tab e Roda do inventário para Q; rótulos de Roda e Pegar foram encurtados. Os antigos padrões migram preservando controles personalizados.',
        'Ao carregar Throw, a asa agora estica junto com o item e mantém a mão na empunhadura. Maryjane e Cok ficam na ponta da asa e também podem ser arremessados, levando as unidades da pilha sem consumi-las.',
        'Virar rapidamente de lado com o mouse não afasta mais a marca da mira durante o giro das armas. O giro lento configurado para cada item continua funcionando.',
        'No gamepad, RB e X ficam em Correr e Y em Throw; Golpe vai para B, Chocar fica no LT e X continua Pegar. Granadas e pandeiro ficam na mão da asa e recuam ao carregar Atirar, como no Throw. Os círculos de carga ficam ocultos; a animação e a trajetória mostram a força do arremesso.',
        'Explosões da bazuca, granada, teclado e pandeiro agora lançam os personagens para longe do centro, incluindo quem disparou. Atirar perto dos próprios pés pode jogar a galinha para cima. Cada item ganhou o controle “Empurrão da explosão” no grupo Explosão; 0 desliga o empurrão.',
        'Armas e instrumentos agora giram normalmente com a mira em 360°, sem virar o desenho do avesso ao passar por certos ângulos; ao virar o boneco de lado, acompanham seu espelhamento e o da asa. A saída dos disparos e o arco do violino acompanham essa rotação.',
        'Corrigido o aviso de carregamento do ícone de voltar ao globo que podia aparecer ao abrir o Pátio no navegador.',
        'Maryjane e Cok ficam na ponta da asa e vão até a boca ao consumir. Agora é possível acumular até 13 Maryjanes e 3 Coks, em um slot por tipo; recarregar não repõe esses itens.',
        'PigChicKen: duas habilidades especiais novas, em suportes no chão da segunda cena (entre os botões da horda e os bonecos). Pegue e aperte Atirar para usar. Maryjane (balinhas de ursinho vermelhas) coloca a galinha no estado búdico por 15 s: brilho dourado em volta e olhos semicerrados, velocidade final 33% maior e arrancada “ease-super-in” (começa devagar e termina rápido). Cok (garrafinha de vidro) faz o contrário por 15 s: velocidade final 22% menor e aceleração 33% maior, com bolhinhas subindo em volta dela. Um efeito por vez: usar o outro substitui o que estava valendo. Um círculo ao lado do inventário mostra o efeito e o tempo que falta. No painel de itens, o grupo “Efeito” regula doses, duração, velocidade, aceleração, curva e tempo da arrancada.',
      ] },
      { title: 'Galinha', items: [
        'Novo shocking jump em duas etapas: segure Chocar e aperte Pulo para preparar, baixar o corpo e dobrar as pernas; solte Pulo para saltar. A preparação reduz o movimento em 100% no chão e 80% no ar, com ajustes próprios para redução, corpo e pernas. Soltar Chocar antes cancela. As Combinações mostram a sequência com ícones.',
        'Encostada numa plataforma vertical a partir do chão, a galinha agora agarra e sobe ao apertar Cima.',
        'Os ajustes de impulso lateral (255 px/s no chão e 570 px/s no ar) e vertical (570 px/s) do pulo chocando limitam um impulso extra na direção do analógico de movimento ou teclado, somado ao pulo normal no chão e no ar; apontar só para o lado mantém a subida normal, sem impulso vertical extra. Durante a carga de Throw, a ave pode virar para os lados sem voltar a andar. No gamepad, R3 também pula, L3 abre a Roda do inventário, Select deixa de abri-la e Menu/Start passa a Recarregar.',
        'Padrões da galinha ajustados a partir do popup Ajustes: limite da virada no slide de 1500 px/s, uma batida de asa no pulo chocando, impulso correndo de 575 px/s no chão e 905 px/s no ar.',
        'Novo ajuste “Parada no ar durante o arremesso”, com padrão 80%: carregar Throw ou uma granada reduz o movimento aéreo para 20%. Em 100%, a ave fica suspensa até soltar ou cancelar a carga.',
        'Nova opção “Chocando fixo: levantar ao andar”. Na galinha, vem desligada: andar conserva a pose de chocar; para levantar, aperte Chocar novamente, pule ou segure Correr junto de esquerda/direita. Quem preferir o retorno automático pode ligar a opção em Combinações.',
        'Pular chocando correndo ganhou impulsos separados para chão (padrão 575 px/s) e ar (905 px/s). No ar, é preciso segurar uma direção lateral. O controle de batidas de asa do pulo chocando agora mostra as batidas mesmo enquanto Chocar mantém a pose de queda rápida.',
        'Levantar andando (de agachada, chocando ou do slide, segurando esquerda ou direita) dá um impulso curto de velocidade que vai sumindo suavemente. No Pátio da Galinha, em “Agachar e slide”, os novos ajustes “Boost de velocidade ao levantar” (padrão 1,3×; 1 desliga) e “Duração do boost ao levantar” (padrão 0,4 s) regulam o efeito. Levantar parada não muda nada.',
      ] },
    ],
  },
  {
    version: '1.14.0',
    date: '03/11/2026',
    title: 'PigChicKen: inventário organizado e roda do inventário',
    groups: [
      { title: 'Criativo', items: [
        'Novo botão Arpeggiator na linha de botões abaixo do MIDI, na partida e no Criativo: um clique transforma as notas da variação num arpejo com a configuração atual. Segure o botão (ou clique com o botão direito) para abrir as configurações: ordem (Up, Down, Up/Down, As played, Walk, Random, Chord), Rate com tercina e pontuada, Octaves, Length, Gate, Swing, Chord/Above e o Rhythm com uma barra de acento por passo. Mexer nas configurações reaplica na hora, sempre a partir do MIDI original, sem acumular.',
      ] },
      { title: 'Pátio', items: [
        'PigChicKen: o trajeto pontilhado do arremesso volta a seguir a mira com outros players locais no Pátio (antes ele ficava preso na direção do outro player). Enquanto segura Arremessar com um item, a galinha para de andar e correr. Trocar de item durante a carga cancela o arremesso: soltar o botão não arremessa o item novo.',
        'PigChicKen: na Granada, o X de onde ela cai e o círculo do dano agora só aparecem enquanto você segura Atirar, como no Pandeiro.',
        'PigChicKen: a roda do inventário fica aberta só enquanto você segura o botão dela; ao soltar ela fecha e equipa o item escolhido, se houver. Com a roda aberta e um item escolhido, apertar atirar, pular ou correr também equipa o item e fecha a roda.',
        'Controles do boneco: ícones de teclado e gamepad acima do nome de cada tipo de input, e Cmd esq. deixa de ser tecla de chocar.',
        'PigChicKen: no Pandeiro, o X de onde ele cai e o círculo do dano só aparecem enquanto você segura Atirar. Cada arma de explosão ganhou a opção “Onde cai (círculo do dano)” no painel de itens (Sempre, Com o tiro segurado, …); o Lança-foguetes e as outras continuam mostrando o tempo todo.',
        'Pátio da Galinha: o portal agora fica parado perto do começo do Pátio, ela chega ao lado dele, e entrar nele leva de volta ao globo (“Back to the globe?”). Nos dois portais, com o botão à mostra, apertar correr ou pegar (Shift / E, X no gamepad) também confirma a entrada.',
        'Pátio da Galinha: chegar correndo num portal (segurando correr enquanto anda) já entra direto, sem parar para confirmar.',
        'Pátio da Galinha: segurando Pegar (E, X no gamepad, ou o botão Pegar no toque) enquanto anda, ela pega sozinha cada item por onde passa, como se apertasse Pegar em cima de cada um.',
        'PigChicKen: arremessar agora vai para qualquer direção da mira, em 360°. Enquanto você segura para carregar, o item é puxado para trás, no sentido contrário, como um estilingue, e um trajeto pontilhado mostra para onde ele vai, sumindo da metade para o fim.',
        'Pátio da Galinha: cabeçalho transparente, o botão de voltar é o mesmo botão Globo das partidas, e árvores no estilo das do templo, cada uma diferente, ficam em primeiro plano nas cenas, meio transparentes para não esconder o jogo.',
        'Templo do Gongo: o terraço logo abaixo da balaustrada virou plataforma em todo o templo, e o aviso do gongo fica logo acima da trave de madeira do alto dele, encostado nela.',
        'Pátio da Galinha: novo botão de volume no cabeçalho. Ele abre um painel com o Master volume em cima e um controle para cada camada de som: instrumentos, ambiente, armas, efeitos do cenário (gongo, templo e portal) e os cacarejos da galinha. Os volumes ficam salvos neste navegador e os que já estavam no painel do Parquinho passam para cá.',
        'Pátio da Galinha: chat. Aperte Enter (ou o botão de balão no cabeçalho), escreva até 140 caracteres e aperte Enter de novo: a mensagem aparece num balão de fala em cima da galinha, por um tempo de leitura que cresce com o tamanho do texto (de 3 a 11 s). Enquanto o campo está aberto, as teclas vão para o texto e não mexem a galinha; Esc cancela.',
        'Pátio: os olhos dos aliens (do Parquinho e do Templo do Gongo, incluindo o dragão) agora seguem a galinha. Cada alien olha para o personagem mais perto dele, pronto para quando houver vários no modo online.',
        'Pátio: novo modo editor (botão de régua e lápis no cabeçalho ou tecla =). Arraste plataformas, terraços, pilares, árvores, alvos de treino, suportes de armas e instrumentos e botões da horda para o Pátio; clique para selecionar, arraste para mover, puxe pelos cantos para redimensionar, gire de 45 em 45°, tranque com o cadeado, escolha a camada (atrás ou na frente da galinha) e se o elemento é sólido, para tiros e para notas. Os alvos ganham um painel para editar a dica e a vida. Só edita quem criou o Pátio (ou o admin); “Criar meu Pátio” faz uma cópia do Pátio padrão para você editar. O mundo também ficou 3000 px mais alto, e a câmera sobe junto quando ela passa da metade da tela.',
        'Pátio: botões Salvar (disquete) e Playgrounds (pasta). O Pátio salva sozinho a cada minuto, ou na hora em “Salvar agora”, e avisa se outra pessoa salvou antes. Dê um nome para guardá-lo para sempre (sem nome ele some depois de 30 dias parado); quem dá o primeiro nome vira o padrinho. Veja quem criou, apadrinhou, editou e jogou e favorite Pátios. Em Playgrounds, as listas Salvos e Favoritos têm “Ver todos”, ordem (Recents, Most played, mais jogando agora, nome) e mostram quantas pessoas estão jogando em cada Pátio; ou comece um novo a partir do Pátio padrão. O admin vê também os não salvos de todos, duplica e escolhe o Pátio padrão.',
        'Pátio: no modo editor, o botão de gravidade faz o elemento cair até se apoiar em outro (ou no chão). As armas e instrumentos da paleta voltaram a aparecer. A câmera passou para o painel “Câmera de Mira”, e o passador de lobby e o botão de players ficam logo depois do nome do Pátio.',
        'Pátio: os bonecos de treino agora quebram aos poucos (arranhado, rachado, caindo aos pedaços) e, sem vida, ficam em estado deplorável em vez de cair e voltar. Destruído, cada boneco mostra uma dica num balão. Notas de instrumentos consertam o boneco, e o som que ele faz a cada acerto começa grave e desafinado quando está destruído e vai subindo na escala e afinando conforme ele melhora.',
        'Pátio da Galinha: novo painel de Players (ícone de pessoas no cabeçalho). Adicione players locais (até 13 no lobby), cada um com a própria galinha, e escolha qual input controla cada um: teclado principal, teclado secundário (setas, PgUp/PgDn, Ins/Home/End/Del), mouse e cada gamepad. Coluna Edit mode para o dono do lobby liberar quem edita o Pátio, e Remove para tirar players. Copy link copia o convite; o modo online e o convite a amigos chegam quando o servidor voltar.',
        'Pátio da Galinha: cada player do lobby ganha uma cor própria (até 13, bem diferentes entre si), usada na borda do avatar e na retícula, para cada um achar a sua mira pela cor. A retícula dos players 2 em diante agora aparece.',
        'Vestiário: raças e itens têm raridade (Comum, Incomum, Rara, Épica, Lendária), cada uma com sua cor, que tinge o fundo da foto do card. Liberado / conquista / loja agora só colore o rótulo pequeno, e a borda dos cards ficou cinza neutro.',
        'Pátio da Galinha: cada player local tem o próprio inventário e pega, troca e usa armas e instrumentos. Os inventários ficam no canto superior direito, um embaixo do outro, com o avatar de cada player ao lado (clique para abrir o vestiário dele).',
        'Globo: embaixo do botão do portal do Pátio, um switch online / local escolhe como entrar (local por padrão). No cabeçalho do Pátio, setas para passar entre os lobbies públicos (ativas no modo online).',
      ] },
      { title: 'Galinha', items: [
        'Pátio: os outros players locais também veem o destaque azul ou cinza no item em que estão em cima, com a tecla de pegar do próprio controle. No teclado secundário, a barra / pega o item.',
        'PigChicKen: o analógico esquerdo (do gamepad e da tela) voltou a mirar, como antes: ele regula a mira assim que é empurrado, e o analógico direito tem prioridade quando os dois estão ativos. Só as setas e o WASD do teclado continuam sem mirar.',
        'PigChicKen: o inventário agora mostra só as casas com item, mais uma casa vazia (mãos vazias) enquanto houver espaço. A troca rápida (Q no teclado, LB no gamepad, rodinha do mouse) passa pelos itens, por uma casa vazia e volta para o primeiro.',
        'PigChicKen: com o violino na mão, a asa segura um arco. Tocando, o arco vai e volta nas cordas conforme o mouse se mexe (uma arcada inteira a cada 260 px); com o mouse parado, ou mirando pelo analógico, ele faz uma arcada por batida.',
        'PigChicKen: os itens ficam sempre agrupados no inventário, nesta ordem: instrumentos musicais, armas e depois os demais itens. O limite agora é de 13 itens.',
        'PigChicKen: nova roda do inventário. Segure Tab (teclado) ou View/Select (gamepad), aponte para o item com o mouse ou o analógico direito e solte para equipar. Um toque rápido deixa a roda aberta: aí é só clicar ou tocar no item (no celular, botão “Roda”). A roda mostra só os itens que ela tem, mais uma casa vazia se houver espaço, com fatias do mesmo tamanho, e faz um tique bem suave ao passar por cada item.',
        'Controles: o painel “Controles da galinha” virou “Controles do boneco”, com uma lista só de movimentos e as colunas agrupadas por tipo de input: Primary keyboard, o novo Secondary keyboard e Gamepad. O Secondary keyboard, pensado para um segundo jogador no mesmo teclado, usa as setas para andar, PgUp pula, PgDn agacha, Shift direito corre, Ctrl direito choca, Ins atira, Home dá o golpe, End arremessa, Del e \\ trocam de item e Backspace recarrega. No teclado principal, V também atira e B também dá o golpe. Para apagar um campo, clique nele com o botão direito.',
        'PigChicKen: andar pelo teclado (setas, WASD) não mexe mais na mira, para não brigar com o mouse. Sem mouse nem analógico, ela mira para a frente.',
        'Pátio da Galinha: nova combinação pular chocando correndo (frente + correr + chocar + pulo), com impulso lateral próprio em Combinações (padrão 100 px/s) e as batidas de asa do pulo chocando. Agachada correndo agora anda 1,60× mais rápido por padrão.',
      ] },
      { title: 'Interface', items: [
        'Barras de rolagem de todos os painéis e popups agora têm o fundo transparente e a barra com 50% de transparência.',
      ] },
    ],
  },
  {
    version: '1.13.0',
    date: '02/11/2026',
    title: 'Templo do Gongo: mini-jogo de aliens em fases no Pátio, e o portal do Pátio pede confirmação',
    groups: [
      { title: 'Galinha', items: [
        'Globo: encostar a galinha no portal não leva mais direto ao Pátio. Enquanto ela estiver encostada, aparece o botão “Enter playground?” acima do portal; clique (no computador) ou toque (no celular) nele para entrar. Se ela se afastar, o botão some.',
        'PigChicKen: novo mini-jogo Templo do Gongo, na última cena do Pátio (depois de todas as outras), com cenário de templo chinês. Bata 5 vezes no gongo (tiro, golpe de asa ou nota) para começar. São 6 fases, cada uma com um alien novo: águas-vivas que marcham no ritmo, Lanternas que mergulham em você, Cascos que aguentam vários tiros, Gêmeos que se dividem em dois, Tambores que só abrem no tempo da música e, no fim, o Dragão (destrua o corpo para expor a cabeça).',
        'Templo do Gongo: a música cresce a cada fase (gongo, taiko, woodblock, baixo, guzheng, flauta, sinos), e cada alien derrubado toca a próxima nota da melodia da fase. A pista de ritmo no alto mostra as batidas chegando: atire no tempo para fazer PERFEITO, subir o combo e multiplicar os pontos; as batidas vermelhas são as que soltam bombas.',
        'Templo do Gongo: 3 corações por fase; bombas, mergulhos e o fogo do dragão tiram um. Ao vencer a fase aparecem os pontos, fogos e as lanternas do templo acendem; bata 3 vezes no gongo para a próxima. Perdeu? 3 batidas no gongo tentam de novo.',
        'Templo do Gongo: os telhados e beirais do templo agora são plataformas, com a mesma curva do desenho: dá para pousar e andar por cima deles.',
        'Templo do Gongo: embaixo da pista de ritmo aparece uma dica do que fazer (atirar quando a bolinha chega no anel; as vermelhas são bombas).',
        'Pátio: cenário no mundo inteiro, com céu de entardecer, sol baixo, nuvens translúcidas, montanhas e árvores ao fundo em parallax (quanto mais longe, mais devagar passa).',
        'Templo do Gongo: cenário mais calmo e menos saturado. O pavilhão do fundo fica na névoa, os telhados onde dá para subir têm um friso dourado claro, e os aliens ganharam um halo escuro para aparecerem na frente do prédio.',
        'Templo do Gongo: os 4 itens ficam no lado esquerdo do templo, a pedra Recomeçar no lado direito, e as plataformas soltas saíram (os telhados são as plataformas).',
        'Templo do Gongo: a música de cada fase agora tem seções (groove, pergunta e resposta da flauta com os sinos, riff do guzheng, breakdown e subida), viradas de taiko e uma linha de baixo própria por fase. Em repouso, o guzheng e a flauta tocam devagar.',
        'Templo do Gongo: mais aliens por fase (formações de 7 colunas e 4 linhas a partir da fase 2) e um dragão mais comprido.',
        'Templo do Gongo: nova pedra “Recomeçar” ao lado do gongo. Bata 3 vezes nela para encerrar o jogo (no meio ou depois do fim), zerar os pontos e voltar os painéis ao início.',
        'Galinha: pousando correndo com agachar apertado, ela entra direto no slide (antes andava agachada).',
        'PigChicKen: as informações de debug (linha de estado no rodapé, nomes das cenas, linhas dos telhados) ficam escondidas. O botão “Debug” no painel Ajustes mostra e esconde.',
        'Arremessar item no teclado agora é F (G continua funcionando).',
        'PigChicKen: armas e instrumentos não são mais pegos só de passar por cima. Parado sobre um item, aperte Pegar (tecla E ou o botão na tela) para pegá-lo; ele já vai para a mão. Com o inventário cheio, Pegar troca pelo item que está na mão.',
      ] },
    ],
  },
  {
    version: '1.12.0',
    date: '01/11/2026',
    title: 'Pátio da Galinha dentro do jogo e uma configuração da galinha para todas as telas',
    groups: [
      { title: 'Galinha', items: [
        'O Pátio da Galinha agora é uma seção do jogo: abra pelo link “Pátio da Galinha” no painel Controles da galinha (botão do gamepad no globo).',
        'Portal para o Pátio no globo: um anel de raios azuis semitransparente no fim do chão, no canto direito. Leve a galinha até ele (andando, pulando ou clicando nele) e ela é puxada para dentro com um som suave e um clarão azul, chegando ao Pátio no meio de um anel de raios.',
        'No Pátio dá para pular nas caixas e ajustar tudo da galinha (movimento, pulo, voo, animação, cacarejos e o visual de cada parte) vendo o resultado na hora.',
        'Novo slider “Volume dos cacarejos” no Pátio (grupo Cacarejo). O padrão agora é 0: a galinha fica muda até alguém aumentar e salvar.',
        'No gamepad, o X passa a ser correr (no lugar do RB). Chocar (e travar a mira com item) fica no LT e no B.',
        'O Vestiário do protótipo voltou no Pátio (botão com a cabeça da galinha): raças e cada parte com miniaturas, prévia grande e a origem de cada item (liberado, conquista ou loja).',
        'A galinha não agarra mais as laterais das plataformas flutuantes ao pular: ela agarra quando os pés encostam numa lateral no ar sem nenhum botão de movimento apertado.',
        'Com a conta admin, “Salvar padrão” grava os ajustes para todo mundo, e o globo (e qualquer outra tela com a galinha) passa a usar essa mesma versão. Sem a conta admin, os ajustes ficam só no seu navegador, como rascunho.',
        'No celular, um botão com ícone de gamepad à esquerda de Friends, no globo, mostra e esconde os controles da galinha na tela. No globo eles começam desligados.',
        'PigChicKen: o painel Controles da galinha, no Pátio, ganhou “Editar posição dos botões”: os analógicos, os botões e o inventário podem ser arrastados na tela, e o botão Ok no alto salva a posição (Padrão volta ao original).',
        'PigChicKen no celular: o analógico da esquerda mira em 360 graus, e não só nas 8 direções. Um toque rápido no analógico da direita (sem arrastar) atira no inimigo mais próximo, ou num boneco de treino quando não há inimigos.',
        'Globo no celular: a página não rola mais (nem arrastando os botões); é uma tela única. As margens do logotipo e dos botões do cabeçalho e do rodapé encostam mais na borda da tela (12 px), o espaço entre todos os botões é de 6 px e o botão Campanhas fica alinhado à esquerda com o logotipo.',
        'Globo no celular: arrastar a galinha com o dedo não solta mais ela sozinha logo depois de começar o arraste.',
        'Globo: a galinha nunca cai do céu em cima do portal do Pátio (nem perto dele), então a tela não vai mais direto para o PigChicKen ao abrir o globo.',
        'PigChicKen: o inventário agora é clicável. Clique (no computador) ou toque (no celular) num quadradinho para equipar aquele item. No modo de editar posição dos botões, arrastar o inventário não equipa nada.',
        'PigChicKen: os quadradinhos do inventário ficaram um pouco maiores e encostados uns nos outros, separados só por uma linha. Os números das casas aparecem só no computador.',
        'PigChicKen: o Pátio agora tem tamanhos fixos. Plataformas, galinha, aliens, zumbis e itens têm o mesmo tamanho em qualquer tela (o do computador) e não mudam ao redimensionar a janela: só muda o pedaço do mundo que aparece. No celular a câmera também sobe e desce seguindo a galinha. É a base para o multiplayer entre aparelhos diferentes.',
        'Ao sair da aba ou do app, todos os sons do jogo param (música, efeitos, portal, Pátio) e voltam quando você retorna.',
      ] },
      { title: 'Desempenho no celular', items: [
        'Em celulares e aparelhos limitados, a música usa um perfil mais leve: sem LFO de filtro e tremolo, sem delay próprio e sidechain por peça (essas peças usam o delay comum), supersaw com até 3 vozes, e as rampas de ganho e filtro das regras chegam de uma vez em vez de compasso a compasso.',
        'O portal do Pátio tem uma versão leve no celular (sem brilho borrado, menos raios e faíscas, 30 quadros por segundo), e qualquer aparelho que comece a perder quadros com o portal completo passa para ela sozinho.',
        'A galinha no globo procura as plataformas na tela menos vezes por segundo, aliviando cada quadro.',
      ] },
    ],
  },
  {
    version: '1.11.0',
    date: '31/10/2026',
    title: 'Pontos históricos só com o contador cheio, galinha com novas combinações de pulo e piscada no “Your move”',
    groups: [
      { title: 'Ovos e pontos históricos', items: [
        'Os ovos ganhos na partida só viram pontos históricos quando o seu contador já está cheio (12 ovos). Esses ovos extras somem numa nuvenzinha ao bater no contador, ficam cinza, caem um pouco girando e desaparecem, e aparece “+X historic points” em cinza embaixo do contador por 2 segundos.',
        'No fim da partida você leva os golden eggs que estão nos contadores (como antes), e os pontos históricos ganham, além desses ovos, só os ovos extras ganhos com o contador cheio. Um lance premiado com o contador cheio não paga de novo depois de Undo.',
        'Os ovos nas casas das setas mostram o prêmio inteiro, mesmo com o contador cheio.',
        'No online, os ovos ganhos agora também voam da casa até o contador, nos dois lados, com a nuvenzinha quando o contador está cheio.',
      ] },
      { title: 'Partida', items: [
        '“Your move” dá uma piscada rápida quando aparece, para chamar atenção para a sua vez.',
        'O histórico de jogadas no rodapé não bloqueia mais o mouse: dá para passar o mouse e clicar no que está atrás dele.',
        'Nova preferência Award animations: com “No flying eggs and sounds”, os lances premiados e os cliques em Best moves/Worst moves não tocam o som de Best/Worst, e os ovos não voam; as frases e o total de ovos acima da peça continuam.',
        'Levar xeque-mate de um bot (campanha ou partida livre) não encerra mais a partida nem zera os ovos: aparece um aviso no canto inferior direito com “Return to lobby”, e, se você tiver ovos, um Mulligan desfaz o mate e a partida continua (o aviso some sozinho). Partidas online contra outros jogadores continuam terminando no xeque-mate.',
        'No hover do Mulligan, se a jogada que seria desfeita “comeu” uma peça, essa peça reaparece na casa onde estava, com a mesma transparência das peças fantasma (campanha, partida livre e online).',
      ] },
      { title: 'Sequenciador MIDI', items: [
        'O aviso “A game rule forces only variation…” (e o de limite de notas) aparece pequeno, em branco, logo abaixo do “X bars / Y beats” do sequenciador, em vez de em cima dele.',
      ] },
      { title: 'Galinha no globo', items: [
        'A galinha usa a classe Leve e os cacarejos revisados no Pátio da Caipira.',
        'Novas combinações: chocar e andar ao mesmo tempo, agachar correndo, e pulos com impulso para o lado próprio: agachada, chocando, agachada correndo e o super pulo agachada correndo e chocando. O empurrão para o lado ao pular agora dura até ela pousar.',
        'Soltar o botão de chocar sem segurar mais nada deixa a galinha chocando; qualquer outro controle a faz levantar, e apertar chocar de novo a deixa parada normal.',
        'Segurando baixo, o pulo não agarra mais nas laterais das plataformas flutuantes, como já acontecia com os chões flutuantes.',
        'Cada movimento tem seu próprio tipo de cacarejo, ou nenhum.',
        'Arrastada pelo mouse ou toque, ela bate as asas no ritmo da classe (ou fica com as asas paradas).',
        'No gamepad, o X passa a ser chocar. Correr fica em RB e RT.',
      ] },
    ],
  },
  {
    version: '1.10.0',
    date: '28/10/2026',
    title: 'Galinha sobe sozinha em degraus e anda até onde você clicar',
    groups: [
      { title: 'Ovos nas partidas', items: [
        'Em posições com um só Best e um só Worst move (menos de 8 lances possíveis), uma jogada premiada passa a pagar no máximo 3 ovos: a sequência de Worst que antes dava 6 ovos agora dá 3.',
      ] },
      { title: 'Galinha no globo', items: [
        'Andando, quando a canela ou o pé da galinha encosta na borda de uma plataforma (um botão do rodapé, um popup), ela sobe nela sozinha; se encostar em mais de uma, sobe na mais alta.',
        'Point-and-click: clique ou toque em qualquer ponto da tela e a galinha anda até ele. Ela para e volta ao normal quando chega embaixo do ponto, quando algo a impede de seguir ou quando você usa qualquer controle dela. Arrastar (o globo, um popup) não conta como clique.',
      ] },
      { title: 'Vitória', items: [
        'Na animação de vitória, os ovos voando para a cesta passam na frente do popup da cesta, em vez de sumirem por trás dele.',
        'O botão Return to map do popup da cesta agora se chama Return to lobby.',
      ] },
      { title: 'Partidas', items: [
        'Recolher os ovos de Best/Worst com outra peça (que não a da seta) mostra frases próprias em cima da peça: depois de Worst, elogios como “So clever!” e “You\'re the goat.”; depois de Best, sarcasmo como “Not so smart.” e “What u doing bro?”.',
      ] },
      { title: 'Partidas', items: [
        'Tentar comer uma peça protegida pelo Shield não abre mais um popup: aparece o aviso temporário “Nem tente. Essa peça está protegida.”, a peça protegida dá uma tremidinha junto com o escudo e toca um som de escudo metálico. Vale também no 1v1 online.',
      ] },
    ],
  },
  {
    version: '1.9.2',
    date: '27/10/2026',
    title: 'Criativo 2.0 com tabuleiro livre e widgets, tabuleiro arrastável e cartas com tamanho próprio nas partidas, globo realista com nuvens que mudam a cada visita e galinha jogável no globo',
    groups: [
      { title: 'Criativo 2.0', items: [
        'O Criativo ganhou o visual das partidas: fundo preto, tabuleiro no centro da tela e o título CHICKENCHESS LAB com o botão de voltar ao globo no canto superior esquerdo.',
        'Os painéis viraram widgets flutuantes ligados ao tabuleiro (ou à peça selecionada, no caso de Instrument e Sample source) por linhas: Creative kit, Transport, States & Events, Strudel code, Instrument, Sample source e 32 voices. Arraste por qualquer parte, redimensione pelo canto inferior direito e use o botão de energia para desligar: o widget desligado fica recolhido, só com o título.',
        'O Criativo agora tem as cartas e o contador de ovos das partidas. Os ovos são infinitos (∞). Best moves e Worst moves mostram as setas das melhores e piores jogadas do lado da peça selecionada, sem som e sem ovos nas casas. Mulligan desfaz o último movimento de peça. Freeze e Shield só funcionam nas partidas.',
        'As cartas do Criativo são silenciosas: passar o mouse ou clicar nelas não toca nenhum som.',
        'No widget States & Events, a chave This kit / Global fica à direita do título, e o conteúdo ocupa o próprio widget, sem a caixa interna.',
        'O widget 32 voices virou o Song & Instruments das partidas: Global Sections no topo, brancas e pretas em duas colunas, MIDI das peças ativas, Solo e o ponto de liga/desliga ligado à peça por uma linha ao passar o mouse.',
      ] },
      { title: 'Partidas e Criativo', items: [
        'Arraste a partir de uma casa vazia para mover o tabuleiro pela tela, junto com os ovos, as peças capturadas e o status. Esc durante o arraste devolve o tabuleiro ao lugar.',
        'As cartas ficaram independentes do tabuleiro: redimensionar o tabuleiro não muda mais o tamanho das cartas, e as cartas têm suas próprias alças de redimensionamento nos quatro cantos, no mesmo estilo das alças do tabuleiro.',
        'As cartas também podem ser arrastadas pela tela pelo fundo do container delas, no Criativo e nas partidas, sem mover o tabuleiro.',
      ] },
      { title: 'Widgets do Criativo', items: [
        'No 32 voices, Activate White / Black / Mute all virou texto com links no cabeçalho, à direita do título; Black é novo e liga só as peças pretas.',
        'O Transport não repete mais as Global Sections, que ficam no 32 voices. Harmony ficou alinhado com os outros campos, e a linha de compasso e BPM fica por cima da curva de BPM, sem a ajuda da unidade do BPM.',
        'Os knobs do antigo widget Parameters foram para o Instrument, em mini-abas como na partida: Tuning, Filters, Modulation, Movement e Note. Selecionar uma nota no MIDI abre a aba Note com os parâmetros dela.',
        'Fonte do som, banco, articulação, afinação do sample, Behavior e Synth timbre ficam no novo widget Sample source.',
        'O título do Criativo agora é só CHICKENCHESS LAB, sem a ajuda e sem o segundo título Creative Mode.',
        'O título do 32 voices mostra quantas peças estão no tabuleiro e quantas estão ativas, como “32 VOICES (4 active)”, no lugar da legenda que ficava abaixo do tabuleiro.',
        'O símbolo de infinito do contador de ovos ficou com o dobro do tamanho, e as cartas do Criativo não mostram mais o preço.',
        'Acima e abaixo do tabuleiro, no lugar das peças capturadas da partida, fica uma peça de cada instrumento do kit. Arraste uma delas para uma casa para colocar ali essa peça com o instrumento dela, substituindo o que estiver na casa. Assim dá para montar o tabuleiro com quantas peças quiser, onde quiser.',
        'Arrastar uma peça e soltar fora do tabuleiro tira ela do tabuleiro. Mulligan desfaz, e Reset positions volta as 32 peças às casas iniciais.',
      ] },
      { title: 'Mapa', items: [
        'O globo ganhou um modo realista: superfície com imagens de satélite da NASA, oceanos com reflexo do sol, luzes das cidades no lado noturno, atmosfera azulada na borda e uma camada de nuvens com tempestades em espiral que é sorteada de novo a cada vez que o mapa abre.',
        'O modo realista entra com um fade de 2 s logo depois da animação de abertura do globo, quando ele começa a girar sozinho.',
        'Novo botão com ícone de globo à esquerda de Maximizar alterna entre o globo neon e o realista; o ícone mostra o modo atual e, no hover, o modo que o clique vai ativar. A escolha fica salva no navegador.',
        'A lista de campanhas e cidades vai até o fim da tela, por trás dos botões do rodapé, e as linhas aparecem uma a uma ao abrir; ao recolher Campanhas ou entrar numa fase, elas somem uma a uma, da primeira à última. As fontes da lista ficaram 33% maiores.',
        'No popup da cidade, a descrição ficou maior e os botões Campaign e Create lobby têm texto e ícone com o dobro do tamanho. Quando o modo online está fora do ar, o botão aparece desativado com "Online mode temporarily disabled" e o synth do hover fica um pouco mais grave.',
        'Segurar o popup pelo botão de fechar ficou mais físico: o cartão pende do botão e balança com o peso conforme o movimento da mão; ao soltar, fica torto onde foi largado, mesmo com parte fora da tela, e a linha até o pin continua presa ao botão. Os sons desse gesto ficaram 40% mais baixos.',
        'Os botões de ano do popup tocam um chimbal fechado no hover, alternando um toque normal e um mais fraco.',
        'Os botões de ano ganharam hover com borda branca, e trocar de ano toca o chimbal mais baixo e mais curto.',
        'O popup da cidade abriu 10% mais largo e ganhou uma alça para redimensionar no canto inferior direito; o botão online ocupa toda a largura do cartão.',
        'Ao entrar numa fase pela campanha, todos os popups abertos, inclusive o da cidade escolhida, se soltam e flutuam para fora da tela, girando.',
      ] },
      { title: 'Galinha no globo', items: [
        'Depois que o globo termina a aproximação inicial, uma galinha cai do céu num ponto aleatório da tela e fica numa camada acima de tudo. Ela anda, corre, pula, voa, choca, agacha, faz slide e cacareja.',
        'O chão é uma faixa de grama no rodapé, por trás dos botões do rodapé. A lista de cidades continua até o fim da tela, por trás do chão. Os botões do rodapé, os botões de zoom, os popups das cidades e os botões Campaign e Create lobby viram plataformas flutuantes: dá para subir neles, atravessar pulando de baixo e descer com pra baixo + pulo.',
        'As laterais da tela são paredes rígidas: andando contra elas a galinha agarra e escala. Nas laterais dos popups ela agarra pulando perto. Também dá para pegar a galinha com o mouse ou o dedo e soltar.',
      ] },
      { title: 'Controles', items: [
        'Novo botão de controle no canto superior direito do globo abre o painel de controles da galinha, o mesmo em todas as telas: teclado e gamepad com até três teclas ou botões por ação, controles na tela (automático, sempre ou nunca), cacarejos, link para o protótipo Pátio da Caipira e restaurar padrão.',
        'Em telas de toque aparecem controles mobile: analógico semitransparente à esquerda e botões redondos de correr, chocar e pular à direita, os quatro alinhados pelo centro na parte de baixo da tela. No celular, os botões de zoom do globo ficam escondidos.',
      ] },
    ],
  },
  {
    version: '1.9.1',
    date: '26/10/2026',
    title: 'Ensaio da Mangueira refeito com bateria gravada, batidão mais forte no funk carioca e kits padrão do Criativo agrupados por campanha',
    groups: [
      { title: 'Brazilian', items: [
        'Rio de Janeiro 1984 · Ensaio da Mangueira virou só bateria, com timbres gravados: surdo de primeira grave e aberto no segundo tempo, abafado com a mão no primeiro (sem surdo de segunda, como na Mangueira), surdo de terceira cortando, caixas de guerra em cima, tarol, tamborins em teleco-teco e desenhos, chocalho de platinelas, agogô, reco-reco, dois repiques, cuícas e o apito do mestre.',
        'A fase começa no esquenta (apito, chamada do repique e a entrada da bateria), o xeque faz a paradinha com a convenção de toda a bateria e lances quietos levam à bossa, com surdos e caixas saindo e tamborins e repiques na frente.',
        'Rio de Janeiro 1995 · Funk carioca: o bumbo 808 agora marca o batidão em 3+3+4+3+3, mais forte e à frente do kit, e o sub 808 bate junto com cada bumbo.',
      ] },
      { title: 'Criativo', items: [
        'Na lista Current Creative kit, os kits padrão das cidades aparecem agrupados por campanha (Electronic World, Ballads, Classical, Harmonic songbook, Brazilian, World e Africa Cult), em ordem de ano, com nomes no formato "ANO Cidade - Estilo", como "1984 Chicago - Classic House".',
      ] },
    ],
  },
  {
    version: '1.9.0',
    date: '25/10/2026',
    title: 'Electronic World e Brazilian refeitos, Goa, Bristol, Croydon, Durban e o ensaio da Mangueira, engine musical expandida e samples 5× menores',
    groups: [
      { title: 'Electronic World refeito', items: [
        'Os 12 kits da campanha foram recompostos para soar como os estilos que representam: baterias, timbres, melodias, ritmos, efeitos e a função de cada peça seguem o gênero e o ano de cada cidade.',
        'Dois bancos novos de samples: baterias eletrônicas (TR-808, TR-909, LinnDrum, breakbeats, baterias empoeiradas e sintéticas) e vozes, stabs e efeitos (voz robótica, coro, "oh", "hey!", hoover, rave stab, órgão house, sirenes, apito, vinil, scratch, risers).',
        'Düsseldorf 1978 se inspira no timbre e na forma de "The Model" (Kraftwerk): string machine, sequência Minimoog em oitavas, bateria sintética e a voz robótica na dama. As melodias são originais.',
        'Nova York 1977 (disco), Chicago 1984 (house na TR-808), Detroit 1986 (techno com cordas e piano), Ibiza 1986 (balearic com violão espanhol), Manchester 1988 (acid house com a TB-303 na dama), Berlim 1991 (Tresor, hoover e eco dub), Tóquio 1991 (techno minimal com arpejador e pentatônica), Londres 1992 (breakbeat picado e hoover), São Paulo 1993 (hard techno com surdo, agogô, repique e chocalho), Joanesburgo 1994 (kwaito com canto de chamada e resposta) e Paris 1995 (French touch com sidechain e filtro).',
        'Correção: nos kits refeitos, a abertura e o meio-jogo prendiam a música numa única variação ("A game rule forces only variation A"), deixando a maior parte das peças em silêncio. Agora a música segue o arranjo normalmente e só eventos curtos (roque, xeque, captura da dama, lances quietos) trocam de variação.',
        'Cada kit tem reações próprias ao xadrez: na abertura a música começa enxuta, o roque e o xeque soltam o refrão ou o drop, a captura da dama leva ao break, a tensão mexe no filtro do jeito do estilo (a 303 abre em Manchester, o loop inteiro fecha em Paris, a fita desacelera em Bristol) e o final vai ao pico.',
      ] },
      { title: 'Brazilian refeito', items: [
        'Os 9 kits da campanha foram recompostos para soar fiéis a cada estilo: forma, ritmo, instrumentos e o papel de cada peça seguem o gênero e a época.',
        'Rio 1910 (choro com flauta, cavaquinho, bandolim e a baixaria do violão de 7 cordas), Rio 1930 (samba do Estácio com surdo, tamborim em teleco-teco, cuíca e coro da roda), Recife 1935 (frevo de rua com chamada de trompete, resposta dos saxofones e tarol), Piracicaba 1940 (moda caipira com a dupla em terças e a viola em ponteio e rasqueado), Recife 1950 (baião com sanfona, zabumba, triângulo e aboio), Rio 1960 (bossa nova com a batida do violão, contrabaixo, flauta e trompete com surdina), Recife 1975 (maracatu de baque virado com alfaias, caixas, gonguê e a loa do mestre), Salvador 1992 (samba-reggae com surdos em diálogo, trompetes e trombones) e Rio 1995 (funk carioca no Volt Mix da 808).',
        'Novo banco de samples brasileiros: cavaquinho, bandolim, viola caipira, sanfona, coro, tamborim, surdos, zabumba, alfaia, pandeiro, palmas, gonguê, triângulo, ganzá, reco-reco, apito e cuícas.',
        'Cada kit reage ao xadrez do seu jeito: o xeque puxa a convenção ou a breque do estilo, o roque abre o refrão, a captura da dama leva ao break ou ao solo e o final vai ao pico. Fases longas da partida (abertura, meio-jogo, seca de capturas) não prendem a música numa variação.',
        'Os volumes foram equilibrados por medição de cada instrumento no renderizador do jogo.',
      ] },
      { title: 'Nova fase · Ensaio da Mangueira', items: [
        'Rio de Janeiro 1984: um ensaio da bateria da Estação Primeira de Mangueira na quadra, a 138 BPM. Surdo de primeira, surdo de terceira cortando, repique de chamada, tamborins, caixas, tarol, chocalhos, agogô, reco-reco, duas cuícas, o apito do mestre, o cavaquinho e a quadra cantando o samba-enredo.',
        'O xeque faz a paradinha da bateria; a foto da fase é do desfile da Mangueira de 1957.',
      ] },
      { title: 'Novas fases · Bristol, Croydon e Durban', items: [
        'Bristol 1994: trip-hop a 90 BPM, breakbeat lento e empoeirado, vinil, scratches, Rhodes, órgão Hammond, cordas de cinema, trompa e um teremim na dama.',
        'Croydon 2006: dubstep a 140 BPM em meio-tempo, sub-grave, wobble com LFO no filtro, chimbal de garage, sirene dub e uma melodia da meia-noite na dama.',
        'Durban 2016: gqom a 126 BPM, tambores em tresillo sem bumbo no tempo um, baixo 808, coro sombrio, apitos, gritos e um canto grave na dama.',
      ] },
      { title: 'Nova fase · Goa 1994', items: [
        'Electronic World ganhou a 13ª cidade: Goa, 1994, trance psicodélico a 145 BPM em Mi frígio dominante, a escala "oriental" das festas de Anjuna.',
        'Kit próprio com 20 timbres novos: bumbo psy, baixo rolante (bumbo-baixo-baixo-baixo), dois acid 303 nos cavalos, lead serrilhado com vibrato na dama, cítara com ponte jawari, drone Om no rei, tablas, zaps de laser, riser e chimbais metálicos.',
        'A música cresce com o jogo: cada peça movida soma uma camada, o roque traz o drone Om e o riser, cada captura e cada xeque soltam o "drop" para quem jogou, 10 lances sem captura nem peão levam a um breakdown filtrado, e o final acelera para o pico.',
        'Na abertura a escala fica no frígio escuro; a segunda aumentada (Fá–Sol#) só aparece quando o meio-jogo começa.',
      ] },
      { title: 'Música reage a mais coisas do xadrez', items: [
        'Novo grupo Game dynamics em States & Events: Tension (partida equilibrada a partir do lance 15), Evaluation swing (a avaliação vira de repente), Undefended piece attacked (uma peça fica atacada e sem defesa), Advanced pawn (peão na 6ª ou 7ª fileira), Capture drought (muitos lances sem captura) e Opposite-side castling (roques em lados opostos).',
        'Cada um tem regra global: a tensão fecha o filtro aos poucos, a virada de avaliação solta a variação C para quem ganhou, a peça pendurada abre um filtro passa-altas, o peão avançado sobe um tom, a seca de capturas enche de eco e os roques opostos trocam para a escala paralela e aceleram em 8 compassos.',
        'Os limites de tensão, virada e seca de capturas podem ser ajustados no global ou por kit.',
        'Novas influências: passa-altas, ressonância, reverb, delay, drive e pan. Ganho e filtros podem deslizar ao longo de vários compassos, na entrada e na saída. Cada regra pode valer só para bateria, baixo, lead, pad ou FX.',
      ] },
      { title: 'Som das peças', items: [
        'Piece Params ganhou as abas TOM e FX/MOD. Em FX/MOD: ressonância e envelope do filtro, delay com tempo próprio (1/16 a 3/8), LFO no filtro, volume, pan ou altura, vibrato, FM, supersaw com vozes e abertura, loop de samples, sidechain (escolha a peça que "abaixa" esta a cada batida) e papel do instrumento.',
        'No Criativo, os mesmos controles ficam no bloco Modulation and synthesis.',
        'Cada nota pode ter CUTOFF (abre ou fecha o filtro só naquela nota) e VIB (vibrato só naquela nota).',
        'As variações MIDI podem ter até 16 compassos e 256 notas.',
        'No arranjo de cada peça, "Fill into the next section" escolhe uma variação para o último compasso da seção, como uma virada.',
        'Goa 1994 usa os recursos novos: baixo e pad abaixam a cada bumbo, os acids ganharam ressonância, o pad respira com um LFO e o arpejo FM ecoa em 3/16. Partidas equilibradas no fim fecham o filtro dos leads devagar.',
      ] },
      { title: 'Piece Params', items: [
        'Novo botão Euclid na linha de botões abaixo do MIDI, na partida e no Criativo: escolha Pulses e Rotate e o padrão euclidiano espalha os pulsos por igual na grade. No modo Notes ele reescreve o ritmo mantendo a melodia; em Accent, Ratchet e Chance ele só muda o acento, as repetições ou a chance das notas que caem (ou não) nos pulsos. Dá pra testar vários valores seguidos sem acumular mudanças.',
      ] },
      { title: 'Carregamento', items: [
        'Todos os samples foram convertidos para Opus: de 14,8 MB para 2,9 MB. Navegadores sem Opus (Safari antigo) recebem uma versão AAC.',
      ] },
      { title: 'Criativo', items: [
        'Novo grupo Legacy kits na lista de kits: as versões anteriores dos 12 kits do Electronic World e dos 9 kits do Brazilian continuam disponíveis para tocar e editar, sem ligação com as cidades.',
        'Nova escala Phrygian dominant em Scale e nas regras de States & Events.',
      ] },
      { title: 'Partida', items: [
        'Um Best ou Worst move feito com o contador cheio (12 ovos) não fica mais marcado como "já pago": se você voltar a jogada com Undo e repetir o mesmo lance com espaço no contador, os ovos entram normalmente. Vale para você, para os ChickenBots e para a partida online.',
        'O aviso do primeiro Best ou Worst move premiado não é mais gasto num lance que não rendeu ovos por causa do teto.',
      ] },
    ],
  },
  {
    version: '1.8.0',
    date: '24/10/2026',
    title: 'Kits salvos na conta, kit aleatório novo e Criativo mais enxuto',
    groups: [
      { title: 'Criativo', items: [
        'Com login, "Save kit" salva o kit na sua conta: ele aparece em My kits em qualquer computador em que você entrar. Sem login, continua salvando só neste navegador.',
        'O seletor de kit, o botão Load, o nome do kit e os botões Save kit, Export, Import e New random kit subiram para o cabeçalho, ao lado do título. Load (e New random kit ou Import) pergunta antes quando o kit atual tem alterações não salvas.',
        '"New random kit" substitui "Generate random kit" e "New draft": sorteia todos os parâmetros a cada clique, cria de 4 a 7 seções e deixa States & Events sem regras próprias. Peões tocam 8 percussões diferentes do estilo da cidade, cavalos fazem o baixo, bispos as teclas, torres sopros/synth, o rei cordas/guitarra e a rainha sorteia entre melodia principal, pad ou contramelodia.',
        'O tabuleiro do Criativo funciona como o da partida: não há mais o seletor Move/Play squares. Segurar toca a nota, arrastar move a peça para qualquer casa (trocando de lugar com a que estiver lá) e clicar numa casa vazia desmarca a peça.',
        'A linha de status abaixo do Play saiu. A curva de transição de BPM fica na linha de Time signature, Scale e Harmony, com compasso, BPM e as bolinhas do tempo logo abaixo; "X/32 active" fica abaixo do tabuleiro, à direita dos botões Activate white, Mute all e Reset positions.',
        'Mudar o nome do kit não reinicia mais a música.',
        'Em "This piece\'s arrangement", o checkbox "Piece present in this global section" saiu: agora a peça toca na seção quando "Piece MIDI variation" tem uma variação escolhida, e a nova opção vazia "— none (piece rests)" deixa a peça em pausa naquela seção. Kits salvos com o checkbox desmarcado passam a usar a opção vazia e continuam soando igual.',
        'Uma aba de variação pinada agora toca em todas as seções, inclusive nas que estão sem variação. Uma regra de States & Events que troca a variação continua respeitando as seções vazias.',
        'Na barra de Global Sections, o duplo clique numa seção não abre mais popup: abre, na linha logo abaixo, Label, Beats e Harmony lado a lado (com os rótulos em cima) e um botão de lixeira para excluir. As mudanças valem na hora, e o + já cria a seção e abre a edição dela. Com a edição aberta, um clique em outra seção passa a editar essa seção.',
        'As seções da barra de Global Sections não mostram mais o cursor de arrastar.',
      ] },
      { title: 'Piece Params', items: [
        'Os knobs agora ficam abaixo do sequenciador MIDI, sob o título "Piece params".',
        'Selecionar uma nota no sequenciador troca os knobs pelos da nota (Accent, Pan, Slide ST e Slide sec, no mesmo tamanho dos knobs da peça) e o título vira "Piece params / Note params". Clicar em "Piece params" desmarca a nota e devolve os knobs da peça.',
        'O botão de excluir nota foi para a linha de botões abaixo do sequenciador, como primeira opção, e só aparece com uma nota selecionada.',
        '"Restart MIDI when the global section starts" virou um botão com uma seta girando na linha de botões abaixo do sequenciador, na partida e no Criativo. Ligado, o ícone fica na cor normal; desligado, fica 50% mais apagado.',
        'O painel não mostra mais barras de rolagem; a rolagem continua funcionando.',
        'Os knobs Swing e Chance agora ficam logo depois de Reverb.',
        'Sem peça selecionada, o painel vira "Song & Instruments", com um ícone de nota musical no avatar. Abaixo do título fica a barra de Global Sections e, embaixo dela, a lista das peças (White e Black), parecida com o painel de vozes do Criativo.',
        'Na lista, a bolinha de ligar/desligar fica à esquerda de cada peça, clicar no nome seleciona a peça e passar o mouse desenha uma linha da bolinha até a peça no tabuleiro.',
        'Na campanha, a barra de Global Sections pode ser editada como no Criativo; na partida online, ela só marca a próxima seção, porque o arranjo é compartilhado pelos dois jogadores.',
        'Na barra de Global Sections da partida, o título saiu, a contagem de beats também, e o nome de cada seção aparece inteiro, quebrando a linha quando falta espaço. O botão + ganhou hover.',
        'A lista de peças ficou numa coluna só: primeiro as peças do seu time, depois as do adversário. Passar o mouse numa peça da lista toca a nota dela, como um clique na peça do tabuleiro.',
        'Com uma peça selecionada, o botão M virou a mesma bolinha de ligar/desligar da lista, no começo da linha de abas das variações, e o botão Solo deu lugar a um botão Voltar, que desmarca a peça e volta para a lista de instrumentos.',
        'O S de Solo voltou ao Piece Params, no fim da linha de abas das variações, e a bolinha de ligar/desligar ficou com o contorno visível quando a peça está desligada.',
        'Na lista de instrumentos, as peças ativas mostram uma faixa compacta do MIDI tocando; o botão "midi" com o olho, no canto do painel, liga ou desliga essas faixas.',
        'Clicar no nome de uma peça agora expande o MIDI completo dela na própria lista, com as abas e os botões. Duplo clique no nome, o novo link "Params" ou o duplo clique no tabuleiro que liga a peça abrem o Piece Params completo.',
        'Na lista de instrumentos, selecionar uma peça (na lista ou no tabuleiro) agora só pinta o fundo do bloco dela. O MIDI completo abre só com um clique no nome da peça ou na faixa compacta do MIDI, e um novo clique no nome recolhe.',
        'Abrir e fechar o MIDI na lista (fechado, compacto e completo) agora é animado: o bloco cresce e encolhe suavemente e o MIDI entra com fade-in.',
        'A lista de instrumentos não mostra mais Note params, nem com o MIDI completo aberto: eles ficam só no Piece Params completo.',
        'Corrigido: o cursor de reprodução voltou a andar no MIDI do Piece Params depois de abrir a peça pela lista.',
        'Note params reorganizado: Accent, Pan, Chance e Ratchet na primeira linha; Slide ST, Slide sec e o gráfico do slide na segunda. O gráfico perdeu a moldura e o fundo e agora aparece também nos knobs da peça, à direita de Slide sec.',
        '"Randomize notes" agora sorteia as notas em toda a altura visível do sequenciador. Antes elas se concentravam perto do meio e, depois de muitos cliques, subiam uma oitava.',
        'Na lista de instrumentos, passar o mouse numa peça faz a borda da bolinha de ligar/desligar piscar junto com a nota tocada.',
        'Abrir pelo nome uma peça desligada na lista agora também liga a peça.',
        'O MIDI completo na lista ganhou as mesmas margens laterais da faixa compacta.',
        'O gráfico do slide (Note params e Piece params) acompanha os knobs Slide ST e Slide sec enquanto você arrasta, sem esperar soltar o mouse; a música continua mudando só ao soltar.',
        'Na barra de Global Sections da partida, a seção marcada como próxima mostra "Next" embaixo do nome.',
        'A barra de Global Sections também aparece no Piece Params, acima das abas de variações da peça.',
        'O Piece Params pode ser encolhido verticalmente o quanto você quiser; o conteúdo continua rolando dentro do painel.',
        'Note params ganhou os knobs Ratchet (repete a nota 2, 3 ou 4 vezes dentro da duração dela) e Chance (probabilidade de a nota tocar).',
      ] },
      { title: 'Admin', items: [
        '"Linked stage" aparece só para admins. No Admin local, o novo botão "Save DB" grava o kit como kit oficial da fase vinculada; depois do deploy ele substitui o kit padrão dessa cidade para todos, nas partidas e no Criativo.',
      ] },
      { title: 'ChickenBots', items: [
        'O Easy ChickenBot voltou a usar Freeze e Shield: antes ele só reagia quando podia perder uma torre ou a dama inteira, o que quase nunca acontecia numa partida real. Agora ele também protege ou salva cavalos e bispos (ameaças de 3 peões ou mais), procura poderes em 60% dos turnos e espera 6 turnos entre um poder e outro. Continua sem simular o lance antes de pagar, como o Expert e o Jedi fazem.',
      ] },
      { title: 'Partida', items: [
        'Os golden eggs das casas destino de Best/Worst ficam centralizados na casa, atrás do score da seta, com uma borda preta fina no lugar do brilho colorido.',
        'Depois que as setas somem, os ovos ficam 3 segundos visíveis e então somem num fade de 3 segundos. Até sumirem por completo, qualquer peça que for para a casa ganha os ovos; depois disso, só o lance indicado pela seta.',
        'Ao ganhar ovos num lance, cada ovo dá um giro de 360° enquanto sobe acima da peça.',
        'Uma peça desligada volta a tocar quando é movida.',
      ] },
    ],
  },
  {
    version: '1.7.0',
    date: '23/10/2026',
    title: 'Estados e Eventos globais, ChickenBots com critério e knobs novos',
    groups: [
      { title: 'Estados e Eventos', items: [
        'Agora existe um conjunto global de regras de Estados e Eventos que vale para todos os kits. Cada kit pode personalizar qualquer estado ou evento com regras próprias; o que não for personalizado continua seguindo o global, inclusive edições futuras dele.',
        'O painel do Criativo foi redesenhado: as abas "This kit" e "Global" escolhem o que está sendo editado, cada linha mostra um resumo do efeito (por exemplo "Gain +6%") e um selo Kit ou Global, e o editor abre na própria linha. "Customize for this kit" copia as regras globais para o kit, "Use global" devolve o gatilho ao global e "Reset kit to global" limpa todas as personalizações do kit.',
        'Simular ficou separado de editar: o ponto à esquerda de cada linha liga/desliga o estado ou evento na simulação, e a faixa Simulate reúne o lado (White/Black), o botão Next ply, o BPM/escala resultantes e as influências em execução.',
        'Kits salvos antes desta versão mantêm só os gatilhos que tinham sido alterados; os que continuavam iguais ao padrão passam a seguir o global. As edições do global ficam salvas neste navegador, com "Restore official" para voltar ao conjunto oficial.',
        'Na aba Global, "Save to game" grava as regras direto no arquivo oficial do jogo quando o Criativo é aberto pelo Admin local com uma conta admin; depois do deploy elas valem para todos.',
        'Novos eventos do chickenchess: Freeze applied, Shield applied, Mulligan, Best/Worst moves shown e Best/Worst move played, na campanha e no online. No global, Freeze leva a escala um modo mais escuro, Shield um modo mais claro e Mulligan abaixa 1 semitom; ver ou jogar Best/Worst não muda nada por padrão.',
        'Nova influência "Scale change", que muda a escala em relação à atual: relativa, paralela, um modo mais claro ou mais escuro, tom vizinho (V ou IV), mediante cromática, subida de 1 semitom ou sorteio. O sorteio se repete igual para o mesmo momento da partida (Undo/Redo e os dois jogadores online ouvem o mesmo). A escala específica continua disponível como "Fixed scale".',
        '"Harmony plan" ganhou a opção "Random plan". As regras globais não usam mais escala nem plano harmônico fixos: o Final e a formação mínima sorteiam um plano, sem rainhas o modo escurece, o afogamento troca para a paralela e a promoção sobe a tonalidade em 1 semitom.',
        'A simulação ganhou "Previous ply" para voltar um meio-lance (ply = meio-lance, a jogada de um lado).',
        'No Criativo, BPM, Tônica, Escala e Harmonia mostram em dourado o valor que está tocando quando uma regra o altera; mexer no controle continua editando o valor-base do kit.',
      ] },
      { title: 'ChickenBots', items: [
        'Os ChickenBots não entregam mais a partida para ganhar golden eggs: o Worst move agora só é jogado quando perde pouco em relação ao melhor lance, mantém o bot em vantagem e o bot ainda precisa de ovos. Ele espera alguns turnos entre um Worst e outro e não faz isso quando tem um lance que ganha material.',
        'O Freeze dos ChickenBots agora sempre congela a peça adversária que faz uma das melhores jogadas, nunca uma casa vazia, e nunca a peça que o próprio bot ia capturar. Depois do Freeze, o bot joga o melhor lance já considerando o gelo.',
        'O bot não paga mais um Freeze ou Shield e joga um Worst move no mesmo turno.',
        'Os ChickenBots agora usam Freeze e Shield quando há um motivo no tabuleiro: parar um mate em 1, proteger uma peça atacada (por exemplo num garfo, protegendo uma peça e movendo a outra) ou congelar a peça adversária que ameaça ganhar material. Não gastam mais poderes em turnos fixos sem motivo.',
        'Expert e Jedi conferem cada poder antes de pagar, simulando o lance e a melhor resposta, e guardam 3 ovos de reserva para emergências.',
        'O Easy ChickenBot ficou mais fácil: procura poderes só em metade dos turnos, só reage a ameaças grandes (torre ou dama) e espera mais entre um poder e outro.',
      ] },
      { title: 'Partida', items: [
        'Freeze e Shield agora podem ser usados no máximo uma vez cada por turno, na campanha e no online.',
        'Ao mostrar Best ou Worst moves, as casas destino das setas mostram os golden eggs que valem ali. Eles ficam 3 segundos a mais que as setas e qualquer peça que for para aquela casa enquanto estiverem visíveis ganha esses ovos.',
        'Com poucos lances disponíveis, as listas de Best e Worst ficam menores: 3 de cada com 12 ou mais lances, 2 com 8 a 11 e 1 com menos de 8. Isso evita ganhar ovos quase sempre no fim da partida.',
        'Cada lado ganha no máximo 12 golden eggs por lances ranqueados numa partida.',
      ] },
      { title: 'Knobs', items: [
        'Todos os knobs das partidas e do Criativo ganharam um gesto duplo: arrastar o tracinho (ou a bolinha, nos knobs de range) leva o valor ao ponto do círculo mais próximo do mouse ou do dedo, com cursor de mão; arrastar a partir do fundo do círculo ajusta o valor aos poucos, conforme o arraste, com cursor de seta horizontal. Nos knobs de range, o lado esquerdo do círculo ajusta a bolinha de menor valor e o lado direito a de maior valor.',
        'Em Musical params (antigo Piece params) e no painel 03 / Parâmetros do Criativo, os knobs estão cerca de 15% maiores e o nome fica logo abaixo do círculo, acima das bolinhas L/S/N dos knobs de range.',
        'As bolinhas e o arco selecionado dos knobs de range agora ficam exatamente sobre a borda do círculo.',
        'Nesses knobs com nome embaixo, a parte de baixo do círculo, que a seleção nunca alcança, foi cortada em cerca de 5 px e o nome subiu junto; as linhas de knobs ficaram 3 px mais próximas.',
        'O knob Range passou a se chamar Octaves, em Musical params e no Criativo.',
        'Corrigido: em Musical params, um knob ajustado durante um Estado/Evento ativo (por exemplo, GAIN levado a 2) voltava a mostrar o valor já alterado pela regra (1.84) ao soltar, e o próximo arraste partia desse número. Agora o knob mostra e edita o valor-base da peça; a regra continua agindo por cima no áudio.',
      ] },
      { title: 'Musical params', items: [
        'A duração da variação ("Y compassos / Z tempos") passou para a linha de botões abaixo do sequenciador MIDI, alinhada à direita, sem o "Seção X".',
        'Os botões das variações ficam colados, formando uma única faixa; só os botões +/− no fim da linha têm espaço. O espaço entre essas abas e o sequenciador é o mesmo que entre o sequenciador e os botões abaixo dele.',
        'Na linha abaixo do sequenciador, "Y compassos / Z tempos" fica à esquerda e os botões à direita; os botões −/+ de duração formam um par colado, e Sortear notas mostra um único dado na face 5.',
        'Na partida, a aba da variação fixada pelo jogador volta a mostrar o ícone de alfinete em cima dela, como no Criativo.',
      ] },
      { title: 'Criativo', items: [
        'A página do Criativo está toda em inglês: textos, ajudas, avisos, Estados/Eventos, arranjo, escalas e status das vozes. Os nomes de kits e instrumentos continuam como foram salvos. Os status das vozes e os nomes dos Estados/Eventos também aparecem em inglês na partida.',
        'No painel 03 / Parameters, o "?" de ajuda de cada knob fica em cima do círculo.',
        'Os campos numéricos que ainda usavam as setinhas do navegador (duração da seção no Arranjo global, formação mínima, duração das regras e rampa de BPM) ganharam os botões redondos − e +.',
        'No arranjo global, o nome livre da seção virou o dropdown "Tipo de seção", com Intro, Verse, Pre-Chorus, Chorus, Post-Chorus, Hook, Bridge, Interlude, Turnaround, Solo, Drop, Break e Outro. Um mesmo tipo pode aparecer mais de uma vez; o seletor de seção da peça mostra a posição antes do tipo (por exemplo, "4. Chorus").',
        'Todos os kits de cidade e os estudos Manchester 1999, Düsseldorf original e Mouth Breather trocaram as letras A, B, C… por tipos que descrevem o papel de cada seção (por exemplo, Intro, Verse, Break, Drop em kits eletrônicos e Intro, Verse, Pre-Chorus, Chorus, Bridge em pop e rock).',
        'Kits salvos continuam funcionando: letras de kits de cidade recebem o tipo da seção correspondente, nomes como "Refrão" ou "Ponte" são reconhecidos, e outros nomes viram Verse.',
        'O Criativo ficou bem mais leve: o tabuleiro não fica mais se redesenhando sem parar quando nada acontece, e a lista de kits não reconstrói mais todos os kits de cidade a cada clique. O arraste de peças voltou a ficar fluido e não derruba mais os quadros por segundo.',
        'Clicar ou segurar uma peça no Criativo volta a tocar a nota dela, e as notas do arraste não falham mais quando a página está ocupada.',
        'Clique duplo numa peça do Criativo volta a ligar/desligar o loop dela, como na partida.',
        'As bolinhas dos knobs de range do Criativo agora têm a mesma cor verde dos tracinhos dos knobs simples.',
        'A barra fixa de mensagens no rodapé do Criativo saiu. Os avisos (kit salvo, carregado, exportado, erros) aparecem num popup branco no canto inferior direito, igual ao da partida, e ficam até você fechá-lo no X.',
        'O cabeçalho do Criativo ficou mais compacto: a ajuda "Creative Mode" e o número da versão (ainda abrindo as notas de versão) ficam na mesma linha do "CHICKENCHESS LAB".',
      ] },
      { title: 'Globo', items: [
        'Ao entrar numa cidade pelo globo, a câmera agora mergulha no pin até o círculo interno preencher a tela inteira, antes de abrir a fase.',
      ] },
      { title: 'Desempenho no celular', items: [
        'As peças deslizam pelo tabuleiro sem engasgar mesmo com a música tocando: a animação do lance não depende mais do processamento da página.',
        'Cada lance ficou bem mais leve: o tabuleiro não redesenha mais todas as peças a cada atualização, e as linhas de conexão dos widgets, que ficam ocultas no celular em pé, não são mais calculadas.',
        'Com a música tocando, Piece Params, o piano roll e o Mixer só se atualizam quando algo visível muda; o cursor do piano roll continua andando sem refazer o editor inteiro.',
        'No celular, a engine musical agenda as notas com mais antecedência e usa um buffer de áudio maior, para reduzir os "rasgos" no som quando o aparelho fica ocupado. As ativações de loop podem entrar até cerca de um décimo de segundo mais tarde que antes.',
        'No celular, o Spectrogram atualiza a 15 quadros por segundo, deixando mais folga para a música e os gestos.',
        'Na partida, a nota de segurar ou arrastar uma peça sai antes de o painel da peça se atualizar, então ela não se perde quando o aparelho está ocupado.',
        'No celular, as duas equipes passam a dividir um único reverb em vez de um para cada, o que corta cerca de um terço do processamento de áudio e reduz os cortes no som. A quantidade de reverb de cada peça não muda; a cauda do reverb agora acompanha os dois lados do crossfader por igual.',
      ] },
      { title: 'Debug', items: [
        'O Admin ganhou o catálogo Recompensas de ovos, para editar o teto de ovos, o tamanho das listas e o tempo extra dos ovos nas casas.',
        'O Bot Control ganhou os campos dos novos critérios: Poderes (N, P, Q), Freeze (Y, Z), Shield (T, R) e Worst (W, V, O, K).',
      ] },
    ],
  },
  {
    version: '1.6.7',
    date: '22/10/2026',
    title: 'Best/Worst e barra de Chance não travam mais',
    groups: [
      { title: 'Partida', items: [
        'Corrigido: as cartas e botões Best/Worst moves podiam ficar desativados até o fim da partida, mesmo com golden eggs, e a barra de Chance parava de se mexer. Acontecia quando um rei entrava na linha de uma peça com Shield ou congelada e, ao fim do poder, ficava em cheque fora da sua vez: o Stockfish não aceita essa posição. Agora ela é analisada pela busca com poderes, e se a análise falhar por outro motivo ela volta sozinha na jogada seguinte. Vale na campanha e no online.',
      ] },
    ],
  },
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
        'No globo, os títulos "PUBLIC ROOMS" e "GAMES IN PROGRESS" agora aparecem em caixa alta.',
        'O online baixa bem menos dados: editar peças numa partida e atualizar a lista de partidas em andamento no globo agora trazem só o que mudou, em vez de tudo de novo. Uma aba de partida esquecida aberta também deixa de baixar a partida a cada reconexão, e cada ajuste de peça chega ao outro jogador só com o parâmetro alterado. A lista de salas públicas do globo se atualiza sala a sala, sem recarregar a lista inteira.',
        'Quando o servidor online está fora do ar ou bloqueado, o globo esconde "Public rooms", "Games in progress" e "Create lobby" (também nos popups das cidades), deixando só o modo campanha; tudo volta sozinho quando o servidor responde de novo.',
      ] },
      { title: 'Globo', items: [
        'Na lista de cidades das campanhas, o nome do estilo musical que aparece no hover e a bandeirinha de cidade conquistada não recebem mais o mouse nem o toque: passar por cima deles não ativa a cidade e não atrapalha arrastar o globo por trás.',
        'As bandeiras das cidades conquistadas no globo balançam de forma mais natural: cada uma tem seu próprio vento, com rajadas irregulares, o mastro se inclina e volta como uma mola, e o tecido ondula do mastro para a ponta, ficando mais solto e caído quando o vento diminui.',
      ] },
      { title: 'Partida', items: [
        'Na campanha e no online, o contador de golden eggs do adversário passou para o lado esquerdo, acima do tabuleiro, com a mesma largura e o mesmo espaçamento do contador do jogador; as peças capturadas pelo adversário ficam à direita, alinhadas pela direita.',
        'O status "Your move" fica centralizado logo abaixo da linha de peças capturadas; no turno do adversário, a mensagem aparece centralizada acima do tabuleiro, sobre a linha de capturas de cima.',
        'No tablet/desktop, o resize do tabuleiro permite crescer mais: até as cartas de super-poderes ficarem cerca de 33% visíveis.',
      ] },
      { title: 'Debug', items: [
        'No widget Debug, os botões passaram a se chamar Piece, Stockfish, Bot e Eggs.',
        'Novo botão Moves no Debug: por 2 golden eggs, mostra no tabuleiro as 10 melhores jogadas da posição, em vez das 3 do Best moves.',
        'Novo botão Code no Debug, ligado por padrão, para mostrar ou esconder o código no fundo da partida.',
        'O botão Force win do Debug só aparece para usuários admin.',
        'No Bot Control, o símbolo % dos campos de percentual fica antes do número, dentro do campo.',
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
