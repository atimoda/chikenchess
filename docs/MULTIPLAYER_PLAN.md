# 1v1 casual online — plano de implementação

Atualizado em 04/10/2026 — v1.0.0. A base de contas, salas, amizades, partida e parâmetros online foi implementada neste checkout. Migrações e três Functions estão instaladas no projeto ChickenChess, e os fluxos de visitante/partida passaram por testes com sessões reais; Google foi habilitado e seu vínculo local passou pelo teste do usuário; SMTP e publicação do site continuam em configuração. O comportamento atual está em `GAME_MECHANICS.md`, e as evidências/etapas restantes em `docs/ONLINE_SETUP.md`. Este documento conserva o planejamento e a pesquisa de infraestrutura; propostas históricas não substituem as decisões implementadas.

Na primeira entrega, visitantes podem jogar; não há relógio; as cores são sorteadas e cada pessoa fica embaixo na própria tela. O kit do host fornece a forma/harmonia/regras comuns. Undo/Redo operam até o resultado confirmado, que é definitivo; vitória credita o perfil sem conquistar cidade da campanha. Stockfish e a classificação dos lances são locais nesta estreia casual, com legalidade, custos, versões e liquidação validados pelo backend. Chat e plataforma permanecem futuros.

## Escopo definido

- Somente ChickenChess, com o nome **1v1 casual**. Clássico, Ranked e outros modos ficam para depois.
- Salas públicas e privadas, lista pública ao vivo, entrada por ID e link de convite.
- Duas pessoas; a partida começa depois de ambas clicarem em **Começar**.
- Freeze, Shield, Best/Worst, recompensas e Undo continuam como recursos do ChickenChess; Undo retorna à vez de quem usou, desfazendo também a resposta adversária se já aconteceu, sem pedido de autorização.
- Cada participante só pode usar seus poderes na sua vez. Os efeitos são iguais por papel de aplicador/adversário, independentemente da cor.
- Clicar Best ou Worst mostra o mesmo conjunto de sugestões aos dois participantes, mesmo com a sincronização de parâmetros musicais desligada.
- Mesma composição base reagindo aos mesmos lances, áudio gerado em cada aparelho, sem obrigação de alinhar pulso/fase entre aparelhos.
- Sincronização opcional de parâmetros musicais de peças, com preferência individual de recebimento; Mixer inteiramente local nesta primeira versão.
- A sincronização do arraste de peças saiu da primeira entrega. Arrastar e tocar peças continuam locais; só o lance confirmado chega ao outro jogador. Não mostrar o checkbox Sincronizar movimentos livres nesta versão.
- Cada pessoa escolhe o kit da própria equipe no lobby. A composição reúne as duas escolhas.
- A seleção de kit traz instrumentos, notas e parâmetros das peças; forma e regras musicais são comuns para o tabuleiro.
- Com sincronização musical ativa, cada pessoa altera apenas o kit de suas peças. Piece Params da equipe adversária mostra cadeado e bloqueia edição.
- Com sincronização musical desativada, a pessoa pode editar ambos os kits em sua experiência local.
- Play/Pause pausa apenas a música; o próximo lance confirmado de qualquer participante retoma a reprodução local.
- Restart sai do menu online. Desistir/oferecer empate ficam no popup do botão do globo.
- Derrota mostra **Pedir revanche**; vitória mostra **Convidar para uma nova partida**.
- Entrada online conserva cidade/ano/estilo, fotografia de fundo e revelação do tabuleiro, omitindo as frases de introdução da campanha.
- Google e email com código de acesso; preservar o perfil visitante ao criar uma conta. Popup de Golden eggs do globo mostra **Sign in to save your profile** quando não houver conta permanente conectada.
- Adicionar amigo faz parte da primeira entrega, por pedido de amizade e aceite do destinatário, conforme resposta do usuário.
- Base recomendada para a primeira entrega gratuita: Next.js exportado como site estático no Cloudflare Pages Free; Supabase Free para Auth/Postgres/Realtime/Edge Functions; Brevo Free para SMTP dos códigos. Servidor Colyseus pertence à avaliação do futuro modo de plataforma.
- Chat fica fora da primeira versão online e entra na versão online seguinte, por decisão do usuário.
- Haverá também um modo de plataforma 2D com vários jogadores por partida e sincronização rápida. Não pertence à primeira entrega; quantidade máxima de jogadores e regras ainda não foram definidas.

## Escolha inicial com planos gratuitos — revisão de 04/10

Esta revisão substitui a recomendação anterior de acrescentar servidor de jogo por causa dos arrastes. A estreia reúne 1v1 casual, contas/perfil, salas, parâmetros musicais confirmados e amizades com aceite. Chat permanece na versão online seguinte; plataforma 2D fica para depois. Não instalar Colyseus, canal de ponteiro remoto ou interface de chat nesta etapa.

| Serviço | Uso na primeira entrega | Plano/cotas verificadas |
| --- | --- | --- |
| Cloudflare Pages Free | Frontend estático Next.js e assets de foto/áudio/engine; atualizações online são buscadas pelo navegador | Sem mensalidade; entrega estática com requests/bandwidth sem medição anunciados, 500 builds/mês, até 20 mil arquivos e 25 MiB por arquivo |
| Supabase Free | Google/email, visitante, perfil, amigos, salas, estado/eventos, permissões e atualização ao vivo | Sem mensalidade; 50 mil MAU, 500 MB de banco, 5 GB de egress, 200 conexões de Realtime, 100 eventos/s e 2 milhões de mensagens/mês; pode pausar após uma semana sem atividade |
| Supabase Edge Functions Free | Comandos que precisam executar as regras TypeScript e gravar um resultado autorizado | 500 mil invocações/mês; CPU máxima de 2 s por chamada e memória de 256 MB |
| Brevo Free via SMTP | Código de login do Supabase, com template próprio | Sem mensalidade; 300 emails/dia, após ativação do envio; inclui rodapé Sent with Brevo |

A mensalidade pode começar em **US$ 0**, dentro das cotas, usando domínio de email já existente. O frontend pode usar `*.pages.dev`; configurar/autenticar o remetente e o domínio no Brevo, com acesso ao DNS. Compra de domínio não faz parte dessa gratuidade. O SMTP padrão Supabase não atende login público: é para a equipe e atualmente tem limite de dois emails/hora.

Brevo substitui Resend na seleção inicial porque seu Free oferece 300 envios/dia; Resend Free oferece 100/dia e 3 mil/mês. A troca é somente de SMTP, sem alterar Google, OTP ou identidade no Supabase. Brevo exige aprovação/ativação de envio e inclui seu rodapé no Free. O limite diário não acumula, e emails transacionais excedentes podem ficar em fila: acompanhar a cota e tratar a indisponibilidade no fluxo de código, em vez de depender de entrega posterior de um código já expirado. Resend segue alternativa caso o rodapé ou a ativação não sejam adequados; não somar cotas de dois serviços como garantia de login público.

