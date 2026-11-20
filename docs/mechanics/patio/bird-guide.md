# Pátio: Guia de pássaros

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). As almas e as fichas delas ficam em [souls.md](souls.md) e [soul-library.md](soul-library.md).

Código: `lib/pigchicken/bird-guide.ts` (puro: as aves, as gravações e a ave que inspira cada alma), `lib/pigchicken/bird-song.ts` (quem toca as gravações), `components/pigchicken/bird-guide-panel.tsx` (painel), `data/pigchicken/bird-songs.json` (gravações e créditos), `public/samples/birds-v1/` (os áudios), `scripts/prepare-bird-songs.py` (gera os dois últimos).

## Duas camadas (17/11, v2.13.0)

- **Aves reais:** o guia tem 30 aves do Brasil (`GUIDE_BIRDS`). Cada uma guarda o id (o nome científico em minúsculas com hífen), nome científico, nome popular, o nome que usa no jogo (inspirado nos dois, por exemplo “Sabiá Rufiventre”), família, tamanho em cm, onde vive, uma curiosidade, o desenho (uma das formas das almas, o tamanho do pixel pelo tamanho da ave e quatro cores) e a voz do sintetizador das almas que ela inspira (`bird`, `flute` ou `hum`).
- **Almas:** continuam sendo as do jogo. Cada ficha da biblioteca tem uma ave que a inspira (`SoulEntry.bird`); uma ave pode inspirar várias almas.
- **Regra do código (`inspirationOf`):** alma viva, pela espécie do alien e pela família do instrumento (tabela `DAY`, 8 por 5); alma morta, uma ave noturna ou de carniça pela família, duas por família, alternando pela espécie (tabela `NIGHT`: urutau, bacurau, suindara, gavião-carijó, coruja-buraqueira, anu-preto, carcará, urubu); pintinho, *Gallus gallus*; cada rara do jogo tem a sua (tabela `RARE`); uma rara criada pelo admin segue a regra do estado e da família dela. Toda ave do guia inspira ao menos uma alma.
- **Ficha:** o admin troca a ave no campo Inspiration do editor ([soul-library.md](soul-library.md)); a ficha publicada guarda `bird` só quando difere da regra.
- **O que a ave muda hoje na alma:** a voz das notas que a alma solta toca (cantar nas harmonias, avisos, degrau, desafinar) e o canto real abaixo. Padrão de voo, silhueta própria e habilidades por ave ainda não existem.

## Cantos reais (17/11, v2.13.0)

- **Origem:** gravações do acervo público xeno-canto.org, para uso não comercial. O script `scripts/prepare-bird-songs.py` lê a página de resultados de cada ave (qualidade A, depois B, de 4 a 60 s), descarta licenças “sem derivados” (o clipe é um corte) e gravações com outra espécie ao fundo, escolhe até 3 cantos e 1 chamado de gravadores diferentes, corta o trecho mais forte (até 7 s o canto, 4 s o chamado), filtra abaixo de 500 Hz, nivela o volume e grava em mono, Opus (`.ogg`) e AAC (`.m4a`).
- **Manifesto:** `data/pigchicken/bird-songs.json` lista cada clipe com tipo (`song` ou `call`), duração, número no xeno-canto (`xc`), quem gravou, país, licença e link. Hoje são 119 clipes das 30 aves, quase todos CC BY-NC-SA 4.0. Uma versão comercial teria de tirar os de licença NC.
- **Rodar de novo:** `python3 scripts/prepare-bird-songs.py [--only id,id] [--cache PASTA]` (precisa de ffmpeg e numpy). Sem `--only`, mantém as aves que já têm clipes no manifesto.
- **Tocar:** o clipe é baixado e decodificado na primeira vez e fica guardado (`lib/pigchicken/bird-song.ts`). Toca no contexto de áudio do Pátio, no volume “Efeitos do cenário” do mixer (mudo com o mixer mudo).

## Painel (17/11, v2.13.0)

- **Abrir:** botão da pena no cabeçalho do Pátio (fecha os outros painéis do cabeçalho), ou a linha Inspiration da ficha de uma alma, que abre o guia já naquela ave e fecha a Biblioteca.
- **Lista:** um cartão por ave, com o desenho, o nome do jogo e o nome popular. Todas as aves aparecem desde o início; não há ave escondida.
- **Clique numa ave:** abre a ficha e toca a primeira gravação dela. Cada clique no desenho da ave aberta toca a gravação seguinte, em roda. Uma gravação nova corta a anterior.
- **Ficha:** nome popular, nome científico, família, tamanho, onde vive, a curiosidade, “Cantos reais” e “Almas inspiradas”.
- **Cantos reais:** um botão por gravação (Canto 1, 2, 3, Chamado); o que está tocando fica destacado e um clique nele para. Ao lado, quem gravou e o número XC, com link para a gravação no xeno-canto (a licença e o país aparecem ao passar o mouse).
- **Almas inspiradas:** miniaturas das almas cuja ficha aponta para a ave. A que ainda não foi capturada é só o contorno, com “???”, e não responde ao clique; clicar numa capturada fecha o guia e abre a Biblioteca de almas nela.
- **Fechar ou voltar:** para a gravação que estava tocando.
- **Escopo:** Pátio e Templo, local e online; é só deste navegador.

## Canto real das almas soltas (17/11, v2.13.0)

- **Gatilho:** a cada volta do relógio de ações da alma solta (“A cada”, [souls.md](souls.md)), ela sorteia “Canto real” (`song` de `SoulActParams`, 15% por padrão). A mesma alma não canta de novo antes de 12 s (`SOUL_ACT.song.gap`).
- **Efeito:** toca uma gravação da ave da ficha, sorteada (3 em 4 vezes um canto, quando a ave tem canto e chamado), e aparece uma nota ♪ sobre a alma. Não muda o que a alma faz naquela volta: ela ainda pode atrapalhar ou ficar pronta para ajudar.
- **Volume:** cheio no meio da tela, caindo até zero a 1600 px dele (`songVolume`). No máximo três cantos de almas ao mesmo tempo; os demais são descartados.
- **Parâmetro:** “Canto real” na aba Ações do editor de fichas, de 0 a 100%; 0 desliga.
- **Escopo:** Pátio e Templo, todos os players locais. No online, cada navegador ouve só o canto das almas que ele mesmo simula (as dos seus players).

## Créditos (17/11, v2.13.0)

- A aba Credits do About (`components/about-release-dialog.tsx`) lista as pessoas do ChickenChess (ideia original: Thiago Atimoda e Rodrigo Zecchinelli; desenvolvimento: Thiago Atimoda; nomes com link para o Instagram), as pessoas do Pigchicken (gameplay, lore e história originais: Lila Zara e Uirá Fedatto Horta; arte visual inspirada nos desenhos da filha de Thiago), o Strudel, cada gravação (nome científico, quem gravou, número XC com link, licença com link), o simulador de voz de galinha (Chimera, MIT), as IAs usadas para programar (Claude, ChatGPT, Gemini, DeepSeek) e as texturas do globo. A lista sai do manifesto (`birdCredits`), então uma gravação nova já entra nos créditos.

## Ainda não implementado

- Padrão de voo por ave, silhueta própria de cada ave, habilidades e patrulha ligadas a traços da ave real.
- Editor de aves para admin e lotes maiores de aves.
- Canto real das almas dos outros navegadores no online.
