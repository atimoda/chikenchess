# ChickenChess — plano da engine musical e evolução do produto

Atualizado em 23/09/2026 — v0.4.43. Status: nova engine nas 17 fases / 16 cidades, com campanhas, compassos 4/4, 3/4, 6/8 e 12/8, kits compostos por cidade e época, bancada Criativo, samples, automações, planos harmônicos e formas por voz; validação de escuta continua em andamento. O comportamento atual e suas prioridades estão em `GAME_MECHANICS.md`, atualizado a cada mudança.

## Próxima validação das baladas

Buenos Aires 1940, Dublin 1990 e New Orleans 1953 são composições originais de referência em 3/4, 6/8 e 12/8. A infraestrutura de duração, subdivisão, acento, exportação e edição está implementada. Falta comparar por escuta os timbres sintéticos com instrumentação mais expressiva, dinâmica entre formações pequenas/completas e custo em celular físico. A aprovação dos testes de padrões não equivale a aprovação de qualidade musical; novos estilos devem partir desses ensaios antes de ampliar o catálogo.

## Entrega de 16/09 — composição e comparação

Infotips compactas, piano roll alinhado em todas as linhas, seções próprias com durações assimétricas/pausas/transposições, slides por nota e distorção entregues. Estudo Mouth Breather preserva o material temporal/melódico do script com timbres locais aproximados. As 14 fases receberam arranjos próprios; migração mantém backup local. `MUSIC_STYLE_REFERENCES.md` registra referências, datas, diferenças e limitações. Esta revisão substitui os defaults sorteados; o gerador permanece como ferramenta de experimentação.

Próxima etapa: escutar e comparar as formações pequenas/completas em um aparelho físico, medindo densidade e custo dos quatro buses de efeitos. Os centros harmônicos, tríades e condução curta já estão implementados; a próxima rodada harmônica deve partir de testes A/B antes de acrescentar tétrades, extensões ou preparação de cadência. Evitar adicionar mais camadas antes de ajustar ganho, registro, espaços de resposta e articulação dos kits entregues. Samples acústicos mais expressivos e suporte a legato verdadeiro exigem outra rodada de desenho e validação.

## Próximo ciclo de implementação

**v0.4.0 — Atlas sonoro:** os defaults deixaram de compartilhar o molde fixo de oito baterias mais baixo/harmonia/melodia. Cada cidade agora distribui 16 papéis com timbres, registros, articulações e levadas próprios e usa a forma por peça para variar densidade e protagonismo entre seções. Johannesburg · 1994 acrescenta Kwaito ao mapa. A próxima validação é de escuta: comparar cada kit com 4, 8 e 16 peças, corrigir balanço e motivos que colidam, e repetir as fases mais densas no celular. Depois desse gate, a extensão de maior valor é uma biblioteca de articulações e samples mais expressivos, em vez de aumentar a quantidade de vozes.

**v0.3.4 — Fôlego no celular:** aparelhos restritos usam um bus de efeitos por equipe e os pulsos visuais deixam de renderizar a página completa. Próxima prioridade: (1) repetir no mesmo celular o cenário de cidade e Criativo, observando áudio e resposta visual separadamente; (2) registrar em telemetria local atrasos do scheduler e tarefas longas; (3) criar orçamento por papel musical para densidade e ataques simultâneos apenas se ainda houver falhas; (4) retomar comparação dos planos harmônicos depois desse gate. A simulação permite comparar esses comportamentos antes de ampliar as regras.


**Entregue em 13/09:** Manchester · 1999 / Northern Jazz Breaks é o primeiro default composto a partir de referência, com quatro seções, 11 samples sintéticos novos e separação de épocas no mesmo local. O arquivo FLAC de Get a Move On! foi analisado numericamente; a medição não equivale a uma transcrição auditiva. Próxima escuta com o usuário: avaliar identidade dos sopros, balanço com 16/32 peças e evolução por lances. Primeiro refinar esse kit; depois expandir articulações/motivo-resposta e a harmonia global. Detalhes e limites em `MUSIC_REFERENCE_GET_A_MOVE_ON.md`.

### Decks DJ — base entregue em 13/09 e próxima extensão

Board Params já oferece dois buses de áudio com ganho e EQ independentes, além de fine pitch/quartz lock sobre o relógio comum. O passo seguinte dos decks é um protótipo separado de captura e leitura de áudio por equipe: AudioWorklet com buffer circular limitado (por exemplo, 2–4 compassos), cursor de reprodução variável, crossfade e saída para o mixer. Esse protótipo precisa validar custo, memória, latência e ausência de estalos em celular antes de integrar platters.

Reverse deve ler áudio capturado para trás; inverter a ordem de notas Strudel não reproduz o mesmo efeito. Scratch varia posição e velocidade do leitor pelo gesto. Definir explicitamente pausa, limite do histórico, o que acontece com novas notas durante scratch e o retorno ao relógio musical (crossfade seguido de reencontro quantizado). Strudel pode continuar compondo enquanto o deck manipula a saída capturada. Velocidades independentes por lado exigem decidir sincronização de dois transportes; a implementação atual mantém ambos juntos. Nenhum botão de scratch/reverse fictício foi adicionado.