As páginas atuais são predominantemente cliente, com rotas conhecidas, uso de query string e imagens já desotimizadas em `next.config.mjs`; não há Route Handlers ou consumo de `next/headers` nessa base. Isso favorece exportação estática preservando Next/React, em vez de migrar o framework para vinext ou abrir um servidor Next permanente. Validar `output: "export"`, manifest, refresh direto de `/creative`, convites por query string, retorno OAuth e assets no build real antes do deploy; inspeção do código não confirma o build de exportação. Analytics precisa de configuração compatível com a hospedagem escolhida.

Backend fica separado do site estático. Extrair regras puras preservando chess.js 1.4.0 e o contrato de poderes; executar o domínio em Edge Functions Deno/TypeScript e concluir a gravação por RPC/transação Postgres. Conservar IDs de comando, versão esperada, autorização, permissões e efeitos econômicos atômicos. Consultas limitadas e operações sociais simples podem usar APIs/RPCs com políticas de acesso; não encaminhar toda leitura por uma Function. A conta não exige SSR nesta versão: usar `@supabase/supabase-js`, com sessão e retorno OAuth no cliente; não acrescentar `@supabase/ssr` sem necessidade de runtime servidor.

Não publicar snapshots musicais completos a cada lance. Anunciar evento/versão mínima; carregar contexto inicial e recuperar lacunas por consulta autorizada. Parâmetros musicais enviam alterações confirmadas, com controles contínuos agrupados e valor final ao concluir a edição. Limitar payloads ao plano escolhido, dividir contexto inicial quando necessário e manter fotos/samples no CDN estático. Assinar diretório e amigos só quando a interface correspondente precisar deles; presença não grava heartbeat constante no banco. Stockfish pesado continua candidato a processamento no navegador, não nas Functions com CPU limitada; a estreia aceita a classificação local com os limites descritos em Regras, análise e economia.

### Gratuidade e a meta de 300 simultâneos

A meta informada antes, **300 jogadores simultâneos em média durante 24 h/dia**, não foi cancelada. Ela não cabe nessa configuração gratuita: já excede as 200 conexões de Realtime. Mesmo sem arrastes, o exemplo de 150 partidas com um lance a cada 20 s produz 58,32 milhões de mensagens Broadcast/mês e 19,44 milhões de comandos, antes de poderes, parâmetros, amigos e reconexões. As cotas Free são 2 milhões de mensagens e 500 mil Functions/mês. Trocar Broadcast por duas entregas de Postgres Changes reduziria a conta de lances para 38,88 milhões de mensagens, ainda além da cota.

Recomendação: lançar e validar em planos gratuitos com volume inicial medido; acompanhar mensagens, Functions, bytes de banco/egress e envios de email e recalcular antes de chegar às cotas. O teto de conexões é de pico, não uma promessa de 200 pessoas jogando o mês inteiro gratuitamente. Não prometer operação gratuita de 300 simultâneos nem uma quantidade média segura sem medir duração das partidas e ações musicais. Crescer depois mantém contas/dados e permite atualizar plano ou transporte quando houver evidência, sem implementar a plataforma de forma antecipada.

## Próximas entregas e arquitetura para jogo rápido

O chat não muda a recomendação de Supabase para contas, perfil e dados persistentes. Já o modo de plataforma exige outra responsabilidade: simular movimento, colisões e ações continuamente. A recomendação revisada é Supabase como base do produto e um servidor de jogo dedicado para esse modo. Isso é planejamento, não infraestrutura já criada nem decisão de contratar hospedagem.

| Responsabilidade | Proposta |
| --- | --- |
| Google/email, vínculo do visitante, perfil, ovos e pontos | Supabase Auth/Postgres e comandos autorizados do backend |
| Diretório de salas, amizades e estado durável do 1v1 casual | Supabase/Postgres, com Realtime para notificações e alterações confirmadas |
| Chat da próxima versão online | Postgres para mensagens confirmadas e Realtime para entrega, com acesso limitado aos participantes da conversa |
| Plataforma 2D: inputs, movimento, colisões e estado em execução | Processo Node/TypeScript dedicado, inicialmente avaliar Colyseus |
| Resultados e recompensas da plataforma | Servidor de jogo confirma o resultado; backend grava uma única liquidação no Postgres |

### Chat — versão online seguinte

O usuário confirmou a existência e a etapa do chat, mas não seu alcance. Proposta inicial: texto no lobby e na partida, por sala; chat global, mensagens privadas, anexos e voz dependem de outra decisão. Definir interface, retenção e permissões nessa etapa.

Mensagem confirmada tem ID, conversa/sala, autor autenticado, texto e horário do servidor. Reenvio não cria outra mensagem; reconexão recupera o histórico permitido. O envio confirmado passa pelo backend/políticas de acesso; não confiar num Broadcast enviado pelo cliente como autoria ou histórico oficial. Indicador de digitação, se adotado, é transitório. Preparar identidade e autorização de participantes na primeira entrega; não instalar a interface nem implementar mensagens agora.

### Plataforma 2D — simulação dedicada

Colyseus é um framework aberto para Node.js, com salas, sincronização de estado e SDK JavaScript/TypeScript. A documentação atual oferece passo fixo, previsão local, reconciliação e interpolação no cliente. É um candidato compatível com a stack; validar a versão escolhida, o motor de física e o comportamento sob atraso antes de fechar a adoção.

- O cliente envia intenções de controle, como direção e pulo. O servidor calcula movimento, colisões, ações e resultado; posição declarada pelo cliente não vira autoridade.
- Simulação, envio de snapshots e renderização têm frequências distintas. Hipótese inicial para medir: simulação de 30 ou 60 passos por segundo e snapshots de 10–20 por segundo; não são requisitos já aprovados nem garantia de capacidade.
- Previsão local permite resposta imediata do personagem; reconciliação corrige divergências pelo estado confirmado. Interpolação suaviza os demais personagens. A física compartilhada precisa ser adequada à repetição dos inputs; a biblioteca não escolhe as regras do jogo.
- WebSocket é uma primeira opção para o protótipo de navegador. Não equivale ao transporte UDP de um FPS; medir RTT, variação de atraso, perdas e recuperação. Recursos de WebTransport do Colyseus são experimentais, e só devem ser considerados após avaliar suporte e necessidade.
- Cada partida tem um processo/instância de sala responsável por seu estado vivo. O diretório persistente é uma projeção desse ciclo de vida, não uma segunda autoridade de movimento ou ocupação. Escalar entre salas e escolher região próxima aos jogadores; não prometer que uma sala arbitrariamente grande cabe num servidor pequeno.
- O servidor valida a sessão Supabase e a admissão na sala; integrar a verificação do JWT corretamente, sem criar outra conta para o mesmo jogador. Autenticação e autorização acontecem na entrada/renovação conforme a política de sessão, não por consulta ao banco a cada passo.
- Posições e inputs contínuos ficam em memória/canais do servidor. Banco recebe metadados, checkpoints quando necessários e resultados; não gravar cada frame. Retomada após queda e registro de replay precisam de contrato próprio.

