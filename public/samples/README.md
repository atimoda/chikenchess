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

Para regenerar os quatro bancos novos: `python3 scripts/generate-timbre-samples.py`. O gerador usa apenas a biblioteca padrão do Python e sementes fixas. Esses sons são esboços sintetizados, não multisamples de instrumentos acústicos; escuta e balanço em aparelho físico ainda são necessários.

Para preparar o banco atual de Salvador: `python3 scripts/prepare-samba-reggae-recordings.py` após instalar as dependências de desenvolvimento. O manifesto de URLs, IDs e nomes originais está no próprio script. Trompete e trombone usam três alturas de gravações staccato cada; todos os arquivos são reduzidos a mono, 24 kHz, PCM 16-bit e têm ataque/cauda aparados. A fonte [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) fornece trompete e trombone tenor, gravados por Sam Gossner e Simon Dalzell; a [Versilian Community Sample Library](https://github.com/sgossner/VCSL) fornece caixa, tarol, quinto, agogôs e chocalho. O pacote [Samba Percussion de plotzki](https://freesound.org/people/plotzki/packs/2301/) fornece surdo, repinique e pandeiro. As três fontes são [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). O script recorta um ataque isolado de cada prévia pública em alta qualidade do Freesound; `@audio/decode-mp3` serve apenas à preparação dos arquivos, não ao áudio do jogo. A preservação da origem é informativa, não uma exigência de atribuição.

Os papéis de surdo, repinique e pandeiro agora usam gravações desses instrumentos. O papel de timbau ainda usa um quinto gravado como aproximação; a escuta e a afinação em aparelho físico continuam necessárias para avaliar a fidelidade final. Os padrões complementares das 16 vozes continuam em `lib/music/kit-profiles/salvador-1992.ts`. O banco anterior pode ser regenerado com `python3 scripts/generate-samba-reggae-samples.py`.

Para preparar os kits de Classical Music, rode `python3 scripts/prepare-classical-recordings.py`. O manifesto fixa as revisões CC0 da [VCSL](https://github.com/sgossner/VCSL) e da [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) e lista cada arquivo de origem. O script reduz as gravações a trechos mono de 24 kHz, PCM 16-bit; as variantes preservam camadas dinâmicas e tomadas alternativas. Os perfis escolhem a articulação e a variante para cada papel e seção. O banco é carregado sob demanda e os perfis de Leipzig 1723 e Vienna 1825 distribuem as articulações entre as 16 vozes com ganhos, filtros e panoramas próprios.