Na revisão mobile foram retirados reenvios redundantes de acompanhamento, consultas de painéis ocultos e renderizações React a cada pixel de arraste; loops ganham maior antecipação em dispositivos restritos. Próxima medição: aparelho físico, kit completo e interação simultânea, observando falhas de áudio, tempo de frame e custo por voz/efeito. A simulação touch de navegador valida gestos, não aprova qualidade de áudio nem desempenho real.

Na segunda rodada, performances contínuas passaram de máscaras paralelas para `pick` e os loops passaram de até 32 orbits de efeitos para quatro buses compartilhados, dois por equipe. Depois do retorno físico ainda com atraso, aparelhos restritos adotaram o fallback já ensaiado de dois buses, um por equipe, e o pulso visual foi isolado da árvore principal de React. A identidade e os controles por voz continuam nos eventos; o runtime mantém o bus enquanto houver qualquer integrante ativo. O próximo gate técnico é repetir o cenário de 32 vozes no mesmo celular antes de reduzir densidade ou polifonia.

1. **Transições musicais — base entregue:** fila por compasso, cancelamento, fase preservada, rampas de BPM e indicadores. Validar em aparelho físico; limites de seção e preparação harmônica continuam como extensões.
2. **Direção harmônica compartilhada — centros e tríades entregues:** planos por seção deslocam juntos baixo e melodias; vozes sustentadas formam tríades diatônicas com inversões de menor movimento, enquanto o monitor expõe plano, grau, cifra e notas correntes. Próximo passo: comparar A/B com o mesmo histórico de lances e então acrescentar tétrades, extensões e graus preferenciais por estilo.
3. **Groove e articulação:** swing comum configurável, microvariações determinísticas de tempo/velocidade, notas fantasmas e fraseado de pergunta/resposta. Evoluir o vocabulário de timbres e articulações por evidência de escuta. Estudo de Manchester em `MUSIC_REFERENCE_GET_A_MOVE_ON.md`.
4. **Curadoria dos Estados e Eventos:** o preset completo já cobre os 26 gatilhos com intensidades proporcionais à frequência. A próxima rodada é escuta A/B por kit, simplificando ou desabilitando combinações que disputem espaço no arranjo.
5. **Curadoria e orçamento de áudio:** escutar formações de 1, 4, 8, 16 e 32 vozes e cheques, medir picos, densidade e custo em celular físico; comparar o eletrônico original, um kit contrastante e os sorteios. Ajustar limites antes de novos modos/loja/multiplayer.

O sorteio por cidade está implementado; os kits salvos continuam prioritários. A aleatoriedade serve à experimentação, sem substituir a curadoria dos estilos. A referência eletrônica original permanece acessível no Criativo.

### Próxima extensão: acordes e condução de vozes

O preset de reações atual usa somente ações que o runtime executa de fato: BPM, escala, relativa, modo, plano harmônico, transposição, contorno, variação, ganho, filtro e ativação. A tabela exata do comportamento entregue fica em `GAME_MECHANICS.md`.

O `HarmonyPlan` compartilhado e sua ação de reação já existem: escolhem centros em graus da escala por seção e preservam o material de cada voz. Final, saída das rainhas, formação mínima dos dois lados e promoção estreiam essa ação; captura e cheque permanecem mudanças locais/dinâmicas por serem frequentes.

A próxima camada deve representar acorde, voicing e notas-alvo separadamente do centro. Proteções propostas: intervalo mínimo entre modulações estruturais, condução com menor deslocamento possível, registros próprios por papel e prioridade para edição manual. Undo e saída da regra já reconstroem o plano devido sobre a base; essa propriedade precisa ser preservada.

A primeira regra tática coletiva ativa temporariamente a banda atacante durante cheque. O arraste suspende o loop da peça e toca por entrada em casa. Os widgets da partida agora reúnem transporte/código, execução por peça e tom/escala global; a entrada pelo mapa aproxima a câmera do pin antes da fase. Estados táticos mais complexos continuam sujeitos à validação musical da base.

## Modo Criativo (primeira bancada implementada)

O laboratório em `/creative` usa o mesmo `MusicRuntime` das partidas e abre sem introdução, adversário ou validação de movimentos. Ele permite ativar e solar qualquer uma das 32 vozes, mover ou trocar peças livremente, tocar casas temporariamente, editar o subconjunto seguro da mini-notation do Strudel e ajustar timbre, envelope, filtros, efeitos e os mapeamentos de posição para grau, pan e filtro.

O rascunho e kits nomeados são guardados no navegador. A exportação/importação JSON conserva todas as identidades e configurações e valida o schema e a compilação dos padrões antes de substituir a sessão atual. Persistência oficial, versionamento de kits, publicação e administração em banco ficam para a camada futura de conteúdo e contas.

### Ciclo atual: curadoria musical de Düsseldorf

Os trechos Strudel recebidos formam o corpus de referência. Cada trecho é descrito pelo papel que cumpre (groove, baixo, harmonia, melodia ou textura), separado em componentes reaproveitáveis e comparado no Modo Criativo. As construções que a engine ainda não representa geram requisitos concretos para o modelo, em vez de adicionarmos abstrações sem referência sonora.

