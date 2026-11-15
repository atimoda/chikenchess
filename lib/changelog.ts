export { RELEASE_LABEL } from './release'
import { CHANGELOG_ARCHIVE } from './changelog-archive'

// User-facing release history shared by the map, game and Creative studio.
// Only the most recent versions live here: edit the top entry. Older ones are in changelog-archive.ts.
const RECENT = [
  {
    version: '2.10.2',
    date: '15/11/2026',
    title: 'Modo editor do Pátio sem travar ao arrastar elementos',
    groups: [
      { title: 'Pátio', items: [
        'No Modo editor, arrastar uma zona sonora, um portal ou qualquer outro elemento por um tempo não gera mais o erro “Maximum update depth exceeded”: os portais do Pátio deixaram de se redesenhar a cada passo do arraste.',
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
