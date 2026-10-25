# Manutenção, ideias e histórico

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../GAME_MECHANICS.md).

## Estados e ideias ainda não associados à engine Strudel

Contagem de ameaças sofridas/produzidas, ameaça à rainha, mobilidade legal, proximidade do rei, estados “tenso/excitado”, bônus de captura, destaque elaborado da última peça e modulação por vitória provável não estão implementados. Vantagem material e eventos abaixo já podem controlar parâmetros por regras do kit. O efeito de equipe durante cheque é a primeira regra tática coletiva.

ChickenChess cooperativo/invertido, poderes que gastam ovos, loja, multiplayer, vestiário, administração/publicação de kits e mundo por época continuam planejados. A partida atual segue o xadrez clássico contra IA.

## Manutenção e verificação

Toda mudança de regra, gesto, controle ou persistência deve atualizar a linha correspondente neste documento, com gatilho, efeito, retorno/prioridade e escopo. `MUSIC_ENGINE_PLAN.md` mantém a agenda futura; este documento descreve o presente.

Fontes principais: `lib/music/model.ts`, `lib/music/runtime-session.ts` e módulos descritos em `docs/CODEBASE_MAP.md`, `hooks/use-music.ts`, `components/chess-game.tsx`, `components/creative-studio.tsx`, `components/ui/draggable.tsx`, `components/globe-component.tsx`. Regressões em `tests/music.test.cjs` cobrem cheque/saída/mate/capturas/undo, interrupção do loop no arraste, cancelamento, frase pelo botão e chegada ao pin.

### Catálogo de escalas compartilhado

`lib/music/scales.ts` é a fonte única para tom/escala do kit e ações de estados/eventos, validada na importação e preservada no salvamento. Além das seis coleções anteriores: Blues menor/maior, Whole tone, duas Octatonic/Diminished (tom–semitom e semitom–tom), Harmônica menor, Melódica menor ascendente/jazz, Phrygian, Phrygian dominant (frígio dominante, 5º modo da harmônica menor: 1–♭2–3–4–5–♭6–♭7, usado em Goa 1994), Lydian, Lydian dominant, Locrian, Aeolian e Chromatic. Aeolian é um alias sonoro de Menor natural. Rotação modal admite 0–11 graus, reduzidos pelo tamanho da coleção; relativa maior/menor só atua nas respectivas coleções, incluindo Aeolian. A menor melódica não muda automaticamente ao descer. Kits de fábrica aleatórios mantêm as seis escolhas originais para preservar seeds existentes; novas variações aleatórias exploram o catálogo completo.

As coleções usam temperamento igual de 12 semitons: não representam ainda afinações microtonais, regras de direção ou ornamentação de todas as tradições. Referência teórica: [Open Music Theory — Collections](https://viva.pressbooks.pub/openmusictheory/chapter/collections/). Afinações e gramáticas melódicas específicas ficam na agenda futura.

### Reorganização interna — 16/09

Contratos, especificações de voz, compilação, exportação, inspeção e carregamento foram extraídos da fachada `runtime.ts`; a sessão continua dona do relógio, mixer, gestos e cancelamento. Perfis de cidades ficam em `kit-profiles/`, com o mesmo compositor e dados. O painel de parâmetros do Criativo recebe valores/callbacks e mantém o estado no compositor da tela. Testes foram separados por assunto com agregação compatível. Nenhum gatilho, efeito, prioridade, retorno, escopo por modo ou formato salvo mudou nesta reorganização. A revisão de processamento da aplicação é uma etapa posterior.

### Histórico dos caminhos substituídos — até v0.10.0

Registro anterior à entrega MIDI-only de 02/10 (v0.11.0). Estes trechos preservam decisões e comportamentos históricos; o contrato atual é o schema 7, com migração do arranjo sem novo descarte; o reset único MIDI v5 está distinguido acima como histórico.

> A coleção usa `catalogRevision` internamente para detectar quando o preset de uma cidade mudou. Ao carregar um kit salvo de revisão anterior, o navegador primeiro o preserva em **Meus kits** com nome livre, como “Manchester 1999 v1”, e retira seu vínculo com a cidade; então instala o novo preset da fase. Se esse mesmo kit já estiver na biblioteca como vinculado, sua entrada é convertida em vez de duplicada. Nomes já ocupados recebem o próximo número. O botão separado **Kit anterior** foi removido. Backups locais criados antes desta mudança também viram kits soltos na biblioteca; após a cópia bem-sucedida, sua chave antiga é removida. Se a biblioteca estiver cheia, corrompida ou indisponível, o kit antigo permanece vinculado e não é substituído. Manchester 1999, Düsseldorf 1970 e New Orleans 1953 mantêm revisões próprias; as demais fases usam a revisão global do catálogo. Salvar no Criativo marca o kit com a revisão atual da cidade, para que ele mantenha prioridade nas próximas leituras. Esta migração é local; não publica dados em servidor.

> - Automações são lidas a cada ataque; não modulam continuamente uma nota que já começou.

> Em Piece Params, o knob **LPF / HPF** fica às 12h no zero: LPF em 20 kHz e HPF em 0 Hz, ambos efetivamente desligados. Girar à esquerda baixa o corte do LPF em escala logarítmica e desliga o HPF; girar à direita sobe o corte do HPF e desliga o LPF. Kits antigos que tenham ambos os filtros ativos continuam intactos até o primeiro ajuste; a posição visual representa o lado de maior intensidade. O knob **DRIVE** controla a distorção existente do instrumento de 0 a 10, apenas para a peça selecionada. Ajustes da partida são temporários e não sobrescrevem o kit do Criativo.

> **Editar notas desta variação**, disponível no Criativo e na partida, converte quatro compassos do padrão/groove selecionado em notas explícitas (até 128), preservando o texto original para restauração. Trata-se de uma janela finita: variações algorítmicas posteriores à janela não são transcritas. O editor mostra graus da escala, notas, grade e ponteiro. Mouse: arrastar área vazia desenha; arrastar nota move; Alt+arrastar cria uma cópia independente com duração, acento, pan e slide iguais; borda direita altera duração; duplo clique, Delete/Backspace ou **Excluir nota** remove; Escape/pointercancel cancela o gesto. Alt+clique sem deslocamento não cria cópia. Ao soltar, a alteração entra nos próximos ataques disponíveis. Toque mantém scroll e controles; desenho por touch ainda não está habilitado.

> Variações explícitas são a fonte de ritmo daquela variação; o groove salvo continua disponível para as variações de texto e para **Restaurar padrão Strudel**. Automação, fonte, filtros e demais controles continuam aplicados. O código Strudel exibido inclui `timeCat`/notas explícitas. Aplicar o formulário de mini-notação ou uma receita substitui a edição visual e volta à fonte textual; salvar/exportar preserva `pianoRolls`, `selectedVariation` e `rampBars` em campos aditivos do schema 4. Durações de rampas e notas são limitadas e validadas na importação.

> Kits compostos diretamente em notas explícitas usam `pianoOnly`; não exibem um botão de restauração que apagaria a composição em favor de uma nota fictícia. Variações convertidas de mini-notação continuam podendo restaurar seu texto original. Aplicar texto/receita substitui a edição visual e remove essa marca. JSON v4 preserva todos os novos campos aditivos, validados por limites. O código Strudel exportado inclui seções, transposição, pausas, distorção, pitch por nota e pan; é uma fotografia do snapshot e não incorpora o histórico futuro de regras do jogo.