O resultado desse ciclo será um kit eletrônico de referência com algumas formações testáveis, métricas simples de densidade/headroom e uma lista pequena de capacidades faltantes — por exemplo progressões harmônicas ou variação determinística. Só então ligaremos estados táticos mais complexos à música, para que esses estados transformem um arranjo que já soa bem em repouso.

As referências recebidas foram triadas em `STRUDEL_REFERENCE_CATALOG.md`. Nove adaptações iniciais de “Death By Elliptical Eye”, “Bennington” e “Bonespurs” estão em `lib/music/pattern-library.ts` e podem ser aplicadas a qualquer peça no inspetor.

A formação atual `Düsseldorf · Electro 01` expande a primeira `Elliptical Lab` para todas as 16 peças brancas no Criativo, com os instrumentos correspondentes espelhados nas pretas. A timeline A/B/C/B tem quatro ciclos por seção; a notação foi corrigida para `[0@4 1@4 2@4 1@4]/16`, pois a anterior alongava a forma por um fator de 16. Máscaras continuam editáveis, mas o preset atual permite ouvir cada voz ativa sem esperar uma entrada longa, inclusive a rainha.

Os quatro incrementos desta entrega:

1. **Fontes independentes das peças:** banco local `Chicken Electro · 01`, com 13 samples originais CC0, articulações e opção de seguir a escala. Rei com bumbo e peão com sino melódico foram verificados com o compilador Strudel real e no Criativo.
2. **Automações:** ganho, filtro, pan, reverb e delay aceitam padrões por seção ou curvas seno/rampa. O editor valida limites antes de aplicar; valores são lidos a cada ataque. Modulação contínua de uma nota sustentada e transposição em padrão ficam para outra etapa.
3. **Grooves compartilhados:** trilhas de ritmo e acentos coordenadas pela timeline, atribuíveis a qualquer peça. O editor cria grooves/trilhas e altera uma trilha para todas as vozes vinculadas. A execução usa `struct` e `pickRestart`, sem exigir `pickOut` nem atrelar a distribuição a peões.
4. **Feedback musical:** seção, compasso, pulso, notas/pausas e valores executados; distingue peça inativa, pausa do transporte, solo, carregamento e máscara. Os dados vêm dos padrões compilados e do relógio de áudio.

O JSON v4 conserva fontes, grooves e automações. **Salvar kit da fase** faz a próxima partida usar a configuração editada, guardada neste navegador. **Düsseldorf original · samples** permite comparar o preset novo sem sobrescrever automaticamente um kit salvo. Banco oficial, contas e sincronização entre dispositivos continuam futuros.

**Próximo passo:** ouvir este preset no Criativo e na fase em formações pequenas e completas, ajustar balanço, densidade e respostas entre as vozes, e medir um celular físico. Depois de aprovar essa base sonora, experimentar progressão harmônica global e transformações de frase por movimento; estados táticos avançados vêm depois dessa comparação.

### Estabilização para testes móveis

A primeira redução de custo mantém o agendamento de áudio completo e limita trabalho visual: pulsos do tabuleiro são amostrados a 8 Hz em aparelho restrito e 15 Hz no desktop; sliders agrupam recompilações em janelas curtas; o espectrograma desenha no máximo 24 quadros por segundo. Em tela estreita, toque ou aparelho com até quatro núcleos, a partida usa somente o worker de jogada do Stockfish, limita a profundidade efetiva da IA a 6 e não abre espectrograma/código automaticamente. A polifonia fica em 32 vozes nesses aparelhos e 64 nos demais. Uma mixagem densa recebe atenuação progressiva acima de dez loops para recuperar headroom.

Samples agora são carregados sob demanda e reutilizados; padrões de vozes sem mudanças e consultas visuais por ciclo usam cache. O monitor atualiza pequenos componentes em 100 ms no desktop e 150 ms em aparelho restrito, sem reconstruir o editor inteiro. Esta é uma otimização estrutural inicial para viabilizar a escuta. A rodada final de performance precisa medir aparelhos físicos depois que seções, samples, automações e interação estiverem definidas.

## 1. Direção e critério de prioridade

ChickenChess é um instrumento musical coletivo jogado em um tabuleiro e uma biblioteca mundial de música por lugar e época. Cada peça é um membro da banda. A música deve ser prazerosa de ouvir, expressiva de tocar e compreensível de explorar.

A prioridade é uma engine musical configurável, validada com um kit eletrônico em Düsseldorf. Loja, multiplayer, vestiário, expansão do mapa e novos modos aguardam essa validação. Generalidade será comprovada com configurações contrastantes no laboratório, sem produzir antecipadamente todo o catálogo.

Este plano substitui as prioridades anteriores do ROADMAP.md. Chicago como fase inicial, preços, plataforma de banco e modelo comercial do roadmap antigo são ideias históricas, não decisões vigentes.

