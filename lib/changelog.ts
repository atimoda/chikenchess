export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.6.0',
    date: '10/11/2026',
    title: 'Instrumentos de sopro na boca e asas segurando os itens',
    groups: [
      { title: 'Pátio', items: [
        'Flauta, sax e trompete ficam presos pela ponta do bocal no bico da galinha e giram a partir dali ao mirar; a cabeça passa a ficar na frente da asa enquanto ela toca. A mira e a saída das notas acompanham o novo eixo.',
        'As asas seguram os instrumentos: a ponta da asa da frente e a da asa de trás ficam sempre encostadas num ponto de cada instrumento, girando e esticando como já acontecia com o arco do violino (que continua com a asa enquanto toca).',
        'Em Itens, o novo grupo Pontos mostra o desenho do item com o Eixo, a Asa, a Asa de trás e a Saída do tiro para arrastar com o mouse ou o dedo, a escolha de onde o eixo fica preso (ombro ou boca) e se cada asa segura o item. Vale também para as armas, com as asas desligadas por padrão.',
        'Para o admin, o painel Itens ganha o botão Salvar no game: grava os ajustes de todos os itens como os oficiais do jogo, que chegam a todos no próximo deploy. Os ajustes feitos no navegador continuam valendo por cima.',
        'No Pátio online, o item na mão das galinhas dos outros players aponta para o lado em que elas olham e usa os mesmos pontos.',
      ] },
    ],
  },
  {
    version: '2.5.0',
    date: '09/11/2026',
    title: 'Inventário em grupos, arrastar itens e atalhos por grupo',
    groups: [
      { title: 'Pátio', items: [
        'O inventário comporta até 25 itens. O limite de cada Pátio fica em Configurações do Pátio → Limite do inventário (padrão 25); baixar o limite não tira itens de ninguém, só não deixa pegar novos.',
        'Os itens ficam em três grupos, nesta ordem: instrumentos, armas e o resto (esportivos, consumíveis e utilitários). Cada item pego entra no fim do seu grupo. Na barra, um espaço maior e uma linha colorida separam os grupos, e as casas encolhem para caber na tela.',
        'Clique e arraste um item da barra para mudar sua posição; soltando ao lado de um item de outro grupo, ele passa para esse grupo. Um clique sem arrastar continua equipando.',
        'O analógico de movimento (gamepad ou tela) mira em todas as direções, inclusive para baixo com a galinha no chão. O teclado de um player sem mouse (por exemplo o Secondary keyboard passado para outro player no painel Players) mira nas 8 direções pelas teclas de movimento; o teclado que tem o mouse junto continua sem mirar pelas setas. Mouse ou analógico de mira parados devolvem a mira ao movimento depois do tempo de Câmera de Mira → Mira parada volta para o movimento. Os players adicionais também miram pelo analógico esquerdo quando não usam o direito.',
        'O painel Controles do boneco passa a se chamar Controles: o título Movimentos e seu botão de ajuda saíram, a grade de binds ganha a coluna Mouse (botões fixos, só leitura), Na tela (celular) vira Touch Controls com os botões Sempre visível e Nunca mostrar, e o checkbox Cacarejos vai para o painel Volume (no globo, que não tem Volume, continua no rodapé de Controles).',
        'Com um controle de PlayStation conectado (identificado pelo fabricante Sony), os botões aparecem com os nomes dele (✕ ○ □ △ L1 R1 L2 R2 Create Options) no painel Controles e nas dicas do jogo; as atribuições são as mesmas. Os demais controles seguem com os nomes de Xbox.',
        'Na barra de baixo, os instrumentos ficam alinhados à esquerda da tela, os utilitários à direita e as armas centralizadas no espaço entre eles, sem a linha colorida acima de cada grupo. Em celulares e telas estreitas (menos de 768 px) as teclas dos grupos e os números 1–9 sob as casas não aparecem. À esquerda do primeiro item de cada grupo aparece a tecla do atalho do grupo (TAB, Q, F, ou LB, RB, B no gamepad).',
        'Os efeitos visuais dos consumíveis também acumulam: cada dose de Maryjane deixa a sombra dourada do estado búdico mais intensa, e tomar Cok junto mostra as bolhas ao mesmo tempo que a sombra, sem um anular o outro (mais doses de Cok, mais bolhas).',
        'A Maryjane agora se chama Bear Gummy e seu desenho mostra um único ursinho.',
      ] },
      { title: 'Pátio online', items: [
        'Aliens, zumbis, aliens de treino e os mortos-vivos que eles deixam agora são os mesmos para todo o lobby: o dono do lobby comanda os inimigos, e os acertos de qualquer player (tiros, notas, explosões, golpes e arremessos) valem para todos, inclusive matar, virar passarinho ou curar.',
        'Os botões SOLTAR ALIENS / SOLTAR ZUMBIS e os inimigos de treino do editor funcionam para qualquer player e aparecem para todos; os zumbis vão atrás da galinha mais próxima, de qualquer navegador.',
        'Os tiros, notas e itens arremessados dos outros players aparecem voando na sua tela; as explosões deles empurram a sua galinha. Quando o dono sai, o próximo continua com os mesmos inimigos.',
      ] },
      { title: 'Galinha', items: [
        'Novos atalhos: Próximo instrumento (Tab, LB), Próxima arma (Q, RB) e Próximo utilitário (F, B) percorrem só aquele grupo, na ordem da barra, começando pelo primeiro quando o item da mão é de outro grupo. Próximo utilitário também passa pela casa vazia (mãos vazias). Próximo item e Item anterior continuam passando por todo o inventário pela rodinha do mouse e pelo teclado secundário (Del e \'); no teclado principal e no gamepad ficam sem atalho padrão.',
        'Para abrir espaço: Roda do inventário passa de Q para T, Deselecionar item de F para B e, no gamepad, Golpe passa de B para Y e Arremessar de Y para R3 (que deixa de ser o segundo botão de Pular). Atalhos personalizados são preservados.',
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
]

export const CHANGELOG = [...RECENT, ...CHANGELOG_ARCHIVE]
