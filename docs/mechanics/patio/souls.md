# Pátio: almas capturadas

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). O Passaguá como item fica em [items.md](items.md); as mortes dos aliens e os pássaros em [temple.md](temple.md); os pintinhos em [../chicken/chicks.md](../chicken/chicks.md); o pouso e a fuga dos pássaros nos fios em [sky-and-power.md](sky-and-power.md).

Código: `lib/pigchicken/souls.ts` (identidade, raridade, abdução; puro), ganchos em `lib/pigchicken/combat.ts` (`markSoul`, `convert`, `spawnUndead`, `strike`, cesto por player), contador em `drawSoulCounter`/`soulCounterBox` (`components/pigchicken/draw/hud.ts`), voo até o contador em `components/pigchicken/draw/souls.ts`. Testes: `tests/pigchicken-souls.cases.cjs`.

## Identidade da alma (10/11, v2.7.0)

Todo pássaro capturado pelo Passaguá vira uma alma (`Soul`) que guarda de onde veio. Nada disso muda o comportamento ainda: é o que as próximas etapas (soltar, bot amigo, biblioteca) vão ler.

| Eixo | Valores | De onde sai |
| --- | --- | --- |
| Espécie | Horda (alien das fileiras), Água-viva, Lanterna, Casco, Gêmeos, Mini, Tambor, Dragão (a cabeça conta como Dragão), Pintinho | Dados do alien (`soulSpecies`); o pintinho vem da captura do bando |
| Estado | Viva: a harmonia encheu (morte musical). Morta: morte física, depois ressuscitada por notas | `convert` (viva) e o pássaro morto-vivo (morta) |
| Classe do projétil | Sopro (Flauta, Sax, Trompete), Cordas (Violão, Violino, Harpa), Teclas (Teclado), Percussão (Pandeiro), Rebate (nota de alien rebatida por um golpe) | O instrumento da última nota que entrou na barra antes de ela encher (`shotClass`); sem o item (golpe vindo de outro navegador), vale a voz da nota |
| Tipo de nota | Tônica; Consonante (terça maior ou menor, quinta); Tensão (as outras notas da escala); Sensível (sétima, maior ou menor); Fora da escala (nota que a escala não tem, ou desviada mais de 0,2 semitom) | A mesma última nota, medida no tom e na escala da zona naquele instante (`noteClass`) |
| Arma da morte (só Morta) | Explosão (qualquer explosão), Bala (Pistola, SMG, Rifle, Escopeta, Sniper), Flecha (Arco), Impacto (Taco, golpe de qualquer item, Asa, Bicada, item arremessado) | O golpe que zerou a vida do alien (`weaponClass`); desconhecida conta como Impacto |

- **Sem origem conhecida:** pintinhos não têm classe de projétil nem tipo de nota. Um pássaro que nasceu sem esses dados (por exemplo vindo de outro navegador) fica com eles vazios e a espécie Horda.
- **Raridade** (`soulRarity`): cada eixo soma pontos (Dragão 3, Lanterna 1, Gêmeos 1; Tensão 1, Sensível 2, Fora da escala 3; Morta 1). 0 comum, 1 incomum, 2 a 4 rara, 5 ou mais lendária. Os pesos ficam em `RARITY_POINTS`/`RARITY_AT`.
- **Cor e desenho:** a alma viva guarda a cor do alien; a morta, a cor da nota que a ressuscitou (a dos olhos); o pintinho, amarelo. Ela guarda também o tipo de pássaro em que voava.

## Cesto e contador (10/11, v2.7.0)

- **Cesto:** cada player local tem o seu, uma pilha: a última alma capturada fica no topo (`combat.basket`). Vale só durante a sessão; não é salvo nem enviado no Pátio online.
- **Contador:** o círculo à esquerda do avatar mostra quantas almas há no cesto. O arco de dentro toma a cor da alma do topo (cinza claro com o cesto vazio). Ainda não é clicável.

## Abdução (10/11, v2.7.0)

- **Gatilho:** o Passaguá acerta um pássaro vivo, um pássaro morto-vivo ou um pintinho (as mesmas regras de alcance de antes).
- **Efeito:** o pássaro some do mundo numa nuvem e a alma voa em curva até o contador de quem capturou: sobe primeiro, acelera e encolhe, com brilho e rastro na cor dela, em 0,55 s (`ABDUCT_TIME`). Várias capturadas no mesmo golpe saem uma atrás da outra, a cada 0,08 s (`ABDUCT_GAP`). O texto “+N almas” não aparece mais.
- **Contagem:** a alma entra no cesto, e o número sobe, só quando chega ao contador; o círculo cresce e volta em 0,3 s (`SOUL_PULSE`).
- **Câmera:** o ponto de partida é do mundo e o de chegada é da tela, então o voo acompanha a câmera e o zoom enquanto dura.
- **Cancelamento:** não há. Se o player que capturou sair do lobby antes de a alma chegar, ela se perde.
- **Escopo:** Pátio e Templo, todos os players locais (cada um com o seu contador). No Pátio online cada navegador vê só as próprias capturas.

## Ainda não implementado

Soltar almas pelo contador, o bot amigo, o Callback, a captura por outro player, a biblioteca de almas e o efeito de cada eixo no comportamento. O plano está fora do código, no documento “Almas capturadas: plano”.
