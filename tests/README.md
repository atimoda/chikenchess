# Testes por domínio

`npm run test:music` mantém os casos do runner original e as regressões de otimização, organizados abaixo. Os arquivos `.cases.cjs` evitam descoberta duplicada pelo runner padrão. Helpers em `helpers/music.cjs` compartilham o carregamento TypeScript e o bundle real do Strudel.

| Arquivo em `tests/music/` | Casos | Responsabilidade |
| --- | ---: | --- |
| `model.cases.cjs` | 11 | Identidade, movimentos, captura, ativação, graus e pausa |
| `creative.cases.cjs` | 6 | Sessão, edição, validação e migração básica |
| `patterns.cases.cjs` | 10 | Compilação, groove, automação e prévias |
| `kits.cases.cjs` | 20 | Cidades, descrições culturais, sete bancos de samples, curadoria de timbre, catálogo e persistência |
| `runtime.cases.cjs` | 16 | Monitor, pulsos isolados, buses por capacidade, transporte ativo, visibilidade da aba, preparação de samples sem grafo antecipado e gestos temporários |
| `reactions.cases.cjs` | 9 | Cheque, eventos, regras e transformações de escala |
| `transport.cases.cjs` | 6 | Mixer, fine pitch, BPM e agendamento |
| `meter.cases.cjs` | 6 | Onze compassos, unidade do BPM, agrupamentos, persistência de quintos/sétimos, 18 kits novos, reset de fórmula e equivalência Strudel |
| `editor.cases.cjs` | 10 | Duração, forma, progressões harmônicas, tétrades de jazz, edição/espelho de variações, loop por peça e slides por nota |
| `globe.cases.cjs` | 4 | Voo, geometria, direção do gesto e compensação do popup |
| `evaluation.cases.cjs` | 11 | UCI, orçamento, sinais/mate, ranking completo, cancelamento, cache com histórico, mudanças de dificuldade durante a busca e integração com Stockfish Lite real |
| `progression.cases.cjs` | 3 | Migração, recompensa, saldo de ovos e pontos históricos |
| `optimization.cases.cjs` | 2 | Equivalência de lanes/acordes e isolamento do cache de reverb |
| `studies.cases.cjs` | 4 | Estudo Mouth Breather e equivalência da exportação |
| `release.cases.cjs` | 1 | Sincronia entre package, lockfile e versão/changelog exibidos |

Para uma área: `node --test tests/music/editor.cases.cjs`.
Para um relatório completo explícito: `node --test --test-reporter=tap tests/music.test.cjs`.

A separação preserva os casos e as asserções. Testes de padrões não substituem escuta nem medição de desempenho em aparelho físico. Execute também `npm run typecheck` ao alterar música.
