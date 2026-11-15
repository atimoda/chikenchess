# Histórico completo da partida (Match log)

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../GAME_MECHANICS.md). Criado em 15/11, v2.11.0.

## Para que serve

Copiar tudo o que aconteceu numa partida, na ordem, para colar numa conversa ao relatar um bug. A lista de lances do rodapé não mostra poderes, Undo/Redo, setas abertas nem o estado das recompensas de ovos; o Match log mostra.

## Gatilho

**Preferências** da partida (campanha e online) → linha **Match log** → botão **Copy**. O texto vai para a área de transferência; o botão mostra `Copied` por 2 s (ou `Copy failed` se o navegador recusar a cópia). Não há custo em ovos nem efeito na partida. A linha não aparece em Preferências do globo, do Criativo ou do Pátio.

## Formato

Texto simples. A primeira linha é `ChickenChess match log` seguido de um JSON com o cabeçalho; depois vem uma linha por acontecimento, numerada, com um JSON cada.

- **Cabeçalho:** versão do jogo, modo (`campaign` ou `online`), data da cópia, lance atual (`ply`), FEN e lances em SAN da posição atual, saldo de ovos dos dois lados, pontos históricos, usos de Freeze/Shield/Undo/Redo/Best/Worst, a configuração de recompensas (`data/ui/egg-rewards.json`), o navegador (`device`) e a quantidade de acontecimentos. Na campanha: cidade, bot e a sequência atual do jogador e do bot. No online: a cor de quem copiou, a versão do estado e os campos `rewarded`, `seen`, `suggestions` e `result` do estado confirmado. Não inclui nomes nem ids de jogadores.
- **Todo acontecimento** traz `t` (o tipo) e `eggsAfter` (saldo dos dois lados depois dele). Na campanha traz também `powers`, os Freeze/Shield ativos depois dele (`tipo casa quem-aplicou`).

### Campanha

| `t` | Quando | Campos |
| --- | --- | --- |
| `move` | Lance do jogador (`by: w`) ou do bot (`by: b`) | `ply`, `san`, `uci`, `fen` (antes do lance), `reward` (`best`, `worst` ou `null`), `comeback` (Best pago como Worst), `via` (`square` = ovos da casa destino, `seen` = sugestão vista, `ranking` = ranking atual), `otherPiece`, `streak` (`tipox contagem`, depois do lance), `x2`, `legal`, `eggs` (prêmio inteiro), `earned` (entrou no contador), `historic` (excedente), `repeat` (posição e lance já premiados), `analysis` (lances legais, profundidade e a cabeça premiada de Best e Worst com o score de cada lance), `squareEggs` e `seen` (os conjuntos que estavam valendo) |
| `view` | Setas de Best, Worst ou Top abertas | `kind`, `cost`, `ply`, `fen`, `analysis` |
| `power` | Freeze ou Shield aplicado pelo jogador ou pelo ChickenBot | `by`, `kind`, `square`, `cost`, `ply`, `fen` |
| `undo` | Undo; com `mulligan: true` quando desfaz um xeque-mate | `fromPly`, `ply`, `fen`, `streak` recomposta |
| `redo` | Redo | `ply`, `san`, `fen`, `streak` recomposta |
| `bot` | Troca em Bot level | `name`, `ply` |
| `gameOver` | Xeque-mate ou empate no tabuleiro | `result`, `ply`, `fen` |
| `settle` | Vitória ou empate liquidado no perfil | `result`, `toProfile`, `historicPoints` |
| `debugEggs` | Os 10 ovos do atalho de teste | `amount` |

### Online

O log é montado a cada estado confirmado pelo servidor.

| `t` | Quando | Campos |
| --- | --- | --- |
| `move` / `power` | Cada ação nova do estado | `action` (posição na lista), `ply`, `by`, `san`, `uci`, `fen`, `legal`, `reward`, `comeback`, `streak`, `x2`, `eggs` (o que a regra paga antes do teto), `paid` e `historic` (o que o servidor de fato pagou, pela diferença entre os dois estados), `redo: true` quando veio de um Redo, `historicAfter` |
| `joined` | Primeiro estado visto (entrar ou recarregar no meio da partida) | As ações anteriores vêm antes dele com `replayed: true` e sem `paid` |
| `undo` | Lista de ações encurtada | `fromAction`, `toAction` |
| `view` | Sugestões Best/Worst publicadas por qualquer jogador | `by`, `kind`, `cost`, `moves` |
| `end` | Resultado definido | `winner`, `reason` |

## Limites e escopo

- Guarda os 2000 acontecimentos mais recentes, só em memória: sair da partida ou recarregar a página apaga o log da campanha; no online, as ações são reconstruídas do estado do servidor, sem o que cada uma pagou.
- No online com várias ações confirmadas de uma vez (Redo), `paid` não é separado por ação.
- Vale na campanha e no online, nas duas engines de áudio. Não existe no Criativo nem no Pátio.
- Código: `lib/match-log.ts` (formato e cópia), `lib/online/match-log.ts` (online), registro em `components/chess-game.tsx` e `components/online/online-game.tsx`, botão em `components/game-preferences.tsx`.
