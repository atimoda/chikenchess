# Configuração do 1v1 casual

O frontend continua sendo uma exportação estática do Next.js. Supabase fornece Auth, Postgres, Realtime e três Edge Functions; o destino planejado para a hospedagem gratuita é Cloudflare Pages, entregando `out/`. Em 04/10, o domínio público ainda responde pela Vercel; a migração de hospedagem não foi realizada. As contas, domínio e credenciais são configurados nos painéis dos serviços. A existência dos arquivos não comprova ativação remota; o registro abaixo distingue configuração realizada de etapas pendentes.

## Partidas simultâneas e globo — 09/10/2026, v1.2.0

`202610090002_running_games.sql` permite criar/entrar/sair de salas enquanto há partidas ativas, preservando participantes e estado de cada jogo. `online_running_games()` retorna somente os metadados das partidas não concluídas da conta atual; `online_running_game_updates` usa RLS por identidade e publicação Realtime para atualizar a lista, inclusive após começar ou concluir uma partida. Revanche usa a participação persistente e conserva uma vaga já ocupada em outro lobby. A migração foi aplicada ao projeto remoto ChickenChess em 10/10/2026, após `202610090001_match_egg_settlement.sql`; `202610100001_match_usage_counters.sql` e `202610100002_expire_idle_rooms.sql` também foram aplicadas em sequência na mesma atualização.

O frontend mostra Games in progress acima das salas públicas, com acesso explícito a cada jogo e indicação de turno. A raiz permanece no globo; iniciar um lobby observado ou abrir um link de partida continua navegando. Voltar ao mapa conserva o jogo, e as ações de desistência/empate ficam no popup do adversário. A publicação do frontend expõe a lista; as migrações já estão aplicadas no projeto remoto. Não acrescenta Edge Functions.

Validação local: 52 casos online, 42 SQL/PGlite, dois de consistência da versão, TypeScript, lint dos módulos alterados e build estático aprovados. QA do build com Auth/Realtime simulados em origem local confirmou duas partidas acima das salas, acesso aos dois IDs, retorno e recarga no globo sem redirecionamento, início observado levando à nova partida, remoção por evento de resultado e lista presente sem salas públicas. Em 320×568 e 390×844 não há overflow horizontal; a faixa lateral rola quando falta altura. v1.2.0 foi confirmada na interface. Fixtures não usaram contas pessoais nem gravaram no Supabase remoto; PGlite não comprova concorrência entre conexões ou entrega Realtime hospedada.

## Login Google — 09/10/2026, v1.2.0

O retorno do popup leva ID aleatório de correlação e comunica o resultado pelo canal temporário da mesma origem, além de postMessage. Isso conserva erros como Google já vinculado quando políticas do navegador separam a janela de autenticação; o diálogo orienta repetir o login em vez de exibir apenas um aviso genérico. O cancelamento fica a cargo do botão Cancel do diálogo. Não requer mudança no Supabase; basta publicar o frontend.

## Pote de ovos e apresentação — 09/10/2026, v1.2.0

`202610090001_match_egg_settlement.sql` foi preparada e validada localmente, mas ainda precisa ser aplicada ao projeto remoto. Vitória credita o pote restante dos dois jogadores; empate divide entre ambos, com o excedente para pretas em total ímpar. Bônus de pontos usa os próprios coletados; empate não acrescenta vitória ou cidade. Reenvio não liquida novamente. O resultado recebido por qualquer participante atualiza seu perfil/cache.

Checks locais: 248 testes musicais, 51 online, 36 SQL/PGlite, TypeScript e build estático aprovados. Campanha/online/Criativo compartilham alças nos quatro cantos e cesta; o globo centraliza Salas/Amigos/Perfil sem bloquear o mapa. QA local verificou redimensionamento por ponteiro/teclado, retorno com Escape, Criativo sem alças/overflow no celular vertical, popup central e retorno ao centro após fechar/reabrir, cesta creditada e versão v1.2.0. Essa verificação não aplica a migração nem valida uma partida hospedada entre aparelhos reais.

## Salas, Random e poderes — 08/10/2026, v1.1.0

A migração `202610080001_random_room_kits.sql` foi aplicada ao projeto ChickenChess pelo CLI em 08/10. Ela conserva o contrato do RPC e os bloqueios/permissões existentes, acrescenta visibilidade alterável somente pelo criador da sala aberta e resolve Random separadamente para cada equipe apenas na segunda confirmação Começar. Lobby mantém a escolha; partida/contexto gravam cidades concretas. Revanche conserva os kits resolvidos, sem novo sorteio. Não há nova Function para implantar nesta alteração; o frontend precisa de publicação.

Public/Private criam diretamente; a configuração reaparece dentro da sala. Os popups de cidade criam uma sala pública com o kit explícito, e Conquered fica sobre a foto. Cabeçalhos/rodapé redundantes saem da área online, mantendo nomes e descrições acessíveis ocultos. Entrada por ID aceita os 32 caracteres completos. O tabuleiro comum separa Freeze (gelo + peça imóvel com aviso de arraste) de Shield (símbolo sobre fundo normal); o som auxiliar de gelo é curto e cancelável.

Checks: 245 casos musicais (incluindo áudio auxiliar e dois de versão), 51 online, 28 SQL/PGlite, TypeScript, lint dos arquivos alterados e build estático aprovados. QA com duas identidades locais, migrações reais e Auth/Realtime simulados confirmou criação direta, kit Random, permissão/recebimento de visibilidade, atalho de Düsseldorf, convidado com Random, mesmo ID/kit/contexto após recarga, versão v1.1.0 e modais em 320 px sem rolagem interna/colisão com fechar. A tentativa congelada no mouse emitiu um único aviso de peça e três parciais de gelo, sem fantasma, com retorno por Escape; Shield ficou sem textura de gelo. O primeiro toque na orientação preta também emitiu aviso e gelo: a soltura desbloqueou o som pendente dentro da janela original, sem fantasma nem erro. Cenários finais sem erros JS. Os testes não avaliam subjetivamente o som nem desempenho em celular físico, e não substituem uma partida hospedada entre aparelhos reais. Fixtures de navegador não usam perfis pessoais do Supabase.

