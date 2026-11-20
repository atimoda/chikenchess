export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.15.0',
    date: '20/11/2026',
    title: 'Simulador de voz de galinha em chickenchess.com/chicken-voice-simulator; créditos completos no About; Piano de cauda e a escala Estrela: as 12 notas numa estrela de hexágonos, tocadas por clique e arraste, com dinâmica pelo movimento e o acumulador de notas no Correr',
    groups: [
      { title: 'Simulador de voz de galinha', items: [
        'Página nova em /chicken-voice-simulator: um sintetizador que simula o corpo da galinha (sacos aéreos, siringe, traqueia, laringe, garganta e bico) em vez de usar gravações. Ela cacareja, choca, canta de galo, pia como pintinho, dá alarme e chama para comer.',
        'Botão Sing: a galinha canta a letra digitada numa melodia escolhida, transformando cada sílaba no que o bico, a laringe e a garganta dela conseguem fazer. Um controle passa de pintinho a galinha e a galo.',
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
  {
    version: '2.13.0',
    date: '17/11/2026',
    title: 'Zonas com gravidade dos planetas, câmera lenta e raio-x; zonas sonoras: cada ritmo com o balanço dele (o samba deixa de ser grade rígida), instrumentos gravados por ritmo, variações de cada ritmo, notas da batida arrastáveis no tempo e até 10 blocos de variação por zona, com Volume e BPM em knobs; modo editor: Shift trava o arraste na horizontal ou na vertical, o elemento acompanha o ponteiro em qualquer zoom e o zoom funciona com o mouse em cima de um elemento; galinha: Chocar agarrada na parede e no teto, e asas batendo na carga do shocking jump no ar; Grade de blocos: a colisão dos Cantos em octógono segue o contorno desenhado e a Bomba é um feixe de dinamite com timer, e cada bloco é também uma Zona sonora com ritmos sorteados; o Templo do Gongo montado com elementos do Modo editor (Prédio, Mureta com cerca, Gongo do Templo); suportes de item com Limite de reposição; a roda do mouse arrastável para qualquer ação nos Controles; o X do gamepad abre Baús e senta nos instrumentos fixos; e binds próprias da Harpa e da Bateria no painel Controles, com o sustenido no L3; com as três gaiolas ocupadas, uma gaiola do chão só é trocada com um aperto inteiro de Pegar em cima dela; Configurações do Pátio ganham a categoria Mata (Mata ao longe e Mata perto); o Passaguá fica sempre na primeira casa dos utilitários; contador de almas das gaiolas só em texto branco; Configurações do Pátio ganham Brilho dos itens, com coluna de luz, contorno aceso e cor escolhida; sem menu do navegador no botão direito dos botões; e chãos novos Lua e Marte no Modo editor; na partida, aviso ao tentar um lance que deixaria o próprio rei sob ataque; guia de pássaros reais: 30 aves com cantos gravados, a ave que inspira cada alma, receita na ficha e canto real das almas soltas; o botão Padrão da horda alterna entre a Fileira e as formações das fases do Templo; e personagens novos Pig (porco) e Ken (raposa) no Vestiário, com 3 estilos de porco e 10 espécies de raposa',
    groups: [
      { title: 'Filhote', items: [
        'Ao virar filhote, todos os itens e gaiolas caem espalhados em volta (a espalhada é ajustável no Ajustes, no novo grupo Vida, junto com vida, regeneração e Guarda).',
        'O filhote carrega 1 arma de fogo, 1 instrumento, 1 utilitário e 1 gaiola, e pode atirar; pegar outro do mesmo tipo troca.',
        'Com a mão vazia, o filhote faz o Piu piu: pia e solta uma notinha que vai pouco longe e dá um pouco de harmonia, sem dano.',
      ] },
      { title: 'Vestiário', items: [
        'A janela do Vestiário agora pode ser movida e redimensionada como os outros painéis; estreita, a prévia fica acima das abas.',
      ] },
      { title: 'Salvar no game', items: [
        'Antes de gravar, todo Salvar no game mostra a lista do que muda (antes → depois) e pede confirmação. No painel Itens, ele grava todas as armas e instrumentos de uma vez.',
      ] },
      { title: 'Personagens: Pig e Ken', items: [
        'Dois personagens novos ao lado da galinha: Pig, o porco de colete com algemas e corrente partida, e Ken, a raposa. No Vestiário, a aba Raças ganhou as seções Porcos e Raposas, e escolher um deles troca o visual inteiro. Eles andam, pulam, seguram itens, golpeiam e atiram com o mesmo esqueleto e as mesmas animações da galinha; o movimento próprio de cada um vem depois.',
        'Pig vem em Rosa, Hampshire e Mangalica. Ken vem em dez espécies de raposa: vermelha, prateada, marmorizada, do-ártico, cinzenta, corsac, tibetana, feneco, do-deserto e orelhas-de-morcego. Pig Rosa e Ken vermelho vêm liberados; os outros são conquista.',
        'Cada raça mostra a classe da espécie (Galinha, Porco ou Raposa) no lugar de Leve, Média ou Ornamental, e as abas de peças só oferecem peças da mesma classe do visual atual.',
        'Cada classe tem o seu movimento, igual para todos os estilos dela. Pig é maior, mais lento para começar e para parar, pula baixo e pesado, não pula no ar e não escala paredes. Ken é um pouco mais lento que a galinha e mais rápido que Pig, responde na hora, controla bem no ar, pula alto, tem um pulo duplo e plana bem devagar segurando Pulo no ar, com Cima e Baixo mudando a intensidade como no voo da galinha.',
        'No painel Ajustes, colunas Chi, Pig e Ken ao lado de cada ajuste, com knobs dos fatores de cada classe sobre o valor da galinha (Pulos no ar como número), salvos junto com a configuração do jogo.',
        'O ajuste Tamanho (antes “Tamanho da galinha”; o botão agora é “Ajustes do personagem”) vale 1 no tamanho normal (antes era 0,5), sem mudar o tamanho na tela: configurações salvas antes são convertidas ao abrir. Ajuste novo em Voo: Pulos no ar (máximo).',
        'Sem item na mão, Pig bate com a corrente (Correntada) e Ken com o rabo (Rabada): Golpe dá o golpe rápido, no combo, e Atirar carrega o golpe forte e solta ao largar o botão, como nos bastões. A corrente alcança e empurra mais; o rabo varre arcos maiores e gira por baixo do Ken. Os números ficam no painel Itens, nas fichas Correntada e Rabada.',
        'Chocando no chão, Pig fica firme (Guarda): explosões e golpes não o empurram. Fora disso, Pig sofre só 35% do empurrão e Ken 80%. Chocar + Pulo vira Bote no Ken (salto longo e baixo) e Investida no Pig (carga quase reta pelo chão).',
        'Os bonecos ganharam vida: galinha 100, Ken 200 e Pig 300. Explosões e mordidas de zumbi tiram vida, a Guarda do Pig corta 60% do dano que vem de frente, e depois de 6 segundos sem dano ela volta aos poucos. Uma barrinha sobre a cabeça aparece quando falta vida.',
        'Com a vida a zero, o boneco vira filhote da classe dele: pintinho, leitão ou raposinha, no traço do pintinho. O filhote é imortal, só toca instrumentos e usa Usar, e volta a adulto quando a barra de música roxa enche com 4 notas que o acertam: notas rebatidas dos aliens e dos pássaros ou notas dos instrumentos de outros jogadores. Ele continua filhote ao voltar ao globo e em outro Pátio, e no Vestiário só troca de estilo entre os filhotes da classe dele (7 leitões e 10 raposinhas).',
        'Pig, Ken e os filhotes deles se movem como mamíferos: sem a cabeça de galinha dando bote a cada passo, sem bater os braços como asas, pernas penduradas no pulo, braço que não estica e itens seguros mais baixo, longe do rosto. Na Planagem, o rabo do Ken sobe e gira como hélice.',
        'Pig e Ken têm braços com cotovelo, nas poses da arte planejada (o Pig com o braço cruzando a barriga, o Ken com a mão no quadril), e as duas mãos seguram o item nos pontos dele. Nos itens, “Segurar com a outra mão” troca a mão que segura, e o bastão ganhou “Segunda mão no bastão”, com o ponto da outra mão arrastável. O golpe forte do Pig e do Ken, com item ou com a corrente, é carregado e dado com a outra mão. No painel Itens, a Correntada e a Rabada (golpe rápido, combo e golpe forte) aparecem quando o Pig ou o Ken está de mão vazia, no lugar da Bicada, e mostram só os ajustes de golpe. Na lista do painel Itens, Bicada, Asa, Correntada e Rabada ficam juntas no grupo Golpes, no topo. Os Pontos de cada item (como o boneco segura: eixo, mãos, pose do bastão) têm uma versão para Chi, Pig e Ken, com abas no painel que já abrem na classe do seu boneco; enquanto só um dos dois (Pig ou Ken) foi ajustado, o outro segue esse ajuste. O rabo do Ken acompanha o ângulo da Rabada, e carregando o golpe forte o Pig arma a corrente para trás e o Ken arma o rabo, tremendo quando a carga enche.',
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
        'Na paleta, a Mureta com cerca cabe na caixinha, com a cerca e o muro inteiros em miniatura. Antes o desenho saía da caixa e cobria os cards de baixo.',
        'Os botões da horda aparecem na paleta como são no Pátio: o poste com o botão vermelho (Aliens, Zumbis) ou azul (Padrão dos aliens, Quantidade de zumbis), no lugar do quadradinho com “!”.',
      ] },
      { title: 'Pátio: botões da horda', items: [
        'Os botões “Soltar aliens” e “Soltar zumbis” passam a se chamar só ALIENS e ZUMBIS, no Pátio e na paleta do Modo editor.',
        'O botão Padrão agora troca a formação dos aliens: Fileira (a de sempre) e as formações das fases do Templo do Gongo, Despertar (águas-vivas coloridas), Lanternas, Couraça, Gêmeos e Tambores, com os aliens e a vida de cada fase. Na horda todas andam como a Fileira, de lado e descendo nas bordas; mergulhos, bombas e o tambor no compasso continuam só no Templo. No online, o padrão escolhido vale para quem apertou ALIENS.',
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
      { title: 'Pátio: brilho dos itens', items: [
        'Configurações do Pátio ganham “Brilho dos itens”: cada item caído no chão ganha uma coluna de luz subindo dele, um contorno aceso em volta e uma luz no chão embaixo. Em 0 fica desligado (o padrão, como antes); valores baixos são bem suaves e 100% é o feixe alto e forte. O quadrado de cor ao lado do controle muda a cor do brilho, dourada por padrão. Vale para todos os itens do Pátio, inclusive as gaiolas no chão (só a coluna de luz), e é salvo com o Pátio, no local e no online.',
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
]

export const CHANGELOG = [...RECENT, ...CHANGELOG_ARCHIVE]
