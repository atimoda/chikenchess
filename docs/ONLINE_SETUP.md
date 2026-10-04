# Configuração do 1v1 casual

O frontend continua sendo uma exportação estática do Next.js. Supabase fornece Auth, Postgres, Realtime e três Edge Functions; o destino planejado para a hospedagem gratuita é Cloudflare Pages, entregando `out/`. Em 04/10, o domínio público ainda responde pela Vercel; a migração de hospedagem não foi realizada. As contas, domínio e credenciais são configurados nos painéis dos serviços. A existência dos arquivos não comprova ativação remota; o registro abaixo distingue configuração realizada de etapas pendentes.

## Estado da ativação — 04/10/2026

Projeto **ChickenChess**, ref `arqjqjopihtsubpvuccj`, região São Paulo: vinculado ao CLI; migrações `202610040001_online.sql` e `202610040002_business_conflicts.sql` aplicadas; Functions `match-command`, `piece-params` e `profile-transfer` implantadas. Anonymous Sign-ins funciona com sessões reais. Google está habilitado; a geração de vínculo PKCE e a URL de callback foram conferidas na API, e o usuário confirmou login/vínculo em localhost preservando o perfil e o saldo. As onze tabelas públicas online têm RLS; a publicação Realtime contém somente as cinco projeções abaixo. CORS das três Functions permite `http://localhost:3000`, `https://chickenchess.com` e `https://www.chickenchess.com`: o segredo `ONLINE_ALLOWED_ORIGINS` foi configurado em 04/10, e nove preflights retornaram 204 com a origem exata. Antes desse ajuste, a origem de produção retornava `ORIGIN_NOT_ALLOWED`/403.

Teste remoto com três sessões descartáveis validou importação exata/idempotente do perfil, isolamento de dados, rejeição de escrita direta, diretório ao vivo, convite privado sem ocupar vaga, corrida pela segunda vaga, Ready simultâneo/repetido, Presence privada e rejeição de terceiro, amizade com aceite, Best/Worst compartilhado, poderes só na própria vez, Undo/Redo sem repetir prêmio, parâmetros apenas do dono, liquidação única, revanche com cores invertidas e empate com aceite. Duas jogadas simultâneas tiveram uma confirmação e uma resposta 409 em cerca de 0,3 s, sem duplicar lance/prêmio.

Teste adicional com sessões Auth reais validou CAS do perfil com conflito 409 imediato e transferência visitante → conta permanente: exigência das duas sessões, escolha de uma cópia inteira sem somar saldos, retry idempotente, aposentadoria da origem e migração de amizade pendente. A conta permanente foi uma fixture criada pela API administrativa, sem enviar email; isso não valida entrega SMTP ou vínculo Google. Todas as contas, backups, salas e partidas descartáveis foram removidos; o perfil pessoal não foi usado como fixture.

O frontend foi publicado na Vercel, incluindo as páginas legais. O primeiro deploy não incorporou as variáveis `NEXT_PUBLIC_*`; após a configuração/redeploy, o usuário confirmou que o Google abre em produção. Esse teste retornou `identity_already_exists` para localhost: a conta Google já estava vinculada ao usuário permanente criado no teste local. A leitura remota de Auth confirmou `site_url=http://localhost:3000` e `uri_allow_list` vazio. Foi solicitado o ajuste abaixo no painel; a leitura não significa que a configuração tenha sido alterada.

Pendências para disponibilização pública: salvar Site URL/Redirect URLs de produção, publicar o tratamento de Google já vinculado, teste de login em conta Google existente com escolha de save e código real por email. O usuário confirmou SMTP salvo/ativado e domínio Brevo Authenticated; entrega real ainda precisa de teste. Nome/logo verificados no consentimento Google são uma etapa de apresentação da marca. Testes de banco/API não substituem esses fluxos nem medição de áudio em aparelhos físicos.