Invariantes:
- Uma peça possui identidade estável, independente da casa, aparência, instrumento e tipo de movimento de xadrez.
- O loop da peça começa somente no primeiro movimento legal concluído. Selecionar não ativa seu acompanhamento.
- Uma peça capturada deixa de emitir novos eventos. Caudas têm liberação curta configurável; desligamento imediato fica disponível.
- Arrastar modifica uma camada temporária. Cancelar, soltar na origem ou tentar um lance ilegal restaura o estado anterior. Um movimento válido confirma apenas as transformações previstas para o lance.
- Decisão confirmada: pegar uma peça inativa inicia sua execução sonora temporária, permitindo conhecer e experimentar seu instrumento enquanto segura/arrasta, sem confirmar um lance. Ao cancelar, essa execução termina e a peça permanece inativa; ao concluir seu primeiro movimento legal, passa ao acompanhamento ativo. A audição deve representar o instrumento/padrão equipado.
- Todas as vozes afinadas consultam o contexto harmônico comum; percussões não afinadas não precisam receber notas.
- Todo parâmetro visível deve funcionar e explicar o valor efetivamente aplicado.
- Toda ação que altera música tem feedback visual associado à peça, ao controle ou ao transporte.

## 2. Três comportamentos de execução, sem três caixas rígidas de instrumentos

Conclusão: três comportamentos básicos são um bom ponto de partida, mas timbre, articulação e forma de execução precisam ser dimensões separadas. Synth é uma fonte sonora, não um comportamento: pode tocar bumbo, baixo sequenciado, acorde ou drone.

| Comportamento | Funcionamento | Exemplos | Controles específicos |
| --- | --- | --- | --- |
| Pulsos / ataques | Eventos discretos de um som, com altura opcional | Bumbo, caixa, chimbal, surdo, palmas, sílaba coral, pizzicato | Ritmo, acento, probabilidade, repetição, duração, escolha de articulação |
| Frases / sequências | Notas ou acordes organizados no tempo | Baixo, melodia vocal, piano, arpejo, metais | Graus, pausas, durações, contorno, oitava, acordes, inversões, legato, variação de frase |
| Sustentação / textura | Vozes mantidas ou renovadas em fronteiras musicais | Cordas, sopro longo, órgão, coral, drone | Gate, respiração, ataque/release, modulação contínua, voicing, transição de notas |

Uma definição pode combinar camadas: ataque de arco + corda sustentada; sílaba vocal + nota; chimbal aberto/fechado compartilhando grupo de corte. O sistema começa com composição desses comportamentos e uma interface de extensão, sem prometer que três presets reproduzem todos os instrumentos do mundo.

Dimensões independentes:
- Fonte: síntese, sample único, multisample afinado; futuras fontes entram por adaptador.
- Altura: não afinada, nota fixa relativa, graus da escala, acordes ou afinação personalizada.
- Polifonia: monofônica, polifônica, limite de vozes, prioridade de substituição.
- Articulação: ataque, envelope, gate, legato, portamento, acento, variantes de sample.
- Papel no arranjo: percussão, baixo, harmonia, textura, destaque. Orienta mixagem e espaço, sem determinar o tipo de peça.
- Interação: toque único, nota enquanto segura, arraste contínuo, retrigger ao entrar em casa, frase disparada.

Os defaults de kit seguem a intenção atual: peões/percussão, cavalos/baixo, torres/sopros e gaitas, bispos/teclas e synths, rei/cordas, rainha/canto e melodia principal. Cada kit pode substituir tudo isso.

## 3. Modelo de dados e separação de responsabilidades

Entidades propostas, serializáveis e versionadas:

| Entidade | Responsabilidade |
| --- | --- |
| PieceInstance | ID por partida, lado, papel de xadrez, casa atual, ativação, instrumento equipado e estado musical persistente |
| InstrumentDefinition | Nome, imagem fantasia, fonte sonora, capacidades, articulações, registro, controles, contexto educativo e referências de assets |
| PatternDefinition | Comportamento, estrutura temporal, notas/graus, acentos, variações e representação editável |
| MappingDefinition | Fonte de informação do jogo, transformação, destino musical, limites e política temporal |
| KitDefinition | Instrumentos/padrões por slot, regras de interação, defaults e imagens; aceita uma biblioteca de componentes reutilizáveis |
| StyleProfile | Gramática de groove, frases, densidade, harmonia, articulações e mixagem próprias do estilo |
| StageDefinition | Cidade, data ou intervalo, estilos, contexto histórico, kit sugerido e condições iniciais |
| SessionMusicState | Relógio, BPM, métrica, tônica, escala/afinação, harmonia atual, forma, seed e controles globais |
| PerformanceOverlay | Seleção, arraste e notas manuais temporárias, sem alterar a posição de xadrez |
| MatchEvent | Evento ordenado e versionado para replay: lance, captura, edição musical, contexto global e performance quando gravada |

Pipeline:

`xadrez → eventos e características → regras de mapeamento → estado musical resolvido → padrões Strudel → áudio e eventos visuais`

O transporte continua rodando enquanto o jogador pensa. Não depende da frequência de jogadas nem do render do React. O estado do tabuleiro não deve reconstruir o motor inteiro.

Strudel é o backend recomendado para padrões e reprodução, isolado por um adaptador. Confirmar sua adoção após um protótipo de interação e alinhamento com a licença AGPL-3.0 descrita na documentação oficial. O código mostrado deve representar o padrão executado. Remover a duplicação atual entre texto ilustrativo e motor paralelo é parte da migração.

