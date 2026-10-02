# Bancos de samples ChickenChess

Os bancos originais do ChickenChess são sínteses próprias CC0. O banco acústico de Salvador usa gravações CC0 da Versilian Studios e de plotzki no Freesound, sem áudio da gravação de Olodum. Cada banco é mono, PCM 16-bit e carregado sob demanda pelo kit ativo. As notas fundamentais para os sons afinados constam em `lib/music/sample-banks.ts`.

| Banco | Característica | Gerador |
| --- | --- | --- |
| `chicken-electro-v1` | Bateria eletrônica curta e sino | `scripts/generate-samples.py` |
| `chicken-jazz-v1` | Sopros, baixo, teclas e bateria da primeira coleção | `scripts/generate-jazz-samples.py` |
| `chicken-world-v1` | Flauta, marimba, cordas, violão e percussão | `scripts/generate-world-samples.py` |
| `chicken-strings-v1` | Cordas dedilhadas, guitarra elétrica, baixos, violino, cello e pizzicato | `scripts/generate-timbre-samples.py` |
| `chicken-keys-v1` | Pianos, Rhodes FM, órgão drawbar, clav, celesta e acordeão | `scripts/generate-timbre-samples.py` |
| `chicken-synths-v1` | Baixo ácido com varredura, pad desafinado, sino FM, wavetable, sub e coro formante | `scripts/generate-timbre-samples.py` |
| `chicken-drums-v1` | Bumbo/caixa acústicos, vassourinha, palmas de sala, rim, pandeiro e ride | `scripts/generate-timbre-samples.py` |
| `chicken-samba-reggae-v1` | Esboço sintetizado anterior, retido para kits salvos | `scripts/generate-samba-reggae-samples.py` |
| `chicken-samba-reggae-v2` | Onze ataques percussivos gravados e metais staccato gravados em três alturas cada; preset atual de Salvador | `scripts/prepare-samba-reggae-recordings.py` |
| `chicken-classical-v1` | Violino, viola, violoncelo, flauta, flauta doce, cravo flamengo, trompa e tímpanos gravados; presets de Leipzig e Vienna | `scripts/prepare-classical-recordings.py` |
| `chicken-band-v1` | Piano Steinway B, sax tenor sem vibrato e marimba; multisamples em duas dinâmicas | `scripts/prepare-band-recordings.py` |
| `chicken-percussion-v1` | 14 instrumentos/ataques acústicos, duas tomadas por som, incluindo bumbo, ride, caixa, hats, conga, bongô e shaker | `scripts/prepare-band-recordings.py` + `scripts/prepare-acoustic-extras.py` |
| `chicken-guitars-v1` | Hollowbody limpa/staccato e baixo dedilhado com duas tomadas; nylon em seis alturas | `scripts/prepare-guitar-recordings.py` + `scripts/prepare-acoustic-extras.py` |

Para regenerar os quatro bancos novos: `python3 scripts/generate-timbre-samples.py`. O gerador usa apenas a biblioteca padrão do Python e sementes fixas. Esses sons são esboços sintetizados, não multisamples de instrumentos acústicos; escuta e balanço em aparelho físico ainda são necessários.

Para preparar o banco atual de Salvador: `python3 scripts/prepare-samba-reggae-recordings.py` após instalar as dependências de desenvolvimento. O manifesto de URLs, IDs e nomes originais está no próprio script. Trompete e trombone usam três alturas de gravações staccato cada; todos os arquivos são reduzidos a mono, 24 kHz, PCM 16-bit e têm ataque/cauda aparados. A fonte [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) fornece trompete e trombone tenor, gravados por Sam Gossner e Simon Dalzell; a [Versilian Community Sample Library](https://github.com/sgossner/VCSL) fornece caixa, tarol, quinto, agogôs e chocalho. O pacote [Samba Percussion de plotzki](https://freesound.org/people/plotzki/packs/2301/) fornece surdo, repinique e pandeiro. As três fontes são [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). O script recorta um ataque isolado de cada prévia pública em alta qualidade do Freesound; `@audio/decode-mp3` serve apenas à preparação dos arquivos, não ao áudio do jogo. A preservação da origem é informativa, não uma exigência de atribuição.

Os papéis de surdo, repinique e pandeiro agora usam gravações desses instrumentos. O papel de timbau ainda usa um quinto gravado como aproximação; a escuta e a afinação em aparelho físico continuam necessárias para avaliar a fidelidade final. Os padrões complementares das 16 vozes continuam em `lib/music/kit-profiles/salvador-1992.ts`. O banco anterior pode ser regenerado com `python3 scripts/generate-samba-reggae-samples.py`.

Para preparar os kits de Classical Music, rode `python3 scripts/prepare-classical-recordings.py`. O manifesto fixa as revisões CC0 da [VCSL](https://github.com/sgossner/VCSL) e da [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) e lista cada arquivo de origem. O script reduz as gravações a trechos mono de 24 kHz, PCM 16-bit; as variantes preservam camadas dinâmicas e tomadas alternativas. Os perfis escolhem a articulação e a variante para cada papel e seção. O banco é carregado sob demanda e os perfis de Leipzig 1723 e Vienna 1825 distribuem as articulações entre as 16 vozes com ganhos, filtros e panoramas próprios.

## Gravações da revisão de 01/10

Preparação, nesta ordem: `python3 scripts/prepare-band-recordings.py`, `python3 scripts/prepare-guitar-recordings.py`, `python3 scripts/prepare-acoustic-extras.py`. Use Python 3.10–3.12; os dois primeiros usam biblioteca padrão (`audioop` foi removido em 3.13). O terceiro precisa de `soundfile` para ler FLAC das fontes; o jogo reproduz apenas os WAVs preparados, sem essas dependências. Cada manifesto registra revisão imutável, URL original, SHA256 original e SHA256 do resultado. O manifesto principal descreve a primeira etapa; `extras-manifest.json` descreve os arquivos acrescentados/substituídos na última, que deve ser executada depois.

Band e os ataques iniciais de Percussion vêm da [VCSL](https://github.com/sgossner/VCSL), revisão `c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e`. Guitarra e baixo vêm de [Karoryfer Black and Green Guitars](https://github.com/sfzinstruments/karoryfer.black-and-green-guitars) e [Big Little Bass](https://github.com/sfzinstruments/karoryfer.big-little-bass). Nylon vem de [Freepats Spanish Classical Guitar](https://github.com/freepats/spanish-classical-guitar); bumbo e ride finais vêm de [Virtuosity Drums](https://github.com/sfzinstruments/virtuosity_drums). As fontes são CC0, não recortes de canções comerciais.

Convenções de oitava foram conferidas por espectro: piano mantém o nome; sax e marimba soam uma oitava acima do nome VCSL; baixo soa uma abaixo do nome Karoryfer. A guitarra elétrica foi conferida também no mapa SFZ (E3 da fonte = MIDI 40, E2 sonoro). O registro usa a altura sonora sem renomear os arquivos do manifesto. URLs escapam `#`; as chaves de nota como `f#4` permanecem notas, não URLs. A variante de nylon contém uma gravação por altura, não duas tomadas artificialmente duplicadas.

O catálogo de 13 bancos referencia cerca de 14,18 MB de PCM; novos bancos têm orçamentos separados de 2 MB (Band), 2,2 MB (Guitars) e 1 MB (Percussion). São carregados por fonte/variante em uso, não todos juntos. Timbau, acordeão, violão de aço, vassourinhas e outras aproximações remanescentes ainda requerem curadoria própria. WAV válido e mapa afinado não garantem fidelidade estética nem desempenho mobile.