Diagnóstico da tentativa seguinte: o frontend público ainda entrega o handler antigo, que converte qualquer callback `ok:false` em “O login Google não foi concluído”. A leitura dos scripts publicados confirmou a ausência do novo tratamento de identidade existente. O callback local também passou a consultar o resultado de `auth.initialize()` antes da sessão, para preservar falhas PKCE ocultadas por `getSession`; isso precisa entrar no mesmo novo deploy. O logout já existia em Online → Perfil e agora aparece também no popup de Golden eggs para contas permanentes.

## 1. Projeto Supabase e migração

Crie um projeto no plano Free, escolha a região e guarde a senha do banco no gerenciador de senhas. Mantenha **Data API habilitada**, **exposição automática de novas tabelas desabilitada** e **RLS automática habilitada**. A migração define explicitamente RLS e grants dos objetos ChickenChess; as credenciais do navegador não podem escrever diretamente nas tabelas oficiais.

Com o CLI Supabase disponível, execute na raiz do repositório:

```sh
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

As migrações ficam em `supabase/migrations/`; a primeira instala a base, e `202610040002_business_conflicts.sql` corrige a resposta dos conflitos de versão. Não as execute novamente manualmente após `db push`; o histórico registra cada aplicação. Os saves completos e os backups de transferência ficam em `online_private`, que não entra nos schemas expostos pela Data API. A lista pública usa `online_public_rooms`, contendo somente ID, código, nome do criador e ocupação de salas públicas abertas com uma vaga. Convites privados usam códigos aleatórios de 128 bits.

A migração complementar `202610040003_baptism_names.sql` está preparada e validada localmente; sua aplicação remota permanece pendente. Ela acrescenta `baptismal_name` imutável, a biblioteca de 304 termos e o sorteio no primeiro perfil, preservando nomes/progresso existentes. O nome público (`display_name`) continua editável; o nome do Google é importado no primeiro cadastro ou explicitamente pelo painel, sem sobrescrever edições ao relogar. Aplique com `npx supabase db push` antes de validar novos cadastros remotamente. Não há nova versão diária: permanece `v1.0.0`.

Validação local dos nomes de conta em 04/10: 22 casos SQL/PGlite, 21 casos online, TypeScript, lint dos arquivos alterados e consistência da versão aprovados. A interface com sessão simulada mostrou os dois nomes no mapa/perfil, edição e importação Google preservando o nome de batismo, e `v1.0.0` visível. Essa prévia não valida OAuth real nem aplicação remota da migração; não alterou perfis pessoais.

O catálogo de kits autorizado está em `online_private.kit_catalog`, com os 46 IDs atuais. Acrescentar cidades exige migração complementar; o teste do banco compara esse catálogo com `lib/cities-data.ts`.

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

Os arquivos `domain.js` e `params.js` são saídas geradas do build. O código durável fica em `lib/online/` e nos handlers; não edite os bundles manualmente. O Supabase disponibiliza `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` dentro das Functions. A service role fica exclusivamente no backend. [Supabase: segredos das Functions](https://supabase.com/docs/guides/functions/secrets).

Configure o segredo **ONLINE_ALLOWED_ORIGINS** com origins exatos separados por vírgula, por exemplo `https://SEU_SITE.pages.dev,https://SEU_DOMINIO`. Para desenvolvimento, inclua `http://localhost:3000`. Use o painel Edge Functions ou um arquivo local ignorado pelo Git passado a `supabase secrets set --env-file`; não use curingas de origem.

