# Get a Move On! → Manchester · 1999

Atualizado em 13/09/2026. Implementado: **Northern Jazz Breaks**, ID `manchester-1999`.

- Partida: `/?city=manchester-1999`.
- Bancada sem introdução: `/creative?city=manchester-1999`, depois **Tocar arranjo**.
- No mapa, pin Manchester → **1999 · Jazz / Breaks** → Enter board.
- Kit JSON e partitura Strudel: `public/presets/manchester-1999.json` e `.strudel`.

## Artista, lugar e época

A [Ninja Tune data o single em 1º de maio de 1999](https://ninjatune.net/release/mr-scruff/get-a-move-on) e [Keep It Unreal em 1º de junho de 1999](https://ninjatune.net/release/mr-scruff/keep-it-unreal). Sua [biografia oficial](https://ninjatune.net/artist/mr-scruff) associa esse período à noite Keep It Unreal em Manchester. Essa combinação justifica **Manchester, 1999**, sem substituir Manchester 1988 / Haçienda.

O [perfil oficial de Mr. Scruff](https://soundcloud.com/mr-scruff/mr-scruff-get-a-move-on-2) identifica os samples de sax de *Bird's Lament*, de Moondog, e vocal de *Hypin' Woman Blues*, de T-Bone Walker. Jazz, funk, breaks e colagem de samples orientam o capítulo; não é um kit genérico de acid house nem uma reconstrução de todos os estilos da cidade.

## Análise do FLAC fornecido

Foi decodificado e analisado numericamente o arquivo **08 - Mr. Scruff - Get a Move On! (radio edit).flac**. Não houve escuta auditiva direta nesta sessão. Os dados espectrais não identificam sozinhos instrumentos, notas exatas, swing ou seções formais. A descrição tímbrica combina fontes do artista e escolhas de síntese; o kit é uma reinterpretação original, não uma transcrição fiel.

| Medida | Resultado / limite |
| --- | --- |
| Duração | 203,4267 s — 3min23s |
| Formato decodificado | Estéreo, 44,1 kHz, fonte de 16 bits |
| Pico / RMS global | −0,05 / −11,72 dBFS |
| Pulso | Próximo de 123 BPM. Correlação de envelopes nas bandas 35–160 Hz e 2–4,5 kHz, em 30–90 s e 90–160 s, dá pico de 122,73 BPM na resolução usada. Busca espectral local dá 123,32; adotados 123 BPM, sem alegar precisão de centésimos |
| Tonalidade | Não confirmada. A soma espectral enfatiza G/A/D, mas inclui harmônicos e bateria. Sol dórico é uma escolha do novo arranjo |
| Microtiming | Não estimado com confiança a partir da mistura. Proporção 5:4 das colcheias é uma escolha musical editável do kit |

A correlação espectral inicial, de resolução menor, também encontrou aliases perto de 81/129 BPM; por isso não foi usada isoladamente. Os resultados brutos estão em `analysis/scruff-radio-edit.json`. `scripts/analyze-audio.py` oferece a análise espectral reproduzível (dependências de análise: NumPy, SciPy e SoundFile; não fazem parte do app).

### Forma observada por energia, não por transcrição

| Trecho aproximado | Evidência no arquivo | Decisão para a versão do jogo |
| --- | --- | --- |
| 0–8 s | RMS −18,93 dBFS, pouca energia grave relativa | A apresenta a identidade com menos ataques |
| 8–32 s | Crescimento do grave e RMS chegando a −13,5 dBFS | Acrescentar base e respostas progressivamente |
| 32–184 s | Patamar em torno de −11 dBFS; grave predominante | B/D mantêm pulso e motivo, variando respostas e acentos |
| 184–203 s | Redução de energia e brilho | C abre espaço para contraste; no jogo retorna ao groove em vez de terminar |

Esses intervalos de oito segundos não delimitam compassos exatos. A forma do kit é cíclica, adaptada à duração imprevisível de uma partida.

## Arranjo implementado

**123 BPM · Sol dórico · A4/B8/C4/D8 compassos**, com os dois lados no relógio comum. As 16 brancas vêm ativas no Criativo. Na partida, as peças continuam entrando após seus movimentos; cheque amplia temporariamente a banda atacante.

| Peças neste kit | Papel |
| --- | --- |
| Peões | Bumbo seco, caixa, chimbal, ghost snare, ride, chimbal aberto, rim e shaker |
| Cavalos | Baixo dedilhado: pergunta e resposta com padrões distintos |
| Torres | Barítono de apoio e metal de resposta |
| Bispos | Acordes elétricos curtos e respostas de teclas |
| Rainha | Motivo principal de palheta, com quatro variações audíveis |
| Rei | Interjeições de vogal sintetizada |

Os papéis são configurações, não regras da engine. Qualquer peça pode usar qualquer fonte. Movimento lateral desloca o motivo lentamente; avanço não o transpõe, preservando sua identidade. As frases, pesos 5:4, envelopes, ganhos e fontes são editáveis. Cada voz toca em todas as seções, com pausas internas; nenhuma rainha depende do botão de audição para soar.

O banco **Chicken Jazz · 01** contém 11 one-shots originais (~297 KB), mono/32 kHz: palheta em duas articulações, barítono, metal, vogal, baixo, teclas, bumbo, caixa em duas articulações e ride. São aproximações sintéticas; não são gravações realistas de sax/contrabaixo nem voz humana. Não há áudio extraído do FLAC no projeto. O código gerador e os WAVs estão disponíveis; os WAVs são CC0.

A partitura exportada contém os mesmos padrões da engine e requer os assets `/samples` servidos pelo projeto; para executá-la em outro domínio, hospedar os assets e ajustar suas URLs. Regenerar kit/partitura com `node scripts/export-manchester-kit.cjs`.

## Validação e próxima escuta

Testes verificam todos os 32 instrumentos nas quatro seções, escala, densidade, rainhas ativas, colcheias 5:4 e isolamento dos salvamentos de 1988/1999. No navegador, a rainha em Solo gerou sinal real sem segurar a audição; os samples carregaram sem erros.

A próxima comparação com o usuário deve decidir se a palheta sintetizada tem identidade suficiente, se há espaço entre motivo/resposta e se o baixo sustenta bem formações pequenas. Fidelidade acústica e qualidade musical não são comprovadas pelos testes. O loop curto não reproduz a faixa comercial integral nem suas seções exatas.
