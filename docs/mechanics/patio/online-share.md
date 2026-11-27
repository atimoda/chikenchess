# Pátio online: itens no chão e bonecos de treino compartilhados

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). Vale desde 27/11 (v2.20.0) em todo modo do Pátio online (Parquinho, Templo, Vila, Campo minado, cômodos das casas) e para cada player local. Fora do online, ou com um servidor que não diz `share` em `hello.caps`, tudo continua local como antes.

Código: pacotes e cópias em `lib/pigchicken/net-items.ts` (itens) e `lib/pigchicken/net-share.ts` (mensagem e bonecos); ganchos em `lib/pigchicken/combat.ts` (`setShareRole`, `dropItem`, `askItem`, `importNetItems`, `takeNetItem`, `giveNetItem`, `addNetDrops`, `exportDummies`, `importNetDummies`, `addNetDummyDeltas`); envio e leitura em `lib/pigchicken/net-world-sync.ts`; `sendNetShare` em `lib/chicken/online-room.ts`; repasse em `server/src/patio-room.mjs` (`onShare`). Testes em `tests/pigchicken-net-share.cases.cjs` e `server/test/room.test.mjs` (“share”).

## Mensagem `share`

- **Servidor:** só repassa, conferindo quem manda. A do dono do lobby vai para todos os outros, ou só para o navegador que ela nomeia (`to`, a resposta de um pedido); a de qualquer outro vai só para o dono, com o `pid` de quem mandou. Até 60 000 caracteres por mensagem e 30 por segundo por navegador (rajada de 60). O navegador confere o que chega (ids, posições até 1 000 000, item conhecido, números na faixa).
- **Papéis:** o navegador do dono guarda os itens e a vida dos bonecos para todos; os outros mostram os dele. Os papéis seguem o dono do lobby: quando ele sai, o próximo dono assume as cópias como itens dele (cada suporte volta a segurar o item dele que está no seu lugar) e continua de onde estavam.

## Itens no chão

- **O que vale:** todo item no chão: os do layout (Item solto), os dos suportes, o que sai de um Baú e do prêmio de uma música, o que um player larga, troca, arremessa ou deixa cair (a Gaiola trocada, o inventário de quem vira Filhote, o bastão ou gancho que volta sem mão para pegar, as Gaiolas de um player local que sai).
- **No dono:** os itens são dele, com a física dele. Ele manda a lista inteira (até 200 itens: id, item, munição, desgaste, tamanho, a Gaiola com o limite e as almas, posição, se está parado, o tempo em que ninguém pega e a velocidade de queda) quando ela muda, no máximo 10 vezes por segundo, a cada 2 s e quando alguém entra.
- **Nos outros:** os itens próprios e os do layout saem do chão; ficam as cópias do dono, que seguem a lista (o mesmo item continua o mesmo objeto, então o item oferecido continua oferecido) e caem com a velocidade dita entre uma lista e outra. Os suportes não repõem nada (os do dono repõem para todos). As almas soltas não buscam as cópias.
- **Pegar:** Pegar, Correr, Golpe, Bicada e Pegar segurado andando sobre uma cópia fazem o mesmo pedido: a cópia some desta tela e o dono é chamado (até 16 pedidos a cada 50 ms). O dono dá o item a quem pediu primeiro, se ainda está lá e já pode ser pego; quem pediu recebe como o aperto teria feito (equipar, guardar sem trocar o da asa, trocar com o da asa quando não há lugar, a Gaiola na frente ou atrás das outras). Para quem pediu depois, o dono diz que o item já foi e ele não volta. Sem resposta em 1,5 s, a cópia volta a aparecer se o dono ainda a tem; uma resposta que chega depois de 10 s cai de novo no chão, junto de quem pediu.
- **Largar:** o que cai num navegador que não é o dono vai para o dono (até 32 itens a cada 50 ms, com posição, velocidade e o tempo em que ninguém pega) e aparece no chão de todos pela lista dele. Sobra de um monte que não coube na asa volta ao chão do mesmo jeito.

## Bonecos de treino

- **Quem é quem:** cada boneco do layout é reconhecido em todos os navegadores pelo id do elemento.
- **Acertos:** o dano e o conserto com notas valem na hora em quem acertou (número, lascas, som). Um navegador que não é o dono manda ao dono quanto de vida tirou ou deu de cada boneco desde o último lote (a cada 50 ms); o dono aplica como se fosse dele.
- **Vida para todos:** o dono manda a vida de cada boneco quando muda (no máximo 10 vezes por segundo), a cada 2 s e quando alguém entra. Os outros quebram ou consertam o boneco até ela, com os mesmos estágios, lascas, sons e “novinho!”. Por 0,6 s depois de um acerto próprio, um boneco não segue a vida do dono (o acerto ainda está a caminho), para não piscar.