Refinamento de perfil e janelas no mesmo dia: Perfil e Golden eggs abrem o mesmo popup, com lápis para editar/cancelar o nick, código da conta e botão de login. O nome de batismo aparece somente quando diferente do nick, sem o texto explicativo; Reset Save fica sem a divisória superior. Salas/Amigos usa janela não modal no canto superior esquerdo, sem overlay e com rolagem externa para conteúdo longo. Foram novamente aprovados 51 testes online, dois de versão, TypeScript, lint e build estático. QA local confirmou salvar/cancelar, exibição condicional do nome, login a partir do Perfil, cliques no mapa com a janela aberta, About/Perfil acima dela e layouts de 320 e 390 px sem scrollers internos ou corte no botão de login. A dica inicial da campanha abriu e fechou sem erros JS; v1.1.0 permaneceu visível. Este refinamento só requer publicar o frontend, sem nova configuração ou migração no Supabase.

A migração `202610080002_public_room_directory.sql` também foi aplicada ao ChickenChess em 08/10: acrescenta data de criação para ordenar o diretório sem promover salas editadas e permite leitura anônima apenas da projeção pública/RPC, conservando Auth nas ações e RLS das tabelas privadas. Para salas anteriores, `updated_at` fornece a aproximação inicial da criação. O globo usa uma escuta de diretório compartilhada com Rooms, mostra até cinco salas e Ver todas; About e Release notes compartilham duas abas. Os atalhos Rooms/Friends/Creative ficam no rodapé direito; About fica oculto no mobile vertical. Checks adicionais: 29 testes SQL/PGlite, 51 online, dois de versão, TypeScript, lint e build estático aprovados. QA local confirmou zero/cinco/sete salas, nova sala via Realtime com janela fechada, admissão lateral, diretório sem abandonar a sala, abas por clique/teclado, 320 px sem overflow horizontal e About visível no mobile horizontal. A leitura anônima do RPC no projeto remoto retornou HTTP 200 com os três campos públicos, e a inscrição anônima Realtime no diretório chegou a SUBSCRIBED; não foram alteradas salas/perfis pessoais nessa checagem. Movimento reduzido desativou a animação na prévia, e o Criativo conservou o popup próprio de Release notes. A migração está no backend; a interface precisa de publicação.

A migração `202610080003_room_ready_toggle.sql` atualiza o RPC do lobby: troca de kit preserva a confirmação individual, e `ready` alterna entre pronto e não pronto até a partida começar. Aplique-a ao Supabase antes de publicar o frontend para que Cancelar pronto e a preservação da confirmação funcionem entre jogadores; o código curto de cinco algarismos é apenas visual, e os links continuam usando o código completo.

A migração `202610080004_create_room_switch.sql` atualiza o mesmo RPC: criar uma nova sala encerra a sala anterior do usuário e remove-a do diretório antes de criar a nova, tudo na mesma transação. Os demais participantes veem a sala anterior encerrada e podem sair; se a nova criação falhar, o rollback conserva a sala antiga. Uma partida online ainda ativa bloqueia a troca. Aplique esta migração antes de publicar o frontend. Não altera Edge Functions nem exige rebuild de bundle.

## Prévia do lance pendente — 05/10/2026, v1.0.1

O frontend projeta lances legais no destino com 45% de opacidade até a versão oficial chegar. `lib/online/pending-move.ts` usa cópia isolada das regras com poderes; música, análise, economia e histórico continuam lendo somente o estado confirmado. Recusa 4xx restaura o tabuleiro oficial; rede/timeout/5xx conserva pedido/prévia para Retry. A confirmação via Realtime antes do recibo HTTP já normaliza a peça, sem repetir o deslocamento. Reenvio mantém o mesmo ID. Não há nova migração ou alteração de Function; precisa publicar o frontend.

Checks: 47 casos online (dez novos de projeção), 32 casos pertinentes de poderes/música/combinação de kits, dois de versão, TypeScript, lint e build estático aprovados. QA do build com SQL local e Auth/Realtime/Function simulados reteve deliberadamente a resposta: arraste nas brancas permaneceu no destino sem reaparecer na origem em 35 frames; recusa exibiu erro e restaurou a origem; 503 conservou a peça translúcida/Retry e o mesmo ID; confirmação Realtime antes do HTTP normalizou sem duplicar lance. Pretas foram verificadas com orientação inversa, bloqueio de novo arraste e recuperação da prévia após reload; confirmação normalizou a peça. v1.0.1 visível, sem erros JS. Não houve alteração de perfis pessoais nem chamadas de jogo ao backend remoto nesses testes; o simulador não mede latência hospedada ou áudio em aparelhos físicos.

## Correções do lobby — 05/10/2026, v1.0.1

O frontend inclui avisos temporários de chegada à sala e aceite de amizade, acompanhamento de amizades pelo provider e a correção da escuta do convidado: a prévia sem vaga passa a acompanhar a sala assim que a admissão é confirmada, mesmo com o mesmo ID. Callbacks de inscrições antigas e respostas atrasadas são ignorados; não há polling contínuo. Convites aguardam a identidade correta.

A migração `202610050001_room_switch.sql` substitui `online_room` com troca atômica na ação `join`. Valida o destino e libera a vaga antiga na mesma transação; falhas preservam sala/prontidão antigas. Mantém duas vagas, host substituto, diretório, kits e proteção de partida ativa. `create` continua exigindo não ocupar uma sala. Foi aplicada ao projeto ChickenChess via `supabase db push --linked --yes`, junto da migração pendente `202610040003_baptism_names.sql`. Não há alteração de Edge Functions. O frontend novo precisa de deploy.

