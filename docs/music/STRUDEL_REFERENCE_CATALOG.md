# Catálogo de referências Strudel

Fonte recebida em 10/09/2026: `strudels-code-references`, 1.137 linhas. Os códigos são referências de escuta e implementação, com atribuições mantidas no arquivo original. Este catálogo registra ideias e requisitos; código externo não é executado automaticamente nem tratado como definição oficial de kit.

## Como o material entra no ChickenChess

Cada referência passa por quatro estados:

1. `referência`: código original preservado fora do runtime;
2. `extraída`: técnica descrita e separada por papel musical;
3. `adaptada`: receita própria, afinada em graus e validada pela engine;
4. `aprovada`: variante ou preset disponível na montagem de um kit versionado.

As receitas reutilizáveis terão ID estável, papéis compatíveis, padrão/variações, fonte sonora, envelope, efeitos, faixa de BPM, densidade e atribuição. Kits guardam referências a essas receitas e sobrescrevem somente os parâmetros necessários.

## Adaptações disponíveis no Modo Criativo

O registro tipado em `lib/music/pattern-library.ts` já expõe nove receitas no inspetor. A aplicação troca em conjunto padrão, comportamento, timbre, registro, ganho, envelope e filtros:

- `elliptical-kick`, `elliptical-backbeat`, `elliptical-hats` e `elliptical-bass`;
- `bonespurs-harmony` e `bonespurs-sequence`;
- `bennington-bass`, `bennington-pad` e `bennington-lead`.

São adaptações compactas em graus da escala. O editor também permite combinar fontes de samples, automações e grooves compartilhados. Aplicar uma receita de síntese restaura sua fonte e remove o vínculo de groove e as automações anteriores, evitando que uma receita de baixo continue tocando um sample percussivo por acidente.

### Primeira formação integrada

`Düsseldorf · Electro 01` sucede a formação de seis vozes `Elliptical Lab` e ativa as 16 brancas para audição no Criativo. O `SectionTimeline` é uma mini-notação global; cada instrumento possui um `PhraseBank` de até quatro variações, resolvido por `pickRestart`, e uma máscara opcional sincronizada. A forma de 16 ciclos é `[0@4 1@4 2@4 1@4]/16`, com A/B/C/B por quatro ciclos cada. O preset atual remove as máscaras de entrada para apresentar todas as vozes desde a ativação.

Além de timeline, frases e máscaras, estão implementados: banco genérico de samples, parâmetros em padrão/seno/rampa e grooves compartilhados por qualquer peça. O groove possui trilhas de ritmo e acento; `struct` define ataques e `pickRestart` coordena seções. O primeiro banco é original e local (13 WAVs CC0), sem redistribuir samples dos exemplos. Ganho, filtro, pan, reverb e delay aceitam automação por ataque; transposição em padrão, GM, layers e modulação dentro de notas sustentadas permanecem pendentes. O JSON v4 preserva todas essas configurações no kit da cidade.

## Prioridade: campanha eletrônica

| ID | Referência | O que preservar | Papéis | Capacidades necessárias | Prioridade |
| --- | --- | --- | --- | --- | --- |
| `ref-death-elliptical` | Death By Elliptical Eye | Contraponto entre duas linhas supersaw, entrada por máscaras, transposição e efeitos por seção, bateria expressiva | baixo, lead, cordas, bateria | máscaras, automação em padrão, seções coordenadas, banks | P0 — primeiro kit completo |
| `ref-bennington` | Bennington | Baixo de várias frases, pad quente, voz estéreo atrasada e bateria linndrum econômica | baixo, pad, lead, bateria | banco de frases, `pickRestart`, layer, delay feedback, banks/GM | P0 — cidade eletrônica anos 80 |
| `ref-bonespurs` | Bonespurs | Baixo filtrado, textura crescente, contraponto simples e bateria mínima | baixo, textura, lead, bateria | automação de filtro/ganho, máscara, variação determinística | P0 — preset minimal/experimental |
| `ref-gipsy-woman` | Gipsy Woman | Acordes sincopados em camadas, baixo mascarado e kit TR-909 com peças complementares | teclas, baixo, sax/lead, bateria | `struct`/`mask`, layers, voicing, `pickOut`, bank TR-909 | P1 — house/club |
| `ref-enjoy-silence` | Enjoy The Silence | Quatro acordes claros, melodia responsiva, baixo estruturado e groove HR-16 | acordes, melodia, baixo, guitarra, bateria | progressão global, struct separado das notas, samples/banks | P1 — synth/alternative |
| `ref-808-standalone` | Levadas Roland TR-808 | Escolha entre chimbal, groove de bumbo/caixa e chimbal aberto com forma longa | peões/percussão | pattern picker e `pickOut` por subinstrumento | P1 — biblioteca de grooves |
| `ref-il-vento` | Il Vento Caldo Dell'Estate | Entrada em contratempo, baixo insistente e seções longas que acumulam camadas | baixo, órgão, lead, bateria | timeline/seções, presets de entrada, banks | P2 — arranjo evolutivo |
| `ref-to-go-off` | To Go Off And Things | Forma progressiva extensa, riffs coordenados e bateria com muitas viradas | synth, guitarra, sax, baixo, bateria | forma hierárquica, seleção de frases, limites de densidade | P2 — experimental rápido |

