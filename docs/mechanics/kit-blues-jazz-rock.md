# Kits Blues, Jazz & Rock

Parte da mecânica em funcionamento; índice em [GAME_MECHANICS.md](../../GAME_MECHANICS.md).

### Reconstrução — 12/11/2026

A campanha antes chamada Harmonic songbook passa a se chamar **Blues, Jazz & Rock** (o ID interno `harmonic-songbook` continua, preservando progresso e links). A fase Canterbury 1972 (Progressive pastoral) foi removida; a campanha tem 13 fases. Os nomes de estilo exibidos são só o nome do gênero, sem "/".

As 13 fases foram recompostas do zero no formato dos kits World ballads: kit oficial em `data/music/kits/<id>.json`, gerado por `scripts/blues-jazz-rock/<id>.cjs` sobre `scripts/blues-jazz-rock/common.cjs` (que estende `scripts/ballads/lib.cjs`). Todas usam escala Chromatic com Kit Harmony (uma fundamental por compasso; temas escritos por cifra e convertidos para graus relativos à fundamental), forma com Intro e Outro, som por seção, som por nota (vibrato, slide, tremolo, acentos, drive), fills no banco 7 e Estados e Eventos próprios. As seções de jazz e blues usam swing real (grade de 48 subdivisões por tempo); os kits de rock ficam retos. Cópias salvas da revisão anterior são trocadas pelo kit novo ao abrir a fase (revisões `<id>-2026-11-12-bjr-v1` em `CITY_STYLE_REVISIONS`).

| Fase | Estilo | Base | Forma (compassos) | Timbres característicos |
| --- | --- | --- | --- | --- |
| 1958 Chicago | Electric blues | 4/4, 112 BPM, Lá, swing de tercina | Intro · blues de 12 ×2 (o primeiro em stop-time) · solo de gaita · solo de guitarra · Break de slide · Verse · Outro com turnaround (80) | Guitarra tweed saturada, gaita amplificada, slide crunch, piano de Chicago, baixo acústico |
| 1930 New York | Swing | 4/4, 152 BPM, Fá | AABA de 32 · solos de 16 · Break · shout chorus · Outro (96) | Naipe de trompetes, clarinete, trombone, sax tenor, piano stride, guitarra rítmica abafada, bateria com temple blocks |
| 1945 Paris | Gypsy jazz | 4/4, 184 BPM, Lá menor | AABA · solos de 16 · Interlude de acordeão musette · Outro (88) | La pompe em duas guitarras, guitarra solo, violino, clarinete, acordeão, contrabaixo em slap |
| 1959 Oakland | Cool jazz | 5/4 (3+2), 160 BPM, Mi | AABA · solos de 12 · Break · Outro (80) | Ostinato de baixo e vamp de piano em 3+2, sax tenor suave, vibrafone (celesta com tremolo de ganho), flauta, trompete com surdina, guitarra jazz, vassourinhas |
| 1962 New York | Jazz waltz | 3/4, 138 BPM, Ré | Intro · AABA · solos de piano, guitarra/tenor e contrabaixo · Verse · Outro (112) | Piano em diálogo, contrabaixo que caminha nos três tempos e sola, sax tenor, guitarra jazz, vassourinhas |
| 1961 New York | Doo-wop | 4/4, 128 BPM, Lá, shuffle | Intro · AABA · solo de sax · Break · último Verse e Outro um semitom acima (68) | Grupo vocal ("ooh", "doo-wah", "aah"), baixo vocal "bom", falsete, piano em tercinas, sax tenor honk, estalos de dedo |
| 1970 London | Piano pop | 4/4, 72 BPM, Mi♭ | Verse/Chorus ×3 com Bridge (56) | Piano melódico com acompanhamento rolante, cordas, violoncelo, trompa, violão de nylon, tímpanos |
| 1973 Cambridge | Progressive rock | 7/4, 118 BPM, Mi | Intro · Verse ×2 · Chorus · solos de guitarra e órgão · Break · Chorus · Outro (64) | Riff de baixo em sete, Mellotron (flauta e cordas), parede de fuzz, guitarra lead, Hammond, Rhodes, sequência de sintetizador, gongo |
| 1974 Jacksonville | Southern rock | 4/4, 98 BPM, Ré mixolídio, swing leve | Verse/Chorus · solo twin de 16 · solo de piano honky-tonk · Chorus · Outro (76) | Duas guitarras lead em terças, slide tweed, base crunch, piano honky-tonk, órgão, vocais de apoio |
| 1999 San Diego | Pop punk | 4/4, 164 BPM, Ré | Verse com palm mute · Pre-Chorus · Chorus com power chords · Solo · Bridge limpa · Chorus duplo (80) | Palm mute high gain, power chords, baixo valvulado em colcheias, guitarra em oitavas, gang vocals, bateria skate |
| 1993 San Francisco | Folk rock | 4/4, 132 BPM, Dó | Verse/Chorus · solo de bandolim · Bridge de acordeão · Chorus duplo (72) | Guitarra de 12 cordas jangle, bandolim em tremolo, violão de nylon, órgão, piano, harmonias vocais |
| 2004 Berkeley | Alternative rock | 4/4, 84 BPM, Fá menor | Verse/Chorus · Solo · Bridge · Chorus (64) | Guitarra limpa com tremolo, parede de fuzz e distorção abertas em estéreo, guitarra lead, feedback, violoncelo, vozes |
| 2013 Columbus | Indie pop | 4/4, 124 BPM, Dó | Verse · Pre-Chorus · Chorus · Drop de sintetizador · Bridge de piano · Chorus (72) | Ukulele (cavaquinho) em batida de ilha, glockenspiel, lead wavetable, sub, bateria 808/909 com break, gritos "oh", palmas |

**Guitarras.** As guitarras elétricas vêm do banco `chicken-amps-v1`: gravações reais em linha (CC0) processadas offline por modelos de amplificador e caixa, com um timbre por estilo — tweed no blues e no slide, crunch e lead no southern rock, high gain com palm mute e power chords no pop punk, fuzz no rock progressivo e alternativo, 12 cordas jangle no folk rock e limpa com chorus/tremolo no rock alternativo. Jazz e gypsy jazz usam a hollowbody limpa/abafada de `chicken-guitars-v1`.

**Vozes.** O banco `chicken-voices-v1` é sintetizado (modelo fonte-filtro com formantes fixos), não gravado; é usado no doo-wop e em vocais de apoio de outras fases. A fidelidade final depende de escuta em aparelho físico.

**Kit Harmony com até 16 fundamentais.** Uma seção aceita até 16 graus de harmonia (antes 8), para caber um blues de 12 ou uma forma de 16 compassos numa seção; o campo Harmony da aba de arranjo aceita os mesmos 16 graus. Vale para todos os modos.

**Verificação.** `node scripts/ballads/check.cjs <id>` compila a forma inteira e lista eventos e tessitura por voz (aceita 3/4, 5/4 e 7/4). Os testes de padrões não substituem a escuta.
