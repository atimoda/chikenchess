# Referências musicais — coleção v0.3.2

Atualizado em 16/09/2026. A coleção está em `lib/music/styled-kits.ts`; os defaults das 13 fases usam esses dados. Os padrões são composições originais inspiradas nos recursos de cada linguagem, não transcrições ou reconstruções históricas das gravações citadas. Pesquisa de repertório e datas não equivale a análise auditiva. As diferenças de época abaixo são intencionais e explícitas.

| Fase | Kit / direção de arranjo | Referência e contexto |
| --- | --- | --- |
| Düsseldorf · 1970 | Rhein: pulso regular, motivos repetidos, flauta e texturas sintéticas; respostas em seis tempos | [Kraftwerk, Ruckzuck / álbum de 1970](https://en.wikipedia.org/wiki/Kraftwerk_(album)). Período experimental anterior ao electro-pop e ao motorik de NEU!. O nome “laboratório motorik” é uma aproximação de composição, não classificação rígida da gravação. |
| New York City · 1977 | Loft: quatro no chão, baixo sincopado, cordas, guitarra e respostas de metal | [Chic, Dance, Dance, Dance — charts contemporâneos de 1977](https://jameshamiltonsdiscopage.com/chart-archive/a-full-list-of-all-record-mirror-uk-disco-chart-entries-1975-1979/). Le Freak é posterior e não foi apresentado como hit de 1977. |
| Chicago · 1984 | Warehouse: baixo sintético, caixa nos contratempos fortes, palmas e motivos econômicos | [Jesse Saunders sobre On and On, de 1984](https://iumag.co.uk/chicagos-jesse-saunders-released-the-first-house-record-in-1984-exclusive-interview/). |
| Detroit · 1986 | Metro: bateria sincopada, baixo eletrônico, stabs e frase de sete tempos | [Model 500, No UFO’s, original de 1985](https://bleep.com/release/90436-model-500-no-ufos-remixes). Referência imediatamente anterior à fase. |
| Ibiza · 1986 | Amnesia: andamento moderado, espaço, camadas longas, respostas e percussão leve | [Repertório balearic de Alfredo, incluindo Moments in Love](https://banbantonton.com/2023/07/14/looking-for-the-balearic-beat-soundtracking-paradise/). Referência de seleção musical, sem afirmar que a faixa nasceu em Ibiza. |
| Manchester · 1988 | Hacienda: baixo ácido, filtro por seção, slide ocasional, acentos em três tempos | [808 State, Newbuild (1988)](https://808state.com/discogs/808pages/albpages/albnewbu/albnewbu2.htm). Pacific pertence a 1989. |
| Manchester · 1999 | Northern Jazz Breaks: grooves longo/curto, sopros pergunta/resposta, baixo e pequenas quedas de afinação | [Mr. Scruff, Keep It Unreal (1999), Ninja Tune](https://ninjatune.net/release/mr-scruff/keep-it-unreal). Mantém a composição de `MUSIC_REFERENCE_GET_A_MOVE_ON.md`, agora com seções por peça e slide ocasional. |
| Berlin · 1991 | Tresor: quatro no chão, saturação, stabs, contraste de filtro, ciclos melódicos de sete e cinco tempos | [X-101, primeiro lançamento Tresor](https://tresorberlin.com/release/tresor-001/). |
| Tokyo · 1991 | Mosaico: timbres sintéticos percussivos, deslocamentos de acentos, frases em sete e cinco tempos | [YMO, BGM — catálogo Sony](https://www.sonymusic.co.jp/artist/YMO/discography/MHCL-10111). O disco é de 1981, um antecedente; não foi apresentado como sucesso de 1991. Escolha de direção para a bancada, não representação de toda a música japonesa. |
| London · 1992 | Breaks: bateria quebrada rápida, notas fantasma, stabs e baixo espaçado | [The Prodigy, Experience (1992), XL](https://shop.xlrecordings.com/release/346455-the-prodigy-experience). Linguagem rave/breakbeat, sem chamar todo o período de jungle consolidado. |
| São Paulo · 1993 | Subsolo: techno, percussão adicional, baixo insistente e pequenos cortes | [Ruído na Metrópole — relatos da cena](https://www.ruidonametropole.com.br/). Krawitz antecede a fase; Hell’s Club abriu em 1994. Não se atribui um suposto hit específico paulistano a 1993. |
| Paris · 1995 | Da Seine: baixo com síncopes, guitarra, filtro por seção e escala blues | [Daft Punk — catálogo oficial](https://www.daftpunk.com/), [Da Funk (1995)](https://en.wikipedia.org/wiki/Da_Funk). |
| Vienna · 1780 | Salão: linhas tonais, cordas, madeiras, baixo e tímpanos; peões afinados, sem bateria eletrônica | [Mozart, K.338 — Mozarteum](https://kv.mozarteum.at/en/work/symphony-in-c-4426). Composta em Salzburg em 1780: referência austríaca, não alegação de composição/estreia em Viena. |

## Estudo “Mouth Breather”

Preset independente do mapa: **Estudo Mouth Breather**, no seletor superior do Criativo. Arquivos: `public/presets/mouth-breather.json` e `.strudel`; regeneração por `node scripts/export-mouth-breather.cjs`. Composição atribuída a The Jesus Lizard e script fornecido pelo usuário atribuído a eefano. A [documentação da Touch and Go](https://touchandgorecords.com/mediaroom/jl/Down_Press_Kit.pdf) situa Goat em 1991; o estudo não substitui o kit de Chicago house de 1984.

| Recurso do trecho fornecido | Implementação |
| --- | --- |
| Guitarra com duas camadas, incluindo vozes paralelas | Notas simultâneas no mesmo piano roll; pan por nota, preservando 0,49/0,51 |
| Duas partes de guitarra, baixo alternado e bateria em ciclo quebrado | Notas e durações extraídas consultando os padrões com Strudel real; preserva a alternância interna do baixo em três compassos |
| Guitarra caindo ocasionalmente | Segundo banco com acorde transposto em −8 semitons, `penv(-3)` e `patt(.6)` |
| Entrada/saída de instrumentos, pausas e transposição de −5/−7 | 17 blocos por peça, 488 tempos de forma completa; reinício de frase ao entrar no bloco |
| `setcps(215/60*2)` | 215 BPM no relógio comum de quatro tempos, com padrões originais acelerados por oito na conversão. Mantém a duração real do exemplo, evitando interpretar CPS como BPM |
| Timbres e processamento por bateria | Bumbo, caixa, chimbal aberto e prato em quatro peças; pitch, filtro, ganho e pan próprios |
| Guitarra/baixo com distorção | Intensidade e nível da distorção configuráveis; valores do exemplo preservados na guitarra e no baixo, com mixagem geral adaptada |

São seis peças ativas neste estudo para corresponder às seis vozes distribuídas. Kits de cidades continuam abrindo com as 16 brancas ativas. O estudo usa escala cromática para preservar os semitons originais. Editar a escala depois transforma o material conforme os graus do kit.

**Limite de timbre:** GM electric guitar, GM bass pick e Linn 9000 foram substituídos por samples sintéticos locais. O ganho/reverb foram ajustados para a bancada. Não é uma reprodução sonora fiel da gravação. Os testes comparam eventos, alturas, durações e exportação, não aprovam a qualidade musical subjetiva.

O banco `chicken-world-v1` contém oito sínteses originais CC0: guitarra, cordas, flauta, marimba, conga, tímpano, pandeiro e prato. São mono, 24 kHz, carregadas sob demanda; as três coleções locais somadas ficam abaixo de 1,2 MB. Um sample de flauta sintética não substitui um instrumento acústico multisample com articulações naturais.

Referência técnica: [efeitos do Strudel](https://strudel.cc/learn/effects/). O envelope de afinação varia dentro da nota; os demais padrões de automação são amostrados a cada ataque. Portamento contínuo entre gestos e scratch de áudio continuam fora desta implementação.
