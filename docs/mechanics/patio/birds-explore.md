# Pátio: pássaros e almas que exploram, lugares de pouso e cagar (15/11, v2.11.0)

Segunda parte das [Gaiolas](cages.md). As almas soltas deixam de rodear o dono o tempo inteiro: saem para pousar em fios, árvores, plataformas e objetos e voltam. Os pássaros vivos pousam nesses mesmos lugares, e algumas aves ganham o poder de cagar.

`lib/pigchicken/perch-places.ts` (lugares, puro), `lib/pigchicken/old-trees.ts` (forma do Pinheiro e da Ameixeira, pura), `lib/pigchicken/bird-perch.ts` (mundo de pouso), `lib/pigchicken/soul-roam.ts` (exploração, pura), `lib/pigchicken/poop.ts` (cagado, puro); integração em `lib/pigchicken/combat.ts`; desenho em `components/pigchicken/draw/souls.ts` e `draw/creatures.ts`.

## Lugares de pouso

Além dos fios dos postes e torres ([Céu, postes e torres](sky-and-power.md#pássaros-nos-fios-1011-v270)), o layout dá lugares retos, tratados como um fio sem barriga (`perchLines`, refeito quando o layout muda). Cada lugar acompanha a profundidade do elemento, como os fios.

| Lugar | De onde vem |
| --- | --- |
| Árvore | Árvore nova: o topo de cada tufo da copa e a metade de fora de cada galho. Pinheiro e Ameixeira florida: o topo de cada almofada de folhas ou nuvem de flores do desenho. Os mais altos primeiro, até 10 por árvore; árvore com menos de 120 px de altura não conta |
| Plataforma | Os lados que ficam para cima (em qualquer rotação) de Plataforma, Terraço, Pilar e Parede, com 6 px livres em cada ponta; os trechos do telhado das casas com inclinação até 45° |
| Objeto | O topo, centrado, de Poste (50% da largura), Torre (40%), Quadro de lousa (90%), Gongo (60%), Jukebox (70%), Baú (70%) e Alvo de treino (60%) |

- Elemento escondido ou com opacidade abaixo de 0,3 não dá lugar. Lugar com menos de 14 px não cabe pássaro; um lugar curto guarda um só, no meio.
- Topo de plataforma a menos de 24 px do chão é o chão, não um lugar de pouso.
- **Gosto por lugar** (0 a 1 para fios, árvores, plataformas e objetos): 0 nunca pousa ali. O pássaro vivo escolhe entre os lugares livres mais próximos, com a distância dividida pelo gosto; a alma sorteia entre os livres do alcance, com peso do gosto.
- O pássaro espantado pelo Passaguá sem gaiola continua indo só para fios.

## Pássaros vivos

Pousam como antes (chance, tempo pousado, fuga de quem chega perto), agora em qualquer lugar de que gostem. Padrão de `BirdPerchParams`: fios 1, árvores 0,8, plataformas 0,3, objetos 0,3. Pardal gosta mais de plataformas (0,7) e objetos (0,6); Sabiá prefere árvores (1; fios 0,6); Coruja prefere árvores (1; fios 0,4, plataformas e objetos 0,5). Pousados, são desenhados de asas fechadas.

## Almas soltas que exploram

`soulRoamStep`, uma vez por quadro e por alma, antes do bot amigo ([Almas](souls.md#bot-amigo-1011-v270)).

- **Gatilho:** a alma descansa no seu lugar junto do dono por um tempo que encolhe com a vontade de explorar: 20 s com `roam` 0 (na prática nunca sai) até 1 s com `roam` 1, vezes 0,7 a 1,3. A primeira saída depois de solta vem mais cedo (0,3 a 1 desse tempo). O tempo só corre enquanto ela está em descanso, não enquanto segue o dono.
- **Saída:** sorteia um lugar livre a até `roamRange` px da cabeça do dono, voa até lá a 85% da sua velocidade, num arco suave, e pousa (34 px do pássaro vizinho no mesmo lugar). Sem lugar livre, tenta de novo em 4 s.
- **Pousada:** fica parada, de asas fechadas, olhando para o dono, por `perchTime` segundos (vezes 0,7 a 1,3). Depois, com chance `roam`, vai para outro lugar (até 6 por saída); senão volta para o dono.
- **Volta na hora:** quando o dono fica a mais de 1,3 vez o `roamRange` dela, quando o lugar some (layout mudou) ou quando `roam` vira 0.
- **Prioridades:** Callback, captura, portal e dono que saiu do jogo valem como antes e tiram a alma do lugar. Uma ajuda que exige ir a algum ponto (buscar munição, virar degrau) levanta a alma; terminada, ela volta ao lugar onde estava. Ajudas e atrapalhos continuam contando enquanto ela está fora, pelo alcance de cada um.
- **Pintinho:** a alma pintinho não explora (`roam` 0).

Parâmetros (em `SoulFollowParams`, junto dos de voo; editáveis no grupo **Exploração** do editor de fichas, [Biblioteca de almas](soul-library.md)):

| Parâmetro | Faixa | Padrão | O que faz |
| --- | --- | --- | --- |
| `roam` (Explorar) | 0 a 1 | 0,5 | Vontade de sair e chance de emendar outro lugar; 0 fica sempre com o dono |
| `roamRange` (Alcance) | 200 a 3000 px | 900 | Até onde, a partir do dono, ficam os lugares que ela visita |
| `perchTime` (Tempo pousada) | 1 a 60 s | 8 | Quanto descansa em cada lugar |
| `wires`, `trees`, `platforms`, `objects` | 0 a 1 | 1; 1; 0,4; 0,4 | Gosto por fios, árvores, plataformas e objetos |

| Classe | Explorar | Alcance | Tempo pousada | Fios | Árvores | Plataformas | Objetos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sentinela | 0,6 | 900 | 12 s | 1 | 0,6 | 0,2 | 0,2 |
| Patrulheira | 0,7 | 1300 | 5 s | 0,7 | 0,7 | 0,7 | 0,7 |
| Escolta | 0,15 | 450 | 4 s | 1 | 1 | 0,4 | 0,4 |
| Ritmada | 0,5 | 900 | 6 s | 0,5 | 0,5 | 1 | 1 |
| Preguiçosa | 0,85 | 900 | 25 s | 0,5 | 1 | 0,2 | 0,2 |
| Pintinho | 0 | | | | | | |

## Cagar

Poder de algumas aves. O pássaro só solta quando há um boneco embaixo: na coluna dele (26 px para cada lado do boneco), de 50 a 900 px abaixo, sem piso sólido no meio. Pronto e sem ninguém embaixo, olha de novo a cada 0,15 s.

- **Quem tem:** almas das espécies mini (a cada 8 s, dano 1), gêmeos (10 s, dano 2) e tambor (14 s, dano 4); pássaros vivos Pardal (10 s, dano 1) e Bem-te-vi (12 s, dano 2), e os mortos-vivos desses tipos. O intervalo varia de 0,7 a 1,3 vez; o primeiro vem mais cedo.
- **Queda:** cai com gravidade (1500 px/s², até 1000 px/s), levando 30% da velocidade lateral do pássaro. Some em 6 s.
- **Em inimigo ou Alvo de treino:** tira o `dano` em vida (alien, zumbi, morto-vivo que não é pássaro, alvo). No Pátio online o golpe segue o caminho dos outros golpes.
- **Em galinha:** as galinhas não têm vida no Pátio, então o cagado dá um tranco pequeno (30 + 14 × dano px/s para o lado, metade disso para cima) e deixa uma mancha nas costas por 4 s, desenhada por cima dela. Os pintinhos nunca são atingidos.
- **No chão ou numa plataforma:** deixa uma marca por 3 s.
- **Poupar o dono** (`poopSpare`, na ficha): ligado, o cagado da alma nunca conta o dono (atravessa); desligado, o dono é um boneco como os outros. Almas vivas poupam por padrão; almas mortas não. Os outros players locais sempre contam.
- **Pássaros vivos:** acertam galinhas, inimigos e alvos. **Pássaros mortos-vivos:** só galinhas.
- **Parâmetros da alma** (em `SoulActParams`, grupo **Ações** do editor de fichas): `poopEvery` (Cagar a cada, 0 a 60 s; 0 não tem o poder), `poopDamage` (Dano do cagado, 0 a 20, passo 0,5; padrão 2) e `poopSpare`. Os dos pássaros ficam em `BirdType.poop`, no código.
- **Som:** `splat`.

## No Pátio online

Cada navegador decide sozinho onde as suas almas pousam e quando cagam; os outros veem as almas pela posição enviada, sem as asas fechadas. Cagados, manchas e marcas aparecem só no navegador que os gerou. O dano em inimigos compartilhados vai pelo aviso de golpe de sempre.

## Escopo

Pátio e Templo, todos os players locais e o Pátio online (com os limites acima).

## Ainda não implementado

Fuga das almas soltas de outros players, e cagado visível para os outros navegadores.
