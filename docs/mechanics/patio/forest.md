# Mata do fundo do Pátio

`lib/pigchicken/forest.ts` (parâmetros, normalização e o que cada fileira desenha), `components/pigchicken/parallax.tsx` (as duas fileiras de árvores, nas cores do céu), `ForestFields` em `components/pigchicken/forest-fields.tsx`.

## Configurações do Pátio → Mata (17/11, v2.13.0)

- **Onde:** Configurações do Pátio, categoria **Mata**, logo depois de Montanhas; salvo em `settings.forest` (com `far` e `near`) e valendo em todos os modos do Pátio. Sem ela, as duas fileiras de sempre; **Padrão** (aparece quando há ajuste) volta a elas. Entra no “Salvar no game” como as Montanhas.
- **Duas fileiras:** **Mata ao longe** (profundidade 0,34, árvores baixas e juntas sobre uma faixa de chão preenchida) e **Mata perto** (0,2, árvores altas e espaçadas). Cada uma tem:
  - a caixa com o nome, que mostra ou esconde a fileira (a faixa de chão da Mata ao longe sai junto);
  - **Sortear forma**: outra semente, mesmas configurações;
  - **Densidade** (20 a 300%, padrão 100%): divide o espaçamento entre as árvores;
  - **Tamanho** (30 a 250%, padrão 100%): a altura das árvores;
  - **Pinheiros** (0 a 100%, padrão 45%): a parte de pinheiros entre as copas redondas;
  - **Cor** (seletor + quanto, 0 a 100%): mistura a cor escolhida à cor da fileira (até 80%), como em Montanhas.
  Escondida, a fileira mostra só a caixa; os controles somem.
- **Luz:** a cor de base de cada fileira continua vindo do céu (hora, névoa e contraluz); os ajustes só mudam forma e tom.
- **Céu e luz → Mata** (antes “Mata ao longe”) continua escondendo as duas de uma vez (`sky.forest`, também sorteado pelo Randomize). Desligada, a categoria Mata avisa “Escondida em Céu e luz → Mata”.
- **Valores padrão** desenham exatamente as fileiras de antes (mesma semente, tamanho, espaçamento e proporção de pinheiros).
