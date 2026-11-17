# Pátio: aurora

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../../GAME_MECHANICS.md). O resto do céu (hora, sol, estrelas, nuvens, montanhas, neve caindo) fica em [sky-and-power.md](sky-and-power.md).

## Aurora (13/11, v2.10.0)

`lib/pigchicken/aurora.ts` (parâmetros, `auroraOpacity`), `lib/pigchicken/aurora-draw.ts` (cortinas e raios, puro), `components/pigchicken/aurora.tsx` (pintura e movimento), `AuroraFields` em `components/pigchicken/sky-fields.tsx`, `SkyLook.night` em `lib/pigchicken/sky.ts`.

- **Onde:** Configurações do Pátio (botão Sol), categoria **Aurora**, logo depois de Estrelas, para quem pode editar o Pátio. Salva em `settings.aurora`, em todos os modos do Pátio (local e online), e também no arquivo de padrões do jogo (“Salvar no game”). Sem ela, ou com Intensidade 0, não há aurora e nada é desenhado: os Pátios salvos antes continuam iguais.
- **Intensidade** (0 a 200%, padrão 0): o quanto ela aparece; acima de 100% os raios ficam mais claros. Com Intensidade acima de 0 aparecem os outros ajustes e os botões **Sortear forma** (outras cortinas, com os mesmos ajustes) e **Padrão** (tira a aurora).
- **Cor** (pé das cortinas, padrão verde) e **Cor do alto** (para onde os raios desbotam, padrão violeta).
- **Faixas** (1 a 5, padrão 3): quantas cortinas, espalhadas pela parte do céu que a tela mostra ao longo do mundo. **Largura** (30 a 300%): o comprimento de cada cortina (cerca de 1500 unidades em 100%). **Altura dos raios** (30 a 300%): até onde os raios sobem (cerca de 320 unidades). **Altura no céu** (0 a 100, padrão 40): 0 põe o pé das cortinas atrás das montanhas; 100, alto no céu.
- **Ondulação** (0 a 100%): quanto o pé da cortina dobra (duas ondas e um leve arco). **Raios** (0 a 100%, padrão 60): 0 é um véu liso; mais alto, raios de comprimentos e brilhos diferentes.
- **Movimento** (0 a 300%): a velocidade do balanço (a cortina desliza e inclina de leve, presa pelo pé) e da cintilação. 0 = parada. Com movimento reduzido no sistema ela fica parada.
- **Só à noite** (ligado por padrão): a aurora aparece conforme o céu escurece e some de dia, pela mesma conta das estrelas (`SkyLook.night`), mas sem depender da Intensidade das Estrelas nem de “Mostrar estrelas a qualquer hora do dia”. No céu clássico vale 0,6. Desligado: aparece em qualquer hora.
- **Onde fica no fundo:** na profundidade do sol (0,97), por cima das estrelas, do sol e da lua e atrás das nuvens, montanhas e matas. No celular deitado, onde o fundo mostra só o alto do céu, ela pode ficar fora da tela, como as montanhas.
- **Desenho e custo:** cada cortina é pintada uma vez num canvas pequeno (uma fração do tamanho na tela, ampliado, o que já a deixa suave) e só muda quando os ajustes da aurora mudam. O movimento é só CSS (`transform` e `opacity`), sem repintar. Cortinas fora da tela ficam escondidas (`watchCameraRegion`). Por qualidade gráfica ([performance.md](../performance.md)):
  - **Alta:** canvas na metade do tamanho, com desfoque; balança e cintila (um segundo conjunto de raios acende e apaga por cima do primeiro).
  - **Média:** canvas a um terço, com desfoque; só balança.
  - **Baixa:** canvas a um quarto, sem desfoque; parada.
  - Medido em Chromium sem GPU (computador 1400 × 800): sem aurora ~59 FPS, Média ~54, Alta ~35 (a cintilação é a parte cara sem GPU). Celular emulado (873 × 393, CPU 4× mais lenta, Média): igual a sem aurora dentro do ruído. Não é medição em aparelho físico.
