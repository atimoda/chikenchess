# Servidor de jogo (multiplayer da galinha)

Servidor [Colyseus](https://colyseus.io) separado do site (Next.js). Hoje tem a sala `patio`: até 100 galinhas num mundo largo.
Cada navegador simula a própria galinha e manda o estado (20 bytes, até 20x/s); o servidor confere se é plausível
(dentro do mundo, sem teletransporte), e manda a cada jogador as galinhas mais próximas a 20 Hz e as distantes a 5 Hz.

- Formato dos pacotes: `src/protocol.mjs`.
- Sala: `src/patio-room.mjs`. Identidade: `src/auth.mjs` (valida o token do Supabase se `SUPABASE_URL` e `SUPABASE_ANON_KEY` existirem; sem eles, aceita qualquer nome, só para desenvolvimento).

```
cd server
npm install
npm start                      # porta 2567 (PORT para mudar)
npm run loadtest -- 100 20     # 100 bots por 20 s: CPU, memória e tráfego
```