`verify_jwt=false` no `config.toml` permite que o handler valide a sessão com `Auth.getUser`, inclusive projetos com chaves de assinatura assimétricas. Todas as Functions exigem um Bearer válido e derivam a autoria da identidade retornada por Auth. Nenhuma aceita a identidade enviada pelo cliente como autoria oficial. [Supabase: autenticação das Functions](https://supabase.com/docs/guides/functions/auth).

Em **Realtime Settings**, conserve **Allow public access** para os canais de notificações Postgres Changes do diretório/lobby; a leitura de cada tabela continua protegida por RLS. Os canais de Presence `match:UUID` usam explicitamente `private:true` e políticas de `realtime.messages` permitem somente Presence aos participantes da partida. Broadcast do navegador não é autorizado como comando de jogo. Presence é apenas um indicador de conexão e não decide vitória. [Supabase: canais privados](https://supabase.com/docs/guides/realtime/authorization).

A migração publica somente:

| Tabela | Leitura e uso |
| --- | --- |
| `online_public_rooms` | Diretório mínimo, acessível a usuários autenticados |
| `online_rooms` | Mudanças do lobby, somente participantes, filtro `id` |
| `online_match_updates` | `match_id`, versão do jogo e revisão musical; somente participantes |
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
- `online_room` aceita `get/create/join/leave/kit/ready`. `get` sem código recupera o lobby atual ou `null`; `leave` retorna `null`. Uma sala tem no máximo duas pessoas. Trocar kit retira a própria prontidão; entrada/saída retira prontidão. Se o host sai do lobby aberto, o participante restante torna-se host; a última saída fecha a sala. Sair durante partida ativa exige primeiro confirmar desistência ou resultado.
- Ambos Ready criam uma única partida, sob lock da sala, com cores sorteadas na entrada. O kit do host estabelece o contexto musical comum; cada equipe usa sua seleção. Revanche conserva contexto e cidades, inverte cores e começa com presets e economia novos; alterações musicais daquela partida não são copiadas.
- `match-command` recebe `{matchId,commandId,expectedVersion,command}`. Os receipts guardam somente ID, revisão aceita e ID de revanche, evitando uma cópia crescente do histórico para cada ação. O mesmo ID recupera a confirmação antes de reavaliar regras e devolve o snapshot autorizado atual; reutilizar o ID para conteúdo diferente falha. `VERSION_CONFLICT` exige recuperar o estado e decidir uma nova intenção, sem reenviar o mesmo lance com versão alterada automaticamente.
- Resultado é final. A liquidação credita uma vez ao vencedor o saldo restante em ovos, saldo mais coletados em pontos e uma vitória; não conquista cidade da campanha. Undo/Redo operam durante a partida ativa. Empate não credita prêmio. Uma revanche aceita cria exatamente uma nova partida.
- `online_piece_params(p_match_id)` recupera a versão musical compartilhada; `piece-params` recebe `{matchId,pieceId,instrument,effects?}` e valida os schemas musicais, bancos MIDI e IDs de seção do contexto comum antes de gravar somente a equipe do autor. Revisão musical não avança versão do xadrez. Omitir `effects` conserva efeitos existentes ou usa defaults na primeira gravação.
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

Os 22 casos executam todas as migrações em ordem, grants, RLS, importação/CAS/identidade esperada, salas, versões/idempotência, autor musical, liquidação, revanche, amigos, transferência, catálogo/imutabilidade de nomes de batismo, edição/importação Google e políticas de Presence. Auth e Realtime são stubs nesse teste. PGlite usa uma conexão; estes casos não comprovam a corrida de duas conexões Postgres nem entrega WebSocket hospedada.

Após recompilar os bundles, valide os handlers com Deno e a aplicação com seus checks:

```sh
deno check --config supabase/functions/deno.json supabase/functions/match-command/index.ts supabase/functions/piece-params/index.ts supabase/functions/profile-transfer/index.ts
npm run typecheck
npm run test:music
```

Antes de abrir a beta, valide no projeto configurado com pelo menos três contas: isolamento de perfis e salas privadas; três tentativas simultâneas de ocupar uma sala; Ready concorrente e repetido; comandos duplicados e com versão antiga; recompensa exatamente uma vez; transferência e vínculo Google/email; refresh/reconexão; permissões de parâmetros e Presence, inclusive a tentativa de uma terceira conta acessar o canal privado. Confira envio SMTP e origem dos callbacks em produção. Testes de padrões e SQL não aprovam qualidade musical ou desempenho em aparelhos físicos. Meça invocações, mensagens, conexões e envios de email da beta antes de dimensionar o uso dos planos gratuitos.
