# Pátio online — decisões e sequência de PRs

Plano combinado com o Titi em 07/11/2026. Comportamento implementado continua descrito em `docs/mechanics/patio/` (online: `patio/players-and-online.md`); este arquivo guarda as decisões e o que falta.

## Decisões

- **Transporte:** um servidor de jogo próprio (Colyseus, pasta `server/`, base do PR #126) leva movimento, chat e estado da sala. O Supabase Realtime não é usado no Pátio: 13 navegadores com até 4 galinhas a 20 Hz passariam da cota grátis de mensagens em minutos.
- **Hospedagem:** VPS Vultr São Paulo (~US$ 6–9/mês). A conta é criada pelo Titi na hora do deploy.
- **Vagas:** 13 navegadores por lobby, até 4 galinhas por navegador (também no modo Local: 4 players locais no mesmo computador).
- **Cor:** no modo online, uma cor por navegador; as galinhas do mesmo navegador a compartilham, com um número de 1 a 4.
- **Lobby público automático:** ligar "online" coloca o navegador no lobby público aberto mais antigo com vaga; com todos cheios, o servidor abre um novo. O lobby automático usa o Pátio padrão universal. Um Pátio salvo vira lobby quando o dono o abre online (público aparece para todos; privado só por link).
- **Dono:** o criador do Pátio, se presente; senão, o navegador que está há mais tempo no lobby (hora marcada pelo servidor). Bots nunca são donos. Só o dono abre/fecha o lobby, remove navegadores (nunca o criador nem o padrinho) e marca quem edita; quando o dono muda, só o novo dono edita.
- **Visitantes:** jogam online só com um nome, sem criar usuário anônimo no Supabase. Salvar, favoritar e apadrinhar pedem conta.
- **Chat:** como hoje (Enter abre o campo; a última mensagem fica sobre a cabeça de quem enviou; com várias galinhas no navegador, sai da galinha do player primário), mais uma telinha de histórico: fundo semitransparente, mensagens em sequência com o nick na frente, rolável.
- **Banco:** estado da sala (quem está, posições, chat, dono) nunca vai para o Supabase. Só o navegador do dono grava o layout (autosave de 1 min com mudanças).

## Sequência de PRs

Etapa 1 — Pátio online

1. **Supabase: economia** (feito: `202611070002_patio_lean_reads.sql`). Limpeza de não salvos no máximo 1x/dia; leitura de Pátio sem a lista de pessoas quando ela não mudou. Este plano.
2. **Servidor de jogo** (feito: `server/`, migração `202611070003_patio_lobby_meta.sql`; nomes repetidos ganham número). Sala = Pátio, 13 conexões com 1–4 galinhas por pacote binário, estados atuais da galinha; entrada com conta (token conferido localmente, sem chamar o Supabase) ou visitante; matchmaking público e lista de lobbies com n/13; dono, remover, público/privado, Edit mode e repasse do chat; teste de carga 13×4. Fecha o #126.
3. **Cliente no Pátio** (feito: `lib/chicken/online-room.ts`, `components/chicken/online-chickens.tsx`). Conexão e galinhas dos outros (interpolação, visual, cor, item na mão); painel Players online (n/13, limite de 4 locais, cor por navegador); switch online no portal, passador de lobby, link de convite; chat com histórico; contagem ao vivo nas listas Abrir.
4. **Edit mode ao vivo** (feito: mensagens `layout`/`saved` no servidor, `applyLiveLayout`/`saver` em `use-patio-lobby.ts`). Edições do layout passam pelo servidor para todos; só o dono grava no banco; o próximo dono assume o salvamento.
5. **Deploy na Vultr.** Docker + HTTPS (Caddy), subdomínio `game.<domínio>`, deploy automático pelo GitHub, endereço do servidor no site, medição de ping.

Etapa 2 — mundo compartilhado

6. **Inimigos, horda e bonecos de treino compartilhados** (feito em parte: `lib/pigchicken/net-world.ts`, `net-world-sync.ts`). O navegador do dono simula aliens, zumbis, aliens de treino e mortos-vivos e manda pelo servidor; quem atira informa o acerto e o dono aplica; quando o dono sai, o próximo assume o mundo sem reiniciar. Projéteis de todos aparecem em todos (só visual). Falta: bonecos de treino do layout, Templo/palco de notas, feixe e golpes alheios. As almas soltas de cada navegador aparecem para todos e podem ser roubadas com o Passaguá (11/11, `lib/pigchicken/net-souls.ts`); faltam os pintinhos.
7. **Itens no chão e coleta compartilhados.** Quem pegou o quê, inventários por player, checagens básicas contra trapaça.

Cada PR atualiza o arquivo de `docs/mechanics/` correspondente e a entrada diária do changelog quando muda algo perceptível.