A engine de domínio (peças, kits, estados, regras, presets e interação) é própria do ChickenChess. Strudel fornece a infraestrutura musical; Web Audio continua sendo a base de áudio no navegador. Validar disparo imediato, alteração de notas já sustentadas, cancelamento de vozes e preservação de fase. Se algum gesto exigir uma extensão nativa, integrá-la ao mesmo transporte e à mesma definição de instrumento, sem manter duas composições independentes. Fazer tudo do zero implica assumir sequenciamento, linguagem de padrões, síntese, efeitos e manutenção; só reconsiderar isso diante de requisitos ou incompatibilidades concretas.

Usar um registro de capacidades/parâmetros para gerar UI e validar valores: unidade, faixa, curva linear/logarítmica, passo, default, automação suportada, atualização imediata ou quantizada. Campos desconhecidos ou incompatíveis produzem erro explícito, não são silenciosamente ignorados.

## 4. Estados: dimensões simultâneas, características e eventos

Não criar um único enum como `ativa | ameaçada | selecionada`: uma peça pode satisfazer tudo isso ao mesmo tempo. Catálogo inicial extensível:

### Ciclo de vida
- Inativa: ainda não concluiu movimento.
- Ativa: já concluiu movimento e está no tabuleiro.
- Capturada: não agenda notas novas.
- Promoção: evento que muda o papel de xadrez; por default mantém ID e troca a configuração conforme política do kit.

### Interação local
- Não selecionada / selecionada.
- Segurada / arrastando; casa percorrida e deslocamento contínuo.
- Destino legal / ilegal / origem; cancelamento, perda de foco e término do gesto.
- Modo tocar habilitado; nota manual pressionada/solta.
- Painel em edição; controles bloqueados pelo usuário.

### Relações táticas simultâneas
- Atacada: contagem exata e IDs/tipos/valores dos atacantes.
- Atacando: contagem exata e IDs/tipos/valores dos alvos.
- Defendida / defendendo: relações com peças aliadas, definidas separadamente de captura legal.
- Atacando rei; atacando rainha; rei em xeque; xeque duplo.
- Cravada; bloqueada; mobilidade e alcance controlado.
- Opcional posterior: garfo, espeto, ataque descoberto, peça pendurada. Exigem definições verificáveis antes de expor controles.

Contagens não param em 3: presets podem agrupar 1, 2 e 3+, mas a informação original permanece. Distinguir casas atacadas geometricamente de lances legais; peças cravadas, peões e reis tornam essa distinção importante. Mobilidade fora do turno precisa de semântica explícita, sem adulterar o estado da partida para consultar movimentos.

### Características contínuas e históricas
- Coluna, fileira, distância ao centro, avanço relativo ao próprio lado.
- Mobilidade normalizada, quantidade de casas controladas, material aliado/oponente.
- Deslocamento horizontal/vertical, distância e direção do último lance.
- Número de movimentos da peça, tempo musical desde seu último movimento, capturas feitas.
- Distância aos reis e proximidade a peças relevantes, quando útil ao kit.

### Eventos transitórios
- Primeiro movimento, movimento, captura realizada/sofrida.
- Roque (rei e torre), en passant, promoção.
- Começou/terminou ameaça, começou/terminou xeque.
- Lance ilegal, seleção, entrada em casa durante arraste, cancelamento.
- Desfazer/refazer, reinício, mudança de kit e edição de parâmetro.
- Xeque-mate e empate são eventos/estados da partida. No xadrez normal o rei não é capturado. Crédito musical à peça do lance final pode existir sem inventar um estado de captura do rei.

### Estados expressivos derivados
- Neutro, excitado, tenso, destaque recente, resposta, resolução.
- São receitas musicais de kit, derivadas das informações acima; não fatos de xadrez mutuamente exclusivos.
- Destaque da última peça movimentada dura uma quantidade configurável de tempos/compassos, com entrada e saída suaves. Não manter ganho extra indefinidamente até outro lance.

### Sessão e transporte
- Preparação, tocando, pausado, encerrando, finalizado.
- Abertura/meio/final como características opcionais; lado da vez, resultado e tipo de empate.
- Seção/frase/compasso/tempo atual; mudanças harmônicas pendentes.
- Estados de mute/solo de mixagem são independentes do ciclo de vida e do destaque.

## 5. Regras configuráveis e resolução de conflitos

Uma regra declara: fonte → condição → transformação → parâmetro → duração → prioridade → quantização.

Exemplos:
- Avanço do peão → densidade entre limites → acrescentar ghost notes preservando ataques essenciais.
- Movimento lateral do cavalo → deslocar motivo por graus da escala → próximo compasso.
- Mobilidade do bispo → selecionar uma entre frases de complexidade crescente.
- Ameaça à rainha → variação de articulação por dois compassos.
- Rei em xeque → aumentar tensão de filtro/voicing; resolver suavemente quando sair do xeque.
- Arraste em coluna → filtro; fileira → grau/registro → overlay temporário.

Transformações: normalização, curva, faixa, limiar com histerese, tabela de escolha, soma, multiplicação, substituição, rotação, seleção ponderada com seed e duração musical. Restringir destinos às capacidades do instrumento.

