# Testes por domínio

`npm run test:music` reúne 244 casos, incluindo as regressões do arranjo global, organizados abaixo. Os arquivos `.cases.cjs` evitam descoberta duplicada pelo runner padrão. Helpers em `helpers/music.cjs` compartilham o carregamento TypeScript, os imports JSON dos presets MIDI, o armazenamento em memória e o bundle real do Strudel.

| Arquivo em `tests/music/` | Casos | Responsabilidade |
| --- | ---: | --- |
| `model.cases.cjs` | 11 | Identidade, movimentos, captura, ativação, graus e pausa |
| `creative.cases.cjs` | 8 | Sessão schema 7, edição, MIDI obrigatório, pausas/acordes, chance de tocar opcional/validada, limites de articulação/bancos/notas/importação de 2 MB e migração v1–v4 com preservação de rolls e seeds para bancos ausentes |
| `arrangement.cases.cjs` | 17 | Forma global, limites/IDs, fronteiras em diferentes pulsos, reordenação por identidade, bancos de durações distintas, presença/transposição/reinício com prioridade regra > pin > seção, migrações v5/v6, Kit Harmony versus planos sem apagar graus, seek/pausa, fila de seção sem cortar buses/recalcular ao editar/cancelar ao excluir ou pausar, draft contínuo e equivalência de consultas/exportação/monitor |
| `patterns.cases.cjs` | 16 | Compilação MIDI, chance de tocar com `degradeBy` e nota manual sem probabilidade, acentos explícitos, seções/fase contínua, Solo, swing, oitava, samples, bancos vazios, audição manual e equivalência da exportação |
| `ranges.cases.cjs` | 16 | Valores fixos e ranges L/S/N incluindo LPF de 20–20000 Hz, N padrão para ranges sem frequência salva, seções/reentrada/fase contínua/timeline/pin, sorteios por ataque compartilhados em acordes, estabilidade em janelas curtas, ordem de notas densas, cap opcional nas prévias, prioridade/retorno de reação LPF, exportação, harmonia por compasso, afinação/URL e seis cenas por cidade |
| `kits.cases.cjs` | 23 | Cidades, descrições culturais, 13 bancos sob orçamento de 15 MB, Salvador, curadoria, geração MIDI determinística, persistência schema 7 com arranjo global/atribuições por peça, refresh de revisão sem backup, reset legado único/idempotente, armazenamento bloqueado/recuperado e preservação de perfil/progresso/biblioteca MIDI |
| `runtime.cases.cjs` | 23 | Monitor de notas/pausas explícitas, pulsos isolados, buses por capacidade, transporte/visibilidade, samples sem grafo antecipado, espera dos worklets de Drive/Supersaw no primeiro ataque, cancelamento, ataques secos imediatos, nota manual sem refresh/relógio, soltura curta e supressão por saída |
| `reactions.cases.cjs` | 14 | Cheque com presença/pausas por peça, eventos, regras, transformações de graus MIDI/escala e prioridade/retorno da harmonia sobre sequências do kit |
| `transport.cases.cjs` | 13 | Mixer por equipe, fine pitch em todas as notas MIDI e velocidade de samples, BPM/compasso, rampas, downbeat, salto pausado/reinício/preservação de rampas, seção enfileirada com deadline exato/monitor sem avanço antecipado/substituição/cancelamento e fila de regras com coalescência/cancelamento/rebase |
| `meter.cases.cjs` | 6 | Onze compassos, unidade do BPM, agrupamentos, persistência de quintos/sétimos, 19 kits rítmicos, reset de fórmula e equivalência Strudel |
| `editor.cases.cjs` | 13 | Duração, atribuições na forma global, progressões harmônicas/tétrades de jazz nos eventos compilados sem expandir bancos, edição/espelho/randomização MIDI, +/− de bancos explícitos com limites e pin, loop por peça, cursor sem falsa reprodução, fase visual sem compilar, slides e pan por nota |
| `globe.cases.cjs` | 7 | Voo, linhas e colunas do grid com menos pontos nas regiões polares, pins sem colisão, direção do gesto e compensação do popup |
| `evaluation.cases.cjs` | 26 | UCI e telemetria ao vivo, prévias completas que podem premiar, memória das últimas sugestões Best/Worst vistas por posição com prioridade sobre o ranking atual e preservação de score/mensagem, busca curta da adversária antes do ranking longo, orçamento normal/tático, sinais/mate, ranking na mesma profundidade, lances forçados, cancelamento e undo/redo rápido, cache completo com histórico, mudanças de dificuldade durante a busca e integração com Stockfish Lite real |
| `opponent-timer.cases.cjs` | 4 | Pausa/retomada do tempo restante da IA, Redo pausado, mudança de posição, reavaliação/dificuldade e cancelamento por Undo/restart/saída |
| `powers.cases.cjs` | 30 | Freeze e Shield em peças/casas vazias, ataques e captura de peças congeladas, rei protegido, snapshots, ranking com poderes, expiração e roque; integração musical com Freeze em cheque/Qf2, Shield no rei e snapshots Undo/Redo; Shield bloqueia capturas de ambas as equipes, en passant e ameaças do atacante protegido; simetria por aplicador, permissão somente na vez da equipe e expiração após resposta; snapshot transferível do Worker preserva histórico, repetição e ranking; bundle JavaScript servido executa o protocolo real em worker separado (com transporte Node adaptado, sem alegar QA de navegador); Freeze verifica respostas legais adversárias antes de cobrar, aceita uma resposta restante e considera expiração, cheque e ambas as equipes |
| `progression.cases.cjs` | 7 | Migração, recompensas por vitória e lance ranqueado, saldo restante separado do bônus histórico pelos coletados, avisos únicos, gasto e reset do saldo/dica |
| `optimization.cases.cjs` | 2 | Equivalência de lanes/acordes e isolamento do cache de reverb |
| `studies.cases.cjs` | 4 | Estudo Mouth Breather e equivalência da exportação |
| `online-kit.cases.cjs` | 2 | Composição por cor, remapeamento das seções para contexto comum e preservação dos kits de origem |
| `release.cases.cjs` | 2 | Sincronia entre package, lockfile e versão exibida; no máximo uma entrada por data |