A primeira entrega de xadrez conserva comandos/eventos separados da apresentação e do transporte. Isso permite acrescentar o modo de plataforma e compartilhar identidade/diretório sem migrar seus dados persistentes nem carregar a simulação rápida nas transações de lances. Não migrar o 1v1 para Colyseus apenas para antecipar um modo ainda não implementado.

### Limites e custo da separação

Consultado em 04/10/2026. Supabase Broadcast já envia mensagens de baixa latência por WebSocket sem exigir uma gravação por gesto. O motivo para acrescentar um servidor de jogo é a simulação autoritativa contínua, o controle de distribuição e o perfil de consumo; não afirmar que Supabase só funciona por polling ou é incapaz de mensagens rápidas.

As cotas atuais de Realtime incluem 100 eventos/s no Free e 500 eventos/s no Pro com spend cap, por projeto; Pro sem spend cap anuncia 2.500 eventos/s. A cota mensal é 2 milhões de mensagens no Free e 5 milhões no Pro; excedentes pagos custam US$ 2,50 por milhão, em pacotes inteiros. Limites são configuráveis conforme plano/suporte, e não estabelecem uma taxa máxima universal por partida.

Broadcast contabiliza uma mensagem de envio e uma por destinatário. Exemplo apenas para estimar ordem de grandeza: um snapshot de sala enviado 20 vezes/s e recebido por oito clientes contabiliza 180 mensagens/s ou 648.000 em uma hora, antes de inputs, chat e presença. Agrupamento, filtros de interesse e redução de frequência mudam esse consumo. Número de jogadores cadastrados não substitui medição de partidas simultâneas e tráfego.

Colyseus aberto é gratuito sob licença MIT; hospedagem é cobrada separadamente. Colyseus Cloud anuncia entrada a partir de US$ 15/mês, com provisionamento por instância; isso não promete capacidade ilimitada do servidor. Supabase Pro começa em US$ 25/mês. A combinação dos pisos anunciados seria US$ 40/mês, antes de necessidades adicionais de compute, uso, email e hospedagem do frontend; Supabase Free com servidor de jogo pago também é uma combinação possível. Não há necessidade de contratar o servidor de plataforma para lançar o primeiro 1v1.

Antes do modo de plataforma: fixar máximo de jogadores por sala, ações/física e regiões pretendidas; prototipar, medir com várias salas e rede degradada e só então dimensionar hospedagem. Continuam abertas a modalidade competitiva/cooperativa e a data dessa entrega.

### Referência de custos do cenário anterior: 300 simultâneos e tráfego frequente

Esta comparação antecede a retirada de arrastes da estreia. Serve para avaliar crescimento/modo de plataforma; não é o orçamento da nova primeira entrega gratuita. A escolha atual e suas cotas estão em Escolha inicial com planos gratuitos.

O usuário confirmou média de **300 pessoas simultâneas**, durante o dia inteiro. Um mês-modelo de 30 dias tem 2.592.000 segundos e corresponde a 216.000 horas de participação. Essa média não determina picos, usuários únicos mensais, quantidade de logins por email nem downloads de assets.

Orçamento estimado naquele cenário de arquitetura combinada: cerca de **US$ 300/mês**, com faixa de planejamento de **US$ 150–600/mês**, em uma região, com jogadores distribuídos em salas e tráfego frequente de jogo/arrastes fora do Supabase Realtime. É uma hipótese de dimensionamento, não preço contratado ou capacidade medida. Análise Stockfish permanece nos navegadores neste modelo; centralizá-la altera o custo de CPU.

| Item | Faixa mensal usada no orçamento |
| --- | --- |
| Supabase Pro, compute/dados e volume moderado de chat/notificações | US$ 25–100 |
| Servidor de jogo/gestos em Colyseus Cloud | US$ 50–240 |
| Vercel Pro, frontend/CDN e uso adicional moderado | US$ 20–120 |
| Email transacional, até 50 mil envios/mês no plano Pro do Resend | US$ 0–20 |
| Reserva para uso adicional dentro das hipóteses | US$ 50–90 |

A soma dessa reserva de orçamento vai de US$ 145 a US$ 570, arredondada acima para facilitar planejamento. Os preços-base são verificáveis; os intervalos de uso são estimativas. O simulador Colyseus para São Paulo mostra 2 vCPUs compartilhadas/4 GB por US$ 50, 2 vCPUs dedicadas/4 GB por US$ 120 e 4 vCPUs dedicadas/8 GB por US$ 240, em instância única. Não traduzir automaticamente esses recursos em 300 jogadores suportados: física, colisões, passos de simulação e concorrência precisam de teste de carga. Cluster horizontal anuncia adicional de US$ 100/mês; múltiplas regiões e redundância não estão incluídas neste modelo.

Vercel Pro custa US$ 20/mês; a tabela de Flat Rate CDN inclui 1 milhão de requests/1 TB, e mostra tiers adicionais de US$ 20 para 10 milhões/50 TB e US$ 100 para 50 milhões/50 TB. Esses adicionais explicam a faixa do frontend; funções e outros recursos seguem cobrança própria. Supabase Pro inclui 100 mil usuários ativos mensais antes de cobrança adicional de Auth. Resend Free tem 3 mil emails/mês e 100/dia; Pro tem 50 mil por US$ 20, com excedentes. O orçamento pressupõe manter-se nessas faixas de autenticação/email e uso web normal, sem códigos reenviados para cada partida. Valores em dólares, antes de impostos/câmbio; domínio existente, desenvolvimento e trabalho de operação não entram como mensalidade de infraestrutura.

Comparação de tráfego, usando os preços atuais de US$ 2,50 por milhão excedente a 5 milhões no Pro, arredondamento por pacote, mais US$ 25 do plano:

