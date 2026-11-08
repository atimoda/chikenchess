# Roadmap - ChiKenChess 1.0

> Documento histórico. A prioridade atual e a visão revisada estão em [docs/music/MUSIC_ENGINE_PLAN.md](../music/MUSIC_ENGINE_PLAN.md), de 10/09/2026: primeiro validar a engine musical em Düsseldorf. As fases, preços e tecnologias abaixo não são compromissos vigentes.

Este documento define a visão global de curto e médio prazo para a plataforma ChiKenChess.

## 1. Visão do Produto
**"Uma biblioteca mundial da música jogável."**
O objetivo é criar uma experiência onde o jogador aprende sobre a história da música e culturas locais através do xadrez e da música generativa.

## 2. Estrutura de Modos de Jogo

### 🗺️ Modo Single Player ("Modo Carreira")
Uma jornada linear de progressão.
- **Conceito**: O jogador viaja por cidades/épocas enfrentando IAs temáticas.
- **Progressão**: Derrotar uma cidade libera a próxima.
- **Conteúdo**: Abrange principais estilos musicais de diversas regiões e décadas.
- **Cidade Inicial**: Chicago.

### ⚔️ Modo Multiplayer Online
Jogar contra amigos ou oponentes aleatórios com sincronização musical.
- **Grátis**: Acesso às 7 cidades originais da música eletrônica.
- **Convite**: Link direto para desafiar amigos.

### � Plataforma Social
- **Perfil de Jogador**: Página pública com estatísticas, nível e conquistas.

## 3. Estrutura de Monetização

| Versão | Custo | Benefícios |
| :--- | :--- | :--- |
| **Gratuita** | R$ 0,00 | • Acesso às 7 cidades iniciais (Single & Multi)<br>• Perfil Básico |
| **Pacote Single Player** | $ 23,00 (Único) | • Desbloqueia **todas** as cidades no modo offline/carreira<br>• Jogue a campanha completa |
| **ChickenChess.club** | $ 9,00 / mês | • Acesso total Multiplayer (todas as cidades)<br>• **Host Premium**: Convide não-assinantes para jogar em cidades pagas<br>• Perfil Social Avançado (Badges, Histórico completo) |

## 4. Próximos Passos Técnicos (Implementação)

### 🐛 Bugs Prioritários
- [ ] (Nenhum bug crítico listado no momento)

### Fase 1: Interface Visual e Imersão (Prioridade Atual)
- [ ] **Imagem da Cidade**: Implementar visualização atmosférica da cidade atual.
- [ ] **Fundo "Matrix" Musical**: Exibir códigos da música caindo ao fundo da tela, estilo Matrix.
- [ ] **Mapa Mundi Detalhado**: Melhorar a fidelidade visual e detalhes do mapa de fundo.
- [ ] **Spectrograma Real**: Corrigir o visualizador de áudio para reagir fielmente ao som stereo.
- [ ] **Peças "Mortas" Flutuantes**: Peças capturadas flutuando (brancas acima, pretas abaixo), tamanho reduzido (50%).
- [ ] **Borda Neon Dinâmica**: "Pulsar" a borda da tela sincronizada com emissão de sons das peças.

### Fase 2: Usabilidade e Feedback Sonoro
- [ ] **Interação Tátil Completa**:
    - Ao segurar peça: Alterar slider de parâmetros, aumentar volume.
    - **Smart Pitch**: Engine (Stockfish) altera pitch do som (Agudo=Bom, Grave=Ruim).
- [ ] **Efeitos de Checkmate**: Som de explosão, reverberação longa, chorus/echo e fade-out.
- [ ] **Atmosfera Musical**: Auto-play com fade-in gradual (5s) e músicas clássicas temáticas opcionais.

### Fase 3: Fundação Single Player & Conteúdo
- [ ] Implementar sistema de bloqueio/desbloqueio de cidades.
- [ ] Criar persistência de progresso local.
- [ ] Melhorar IA para ter "personalidades" diferentes por cidade.

### Fase 4: Multiplayer & Social
- [ ] Servidor de WebSocket / PartyKit para partidas online.
- [ ] Sincronização de estado de jogo e música entre clients.
- [ ] Página de Perfil do Usuário e Banco de Dados (Supabase).

### Fase 5: Loja e Expansão
- [ ] **Loja In-Game**: Sistema para comprar Kits de Xadrez (Skins de peças/tabuleiro).
- [ ] Integração com Gateway de Pagamento.
- [ ] Controle de acesso (Gates) para conteúdo pago.

## 5. Sugestões e Backlog (Futuro)
- [ ] **Modo Replay Cinematográfico**.
- [ ] **Comandos de Voz** (Acessibilidade).
- [ ] **Sistema de Conquistas (Achievements)**.
