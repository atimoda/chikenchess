export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.19.0',
    date: '26/11/2026',
    title: 'Invite a friend nas partidas: chame um amigo, copie o link ou compartilhe nos apps; ano e cidade, tom, escala e harmonia com o tamanho e o hover do botão do globo; widgets redimensionam pela borda de cima e pelo canto superior direito; notas giratórias em qualquer instrumento com a escala Hangdrum; prévia do tabuleiro ao passar o mouse no histórico de jogadas; Mesa de chickenchess no Pátio: entre na fila nos banquinhos, jogue contra um bot ou um amigo sobre o Pátio e ganhe uma Chave de ouro, que abre o novo Ativador de grid trancado, com contagem 3, 2, 1 e opções da grade por Chocar; Harpa de Lira toca o arpejo arrastando a mira, com as notas flutuando em volta e saindo junto da nota principal; prévia do Golpe desenhado fiel ao desenho; Correr guarda o item do chão no inventário',
    groups: [
      { title: 'Pátio: Mesa de chickenchess', items: [
        'Nova Mesa de chickenchess no Modo editor (grupo Jogos): uma mesinha com tabuleiro e dois banquinhos. Já está no meio da Arena das Almas, no Arquipélago das Almas.',
        'Em pé num banquinho aparece “E - Entrar na fila” e o seu nome sobe acima dele. Com alguém no outro banquinho, a partida começa. Pronto num banquinho, vá para o outro e aparece “Iniciar contra um bot”; durante a partida contra o bot, quem pisa no banquinho dele vê “Entrar no lugar do bot”.',
        'A partida começa com 3, 2, 1 enormes no meio da tela e o tabuleiro se monta como na campanha, com os mesmos widgets, cartas e poderes, transparente sobre o Pátio. Tom, escala e harmonia ficam centralizados acima do tabuleiro. Entre dois players, cada um move na sua vez.',
        'Embaixo do tampo ficam as opções em etiquetas: suba na mesa e caia com Chocar na metade esquerda para trocar o ano/cidade (com Random não há foto; com uma cidade, a foto aparece acima da mesa) e na direita para trocar o raio do som. Vale também durante a partida.',
        'A música da partida só toca dentro do raio da mesa e some suavemente até a borda dele; fora, o motor musical da partida desliga. Raio 0 deixa a partida sem música.',
        'Quem vence a partida ganha uma Chave de ouro. “Sair da partida” libera a mesa.',
      ] },
      { title: 'Pátio: Ativador de grid de campo minado', items: [
        'O Ativador agora tem a cara do ícone do Campo minado: uma mina sobre um bloco vermelho que brilha, mais forte quanto mais cheias as barras de música (à esquerda) e de dano (à direita). Dá para pisar em cima dele.',
        'Nova opção Trancado: notas e dano não enchem nada e só uma Chave de ouro liga o Ativador. Perto dele aparece “E - Usar a Chave de ouro”. No Arquipélago das Almas há um Ativador trancado a oeste da Arena das Almas.',
        'Ao ligar a grade, todos no Pátio veem um 3, 2, 1 enorme no meio da tela, do tamanho e com as cores dos números da grade. A cada número a grade pisca onde vai aparecer, para dar tempo de sair dali.',
        'Embaixo do topo do Ativador ficam as opções da grade que ele liga: tamanho do bloco, vão e cantos em octógono. Quem edita o Pátio troca cada uma caindo com Chocar sobre ela, e a grade pisca rapidinho com as novas opções. Elas também estão no Editar do Ativador.',
      ] },
      { title: 'Pátio: Zonas sonoras', items: [
        'As tags de uma Zona sonora no ar agora também mudam com Chocar: quem edita o Pátio cai por cima de uma tag segurando Chocar e ela passa para o próximo valor, como as da faixa do chão.',
      ] },
      { title: 'Partida: Modo botões', items: [
        'A linha de botões do Modo botões agora também pode ser arrastada pelo fundo, como a mão de cartas, na campanha e no online.',
      ] },
      { title: 'Partida: Invite a friend', items: [
        'Novo botão Invite a friend no cabeçalho da partida, à esquerda do Bot level (no celular, um ícone de pessoa com +). Ele abre um lobby 1v1 privado com o kit da cidade, ou usa o lobby em que você já está.',
        'No painel aparecem seus amigos do ChickenChess com Invite, que chama o amigo para esse lobby; o link do lobby com o botão de copiar; e embaixo os ícones de WhatsApp, Discord, Instagram, TikTok, Facebook e X para compartilhar direto.',
        'WhatsApp, Facebook e X abrem já com o link. Discord, Instagram e TikTok não têm página de compartilhar: no celular abre a lista de compartilhar do aparelho; no computador o link é copiado e o app abre para você colar.',
        'Quando o amigo entra no lobby, um aviso com som aparece durante a partida, com o botão Ir ao lobby.',
      ] },
      { title: 'Partida: cabeçalho', items: [
        'O ano e a cidade e os seletores de tom, escala e harmonia ficam do mesmo tamanho do botão do globo e, ao passar o mouse, ficam como ele: fundo escuro, letra branca e brilho na cor da cidade em volta. Um seletor aberto continua aceso enquanto o menu está aberto. Vale na campanha e no online.',
      ] },
      { title: 'Partida: widgets', items: [
        'Os widgets da partida (Mixer, Piece Params, Piece Debug, Spectrogram, Debug e Bot Control) agora também mudam de tamanho puxando a borda de cima ou o canto superior direito, na diagonal. A base do widget fica parada enquanto ele cresce para cima.',
        'Ao redimensionar, o widget não passa mais da borda da janela, e o canto inferior esquerdo agora mantém o lado direito parado.',
      ] },
      { title: 'Pátio: notas giratórias da escala Hangdrum', items: [
        'As notas giratórias agora são da escala Hangdrum, não só do instrumento Hangdrum: qualquer instrumento com essa escala ligada faz a nota tocada numa bola girar dentro dela, do mesmo jeito.',
        'Giro na bola, Nota é disparada até a região da nota e Cada nota interrompe a anterior saíram do painel Itens e ficam no painel Escalas, na escala Hangdrum, no grupo Notas giratórias. Valem para todos os instrumentos nessa escala e entram no Salvar no Pátio, no Salvar no game e no Reverter para o padrão das Escalas.',
        'O padrão é o que o Hangdrum já usava: gira pela Duração da nota do instrumento, vai voando até a bola e cada nota corta a anterior da mesma bola.',
      ] },
      { title: 'Pátio online', items: [
        'Correção: quem abria o Pátio padrão no online podia cair na sala de outro Pátio (a mais antiga aberta), e o mapa editado ao vivo lá era gravado por cima do Pátio padrão. Agora o Pátio padrão tem o próprio lobby, e um mapa vindo de sala de outro Pátio é ignorado.',
        'Depois de passar por um portal ou trocar de Pátio, o navegador não volta mais para a sala online do Pátio anterior: entra no lobby do Pátio novo.',
        'Um link de sala online de outro Pátio abre o Pátio daquela sala, já dentro dela.',
        'A Praça dos Portais foi restaurada com a última cópia encontrada, de 25/11 à noite.',
      ] },
      { title: 'Partida: histórico de jogadas', items: [
        'Passar o mouse sobre uma jogada do histórico, no rodapé, mostra logo acima um tabuleiro pequeno com a posição logo depois daquela jogada, com as casas de origem e destino destacadas e a jogada na cor da cidade. Vale na campanha, contra bot e no online. No celular, basta segurar o dedo na jogada.',
      ] },
      { title: 'Pátio: Harpa de Lira', items: [
        'Segurando Atirar, a harpa não sobe mais a escala sozinha: cada nota da escala por onde você arrasta a mira toca uma nota do arpejo (até 7 por carga). Segurar parado não toca nada.',
        'Cada folha do leque agora tem 4 degraus, do centro para fora: arrastar para dentro ou para fora na mesma folha toca o arpejo daquela nota (1ª, 3ª, 5ª e 7ª da escala), sem mudar o ângulo da mira.',
        'As notas do arpejo saem menores, ficam flutuando em volta da galinha e caem devagar; ao soltar Atirar, a nota principal sai e elas vão junto, quase paralelas a ela. Se a carga é interrompida (troca de item, golpe), elas somem.',
        'Quanto mais longe a mira estiver da galinha dentro do leque, mais rápida sai a nota principal (e mais alta, pelo Volume pela distância, que agora vai de 30% a 100% na harpa).',
        'Na mira, uma fileira de 7 bolinhas acima do horizonte mostra as notas do arpejo; cada nota tocada apaga a sua bolinha, que sobe e some. A carga volta a enchê-las.',
        'Em Itens, o checkbox Carga em glissando passa a se chamar Arpejo ao arrastar a mira e vale para qualquer instrumento de carga em que for ligado. No online, os outros veem as notas do arpejo a partir do disparo.',
      ] },
      { title: 'Pátio: prévia do Golpe desenhado', items: [
        'Enquanto você desenha o golpe no ar, a linha de prévia agora é uma miniatura do próprio desenho: começa no alcance do golpe, onde o desenho começou, e segue o mesmo caminho do mouse ou do dedo, em tamanho menor. O golpe em si continua igual.',
        'Nova caixa Simplificar raio do golpe no grupo Golpe de cada item do painel Itens (desligada em todos): ligada, a prévia volta a ser a linha em volta do boneco, no alcance do golpe.',
      ] },
      { title: 'Pátio: Correr guarda o item do chão', items: [
        'Apertar Correr com o boneco em cima de um item no chão guarda o item no inventário, sem equipar: a mão continua com o que tinha (ou vazia).',
        'Só guarda se houver espaço: com o inventário ou a categoria cheia, o item fica no chão e nada é trocado. Segurar Correr não pega os itens seguintes; vale o momento do aperto.',
        'Correr não faz mais nada do Usar / pegar: não entra em portal, não abre Baú e não senta em instrumento. Uma tecla que é das duas (o X do gamepad, o Shift direito com o P) continua fazendo o Usar nessas coisas, mas sobre um item segue a regra do Correr.',
        'No celular, o botão Correr faz o mesmo quando “Correr também pega itens do chão” está ligado.',
      ] },
    ],
  },
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
      { title: 'Qualidade automática sem prender em 30 FPS', items: [
        'Quando o “Ajustar automaticamente” baixa a qualidade gráfica ou sonora, a redução vale só até recarregar ou fechar a página; ao abrir de novo, o jogo volta ao nível escolhido à mão ou ao do aparelho. Antes, um engasgo passageiro deixava o computador preso em Baixa, a 30 FPS, para sempre.',
        'Quem já tinha ficado preso em Baixa pelo ajuste automático volta ao nível normal na próxima abertura. Níveis escolhidos à mão com a caixa desligada, e a Baixíssima, continuam como estavam.',
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
]

export const CHANGELOG = [...RECENT, ...CHANGELOG_ARCHIVE]