- **Xadrez somente lances:** 150 salas, um lance por sala a cada 20 s e um Broadcast de envio mais duas entregas por lance: 22,5 mensagens/s, 58,32 milhões/mês e **US$ 160** em plano/mensagens. Não inclui gestos, poderes, música, chat, presença, compute extra nem hospedagem.
- **Xadrez com arrastes:** no mesmo exemplo, 5% dos 300 jogadores arrastando em média, 10 updates/s por gesto, envio mais uma entrega: acrescenta 300 mensagens/s. Total 322,5/s, 835,92 milhões/mês e **US$ 2.102,50** em plano/mensagens, antes dos outros eventos e serviços. A proporção de tempo em arraste é hipótese, não medição.
- **Plataforma via Broadcast:** exemplo de salas com oito jogadores, 20 snapshots/s recebidos pelos oito, envio mais entregas: 6.750 mensagens/s para 300 simultâneos, 17,496 bilhões/mês e **US$ 43.752,50** em plano/mensagens, sem inputs e demais custos. Esse tráfego também supera o limite padrão de 2.500 eventos/s do Pro sem spend cap; precisaria negociar capacidade. É conta teórica, não confirmação de que esse plano permite a carga.

Para operar nessa escala, reavaliar plano e transporte quando houver consumo medido. A proposta anterior de servidor adicional para gestos não se aplica à estreia sem sincronização de arraste. Guardar identidade, persistência e idempotência no mesmo contrato; não criar duas autoridades para o estado do xadrez. A validação inicial usa a configuração gratuita acima, sem implementar ou migrar para o modo de plataforma nesta rodada.

## Base atual e diferenças encontradas nos poderes

Entradas relevantes: `components/world-map.tsx`, `components/chess-game.tsx`, `components/chessground-board.tsx`, `hooks/use-power-targeting-gesture.ts`, `hooks/use-music.ts`, `lib/game-progression.ts`, `lib/chess-powers.ts`, `lib/powered-chess.ts` e `lib/music/`. Localização e testes: `docs/CODEBASE_MAP.md` e `tests/README.md`; mecânica atual: `GAME_MECHANICS.md`.

A partida atual fixa a pessoa nas brancas e o bot nas pretas. O perfil é um save em cookie/localStorage, sem identidade de conta, e o nome mostrado é fixo. A interface, análise, Undo e aplicação de poderes pressupõem esse arranjo.

A observação anterior sobre diferenças de poderes precisava ser mais precisa. O primeiro levantamento encontrou os pontos abaixo; os dois casos de Shield foram corrigidos na base de regras nesta alteração:

- **Freeze:** os efeitos sobre saída, ameaça e captura já são descritos por equipe. O prazo varia conforme alvo próprio/adversário, não por uma regra intrínseca de branco contra preto.
- **Shield e rei:** `lib/powered-chess.ts` relaxa a segurança de casas atacadas somente para o rei branco protegido. O rei preto continua sujeito à legalidade comum. O comentário explica que isso evita o bot terminar numa posição inválida quando a proteção expira após sua própria jogada.
- **Shield e casa vazia:** `lib/chess-powers.ts` bloqueia entrada na casa protegida na jogada de expiração especificamente para movimentos pretos.
- **Capturas com Shield:** impedir capturas pela peça protegida e contra ela já vale para ambas as cores.
- **Acesso:** o controlador e o gesto só deixam aplicar poderes na vez das brancas; o bot não usa os botões.

Diagnóstico executado antes da correção: rei branco protegido podia fazer e1→e2 numa coluna atacada por torre; posição espelhada com rei preto protegido não permitia e8→e7. Uma chamada ao filtro de poderes também permitia entrada branca em casa vazia protegida e bloqueava a preta na meia-jogada de expiração. São diferenças verificadas, não apenas nomes internos.

### Adaptação implementada na base de poderes

Cada poder novo registra `appliedBy`, derivado do turno, e os filtros usam aplicador/adversário. `canUseMatchPower()` verifica equipe da vez e posição não terminal; a campanha já utiliza essa verificação nos botões, gesto e confirmação. Sua interface continua branca contra o bot, enquanto o servidor online futuro usará a identidade/cor de cada participante. Snapshots legados sem aplicador conservam o branco, para compatibilidade.

Shield protege o próprio rei com a exceção de atravessar/entrar em casa atacada; proteger o rei adversário conserva bloqueio de captura, mas não relaxa a legalidade dos movimentos dele. Essa distinção é por quem aplicou o poder e evita a expiração após o adversário fazer um lance que já seria ilegal sem proteção. Posições espelhadas verificam ambos os lados, inclusive expiração e reconstrução de snapshot.

Freeze mantém a distinção atual entre alvo próprio, alvo adversário e armadilha em casa vazia. Efeitos acompanham identidades, expiram por meia-jogada e são restaurados pelo histórico de Undo/Redo. No online, o servidor deve derivar aplicador/custo de sua sessão, validar a vez novamente no commit e aplicar a mesma lógica; não aceitar aplicador declarado pelo cliente.

## Globo, navegador de salas e lobby

### Navegador público

O globo ganha um botão destacado **1v1 casual online**. Seu popup contém:

- Botão **Criar sala** no topo.
- Lista de salas públicas abertas, atualizada enquanto o popup estiver aberto. Cada item apresenta criador, modo **1v1 casual** e **Join**; proposta adicional: ocupação 1/2.
- Campo de ID e **Join room by ID** embaixo.
- Estados de carregamento, lista vazia, reconexão e sala indisponível.

Salas privadas não aparecem na lista nem nos eventos do diretório público. Sala cheia, encerrada ou já em partida deixa a lista de abertas. A consulta inicial lê o banco; notificações atualizam a lista, e reconexão refaz a consulta. Não manter polling constante nem assinatura do diretório quando o popup estiver fechado.

### Criação e convite

**Criar sala** abre outro popup com Public/Private, **Public** marcado por padrão, e **Create**. Ao criar, a pessoa ocupa a primeira vaga. O popup passa a mostrar ID, botão para copiar o link, nomes dos participantes e **Começar**.

Cada participante escolhe a cidade/kit de sua própria equipe no lobby, antes de **Começar**. Mostrar a escolha junto de seu nome e uma prévia; usar as 16 identidades/instrumentos correspondentes à cor atribuída. Alterar o kit depois de confirmar prontidão limpa a própria confirmação, para evitar começar com uma configuração não revisada. Isso não muda a etapa Public/Private → Create pedida pelo usuário.

O link abre o globo com o popup daquela sala, seus participantes e **Entrar na sala**. Abrir um convite não ocupa vaga automaticamente. Entrada por ID e Join público usam o mesmo fluxo de admissão; a tela permite corrigir o ID ou informar que a sala encheu.

### Prontidão e alertas