Ordem proposta: preset → edições persistentes do usuário → mapeamentos habilitados → overlay de performance → limites finais e mixagem. Bloquear um parâmetro impede que mapeamentos automáticos o substituam. Cada destino declara como combina regras; empates de prioridade têm ordem estável. A UI mostra valor base, modulação, resultado e a causa.

Separar regras instantâneas de regras acumulativas. Uma transposição por movimento é aplicada uma vez pelo evento, não em cada render ou reavaliação da posição. Limitar registro evita que dezenas de movimentos empurrem a voz para fora da faixa útil.

Mudanças globais de BPM/escala passam por um árbitro comum, com limites e prioridade. Várias peças não podem disputar diretamente o relógio. No online, alterações compartilhadas seguirão política de permissões da sessão, ainda a definir.

## 6. Harmonia, groove e forma

- Contexto harmônico único: tônica, escala, afinação, registro de referência e acorde/progressão opcionais.
- Padrões armazenam graus e intervalos; conversão para frequência fica na execução.
- Distinguir semitom, tom e grau: avançar um grau não equivale sempre a subir um tom. A UI deve nomear a operação corretamente.
- Escala fixa inicial para Düsseldorf, mais um preset de progressão compartilhada para comparação. Modulações futuras alteram o contexto de todas as vozes afinadas na mesma fronteira musical.
- Notas sustentadas usam política explícita na troca harmônica: liberar, retunar suavemente ou manter a cauda. Início: liberar/rearticular na fronteira configurada.
- Afinacões/coleções personalizadas são extensão prevista; não limitar todo o catálogo mundial à maior/menor nem tratar categorias geográficas como um único ritmo.
- Ritmos e frases podem atravessar vários compassos, conter subdivisões, pausas, pesos e camadas. Não limitar o modelo a arrays de 16 passos.
- Padrões essenciais, respostas e ornamentos têm prioridades diferentes. Variação respeita densidade, registro e espaço entre vozes.
- Probabilidade reprodutível com seed por sessão/peça/ciclo. Humanização deve ser configurável e servir ao estilo; não adicionar jitter aleatório a toda bateria eletrônica.
- Delay em divisões musicais; groove e métrica compartilhados, com offsets por instrumento.
- Mixagem com headroom, limites de polifonia, buses de efeitos e proteção de saída. Capturas não devem aumentar automaticamente o volume das peças restantes de forma abrupta.

## 7. O que aproveitar de “A Certain Buzz”

O trecho fornecido sugere uma composição hierárquica: um seletor de seções (`song`), escolhas coordenadas de harmonia e frases, subdivisões e pausas dentro dos motivos, bateria complementar e articulação controlada. Isso é uma referência estrutural, ainda sem avaliação auditiva ou execução do trecho nesta etapa.

A harmonia do exemplo muda raízes e modos entre seções. Ela pode ser traduzida para um contexto global evolutivo; não equivale a manter uma única escala fixa durante toda a música.

Separar bd e sd em peões deve preservar o relógio e a posição na frase da bateria original. Não reiniciar cada padrão quando a peça se move. Uma peça que entra depois se encaixa na fase musical da sessão.

O texto colado contém escapes de formatação e ocorrências como `***2`; guardar o original como referência e normalizar/validar no runtime antes de assumir que é executável. Não alterar silenciosamente a intenção do autor.

O editor visual deve representar estrutura temporal, não só uma grade fixa: alternância entre ciclos, agrupamentos/subdivisões, repetição, duração/peso, pausas, acordes e bancos de frases. Começar com o subconjunto útil a Düsseldorf e ampliar pelo uso.

Não prometer conversão visual bidirecional de JavaScript Strudel arbitrário. Padrões estruturados têm edição visual e código gerado equivalentes; modo avançado guarda código autoral e expõe macros declaradas. Construções não suportadas visualmente permanecem em modo código sem perda ou simplificação silenciosa.

## 8. Interação sonora e modo tocar

Separar três ações:
- Selecionar: fixa o inspetor da peça; não muda o lance e não silencia a banda.
- Destaque: eleva temporariamente presença e elaboração após um lance, com orçamento de densidade/ganho.
- Solo de mixagem: ouvir apenas uma peça ou grupo por comando explícito.

Modo tocar é explícito para evitar conflito entre clicar uma casa para jogar xadrez e clicar para tocar uma nota. No modo normal, casas válidas efetuam lances. No modo tocar, casas vazias são pads/notas da peça selecionada; tecla/botão retorna a mover. Funciona com mouse, teclado e toque.

Políticas por instrumento: percussão escolhe articulação/intensidade; frase afinada escolhe grau e registro; sustentação mantém gate até soltar. Arraste temporário pode filtrar a voz existente ou disparar notas por entrada em casa, com limite de retrigger. Nenhum gesto toca indefinidamente após cancelamento/perda de foco.

Performance manual local pode ser imediata; transformações estruturais do acompanhamento são quantizadas. Solo manual de peça ainda inativa não inicia seu loop. O comportamento de fundo durante improviso (continuar, reduzir ou suspender sua frase) é configurável.

## 9. Interface de experimentação e feedback

Inspetor persistente identifica peça, instrumento, estado, origem do preset e participação no arranjo. Não fecha quando a IA joga; acompanha o ID se a peça mudar de casa. Se capturada, mostra o estado e permite inspeção, sem continuar o loop.