Checks da troca automática: 25 casos SQL/PGlite aprovados, incluindo fechamento da sala vazia, substituição do host, prontidão/diretório, retry sem duplicar vaga, rollback para destino cheio/fechado/inexistente ou kit inválido e proteção de partida ativa. Testes locais não comprovam entrega Realtime hospedada ou corrida entre conexões Postgres.

Checks atuais: 37 casos online, dois de versão, TypeScript, lint dos arquivos alterados e build estático aprovados. QA adicional em duas origens locais, com Auth/Realtime simulados e SQL real em PGlite, confirmou convite → admissão na mesma sala, encerramento automático da sala anterior, mudança de kit chegando ao adversário e início no mesmo ID de partida nos dois navegadores (convidado confirma primeiro, anfitrião por último). Ambos renderizaram seus tabuleiros/kit sem erros JS, com v1.0.1 visível. O transporte de Presence não foi validado nesse simulador; o reteste hospedado permanece necessário.

Validação anterior dos avisos/mobile: a versão 1.0.1 foi conferida na interface. QA do build com respostas HTTP simuladas em origem local separada validou erro acima de Entrar na sala, recuperação/saída/entrada com dois perfis, chegada uma única vez, aceite com popup fechado e expiração em seis segundos. Em 320×568 e 390×844 o cartão tem overflow visível, com rolagem do viewport e zero scrollers internos; em 1280×800 permanece centralizado. Os dados foram fixtures locais, sem usar perfis pessoais nem escrever no projeto remoto; isso não substitui retestar duas contas/dispositivos e Realtime hospedado depois do deploy.

## Estado da ativação — 04/10/2026

Projeto **ChickenChess**, ref `arqjqjopihtsubpvuccj`, região São Paulo: vinculado ao CLI; migrações `202610040001_online.sql` e `202610040002_business_conflicts.sql` aplicadas; Functions `match-command`, `piece-params` e `profile-transfer` implantadas. Anonymous Sign-ins funciona com sessões reais. Google está habilitado; a geração de vínculo PKCE e a URL de callback foram conferidas na API, e o usuário confirmou login/vínculo em localhost preservando o perfil e o saldo. As onze tabelas públicas online têm RLS; a publicação Realtime contém somente as cinco projeções abaixo. CORS das três Functions permite `http://localhost:3000`, `https://chickenchess.com` e `https://www.chickenchess.com`: o segredo `ONLINE_ALLOWED_ORIGINS` foi configurado em 04/10, e nove preflights retornaram 204 com a origem exata. Antes desse ajuste, a origem de produção retornava `ORIGIN_NOT_ALLOWED`/403.

Teste remoto com três sessões descartáveis validou importação exata/idempotente do perfil, isolamento de dados, rejeição de escrita direta, diretório ao vivo, convite privado sem ocupar vaga, corrida pela segunda vaga, Ready simultâneo/repetido, Presence privada e rejeição de terceiro, amizade com aceite, Best/Worst compartilhado, poderes só na própria vez, Undo/Redo sem repetir prêmio, parâmetros apenas do dono, liquidação única, revanche com cores invertidas e empate com aceite. Duas jogadas simultâneas tiveram uma confirmação e uma resposta 409 em cerca de 0,3 s, sem duplicar lance/prêmio.

Teste adicional com sessões Auth reais validou CAS do perfil com conflito 409 imediato e transferência visitante → conta permanente: exigência das duas sessões, escolha de uma cópia inteira sem somar saldos, retry idempotente, aposentadoria da origem e migração de amizade pendente. A conta permanente foi uma fixture criada pela API administrativa, sem enviar email; isso não valida entrega SMTP ou vínculo Google. Todas as contas, backups, salas e partidas descartáveis foram removidos; o perfil pessoal não foi usado como fixture.

O frontend foi publicado na Vercel, incluindo as páginas legais. O primeiro deploy não incorporou as variáveis `NEXT_PUBLIC_*`; após a configuração/redeploy, o usuário confirmou que o Google abre em produção. Esse teste retornou `identity_already_exists` para localhost: a conta Google já estava vinculada ao usuário permanente criado no teste local. A leitura remota de Auth confirmou `site_url=http://localhost:3000` e `uri_allow_list` vazio. Foi solicitado o ajuste abaixo no painel; a leitura não significa que a configuração tenha sido alterada.

Pendências para disponibilização pública: salvar Site URL/Redirect URLs de produção, publicar o tratamento de Google já vinculado, teste de login em conta Google existente com escolha de save e código real por email. O usuário confirmou SMTP salvo/ativado e domínio Brevo Authenticated; entrega real ainda precisa de teste. Nome/logo verificados no consentimento Google são uma etapa de apresentação da marca. Testes de banco/API não substituem esses fluxos nem medição de áudio em aparelhos físicos.

Diagnóstico da tentativa seguinte: o frontend público ainda entrega o handler antigo, que converte qualquer callback `ok:false` em “O login Google não foi concluído”. A leitura dos scripts publicados confirmou a ausência do novo tratamento de identidade existente. O callback local também passou a consultar o resultado de `auth.initialize()` antes da sessão, para preservar falhas PKCE ocultadas por `getSession`; isso precisa entrar no mesmo novo deploy. Os 31 casos online (dez de callback/Auth), TypeScript e lint passaram após esse ajuste. O logout já existia em Online → Perfil e agora aparece também no popup de Golden eggs para contas permanentes. A espera de hidratação da raiz deixou de mostrar a apresentação textual redundante; permalinks legais e links no About/login continuam disponíveis.

## 1. Projeto Supabase e migração

