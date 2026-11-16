# Mapa de trabalho do ChickenChess

Leia esta página para localizar a área; depois abra só o mapa da área e os módulos da linha do pedido. Mecânica atual: índice `GAME_MECHANICS.md` + o arquivo do assunto em `docs/mechanics/`. Agenda futura: `docs/music/MUSIC_ENGINE_PLAN.md`. Referências musicais em `docs/music/`, somente quando o assunto exigir.

## Áreas

| Área | Mapa | Pastas principais |
| --- | --- | --- |
| Motor musical, kits oficiais, perfis por cidade, samples, Strudel | [music.md](codebase/music.md) | `lib/music/`, `data/music/`, `scripts/` (geradores) |
| Criativo: bancada, salvar/importar kits, knobs | [creative.md](codebase/creative.md) | `components/creative-studio.tsx`, `components/creative/`, `lib/music/creative.ts` |
| Partida: tabuleiro, widgets, cartas e poderes, bots e análise, globo, campanhas, progresso, efeitos sonoros | [match.md](codebase/match.md) | `components/chess-game.tsx`, `hooks/`, `lib/chess-*.ts`, `components/world-map.tsx` |
| Pátio / PigChicKen e galinha: movimento, controles, itens, combate, Templo, editor, músicas | [patio.md](codebase/patio.md) | `lib/chicken/`, `lib/pigchicken/`, `components/chicken/`, `components/pigchicken/` |
| Pátio: escalas dos instrumentos, Cordas soltas, vozes, instrumentos fixos (Harpa, Bateria) | [patio-instruments.md](codebase/patio-instruments.md) | `lib/pigchicken/instrument-scales.ts`, `strings-play.ts`, `drum-kit.ts`, `synth.ts` |
| Pátio: Grade de blocos e rodada do Campo minado (gangorra, bombas, Filhote) | [patio-mine-grid.md](codebase/patio-mine-grid.md) | `lib/pigchicken/mine-*.ts`, `components/pigchicken/mine-*.ts(x)` |
| Pátio: layout, Modo editor e elementos inseridos (casas, chãos, árvores, Baú, Gongo, lousa, salvar/abrir) | [patio-editor.md](codebase/patio-editor.md) | `lib/pigchicken/layout*.ts`, `components/pigchicken/patio-editor.tsx` |
| Online 1v1, contas, backend Supabase, admin, páginas públicas, instalação e deploy | [online-and-site.md](codebase/online-and-site.md) | `components/online/`, `lib/online/`, `supabase/`, `app/` |

## Desenho do Pátio

`components/pigchicken/parquinho.tsx` monta o canvas, o laço e a entrada. O desenho fica em `components/pigchicken/draw/` (um arquivo por grupo: mundo, aliens e alvos, golpe e efeitos, itens, interface) além de `note-stage-draw.ts` e `temple-draw.ts`. Para mudar o visual de algo, abra só o arquivo de desenho correspondente.

## Verificação com pouco ruído

- Tipos: `npm run typecheck`.
- Uma área: `node --test tests/music/<dominio>.cases.cjs`; nomes e cobertura em `tests/README.md`.
- Integração musical: `npm run test:music` (agrega os mesmos testes, sem duplicar registro).
- Lint: `npx eslint <arquivos-ts-ou-tsx-alterados>`.
- Navegador somente para mudanças de interface/gesto/integração de áudio que os testes não verificam. Confirme que a porta pertence a este checkout: já houve outra cópia do projeto na porta 3003. Não reinicie nem altere um servidor de outro checkout por engano.
- Depois de passar, repita somente diante de novas mudanças relevantes ou falhas. Guarde logs grandes fora do contexto; retorne resumo e trechos de erro necessários. `scripts/benchmark-mobile-audio.cjs` audita densidade de notas/efeitos e custo de query em Node; limites e retorno do Redmi estão em `docs/CPU_OPTIMIZATION.md`, sem equivaler a medição DSP no celular.

## Política de manutenção

Cada módulo tem uma responsabilidade, não um limite artificial de linhas. Extraia quando duas funcionalidades exigem contextos distintos; evite uma camada extra só para encaminhar argumentos. Perfis descrevem dados; a implementação comum continua em `styled-kits.ts`. Não abra scores `.strudel` gerados ou WAVs para localizar lógica: use o gerador/fonte.

O histórico da conversa não é documentação de entrada obrigatória. Ao iniciar um assunto novo, este mapa, a seção mecânica e o estado atual do código devem bastar. Novas decisões relevantes precisam ir ao documento correto, sem copiar toda a conversa.

Subagentes são úteis para trabalho independente, com arquivos de escrita separados, resultado verificável e contexto mínimo. Um agente leve pode executar extrações mecânicas ou levantar referências de código; o principal retém decisões de arquitetura/áudio e revisão. Delegar a mesma investigação a vários agentes ou repassar todo o histórico aumenta consumo. Não há porcentagem de economia garantida: medir tarefas comparáveis antes de afirmar redução de tokens.

## Custo de execução

Primeira rodada implementada e medida em `docs/CPU_OPTIMIZATION.md`; benchmarks em `scripts/benchmark-{drag,rolls}.cjs`. Próximas investigações com medições: montagem/atualização dos painéis, consultas do monitor, recompilação por edição, agendamento/áudio e globo. A reorganização desta etapa não é uma otimização de CPU nem aprovação de desempenho mobile. Não alterar comportamento musical junto de uma simples movimentação de código.

Ainda há arquivos grandes fora desta extração (`chess-game.tsx`, `world-map.tsx`, `globe-component.tsx` e engine nativa). Separá-los deve acompanhar uma responsabilidade concreta a alterar; quantidade de arquivos, por si só, não mede eficiência.

Os desenhos das peças usados no tabuleiro e na prévia de instrumentos do lobby ficam em `lib/chess-piece-svg.ts`; `chessground-board.tsx` mantém a reexportação para consumidores existentes.
