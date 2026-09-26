# Mecânica e documentação

- Antes de alterar regras de jogo, gestos, áudio, widgets, mapa ou persistência, consulte `GAME_MECHANICS.md`.
- Na mesma alteração, atualize esse documento com o comportamento realmente implementado: gatilho, efeitos, retorno/cancelamento, prioridades e escopo por modo/engine.
- Mantenha ideias futuras separadas do comportamento atual. A agenda mais ampla fica em `MUSIC_ENGINE_PLAN.md`.
- Ao validar alterações musicais, execute os testes pertinentes de `npm run test:music` e a checagem TypeScript. Não confunda teste de padrões com aprovação da qualidade musical ou desempenho em aparelho físico.

# Versão e changelog

- Toda alteração de funcionalidade, correção funcional ou ajuste visual deve ganhar, na mesma entrega, uma entrada clara no topo de `lib/changelog.ts` e uma versão inédita. Escolha o nível pelo alcance: ajuste simples, correção pequena ou refinamento visual incrementa o sub-subnível (por exemplo, `v0.5.2` → `v0.5.22`); funcionalidade nova simples incrementa o subnível e zera o sub-subnível (por exemplo, `v0.5.1` → `v0.5.2`); funcionalidade grande incrementa o nível principal e zera os seguintes (por exemplo, `v0.5` → `v0.6`). Em geral, prefira o sub-subnível, que será o caso mais frequente. Reclassifique novas mudanças conforme seu alcance; não eleve ajustes simples a funcionalidade nem reutilize número publicado.
- Sincronize a versão em `package.json`, `package-lock.json` (raiz e pacote principal), `RELEASE_LABEL`, primeira entrada de `CHANGELOG` e referências de “versão atual” na documentação. O número exibido no mapa, na partida e no Criativo vem de `RELEASE_LABEL`.
- O changelog deve descrever o efeito perceptível para quem testa, sem detalhes internos desnecessários. Refatorações, testes ou documentação sem mudança funcional não exigem versão nova por si só.
- Antes de concluir, rode o teste de consistência da versão junto da suíte pertinente e confirme que o número novo aparece na interface.

# Trabalho com contexto reduzido

- Comece por `docs/CODEBASE_MAP.md`; localize a funcionalidade e leia somente os módulos necessários. Em `GAME_MECHANICS.md`, consulte o índice, as prioridades e as seções aplicáveis; não é necessário reler a agenda e todas as referências a cada ajuste.
- Prefira `rg -n` para símbolos/trechos e leituras delimitadas. Não carregue scores gerados, assets, lockfiles, histórico inteiro ou logs completos sem necessidade.
- Mantenha `lib/music/runtime.ts` como fachada. Implementações novas pertencem aos módulos especializados indicados no mapa; contratos ficam em `runtime-types.ts`.
- Consulte `tests/README.md` para rodar a área pertinente. Faça integração completa quando a mudança atravessar contratos/compilador/runtime; não repita checks já aprovados sem novo motivo. Use `npm run typecheck`.
- Preserve comportamento em refatorações estruturais. Não misture ajustes de timbre, regras, persistência ou otimizações de CPU com uma extração de módulos.
- Atualize o mapa se mudar os pontos de entrada/responsabilidades. Regras continuam documentadas em `GAME_MECHANICS.md`, sem duplicá-las neste arquivo.

# Delegação econômica

- Pode usar subagentes para subtarefas independentes quando isso reduzir trabalho/contexto do agente principal. Para trabalho mecânico, estreito e verificável, prefira um modelo leve disponível (por exemplo `gpt-5.6-luna`) com esforço baixo; arquitetura, áudio e decisões ambíguas ficam no principal.
- Passe objetivo, arquivos permitidos, contrato a preservar e validação esperada. Evite herdar toda a conversa; peça retorno curto com mudanças, evidências e bloqueios.
- Evite agentes escrevendo no mesmo arquivo, investigação duplicada, vários agentes para tarefas triviais ou delegação quando não há trabalho independente para o principal. O principal revisa a integração. Não prometa economia de tokens só por usar mais agentes.
