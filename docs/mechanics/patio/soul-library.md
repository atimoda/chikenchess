# Pátio: biblioteca de almas

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). A identidade das almas, o cesto, a abdução e o voo das almas soltas ficam em [souls.md](souls.md).

Código: `lib/pigchicken/soul-library.ts` (catálogo, receitas das raras, aparência, fichas editáveis, coleção; puro, mais as cópias deste navegador), fichas publicadas em `data/pigchicken/default-souls.json` (registro no Admin em `lib/admin/catalog.ts`, `validation.ts` e `game-defaults-client.ts`), desenho em `components/pigchicken/draw/soul-art.ts`, painel em `components/pigchicken/soul-library-panel.tsx`, botão no cabeçalho em `components/chicken/chicken-patio.tsx`, aviso de captura em `combat.soulNews` (`lib/pigchicken/combat.ts`), lido por `components/pigchicken/parquinho.tsx`. Testes: `tests/pigchicken-soul-library.cases.cjs` e o último caso de `tests/pigchicken-souls.cases.cjs`.

## Catálogo (10/11, v2.7.0)

O catálogo é fixo, não sorteado: a mesma combinação dá sempre a mesma alma. O catálogo do game (`SOUL_ENTRIES`) é o do código (`CODE_SOUL_ENTRIES`) com as fichas de `data/pigchicken/default-souls.json` por cima; com o arquivo vazio, são as 88 entradas abaixo.

| Grupo | Quantas | Regra |
| --- | --- | --- |
| Vivas | 40 | 8 espécies de alien × 5 famílias de instrumento |
| Mortas | 35 | 7 espécies × 5 famílias (o Dragão não deixa morto-vivo) |
| Pintinho | 1 | A espécie Pintinho |
| Raras | 12 | Receita própria (tabela abaixo) |

- **Qual entrada é uma alma (`entryOf`):** a primeira rara cuja receita ela cumpre, na ordem da lista; senão, a da sua espécie, estado e família. Alma sem família conhecida conta como Sopro. Pintinho é sempre Pintinho.
- **Nome:** o da família mais a espécie. Vivas: Assobio (Sopro), Acorde (Cordas), Tecla (Teclas), Batuque (Percussão), Eco (Rebate). Mortas: Suspiro, Lamento, Réquiem, Chocalho, Assombro. Exemplos: “Assobio de Lanterna”, “Réquiem de Água-viva”, “Eco da Horda”.
- **Raridade da entrada:** a da espécie e do estado, sem contar a nota (`soulRarity`). As raras têm a sua.
- **Tipo de nota e arma da morte não criam entradas:** são marcas (estrelas) dentro de cada entrada. As marcas possíveis de cada uma são calculadas (`entryTraits`) descontando o que as receitas raras levam, então nenhuma estrela é impossível. O Pintinho não tem marcas; só as mortas têm marcas de arma.

Raras (`RARE_SOULS`; eixo que a receita não cita vale qualquer):

| Alma | Raridade | Receita | Voo |
| --- | --- | --- | --- |
| Fênix | Lendária | Dragão, viva, nota Tônica | Patrulheira |
| Dragão Desafinado | Lendária | Dragão, viva, nota Fora da escala | Preguiçosa |
| Vaga-lume | Rara | Lanterna, viva, Sopro, nota Tensão | Sentinela |
| Metrônomo | Rara | Tambor, viva, Percussão, nota Tônica | Ritmada |
| Gêmea Má | Rara | Gêmeos, morta por Impacto, nota Fora da escala ou Sensível | Escolta |
| Alma Blue | Rara | Viva, Cordas, nota Fora da escala | Patrulheira |
| Quase Lá | Rara | Viva, Teclas, nota Sensível | Escolta |
| Bumerangue | Rara | Viva, Rebate, nota Tônica | Preguiçosa |
| Desafinada | Rara | Viva, Sopro, nota Fora da escala | Sentinela |
| Flechada | Rara | Morta por Flecha, nota Tônica | Patrulheira |
| Estilhaço | Lendária | Morta por Explosão, nota Fora da escala | Ritmada |
| Bala Perdida | Rara | Morta por Bala, nota Sensível | Preguiçosa |

## Aparência (10/11, v2.7.0)

- **Forma pela família** (`SOUL_FRAMES`, pixel art de 13 × 8 em duas batidas de asa; tamanho do pixel e batidas por segundo em `SOUL_SHAPES`): Sopro tem rabo comprido e claro (3 px, 12/s); Cordas, topete (4 px, 7/s); Teclas, barriga de teclas de piano (4 px, 8/s); Percussão é gorducha e de bico curto (4 px, 9/s); Rebate é coruja, com dois tufos e dois olhos (5 px, 5/s); o Pintinho tem asas curtas (3 px, 10/s).
- **Cores:** a viva usa a cor da espécie, com asas mais escuras e barriga clara; a morta é cinza com o olho brilhando na cor da espécie; a rara tem cores próprias (algumas com olho brilhante) e pode ter outra forma e tamanho.
- **No mundo** (voando para o contador ou solta): a forma é a da entrada. A viva aparece na cor do alien que ela era; a morta, cinza com o olho na cor da nota que a ressuscitou; a rara, nas cores da entrada. O brilho em volta segue a cor da alma. Antes de capturado, o pássaro continua com o desenho do seu tipo de pássaro. Numa alma da regra, a cor que a ficha pintou por cima da do código vale no lugar da cor do alien ou da nota (`entryLookFor`).