## Biblioteca futura por família

| Família | Referências | Material reutilizável |
| --- | --- | --- |
| Vozes e coral | Fairy Mary Mag; El Pueblo Unido; Three Friends | voicings acima da âncora, coro em camadas, lead coral e envelopes de sílabas |
| Rock e progressivo | Everso Closely Guarded Line; Don't You Ail; To Go Off; Three Friends | guitarras GM, riffs longos, tuba/sax como resposta, viradas e formas por seção |
| Orquestra e clássico | The Sicilian Clan; Waltz #2; Vermin Mangle; Le Passanti | oboé, cordas, tuba, vibrafone, pizzicato, voicing e métrica ternária |
| Violões e cordas dedilhadas | El Pueblo Unido; Le Passanti; Mammals Chilling; feeling #37 | modelo de cordas/fingering, direção de palhetada, folkharp/psaltery e arpejos |
| Percussão acústica/mundial | feeling #37; Mammals Chilling; Endless Tarantella | cajón, shaker, clave, agogô, tambourine, bongo e articulações por sample |
| Harmonia e arpejo | Why Does My Brain Work So Bad?; Cabinet; Il Re Del Mondo | dicionário de acordes, catálogo de arpejos, progressões e alternância maior/menor |
| Arranjo cinematográfico | Epic Biopic; The Sicilian Clan | orquestração por seção, tuba melódica, cordas, dinâmica e bateria de transição |

## Capacidades extraídas

### P0 — necessárias para superar o protótipo atual

- Biblioteca de fontes: synth local, General MIDI, sample/bank e variante (`sound:n`).
- `PatternRecipe` separando notas/graus, estrutura rítmica, máscara, dinâmica e automações.
- `PhraseBank` com seleção normal, reinício de frase e variação determinada por seed.
- `SectionTimeline` compartilhada: todas as peças consultam a mesma seção sem perder o relógio.
- Padrões como valores de ganho, filtro, pan, transposição, reverb e delay, não somente números fixos.
- Groove coordenado distribuído entre quaisquer peças: implementado por trilhas de ritmo/acentos com `struct` e `pickRestart`; `pickOut` permanece uma possível técnica de importação.

### P1 — harmonia e interpretação

- Progressão de acordes global, âncora, modo de voicing e inversão.
- `struct` e `mask` independentes do conteúdo melódico.
- Layers/superimpose para duplicação por oitava, timbre e posição estéreo.
- Articulações: velocity, accent, cut group, begin/end de sample, vibrato e pitch envelope.
- Métrica e duração de ciclo explícitas; vários exemplos não usam quatro tempos por ciclo.

### P2 — autoria avançada

- Formas de dezenas de compassos com entradas, pausas e retorno de seções.
- Modelos instrumentais, como seis cordas e direção de palhetada.
- Dicionários de voicing específicos por estilo e afinações alternativas.
- Probabilidade e aleatoriedade reprodutíveis; nunca depender de `rand` sem seed numa partida/replay.

## Primeira experiência a construir

Começar com `Death By Elliptical Eye`, porque combina material eletrônico adequado à primeira campanha e permite testar o sistema inteiro com poucas famílias:

- três peões formam o groove (bumbo, caixa e chimbal);
- um cavalo executa a linha grave;
- um bispo sustenta a camada harmônica;
- uma rainha ou torre executa a linha aguda;
- movimentos selecionam variações e modulam filtro/transposição dentro de limites;
- ativação gradual precisa continuar musical com uma, duas ou todas essas peças.

Depois, `Bennington` valida frases longas e estética eletrônica suave; `Bonespurs` valida minimalismo e automação. Esse trio fornece contraste suficiente antes de expandir para house, rock, coral e orquestra.

## Cuidados de curadoria

- Preservar título, autoria do script e obra referenciada em todo registro interno.
- Não publicar samples remotos ou trechos autorais sem conferir licença e permissão de distribuição.
- Adaptar estruturas musicais e criar receitas próprias; não transformar o código completo de uma música em kit comercial por padrão.
- Registrar o que foi alterado e a origem da inspiração para revisão musical e jurídica posterior.
