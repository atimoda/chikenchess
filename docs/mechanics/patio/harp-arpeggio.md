# Arpejo ao arrastar a mira (Harpa de Lira) — 26/11, v2.19.0

Parte de [Escalas dos instrumentos](instrument-scales.md). Regra pura em `lib/pigchicken/gliss-float.ts`; aplicação em `lib/pigchicken/combat.ts` (ramo `charge` de Atirar, `tones`, `addFloat`/`dropFloats`/`launchFloats`, `stepBullet`); desenho dos degraus em `components/pigchicken/draw/scale-fan.ts` e das bolinhas da mira em `components/pigchicken/draw/note-hud.ts` (estado em `lib/pigchicken/note-hud.ts`). Testes em `tests/pigchicken-gliss-float.cases.cjs`.

## Escopo

- Qualquer instrumento de carga (`fireMode: 'charge'`) com **Arpejo ao arrastar a mira** ligado (`ItemDef.gliss`, Itens → Música; antes “Carga em glissando”). Padrão: só a Harpa de Lira.
- Parquinho, Templo e Vila, local e online, para cada player local e qualquer dispositivo de mira (mouse, analógico, toque, teclas).

## Durante a carga (Atirar segurado)

- **Gatilho:** a nota sob a mira muda enquanto Atirar está segurado. Apertar marca a nota de partida sem tocá-la; segurar parado não toca nada (não há mais glissando automático pelo tempo).
- **Efeito:** cada troca toca a nova nota uma vez (voz do item, até 0,5 s, 55% do volume da nota principal vezes o Volume pela distância) e solta um projétil de nota menor (55% do tamanho do item), que sai da boca do instrumento e flutua até um lugar em volta do ombro dela (raio 170 px × tamanho dela, 85 px no tamanho comum), alternando lados de cima para baixo, balançando e afundando 32 px/s × tamanho até no máximo 140 px × tamanho. Acompanha a galinha enquanto ela anda. Flutuando não acerta nada.
- **Limite:** 7 notas por carga; depois disso as trocas não tocam até soltar.
- **Degraus do leque (Escala primária):** cada folha do leque tem 4 degraus, do ponto a 30% do raio até a borda (dentro de 30%: o primeiro). O degrau k toca a nota da folha subida 2k passos no conjunto de notas do item (na escala: 1ª, 3ª, 5ª e 7ª do grau daquela folha). Arrastar para dentro ou para fora na mesma folha troca a nota sem mudar o ângulo, e conta como troca do arpejo. O leque desenha os degraus como arcos finos nas folhas, e o degrau sob a mira acende na folha mirada. Nas outras escalas (quintas, tensão, espiral, campo harmônico) não há degraus: só as trocas de célula tocam.

## Ao soltar Atirar

- A nota principal é a nota sob a mira (folha e degrau), não mais o topo do glissando.
- **Velocidade da nota principal:** pela distância da mira dentro do leque (`aimReach`, a mesma do Volume pela distância): 30% da velocidade do item com a mira nela até 100% na borda do leque ou além. Teclas (sem distância): 100%. A carga continua definindo dano, precisão e recuo.
- **Volume:** o Volume pela distância do item (na Harpa de Lira, padrão 30% a 100%).
- As notas flutuando partem do lugar onde estão, na direção da nota principal com até 4° de diferença e 84% a 96% da velocidade dela, com a queda do item. Cada uma dá 20% do dano da principal (já com a carga). Não tocam de novo ao sair.

## Cancelamento

- Em qualquer quadro sem carga em andamento (troca de item, golpe no meio da carga, cancelar o tiro, recarga) as notas que flutuavam somem com um pequeno sopro. Um novo aperto também limpa as que tivessem sobrado. Saindo o player, somem com ele.

## Mira (anel da Harpa de Lira e de qualquer item com o arpejo)

- Uma fileira de 7 bolinhas no arco de cima da mira (de −160° a −20°, a 1,3 do raio do anel). Acesas na cor do anel; a próxima a ser gasta fica maior e na cor do grau sob a mira enquanto carrega. Cada nota tocada apaga a sua bolinha da esquerda para a direita (fica o contorno) e solta um ponto que sobe e some. Ao soltar ou cancelar, todas voltam acesas. O ponto que subia pela corda durante a carga foi retirado.

## Online

- As notas flutuando são só locais; ao soltar, cada uma vai aos outros navegadores como um tiro comum (`NetShot` 'b'), junto da principal. Quem assiste vê o arpejo sair, não a fase em que flutua.
