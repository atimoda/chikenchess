# Mecânica e documentação

- Antes de alterar regras de jogo, gestos, áudio, widgets, mapa ou persistência, consulte `GAME_MECHANICS.md`.
- Na mesma alteração, atualize esse documento com o comportamento realmente implementado: gatilho, efeitos, retorno/cancelamento, prioridades e escopo por modo/engine.
- Mantenha ideias futuras separadas do comportamento atual. A agenda mais ampla fica em `MUSIC_ENGINE_PLAN.md`.
- Ao validar alterações musicais, execute os testes pertinentes de `npm run test:music` e a checagem TypeScript. Não confunda teste de padrões com aprovação da qualidade musical ou desempenho em aparelho físico.