## Voo (10/11, v2.7.0)

A classe de voo da alma solta vem da entrada (`entryFollowParams`): a da família do instrumento, ou a própria da rara (tabela acima). Uma entrada pode ter números próprios por cima dos da classe (`follow`); o editor de fichas grava esses números. As classes estão em [souls.md](souls.md).

## Coleção (10/11, v2.7.0)

- **Gatilho:** o Passaguá captura um pássaro vivo, um pássaro morto-vivo ou um pintinho que estava no mundo. Alma solta recapturada, tomada de outro player ou chamada pelo Callback não conta de novo.
- **Efeito:** a entrada daquela alma soma uma captura; a primeira guarda a data; os tipos de nota e as armas vistos ficam marcados.
- **Aviso:** na primeira captura de uma entrada, o nome dela sobe no ponto da captura, na cor da raridade. Nota ou arma nova numa entrada já conhecida mostra uma ★. Captura repetida não mostra nada.
- **Onde fica:** neste navegador (`localStorage`, chave `pigchicken-souls-v1`), uma coleção só para todos os players locais. Ela só cresce; não há como apagar pelo jogo. Ainda não é salva na conta.
- **Escopo:** Pátio e Templo, todos os players locais. No Pátio online, cada navegador registra só as próprias capturas.

## Painel (10/11, v2.7.0)

- **Gatilho:** o botão do pássaro no cabeçalho do Pátio (“Biblioteca de almas”). Abrir fecha Itens, Catálogo de aliens e Câmera de Mira; Esc ou o X fecha.
- **Lista:** uma seção por espécie, depois Pintinho e Raras, cada uma com quantas já foram encontradas. No cabeçalho, almas encontradas de 88 e estrelas ganhas do total.
- **Nunca capturada:** só a silhueta preta e “???”; não abre. Nas entradas da regra, parar o mouse em cima diz o estado e a família; as raras não dão dica.
- **Capturada:** o desenho com brilho, o nome, a raridade na sua cor e as estrelas (ganhas de possíveis). Só o cartão sob o ponteiro ou em foco bate as asas.
- **Ficha (clique no cartão):** desenho maior, raridade, espécie, estado, instrumento, voo, quantas capturadas, data da primeira captura e as marcas de Notas e Armas: as já vistas com ★ e nome, as que faltam como “?”. Nas raras, o eixo que a receita não fixa aparece como “Qualquer”.
- **Escopo:** todos os Pátios e o Templo. Edição só para admin (abaixo).

## Editor de fichas (admin) (11/11, v2.8.0)

Só para contas admin (`useIsAdmin`); para as outras o painel não muda.

- **Gatilho:** o lápis no cabeçalho do painel liga e desliga a edição. Ligada, todas as almas aparecem desenhadas e abrem, capturadas ou não.
- **Ficha aberta:** o nome vira campo de texto (até 40 letras; vazio, a alma fica com o último nome). Grupos: **Ficha** (raridade e classe de voo), **Aparência** (forma, tamanho do pixel de 2 a 8, cores de corpo, asa, barriga, bico e olho, olho brilhante), **Voo** (lado, o que faz no lugar e os dez números; cada um vale por cima do da classe e pode voltar ao dela) e, só nas raras, **Receita** (espécies, estado, instrumentos, notas e armas; eixo sem nada marcado vale qualquer; marcar uma arma fixa o estado em Morta; receita que nenhuma alma cumpre mostra um aviso).
- **Raras:** “Nova rara”, no cabeçalho da seção, cria uma no começo da lista. “Duplicar como rara” copia a alma aberta; a cópia de uma alma da regra pede a espécie, o estado e a família dela. As setas mudam a ordem (a primeira receita que serve leva a alma) e “Excluir” apaga. Cabem até 40 raras. As 76 almas da regra não se criam nem se apagam, e a espécie, o estado e a família delas não mudam.
- **Padrão:** na ficha, volta aquela alma para a do game; no fim da lista, volta todas.
- **Efeito imediato:** cada mudança vale na hora neste navegador: a biblioteca, qual entrada cada alma é, o desenho das almas no mundo e o voo das que já estão soltas (`setSoulEntries`, `combat.refreshSouls`). Fica como rascunho do navegador (`localStorage`, chave `pigchicken-soul-sheets-v1`); rascunho igual ao catálogo do game é apagado.
- **Salvar no game:** grava `data/pigchicken/default-souls.json` pelo Admin local (`npm run admin:dev`; no Admin, a entrada “Almas (fichas da biblioteca)”). Publicar para todos é commit e deploy. O arquivo guarda só o que difere do código: `sheets` (por alma da regra: nome, raridade, classe, o que mudou na aparência e os números de voo) e `rares` (a lista inteira das raras, quando difere). A validação (`soulsFileProblem`) recusa alma ou campo desconhecido e valor que o jogo mudaria (fora dos limites, cor inválida, id repetido).
- **Coleção dos jogadores:** é guardada pelo id da entrada. Excluir uma rara ou mudar uma receita não apaga o que já foi capturado: a entrada some da biblioteca e volta com as capturas se o id voltar.
- **Escopo:** todos os Pátios e o Templo.

## Ainda não implementado

Coleção salva na conta e som próprio de cada alma.
