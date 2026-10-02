# Testes por domínio

`npm run test:music` reúne 213 casos, incluindo as regressões do arranjo global, organizados abaixo. Os arquivos `.cases.cjs` evitam descoberta duplicada pelo runner padrão. Helpers em `helpers/music.cjs` compartilham o carregamento TypeScript, os imports JSON dos presets MIDI, o armazenamento em memória e o bundle real do Strudel.

| Arquivo em `tests/music/` | Casos | Responsabilidade |
| --- | ---: | --- |
| `model.cases.cjs` | 11 | Identidade, movimentos, captura, ativação, graus e pausa |
| `creative.cases.cjs` | 7 | Sessão schema 7, edição, MIDI obrigatório, pausas/acordes, limites de articulação/bancos/notas/importação de 2 MB e migração v1–v4 com preservação de rolls e seeds para bancos ausentes |
| `arrangement.cases.cjs` | 17 | Forma global, limites/IDs, fronteiras em diferentes pulsos, reordenação por identidade, bancos de durações distintas, presença/transposição/reinício com prioridade regra > pin > seção, migrações v5/v6, Kit Harmony versus planos sem apagar graus, seek/pausa, fila de seção sem cortar buses/recalcular ao editar/cancelar ao excluir ou pausar, draft contínuo e equivalência de consultas/exportação/monitor |
| `patterns.cases.cjs` | 15 | Compilação MIDI, acentos explícitos, seções/fase contínua, Solo, swing, oitava, samples, bancos vazios, audição manual e equivalência da exportação |
| `ranges.cases.cjs` | 15 | Ranges L/S/N incluindo LPF de 20–20000 Hz, oitava legada por compasso, seções/reentrada/fase contínua/timeline/pin, sorteios por ataque compartilhados em acordes, estabilidade em janelas curtas, ordem de notas densas, cap opcional nas prévias, prioridade/retorno de reação LPF, exportação, harmonia por compasso, afinação/URL e seis cenas por cidade |
| `kits.cases.cjs` | 23 | Cidades, descrições culturais, 13 bancos sob orçamento de 15 MB, Salvador, curadoria, geração MIDI determinística, persistência schema 7 com arranjo global/atribuições por peça, refresh de revisão sem backup, reset legado único/idempotente, armazenamento bloqueado/recuperado e preservação de perfil/progresso/biblioteca MIDI |
| `runtime.cases.cjs` | 23 | Monitor de notas/pausas explícitas, pulsos isolados, buses por capacidade, transporte/visibilidade, samples sem grafo antecipado, espera dos worklets de Drive/Supersaw no primeiro ataque, cancelamento, ataques secos imediatos, nota manual sem refresh/relógio, soltura curta e supressão por saída |
| `reactions.cases.cjs` | 14 | Cheque com presença/pausas por peça, eventos, regras, transformações de graus MIDI/escala e prioridade/retorno da harmonia sobre sequências do kit |
| `transport.cases.cjs` | 13 | Mixer por equipe, fine pitch em todas as notas MIDI e velocidade de samples, BPM/compasso, rampas, downbeat, salto pausado/reinício/preservação de rampas, seção enfileirada com deadline exato/monitor sem avanço antecipado/substituição/cancelamento e fila de regras com coalescência/cancelamento/rebase |
| `meter.cases.cjs` | 6 | Onze compassos, unidade do BPM, agrupamentos, persistência de quintos/sétimos, 19 kits rítmicos, reset de fórmula e equivalência Strudel |
| `editor.cases.cjs` | 13 | Duração, atribuições na forma global, progressões harmônicas/tétrades de jazz nos eventos compilados sem expandir bancos, edição/espelho/randomização MIDI, +/− de bancos explícitos com limites e pin, loop por peça, cursor sem falsa reprodução, fase visual sem compilar, slides e pan por nota |
| `globe.cases.cjs` | 7 | Voo, linhas e colunas do grid com menos pontos nas regiões polares, pins sem colisão, direção do gesto e compensação do popup |
| `evaluation.cases.cjs` | 22 | UCI e telemetria ao vivo, prévias completas que podem premiar, busca curta da adversária antes do ranking longo, orçamento normal/tático, sinais/mate, ranking na mesma profundidade, lances forçados, cancelamento e undo/redo rápido, cache completo com histórico, mudanças de dificuldade durante a busca e integração com Stockfish Lite real |
| `powers.cases.cjs` | 12 | Freeze e Shield em peças/casas vazias, ataques e captura de peças congeladas, rei protegido, snapshots, ranking com poderes, expiração e roque |
| `progression.cases.cjs` | 7 | Migração, recompensas por vitória e lance ranqueado, saldo restante separado do bônus histórico pelos coletados, avisos únicos, gasto e reset do saldo/dica |
| `optimization.cases.cjs` | 2 | Equivalência de lanes/acordes e isolamento do cache de reverb |
| `studies.cases.cjs` | 4 | Estudo Mouth Breather e equivalência da exportação |
| `release.cases.cjs` | 2 | Sincronia entre package, lockfile e versão exibida; no máximo uma entrada por data |

Para uma área: `node --test tests/music/editor.cases.cjs`.
Para um relatório completo explícito: `node --test --test-reporter=tap tests/music.test.cjs`.

A separação preserva os casos e as asserções. Testes de padrões não substituem escuta nem medição de desempenho em aparelho físico. Execute também `npm run typecheck` ao alterar música.