Áreas:
1. Performance: ganho, mute, solo, intensidade, oitava e macros do instrumento.
2. Som: fonte, articulação, envelope, filtros, efeitos e polifonia conforme capacidades.
3. Ritmo/frase: grade e editor de graus/durações, alternâncias, acentos, probabilidade, frases A/B e cursor.
4. Comportamento: regras de posição, movimento, ameaça, captura e interação; ativar/desativar e bloquear controles.
5. Código: execução real, validar/aplicar, erro localizado e última versão válida.
6. Presets: salvar cópia, nomear, comparar A/B, restaurar, exportar/importar e histórico de edição separado do undo de xadrez.

Knobs também terão campo numérico, unidades, teclado e toque. Filtros usam escala logarítmica. UI distingue “aplicado agora” de “entra no próximo compasso”.

Feedback deriva dos mesmos eventos agendados para áudio, alinhado ao tempo de reprodução e considerando latência, não de timers decorativos. Cada nota pulsa na peça; duração pode aparecer como halo; intensidade e timbre usam sinais distintos; casa tocada mostra grau/nota; arraste mostra valor temporário; ameaças indicam a modulação ativa. Prever redução de movimento e comunicação que não dependa só de cor. Não desenhar todas as relações táticas permanentemente.

## 10. Kit inicial de Düsseldorf

Proposta para teste, não reconstrução histórica definitiva:
- Peões: bumbo, caixa, chimbal fechado/aberto, clap, tom, rim e percussão eletrônica; funções complementares entre os lados.
- Cavalos: baixo monofônico, com opção supersaw filtrada e alternativa simples para comparação.
- Torres: synth de sopro/metais com frases de resposta.
- Bispos: teclas/synth sequenciado e arpejado.
- Rei: cordas sintetizadas sustentadas.
- Rainha: melodia principal sintetizada, com variante vocal/vocoder quando houver asset apropriado.

Começar com BPM sugerido pela fase atual e testar alternativas; o exemplo a 175 BPM é referência de organização, não obrigação de tempo ou estética.

A ativação por primeiro movimento e o silêncio por captura são preservados mesmo se uma abertura demorar a trazer o baixo ou o rei. Compor padrões que funcionem em formações incompletas; não criar instrumentos invisíveis para preencher automaticamente a banda. Um backing track só existirá como opção explícita futura.

## 11. Etapas de implementação e portas de validação

### Etapa 0 — referência e diagnóstico reproduzível
- Preservar comportamento atual para comparação; corrigir erros de TypeScript que impedem validação.
- Executar e ouvir a referência Strudel normalizada.
- Criar cenários reproduzíveis: poucas peças, banda densa, captura, arraste cancelado, xeque, roque, promoção, en passant e undo/redo.
- Criar laboratório com peças reais e controles para comparar presets; simulações não mudam regras da partida real.

### Etapa 1 — transporte e integração real do Strudel
- Inicialização pelo gesto do usuário, carregamento de assets, start/stop idempotentes e descarte de vozes.
- Um relógio comum; atualização de padrões preserva fase; BPM e mudanças harmônicas com fronteira explícita.
- Adaptador com agendamento de feedback visual, tratamento de erro e manutenção do último padrão válido.
- Carregar dependências/assets de forma que vs IA possa funcionar sem rede após instalação/cache previsto; “vs IA” e “sem conexão” serão testados separadamente.
- Validar timing, pausa, CPU sob interação e mixagem antes de ampliar timbres.

### Etapa 2 — vozes persistentes e modelo configurável
- IDs das peças, três comportamentos, definições de instrumento/kit e registro de parâmetros.
- Ciclo inativa/ativa/capturada; roque, promoção, en passant; snapshots/eventos restauram estado musical no undo/redo.
- Contexto tonal comum e separação entre estado confirmado e overlay temporário.
- Prova de generalidade no laboratório: percussão, baixo sequenciado e voz sustentada; trocar timbre/papel por configuração.

### Etapa 3 — composição do kit eletrônico
- Construir motivos complementares e variações em vários compassos.
- Testar movimentos como transformações limitadas, harmonia comum, destaque temporário e tensão/resolução.
- Ajustar densidade para até 32 vozes potenciais sem descartar arbitrariamente peças ativas.
- Comparar regras isoladamente antes de acumular modulações.

### Etapa 4 — tocar, arrastar e editar em tempo real
- Gestos reversíveis, modo tocar explícito e feedback sincronizado.
- Inspetor por capacidades, sequenciador inicial, notas/graus, controles globais e mapeamentos.
- Presets locais, A/B, travas, exportação/importação e código real.

### Etapa 5 — validação musical conjunta (obrigatória)
- Ouvir e jogar aberturas diferentes, partidas lentas, partidas longas e finais com poucas peças.
- Comparar groove fixo/variável, escala fixa/progressão e transformações por direção/mobilidade.
- Critérios subjetivos com o usuário: vontade de continuar ouvindo, groove reconhecível, evolução sem fadiga, contribuição identificável de cada peça e prazer de improvisar.
- Critérios técnicos: todos os controles afetam o destino certo; cancelamento restaura o estado; captura encerra novos ataques; editar não reinicia o transporte; contexto harmônico compartilhado; replay reconstitui decisões musicais.
- Não declarar “música boa” apenas porque testes passam. Só avançar para produto amplo quando a experiência auditiva for aprovada pelo usuário.

