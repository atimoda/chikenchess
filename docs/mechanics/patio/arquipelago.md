# Pátio: Arquipélago das Almas (Pátio de exemplo)

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). Os Pátios de exemplo em geral ficam em [lobbies.md](lobbies.md); os Baús e a Chave em [chests.md](chests.md); as fases de notas e o Prêmio ao vencer em [note-stages.md](note-stages.md).

Código: `lib/pigchicken/example-deadlock.ts` (`deadlockLayout`), entrada em `lib/pigchicken/example-seed.ts` (id `5e7a0c11-0008-4e5a-9c0d-ec5a3b1e0008`), migração gerada por `scripts/example-patios-migration.cjs` (a Mesa de chickenchess entrou no layout do banco pela `202611260001_arquipelago_chess_table.sql`). Teste: `tests/pigchicken-chests.cases.cjs`.

## O que é (23/11)

Um Pátio grande inspirado nos jogos de faixas (Deadlock), feito só com o que o Modo editor oferece, para até 13 players (o limite da sala online). Como os outros exemplos, é um Pátio da conta admin, em Destaque, e o admin o edita no Modo editor.

- **Tamanho:** largura máxima (8 cenas mais as duas finais: 19 200 de largura), teto a 4130 acima do chão, sem Templo. Céu de fim de tarde (19h06) com aurora, nuvens e quatro cordilheiras.
- **Espelhado:** a metade leste repete as posições da oeste em espelho, com outros biomas e itens.
- **Bases:** o Galinheiro (oeste) e o Chiqueiro (leste). Cada uma tem três lugares de nascer (o chão, a ilha do meio e a ilha alta, a Torre), um par de portais do chão para a Torre, escadas de plataformas do chão à ilha do meio e dela à Torre, os suportes das Gaiolas e do Passaguá, armas básicas, um boneco de treino e a **loja**: três Baús de Merecimento que fecham de novo depois de 60 s (3 almas: uma habilidade especial e 25% de chave; 10 almas: uma arma e 50% de instrumento; 25 almas, lendário: um item de magia e uma Chave).
- **Portais de nascimento:** o portal de entrada (chão do Galinheiro) e cinco Portais de nascimento (chão do Chiqueiro, as duas ilhas do meio e as duas Torres), cada um com 16 ou 17%.
- **Faixa de baixo:** o chão de base a base, com uma linha de postes (Concreto de rua e Madeira com duas cruzetas) cujos fios correm por cima dela e atravessam a arena do centro. Deserto dos Bandidos a oeste (pistola, rifle, metralhadora, guitarra, pandeiro) e Vulcão da Forja a leste (lança-foguetes, granada, escopeta, teclado, pandeiro). Morros e casas servem de cobertura; degraus sob os fios; botões de Zumbis.
- **Faixa do meio:** três ilhas de cada lado, ligadas pelos fios de torres Treliça da ilha do meio da base até o Coração. Floresta das Araucárias a oeste (arco, violino, bumerangue, gancho) e Montanha Nevada a leste (sniper, hang drum, arco, gancho).
- **Faixa de cima:** três ilhas de cada lado, ligadas por torres Cabeça de gato da Torre até o Santuário. Jardins Suspensos a oeste (harpa, flauta, sax) e Feira no Céu a leste (trompete, guitarra, sax), com Cok e Maryjane e botões de Aliens.
- **Entre as faixas:** ilhotas com trampolins para subir de uma faixa à outra. Entre o chão e o meio, duas de cada lado com um suporte e um Baú livre que fecha de novo depois de 90 s (qualquer item e 35% de chave). Entre o meio e o alto, quatro de cada lado: Gaiolas, Passaguá, Baús livres (qualquer item e 40% de chave, fecham de novo em 120 s) e uma Vitrola com prêmio (Chave e um item qualquer).
- **Centro**, de baixo para cima, cada lugar na sua Zona sonora:
  - *Arena das Almas* (chão): no meio, a Mesa de chickenchess (26/11, v2.19.0; quem vence a partida ganha uma Chave de ouro, em [chess-table.md](chess-table.md)); à esquerda a Jukebox (precisão mínima 40%, 4 corações; prêmio: Chave), à direita o Gongo e um Baú simples de chave (uma arma e uma habilidade), e os dois baralhos nas pontas. A oeste da arena, no chão da faixa de baixo, um Ativador de grid trancado (26/11, v2.19.0): só a Chave de ouro da mesa o abre e liga a grade do Campo minado em todo o Arquipélago, com blocos de 448, vão 32 e cantos 30% ([mine-activator.md](mine-activator.md)). A mesma migração o acrescenta ao layout salvo, uma vez.
  - *Coração do Arquipélago* (ilha do meio): Vitrola (60%, 3 corações; prêmio: Chave e 50% de magia), Gongo e dois Baús lendários de chave.
  - *Santuário* (ilha alta): Jukebox (70%, 3 corações; prêmio: Chave e uma arma) e um Baú lendário de chave só com magia.
  - *Altar da Lua* (no topo, com a gravidade da Lua): Vitrola (80%, 2 corações; prêmio: Chave, magia e instrumento) e dois Baús lendários de chave (Mjölnir ou cajado de Odin; duas armas).
  - Escadas de plataformas ligam a arena ao Coração, o Coração ao Santuário e o Santuário ao Altar.
- **Fios:** todos os postes e torres têm ligações guardadas. Os fios das faixas são pisos (andar por cima, pendurar por baixo); em cada ilha os fios a cruzam de uma torre à outra, com um degrau embaixo para alcançá-los.
- **Música:** uma Zona sonora por região (as duas bases, as três faixas de cada lado e os quatro lugares do centro), então até seis fases de notas tocam ao mesmo tempo, uma em cada lugar com Jukebox ou Vitrola.
- **Escopo:** é um layout como qualquer outro: vale nos modos local e online. Times, vida dos players, ondas de inimigos pelas faixas e objetivos a destruir ainda não existem no jogo.