- **Começar** desabilitado enquanto houver menos de duas pessoas.
- Com duas pessoas, cada uma clica em **Começar**. A primeira vê que está aguardando a outra; somente a segunda confirmação produz o início para ambas.
- A transição cria uma única partida, mesmo com clique repetido, reconexão ou chamadas simultâneas.
- Se alguém sair antes de começar, limpar a prontidão e desabilitar o botão; entrada de outra pessoa exige novas confirmações.
- Entrada de novo participante emite uma notificação sonora e faz o popup piscar. Proposta visual: pulsos breves na borda; movimento reduzido usa realce estático.
- Avisos são ligados a entrada real no lobby, deduplicados por evento; reconsultar a lista ou renovar presença não deve repetir som/piscar.
- A ação Create/Entrar prepara o áudio auxiliar. Se o navegador não liberar áudio, conservar o aviso visual.

O servidor garante duas vagas atomicamente. Se duas pessoas disputarem a última, só uma entra. Propostas de estreia: cores sorteadas na admissão e visíveis no lobby; anfitrião pode cancelar a sala vazia; salas sem participantes ativos expiram depois de um prazo a definir.

## Interface da partida

| Área | Comportamento definido ou proposto |
| --- | --- |
| Entrada | Título cidade/ano/estilo, fotografia e depois tabuleiro; nenhuma frase introdutória. Com duas cidades, proposta: usar a cidade escolhida pela pessoa local como fundo/título e identificar a cidade adversária no popup |
| Orientação | Proposta: a equipe local embaixo, inclusive para quem estiver nas pretas |
| Botão do adversário | Nome e estado da conexão; clique abre o popup descrito abaixo |
| Status central | Sua vez, vez adversária, confirmando ação ou reconectando |
| Ovos no tabuleiro | Saldos reais da partida dos dois lados |
| Piece Params | Equipe adversária bloqueada com cadeado quando sincronização musical estiver ativa |
| Mixer | Todos os ajustes locais, sem publicação para o adversário |
| Undo | Ação direta: volta a última jogada de quem usou e também a resposta se já aconteceu, retornando à sua vez; custo de um ovo, sem aprovação |
| Redo | Gratuito e exclusivo de quem fez Undo; restaura a continuação desfeita até o resultado, e nova jogada/poder a descarta |
| Play/Pause | Transporte musical local; próximo lance confirmado retoma música |
| Restart | Ausente do menu online |
| Globo | Popup com Desistir e Oferecer empate; Cancelar retorna à partida |
| Resultado | Derrota: Pedir revanche. Vitória: Convidar para uma nova partida |

No popup do adversário aparecem nome, **Golden eggs**, **Historical points**, estado da conexão, **Adicionar amigo** e o checkbox **Sincronizar parâmetros musicais**. Esse checkbox decide o que a pessoa local recebe/aplica; não modifica a preferência do adversário. Padrão implementado: ligado. O checkbox Sincronizar movimentos livres fica fora desta versão, junto da prévia remota de arraste. Os números nesse popup pertencem ao perfil; os contadores junto ao tabuleiro pertencem à partida. Não expor email na listagem ou no popup.

Desistência encerra a partida com vitória do adversário. Oferecer empate envia uma oferta; só aceitar produz empate. A saída ao globo fica acessível depois do resultado e libera a vaga. Empate oferece **Nova partida**. Convite de revanche/nova partida precisa de aceitação do outro jogador e cria outro ID; conserva cidades/contexto, inverte cores e reinicia com presets e economia novos.

Jogadas pendentes não devem permitir comandos incompatíveis. Falha/rejeição devolve o tabuleiro à posição confirmada. Estado de conexão informa reconexão, mas uma ausência breve não declara derrota. A estreia não tem relógio nem derrota por desconexão; retorno usa o ID da partida. Um prazo automático de abandono continua futuro.

Pausa musical não suspende vez, conexão nem comandos de jogo. Um lance recebido também desfaz a pausa local. Desligar a engine inteira ou bloquear áudio no navegador continua distinto de pausar o transporte: um lance não deve religar uma engine desligada manualmente.

## Sincronização musical e gestos

### Estado confirmado e estado de escuta

A partida conserva posição, histórico, poderes, peças/identidades, ativação derivada dos lances/cheque e os kits das duas equipes. Cada navegador executa seus loops. Não implementar ajuste de fase, relógio musical comum nem correção de deriva entre aparelhos nesta entrega.

As duas cidades e o contexto ficam registrados ao começar; ambos os navegadores carregam os presets oficiais do build e os parâmetros compartilhados de cada proprietário. Kits pessoais não substituem esses presets. Fixar conteúdo de catálogos históricos no servidor fica para uma evolução do contrato; kits autorais também ficam futuros. Preferências do Mixer, seleção, posição/abertura de widgets e transporte são locais.

A escolha musical está definida: extrair as 16 vozes de cada equipe com instrumentos, notas e parâmetros; usar uma única forma e regras musicais para o tabuleiro. Não executar duas formas/harmonias/regras concorrentes. Preservar os bancos MIDI e remapear as atribuições de participação/variação das vozes para os IDs das seções comuns por contrato explícito, sem alterar os presets ou o schema salvo do Criativo.

O contexto global comum implementado nasce do kit escolhido pelo host, incluindo forma, harmonia, compasso e reações. A outra escolha substitui as vozes daquela equipe, não o contexto global. Ambos os clientes recebem esse mesmo contexto ao começar. Mixer permanece local; controles globais de escuta não são publicados como parâmetros de peças. Essa é a escolha inicial de implementação para o contexto comum autorizado pelo usuário.

### Parâmetros de peças

A abrangência do checkbox musical está definida: preferência individual de recebimento. A implementação precisa distinguir:

- Parâmetros compartilhados de cada equipe, editáveis pelo seu proprietário.
- Overrides locais das duas equipes quando a sincronização estiver desligada; editar a equipe adversária nunca escreve seus parâmetros compartilhados.
- Mixer/controles de escuta locais.

Com sincronização ativa, Piece Params adversário mostra o cadeado e bloqueia alterações em todos os caminhos, inclusive atalhos. O backend também rejeita mudanças de parâmetros de uma equipe feitas por outro participante.

Com sincronização desativada, a pessoa edita ambas as equipes localmente. Ao religar: restaurar os valores compartilhados e remover os overrides adversários da escuta, conservando os valores compartilhados da própria equipe. Informar a consequência no controle; não publicar ajustes adversários feitos enquanto estava desligado.

Cada jogador continua publicando os parâmetros de sua própria equipe como versão compartilhada, mesmo se escolher não receber os parâmetros adversários. Assim, quem mantém o checkbox ligado acompanha o kit do outro; quem desliga usa seus overrides locais. Lances/poderes/Undo e demais ações de jogo chegam sempre; movimento de ponteiro não é enviado nesta versão.

