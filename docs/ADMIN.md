# Admin local

O Admin permite manter os catálogos em JSON no repositório, com publicação pelo deploy. A página `/admin` e o botão à direita de Creative no globo usam o nível de aplicação `app_metadata.access_level = "admin"`. O nível não é o papel SQL `authenticated` do Supabase, não faz parte do progresso e não é editável pelo próprio usuário. O serviço verifica a sessão e o nível no Supabase em cada requisição; o HTML estático e os catálogos do jogo não são conteúdo secreto.

## Abrir e salvar

1. Execute `npm run admin:dev` na raiz do projeto. O endereço padrão é `http://localhost:3010/admin`; outra porta pode ser escolhida com `npm run admin:dev -- --port 3000`.
2. Entre com a conta administradora. Login por código de email funciona na origem local; para Google, cadastre também o retorno dessa porta nas Redirect URLs do Supabase. A porta 3000 já é usada pelo fluxo local existente.
3. Escolha o catálogo pela lista ou busca. Textos oferecem campos por item, inclusão, remoção e reordenação; os perfis musicais e presets usam o editor JSON. As campanhas preservam os IDs e os ranks preservam os limites de pontuação.
4. Use Validar, Salvar arquivo ou Cancelar. Salvar grava um JSON formatado na pasta local. O serviço recusa um arquivo alterado depois da leitura; copie o rascunho, recarregue e concilie as mudanças.
5. Revise o diff no Git e publique pelo deploy. A versão hospedada mostra como abrir a manutenção local e não contém um serviço de gravação.

Trocar de catálogo ou retornar ao globo com alterações abre Salvar/Descartar/Continuar editando. Fechar ou recarregar a aba usa o aviso de rascunho do navegador. Trocar de conta limpa arquivos, rascunhos e respostas pendentes da identidade anterior. O atalho do Criativo abre outra aba e escolhe o perfil/preset oficial indicado, sem carregar um override pessoal. Os ajustes pessoais continuam separados dos presets oficiais.

## Fontes

- `data/ui/opening-phrases.json`: abertura comum do globo.
- `data/ui/match-tips.json`: tips exibidas sequencialmente na abertura das primeiras partidas.
- `data/ui/city-intros.json`: introduções por ID de fase. O online conserva sua entrada diretamente no título.
- `data/ui/move-messages.json`: mensagens da campanha; o online conserva a apresentação atual sem acrescentar novos avisos.
- `data/ui/city-descriptions.json`: descrições dos cartões.
- `data/ui/campaigns.json`: títulos das campanhas e IDs estáveis.
- `data/ui/rank-titles.json`: títulos dos ranks e limites estáveis.
- `data/ui/baptism-names.json`: palavras do sorteio de nomes de batismo.
- `data/music/profiles/*.json`: 45 perfis autorais normalizados; curadoria de timbre e arranjo incorporada. `lib/music/kit-profiles/catalog.ts` importa essas fontes; o compositor continua em `styled-kits.ts`. Os arquivos autorais TypeScript anteriores não alimentam mais o catálogo em execução.
- `public/presets/*.json`: Manchester 1999, Düsseldorf Electro 01 e Mouth Breather.
- `data/chicken/default-controls.json`: controles padrão da galinha (binds de Primary keyboard, Secondary keyboard e Gamepad, Touch Controls, Correr pega itens, cacarejos, analógicos e repetição do inventário). `lib/chicken/controls.ts` importa o arquivo; campo ausente ou inválido cai no padrão do código (`CHICKEN_ACTIONS`). Além do editor JSON, o painel Controles grava este arquivo com **Salvar no game** (10/11, v2.5.1; chamado Tornar este o padrão na primeira versão do dia): o botão aparece ao lado de Restaurar padrão só para conta admin, em qualquer tela e modo; no Admin local (`npm run admin:dev`, localhost) lê a revisão, envia o conjunto atual do painel e mostra o resultado no rodapé; fora do localhost, sem sessão admin ou sem o serviço, mostra o erro e não grava nada. Vale para quem não tem controles salvos no navegador e para Restaurar padrão depois do commit/deploy; controles já salvos por jogadores não mudam. A posição dos botões de toque (Editar posição dos botões) não entra.
- `data/pigchicken/default-items.json`: números e opções padrão de cada item do painel Itens (armas, instrumentos, esportivos, consumíveis, asa e bicada): todos os sliders, modo de disparo, trajetória, opções ligadas/desligadas, arpejo, notas, volume pela distância, voz, efeito, combo, Rebate e cor do rastro. Nome, família e o resto do item continuam no código (`lib/pigchicken/items.ts`), que também é o fallback de qualquer campo ausente; um valor fora dos limites do painel é recusado na validação. O botão **Salvar no game** (10/11, v2.5.1) fica no fim do painel Itens, só para conta admin, e grava os números atuais de todos os itens de uma vez, pelo mesmo caminho do Admin local e com as mesmas mensagens dos Controles. Vale para quem não mexeu no item neste navegador; o amarelo de “alterado” e o duplo clique do painel passam a comparar com esse padrão. Ajustes já salvos pelos jogadores não mudam.

São 57 atalhos. Os catálogos importados são incluídos no build; mudar apenas um arquivo do deployment não recompila os consumidores. A manutenção usa commit/build/deploy. Textos e perfis já eram estáticos: a extração não demonstra redução de consultas nem ganho medido de desempenho.

## Nomes de batismo

Salvar esse catálogo gera uma nova migração `supabase/migrations/*_baptism_catalog_json.sql` com o snapshot e hash da fonte. Também é possível executar `npm run admin:names`. A operação não publica no banco. Publique as migrações pelo fluxo Supabase do projeto, revise quais outras migrações estão pendentes e depois faça o deploy do frontend. Não altere uma migração já publicada.

O sorteio e a imutabilidade continuam no servidor. A atualização troca as palavras para futuros cadastros, preservando os nomes e UUIDs existentes. Cada categoria deve ter termos únicos, até 12 caracteres, sem caracteres de controle; todas as combinações devem caber em 40 caracteres. `npm run admin:check`, também executado antes do build, valida os 55 arquivos e exige uma migração correspondente ao JSON dos nomes.

## Permissões e proteção

A operação privilegiada e idempotente para a conta proprietária está em `supabase/admin/grant-owner.sql`; verifica uma única conta de email confirmado e preserva os demais metadados. Foi executada para `atimoda@gmail.com` em 08/10/2026. Outras concessões devem ser feitas por uma operação administrativa equivalente por UUID. Não coloque uma service role no frontend ou no serviço local: este usa somente a chave pública e o token da sessão.

O serviço escuta somente em `127.0.0.1`, usa allowlist de arquivos, bloqueia symlinks e caminhos externos, verifica a origem de gravação e salva por substituição atômica com comparação SHA-256. Não aceita um caminho enviado pelo usuário. A integração com Next existe apenas no comando explícito local; o build normal conserva `output: 'export'`.

## Verificação

`npm run test:admin`, `npm run admin:check` e `npm run typecheck`. Ao alterar música, também execute os casos pertinentes de `npm run test:music`. Para o catálogo remoto, `node --test supabase/tests/database.test.cjs` verifica as migrações em PGlite; isso não substitui Auth/Realtime hospedados. Na interface confira admin/usuário/visitante, salvar/cancelar/recarregar, conflito, JSON inválido, troca de conta e 320/390 px. Testes de padrões não aprovam qualidade musical nem desempenho em aparelho físico.
