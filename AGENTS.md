# Mecânica e documentação

- Toda alteração de mecânica ou interface deve ser aplicada em todos os modos de jogo, salvo quando o pedido indicar explicitamente um modo específico.

- Antes de alterar regras de jogo, gestos, áudio, widgets, mapa ou persistência, consulte o arquivo do assunto em `docs/mechanics/` (o índice `GAME_MECHANICS.md` diz qual).
- Na mesma alteração, atualize esse arquivo com o comportamento realmente implementado: gatilho, efeitos, retorno/cancelamento, prioridades e escopo por modo/engine.
- Mantenha ideias futuras separadas do comportamento atual. A agenda mais ampla fica em `docs/music/MUSIC_ENGINE_PLAN.md`.
- Ao validar alterações musicais, execute os testes pertinentes de `npm run test:music` e a checagem TypeScript. Não confunda teste de padrões com aprovação da qualidade musical ou desempenho em aparelho físico.

# Versão e changelog

- Agrupe todas as alterações feitas no mesmo dia em uma única entrada do topo de `lib/changelog.ts` e sob um único número de versão; nunca crie mais de uma versão ou entrada por data. Mudanças adicionais no mesmo dia são acrescentadas à entrada diária e não incrementam novamente a versão. Cada nova data recebe um número inédito. O nível da versão considera o conjunto das mudanças daquele dia: ajuste simples, correção pequena ou refinamento visual incrementa o sub-subnível; funcionalidade nova simples incrementa o subnível e zera o sub-subnível; funcionalidade grande incrementa o nível principal e zera os seguintes. Se o alcance acumulado do dia mudar, recalcule o número dessa mesma versão diária. Em geral, prefira o sub-subnível quando for suficiente; não eleve ajustes simples a funcionalidade.
- `lib/changelog.ts` guarda só as versões recentes (`RECENT`); as antigas ficam em `lib/changelog-archive.ts`, que não muda e não precisa ser lido. Quando `RECENT` passar de três versões, mova a mais antiga para o topo do arquivo morto.
- Mantenha o histórico com no máximo uma entrada por data. Ao reorganizá-lo, reúna todos os itens e grupos daquela data sem perder o conteúdo e recalcule os números em ordem cronológica.
- Para mudar o número, rode `npm run version:set -- X.Y.Z` (aceita `--date DD/MM/AAAA`): ele sincroniza `package.json`, `package-lock.json` (raiz e pacote principal), `RELEASE_LABEL` (em `lib/release.ts`) e a primeira entrada do changelog, renumerando a entrada do dia ou criando uma nova vazia. Não abra o lockfile para isso. Depois, só escreva título e itens da entrada e atualize referências de “versão atual” na documentação, se houver. O número exibido no mapa, na partida e no Criativo vem de `RELEASE_LABEL`.
- O changelog deve descrever o efeito perceptível para quem testa, sem detalhes internos desnecessários. Refatorações, testes ou documentação sem mudança funcional não exigem versão nova por si só.
- Antes de concluir, rode o teste de consistência da versão junto da suíte pertinente e confirme que o número novo aparece na interface.

# Trabalho com contexto reduzido

- Comece por `docs/CODEBASE_MAP.md`; localize a funcionalidade e leia somente os módulos necessários. Em `GAME_MECHANICS.md`, consulte só o índice e abra o arquivo do assunto em `docs/mechanics/`; não é necessário reler a agenda e todas as referências a cada ajuste.
- Prefira `rg -n` para símbolos/trechos e leituras delimitadas. Não carregue scores gerados, assets, lockfiles, histórico inteiro ou logs completos sem necessidade.
- Mantenha `lib/music/runtime.ts` como fachada. Implementações novas pertencem aos módulos especializados indicados no mapa; contratos ficam em `runtime-types.ts`.
- Consulte `tests/README.md` para rodar a área pertinente. Faça integração completa quando a mudança atravessar contratos/compilador/runtime; não repita checks já aprovados sem novo motivo. Use `npm run typecheck`.
- Preserve comportamento em refatorações estruturais. Não misture ajustes de timbre, regras, persistência ou otimizações de CPU com uma extração de módulos.
- `docs/CODEBASE_MAP.md` é um índice curto que aponta o mapa da área em `docs/codebase/`; leia só o da área. Arquivos de `docs/mechanics/` e `docs/codebase/` ficam abaixo de ~30 KB: ao passar disso, divida por subassunto e atualize o índice correspondente.
- Atualize o mapa se mudar os pontos de entrada/responsabilidades. Regras continuam documentadas em `docs/mechanics/`, sem duplicá-las neste arquivo.

# Delegação econômica

- Pode usar subagentes para subtarefas independentes quando isso reduzir trabalho/contexto do agente principal. Para trabalho mecânico, estreito e verificável, prefira um modelo leve disponível (por exemplo `gpt-5.6-luna`) com esforço baixo; arquitetura, áudio e decisões ambíguas ficam no principal.
- Passe objetivo, arquivos permitidos, contrato a preservar e validação esperada. Evite herdar toda a conversa; peça retorno curto com mudanças, evidências e bloqueios.
- Evite agentes escrevendo no mesmo arquivo, investigação duplicada, vários agentes para tarefas triviais ou delegação quando não há trabalho independente para o principal. O principal revisa a integração. Não prometa economia de tokens só por usar mais agentes.
