# Servidor de jogo (Pátio online)

Servidor [Colyseus](https://colyseus.io) separado do site (Next.js), com a sala `patio`. Decisões e sequência de PRs: `docs/PATIO_ONLINE_PLAN.md`.

- **Sala = um lobby de um Pátio:** até 13 navegadores, cada um com 1 a 4 galinhas. Cada navegador simula as próprias galinhas e manda o estado (3 + 20 bytes por galinha, até 30 pacotes/s); o servidor mantém dentro do mundo e repassa todas as galinhas a todos, 20 vezes por segundo (~1,1 kB por tick com a sala cheia).
- **Lobby público:** `joinOrCreate('patio', { patioId })` entra na sala pública mais antiga daquele Pátio com vaga, ou abre outra. O lobby automático usa `patioId` ausente (`default`, o Pátio padrão). Sala privada não entra no matchmaking: só por `joinById` (convite). `GET /lobbies` lista as públicas, mais antigas primeiro, com `players`/`max`.
- **Regras** (`src/rules.mjs`): dono = criador do Pátio presente, senão o navegador mais antigo; só o dono remove (nunca a si mesmo, nem criador/padrinho), abre/fecha e marca quem edita; quando o dono muda, a lista de editores zera. Uma cor por navegador (13). Chat até 140 caracteres, sempre da galinha primária.
- **Identidade** (`src/auth.mjs`): com token do Supabase, a assinatura é conferida aqui (chaves públicas JWKS, buscadas uma vez por hora, ou `SUPABASE_JWT_SECRET`), sem chamar o Supabase a cada entrada. Sem token é visitante, só com o nome. Sessão anônima do Supabase conta como visitante.
- **Pátio** (`src/patio-meta.mjs`): ao abrir a sala, lê nome, criador e padrinho por `patio_lobby_meta` (uma linha pequena, uma vez por sala). Estado da sala nunca vai para o banco.
- **Edit mode ao vivo:** o dono e quem ele liberou mandam o layout inteiro (`layout`, até 400 kB; o transporte aceita 512 kB por mensagem); a sala guarda o último para quem entrar depois. O dono avisa a revisão que salvou no banco (`saved`).
- **Mundo compartilhado:** o navegador do dono simula os inimigos e manda `foes` (~10/s), repassado aos outros; `hits` e `spawn` de quem não é o dono vão só para o dono; `shots` de cada um vão para os demais. O servidor não simula nada: confere quem manda, quantidade, tamanho e ritmo, e repassa.
- Pacotes: `src/protocol.mjs`. Mensagens da sala: comentário no topo de `src/patio-room.mjs`.

```
cd server
npm install
npm start                          # porta 2567 (PORT para mudar)
npm test                           # regras, protocolo e sala de ponta a ponta
npm run loadtest -- 13 20 4        # 13 navegadores × 4 galinhas por 20 s: CPU, memória e tráfego
```

Variáveis: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (ler o Pátio), `SUPABASE_JWT_SECRET` (só projetos com segredo compartilhado), `ALLOWED_ORIGINS` (endereços do site que leem `/lobbies`, separados por vírgula; `*` por padrão). Sem `SUPABASE_URL` (desenvolvimento) todos entram como visitantes e a sala confia no criador que o primeiro navegador informar.

Medição local (07/11, MacBook): sala cheia (13 × 4) ≈ 5% de um núcleo, 119 MB, ~21 KB/s por navegador (~0,9 GB por hora de sala cheia); 3 salas cheias ≈ 8%, 126 MB.
