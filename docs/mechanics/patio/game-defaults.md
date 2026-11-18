# Pátio: padrões do jogo e painéis de configuração

Comportamento atual (11/11, v2.8.0). Vale em todas as cenas e modos do Pátio (local, online, Modo editor).

## Espaço abaixo do chão

- **O que é:** quanto chão aparece abaixo dos bonecos, no pé da tela, onde fica a barra do inventário. Era fixo em 100 px (`BAR_GROUND_H`); agora cada Pátio guarda o seu em Configurações do Pátio → **Espaço abaixo do chão** (`settings.ground`, 30 a 400 px em passos de 10, padrão 100; `PATIO_GROUND` e `patioGround` em `lib/pigchicken/patio-settings.ts`).
- **Efeito:** o chão do mundo fica a essa distância do pé da tela; a câmera vertical, os bonecos (locais, extras, online, pintinhos), a moldura dos limites e o chat acompanham na hora (`groundHeight` em `components/chicken/chicken-patio.tsx`). A barra do inventário não muda de lugar: abaixo de uns 90 px ela passa a cobrir o chão.
- **Escopo:** desktop, tablet e celular deitado. No celular em pé com controles de toque, o espaço continua sendo o dos controles (não usa o valor).
- **Quem muda:** quem pode editar o Pátio; os demais veem o valor. Duplo clique e **Padrão** voltam ao padrão do jogo. Salvo com o Pátio como o resto de `settings`; Pátios salvos antes usam 100.

## Salvar no game (admin)

Botão no fim do painel, só para conta admin, com o mesmo componente e as mesmas mensagens de Controles e Itens (`components/admin/save-to-game-button.tsx`; detalhes do Admin local em `docs/ADMIN.md`).

- **Configurações do Pátio, Camadas, Câmera de Mira e Volume** gravam `data/pigchicken/default-patio.json` pelo Admin local (`npm run admin:dev`), cada painel a sua parte, sem mexer nas outras (`lib/admin/game-defaults-client.ts`; validação em `lib/pigchicken/patio-defaults.ts`). Publicar é commit e deploy.
  - `settings` (Configurações do Pátio): o que um **Pátio vazio** novo recebe ao ser criado (`emptyLayout`): largura, altura, espaço abaixo do chão, limite do inventário, Zonas das cenas, Fundo da Vila, céu, estrelas, montanhas, nuvens, neve e brilho dos itens do Pátio aberto. Não entram as zonas das cenas editadas, os limites entre elas nem as camadas. O arquivo começa só com o Fundo da Vila desligado, como o Pátio vazio já era. Pátios existentes, a cópia do Pátio padrão e o Pátio de exemplo não mudam. **Padrão** do painel volta largura, altura, espaço abaixo do chão e inventário a esses valores (aos do código onde o arquivo não tem).
  - `layers` (Camadas): os valores do painel para todo Pátio que não salvou os seus com “Salvar no pátio” (`LAYERS_DEFAULT`). As opções de FPS são do navegador e não entram.
  - `camera` (Câmera de Mira): os valores para quem nunca mexeu no painel neste navegador e para **Padrão** (`DEFAULT_PARQUINHO`). Debug e a antiga largura não entram. Ajustes já salvos por jogadores não mudam.
  - `volume` (Volume): o Master e as cinco camadas para quem nunca mexeu nos volumes neste navegador e para **Padrão** (`DEFAULT_MIX` em `lib/pigchicken/mixer.ts`). Cacarejos liga/desliga é dos Controles e não entra. Volumes já salvos por jogadores não mudam.
- **Ajustes** (galinha): “Salvar padrão” passou a se chamar **Salvar no game** e foi para o fim do painel, só para admin. Continua gravando a configuração central (`online_private.chicken_config`, RPC `chicken_config_save`), que vale na hora para todas as telas e todo mundo, sem deploy; o resultado ou o erro aparece ao lado do botão. Quem não é admin não vê botão de salvar; o rascunho fica no navegador.

## Cabeçalho dos painéis

- **Ajustes:** a fileira de botões e o texto abaixo do título saíram. No cabeçalho, à esquerda do fechar, só ícones com dica no hover: **Desfazer** (volta à versão salva no game; apagado sem rascunho), **Padrão** (antes “Valores do código”: carrega os padrões de `params.ts` como rascunho) e **Debug** (aceso quando ligado).
- **Configurações do Pátio, Câmera de Mira e Volume:** **Padrão** é o mesmo ícone, à esquerda do fechar. Na Câmera de Mira ele não mexe mais no Debug.
- **Volume:** o cabeçalho segue o dos outros painéis: título fixo no topo com uma linha divisória abaixo, e só o conteúdo rola.

## Dropdowns dos painéis: botão de próximo item

Comportamento atual (16/11, v2.12.0; `components/ui/step-select.tsx`, e `components/ui/patio-select.tsx` nos editores de casas e de árvores).

- **O que é:** todo dropdown dos painéis do Pátio tem, encostado à direita, um botão verde com uma seta (`STEP_BUTTON`). É o mesmo botão em todos os painéis.
- **Gatilho e efeito:** cada toque ou clique escolhe a opção seguinte da lista, na ordem em que ela aparece aberta, exatamente como se tivesse sido escolhida na lista (mesmo efeito, mesmo passo de Desfazer). Depois da última vem a primeira. Opções desabilitadas são puladas. Com o dropdown desabilitado, o botão também fica.
- **Opções puladas (`data-skip`):** o texto de espera de uma lista (“Escolher…” da Predefinição, “Escolha um Pátio” do portal) e a opção “remover” da direção de um golpe do combo. Na Predefinição, que sempre volta a mostrar “Escolher…”, o botão continua a partir da última predefinição aplicada: Silêncio, depois cada predefinição, e de novo Silêncio.
- **Onde vale:** Editar da Zona sonora e Zona da cena (Predefinição, Tom, Escala, Acordes de, Progressão, Batida, Balanço, Baixo, Oitava, Dano nos inimigos, Padrão de mudança, passos e modos da Cadeia), Faixas fixas, “Rebate notas”, Editar dos demais elementos (portal, Item solto, suporte, botão de horda, lousa, Gongo, Chão e Parede, Baú, postes), Itens (inclusive a direção de cada golpe do combo e os pontos), Bateria (Peça), Grade de blocos (Giro da gangorra), Catálogo de aliens, Biblioteca de almas, Escalas, Playgrounds (ordem e filtro), Câmera de Mira, Ajustes (sons), MIDI e editor de músicas. Em todos os modos do Pátio (local, online, Modo editor).
- **Sem botão:** listas que são menus de ação e não uma escolha (“+ adicionar…” da Cadeia, “+ andar” da Bateria, a variação ao lado de “+ Alien” no editor de músicas) e as três listas pequenas de cada golpe do combo (duração, cooldown, alcance), para a linha do golpe caber.
- **Fora do Pátio:** os dropdowns do Criativo e da partida não mudaram.
