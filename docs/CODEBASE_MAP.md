# Mapa de trabalho do ChickenChess

Leia esta página para localizar a mudança; depois abra apenas os módulos necessários. Mecânica atual: `GAME_MECHANICS.md` (índice + seção aplicável). Agenda futura: `MUSIC_ENGINE_PLAN.md`. Referências musicais: `MUSIC_STYLE_REFERENCES.md` e `STRUDEL_REFERENCE_CATALOG.md`, somente quando o assunto exigir.

## Onde alterar

| Pedido | Entrada principal | Dependências / contratos relevantes |
| --- | --- | --- |
| Tom, graus, identidade e ativação | `lib/music/model.ts`, `reactions.ts` | `runtime-types.ts`; histórico de xadrez |
| Plano harmônico, cifras e voicings | `lib/music/harmony.ts`, `voice-spec.ts` | `creative.ts`, `reactions.ts`, `monitor.ts`; cada seção resolve centro, tríade e inversão |
| Estados/eventos, quantização e BPM | `reactions.ts`, `reaction-queue.ts`, `transport.ts` | `components/music-reaction-editor.tsx`; `music-transition-view.tsx` |
| Compasso, pulso e subdivisão | `lib/music/meter.ts`, `transport.ts` | `creative.ts` persiste 4/4–12/8; `styled-kits.ts` compõe; `performance.ts`, `music-piano-editor.tsx` e `music-playback.tsx` seguem o mesmo pulso |
| Controles que chegam a cada voz | `lib/music/voice-spec.ts` | `model.ts`, `sample-banks.ts`, `runtime-types.ts` |
| Orbits de efeitos e ciclo de vida dos buses | `lib/music/voice-spec.ts`, `runtime-session.ts` | Quatro buses no desktop, dois em aparelho restrito; audições isoladas; `team-mixer.ts` recebe a saída por equipe |
| Agrupamento de notas / exportação compacta | `lib/music/roll-optimizer.ts` | `pattern-compiler.ts`, `code-export.ts`; preserva sobreposições |
| Reverb durante arraste | `lib/music/manual-reverb-cache.ts` | `runtime-session.ts`; adapter Superdough, nunca compartilha nós ativos |
| Notas, grooves, slides, seções executadas | `lib/music/pattern-compiler.ts` | `performance.ts`, `piano-roll.ts`, `automation.ts`, `grooves.ts` |
| Código Strudel exibido/exportado | `lib/music/code-export.ts` | Deve permanecer equivalente ao compilador; teste de exportação |
| Prévia, ponteiro, pulsos, conversão e validação | `lib/music/pattern-inspection.ts`, `monitor.ts` | `lib/music/variation-edit.ts`; `components/music-piano-editor.tsx`, `music-playback.tsx`, `music-pulse-overlay.tsx` |
| Playback, gesto manual, cancelamento, mixer e lifecycle | `lib/music/runtime-session.ts` | `transport.ts`, `team-mixer.ts`, `monitor.ts`, `strudel-loader.ts`; `hooks/use-music.ts` acompanha a visibilidade da aba |
| Timbre/sample e carregamento | `sample-banks.ts`, `strudel-loader.ts` | `public/samples/README.md`, geradores em `scripts/`; quatro bancos novos em `generate-timbre-samples.py` |
| Uma cidade/estilo | `lib/music/kit-profiles/<cidade>.ts` | 16 papéis, timbres, padrões e presença por seção; `styled-kits.ts` compõe e `kit-profiles/catalog.ts` registra |
| Dez fases harmônicas | `lib/music/kit-profiles/harmonic-stages.ts` | Motivos e referências de cada cidade; `harmonic-stage-factory.ts` monta 16 papéis e `harmony.ts` define os acordes |
| Curadoria de timbre nos kits anteriores | `lib/music/kit-profiles/timbre-curation.ts` | Trocas de fonte por nome de parte, aplicadas em `kit-profiles/catalog.ts`; Manchester 1999 permanece em `manchester-kit.ts` |
| Manchester 1999 | `lib/music/manchester-kit.ts` | Complementos de seções em `styled-kits.ts` |
| Salvar/importar/migrar kits | `creative.ts`, `city-kits.ts` | Schema v4; preset antigo vai para a biblioteca como kit sem cidade |
| Bancada, seleção e sessão do Criativo | `components/creative-studio.tsx` | `components/chessground-board.tsx` compartilha desenho e arraste com a partida, usando movimento livre; `hooks/use-creative-music.ts` controla a audição |
| Knobs/ranges de som e movimento do Criativo | `components/creative/instrument-parameters.tsx` | `parameter-range.tsx` contém campo/ajuda comuns |
| Ajuda contextual | `components/info-tip.tsx` + `.module.css` | Hover, foco, toque e portal |
| Avaliação e adversária | `lib/chess-evaluation.ts`, `components/chess-game.tsx` | `public/engine/` contém Stockfish Lite; orçamento e cache no controlador; benchmark em `scripts/benchmark-chess.cjs`; medições em `docs/CHESS_ANALYSIS.md` |
| Partida/widgets | `components/chess-game.tsx`, `hooks/use-music.ts` | `synth-control-panel.tsx` contém filtro LPF/HPF e Drive; `mixer-widget.tsx` separa o mixer por equipe; `global-control-panel.tsx` mantém Board Params; `knob.tsx` define a ordem nome/controle/valor; `ui/draggable.tsx` move os painéis |
| Globo/câmera/popup/entrada | `components/world-map.tsx`, `globe-component.tsx`, `city-popup.tsx` | `lib/globe-navigation.ts`, `globe-geography.ts` |
| Campanhas e lista do mapa | `lib/campaigns.ts`, `components/campaign-city-list.tsx` | `lib/cities-data.ts` associa cada fase; `world-map.tsx` envia foco para a câmera e abre popups |
| Perfil, ovos, pontuação e ranks | `lib/game-progression.ts` | Persistência local, migração, recompensa de vitória e débito futuro |

