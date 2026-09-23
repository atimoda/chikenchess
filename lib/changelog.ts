export const RELEASE_LABEL = 'v0.4.46'

// User-facing release history shared by the map, game and Creative studio.
export const CHANGELOG = [
  { version: '0.4.46', date: '23/09/2026', title: 'Presença das variações', groups: [
    { title: 'Partida', items: [
      'A aba da variação fica mais discreta durante seções em que a peça não está presente; o pin sobe para ficar acima do botão.',
    ] },
  ] },
  { version: '0.4.45', date: '23/09/2026', title: 'Abas de variação', groups: [
    { title: 'Partida', items: [
      'Os botões de edição da variação destacam o hover; o pin da variação fixada aparece acima da aba sem aumentar a fileira.',
    ] },
  ] },
  { version: '0.4.44', date: '23/09/2026', title: 'Compasso da partida', groups: [
    { title: 'Música', items: [
      'A partida agora usa o compasso do kit também no editor de variações e no relógio musical.',
    ] },
  ] },
  { version: '0.4.43', date: '23/09/2026', title: 'Audição no Criativo', groups: [
    { title: 'Tabuleiro', items: [
      'Arrastar uma peça volta a tocar uma nota por casa mesmo quando o áudio ainda estava suspenso.',
      'Duplo clique numa peça alterna sua ativação no modo Mover, sem mudar sua posição.',
    ] },
    { title: 'Editor', items: [
      'A grade abre com duas partes em 3/4 e três partes em 6/8 ou 12/8; a escolha ainda pode ser ajustada livremente.',
    ] },
  ] },
  { version: '0.4.42', date: '23/09/2026', title: 'Campanhas e novas levadas', groups: [
    { title: 'Mapa', items: [
      'As fases agora aparecem em três campanhas numa lista à esquerda do globo; hover centraliza a cidade e clique abre seu popup.',
      'Buenos Aires, Dublin e New Orleans chegam à campanha World ballads, junto com Manchester 1999; Vienna aparece em Classical music.',
    ] },
    { title: 'Música', items: [
      'Três composições originais exploram 3/4, 6/8 e 12/8, com duração real dos compassos, acentos e relógio próprios.',
      'O Criativo permite escolher o compasso; kits antigos continuam em 4/4.',
    ] },
  ] },
  { version: '0.4.41', date: '23/09/2026', title: 'Ícones com fundo transparente', groups: [
    { title: 'Identidade visual', items: [
      'Favicons e ícones do app exibem a silhueta do logotipo sem um quadrado de fundo.',
    ] },
  ] },
  { version: '0.4.40', date: '23/09/2026', title: 'Logotipo maior no Sobre', groups: [
    { title: 'Mapa', items: [
      'O logotipo fica maior ao lado do nome no painel Sobre.',
    ] },
  ] },
  { version: '0.4.39', date: '23/09/2026', title: 'Identidade visual completa', groups: [
    { title: 'Mapa', items: [
      'O logotipo aparece nos ícones do navegador e nas prévias ao compartilhar; controles do cabeçalho e informações de contato foram atualizados.',
    ] },
  ] },
  { version: '0.4.38', date: '23/09/2026', title: 'Cores da cidade nos controles da partida', groups: [
    { title: 'Partida', items: [
      'Os sliders de Board Params e os botões de energia dos widgets acompanham as cores da cidade, com branco desligado e azul no hover.',
    ] },
  ] },
  { version: '0.4.37', date: '23/09/2026', title: 'Espectrograma mais amplo e legível', groups: [
    { title: 'Partida', items: [
      'O espectrograma usa o fundo do widget, ocupa melhor sua área e capta picos entre as frequências exibidas.',
    ] },
  ] },
  { version: '0.4.36', date: '23/09/2026', title: 'Destaque das casas ativas mais limpo', groups: [
    { title: 'Partida', items: [
      'As casas ativas deixam de ter sombra no botão e contorno de 1 px; a borda branca da seleção permanece.',
    ] },
  ] },
  { version: '0.4.35', date: '23/09/2026', title: 'Controles da partida mais claros', groups: [
    { title: 'Partida', items: [
      'O cabeçalho mostra a dificuldade selecionada com espaçamento uniforme entre os controles; os links de melhores e piores jogadas usam cinza.',
    ] },
  ] },
  { version: '0.4.34', date: '23/09/2026', title: 'Pontuação do perfil mais discreta', groups: [
    { title: 'Mapa', items: [
      'A pontuação histórica aparece em cinza e usa “points” como unidade.',
    ] },
  ] },
  { version: '0.4.33', date: '23/09/2026', title: 'Popups acompanham o limite do globo', groups: [
    { title: 'Mapa', items: [
      'Durante o arraste e o giro, popups fora da esfera ficam no máximo 50 px além da circunferência visível.',
    ] },
  ] },
  { version: '0.4.32', date: '23/09/2026', title: 'Perfil do jogador mais claro', groups: [
    { title: 'Mapa', items: [
      'Rank, ovos e pontuação aparecem juntos sem cartão separado; o avatar ganha destaque e os ícones de ovo e conquista ficam nos indicadores correspondentes.',
    ] },
  ] },
  { version: '0.4.31', date: '23/09/2026', title: 'Acabamento dos controles do globo', groups: [
    { title: 'Mapa', items: [
      'Popups de cidade recortam o fundo nos cantos arredondados; versão e Modo Criativo ficam clicáveis em toda a área, com hover escuro consistente.',
    ] },
  ] },
  { version: '0.4.30', date: '23/09/2026', title: 'Perfil e controles refinados', groups: [
    { title: 'Mapa', items: [
      'Os botões do globo usam hover escuro; o perfil mostra os ovos ao lado do avatar e exibe as cidades conquistadas com título atualizado.',
    ] },
  ] },
  { version: '0.4.29', date: '23/09/2026', title: 'Ações do mapa mais consistentes', groups: [
    { title: 'Mapa', items: [
      'Modo Criativo fica ao lado da versão; o botão de tela cheia destaca e amplia o ícone no hover, e o perfil mostra “golden eggs” sem moldura.',
    ] },
  ] },
  { version: '0.4.28', date: '23/09/2026', title: 'Perfil do jogador em popup', groups: [
    { title: 'Mapa', items: [
      'O perfil e a redefinição do progresso ficam no popup do avatar com a contagem de ovos; Modo Criativo fica no canto inferior esquerdo.',
    ] },
  ] },
  { version: '0.4.27', date: '23/09/2026', title: 'Widgets podem ser arrastados atrás da área central', groups: [
    { title: 'Partida', items: [
      'A área vazia ao redor do tabuleiro e dos controles de jogo deixa passar os gestos para os widgets posicionados atrás.',
    ] },
  ] },
  { version: '0.4.26', date: '23/09/2026', title: 'Dificuldade da IA atualiza a próxima jogada', groups: [
    { title: 'Partida', items: [
      'Alterar a dificuldade durante a análise ou a espera reinicia a busca com o nível escolhido; o menu identifica o nível real do Stockfish.',
      'Os atalhos de melhores/piores jogadas têm mais espaço acima e usam barra como separador.',
    ] },
  ] },
  { version: '0.4.25', date: '23/09/2026', title: 'Subtítulo da introdução mais leve', groups: [
    { title: 'Partida', items: [
      'O gênero e o ano aparecem sem negrito e sem cursor de ponteiro na tela de introdução.',
    ] },
  ] },
  { version: '0.4.24', date: '23/09/2026', title: 'Pins alternam a abertura do popup', groups: [
    { title: 'Mapa', items: [
      'Clicar no pin de uma cidade com popup aberto agora fecha esse popup.',
    ] },
  ] },
  { version: '0.4.23', date: '23/09/2026', title: 'Scroll do globo também funciona sobre popups', groups: [
    { title: 'Mapa', items: [
      'A roda do mouse continua controlando o zoom do globo mesmo quando o cursor está sobre um popup.',
    ] },
  ] },
  { version: '0.4.22', date: '23/09/2026', title: 'Popups ficam acima das linhas', groups: [
    { title: 'Mapa', items: [
      'Os cartões das cidades permanecem à frente das linhas e vêm para a frente dos outros popups ao serem clicados ou arrastados.',
    ] },
  ] },
  { version: '0.4.21', date: '23/09/2026', title: 'Conexão usa o lado próximo da borda', groups: [
    { title: 'Mapa', items: [
      'A linha dos pins ocultos agora procura o ponto mais próximo da circunferência visível, no mesmo lado da cidade.',
    ] },
  ] },
  { version: '0.4.20', date: '23/09/2026', title: 'Linhas de conexão acompanham o globo', groups: [
    { title: 'Mapa', items: [
      'Quando um pin fica atrás do globo, sua linha se conecta à borda visível mais próxima e volta ao pin quando ele reaparece.',
    ] },
  ] },
  { version: '0.4.19', date: '23/09/2026', title: 'Popups mais limpos e foto de Johannesburg corrigida', groups: [
    { title: 'Mapa', items: [
      'Os popups deixam de mostrar BPM e recompensa; o selo CONQUERED permanece visível no rodapé das cidades conquistadas.',
      'A foto de Johannesburg volta a carregar no popup.',
    ] },
  ] },
  { version: '0.4.18', date: '23/09/2026', title: 'Conquista visível no rodapé da cidade', groups: [
    { title: 'Mapa', items: [
      'Cidades conquistadas agora exibem o selo CONQUERED junto da recompensa, deixando o título livre para o nome da cidade.',
    ] },
  ] },
  { version: '0.4.17', date: '22/09/2026', title: 'Criativo mais claro e silencioso fora da aba', groups: [
    { title: 'Modo Criativo', items: [
      'O áudio pausa ao sair da aba e volta apenas se a sessão estava tocando.',
      'Distorção e seu nível ficam em Filtros e efeitos; as dicas esclarecem o arranjo compartilhado e o slide da peça.',
      'Escolher Timbre sintetizado funciona mesmo após usar samples e muda a fonte para Síntese.',
    ] },
  ] },
  { version: '0.4.16', date: '22/09/2026', title: 'Widgets e leitura da partida', groups: [
    { title: 'Partida', items: [
      'Widgets desligados podem ser arrastados também sobre seus controles, sem que knobs ou sliders bloqueiem o gesto.',
      'O estado Your move/AI Analysing aparece entre os botões de controle e o histórico de jogadas.',
    ] },
  ] },
  { version: '0.4.15', date: '22/09/2026', title: 'Entrada na fase mais direta', groups: [
    { title: 'Apresentação da cidade', items: [
      'O nome da cidade aparece maior, com gênero e ano logo abaixo, sem o antigo quadro de informações.',
      'A partida começa automaticamente após quatro segundos; clicar em qualquer ponto da apresentação antecipa a entrada.',
    ] },
  ] },
  { version: '0.4.14', date: '22/09/2026', title: 'Controles de partida padronizados', groups: [
    { title: 'Som e variações', items: [
      'O slide de nota começa em 0,5 s; sliders nos valores padrão aparecem cinza e ficam azuis quando ajustados.',
      'Piece Params combina LPF e HPF num controle centralizado e ganha Drive para a distorção da peça.',
      'O som pausa ao sair da aba e volta apenas se a partida já estava tocando.',
    ] },
    { title: 'Partida e widgets', items: [
      'Todas as fases começam com a IA no Easy; após calcular, ela espera de 0,5 a 3 segundos antes de jogar.',
      'Os widgets usam borda fina, título branco, botões de energia consistentes e podem ser arrastados pelo corpo; Strudel passa a se chamar Debug.',
      'Os knobs mostram rótulos em maiúsculas e valores brancos; os atalhos de jogadas não exibem mais “Bisbilhotar”.',
    ] },
  ] },
  { version: '0.4.13', date: '22/09/2026', title: 'Mixer separado e edição de notas mais direta', groups: [
    { title: 'Partida', items: [
      'O mixer ganhou um widget próprio com controles simultâneos para Brancas e Pretas; Low, Mid e Hi substituem os nomes longos do EQ.',
      'Os nomes dos knobs aparecem acima dos controles, e os valores ficam abaixo. O contorno das peças pretas ficou mais suave.',
      'A barra de chance fica sem número; o estado da partida aparece centralizado abaixo dela, antes dos atalhos de melhores e piores jogadas.',
    ] },
    { title: 'Variações', items: [
      'O duplo clique apaga notas do piano roll, e Alt ao arrastar duplica a nota com duração e parâmetros de articulação preservados.',
    ] },
  ] },
  { version: '0.4.12', date: '22/09/2026', title: 'Painéis mais estáveis e legíveis', groups: [
    { title: 'Tabuleiro e parâmetros', items: [
      'As peças pretas recebem contorno branco para preservar detalhes internos e silhuetas sobre todas as casas.',
      'O editor compacto perde a borda externa e ganha espaço entre o piano roll e os sliders de articulação.',
      'Gain, LPF, pan, room e delay permanecem visíveis entre ataques; com Piece Params desligado, o cabeçalho deixa de atualizar o estado da voz.',
    ] },
    { title: 'Strudel', items: [
      'As listas de três melhores e três piores jogadas saem do widget, mantendo as setas disponíveis sob a barra de avaliação.',
      'Harmonia agora passa a reunir o rótulo e o acorde numa única linha, sem repetir a seção corrente.',
      'Os seletores harmônicos da partida e do Criativo mostram primeiro a progressão e depois seu nome, como I–IV–V–I - Cadência.',
    ] },
  ] },
  { version: '0.4.11', date: '22/09/2026', title: 'Leitura visual das variações', groups: [
    { title: 'Editor e tabuleiro', items: [
      'O comprimento horizontal da rampa agora acompanha o tempo do slide, sem repetir os valores numa legenda sob o gráfico.',
      'A variação fixada recebe um pin acima da aba, e o painel ampliado mostra editor e parâmetros da execução sem rolagem vertical interna.',
      'Desligar o loop remove também a borda e o sombreado de peça ativa no tabuleiro, mantendo a ativação musical guardada e a audição manual disponível.',
    ] },
  ] },
  { version: '0.4.10', date: '22/09/2026', title: 'Editor de variações compacto', groups: [
    { title: 'Espelho musical', items: [
      'Inverter passa a espelhar as notas no tempo dentro da duração inteira da variação, mantendo alturas e durações e trocando a direção de cada slide.',
      'Padrões em mini-notação também espelham sequências, pausas e grupos temporais sem desmontar acordes simultâneos.',
    ] },
    { title: 'Controles reorganizados', items: [
      'Subdivisão, inversão, randomização e duração ficam juntos na barra de ações; o liga/desliga do loop vai para o canto superior direito do widget.',
      'O estado da voz acompanha o código da casa no subtítulo, e o editor remove títulos e campos redundantes.',
      'Slide, tempo, acento e pan usam sliders compactos em duas colunas; pan começa centralizado e a exclusão usa um botão de lixeira junto ao gráfico.',
      'Ao desligar o loop, todo o bloco de variações fica esmaecido enquanto a audição manual da peça continua disponível.',
    ] },
  ] },
  { version: '0.4.9', date: '22/09/2026', title: 'Afinação do slide', groups: [
    { title: 'Editor de notas', items: [
      'A distância do slide de cada nota passa a usar um slider de −24 a +24 semitons, com o valor corrente sempre visível.',
    ] },
  ] },
  { version: '0.4.8', date: '22/09/2026', title: 'Ajuste de articulação', groups: [
    { title: 'Editor de notas', items: [
      'O tempo do slide de cada nota passa a usar um slider e mantém o valor em segundos visível durante o ajuste.',
    ] },
  ] },
  { version: '0.4.7', date: '22/09/2026', title: 'Variações durante a partida', groups: [
    { title: 'Edição da peça selecionada', items: [
      'Piece Params permite editar as notas da variação corrente com o mesmo piano roll do Criativo.',
      'As ações por ícone invertem ou randomizam somente as alturas da variação escolhida, preservando seu ritmo e sua duração.',
      'O botão de energia desliga os loops automáticos da peça sem impedir as notas avulsas tocadas ao arrastá-la pelo tabuleiro.',
    ] },
  ] },
  { version: '0.4.6', date: '22/09/2026', title: 'Stockfish com orçamento de análise', groups: [
    { title: 'Leitura confiável da posição', items: [
      'Stockfish Lite real substitui a engine simplificada na análise e nas jogadas da adversária.',
      'A barra mostra avaliação a favor das brancas, sem a antiga porcentagem invertida de Chance; o número acompanha a divisão visual e mates têm indicação própria.',
      'Os links sob a barra desenham por três segundos as três melhores ou piores jogadas, com setas verdes/vermelhas e a variação esperada na ponta.',
      'O Strudel também mostra as três melhores e três piores opções estimadas, com origem, destino e promoção explícitos.',
    ] },
    { title: 'Teste de desempenho', items: [
      'Um único worker compartilha o trabalho da análise e da adversária, com limites de tempo e nós e reutilização das posições já analisadas.',
      'A avaliação aparece antes do ranking; o painel informa tempo de busca, nós e profundidade para acompanhar o custo.',
      'Comparações incompletas são sinalizadas, e undo/reset descartam respostas e jogadas antigas.',
    ] },
  ] },
  { version: '0.4.5', date: '22/09/2026', title: 'Análise de movimentos', groups: [
    { title: 'Melhores e piores opções', items: [
      'O debug do Strudel lista os cinco melhores e os cinco piores movimentos legais assim que a análise da posição fica pronta.',
      'O ranking reaproveita a mesma busca do termômetro e exibe notação SAN com avaliação relativa ao lado que joga.',
      'A análise deixa de esperar o atraso artificial da adversária; os 200–700 ms continuam somente para dar ritmo à resposta da IA.',
    ] },
  ] },
  { version: '0.4.4', date: '22/09/2026', title: 'Leitura da partida', groups: [
    { title: 'Debug musical', items: [
      'O widget Strudel mostra a harmonia corrente, com seção, grau, acorde, notas e plano harmônico, usando a mesma tipografia das demais linhas de debug.',
      'A instrução de arrastar uma peça sai do monitor; a contagem de vozes ativas permanece.',
    ] },
    { title: 'Chance e histórico', items: [
      'A análise passa por uma fila serial ligada ao FEN: respostas atrasadas não podem mais sobrescrever o termômetro depois de undo/redo.',
      'Cliques rápidos conservam somente a posição mais recente na fila, enquanto retornos a um FEN completo já analisado usam o cache correspondente.',
      'A Chance também volta a ser calculada em celulares e aparelhos restritos, usando profundidade menor para limitar o uso de CPU.',
    ] },
  ] },
  { version: '0.4.3', date: '21/09/2026', title: 'Widgets da partida', groups: [
    { title: 'Controles musicais', items: [
      'Spectrogram e Strudel deixam de abrir automaticamente no primeiro lance.',
      'Board Params reúne Tom, Escala e Progressão na mesma linha e remove fine pitch, quartz lock e as legendas auxiliares de tom e mixer.',
      'A Progressão altera o plano harmônico base da partida, mantendo a prioridade temporária das influências de Estado e Evento.',
    ] },
    { title: 'Instrumento selecionado', items: [
      'Piece Params passa a usar a imagem da peça e o nome do instrumento como cabeçalho.',
      'O monitor mostra somente a variação corrente; abas A–H permitem fixar uma variação e um segundo clique devolve o controle à sequência musical.',
      'Com o widget desligado, o monitor de variações permanece desmontado para não consumir processamento.',
    ] },
    { title: 'Camadas da interface', items: [
      'A área vazia do cabeçalho deixa os cliques passarem para widgets posicionados atrás dela; os controles visíveis continuam interativos.',
    ] },
  ] },
  { version: '0.4.2', date: '21/09/2026', title: 'Gestos contínuos', groups: [
    { title: 'Globo e cidades', items: [
      'O globo conserva sua velocidade de espera quando um popup está aberto; somente o cartão percorre a tela três vezes mais devagar.',
      'Marcadores que estão atrás da esfera deixam de responder a hover, clique e toque.',
    ] },
    { title: 'Tabuleiro como instrumento', items: [
      'Arrastar uma peça volta a tocar uma nota avulsa na casa inicial e em cada nova casa atravessada.',
      'O gesto reutiliza o mesmo canal de áudio manual até a soltura, evitando recriar efeitos por casa e reduzindo a pequena trava do arraste.',
      'A posição do destaque e a prévia transitória são atualizadas sem renderizar novamente a partida inteira a cada nota.',
    ] },
  ] },
  { version: '0.4.1', date: '21/09/2026', title: 'Ovos dourados', groups: [
    { title: 'Inventário e progresso', items: [
      'Cada perfil começa com 10 ovos dourados; toda vitória de cidade, inclusive repetida, concede mais 10 ovos.',
      'Cada ovo recebido também vale um ponto histórico. Gastar ovos no futuro preservará a pontuação, as vitórias e as cidades conquistadas.',
      'Perfis antigos são migrados pela quantidade real de vitórias, sem transformar os antigos prêmios de 1.000/200 pontos em milhares de ovos.',
    ] },
    { title: 'Globo e interface', items: [
      'Arrastar o popup de uma cidade não interrompe o giro automático do globo.',
      'Com um popup aberto, o giro de espera e o quadro ancorado ao pin passam a um terço da velocidade.',
      'O botão do changelog deixa de depender do ID variável do gatilho Radix, eliminando a divergência de hidratação em aria-controls.',
    ] },
  ] },
  { version: '0.4.0', date: '21/09/2026', title: 'Atlas sonoro', groups: [
    { title: 'Uma banda própria para cada cidade', items: [
      'Os kits das cidades foram recompostos com levadas, timbres, registros, envelopes, efeitos e planos harmônicos próprios; baixo, bateria, harmonia, melodia e textura deixam de seguir o mesmo molde entre fases.',
      'Cada uma das 16 peças recebe uma função autoral e uma forma por seção: bases permanecem, respostas entram depois, solos ocupam trechos reservados e camadas saem para abrir espaço.',
      'As formas valem no Criativo e nas partidas. Capturas, movimentos, cheque, Solo e edição continuam acompanhando a identidade de cada peça.',
    ] },
    { title: 'Johannesburg · 1994', items: [
      'Nova cidade dedicada ao Kwaito: house desacelerado a 108 BPM, piano township, baixo elástico, conga, shaker, pandeiro, guitarra mbaqanga e chamadas vocais.',
      'O mapa passa a ter 13 cidades e 14 fases; Manchester continua com as épocas de 1988 e 1999.',
      'Kits salvos da coleção anterior recebem backup local recuperável quando a nova versão da cidade é carregada pela primeira vez.',
    ] },
  ] },
  { version: '0.3.4', date: '21/09/2026', title: 'Fôlego no celular', groups: [
    { title: 'Áudio e interface', items: [
      'Celulares e outros aparelhos restritos passam a compartilhar um bus de efeitos por equipe, reduzindo os reverbs simultâneos de quatro para dois sem retirar vozes, notas ou controles das peças.',
      'Os pulsos musicais atualizam somente o pequeno marcador do tabuleiro; a partida e a bancada Criativo deixam de renderizar a tela inteira a cada ataque.',
      'Desktop mantém dois buses por equipe, enquanto audições manuais continuam isoladas e podem ser canceladas imediatamente.',
    ] },
  ] },
  { version: '0.3.3', date: '21/09/2026', title: 'Engine leve e harmônica', groups: [
    { title: 'Desempenho para bandas completas', items: [
      'As 32 vozes agora compartilham quatro buses de efeitos, dois por equipe, reduzindo de 32 para quatro os reverbs simultâneos sem retirar os controles individuais das peças.',
      'Arranjos contínuos consultam somente a variação em execução; reinícios de frase continuam respeitando a entrada de cada seção.',
      'Capturar ou desativar uma peça não interrompe outras vozes do mesmo bus. Audições pelo tabuleiro continuam isoladas e podem ser canceladas imediatamente.',
      'Arraste, monitor e código Strudel evitam recomputações desnecessárias; a exportação de 32 vozes passa a declarar apenas quatro orbits.',
    ] },
    { title: 'Harmonia e Estados/Eventos', items: [
      'Planos harmônicos por seção movem baixo e melodias em conjunto; vozes sustentadas podem formar tríades com inversões de menor deslocamento.',
      'O relógio mostra centro, acorde e notas da harmonia atual, e regras podem trocar o plano temporariamente sem reescrever o kit.',
      'Todos os Estados e Eventos recebem defaults musicais proporcionais à frequência e importância do gatilho, inclusive nos kits existentes.',
      'Estados e Eventos foram separados em listas, aceitam liga/desliga pelo editor e indicam claramente qual regra está sendo editada.',
    ] },
    { title: 'Biblioteca e bancada Criativo', items: [
      'Kits salvos e padrões aparecem juntos no seletor principal, com a cidade vinculada ao lado do nome quando existir.',
      'Cada cidade mantém no máximo um kit vinculado; ao substituir o vínculo, o kit anterior permanece salvo sem cidade.',
      'Controles do transporte, variações, Solo, lista de vozes e edição numérica foram reorganizados para leitura e operação mais diretas.',
    ] },
  ] },
  { version: '0.3.2', date: '16/09/2026', title: 'The Creative', groups: [
    { title: 'Arranjos e timbres', items: [
      'Seções por peça com durações diferentes, entradas/pausas, transposição e reinício opcional da frase.',
      'Slide global ou por nota, acentos e pan individuais, intensidade e nível da distorção.',
      'Estudo Mouth Breather: 17 etapas, guitarra em camadas, baixo quebrado e bateria distribuída.',
      'Kits compostos para as 13 fases, oito samples sintéticos novos e backup recuperável dos kits anteriores.',
      'Ajuda em círculos ? com hover, foco e toque; piano roll corrigido para editar todas as linhas visíveis.',
    ] },
    { title: 'Composição visual e transporte', items: [
      'Transições preparadas no relógio de áudio e rampas de BPM por regra, com curva, ponteiro e destino no Criativo.',
      'Até oito variações selecionáveis, conversão para piano roll, desenho/movimento/duração de notas com mouse e restauração do padrão original.',
      'Duração independente por variação, grade de tercinas e loops de comprimentos diferentes sobre o mesmo BPM.',
      'Correção do sentido do giro do globo com dois dedos.',
    ] },
    { title: 'Estados e Eventos', items: [
      'Opção por regra de aguardar a virada do compasso, com indicação de pendências e persistência no kit.',
      'Catálogo compartilhado de 19 escalas/aliases, incluindo blues, tons inteiros, diminutas, modos e cromática.',
      'Simulador de estados e eventos abaixo do tabuleiro, com regras salvas em cada kit e aplicadas também na partida.',
      'Transposição, BPM, escala paralela/relativa, rotação modal, inversão melódica, variação, ganho, filtro e ativação por equipe.',
      'Roques, capturas, perda de famílias de peças, formação mínima, promoções, en passant e saída de cheque com duração configurável.',
    ] },
    { title: 'Bancada compacta', items: [
      'Scrollbars dos painéis escondidas, mantendo rolagem por mouse, trackpad e toque.',
      'Seletor de kit acima do transporte, colunas sem gap, variações expandidas e nomes de instrumento sem sufixo de casa.',
      'Correção do alinhamento da peça arrastada; botão Segure para ouvir removido. Solo continua disponível para ouvir a frase completa.',
      'Versões renomeadas para a série v0.3; versão atual v0.3.2 — The Creative.',
    ] },
  ] },
  {
    version: '0.3.1', date: '13/09/2026', title: 'Peças que fazem música',
    groups: [
      { title: 'Manchester · 1999', items: [
        'Nova época Northern Jazz Breaks, inspirada em Get a Move On! de Mr. Scruff: 123 BPM, quatro seções e motivos de sopro com respostas.',
        'Banco Chicken Jazz com 11 samples sintéticos originais de palhetas, metais, baixo, teclas, vogal e bateria, disponíveis para qualquer peça no Criativo.',
        'Manchester mantém 1988 e ganha seletor de época no popup; kits e progresso separados. Links diretos do Criativo carregam a cidade escolhida.',
      ] },
      { title: 'Mobile, globo e mixer · 13/09', items: [
        'Correções de touch em Enter board, arraste das peças com audição das casas e isolamento do cursor do globo.',
        'Giro do globo com dois dedos, retomada estável do giro automático e quadro de apresentação arrastável.',
        'Litorais vetoriais mais discretos, grade geográfica e linha do popup 50% mais escura quando o pin está atrás do planeta.',
        'Board Params com ganho e equalização por equipe; fine pitch comum e quartz lock no BPM original do kit.',
        'Menos atualizações de padrões, gráficos ocultos e renderizações durante o arraste; menor resolução do globo em dispositivos restritos.',
      ] },
      { title: 'Engine musical', items: [
        'Strudel integrado ao jogo e ao Criativo, com um relógio comum e 32 instrumentos independentes.',
        'Todas as 12 cidades usam a nova mecânica. Kits experimentais aleatórios e reproduzíveis variam fontes, frases, grooves, timbres, efeitos e movimentos.',
        'Fonte sonora, comportamento e tipo de peça são independentes: qualquer peça pode ser percussão, sequência ou voz sustentada.',
        'Banco local de samples, variações de articulação, samples afinados, biblioteca de receitas, frases A/B/C/D e grooves compartilhados.',
        'Automações de ganho, filtro, pan, reverb e delay, além de tom, escala, BPM e volume comuns à banda.',
        'Correções na duração das seções, nas entradas das vozes, na audição da rainha e nos ganhos dos presets.',
        'Padrões compilados em cache, samples compartilhados, atualizações visuais agrupadas e atenuação para formações grandes.',
      ] },
      { title: 'Tabuleiro como instrumento', items: [
        'Uma peça começa seu loop após o primeiro movimento; capturas removem a voz. Roque, en passant, promoção e undo/redo preservam as identidades musicais.',
        'Arrastar interrompe o loop da peça e toca as casas percorridas, inclusive para peças inativas. Cancelar restaura o estado anterior.',
        'Dar cheque ativa temporariamente toda a banda atacante sobrevivente. Sair do cheque devolve a ativação ao histórico de movimentos.',
        'Notas, pausas, estados e pulsos visuais acompanham o áudio. Todas as variações salvas aparecem em quadros MIDI, com ponteiro na variação em execução.',
      ] },
      { title: 'Criativo e parâmetros', items: [
        'Modo Criativo sem introdução ou adversário, com tabuleiro livre, audição, solo, ativação individual e edição de instrumentos.',
        'Carregar, editar e salvar kits de qualquer cidade para a próxima partida; gerar novas variações e comparar com o Düsseldorf original.',
        'Rascunho e kits locais, exportação/importação JSON validada. Carregar uma cidade no Criativo ativa as 16 brancas para escuta.',
        'Tabuleiro fixo à esquerda em telas largas, duas colunas de edição com rolagem independente e disposição vertical no celular em retrato.',
        'Peça acompanha mouse/toque no arraste; casas uniformes e audição sem seleção acidental de texto.',
        'Piece Params inclui notas e envelope; Board Params edita tom e escala; Strudel reúne código, seção, compasso e estado do áudio.',
        'Widgets arrastáveis pelo fundo, textos com espaço reservado, controles móveis e knobs com mouse, toque, teclado e roda do mouse.',
      ] },
      { title: 'Mundo e navegação', items: [
        'Ajustes no arraste do globo e dos popups, incluindo a liberação do mouse sem deixar o mundo preso ao ponteiro.',
        'Pressionar um popup o reduz em torno do ponto clicado; sons acompanham pressão, arraste e soltura. Botão de fechar sem recorte.',
        'Giro de espera com popups abertos; hover pausa o giro e amplia o pin em 15%. Cidades conquistadas recebem uma bandeira verde.',
        'Voo com zoom até a cidade ao entrar na fase, com respeito à preferência de movimento reduzido.',
        'Litorais geográficos reais sem fronteiras regionais, fundo de galáxias suave, sol com halo e iluminação compartilhada pelo globo e pela lua.',
        'Reward aparece no rodapé dos popups com o valor da próxima vitória. Clique dos pins 70% mais baixo e hover 30% mais baixo.',
        'Histórico de versões acessível pelo número da versão, com rolagem interna.',
      ] },
    ],
  },
  { version: '0.3.0', date: '', title: 'The Distribution', groups: [
    { title: 'Base da versão', items: ['Mapa de cidades e fases de xadrez contra IA, progressão local e interface de jogo que serviram de base à evolução musical da versão 3.1.'] },
  ] },
] as const
