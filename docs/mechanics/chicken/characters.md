# Personagens: Pig e Ken

Comportamento atual (17/11, v2.13.0). Vale no globo e em todos os modos do Pátio (local, online, Modo editor), para cada player local.

## O que existe

- **Três protagonistas:** Chi (a galinha, hoje a raça Caipira), **Pig** (porco, o tanque) e **Ken** (raposa, o algoz). Pig e Ken são raças do Vestiário, como as galinhas: escolher a raça troca todas as peças do visual (`lib/chicken/beast-art.ts`, registradas em `LOOK_ART` por `lib/chicken/look-art.ts`).
- **Classe da espécie:** cada raça pertence a uma classe (`variantClass`): galinha, porco ou raposa. O cartão da raça mostra “classe Galinha / Porco / Raposa” (antes mostrava Leve, Média ou Ornamental). Por enquanto a classe só agrupa o visual; o movimento por classe vem na etapa 2.
- **Estilos:** Pig em Rosa (o padrão), Hampshire (preto com cinta branca) e Mangalica (lã cacheada, orelhas caídas). Ken em dez espécies de raposa: vermelha (o padrão), prateada, marmorizada, do-ártico, cinzenta, corsac, tibetana, feneco, do-deserto (*Vulpes macrotis*) e orelhas-de-morcego. Cada espécie muda pelagem, tamanho das orelhas, máscara e manchas.
- **Liberados e raridade:** Pig Rosa e Ken vermelho vêm liberados, como a Caipira; os outros estilos são conquista (meio apagados, mas testáveis no Vestiário). Raridades em `BREED_RARITY` (`lib/chicken/rarity.ts`).

## Vestiário

- Aba **Raças**: seções Galinhas, Galos, Porcos e Raposas.
- Abas de peças (Cabeça, Penas, Corpo, Pernas): só aparecem as peças da mesma classe do visual atual. Com um porco ou raposa, as seções com uma peça só (crista, barbela, bico, pescoço) somem; dá para combinar cabeça, corpo, braço, rabo e pernas entre estilos da mesma classe.

## Desenho no esqueleto da galinha

- Os dois usam o mesmo esqueleto e as mesmas animações da galinha (`lib/chicken/engine.ts`): o corpo, a cabeça, o braço da frente no lugar da asa (segura os itens), o braço de trás no lugar da asa de trás, o rabo e as duas pernas com joelho.
- **Arte:** decalcada da versão “Game / Flat” de referência, sem contorno, virada para a direita. Cada desenho é feito nos pixels da referência e levado às unidades do rig por uma transformação por espécie (Pig: escala 0,287; Ken: 0,27), com o ombro do braço da frente no ombro do rig.
- **Mão por personagem:** `wing.hand` diz onde fica a ponta do braço em repouso (o casco do Pig, o punho do Ken). O motor usa essa ponta para segurar itens, girar e esticar o braço, golpear e arremessar, no lugar da ponta da asa da galinha.
- **Olhos próprios:** `face.ownEyes` esconde o olho, a pupila e a pálpebra da galinha; os olhos fazem parte da cabeça desenhada (ainda sem piscar nem seguir a mira).
- **Pernas próprias:** `legs.shape` engrossa a coxa, a canela e o pé, troca os dedos por um casco (Pig) ou pata (Ken) e desloca cada perna ao longo do corpo. As articulações e a animação são as da galinha.
- **Pig:** colete vermelho, algemas nos dois pulsos; a do braço da frente tem um pedaço de corrente partida pendurado (parado, ainda sem física). Rabinho enrolado.
- **Ken:** máscara creme, botas e luvas escuras, rabo grande com a ponta creme em zigue-zague (parado, balançando só como a cauda da galinha).

## Ainda não implementado

Planejado e aprovado na prévia, em etapas: movimento por classe (escala rebaseada, pulo duplo e Planagem do Ken, Embalo do Pig), golpes Correntada e Rabada (rápido no Golpe, forte no Atirar), Espreita, Bote, Guarda, Investida, Pisão, vida (Chi 100, Ken 200, Pig 300), filhotes (leitão e raposinha), captura pelo Passaguá e o rabo do Ken em seis ossos.
