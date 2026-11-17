# Personagens: Pig e Ken

Comportamento atual (17/11, v2.13.0). Vale no globo e em todos os modos do Pátio (local, online, Modo editor), para cada player local.

## O que existe

- **Três protagonistas:** Chi (a galinha, hoje a raça Caipira), **Pig** (porco, o tanque) e **Ken** (raposa, o algoz). Pig e Ken são raças do Vestiário, como as galinhas: escolher a raça troca todas as peças do visual (`lib/chicken/beast-art.ts`, registradas em `LOOK_ART` por `lib/chicken/look-art.ts`).
- **Classe da espécie:** cada raça pertence a uma classe (`variantClass`): galinha, porco ou raposa. O cartão da raça mostra “classe Galinha / Porco / Raposa” (antes mostrava Leve, Média ou Ornamental). A classe define o movimento; a raça, só o visual.
- **Estilos:** Pig em Rosa (o padrão), Hampshire (preto com cinta branca) e Mangalica (lã cacheada, orelhas caídas). Ken em dez espécies de raposa: vermelha (o padrão), prateada, marmorizada, do-ártico, cinzenta, corsac, tibetana, feneco, do-deserto (*Vulpes macrotis*) e orelhas-de-morcego. Cada espécie muda pelagem, tamanho das orelhas, máscara e manchas.
- **Liberados e raridade:** Pig Rosa e Ken vermelho vêm liberados, como a Caipira; os outros estilos são conquista (meio apagados, mas testáveis no Vestiário). Raridades em `BREED_RARITY` (`lib/chicken/rarity.ts`).

## Movimento por classe

- **Um conjunto por classe:** todas as galinhas usam os parâmetros configurados (os da Caipira); os porcos e as raposas usam esses mesmos parâmetros vezes os fatores da classe (`PIG_FACTORS`, `FOX_FACTORS` e os valores fixos de `SET` em `lib/chicken/species.ts`). O motor escolhe a classe pelo corpo do visual (`variantClass(look.torso)`) e recalcula ao trocar de raça; um pintinho (espécie dada) não muda.
- **Pig:** 15% maior; caminhada ×0,78, corrida ×0,75 e arrancada fraca e longa; acelera (×0,36) e freia (×0,56) devagar; pouco controle no ar (×0,45); pulo ×0,65 e super pulo ×0,65; gravidade ×1,35 e queda rápida ×1,5; desliza pouco (atrito ×2,44). Sem pulo no ar, sem planar e sem escalar: não agarra paredes, teto nem a parte de baixo de plataformas.
- **Ken:** 5% maior; caminhada ×0,96 e corrida ×0,875 (mais rápido que Pig, mais lento que a galinha); arrancada forte e curta; acelera ×1,56, freia ×3,33 e controla no ar ×1,64 (o “controle”); pulo ×1,15, super pulo ×1,1, gravidade ×1,15; desliza longe (atrito ×0,62); recua mirando mais rápido (×1,5); salto de parede ×1,15. **Um pulo no ar** (pulo duplo) e **Planagem**: segurar Pulo no ar usa a queda planando da galinha com o divisor dobrado (queda bem lenta), e Cima/Baixo mudam a intensidade com os mesmos ajustes do voo. Ainda escala paredes como a galinha; o rabo girando como hélice e o quique da parede vêm na etapa de habilidades.
- **Pulos no ar:** parâmetro novo `airJumps` (Ajustes → Voo, “Pulos no ar (máximo)”): quantos pulos o boneco dá no ar antes de pousar. A galinha tem 99 (sem limite, como antes); a classe fixa Ken em 1 e Pig em 0.

## Tamanho (escala rebaseada)

- O ajuste **Tamanho da galinha** (`scale`) passa a valer 1 no tamanho normal: o motor desenha o rig a `SCALE_BASE` (0,5) vezes o valor. O padrão do código vai de 0,55 para 1, que é o tamanho que a galinha tinha com 0,5.
- Configurações salvas antes (no servidor, no cache do navegador ou no rascunho do Pátio) não têm `scaleBase` e são lidas com o valor dividido por 0,5: quem usava 0,5 passa a ver 1, sem mudar o tamanho na tela. Ao salvar, o novo formato leva `scaleBase`.
- Faixa do ajuste: 0,5 a 6. Pig e Ken somam o tamanho da classe (×1,15 e ×1,05).

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

Planejado e aprovado na prévia, em etapas: Embalo do Pig, quique e rabo-hélice do Ken, golpes Correntada e Rabada (rápido no Golpe, forte no Atirar), Espreita, Bote, Guarda, Investida, Pisão, vida (Chi 100, Ken 200, Pig 300), filhotes (leitão e raposinha), captura pelo Passaguá e o rabo do Ken em seis ossos.
