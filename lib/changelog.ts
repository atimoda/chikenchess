export const RELEASE_LABEL = 'v3.1'

// User-facing release history shared by the map, game and Creative studio.
export const CHANGELOG = [
  {
    version: '3.1', date: '12/09/2026', title: 'Peças que fazem música',
    groups: [
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
  { version: '3.0', date: '', title: 'The Distribution', groups: [
    { title: 'Base da versão', items: ['Mapa de cidades e fases de xadrez contra IA, progressão local e interface de jogo que serviram de base à evolução musical da versão 3.1.'] },
  ] },
] as const
