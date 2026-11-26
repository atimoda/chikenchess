# Idioma do jogo

O jogo tem oito idiomas: Português, English, Español, Français, Русский, हिन्दी, 中文 (simplificado) e 日本語. Estrutura no código e regras para textos novos: [docs/codebase/i18n.md](../codebase/i18n.md).

## Onde trocar

- Linha **Idioma** (primeira das Preferências, com o ícone de idiomas), no globo, na partida da campanha, no online e no Criativo.
- No Pátio, a mesma linha no topo do painel **Camadas** (olho do cabeçalho), junto da qualidade e do FPS, fora do Lock: qualquer player troca o próprio idioma, mesmo num Pátio travado.
- A lista mostra cada idioma no próprio idioma. A escolha vale na hora em todas as telas abertas, sem recarregar e sem interromper música, partida ou Pátio; o desenho do Pátio (HUD, placas, lousas) muda no quadro seguinte.

## Escolha e persistência

- Guardada só neste navegador (`localStorage`, `chickenchess.locale`); não vai para a conta nem para o Pátio online.
- Primeira visita: o primeiro idioma do navegador entre os oito (pt-BR → Português, zh-CN → 中文…); nenhum deles → English.
- Cada idioma é carregado sob demanda. Até chegar, e enquanto a página ainda não abriu no navegador, os textos aparecem como estão escritos no código (parte em português, parte em inglês); depois a tela troca sozinha. Sem conexão para baixar o idioma, a tela continua no idioma anterior.
- `<html lang>` acompanha a escolha.

## Escopo

- Traduzidos: menus, painéis, botões, dicas, avisos, mensagens de erro mostradas ao player, HUD e textos desenhados no canvas, nomes de itens, parâmetros, ações e controles, descrições de cidades e fases, nas quatro telas (globo, partida/online, Criativo, Pátio).
- Não traduzidos: nomes próprios (cidades, gêneros e estilos musicais, kits, nomes científicos de aves, nomes de notas e acordes, Freeze/Shield/Best/Worst), o histórico de versões, as páginas legais, o admin, o Match log copiado para relatar bugs e o que vai para o servidor ou fica salvo (nomes de Pátios, chat, nomes de players).
- Um texto ainda sem tradução aparece no idioma em que foi escrito; o teste `npm run test:i18n` impede que isso chegue ao jogo.