Mudanças de instrumento e parâmetros recebidos são validadas, aplicadas pelo runtime normal e mantidas dentro da partida; não sobrescrever kits pessoais salvos no Criativo automaticamente. Proposta: Solo e audição são preferências de escuta locais, mesmo para peças próprias. A abrangência de ativação manual/loop e dos parâmetros por peça deve ser enumerada no contrato.

### Arraste somente local na estreia

A retirada do escopo se refere à sincronização do gesto entre jogadores. O arraste normal para jogar e sua audição continuam locais, com os gatilhos e cancelamentos atuais; não transformar a partida em interação apenas por clique. A confirmação de um lance passa pelo backend e atualiza os dois tabuleiros. Escape, perda de foco e soltura inválida encerram o gesto local sem publicar prévia ou lance.

Não criar mensagens de início/movimento/fim de ponteiro, camada de peça flutuante remota, audição remota ou checkbox de movimentos livres nesta entrega. Parâmetros musicais duráveis continuam sincronizados: agrupar alterações durante uma edição contínua e enviar seu valor final confirmado. Retomar sincronização de gestos exigirá nova decisão de escopo; não a incluir automaticamente na versão do chat.

## Regras, análise e economia

Preservar os custos e efeitos atuais como ponto de partida: ambos começam com saldo de partida equivalente; Best/Worst e Undo custam um ovo; Freeze/Shield custam três; Redo é gratuito; prêmios de melhores/piores lances e streaks valem para as duas pessoas. Perfil histórico e saldo da partida continuam separados.

O Undo é um comando direto, sem aprovação adversária. Retorna à vez de quem usou, desfazendo sua última jogada e também a resposta se ela já aconteceu. Se ainda não houver uma jogada própria a desfazer, fica indisponível. Servidor serializa a ação com lances/poderes, cobra uma vez, restaura os snapshots e anuncia o mesmo retorno aos dois clientes. Gastos anteriores e recompensas já dadas não são devolvidos/repetidos. Deduplicação de prêmio considera posição, poderes, jogador e lance, mesmo quando o histórico é ramificado após Undo.

Redo pertence a quem fez Undo; resultado confirmado encerra Undo/Redo. A liquidação é única: vitória transfere saldo restante em ovos, saldo mais coletados em pontos e uma vitória, sem conquistar cidade. Empate/derrota não transferem. Atualizações repetidas não creditam novamente.

A interface pode continuar analisando em Worker. Porém recompensas alteram recursos compartilhados e a campanha atual usa rankings provisórios e memória das sugestões efetivamente vistas. Não tratar rankings de navegadores diferentes como se fossem uma avaliação comum.

### Best/Worst compartilhados

- A ação válida cobra um ovo somente de quem clicou, uma vez por ID de comando; receber setas não cobra o adversário.
- Publicar o conjunto efetivamente mostrado, com autor, tipo Best/Worst, ID da posição/poderes, referência da análise, lances e scores. O outro cliente desenha esses lances; não roda sua própria análise para substituir as sugestões recebidas.
- Ambos veem as mesmas casas/setas na orientação do próprio tabuleiro. O evento não depende do checkbox de parâmetros musicais.
- Ambos podem pedir Best ou Worst em qualquer turno, mostrando sugestões da equipe que está na vez. O clique fixa até três sugestões por três segundos; nesse intervalo, novos pedidos de ambos os grupos/jogadores são recusados sem gasto. Expiração ou mudança da posição libera novo pedido; iterações posteriores do Worker não mudam o conjunto visível. Freeze/Shield continuam restritos à própria vez.
- Mudança de posição/poderes, Undo/Redo ou fim da partida invalida eventos antigos; reconexão não cobra novamente nem reapresenta setas expiradas.
- A memória para recompensa referencia o último conjunto realmente exibido naquela posição/poderes, preservando a prioridade atual sobre rankings posteriores. Mostrar ao adversário não cria prêmio extra nem muda a vez.
- Enquanto houver poderes ativos, manter a indisponibilidade atual de Best/Worst. Rejeição não gasta ovos e não publica sugestões.

Fonte implementada na estreia: Stockfish e busca com poderes em Workers locais. O backend aceita a classificação do navegador no modo casual, valida legalidade, custo, limites, versão e deduplicação, e conserva a memória compartilhada de sugestões vistas. Não comprova o ranking Stockfish; avaliar autoridade de análise no servidor antes de um modo competitivo.

## Conta e preservação do perfil

O login usa a referência visual fornecida: Google, separador OR, email, Email me a code, verificação do código e Cancel. Textos de trial/licença/Music Pro não pertencem ao produto. Estados: envio, código inválido/expirado, reenviar, corrigir email, cancelamento Google, falha e salvamento pendente.

A entrada online permite visitante com identidade anônima de backend e apelido, sem exigir Google/email. Ele continua vendo **Sign in to save your profile**; a sessão anônima não é uma conta recuperável em outro aparelho.

- Importar o save atual uma vez, preservando cidades, saldo, pontos, vitórias e dicas; não conceder novamente os dez ovos iniciais.
- Converter visitante em conta nova vinculando Google ou email ao mesmo usuário quando possível; guardar associação/importação no servidor.
- Cancelar ou falhar conserva a cópia local. Só dizer que o perfil está salvo após confirmação do backend.
- Login em conta já existente exige tratamento de conflito e transferência autenticada; não basta substituir o ID no navegador.
- Conflito implementado: escolher uma das duas cópias completas, com backups recuperáveis; não unir cidades nem somar saldos/pontos.
- Isolar cache por identidade em logout/troca de conta. Campanha offline usa CAS da versão confirmada; conflito preserva backup e recarrega a nuvem.
- O rank musical atual continua derivado de pontos históricos, separado de eventual Ranked futuro. Saves legados podem ser preservados como progresso pessoal.
- Biblioteca de kits do Criativo na nuvem fica fora desta primeira entrega, salvo nova decisão.

## Amigos — primeira entrega

O usuário confirmou **pedido de amizade com aceite**, com disponibilidade já na estreia online. Amizade aceita é uma relação entre os dois perfis; enviar pedido não acrescenta unilateralmente alguém à lista definitiva.

Fluxo inicial proposto:

- **Adicionar amigo** no popup do adversário, usando o perfil da partida, sem digitar nome novamente.
- **Amigos** no globo, com lista aceita, pedidos recebidos/enviados e entrada por código público de perfil. Mostrar apelido e código para distinguir nomes iguais; busca por email não pertence a esse fluxo.
- Ao enviar: **Pedido enviado**. O destinatário recebe um pedido com **Aceitar** e **Recusar**; o remetente pode cancelar enquanto estiver pendente.
- Aceitar insere a relação uma única vez e atualiza as duas listas. Clique duplicado, reconexão ou envio cruzado não criam relações duplicadas; pedido já recebido oferece aceite, não um segundo pedido inverso.
- **Remover amigo** encerra a relação para ambos. Proposta: **Convidar para sala** reutiliza o ID/link e o fluxo de admissão já definidos, sem permitir que o convite ocupe vaga automaticamente.

