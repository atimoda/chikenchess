# Pátio: zumbis e hordas

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). Os spawners do Alvo de treino estão em [Combate](combat.md).

- **Zumbis rondando a galinha fora de alcance** (12/11, v2.9.0; `lib/pigchicken/enemies.ts` `stepEnemy` e `ZOMBIE_ROAM`, desenho em `components/pigchicken/draw/creatures.ts`; testes em `tests/pigchicken-zombies.cases.cjs`). Vale no Pátio, no Templo e na Vila, local e no Pátio online (quem simula é o dono do lobby; os outros navegadores recebem posição e estado). Cada zumbi vai atrás da galinha mais próxima e morde quando está a menos de 62 unidades na horizontal e a menos de 120 (`reachY`) acima ou abaixo dela, como antes.
  - *Fora de alcance:* quando a galinha fica 120 ou mais acima ou abaixo do zumbi (em cima de uma plataforma, por exemplo) por pelo menos 0,5 s (`lost`), ele para de mirar o ponto exato embaixo dela e passa a rondar. Um pulo curto não conta: durante esses 0,5 s ele continua andando na direção dela.
  - *Ronda:* cada zumbi escolhe o próprio ponto a 60–260 unidades dela (`near`/`far`), primeiro do lado de onde veio; anda até lá num passo mais lento e próprio (40–75% da velocidade dele, com a animação de andar desacelerada junto), para de 0,35 a 1,8 s olhando para ela com a animação **Idle** (estado `idle`) e escolhe outro ponto, cruzando para o outro lado dela em 65% das vezes (`cross`). O ponto acompanha a galinha: se ela se afasta mais de 420 unidades (`rush`) do ponto, ele volta na velocidade cheia.
  - *Volta ao ataque:* assim que ela fica de novo ao alcance vertical, a ronda acaba e ele volta a perseguir e morder.
  - *Notas e golpes:* um zumbi parado (`idle`) reage como um que anda: nota com atordoamento o deixa em `hurt`, e ele retoma ronda ou perseguição depois.
  - O estado da ronda (ponto, espera, passo) fica só no simulador e não entra nos dados enviados pela rede.