Crie um projeto no plano Free, escolha a região e guarde a senha do banco no gerenciador de senhas. Mantenha **Data API habilitada**, **exposição automática de novas tabelas desabilitada** e **RLS automática habilitada**. A migração define explicitamente RLS e grants dos objetos ChickenChess; as credenciais do navegador não podem escrever diretamente nas tabelas oficiais.

Com o CLI Supabase disponível, execute na raiz do repositório:

```sh
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

A regra de pote/divisão de ovos depende de aplicar `202610090001_match_egg_settlement.sql` ao projeto remoto com o mesmo fluxo de `db push`; sua suíte local cobre crédito único e rollback.

As migrações ficam em `supabase/migrations/`; a primeira instala a base, e `202610040002_business_conflicts.sql` corrige a resposta dos conflitos de versão. Não as execute novamente manualmente após `db push`; o histórico registra cada aplicação. Os saves completos e os backups de transferência ficam em `online_private`, que não entra nos schemas expostos pela Data API. A lista pública usa `online_public_rooms`, contendo somente ID, código, nome do criador e ocupação de salas públicas abertas com uma vaga. Convites privados usam códigos aleatórios de 128 bits.

A migração complementar `202610040003_baptism_names.sql` foi aplicada ao projeto ChickenChess em 05/10, junto da troca automática de sala. Ela acrescenta `baptismal_name` imutável, a biblioteca de 304 termos e o sorteio no primeiro perfil, preservando nomes/progresso existentes. O nome público (`display_name`) continua editável; o nome do Google é importado no primeiro cadastro ou explicitamente pelo painel, sem sobrescrever edições ao relogar. Novos cadastros remotamente já usam esse catálogo; a versão diária atual é `v1.1.0`.

Validação local dos nomes de conta em 04/10: 22 casos SQL/PGlite, 21 casos online, TypeScript, lint dos arquivos alterados e consistência da versão aprovados. A interface com sessão simulada mostrou os dois nomes no mapa/perfil, edição e importação Google preservando o nome de batismo, e `v1.0.0` visível. Essa prévia não valida OAuth real nem aplicação remota da migração; não alterou perfis pessoais.

O catálogo de kits autorizado está em `online_private.kit_catalog`, com os 60 IDs atuais. Acrescentar cidades exige migração complementar; o teste do banco compara esse catálogo com `lib/cities-data.ts`.

## 2. Auth, Google e códigos por email

Em **Authentication → URL Configuration**, configure a Site URL de produção e acrescente explicitamente os retornos de produção, preview pretendido e desenvolvimento. O app retorna à página principal e processa a sessão no cliente. Habilite **Anonymous Sign-ins**, o provedor **Email** e **Manual Linking**. Visitantes autenticados usam o papel `authenticated`, conservando sua identidade ao vincular uma conta. [Supabase: visitantes e vinculação](https://supabase.com/docs/guides/auth/auth-anonymous).

No Google Cloud, configure consentimento e uma credencial OAuth para aplicação web. Cadastre os origins do site e a URL de callback fornecida pelo painel Supabase (`https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`). Coloque Client ID e Client Secret somente no provedor Google do Supabase. Depois habilite o provedor e confirme o retorno para as URLs permitidas. [Supabase: Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

Para enviar um código em vez de link, ajuste o template **Magic Link** para incluir `{{ .Token }}`. Ajuste também **Change Email Address** para o vínculo de email do visitante. O HTML pronto está em `supabase/templates/access-code.html`: copie seu conteúdo para os dois templates no painel remoto. A referência em `config.toml` prepara o stack local; não ativa o SMTP nem altera automaticamente os templates do projeto hospedado. Exemplo de corpo:

```html
<h2>ChickenChess</h2>
<p>Your sign-in code is <strong>{{ .Token }}</strong>.</p>
<p>If you did not request this code, ignore this email.</p>
```

O login normal confirma com `verifyOtp` de tipo `email`; o vínculo do visitante usa `updateUser` e confirma com tipo `email_change`. Configure código de seis dígitos, expiração curta e intervalo de reenvio compatível com Auth e SMTP. [Supabase: OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [templates](https://supabase.com/docs/guides/auth/auth-email-templates).

### Credencial Google para o projeto ChickenChess

Com o frontend publicado, use **Site URL** `https://chickenchess.com`. Em **Redirect URLs**, cadastre `https://chickenchess.com/`, `https://chickenchess.com/?authCallback=1`, os mesmos dois retornos com `www` se esse host for utilizado e `http://localhost:3000/**` para desenvolvimento. O código já envia o retorno da origem atual com `?authCallback=1`; ele precisa estar permitido, inclusive nos testes locais. A Site URL de produção também é o fallback para erros OAuth sem o marcador. Não use `supabase config push` com o arquivo local para corrigir apenas URLs: o stack local conserva localhost e não contém toda a configuração remota de Google/SMTP. [Supabase: retornos Auth](https://supabase.com/docs/guides/auth/redirect-urls).

Um visitante usa `linkIdentity` para salvar a mesma identidade em uma conta nova. Se o Google já pertence a outra conta, o callback preserva `identity_already_exists`, marca **Já tenho uma conta** e pede novo clique em **Continue with Google**, que usa `signInWithOAuth`. O retry passa novamente pelo bloqueio de sala/partida ativa antes de trocar de conta; depois do login oferece a escolha entre os saves completos. Cancelar/fechar a janela ou um erro diferente não seleciona esse retry nem transfere progresso. A credencial visitante fica somente em memória e os backups de perfil continuam isolados por identidade.

Validação do tratamento inicial em 04/10: 29 casos online (oito de callback/Auth), TypeScript, lint dos arquivos alterados, dois casos de consistência da versão e build estático de produção aprovados. A tela local abriu o login, ignorou mensagem sem popup ativo e conservou os 43 ovos visíveis ao fechar; `v1.0.0` foi conferida na interface. Esses checks não autenticaram uma conta Google nem substituem o teste humano em produção após salvar os retornos e publicar o novo código.