**Nomes legados:** `lib/strudel-engine.ts` gera/analisa a notação antiga; não é o compilador Strudel atual. `lib/audio-engine.ts` e `hooks/use-audio.ts` pertencem ao caminho nativo/legado, ainda usado para áudio auxiliar. Para os loops atuais, comece em `lib/music/`. Não remova esses módulos sem verificar seus consumidores.

`lib/music/runtime.ts` é uma fachada compatível para os consumidores existentes. Não coloque implementações novas nela. Os módulos internos importam contratos de `runtime-types.ts`, não a fachada. O compilador não abre AudioContext; o loader concentra os caches. A sessão continua sendo a única dona do transporte e do ciclo de vida.

## Fluxo central

`CreativeSession` ou histórico da partida → snapshot + regras → `voiceSpecs` → `compileVoice` → `MusicTransport` → saída Strudel / mixer.

Editor/inspeção e exportação usam as mesmas especificações. Código exportado e áudio precisam permanecer equivalentes; a separação de arquivos não autoriza mudar interpretação musical em apenas um deles.

## Verificação com pouco ruído

- Tipos: `npm run typecheck`.
- Uma área: `node --test tests/music/<dominio>.cases.cjs`; nomes e cobertura em `tests/README.md`.
- Integração musical: `npm run test:music` (agrega os mesmos testes, sem duplicar registro).
- Lint: `npx eslint <arquivos-ts-ou-tsx-alterados>`.
- Navegador somente para mudanças de interface/gesto/integração de áudio que os testes não verificam. Confirme que a porta pertence a este checkout: já houve outra cópia do projeto na porta 3003. Não reinicie nem altere um servidor de outro checkout por engano.
- Depois de passar, repita somente diante de novas mudanças relevantes ou falhas. Guarde logs grandes fora do contexto; retorne resumo e trechos de erro necessários.

## Política de manutenção

Cada módulo tem uma responsabilidade, não um limite artificial de linhas. Extraia quando duas funcionalidades exigem contextos distintos; evite uma camada extra só para encaminhar argumentos. Perfis descrevem dados; a implementação comum continua em `styled-kits.ts`. Não abra scores `.strudel` gerados ou WAVs para localizar lógica: use o gerador/fonte.

O histórico da conversa não é documentação de entrada obrigatória. Ao iniciar um assunto novo, este mapa, a seção mecânica e o estado atual do código devem bastar. Novas decisões relevantes precisam ir ao documento correto, sem copiar toda a conversa.

Subagentes são úteis para trabalho independente, com arquivos de escrita separados, resultado verificável e contexto mínimo. Um agente leve pode executar extrações mecânicas ou levantar referências de código; o principal retém decisões de arquitetura/áudio e revisão. Delegar a mesma investigação a vários agentes ou repassar todo o histórico aumenta consumo. Não há porcentagem de economia garantida: medir tarefas comparáveis antes de afirmar redução de tokens.

## Custo de execução

Primeira rodada implementada e medida em `docs/CPU_OPTIMIZATION.md`; benchmarks em `scripts/benchmark-{drag,rolls}.cjs`. Próximas investigações com medições: montagem/atualização dos painéis, consultas do monitor, recompilação por edição, agendamento/áudio e globo. A reorganização desta etapa não é uma otimização de CPU nem aprovação de desempenho mobile. Não alterar comportamento musical junto de uma simples movimentação de código.

Ainda há arquivos grandes fora desta extração (`chess-game.tsx`, `world-map.tsx`, `globe-component.tsx` e engine nativa). Separá-los deve acompanhar uma responsabilidade concreta a alterar; quantidade de arquivos, por si só, não mede eficiência.
