export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.20.0',
    date: '27/11/2026',
    title: 'Pátio online: itens no chão compartilhados, bonecos de treino com a mesma vida para todos, golpes e gancho entre navegadores, pose do item na mão, Filhote e pássaros que assobiam para todos',
    groups: [
      { title: 'Pátio online: itens no chão', items: [
        'Os itens no chão agora são os mesmos para todos no lobby: os do Pátio, os dos suportes, o que sai de um Baú ou de um prêmio, o que alguém larga, arremessa ou troca. Cada item que alguém pega some para todos.',
        'Dois players que pegam o mesmo item ao mesmo tempo: fica com quem pediu primeiro; para o outro ele só some.',
        'Uma Gaiola no chão leva junto as almas que tem dentro.',
      ] },
      { title: 'Pátio online: bonecos de treino', items: [
        'Os bonecos de treino do Pátio têm a mesma vida para todos: o dano e o conserto com notas de qualquer navegador quebram e consertam o boneco em todas as telas, com o som e as lascas.',
      ] },
      { title: 'Pátio online: golpes, Bicada e gancho', items: [
        'Com Dano entre jogadores ligado, os golpes e a Bicada de outro navegador agora também machucam e empurram os players daqui.',
        'A Corrente-gancho prende e puxa o player de outro navegador, e o gancho dele puxa os players daqui.',
      ] },
      { title: 'Pátio online: aparência dos outros', items: [
        'O item na mão de outro navegador mostra como está sendo segurado: carregando o arremesso ou o tiro, o arco puxado, o golpe forte carregando, comendo, recarregando, o bastão longe (arremessado) e o par de Boomerangs.',
        'O Filhote de outro navegador aparece como Filhote, com a barra de música.',
        'Os pássaros mortos-vivos assobiam notas e fazem cocô nos players de todos os navegadores, não só nos do dono do lobby.',
      ] },
    ],
  },
  {
    version: '2.19.0',
    date: '26/11/2026',
    title: 'Invite a friend nas partidas: chame um amigo, copie o link ou compartilhe nos apps; ano e cidade, tom, escala e harmonia com o tamanho e o hover do botão do globo; widgets redimensionam pela borda de cima e pelo canto superior direito; notas giratórias em qualquer instrumento com a escala Hangdrum; prévia do tabuleiro ao passar o mouse no histórico de jogadas; Mesa de chickenchess no Pátio: entre na fila nos banquinhos, jogue contra um bot ou um amigo sobre o Pátio e ganhe uma Chave de ouro, que abre o novo Ativador de grid trancado, com contagem 3, 2, 1 e opções da grade por Chocar; Harpa de Lira toca o arpejo arrastando a mira, com as notas flutuando em volta e saindo junto da nota principal; prévia do Golpe desenhado fiel ao desenho; Correr guarda o item do chão no inventário; o jogo inteiro em 8 idiomas, com o Idioma nas Preferências; Salvar no game chega na hora a quem está no Pátio online; Bateria toca cada peça em que o clique arrastado encosta e soa com gravações de uma bateria acústica',
    groups: [
      { title: 'Pátio: Dano entre jogadores', items: [
        'Nova chave Dano entre jogadores nas Configurações do Pátio (desligada por padrão). Ligada, tiros, golpes, a Bicada, arremessos, bastões arremessados e a Corrente-gancho de um player tiram vida dos outros e dão um tranco, com o dano do próprio item. Instrumentos continuam só tocando. Quem chega a zero vira Kid ali mesmo e larga os itens, e volta a adulto enchendo a barra de música.',
        'No online, os tiros e arremessos de outro navegador também machucam quem está neste; os golpes de outro navegador ainda não.',
      ] },
      { title: 'Pátio online: Bicada, golpes e violino', items: [
        'A Bicada de outro navegador agora aparece: o pescoço recolhendo enquanto Atirar está segurado e o bico saindo ao soltar.',
        'Os golpes de outro navegador (com a asa, com item, combo, golpe forte e Golpe desenhado) aparecem com a asa girando, o item na ponta e o rastro de ar, com o som do golpe por perto.',
        'O violino de outro navegador aparece tocando: o feixe com as notas, o arco indo e vindo nas cordas e a nota sustentada, mais baixa que a sua, enquanto ele estiver na cena.',
      ] },
      { title: 'Pátio: Bateria', items: [
        'Na escala da Bateria, segurar o clique (ou o dedo) e arrastar toca na hora cada peça em que ele encosta, na ordem, mesmo num movimento rápido que cruze várias de uma vez. Ficar dentro da mesma peça não repete; sair e voltar toca de novo. Arrastar rápido soa quase como um clique; devagar, mais leve.',
        'O kit agora soa com gravações de uma bateria acústica de verdade (Virtuosity Drums, livre de direitos): bumbo, caixa, tons, surdo, chimbal fechado e aberto pelo pedal, condução, sino, ataque, splash e china, cada peça com batidas fracas, médias e fortes e duas tomadas que se alternam. O Tom 2, o Splash e a China são feitos de outras peças da mesma bateria. Na primeira vez que se senta, enquanto as gravações carregam, a bateria sintetizada de antes cobre as batidas.',
      ] },
      { title: 'Pátio: Salvar no game ao vivo', items: [
        'Quem já está no Pátio online recebe o Salvar no game na hora, sem sair e entrar de novo; fora dele, a atualização chega em até 5 minutos.',
      ] },
      { title: 'Idiomas', items: [
        'O jogo inteiro agora fala 8 idiomas: português, inglês, espanhol, francês, russo, hindi, chinês e japonês. Menus, painéis, avisos, cidades, campanhas, dicas, itens e instrumentos do Pátio mudam juntos.',
        'Novo campo Idioma no topo das Preferências, no mapa, na partida, no online e no Criativo; no Pátio, fica no painel Camadas. A troca vale na hora, sem recarregar a página, e fica salva no navegador.',
        'Na primeira visita o jogo abre no idioma do navegador (inglês quando ele não é um dos 8).',
      ] },
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
]

export const CHANGELOG = [...RECENT, ...CHANGELOG_ARCHIVE]
