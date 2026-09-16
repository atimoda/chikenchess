# Testes por domínio

`npm run test:music` mantém os 70 casos do runner original, organizados abaixo. Os arquivos `.cases.cjs` evitam descoberta duplicada pelo runner padrão. Helpers em `helpers/music.cjs` compartilham o carregamento TypeScript e o bundle real do Strudel.

| Arquivo em `tests/music/` | Casos | Responsabilidade |
| --- | ---: | --- |
| `model.cases.cjs` | 11 | Identidade, movimentos, captura, ativação, graus e pausa |
| `creative.cases.cjs` | 6 | Sessão, edição, validação e migração básica |
| `patterns.cases.cjs` | 10 | Compilação, groove, automação e prévias |
| `kits.cases.cjs` | 10 | Cidades, samples, catálogo e persistência |
| `runtime.cases.cjs` | 7 | Monitor, transporte ativo e gestos temporários |
| `reactions.cases.cjs` | 9 | Cheque, eventos, regras e transformações de escala |
| `transport.cases.cjs` | 6 | Mixer, fine pitch, BPM e agendamento |
| `editor.cases.cjs` | 4 | Duração, forma, variações e slides por nota |
| `globe.cases.cjs` | 3 | Voo, geometria e direção do gesto |
| `studies.cases.cjs` | 4 | Estudo Mouth Breather e equivalência da exportação |

Para uma área: `node --test tests/music/editor.cases.cjs`.
Para um relatório completo explícito: `node --test --test-reporter=tap tests/music.test.cjs`.

A separação preserva os casos e as asserções. Testes de padrões não substituem escuta nem medição de desempenho em aparelho físico. Execute também `npm run typecheck` ao alterar música.