Para uma área: `node --test tests/music/editor.cases.cjs`.
Para um relatório completo explícito: `node --test --test-reporter=tap tests/music.test.cjs`.

A separação preserva os casos e as asserções. Testes de padrões não substituem escuta nem medição de desempenho em aparelho físico. Execute também `npm run typecheck` ao alterar música.

## Online

`npm run test:online` reúne 31 casos: onze do domínio puro do 1v1 (turnos, poderes, Undo/Redo, gastos, sugestões em qualquer turno com cooldown compartilhado, memória, streaks, resultado e comandos), sete de cache/backup isolado por identidade, três de parâmetros MIDI/arranjo compartilhado e dez de callbacks OAuth/Google já vinculado (incluindo a URL real sem marcador, erros sobre sessão antiga, falha de inicialização PKCE e mensagens sem credenciais). `supabase/tests/database.test.cjs` executa 22 casos de migração em PostgreSQL/PGlite e cobre grants/RLS, CAS/identidade, salas, pedidos, commits, liquidação, transferência e nomes de batismo separados do nome público (304 termos, limites, imutabilidade, edição e importação Google). Instalação e limites dessa validação estão em `docs/ONLINE_SETUP.md`; Auth/Realtime hospedados e concorrência entre conexões exigem o projeto configurado; a rodada real de 04/10 está registrada no guia, incluindo conflitos HTTP 409, duas vagas/Ready simultâneos e transferência entre sessões. Bundles das Functions: `npm run build:online`, depois Deno check conforme o guia. Não usar `db reset` contra produção.

## Páginas públicas e privacidade

`node --test tests/site.cases.cjs` verifica três casos do filtro de analytics: callbacks OAuth são omitidos, convites/IDs/fragmentos são removidos da URL e entradas inválidas são recusadas. Valide as páginas estáticas com `npm run build` e a interface no navegador: leitura sem login, âncoras, layout mobile, links do globo e abertura em nova aba pelo login. A política e os termos são textos do produto; os testes não constituem análise jurídica.
