export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.14.0',
    date: '18/11/2026',
    title: 'Tambores e pentes das armas: na mira e em volta da galinha',
    groups: [
      { title: 'Pátio: tambores e pentes', items: [
        'Cada arma mostra as balas que ainda tem num HUD pequeno ao lado da mira, com um desenho por arma: tambor de revólver na Pistola, tambor de cartuchos na Escopeta, anel em trios na Submetralhadora, arcos dos lados no Rifle, uma fileira em arco na Sniper, os flancos no Lança-foguetes e um leque de flechas embaixo da mira no Arco. As balas vazias ficam só no contorno.',
        'A cada tiro a bala do HUD pula para fora e cai; na Pistola e na Escopeta o tambor gira uma câmara. No Arco, as flechas saem da direita para a esquerda, a próxima recua enquanto você carrega e sobe um pouco ao soltar. Na recarga as balas vão acendendo.',
        'Em volta da galinha, o pente aparece como um anel de balas (na Escopeta, um tambor de metal) quando você pega a arma, aperta Próxima variação (Q) ou recarrega, e some no mesmo tempo das escalas. Atirando logo em seguida dá para ver o anel girar e a bala cair.',
        'No painel Câmera de Mira, “Tambores e pentes” tem os checkboxes “Em volta” e “Na mira”, os dois ligados por padrão, salvos só para você.',
        'A Granada agora tem pente infinito: não acaba nem recarrega, só respeita a cadência. O Pandeiro continua com o pente dele.',
      ] },
    ],
  },
  {
    version: '2.13.0',
    date: '17/11/2026',
    title: 'Zonas com gravidade dos planetas, câmera lenta e raio-x; zonas sonoras: cada ritmo com o balanço dele (o samba deixa de ser grade rígida), instrumentos gravados por ritmo, variações de cada ritmo, notas da batida arrastáveis no tempo e até 10 blocos de variação por zona, com Volume e BPM em knobs; modo editor: Shift trava o arraste na horizontal ou na vertical, o elemento acompanha o ponteiro em qualquer zoom e o zoom funciona com o mouse em cima de um elemento; galinha: Chocar agarrada na parede e no teto, e asas batendo na carga do shocking jump no ar; Grade de blocos: a colisão dos Cantos em octógono segue o contorno desenhado e a Bomba é um feixe de dinamite com timer, e cada bloco é também uma Zona sonora com ritmos sorteados; o Templo do Gongo montado com elementos do Modo editor (Prédio, Mureta com cerca, Gongo do Templo); suportes de item com Limite de reposição; a roda do mouse arrastável para qualquer ação nos Controles; o X do gamepad abre Baús e senta nos instrumentos fixos; e binds próprias da Harpa e da Bateria no painel Controles, com o sustenido no L3; com as três gaiolas ocupadas, uma gaiola do chão só é trocada com um aperto inteiro de Pegar em cima dela; Configurações do Pátio ganham a categoria Mata (Mata ao longe e Mata perto); o Passaguá fica sempre na primeira casa dos utilitários; contador de almas das gaiolas só em texto branco; sem menu do navegador no botão direito dos botões; e chãos novos Lua e Marte no Modo editor; na partida, aviso ao tentar um lance que deixaria o próprio rei sob ataque; guia de pássaros reais: 30 aves com cantos gravados, a ave que inspira cada alma, receita na ficha e canto real das almas soltas',
    groups: [
      { title: 'Pátio: Próxima variação', items: [
        'Ação nova “Próxima variação” no painel Controles, na tecla Q (Próxima arma fica sem tecla no teclado e continua no RB). Com um instrumento na mão ela passa para a próxima escala, voltando à primeira depois da última.',
        'Próximo item, Item anterior e a rodinha do mouse agora vão direto para o próximo item, sem passar pelas escalas. Para voltar ao jeito antigo, marque “Incluir variações” na frente da ação no painel Controles. Próximo instrumento ganhou “Incluir escalas” (passa pelas escalas do instrumento da mão antes do próximo), e Próxima arma e Próximo utilitário ganharam “Incluir tambores” e “Incluir tipos”, que ainda não mudam nada.',
      ] },
      { title: 'Partida', items: [
        'Na campanha e no online, tentar um lance que deixaria o próprio rei sob ataque (mover uma peça cravada, levar o rei para uma casa atacada ou não sair do cheque) mostra por 3 segundos o aviso “Você não pode deixar seu rei sob ataque.”, com a peça tremendo e o som de bloqueio. Antes, o lance era só ignorado.',
      ] },
      { title: 'Zonas sonoras: ritmos', items: [
        'Cada ritmo das Zonas sonoras ganhou o balanço próprio, nota por nota. No Samba, a 2ª semicolcheia de cada tempo atrasa e a 3ª e a 4ª adiantam (a 120 bpm: +12 ms, −20 ms e −20 ms), como medido no tamborim; a Bossa nova usa metade disso. O Swing passa a tocar em tercinas, Funk, Boom bap, House e Reggae balançam as semicolcheias, e Rock, Reto e Meio tempo tocam a caixa um pouco atrás do tempo. O balanço do Baião é uma estimativa, sem medição publicada. O baixo e a grade das notas dos instrumentos acompanham o balanço do ritmo.',
        'Cada ritmo toca com instrumentos gravados: surdo, tamborim, pandeiro, agogôs e ganzá no Samba; zabumba, triângulo e pandeiro no Baião; aro e ganzá na Bossa nova; condução e chimbal no pé no Swing; bateria acústica, congas, cowbell e pandeirola nos demais. House, Techno, Trap e Reggaeton continuam com as baterias eletrônicas sintetizadas do jogo. Enquanto as gravações carregam, a batida toca com o som de antes.',
        'Campo novo “Variação”: cada ritmo tem o padrão de base e de 3 a 6 variações (no Samba: Partido alto, Batucada, Teleco-teco invertido, Pandeiro, Agogô e Breque).',
        'Na grade da batida, cada linha mostra o instrumento do ritmo e as notas podem ser arrastadas para os lados, para qualquer ponto do compasso, com a distância em milissegundos aparecendo durante o arraste. Clicar numa casa vazia cria a nota já no balanço do ritmo; clicar numa nota passa por normal, acento e apaga. Com a nota em foco, as setas ajustam fino.',
        'Seção nova “Blocos”: a zona pode ter até 10 blocos, cada um com harmonia, ritmo e baixo próprios, tocados em ordem. O botão + cria um bloco como cópia do atual na próxima variação do ritmo. Com mais de um bloco aparecem os knobs Tempos (quantos tempos do bloco tocam) e Repete (quantas vezes antes de passar ao próximo), e o botão Solo, que toca só o bloco em edição enquanto o painel está aberto.',
        'O painel ficou mais enxuto: Volume da batida e BPM (o antigo Andamento) viraram knobs na mesma linha de Batida e Balanço, e o Volume do baixo virou knob ao lado de Som e Oitava. Arraste o knob para os lados ou para cima e para baixo; duplo clique volta ao valor inicial.',
        'O painel da Zona sonora ficou ainda mais enxuto: Nome, Predefinição, Tom, Escala, Acordes de, Progressão, Batida, Balanço e Cor perderam o rótulo, que continua na dica de cada campo. O Nome vazio mostra “Nome” apagado, e a grade da batida fica sempre aberta, sem o “Editar a batida”.',
      ] },
      { title: 'Zonas: gravidade, câmera lenta e raio-x', items: [
        'A Zona sonora agora se chama só Zona, porque passa a mudar mais do que a música: o elemento do Modo editor, o botão Zonas da paleta e o grupo Zonas da Grade de blocos.',
        'Cada zona (do mapa e da cena) ganhou o grupo Corpos e duas tags. Gravidade: Terra (100%), Lua, Marte, Júpiter, Saturno, Urano, Netuno, Sol, Mercúrio e Vênus, cada um com a porcentagem da gravidade da Terra; a tag passa de um para o outro a cada clique. Dentro da zona a galinha, os pintinhos, flechas, granadas, itens arremessados e caindo, mortos-vivos e o cocô dos pássaros caem com essa gravidade, e o pulo vai mais alto na Lua e quase não sai do chão no Sol.',
        'Tempo: câmera lenta dentro da zona, de 10% a 200% (a tag passa por 100%, 50%, 25% e 10%). A galinha, os pintinhos, os tiros, os itens, os golpes e os inimigos ali dentro andam e contam os seus tempos mais devagar, mantendo o arco de cada pulo e de cada flecha; a música continua no andamento normal.',
        'Raio-x: com ele ligado, todo boneco dentro da zona aparece em raio-x, como quem leva choque, mas sem tremer: aliens, zumbis e bonecos de treino escuros com o esqueleto, e as galinhas escuras e azuladas com pernas de osso, costelas, coluna, asa, pescoço e crânio.',
      ] },
      { title: 'Pátio: Grade de blocos', items: [
        'Com Cantos em octógono e vão, o boneco não fica mais parado no ar ao lado do canto cortado de um bloco fechado. O que o corte abre é espaço livre, como no desenho: dá para descer no vale entre dois blocos lado a lado e subir a rampa até onde dois blocos empilhados se encontram.',
        'A Bomba virou um feixe de dinamite com timer e fios, no item e dentro do bloco. Armada, o timer fica aceso com o tempo do detonador e mostra a contagem depois do Detonar; desarmada, fica cinza, com o timer apagado e um fio cortado.',
        'Cada bloco da grade agora também é uma Zona sonora, com o tom, a escala, o andamento e o baixo da cena onde está. No painel Grade de blocos, o grupo novo “Zonas sonoras” traz: Blocos são zonas sonoras (ligado por padrão), Blocos com ritmo (a parte dos blocos que toca um ritmo sorteado, 3% por padrão; 0% deixa todos em silêncio e 100% dá ritmo a todos), Ritmos do sorteio (lista com marca nos ritmos que entram no sorteio: Todos marca e desmarca todos, e desmarcar um ritmo desmarca Todos) e Sortear, que o criador, o padrinho e o admin usam para sortear de novo. Com a camada Zonas ligada, os blocos com ritmo aparecem com o nome do ritmo.',
        'Os números dos blocos abertos ganharam um contorno escuro e aparecem em qualquer céu, inclusive o “1” azul num céu de dia. Botão novo “Mostrar números” no painel Grade de blocos, só neste navegador: conta de novo as bombas em volta de cada bloco aberto e mostra os números na frente de tudo (casas, elementos e véus), dos dois lados; apertar de novo volta ao normal.',
        'Na dúvida, encher a barra de música agora tira a interrogação e deixa o bloco sem nada marcado, de volta ao cinza, em vez de hastear a bandeira de novo. As notas que sobram da rajada não contam por 1,5 s; depois, a bandeira sobe do cinza como sempre.',
      ] },
      { title: 'Pátio: Templo do Gongo montado com elementos', items: [
        'O Templo do Gongo deixou de ser um desenho fixo: os salões, a mureta, as árvores, o gongo, a jukebox, a pedra Recomeçar e os suportes de armas viraram elementos do Modo editor, que dá para mover, redimensionar, editar, duplicar e apagar. Os Pátios salvos com o Templo ganham esses elementos no lugar exato do desenho antigo, e o jogo do Templo continua igual.',
        'Elemento novo “Prédio” (grupo Templo da paleta: salão e pavilhão), redimensionável como a Casa. No Editar: Telhado (Beirais curvos ou Pirâmide), Andares (1 ou 2), Colunas, Portas de treliça acesas (as outras aberturas viram janelas), Lanternas, Cumeeira com dragões ou ponta dourada, Placa e Na névoa (desbotado ao fundo, sem pisos). Os telhados e os beirais são pisos de mão única, com o friso dourado.',
        'Elemento novo “Mureta com cerca” (Plataformas): a balaustrada branca sobre o muro vermelho. O fundo acompanha o tamanho da caixa e o piso flutuante fica no topo do muro, logo abaixo da cerca, como o terraço do Templo. “Piso de pedra” desenha o pátio de pedra embaixo dele.',
        'O Gongo ganhou a opção “Gongo do Templo”: bater nele joga o Templo (a campanha dos aliens ou a música escolhida na jukebox) numa cena em volta dele, com o gongo no mesmo lugar em que o Templo o tinha. Sem um Gongo do Templo no Pátio, não há campanha. A “Pedra Recomeçar” também virou elemento (grupo Música).',
        'Em Configurações do Pátio, “Templo e Vila” virou “Fundo da Vila”: liga e desliga só os terraços e a placa ao fundo da Vila dos Telhados.',
      ] },
      { title: 'Modo editor', items: [
        'Dois chãos novos na paleta, em “Chãos e paredes”: Lua (poeira cinza com crateras e borda clara) e Marte (terra vermelha com dunas, pedras e uma cratera). Funcionam como os outros chãos: contorno editável, Objeto duro e troca de bioma no Editar.',
        'Segurar Shift enquanto arrasta um elemento mantém o movimento reto: só na horizontal ou só na vertical, conforme a direção em que o ponteiro andou mais. Apertar ou soltar o Shift no meio do arraste já vale, sem precisar mexer o mouse.',
        'Com zoom diferente de 100%, o elemento arrastado ou redimensionado fica embaixo do ponteiro. Antes ele andava mais rápido que o mouse com zoom-in e mais devagar com zoom-out. Dar zoom no meio do arraste também mantém o elemento no ponteiro.',
        'O zoom (segurando a tecla da câmera e rolando) e o panorama da câmera passam a funcionar com o mouse em cima de um elemento do editor, selecionado ou não. Antes a área de clique do elemento bloqueava a câmera.',
      ] },
      { title: 'Pátio: mira com teclado e mouse', items: [
        'Voltou a devolução da mira ao teclado: com teclado e mouse no mesmo player, depois de 5 segundos com o mouse parado as teclas de movimento voltam a mirar nas 8 direções; mexer o mouse pega a mira de volta. O tempo fica em Câmera de Mira → “Mouse parado devolve a mira ao teclado”; 0 deixa a mira sempre com o mouse, como estava.',
      ] },
      { title: 'Galinha: Chocar agarrada e shocking jump', items: [
        'Chocar agora funciona também agarrada, na parede e pendurada no teto: o corpo baixa sobre a superfície com as pernas dobradas, no ângulo do grab, os olhos fecham e ela anda devagar, na mesma proporção do Chocar andando no chão, sem acelerar com o Correr. Soltar Chocar volta à pose de agarrar.',
        'Com isso, Chocar deixou de servir para descer a parede: quem desce é Agachar (S, analógico ou seta para baixo), como antes.',
        'Ajuste novo em Ajustes → Combinações: “Shocking jump no ar: batidas de asa na carga”. Enquanto Chocar + Pulo carregam o salto no ar, as asas batem nesse ritmo: 4 por segundo na galinha e 8 nos pintinhos, de 0 (desligado, asas recolhidas) a 15.',
        'Trocar de lado numa caixa flutuante agora tem dois gestos. Chocar + Pulo troca só de face, na mesma linha: em pé no topo ela fica pendurada por dentro da caixa, debaixo do topo; pendurada, fica de pé na mesma linha; e agarrada na lateral (sem esquerda/direita) passa de fora para dentro da caixa ou de dentro para fora. Antes, na lateral, Chocar + Pulo era o pulo na parede.',
        'Para ir ao lado oposto da caixa inteira: em pé no topo, Chocar + Pulo + Agachar (para baixo) pendura embaixo da caixa; pendurada embaixo dela, Chocar + Pulo + Cima põe de pé no topo; na lateral, continua sendo o Pulo na direção da parede. Para descer por dentro de uma caixa fica o Agachar + Pulo sem direção.',
        'Agarrada na lateral de uma caixa ou parede, Chocar + Pulo apontando para fora da parede agora é um shocking jump de verdade: ela prepara na parede enquanto o Pulo está segurado e, ao soltar, salta na direção apontada com o impulso do pulo chocando. Soltar Chocar antes cancela. Antes saía o pulo normal da parede.',
      ] },
      { title: 'Modo editor: suportes de item', items: [
        'Configuração nova “Limite de reposição” no Editar do suporte: quantas vezes ele repõe o item depois do primeiro. No fim da barra fica ∞, o padrão; com 0 o suporte só dá o primeiro item e depois fica vazio.',
        '“Tempo de reposição” virou slider, em passos de 0 a 5 minutos, mais finos no começo (0,1 s, 0,25 s, 0,5 s...).',
      ] },
      { title: 'Controles: roda do mouse', items: [
        'Na coluna Mouse do painel Controles, “Roda ↑” e “Roda ↓” podem ser arrastadas para qualquer outra ação: Pular, Pegar, trocar de grupo de item e até Atirar e Golpe de perto, onde a roda fica como segundo atalho, ao lado do botão do mouse. Cada dente da roda é um aperto da ação. O padrão continua sendo Próximo item e Item anterior.',
      ] },
      { title: 'Pátio: X do gamepad', items: [
        'Com o gamepad, o X (Usar e Correr) agora abre os Baús e senta nos instrumentos fixos (Harpa, Bateria), e sentada o X levanta. O mesmo vale para o Shift no teclado e para o botão Correr do toque, quando ele também pega.',
      ] },
      { title: 'Controles: binds dos instrumentos', items: [
        'O sustenido da Harpa passou para o L3 no gamepad (antes era o Correr, no X). No teclado continua no Shift.',
        'O painel Controles ganhou o grupo Instrumentos, com uma lista para cada instrumento, aberta pela seta. Na Harpa, o Sustenido tem binds próprias, que podem repetir teclas e botões da movimentação sem tirá-los de lá. Na Bateria, cada peça mostra os seus atalhos (os mesmos do editor do kit em Escalas), que podem ser trocados ali: uma tecla ou botão de andar vira a direção de andar.',
        'Sentada num instrumento fixo, uma tecla que também é bind dele (Shift na Harpa, um atalho de peça na Bateria) toca e não levanta. Soltar alma e Trocar de gaiola não valem enquanto ela está sentada.',
      ] },
      { title: 'Pátio: Gaiolas', items: [
        'Pegar gaiolas ficou como pegar os outros itens. Passar por cima de uma gaiola segurando Pegar (ou correndo, quando o Correr também pega) só a pega sozinho se ainda há lugar entre as suas três.',
        'Com as três ocupadas, a gaiola do chão ou do cavalete mostra “trocar” e passar por cima não faz nada. A troca pela gaiola da frente só acontece com um aperto inteiro de Pegar em cima dela: apertar e soltar enquanto ela está destacada. Antes, passar correndo já trocava, e a troca saía assim que o botão era apertado.',
        'O aviso “trocar” sobre um item no chão agora fica cinza, como o “equipar”; “pegar” continua azul.',
        'O contador de almas embaixo das gaiolas penduradas ficou só com o número em branco, sem fundo e sem borda.',
      ] },
      { title: 'Pátio: Mata do fundo', items: [
        'Configurações do Pátio ganham a categoria Mata, com Mata ao longe e Mata perto separadas: mostrar ou esconder cada fileira, Sortear forma, Densidade, Tamanho, Pinheiros (quantos pinheiros entre as copas redondas) e Cor. Padrão volta às fileiras de sempre.',
        'Em Céu e luz, a caixa “Mata ao longe” passou a se chamar “Mata”, porque esconde as duas fileiras de uma vez.',
      ] },
      { title: 'Pátio: Passaguá', items: [
        'Ao pegar o Passaguá, ele vai sempre para a primeira casa dos utilitários no inventário, e os utilitários pegos depois entram atrás dele. Só sai dali se você arrastá-lo para outra casa.',
      ] },
      { title: 'Interface', items: [
        'O botão direito (ou o toque longo) nos botões dos portais, do cabeçalho e dos painéis não abre mais o menu do navegador, em todas as telas. Campos de texto e links continuam com o menu.',
      ] },
      { title: 'Pátio: Guia de pássaros e almas', items: [
        'O Pátio ganhou o Guia de pássaros (botão da pena, ao lado da Biblioteca de almas): 30 aves reais do Brasil, cada uma com nome popular, nome científico, família, tamanho, onde vive e uma curiosidade, desenhada em pixel art nas cores da ave.',
        'Clicar numa ave do guia toca um canto real dela. Cada ave tem até quatro gravações (cantos e um chamado), e cada clique no desenho toca a próxima; a lista “Cantos reais” mostra quem gravou cada uma, com link para a gravação original.',
        'Cada alma da Biblioteca passou a ter uma ave real que a inspira. A ficha da alma mostra a linha “Inspiration” com o nome científico e o popular; clicar nela abre o Guia de pássaros já naquela ave.',
        'Na ficha da ave, embaixo, aparecem as almas inspiradas nela, com as miniaturas: as que ainda não foram capturadas ficam escurecidas, como na Biblioteca, e clicar numa capturada abre a Biblioteca de almas nela.',
        'A ficha da alma ganhou a “Receita”: uma frase que diz como conseguir uma alma igual (qual alien, se pela música ou morto por qual arma, com qual família de instrumento e, nas raras, em qual nota).',
        'Clicar numa alma na Biblioteca toca o som dela: três notas na voz da ave que a inspira (acorde menor para as mortas). Clicar no desenho da alma aberta toca de novo.',
        'As almas soltas cantam de vez em quando o canto real da sua ave, entre uma ação e outra, com uma nota ♪ em cima delas. O canto fica mais baixo quanto mais longe do meio da tela e segue o volume “Efeitos do cenário”. As notas que elas tocam nas harmonias continuam sintetizadas, agora na voz da ave que inspira a alma.',
        'Para o admin, no editor de fichas: a aba Ficha tem o campo Inspiration (troca a ave da alma) e a aba Ações tem “Canto real”, a chance de a alma cantar a gravação a cada volta do intervalo (15% por padrão; 0 desliga).',
        'O About ganhou a aba Credits, com os créditos do Strudel e de cada gravação de canto (ave, quem gravou, número no xeno-canto e licença). As gravações vêm do acervo público xeno-canto.org, em uso não comercial.',
      ] },
    ],
  },
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
]

export const CHANGELOG = [...RECENT, ...CHANGELOG_ARCHIVE]
