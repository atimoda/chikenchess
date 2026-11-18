# Mata do fundo do Pátio

`lib/pigchicken/forest.ts` (parâmetros, normalização e o que cada fileira desenha), `lib/pigchicken/forest-draw.ts` (as formas das árvores), `components/pigchicken/parallax.tsx` (as duas fileiras, nas cores do céu), `ForestFields` em `components/pigchicken/forest-fields.tsx`.

## Configurações do Pátio → Mata (17/11, v2.13.0)

- **Onde:** Configurações do Pátio, categoria **Mata**, logo depois de Montanhas; salvo em `settings.forest` (com `far` e `near`) e valendo em todos os modos do Pátio. Sem ela, as duas fileiras de sempre; **Padrão** (aparece quando há ajuste) volta a elas. Entra no “Salvar no game” como as Montanhas.
- **Duas fileiras:** **Mata ao longe** (profundidade 0,34, árvores baixas e juntas sobre uma faixa de chão preenchida) e **Mata perto** (0,2, árvores altas e espaçadas). Cada uma tem:
  - a caixa com o nome, que mostra ou esconde a fileira (a faixa de chão da Mata ao longe sai junto);
  - **Sortear forma**: outra semente, mesmas configurações;
  - **Densidade** (20 a 300%, padrão 100%): divide o espaçamento entre as árvores;
  - **Tamanho** (30 a 250%, padrão 100%): a altura das árvores;
  - **Formas** (18/11, v2.14.0): quatro controles de 0 a 100, em proporção entre si, e cada um mostra a parte das árvores que tem: **Pinheiros** (padrão 45), **Copas redondas** (padrão 55), **Copas em nuvem** (padrão 0: copa alta e oval contornada por 13 a 16 montinhos, tronco curto) e **Guarda-chuvas** (padrão 0: copa larga e achatada feita de gomos ao longo de um arco que desce para o lado do vento, com montinhos no alto e a ponta enrolada para baixo como um gancho; tronco grosso e curvo que se abre em Y). Todos os guarda-chuvas de uma fileira se inclinam para o mesmo lado (pela semente). Tudo em 0 desenha só copas redondas. Um Pátio salvo antes guarda só Pinheiros: as Copas redondas ficam com o resto até 100 e as duas novas em 0, então o desenho não muda;
  - **Cor** (seletor + quanto, 0 a 100%): mistura a cor escolhida à cor da fileira (até 80%), como em Montanhas.
  Escondida, a fileira mostra só a caixa; os controles somem.
- **Luz:** a cor de base de cada fileira continua vindo do céu (hora, névoa e contraluz); os ajustes só mudam forma e tom.
- **Céu e luz → Mata** (antes “Mata ao longe”) continua escondendo as duas de uma vez (`sky.forest`, também sorteado pelo Randomize). Desligada, a categoria Mata avisa “Escondida em Céu e luz → Mata”.
- **Valores padrão** desenham exatamente as fileiras de antes (mesma semente, tamanho, espaçamento e proporção de pinheiros): só com Pinheiros e Copas redondas, cada árvore sorteia a forma com o mesmo número aleatório de sempre.