No Google Auth Platform, configure o app **ChickenChess**, Audience **External** e seu email como contato/usuário de teste enquanto estiver em Testing. Em Data Access, configure somente `openid`, `userinfo.email` e `userinfo.profile`. Em **Clients → Create client**, escolha **Web application** e o nome **ChickenChess Web**. Origens autorizadas: `http://localhost:3000` e `https://chickenchess.com`; acrescente `https://www.chickenchess.com` somente se esse host for utilizado. Retorno autorizado:

```text
https://arqjqjopihtsubpvuccj.supabase.co/auth/v1/callback
```

A opção “This client will be used by an AI-powered agent” permanece desmarcada: o cliente é usado pelos jogadores no site. Copie Client ID e Client Secret diretamente para **Supabase → Authentication → Sign In / Providers → Google**, habilite e salve. O segredo não pertence ao frontend, Git ou chat. Teste cadastro que mantém o UUID visitante e login numa identidade já existente com escolha de save. [Supabase: configuração Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Google: cliente web](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred).

### Nome e domínio na tela de consentimento

No plano Free, o callback continua em `arqjqjopihtsubpvuccj.supabase.co`. Configure nome **ChickenChess**, logo e links reais do produto em **Google Auth Platform → Branding**, solicite **Verify Branding** e, após aprovação, **Publish branding** para melhorar o nome apresentado pelo Google; alterar o nome do projeto Supabase não muda o hostname. A verificação de marca tem seus próprios requisitos de site/domínio e pode levar alguns dias. [Google: marca OAuth](https://support.google.com/cloud/answer/15549049).

Uma URL como `auth.chickenchess.com` exige o add-on Custom Domain do Supabase em plano pago: US$ 10/mês por projeto/domínio além do Pro, cuja base é US$ 25/mês (valores consultados em 04/10/2026; extras dependem do uso). O hostname próprio passa a ser o callback anunciado por Auth e exige atualizar também a credencial Google. Vanity subdomain (`chickenchess.supabase.co`, sujeito à disponibilidade) é experimental e também exige plano pago, incluído no Pro conforme a tabela de preços. Essas opções não foram ativadas; a estreia continua no Free. [Supabase: domínios](https://supabase.com/docs/guides/platform/custom-domains), [preços](https://supabase.com/pricing).

### Páginas públicas para Google Branding

Contato público: `hello@chickenchess.com`. Páginas em inglês implementadas com rotas estáticas e links no About da home/login:

- Application home page: `https://chickenchess.com/`
- Application privacy policy link: `https://chickenchess.com/privacy-policy`
- Application terms of service link: `https://chickenchess.com/terms-of-service`

Os documentos são acessíveis sem login e sem conexão com Supabase; os links ficam no popup About e no login e abrem outra aba para preservar perfil e login. Os textos identificam o projeto ChickenChess como responsável, descrevem os dados realmente usados e oferecem pedidos de exclusão por email. O HTML exportado deve ser publicado no domínio e os dois links precisam responder publicamente antes de preencher/submeter o Branding. URL local não serve para essa verificação. Após o deploy de 04/10, ambas as URLs foram abertas publicamente e mostram os documentos corretos sem login. O app usa `metadataBase` e canonicals nesse domínio. [Google: requisitos de marca e páginas públicas](https://support.google.com/cloud/answer/13464321).

Validação local de 04/10: exportação estática com os dois documentos completos e links na home sem JavaScript, build/TypeScript/lint aprovados, cinco casos de filtro de analytics/consistência de versão aprovados. Navegador confirmou índice/âncoras, leitura mobile sem overflow, zoom permitido nos documentos e abertura pelo login em nova aba mantendo popup e email digitado. A versão visível permanece `v1.0.0`, na mesma entrada diária. Refinamento posterior moveu os links para About, preservando o popup ao abrir os documentos e oferecendo scroll em telas baixas. Hover de online/Amigos foi comparado ao Modo Criativo no navegador, incluindo a prioridade de borda do tema escuro; TypeScript, lint e consistência da versão aprovados.

## 3. Brevo, remetente e DNS

DNS público conferido em 04/10: `chickenchess.com` usa os nameservers `celeste.ns.cloudflare.com` e `razvan.ns.cloudflare.com`, embora o email seja Hostinger. O configurador automático do Brevo foi usado pelo responsável pelo projeto. A consulta pública confirmou o TXT Brevo code, os CNAMEs `brevo1._domainkey` → `b1.chickenchess-com.dkim.brevo.com` e `brevo2._domainkey` → `b2.chickenchess-com.dkim.brevo.com`, e um único DMARC `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`. SPF Hostinger e MX existentes foram preservados. Nenhuma edição DNS foi realizada por este checkout. Presença dos registros não confirma aprovação do remetente, ativação transacional ou SMTP no Supabase; confirme esses estados no Brevo antes do teste de email.

O usuário confirmou o status **Authenticated** do domínio no Brevo em 04/10. O usuário informou inserir a SMTP key no Password do Supabase, usar o SMTP login do Brevo e salvar/ativar o SMTP. Entrega real e templates remotos ainda não foram confirmados; credenciais não foram lidas ou alteradas por este checkout.

No Brevo, configure o remetente e autentique seu domínio. Copie para o provedor DNS exatamente os registros exibidos pelo painel (Brevo code, DKIM e DMARC); conserve a configuração de email existente e verifique registros já presentes antes de editar. Aguarde a validação no painel. Os valores dependem do domínio e da conta: este repositório não fornece registros DNS prontos. [Brevo: autenticação do domínio](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC).

Abra [SMTP do projeto ChickenChess](https://supabase.com/dashboard/project/arqjqjopihtsubpvuccj/auth/smtp), em Authentication → Email → SMTP Settings, e habilite **Enable custom SMTP**. Use:

| Campo | Valor |
| --- | --- |
| Sender email | `hello@chickenchess.com` (cadastrar também como remetente no Brevo) |
| Sender name | `ChickenChess` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | O **SMTP login** exibido na conta Brevo |
| Password | Uma **SMTP key** gerada no Brevo |
| Minimum interval between emails, se exibido | `60` segundos |

Em [Brevo → SMTP](https://app.brevo.com/settings/keys/smtp), copie o SMTP login e gere uma chave com nome `ChickenChess Auth`. O login pode ser um endereço gerado `[ID]@smtp-brevo.com`; não substitua pelo remetente ou suponha que seja o email de acesso à conta. A senha é a chave SMTP, não a chave da API ou a senha da conta. Esses valores ficam somente nos painéis, fora do código e do chat. Cadastre nome ChickenChess/endereço hello@chickenchess.com em Senders se ainda não existir. Salve o SMTP no Supabase e aplique o HTML `supabase/templates/access-code.html` em **Magic Link** e **Change Email Address**, para receber códigos nos dois fluxos usados pelo app. Confirme ativação transacional e teste envio/recebimento real antes de disponibilizar email publicamente. Configurar DNS não configura SMTP ou templates. [Brevo: SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP), [Supabase: SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 4. Functions e Realtime

Os handlers TypeScript importam bundles do mesmo domínio/validação usados pelo frontend. Recompile-os depois de alterar regras ou schemas:

```sh
node scripts/build-online.mjs
npx supabase functions deploy match-command
npx supabase functions deploy piece-params
npx supabase functions deploy profile-transfer
```

Em 05/10, `match-command` foi recompilada, validada com Deno e republicada no projeto ChickenChess para confirmar mudanças de Tom/Escala/Harmonia feitas por qualquer participante. `board-music` usa o estado JSON/versionamento existente; não há nova migração, tabela ou configuração a preencher. Campos ausentes herdam o kit do criador da sala, e clientes anteriores continuam compatíveis. O frontend atualizado precisa de novo deploy para exibir os dropdowns e a apresentação compartilhada.

Os arquivos `domain.js` e `params.js` são saídas geradas do build. O código durável fica em `lib/online/` e nos handlers; não edite os bundles manualmente. O Supabase disponibiliza `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` dentro das Functions. A service role fica exclusivamente no backend. [Supabase: segredos das Functions](https://supabase.com/docs/guides/functions/secrets).

Configure o segredo **ONLINE_ALLOWED_ORIGINS** com origins exatos separados por vírgula, por exemplo `https://SEU_SITE.pages.dev,https://SEU_DOMINIO`. Para desenvolvimento, inclua `http://localhost:3000`. Use o painel Edge Functions ou um arquivo local ignorado pelo Git passado a `supabase secrets set --env-file`; não use curingas de origem.

`verify_jwt=false` no `config.toml` permite que o handler valide a sessão com `Auth.getUser`, inclusive projetos com chaves de assinatura assimétricas. Todas as Functions exigem um Bearer válido e derivam a autoria da identidade retornada por Auth. Nenhuma aceita a identidade enviada pelo cliente como autoria oficial. [Supabase: autenticação das Functions](https://supabase.com/docs/guides/functions/auth).

Em **Realtime Settings**, conserve **Allow public access** para os canais de notificações Postgres Changes do diretório/lobby; a leitura de cada tabela continua protegida por RLS. Os canais de Presence `match:UUID` usam explicitamente `private:true` e políticas de `realtime.messages` permitem somente Presence aos participantes da partida. Broadcast do navegador não é autorizado como comando de jogo. Presence é apenas um indicador de conexão e não decide vitória. [Supabase: canais privados](https://supabase.com/docs/guides/realtime/authorization).

As migrações publicam somente:

| Tabela | Leitura e uso |
| --- | --- |
| `online_public_rooms` | Diretório mínimo, acessível a usuários autenticados |
| `online_rooms` | Mudanças do lobby, somente participantes, filtro `id` |
| `online_match_updates` | `match_id`, versão do jogo e revisão musical; somente participantes |
| `online_running_game_updates` | Revisão das partidas em andamento, somente o dono, filtro `user_id`; disponível após a migração de 09/10 |
| `online_social_updates` | Revisão da lista de amigos, somente o dono, filtro `user_id` |
| `online_profiles` | Identidade e estatísticas mínimas autorizadas |

O cliente aguarda a confirmação da inscrição Postgres Changes (`postgres_changes_options.wait=true`) antes de indicar conexão pronta e recupera o estado após a inscrição/reconexão. Ao receber uma notificação, recupera o estado pelas RPCs. Estados de xadrez, parâmetros MIDI completos, receipts de comando e remoções de participantes/amizades não são publicados globalmente. Realtime DELETE tem limitações de filtragem/RLS, por isso o lobby anuncia alterações atualizando a sala e amizades usam revisões individuais. [Supabase: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## 5. Frontend: Vercel atual e Cloudflare Pages opcional

### Configuração na Vercel

Em Project → Settings → Environment Variables, cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os mesmos valores públicos do `.env.local`. A URL do projeto é `https://arqjqjopihtsubpvuccj.supabase.co`; a chave deve ser a Publishable Key desse projeto, nunca uma credencial SMTP/secret/service role. Selecione **Production**, e **Preview** se esses deployments também usarem online. Salve e faça um novo **Redeploy** em Deployments; só atualizar os campos não modifica o JavaScript já publicado. O gerenciador/lockfile está configurado em `vercel.json`. [Vercel: variáveis por ambiente e deployment](https://vercel.com/docs/environment-variables).

A mensagem “O modo online ainda não foi configurado” é disparada no cliente quando faltam URL HTTP(S) válida e chave pública no build. Não é um erro de SMTP ou banco; o guard roda antes de chamar Supabase. `.env.local` é configuração da máquina local e não acompanha o Git/deploy. Depois do redeploy, teste o diretório e confira os retornos em Authentication → URL Configuration: Site URL de produção `https://chickenchess.com`, callbacks explícitos de produção e localhost que realmente serão usados.

### Cloudflare Pages

Para usar o destino opcional planejado, configure no ambiente de build do Pages:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

O cliente também aceita `NEXT_PUBLIC_SUPABASE_ANON_KEY` para projetos com a chave anon legada. Essas chaves são públicas; nunca configure `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. Mudanças em variáveis `NEXT_PUBLIC_*` exigem novo build do site.

Conecte o repositório ao Cloudflare Pages Free, use o comando `npm run build` e a pasta de saída `out`. O prebuild gera automaticamente o Worker JavaScript de avaliação com poderes; o asset gerado deve estar em `out/engine/powered-analysis.js`. A configuração Next já usa `output:'export'` e imagens sem otimizador de servidor. Registre a URL definitiva em Auth e em `ONLINE_ALLOWED_ORIGINS`, além de previews que você pretende utilizar. [Cloudflare: Next estático no Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

## Contratos operacionais

- `online_profile(p_local_profile?,p_display_name?,p_expected_user_id?)` importa o perfil local somente ao criar o save daquela identidade. Chamadas seguintes não somam saldos nem repetem o presente. Quando informado, o ID esperado precisa corresponder à sessão autenticada; o provider captura e envia esse ID para importar, ler e editar o nome. Nomes têm 1–40 caracteres, sem caracteres de controle; email nunca entra nas projeções públicas.
- `online_sync_profile(p_expected_updated_at,p_profile,p_expected_user_id)` sincroniza o progresso da campanha com substituição autenticada e CAS. Exige o ID da identidade capturado antes da chamada e o timestamp da última versão confirmada; `FORBIDDEN_IDENTITY` recusa uma troca de sessão durante a operação, inclusive se timestamps coincidirem; `PROFILE_CONFLICT` conserva o estado remoto. O cliente deve guardar sua proposta local para recuperação antes de recarregar a nuvem. Reenvio com conteúdo já confirmado retorna o mesmo perfil. O timestamp novo é monotônico. Conflito de versão usa SQLSTATE `PT409` para retornar HTTP 409 imediatamente; não é um erro de serialização do Postgres a ser repetido.
- A campanha existente e sua importação/sincronização confiam no save local; isso permite conservar progresso offline. O 1v1 casual não constitui uma economia competitiva ou prova de análise Stockfish feita por servidor. Os comandos online validam turno, regras e débitos da partida; não aceitam gravação direta de resultado ou estado pelo navegador.
- `online_room` aceita `get/create/join/leave/kit/ready`. `get` sem código recupera o lobby atual ou `null`; `leave` retorna `null`. Uma sala tem no máximo duas pessoas. `join` em outro lobby libera a vaga antiga atomicamente; falhas mantêm a anterior e partida ativa bloqueia a troca. Trocar kit retira a própria prontidão; entrada/saída retira prontidão. Se o host sai do lobby aberto, o participante restante torna-se host; a última saída fecha a sala. Sair durante partida ativa exige primeiro confirmar desistência ou resultado.
- Ambos Ready criam uma única partida, sob lock da sala, com cores sorteadas na entrada. O kit do host estabelece o contexto musical comum; cada equipe usa sua seleção. Revanche conserva contexto e cidades, inverte cores e começa com presets e economia novos; alterações musicais daquela partida não são copiadas.
- `match-command` recebe `{matchId,commandId,expectedVersion,command}`. Os receipts guardam somente ID, revisão aceita e ID de revanche, evitando uma cópia crescente do histórico para cada ação. O mesmo ID recupera a confirmação antes de reavaliar regras e devolve o snapshot autorizado atual; reutilizar o ID para conteúdo diferente falha. `VERSION_CONFLICT` exige recuperar o estado e decidir uma nova intenção, sem reenviar o mesmo lance com versão alterada automaticamente.
- Resultado é final. A liquidação credita uma vez ao vencedor a soma dos saldos restantes das duas equipes em ovos, essa soma mais seus próprios coletados em pontos e uma vitória; não conquista cidade da campanha. Undo/Redo operam durante a partida ativa. Empate divide a soma entre ambas as contas (excedente para pretas em total ímpar), acrescenta a parcela e os próprios coletados aos pontos, sem vitória/conquista. Uma revanche aceita cria exatamente uma nova partida.
- `online_piece_params(p_match_id, p_known?)` recupera a versão musical compartilhada; com `p_known` (`{piece_id: revision}` já recebidos) devolve só peças novas ou alteradas, e o cliente mescla com as que já tem. `online_running_games(p_known?)` funciona igual com `{match_id: updated_at}`: omite `actions` das partidas inalteradas. Sem `p_known`, as duas devolvem tudo, como antes. `online_match_context(p_match_id)` dá à Function `piece-params` só a cidade de contexto, sem ler a partida inteira. Tudo isso vem de `202610210002_reduce_egress.sql`, criado para reduzir o egress do plano Free; ao reconectar o Realtime (comum em aba de partida esquecida em segundo plano), o cliente lê só os contadores de `online_match_updates` e baixa partida ou peças apenas se eles mudaram, e o heartbeat do Realtime roda num Web Worker (`realtime.worker`) para a aba não cair e reconectar sem parar; `piece-params` recebe `{matchId,pieceId,instrument,effects?}` e valida os schemas musicais, bancos MIDI e IDs de seção do contexto comum antes de gravar somente a equipe do autor. Revisão musical não avança versão do xadrez. Omitir `effects` conserva efeitos existentes ou usa defaults na primeira gravação.
- `online_friends` aceita `list/request/accept/reject/cancel/remove`. Somente o destinatário aceita; pedidos inversos conservam o pedido pendente. Relações usam um par UUID único; remover ou recusar não revela dados a terceiros.
- `profile-transfer` exige a sessão permanente atual e `{sourceAccessToken,choice:'source'|'target'}` de um visitante autenticado. As duas sessões são verificadas. A escolha conserva um save inteiro, sem soma e com backups privados; o destino conserva ID/nome/código, relações são migradas sem aceite automático e a origem é aposentada. `ACTIVE_MATCH`, `ACTIVE_ROOM` ou `HISTORY_CONFLICT` recusam a transferência, preservando ambos os saves.

## Desenvolvimento e validação

O gerenciador do projeto é npm, com `package-lock.json` como único lockfile. Ao acrescentar dependências, use `npm install` e comite manifesto e lockfile juntos. `vercel.json` fixa `npm ci` na instalação e `npm run build` na compilação. O lockfile antigo do pnpm foi removido após o erro `ERR_PNPM_OUTDATED_LOCKFILE` na Vercel; não use instalação sem lockfile congelado para contornar divergências.

Validação da correção de instalação de 04/10: `npm ci` em diretório limpo instalou as dependências; o build com diretório separado do dev concluiu a compilação e exportação estática. TypeScript e consistência da versão diária aprovados, mantendo `v1.0.0`. O deploy remoto precisa receber o commit com a remoção de `pnpm-lock.yaml` e o novo `vercel.json`; repetir o commit anterior conserva a falha.

O Worker de avaliação é gerado por `npm run build:powered-analysis`; `npm run dev`/`build` executam essa etapa automaticamente. Se alterar suas fontes durante um servidor dev já aberto, execute novamente a geração.

Com Docker e CLI instalados, `npx supabase start` inicia o stack local; `npx supabase db reset` recria o banco **local** a partir das migrações. Copie `supabase/edge.env.example` para `supabase/.env.local`, preencha com valores locais e execute `npx supabase functions serve --env-file supabase/.env.local`. Os arquivos `.env` são ignorados pelo Git.

A suíte SQL também pode executar em PostgreSQL WASM, sem Docker, instalando PGlite fora do repositório:

```sh
npm install --prefix /tmp/chicken-online-db-test --no-audit --no-fund @electric-sql/pglite@0.3.14
ONLINE_TEST_MODULES=/tmp/chicken-online-db-test node --test supabase/tests/database.test.cjs
```

Os 43 casos executam todas as migrações em ordem, grants, RLS, importação/CAS/identidade esperada, salas e expiração após 30 minutos sem atividade, versões/idempotência, autor musical, liquidação, revanche, amigos, transferência, catálogo/imutabilidade de nomes de batismo, edição/importação Google e políticas de Presence. Auth e Realtime são stubs nesse teste. PGlite usa uma conexão; estes casos não comprovam a corrida de duas conexões Postgres nem entrega WebSocket hospedada.

Após recompilar os bundles, valide os handlers com Deno e a aplicação com seus checks:

```sh
deno check --config supabase/functions/deno.json supabase/functions/match-command/index.ts supabase/functions/piece-params/index.ts supabase/functions/profile-transfer/index.ts
npm run typecheck
npm run test:music
```

Antes de abrir a beta, valide no projeto configurado com pelo menos três contas: isolamento de perfis e salas privadas; três tentativas simultâneas de ocupar uma sala; Ready concorrente e repetido; comandos duplicados e com versão antiga; recompensa exatamente uma vez; transferência e vínculo Google/email; refresh/reconexão; permissões de parâmetros e Presence, inclusive a tentativa de uma terceira conta acessar o canal privado. Confira envio SMTP e origem dos callbacks em produção. Testes de padrões e SQL não aprovam qualidade musical ou desempenho em aparelhos físicos. Meça invocações, mensagens, conexões e envios de email da beta antes de dimensionar o uso dos planos gratuitos.


Validação da apresentação comum — 05/10, v1.0.1: 244 testes musicais (incluindo os dois de versão), 51 online, TypeScript, lint dos módulos compartilhados, controles online e testes novos, além da exportação estática, aprovados. A campanha conserva os erros de lint preexistentes; a extração não acrescentou novos. No navegador, campanha e online mostraram o mesmo retângulo de tabuleiro, fonte do título, posições/tamanhos dos poderes e rodapé em 1280×850; widgets usam o mesmo arraste/conexões. Telas de 320/390 px conservaram largura, coluna única e controles sem sobreposição; a conexão à casa selecionada também foi conferida na orientação preta. Duas identidades em um simulador local com as migrações reais/PGlite e Realtime de teste receberam Tom/Escala/Harmonia, recuperaram os valores ao recarregar e mantiveram o Mixer local. O lance pendente conservou 45% de opacidade/destino até a confirmação. Sem erros JavaScript observados nesses cenários. Isso não substitui uma nova partida entre aparelhos reais em produção nem avaliação subjetiva/desempenho do áudio. O CLI confirmou o deploy remoto de `match-command`; os testes de navegador não usam dados pessoais do projeto hospedado.

## Admin e catálogos — 08/10/2026

A conta confirmada `atimoda@gmail.com` recebeu `app_metadata.access_level = admin` pela operação restrita `supabase/admin/grant-owner.sql`. Os papéis SQL não mudam. O Admin usa sessão existente e um serviço somente local, com permissão revalidada no Supabase por requisição. Operação em `docs/ADMIN.md`. O catálogo dos nomes agora tem fonte em `data/ui/baptism-names.json`; `npm run admin:names` prepara uma migração de snapshot. `202610080006_baptism_catalog_json.sql` contém os mesmos 304 termos, preservando contas/nomes existentes, e segue o fluxo de publicação das migrações.