As entradas de interface/código público acima são propostas de implementação; requisito fechado é a amizade com aceite na primeira entrega. Lista e pedidos são persistentes e ligados à identidade do backend; login/vínculo do visitante deve conservar as relações quando mantém o mesmo user ID. Login em conta existente precisa incluir essas relações na política de transferência, evitando relações consigo mesmo e pares repetidos. Não exigir criação de um sistema separado de identidade social.

Backend deriva o remetente da sessão, impede pedido para si mesmo e valida destinatário. Somente o destinatário aceita/recusa, somente o remetente cancela, e qualquer um dos dois pode remover a relação aceita. Uma terceira conta não consulta pedidos privados nem altera a relação. Consultar listas paginadas ao abrir, publicar atualizações mínimas somente para os envolvidos e não transmitir todos os estados de conexão do site para cada amigo.

O chat futuro usará os mesmos IDs/permissões de perfis. Amizade não inclui mensagens de texto nesta versão, e o alcance do chat seguinte continua a definir.

## Implementação técnica

Manter Next.js 16/React 19/TypeScript, chess.js fixado e Strudel. Para a primeira entrega, acrescentar `@supabase/supabase-js`; usar Zod existente para validar comandos/patches. Cloudflare Pages entrega o frontend exportado, Supabase fornece Auth/Postgres/Realtime/Edge Functions e SMTP proposto é Brevo. Planejar sessão no cliente e comandos externos ao site estático, sem `@supabase/ssr` ou Route Handlers Next nesta configuração. Chat e servidor Colyseus pertencem às etapas futuras acima.

### Responsabilidades propostas

| Entrada | Responsabilidade |
| --- | --- |
| `components/world-map.tsx` | Botão online e abertura do navegador/lobby/convite |
| Novos componentes online | Diretório de salas, criação, lobby, popup adversário, amigos/pedidos, saída e nova partida |
| `lib/multiplayer/types.ts` e validação | Contratos de sala, comandos, eventos, permissões e patches |
| `lib/multiplayer/game-rules.ts` | Domínio puro: lance, poder, Undo/Redo, resultado e saldo por participante |
| `lib/multiplayer/service.ts` | Autorização, versão esperada, idempotência e transações |
| `lib/multiplayer/client.ts` / hooks | Subscrição, reconciliação, conexão e alterações confirmadas |
| Supabase Edge Functions sob `supabase/functions/` + migrations/RPCs | Comandos de jogo, admissão/prontidão, relações sociais e gravações atômicas; validar compatibilidade Deno/npm e compartilhar o domínio puro |
| Módulos de amigos | Pedidos, aceite/recusa/cancelamento, lista, remoção e código público de perfil |
| Módulos de perfil/auth | Login, vínculo, importação e cache por usuário |
| `components/chess-game.tsx` / wrapper online | Apresentação comum com políticas/controle de partida online; bot apenas na campanha |
| `hooks/use-music.ts` e módulos especializados | Aplicação de eventos/patches confirmados e conservação dos gestos locais |

Os nomes novos são proposta de organização. Preservar `lib/music/runtime.ts` como fachada; contratos musicais continuam em `runtime-types.ts`. Extrair domínio puro sem trocar regras/timbres da campanha junto da extração; introduzir a política online explicitamente depois.

### Dados e canais

- `profiles`: identidade, apelido, código público único, progresso, pontos e versão.
- `profile_imports` / operações de perfil: origem e resultado da migração, para não importar duas vezes.
- `friend_requests`, `friendships`: participantes, estado do pedido, relação aceita e deduplicação de pares/transições; leitura e atualização restritas aos envolvidos.
- `rooms`, `room_members`: visibilidade, ID/convite, vagas, opções, participantes, Ready e ciclo de vida.
- Diretório público: projeção mínima de salas públicas abertas; sala privada não aparece nas notificações públicas.
- `matches`, `match_players`, `match_events`: estado recuperável, lados, sequência de ações, poderes, branches Undo/Redo, resultado e versão de regras.
- Parâmetros musicais da partida por equipe e revisões; overrides de escuta ficam locais.
- Operações de ovos e IDs de recompensa para debitar/creditar uma única vez.
- Canais privados de lobby/partida, notificações sociais dos envolvidos, canal do diretório mínimo público e presença transitória. Não criar canal de gestos nesta entrega.

Não guardar movimentos de ponteiro ou nós de áudio no banco. Contrato de persistência deve incluir histórico/repetição e poderes: FEN sozinha não basta, e snapshot de Worker com Map/BigInt/internals não é JSON estável de rede/banco.

### Confirmação e recuperação

```text
Comando com ID único + versão esperada
  → autenticar participante e validar permissão/turno
  → calcular regra sobre estado confirmado
  → transação grava nova versão, evento e efeito econômico
  → notificação derivada da gravação anuncia atualização
  → os dois clientes atualizam tabuleiro e contexto musical
```

Gravação verifica a versão atomicamente. Novo estado concorrente exige revalidação; não sobrescrever ação já confirmada. Banco/restrições deduplicam reenvios. Presença não substitui participação/autorização nem decide vitória automaticamente.

As opções de escuta e patches musicais não devem invalidar comandos de xadrez continuamente: usar revisões próprias para lobby, jogo e parâmetros. Gestos locais não avançam a versão do jogo. Eventos têm sequência; na lacuna/reconexão, cliente busca o estado confirmado e atualiza as revisões correspondentes.

Políticas de acesso cobrem proprietário do perfil, envolvidos em amizade, participantes da sala e equipe dona dos parâmetros. Cliente não pode gravar posição, saldo ou resultado oficial diretamente. Admissão, Ready e início são transações, inclusive ao trocar pessoa ou ocorrer reconexão. Publicar só eventos autorizados e alterações confirmadas, sem prévia de ponteiro remoto.

## Etapas e critérios de conclusão

