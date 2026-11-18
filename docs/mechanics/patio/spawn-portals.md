# Pátio: Portais de nascimento

Parte de [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). Onde a galinha nasce ao entrar num Pátio. O Portal de entrada (o que leva ao globo) está em [Editor do Pátio](editor.md); os pares de portais e o portal para outro Pátio, em [Mundo do Pátio](world.md).

## Comportamento atual (16/11, v2.12.0)

Código: `lib/pigchicken/spawn-portals.ts` (puro: chances, redistribuição e sorteio), elemento `spawn` em `lib/pigchicken/layout.ts`, sorteio e anéis em `components/chicken/chicken-patio.tsx`, saída pelo anel em `components/chicken/chicken-portal.tsx` (`birth`), paleta e Editar em `components/pigchicken/patio-editor.tsx`.

- **O elemento.** “Portal de nascimento” fica no grupo Portais da paleta do Modo editor. Tem 150 × 150 unidades, o mesmo anel do Portal de entrada, não colide com nada, não gira nem redimensiona. Pode ser movido, trancado, ter gravidade, ser duplicado e apagado (Del também). Um Pátio pode ter vários. No jogo ele não leva a lugar nenhum: não mostra instrução e Usar não faz nada nele.
- **Quem participa do sorteio.** O Portal de entrada (sempre um por Pátio) e todos os Portais de nascimento que estão dentro do mundo. Um portal além do fim de um mundo mais estreito fica de fora, e os outros dividem os 100% na proporção do que tinham.
- **Chance de nascer aqui.** Com dois ou mais portais, o Editar de cada um (inclusive o de entrada, que só então ganha o lápis) mostra o slider “Chance de nascer aqui”, de 0 a 100%, em números inteiros. A soma de todos é sempre 100%.
  - *Mexer num slider*: a diferença vai para os outros (ou sai deles) na proporção do que cada um tinha; se todos os outros estavam em 0%, ela é dividida igualmente. Exemplo: em 50 / 30 / 20, subir o primeiro para 80 dá 80 / 12 / 8.
  - *Portal novo* (arrastado da paleta ou duplicado): entra com a parte igual (100% dividido pelo total de portais) e os outros encolhem na proporção.
  - *Portal apagado*: a parte dele volta para os outros na proporção; se todos estavam em 0%, igualmente.
  - *Arredondamento*: as sobras do arredondamento vão para quem tem a maior fração; no empate, para o primeiro da lista.
  - *Um portal só*: nada é guardado e nada aparece no Editar; o Pátio se comporta como antes.
  - Desfazer e refazer (Ctrl+Z) levam as chances junto, porque elas fazem parte do layout. Um layout que chega com chances incompletas é lido assim: quem tem chance guardada mantém a proporção, e quem não tem recebe a parte igual.
- **O sorteio.** *Gatilho*: um Pátio abre neste navegador (chegada do globo, troca de Pátio por portal, painel ou passador de lobby, página recarregada). *Efeito*: um portal é sorteado pelas chances; portal em 0% nunca sai. O sorteio vale enquanto o Pátio está aberto; se o portal sorteado for apagado no Modo editor, outro é sorteado, sem mover ninguém. Mudar as chances com o Pátio aberto só vale para a próxima entrada.
- **Onde ela aparece.**
  - Sorteado o Portal de entrada: como antes. Vinda do globo ou de outro Pátio, sai de dentro do anel; abrindo a página direto no Pátio, começa 110 unidades à direita dele.
  - Sorteado um Portal de nascimento: ela sempre sai de dentro do anel dele (mesma animação de chegada dos portais, com a câmera enquadrando), também quando a página abre direto no Pátio.
  - Na troca de Pátio, as galinhas são sugadas pelo Portal de entrada do Pátio que fecha (ou pelo portal que usaram) e saem pelo portal sorteado no Pátio que abre.
- **O anel se fecha depois do nascimento** (18/11, v2.14.0; `createPortalShut`/`stepPortalShut`/`portalOpenness` em `lib/chicken/portal.ts`, prop `closeAfterSpawn` do `ChickenPortal`). Vale para o Portal de entrada (o que levava ao globo) e para os Portais de nascimento. *Gatilho*: o Pátio abre e a galinha principal existe. *Efeito*: o anel sorteado fica aberto enquanto ela sai dele e fecha 0,28 s depois que ninguém mais está saindo ou entrando nele (no mínimo 0,7 s depois que a galinha aparece, também quando ela começa 110 unidades ao lado, sem sair do anel). Os anéis que não foram sorteados já começam fechados. *Animação* (0,72 s): o anel incha um pouco, gira mais rápido, brilha mais, as faíscas são sugadas para o centro e ele encolhe cada vez mais depressa até um ponto de luz que se apaga. Fechado, não desenha nada, não mostra “Back to the globe?” e não pode ser usado: para voltar ao globo, o botão Globo do cabeçalho. *Reabre* (0,38 s, crescendo com um pequeno exagero), a partir do tamanho em que estiver, sempre que uma galinha local sai dele ou é sugada por ele (troca de Pátio pelo painel ou passador de lobby, ou chegada nele vinda de outro Pátio), e fecha de novo da mesma forma depois. No Modo editor (Editar ativo) todos ficam abertos para serem vistos e arrastados; ao sair, fecham. Escopo: Pátio local e online (cada navegador fecha os seus; as galinhas dos outros navegadores não reabrem), todos os Pátios. O portal do globo, os pares de portais e o Portal para outro Pátio não mudam.
- **Bloco liberado.** Com a Grade de blocos ligada, o Editar de cada um desses portais ganha o interruptor “Bloco liberado”: o bloco da grade mais próximo do portal começa aberto e sem bomba. Regras em [Grade de blocos](mine-grid.md).
- **Players locais.** O sorteio é um por navegador e por entrada: todos os players locais nascem no mesmo portal (os que entram depois caem ao lado do primeiro, como antes).
- **Escopo.** Modos local e online. No online cada navegador faz o próprio sorteio; os portais e as chances vão ao lobby com o layout, como qualquer edição.

## Ainda não existe

- Nascer já do lado fechado: hoje toda galinha começa do lado aberto e passa ao fechado quando está dentro de um bloco fechado (ver [Grade de blocos](mine-grid.md)).
- Renascer num portal: hoje a galinha não morre no Pátio, então o sorteio só acontece ao entrar.