### Etapa 6 — autoria e catálogo oficial
- Evoluir o editor local para admin: rascunho → validação de schema/assets/padrões → audição → publicação versionada.
- Banco de definições separado de inventário/propriedade dos usuários. Conta possui referência ao item, não código duplicado.
- Salvar nomes, imagens fantasia, créditos, referências culturais, versões, dependências e compatibilidade.
- Partidas fixam versões para preservar replay. Código autoral local não vira automaticamente código oficial executado por todos.
- Escolher banco e infraestrutura quando esses fluxos estiverem comprovados. Não implementar loja antes de autoria e compatibilidade.

### Etapa 7 — modos, multiplayer e vestiário
- Classic Chess: regras/objetivo convencional, vs IA e posteriormente online.
- ChickenChess: proposta cooperativa/invertida; dar mate faz perder, empate recompensa ambos, longevidade e marcos musicais geram ovos de ouro.
- Definir antes de implementar: abandono, desconexão, timeout, repetição, regra dos lances sem captura/peão, empate automático, acordo de encerramento e limites de farm. Regras legais e condições de término podem diferir por modo, explicitamente.
- “Ganhar perde” precisa de distinção entre resultado de xadrez e recompensa do modo; não inferir que abandonar concede a mesma recompensa.
- Bônus candidatos: dez jogadas sem captura; esclarecer se jogada é um lance individual ou par de lances. Definir distribuição dos ovos em vitória invertida/empate e limites antes da economia.
- Vestiário equipa instrumentos/aparências conquistados em slots legais. Mistura de kits precisa de contexto musical, registro e orçamento de densidade comuns.
- Online sincroniza eventos, versões, seed e tempo musical; cada cliente sintetiza localmente. Definir compensação de relógio/latência, fronteiras futuras para mudanças comuns, reconexão e política para performance manual remota. Determinismo musical não promete áudio idêntico bit a bit entre dispositivos.
- Separar gestos locais exploratórios de mudanças compartilhadas para que o arraste de um usuário não sobrescreva silenciosamente a música do outro.

### Etapa 8 — mundo e história musical
- Lobby com mapa e slider temporal, fases por cidade/intervalo histórico e conexões entre tradições.
- Conteúdo educativo por instrumento, padrão e estilo; curadoria e atribuição, sem reduzir continentes/países a um único gênero.
- Catálogo de interesse registrado: alternative, escola de samba, blues, orquestra clássica, country, dance, electronic, hip-hop, jazz, pop, ópera, MPB, rock'n'roll, metal, post-rock, reggae, anime, trip-hop, industrial, minimal, folk, tradições chinesas, tradições africanas, funk e new age. São categorias iniciais heterogêneas a organizar; duplicatas removidas, sem perder a intenção.
- Loja, progressão, conquistas e monetização serão definidos depois; não adotar automaticamente valores do roadmap antigo.

## 12. Decisões abertas para os experimentos

- Articulação da audição confirmada ao pegar peça inativa: execução temporária do padrão e resposta ao arraste conforme o instrumento; ajustar entrada/saída e retrigger, preservando a descoberta sonora antes do primeiro lance.
- Duração/força do destaque recente e sua relação com a improvisação manual.
- Escala fixa versus progressão global e quais fatores podem modulá-la.
- Mapeamentos por direção: graus, rotação rítmica, registro ou seleção de frase.
- Caudas após captura e restauração temporal no undo: transporte deve continuar por default, estado musical volta ao snapshot.
- Alcance do editor visual inicial e macros expostas pelo modo código.
- Política musical entre os lados: timbres complementares, variação do mesmo kit e mistura de kits.

Essas decisões são variáveis de laboratório. Não bloqueiam a definição de IDs, eventos, transporte, configurações versionadas e camadas temporárias.

## 13. Referências técnicas consultadas

- Integração Strudel: https://strudel.cc/technical-manual/project-start/
- Mini-notation e estrutura temporal: https://strudel.cc/learn/mini-notation/
- Funções tonais: https://strudel.cc/learn/tonal/
- Referência musical fornecida pelo usuário: “A Certain Buzz”, atribuição no trecho a eefano; ainda requer normalização e execução antes de usá-la como fixture técnica.

A v0.3.2 inclui catálogo compartilhado de 19 nomes de escalas (Aeolian equivale à menor natural), opção de espera por compasso por regra e indicadores de pendência. O agendamento agora usa diretamente o relógio de áudio; afinações além de 12-TET e menor melódica dependente da direção ainda são futuras.

Entregue neste ciclo: scheduler por AudioContext com fila em limites de compasso, rampas de BPM 0–16 compassos e visualização de transições; seleção A–H e editor de notas com mouse, duração independente e grade binária/ternária no Criativo; centros harmônicos compartilhados, tríades diatônicas e condução curta entre seções. Próxima etapa de composição: graus preferenciais por estilo, tétrades/extensões e arranjo adaptativo. Editor touch, gramáticas melódicas e modulações harmônicas preparadas continuam futuros.