1. **Contratos e domínio:** partir da simetria de poderes já implementada, separar apresentação/bot e fechar contratos de Undo/Redo, composição comum e análise/recompensa. Verificar posições espelhadas, expiração, cheque, roque, en passant e preservação da campanha.
2. **Contas/perfil:** login Google/código, visitante, apelido, link no popup, importação/vínculo, isolamento de contas e recuperação em outro aparelho. Repetir login/importação não altera saldo novamente.
3. **Amigos:** pedido/aceite, recusa/cancelamento, remoção, lista, código público e entrada pelo popup adversário. Confirmar permissões entre três contas, envios cruzados, repetição de aceite e conservação no vínculo de perfil.
4. **Salas:** botão do globo, diretório vivo, Public padrão, privadas ocultas, ID/link, limite de vagas, nomes, alertas e duas confirmações Começar. Duas entradas concorrentes não criam terceira vaga nem partidas duplicadas.
5. **Partida online:** ambos os lados, regras/ovos, Undo/Redo, conexão, globo com desistir/empate, resultado, novo convite e introdução curta. Dois aparelhos chegam ao mesmo estado após comandos repetidos ou concorrentes.
6. **Música:** composição comum sem alinhamento de fase, Mixer local, permissões/cadeado, overrides, ativar/desativar sincronização de parâmetros e retomada por lance de qualquer lado. Gesto e cancelamento continuam locais; medir que arrastar não envia pacotes de ponteiro.
7. **Validação de lançamento:** exportação estática/Pages, Functions/RPCs, reconexão, refresh, logout, retorno OAuth, convite, sala encerrada, permissões e consumo real de mensagens/CPU/email; testar desktop e dois aparelhos móveis. Registrar limitações medidas.

A implementação atualiza `GAME_MECHANICS.md` com comportamento real e `docs/CODEBASE_MAP.md` com responsabilidades. Testes pertinentes de `npm run test:music`, integração completa quando atravessar contratos/runtime, `npm run typecheck`, teste de release e validação visual da versão. Criar testes específicos de auth, migração, salas, concorrência, eventos, permissões e economia. Testes de padrões não aprovam qualidade musical/desempenho físico.

Evidências locais em 04/10: 243 casos musicais (incluindo 29 de poderes e consistência da versão), 18 do domínio/cache/parâmetros online e 16 do banco/PGlite aprovados; TypeScript, lint dos módulos online, Deno check e build estático aprovados. A interface foi conferida para ambas as cores, Undo, cadeado/preferência musical, globo/login e versão. Auth/Realtime hospedados, Google/SMTP e concorrência entre sessões reais ainda dependem da ativação remota; esses checks locais não os comprovam.

## Custos e preparação externa

Consultado em 04/10/2026; planos gratuitos e limites estão em Escolha inicial com planos gratuitos. A seleção agora é Pages Free + Supabase Free (incluindo Functions) + Brevo Free. Vercel Hobby continua uma alternativa para projeto pessoal sem uso comercial, mas não é a hospedagem escolhida neste plano. Nenhum plano pago foi contratado nem a hospedagem atual trocada nesta implementação.

Para a configuração real: projeto Supabase e ambiente de Functions/migrations; conta Cloudflare Pages e configuração do build/exportação; URLs de preview/produção e retorno Google; domínio e acesso ao DNS do remetente; Google OAuth e SMTP/Brevo com envio ativado. Guardar credenciais nos painéis/variáveis de ambiente apropriados, sem pedir segredos no chat. Código, migrations e documentação de configuração podem ser preparados antes desses serviços estarem disponíveis. Validar taxas de Auth/reenviar código junto das cotas Brevo e da vinculação do visitante.

A retirada dos arrastes elimina o cenário de mensagens contínuas daquela funcionalidade. Lances, poderes, parâmetros e pedidos de amizade ainda geram consumo, e a classificação local segue o contrato casual descrito acima. Medir o uso da beta para escolher qualquer ampliação; a meta de 300 simultâneos não se tornou gratuita por essa redução de escopo.

## Decisões encerradas nesta rodada

- Undo retorna à vez de quem usou, incluindo a resposta adversária quando houver, sem autorização do outro.
- O checkbox de parâmetros musicais é individual e controla recebimento/aplicação; não muda a preferência do adversário.
- Cada pessoa escolhe os instrumentos/notas/parâmetros da própria equipe; forma e regras são comuns ao tabuleiro.
- Poderes usam aplicador/adversário com as mesmas regras nas duas cores e só podem ser aplicados na vez de quem os usa.
- Best/Worst mostram o mesmo conjunto para os dois jogadores.
- Arraste de peças fica local na estreia; a sincronização de movimentos livres e seu checkbox foram retirados.
- Adicionar amigo entra na estreia com pedido e aceite do destinatário.
- Chat entra na versão online seguinte à estreia, sem implementação na primeira.
- Plataforma 2D terá vários jogadores por partida; limite de participantes ainda aberto.

Escolhas iniciais implementadas: visitante permitido, nome editável, cores sorteadas, ausência de relógio, Mixer local, Undo/Redo somente antes do resultado, classificação local e crédito único de vitória ao perfil. Prazo automático de abandono e catálogo histórico fixado no servidor permanecem futuros.

## Fontes oficiais

- [Supabase — preços e cotas](https://supabase.com/pricing).
- [Supabase — visitantes e vinculação](https://supabase.com/docs/guides/auth/auth-anonymous).
- [Supabase — Google](https://supabase.com/docs/guides/auth/social-login/auth-google).
- [Supabase — código por email](https://supabase.com/docs/guides/auth/auth-email-passwordless).
- [Supabase — SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- [Supabase — Broadcast](https://supabase.com/docs/guides/realtime/broadcast) e [autorização de canais](https://supabase.com/docs/guides/realtime/authorization).
- [Supabase — limites de Realtime](https://supabase.com/docs/guides/realtime/quotas), [contagem e preço de mensagens](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages) e [verificação de JWT](https://supabase.com/docs/guides/auth/jwts).
- [Colyseus — framework aberto](https://colyseus.io/), [salas](https://docs.colyseus.io/room), [inputs e passo fixo](https://docs.colyseus.io/netcode/server-input), [previsão/reconciliação](https://docs.colyseus.io/netcode/client-prediction) e [autenticação de sala](https://docs.colyseus.io/auth/room).
- [Colyseus — preços](https://colyseus.io/pricing/) e [provisionamento da hospedagem](https://docs.colyseus.io/cloud/pricing-billing).
- [Resend — preços](https://resend.com/pricing) e [SMTP/domínio verificado](https://resend.com/docs/send-with-smtp).
- [Vercel — plano Hobby](https://vercel.com/docs/plans/hobby).
- [Vercel — plano Pro](https://vercel.com/docs/plans/pro-plan) e [Flat Rate CDN](https://vercel.com/docs/pricing/flat-rate-cdn).
- [Supabase — cobrança de conexões de Realtime](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-peak-connections).
- [Supabase — cotas de Edge Functions](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations) e [limites de runtime](https://supabase.com/docs/guides/functions/limits).
- [Cloudflare Pages — produto/plano gratuito](https://www.cloudflare.com/products/pages/), [limites](https://developers.cloudflare.com/pages/platform/limits/) e [Next.js estático](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).
- [Brevo — preços e SMTP em todos os planos](https://www.brevo.com/pricing/) e [limites do Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).
