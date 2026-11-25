export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.18.0',
    date: '25/11/2026',
    title: 'Ajustes do jogo salvos no servidor e por Pátio, com Lock; agarrar a parede ao apertar Cima; música da Zona com botão de ligar, fundo mais sutil e dinâmico e estilos lo-fi; notas giratórias no Hangdrum; Catálogo único de aliens, almas e pássaros',
    groups: [
      { title: 'Pátio: ajustes do jogo no servidor', items: [
        'O Salvar no game de Câmera de Mira, Ajustes, Volume, Camadas, Configurações do Pátio, Grade de blocos, Itens, Controles, Escalas e Biblioteca de almas agora grava no servidor, como o Personagem já fazia: vale na hora para todo mundo, de qualquer endereço, sem precisar publicar o jogo.',
        'Novo botão Versões (só admin), ao lado do Salvar no game de cada painel e do Personagem: lista as 50 últimas versões salvas e traz uma delas de volta, mostrando antes o que muda.',
      ] },
      { title: 'Pátio: ajustes de cada Pátio', items: [
        'Novo botão Salvar no Pátio, à esquerda do Salvar no game, na Câmera de Mira, Volume, Camadas, Itens, Escalas e Personagem: guarda no Pátio aberto só os valores diferentes do padrão do jogo. Só funciona para quem pode editar o Pátio; o resto continua seguindo o padrão do jogo, mesmo quando ele muda.',
        'Na Grade de blocos e nas Camadas, o Pátio também passa a guardar só o que difere do padrão: o resto acompanha o padrão do jogo da próxima vez que o Pátio abrir.',
        'Cada valor diferente do padrão do jogo fica amarelo e ganha na frente uma setinha girando, que volta só aquele valor ao padrão. O Reverter para o padrão continua voltando o painel inteiro.',
        'O que cada pessoa muda sem salvar fica só no navegador dela e só nos valores que ela mexeu. O volume Master continua sendo de cada um.',
        'Lock, em Configurações do Pátio: travado, quem não pode editar o Pátio joga com os valores dele e não muda nada em Personagem, Itens, Escalas, Câmera de Mira, Camadas e volumes das camadas.',
      ] },
      { title: 'Pátio: música da Zona', items: [
        'O primeiro controle do painel da Zona e da Zona da cena é agora um botão com uma nota musical, à esquerda do nome: aceso, a zona toca o som de fundo dela (batida, baixo e drone); apagado, fica em silêncio. Vem desligado, inclusive nas zonas que já existiam: para ouvir a zona é preciso ligar.',
        'Com a música desligada continuam valendo o tom, a escala e o andamento para os instrumentos, além de gravidade, tempo, raio-x e tags. Desligar corta o som na hora, com um efeitinho rápido de disco parando na vitrola. Ligar entra na próxima barra, com a batida chegando aos poucos.',
        'Na Grade de blocos, os blocos com ritmo sorteado continuam tocando o ritmo deles mesmo com a zona da cena desligada.',
      ] },
      { title: 'Pátio: lo-fi nas zonas', items: [
        'Novo grupo Lo-fi no Estilo da Zona, com quatro faixas próprias do jogo: Lo-fi, Café, Chuva e Madrugada, devagar, com acordes com sétima.',
        'Três batidas novas no grupo Lo-fi da Batida (Lo-fi, Café e Chuva), tocadas por um kit de bateria mais grave e abafado, como um disco gasto, com a caixa arrastada atrás do tempo.',
        'O Som do Baixo ganhou o grupo Teclado: um piano elétrico macio que toca o acorde do compasso aberto (Teclado lo-fi, Teclado sustentado e Teclado e baixo), além do Baixo lo-fi.',
      ] },
      { title: 'Pátio: fundo das zonas mais sutil e dinâmico', items: [
        'Batida, baixo e drone das zonas soam mais baixos e mais atrás das notas de quem joga, com chimbal e chocalho mais leves que bumbo e caixa.',
        'Cada nota da batida tem peso próprio: os acentos variam, as notas fracas ficam mais escuras e entram mais macias.',
        'Quando o fundo começa, as camadas entram uma por compasso: primeiro os graves, depois chimbal e chocalho, depois caixa, palmas e o resto.',
        'As frases respiram: começam mais leves e enchem até o fim, o sexto compasso de cada oito fica mais vazio, e no fim das frases de 4, 8 e 16 compassos entra uma pequena virada. Com a variação Base, os compassos 9 a 12 de cada 16 passam por uma variação do próprio ritmo. Uma batida desenhada na grade continua com todas as notas.',
      ] },
      { title: 'Movimento: agarrar parede', items: [
        'Encostada numa parede, apertar Cima agora a agarra na hora, no chão ou no ar, mesmo segurando junto uma direção, Pular, Correr, Agachar ou Chocar. Antes, no ar, Cima só agarrava sozinho. Vale também logo depois de soltar a mesma parede.',
      ] },
      { title: 'Pátio: dropdowns dos painéis', items: [
        'O botão de próximo item ao lado dos dropdowns ficou grudado no dropdown, sem espaço entre os dois, e a seta dele agora aponta para baixo.',
      ] },
      { title: 'Pátio: visitas e anônimos', items: [
        'O painel Salvar do Pátio mostra, abaixo das pessoas, quantas visitas o Pátio já teve e quantos players anônimos (sem conta) já entraram nele. Nada da pessoa é guardado: são só os dois números.',
        'Cada entrada conta uma visita, com ou sem conta; voltar ao mesmo Pátio em menos de 30 minutos (ou recarregar a página) não conta de novo. Cada navegador sem conta conta como anônimo uma vez por Pátio.',
      ] },
      { title: 'Pátio: aviso de Pátio alheio', items: [
        'O aviso que aparece ao tentar editar um Pátio que não é seu agora fica no centro da tela, com o texto “Este Pátio não é seu. Crie um Pátio novo para poder editar, ou receba a permissão do dono deste pátio.” e os botões “Criar um Pátio novo” e “Fechar”.',
      ] },
      { title: 'Pátio: notas giratórias no Hangdrum', items: [
        'No Hangdrum, a nota tocada numa bola viaja até ela e fica girando dentro do círculo, acompanhando a galinha, uma volta por tempo da música. A nota do ding (a bola grande do meio) gira em volta da própria galinha. Tocando entre as bolas, a batida continua indo reta.',
        'As notas girando acertam como as notas comuns e somem ao acertar. Trocar de arma ou de instrumento não para o giro: dá para espalhar notas em volta e trocar de item.',
        'Itens → Hangdrum: Giro na bola (Desligado, 1 a 60 s, Duração da nota ou ∞; padrão Duração da nota), Nota é disparada até a região da nota (desligado, a nota já nasce na bola) e Cada nota interrompe a anterior: tocar uma bola corta a nota que ainda soava nela e a que girava ali, enquanto bolas diferentes soam juntas. Também vale em outros instrumentos com a escala Hangdrum ligada.',
        'Online, os outros jogadores veem as notas girando em volta da sua galinha.',
      ] },
      { title: 'Aviso de versão nova', items: [
        'O aviso de versão nova agora aparece a cada deploy, mesmo quando o número da versão é o mesmo do dia, inclusive no site instalado como app. O texto ficou em português: “Há uma versão nova!” com o link Atualizar.',
      ] },
      { title: 'Pátio: Catálogo e botão de Itens', items: [
        'Catálogo de aliens, Biblioteca de almas e Guia de pássaros viraram um só painel, o Catálogo, aberto por um único botão com ícone de livro. As abas Aliens, Almas e Pássaros ficam no título, cada uma com o seu ícone, e o painel sempre abre em Aliens.',
        'Os desenhos dos aliens no Catálogo agora aparecem assim que o painel abre; antes, cada cartão só aparecia depois de passar o ponteiro por cima.',
        'O botão de Itens (armas e instrumentos) mostra o contorno do item que a galinha segura, como o botão do Personagem mostra o boneco, e passou para a esquerda do Personagem. De asas vazias, continua o ícone das espadas.',
        'O painel Players agora abre pelo botão Local/Lobby do cabeçalho, que mostra entre parênteses quantos players há no lobby, como “Lobby (3)”. As setas de lobby anterior e próximo viraram dois botões separados, um de cada lado. Saiu o botão com o ícone de pessoas.',
        'Histórico do chat: sem fundo cinza, só com as últimas 10 mensagens. Cada mensagem some 5 segundos depois de chegar e todas voltam ao passar o mouse por cima (ou com o campo de escrever aberto). O histórico não atrapalha mais a mira: o mouse passa direto para o jogo, menos numa pequena alça à esquerda da última mensagem, que arrasta o chat para outro lugar da tela (a posição fica guardada).',
      ] },
    ],
  },
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
]

export const CHANGELOG = [...RECENT, ...CHANGELOG_ARCHIVE]
