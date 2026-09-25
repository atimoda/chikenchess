# Bancos de samples ChickenChess

Os arquivos WAV desta pasta são sínteses originais CC0, sem recortes de gravações comerciais. Cada banco é mono, PCM 16-bit e carregado sob demanda pelo kit ativo. As notas fundamentais para os sons afinados constam em `lib/music/sample-banks.ts`.

| Banco | Característica | Gerador |
| --- | --- | --- |
| `chicken-electro-v1` | Bateria eletrônica curta e sino | `scripts/generate-samples.py` |
| `chicken-jazz-v1` | Sopros, baixo, teclas e bateria da primeira coleção | `scripts/generate-jazz-samples.py` |
| `chicken-world-v1` | Flauta, marimba, cordas, violão e percussão | `scripts/generate-world-samples.py` |
| `chicken-strings-v1` | Cordas dedilhadas, guitarra elétrica, baixos, violino, cello e pizzicato | `scripts/generate-timbre-samples.py` |
| `chicken-keys-v1` | Pianos, Rhodes FM, órgão drawbar, clav, celesta e acordeão | `scripts/generate-timbre-samples.py` |
| `chicken-synths-v1` | Baixo ácido com varredura, pad desafinado, sino FM, wavetable, sub e coro formante | `scripts/generate-timbre-samples.py` |
| `chicken-drums-v1` | Bumbo/caixa acústicos, vassourinha, palmas de sala, rim, pandeiro e ride | `scripts/generate-timbre-samples.py` |

Para regenerar os quatro bancos novos: `python3 scripts/generate-timbre-samples.py`. O gerador usa apenas a biblioteca padrão do Python e sementes fixas. Esses sons são esboços sintetizados, não multisamples de instrumentos acústicos; escuta e balanço em aparelho físico ainda são necessários.
