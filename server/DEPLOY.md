# Publicar o servidor de jogo (para retomar na hora do lançamento)

Decisões tomadas (nov/2026; hospedagem confirmada pelo Titi em 07/11). Nada disso está configurado ainda: o servidor só roda local (`npm start`).

- **Hospedagem: Vultr**, com o Colyseus (gratuito) instalado por nós, não o Colyseus Cloud (~30 a 50% mais caro, só hospeda servidor de jogo).
  Se manter a máquina virar um peso, o mesmo código migra para o Colyseus Cloud.
- **Plano inicial: 1 vCPU / 1 GB, CPU rápida (High Frequency), São Paulo, ~US$ 9/mês** (preço de comparadores; conferir na Vultr).
  Antes de abrir ao público, rodar `npm run loadtest -- 39 30 4` (3 salas cheias) no plano real; se a CPU passar de ~60%, subir para 2 vCPU / 2 GB.
  Medição local (07/11): sala cheia (13 navegadores × 4 galinhas) ≈ 5% de um núcleo, 119 MB, ~21 KB/s por navegador (~0,9 GB por hora de sala cheia).
- **Crédito:** a Vultr dá US$ 250 por ~30 dias em conta nova. Criar a conta só quando o servidor estiver pronto para teste.
- **Regiões:** começar só com São Paulo. Para Europa e América do Norte, subir o mesmo servidor em Frankfurt e Miami/Nova Jersey; cada sala nasce numa região (o Supabase guarda em qual servidor está cada sala).
- **Mesma conta, vários projetos:** a VPS aceita vários jogos e sites (um container Docker cada, com subdomínio e HTTPS).
- **Passos:** criar VPS, Docker + proxy HTTPS (Caddy), subdomínio `game.<domínio>` apontando para a VPS (perguntar o domínio ao Titi), variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `ALLOWED_ORIGINS` (o endereço do site), deploy automático pelo GitHub, medir ping e engasgos com amigos de fora do Brasil.
- Alternativas descartadas: Supabase Realtime (cobra por mensagem, passa do limite grátis), WebRTC P2P (não escala além de ~6), Hathora (encerrou em maio/2026), Alibaba Cloud (instância grátis é "burstable", tráfego cobrado à parte), Hostinger (CPU compartilhada, risco de engasgos).
