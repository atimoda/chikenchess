export const RELEASE_LABEL = 'v0.4.4'

// User-facing release history shared by the map, game and Creative studio.
export const CHANGELOG = [
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
