# Kits Africa Cult e World — formato por seção (12/11/2026)

Os 12 kits da campanha Africa Cult e os 17 da campanha World são kits oficiais no formato por seção, o mesmo da campanha Brazilian ([kit-brazilian.md](kit-brazilian.md)): cada fase é escrita por `scripts/africa/<fase>.cjs` ou `scripts/world/<fase>.cjs` sobre a biblioteca `scripts/brazilian/lib.cjs`, que grava `data/music/kits/<fase>.json` e o perfil `data/music/profiles/<fase>.json`. As revisões em `CITY_STYLE_REVISIONS` terminam em `2026-11-12-africa-v1` e `2026-11-12-world-v1`; um kit salvo com revisão anterior é trocado pelo novo ao abrir a fase ou o Criativo. Os dois times tocam os mesmos instrumentos. Todo o material é original: os estilos são referência de forma e timbre, sem citar canções.

## O que vale para todos

- **Forma**: nove seções, na ordem Intro · Verse · Chorus · Interlude · Verse · Break · Solo · Chorus · Outro, com bancos globais 0–6 (a reprise reusa o banco) e o banco 7 para viradas. O **Interlude** é sempre a seção suave e o **Break** a tensa.
- **Introdução gradual**: a seção Intro começa com um instrumento sozinho (o que abre o estilo: a tama, o guembri, a mbira, o tres, a gaita, o ugal, a concha) e os demais entram um a um; a melodia do refrão fica guardada para o Chorus.
- **Percussão de mão**: cada tambor tem golpes de alturas e forças diferentes em peças separadas (grave, tapa, toque abafado, virada), com a grade X x m o h g, variação semeada de tempo e dinâmica e filtro por nota (golpe fraco mais escuro). Pratos, chimbais, pandeiretas e ferros ficam baixos (em torno de −47 dB no trecho medido) para não soarem estridentes; os graves ficam entre −33 e −37 dB.
- **Vozes calibradas** (`V` e `Q` em `scripts/brazilian/lib.cjs`): cada timbre tem ganho, envelope e filtros de partida já medidos; a fase só informa o que muda (ganho, oitava, pan). A lista inclui a percussão acústica e de máquina, cordas, sopros, vozes e os timbres regionais (zabumba, surdo, repique, gonguê, tam-tam, cavaquinho, bandolim, celesta, guitarra com slide, fagote).
- **Kit Harmony**: raiz do acorde por compasso em cada seção. Gamelan, Manikay e Haka usam uma única raiz do começo ao fim, porque o movimento está na melodia central ou no bordão, não em acordes.
- **Grooves longos**: uma grade de percussão de até 4 compassos se repete na seção; uma grade mais longa (por exemplo, um solo de tambor de 8 compassos) é tocada inteira e precisa dividir a duração da seção.
- **Compassos**: 5/8 (3+2) com seções de até 12 compassos e 7/8 (3+2+2) e 9/8 (2+2+2+3) dentro do limite de 64 tempos por seção; 6/8 e 12/8 com BPM na semínima pontuada.
- **Reações**: as mesmas 14 regras dos kits Brazilian (refrão no primeiro roque, breque no xeque, lamento ao perder a dama, seção tensa na virada de avaliação, Outro no mate).
- **Volumes**: medidos em Verse e Chorus com `scripts/brazilian/stems.cjs` e ajustados com `scripts/brazilian/regain.cjs`; a mixagem de todas as fases fica entre −28 e −31 dB ativos. Medição não substitui escuta em aparelho.

## Africa Cult

| Fase | Compasso, BPM, tom | Abertura | Seção suave | Seção tensa |
| --- | --- | --- | --- | --- |
| Lagos 1975 · Afrobeat | 4/4, 115, Sol dórico | instrumentos um a um | órgão, baixo em meio tempo, shekere e congas | metais e bateria em ataques uníssonos (Ré menor) |
| Luanda 1965 · Semba | 4/4, 108, Sol maior | violão | lamento em Mi menor, voz e um violão | rebita em Lá menor, palmas e ngomas dobrando |
| Kinshasa 1978 · Soukous | 4/4, 126, Dó maior | rumba, um a um | saxofone sobre dois violões (Lá menor) | animação: a banda ataca em Sol, tons e gritos |
| Kisumu 1980 · Benga | 4/4, 130, Lá maior | nyatiti | orutu sobre a figura do nyatiti (Fá# menor) | a banda martela em Mi |
| Maputo 1978 · Marrabenta | 4/4, 124, Dó maior | violão | violão ponteado e voz, só bongôs (Lá menor) | xigubo: tambores e palmas em Sol |
| Lagos 1982 · Jùjú | 4/4, 110, Sol maior | chamada do tambor falante | pedal steel sobre dois violões (Mi menor) | conversa do tambor falante com os tambores de mão |
| Gaza 1987 · Majika | 4/4, 126, Ré maior | timbila | timbila, voz e baixo em meio tempo | xigubu: tambores sozinhos com ataques dos metais |
| Dakar 1985 · Mbalax | 4/4, 112, Mi menor | chamada da tama | teclado, voz e sabar grave | bakk: tambores e banda em uníssono |
| Harare 1981 · Chimurenga | 12/8, 118, Sol maior | mbira sozinha | mbiras, hosho e voz | hosho e tambores com ataques da banda |
| Essaouira 1980 · Gnawa | 12/8, 118, Dó menor | guembri sozinho | guembri, maâlem e bordão de vozes | procissão: tbel e canto uníssono |
| Luanda 1982 · Kizomba | 4/4, 94, Ré menor | pad e violão, depois a máquina peça a peça | piano elétrico, voz e cabasa | a batida cai para bumbo e aro |
| Luanda 1996 · Kuduro | 4/4, 138, Si menor | riff e cowbell, bumbo abafado | pad, riff e bumbo em meio tempo | corte: bumbo, rufos de caixa e gritos |

O que mudou em relação aos kits anteriores: os tambores passaram a ter golpes diferentes em peças próprias (toque aberto, tapa, grave e virada) em vez de um golpe repetido, e os qraqeb do Gnawa, os chimbais e as pandeiretas ficaram mais escuros e mais baixos. As descrições de Semba e Marrabenta no mapa passaram a citar o que o kit toca (ngomas; saxofone tenor).

## World

| Fase | Compasso, BPM, tom | Abertura | Seção suave | Seção tensa |
| --- | --- | --- | --- | --- |
| Kingston 1973 · Roots reggae | 4/4, 76, Lá menor | rufo e tema dos metais | dub: baixo, bateria e órgão no eco | steppers: bumbo em todos os tempos |
| Istanbul 1970 · Anatolian rock | 5/8, 210, Ré menor | bağlama, depois darbuka | bağlama, clarinete e def | a banda ataca o três e o dois sob o órgão |
| Kalamata 1930 · Kalamatianos | 7/8, 210, Ré maior | taximi do klarino | voz, santouri e laouto | todos marcam os três passos |
| Santiago del Estero 1960 · Chacarera | 6/8, 102, Lá menor | violão | violão ponteado, voz e bandoneón | zapateo: bombo, tacos e palmas |
| Jerez de la Frontera 1970 · Flamenco | 12/8, 80, Lá frígio | falseta, depois palmas | arpejos e o quejío | escobilla: tacos e palmas |
| Havana 1950 · Son cubano | 4/4, 96, Ré harmônica menor | tres e clave | tres, voz, clave e maracas | mambo: riffs de trompete e breques |
| Barranquilla 1960 · Cumbia | 4/4, 92, Lá menor | gaita e tambores | acordeão, voz, llamador e maracas | tambores sozinhos com os gritos da gaita |
| Guča 1975 · Čoček | 9/8, 132, Ré frígio dominante | tapan, depois helikon | saxofone sobre trompas seguras | a banda ataca os quatro grupos |
| Cairo 1960 · Baladi | 4/4, 100, Ré frígio dominante (hijaz) | taqsim do oud sobre o nay | nay sobre um bordão | solo de tabla em chamadas e respostas |
| Amritsar 1980 · Bhangra | 4/4, 96 (suingado), Sol mixolídio | tumbi, chimta, depois o dhol | sarangi e harmônio | solo de dhol e gritos |
| Ubud 1935 · Gamelan | 4/4, 120, Mi frígio (cinco notas, perto do pelog selisir) | ugal sozinho | suling e rebab sobre o pokok lento | kebyar: ataques uníssonos e silêncios |
| Lima 1975 · Festejo | 12/8, 108, Lá menor | violão, cajita e quijada | lamento | fuga com breques do cajón |
| Yirrkala 1960 · Manikay | 4/4, 108, Ré dórico | bilma e voz murmurada | murmúrio sobre o bordão grave | bilma, pés e chamados |
| Papeete 1960 · Ōte'a | 4/4, 132, Dó maior | concha e o sinal do tō'ere | vivo, ukulele e vozes | paradas em uníssono |
| Honolulu 1935 · Hula | 4/4, 88 (suingado), Dó maior | pahu, ipu e ukulele | steel guitar lenta sobre vozes | implementos dos dançarinos e paradas |
| Rotorua 1920 · Haka | 4/4, 100, Ré menor | pūtātara e o chamado do kaea | kōauau, poi e vozes | só pés e mãos |
| Port Moresby 1970 · String band | 4/4, 116, Sol maior | violão solo e ukulele | vozes murmuradas e violão lento | garamut, bambu e kundu |

**Estudos de forma, sem repertório tradicional**: Manikay (Yirrkala) e Haka (Rotorua) representam tradições com dono e protocolo. Os dois kits são estudos originais da forma (voz, bilma e yidaki; kaea e grupo em chamada e resposta com o corpo como percussão) e não usam canções, textos, melodias de clãs nem haka existentes. As vozes do jogo não têm palavras.

**Aproximações de timbre**: não há gravações de todos os instrumentos; os mais próximos do banco são usados e nomeados pelo instrumento do estilo. Entre outros: yidaki (fagote grave com corte de filtro por nota, apitos na trompa), tō'ere e bambu (marimba curta e filtrada), bronzes do gamelan (celesta e sino FM; jegogan na marimba grave; gong no tam-tam), bağlama, tres e tumbi (violão de aço), oud e laouto (violão de nylon), qanun e santouri (cravo), nay, suling e vivo (flauta), algoza e kōauau (flauta doce), harmônio e melódica (acordeão), ukulele (cavaquinho), steel guitar (guitarra com slide), helikon (trombone grave), mbira e timbila (marimba), tambor falante (conga afinada por nota).

**Instrumentos por fase nova (World)**:
- Jerez 1970: a1 Guitarra · bordones, a2 Tacón, b1 Guitarra · rasgueo, b2 Palmas sordas, c1 Cante, c2 Palmas claras, d1 Guitarra · falseta, d2 Nudillos, e1 Coro, e2 Pitos, f1 Segunda guitarra, f2 Golpe, g1 Quejío, g2 Jaleo, h1 Guitarra · alzapúa, h2 Tacón · planta.
- Havana 1950: a1 Contrabajo, a2 Tumbadora, b1 Tres, b2 Claves, c1 Sonero, c2 Bongó, d1 Trompeta, d2 Maracas, e1 Coro, e2 Campana, f1 Coro · segunda, f2 Tumbadora · tapado, g1 Trompeta segunda, g2 Güiro, h1 Piano, h2 Timbal.
- Barranquilla 1960: a1 Bajo, a2 Tambora, b1 Clarinete, b2 Llamador, c1 Acordeón, c2 Guacharaca, d1 Voz, d2 Maracas, e1 Coro, e2 Tambor alegre, f1 Gaita, f2 Tambora · paloteo, g1 Saxofones, g2 Palmas, h1 Guitarra, h2 Tambora · repique.
- Guča 1975: a1 Helikon, a2 Tapan, b1 Truba, b2 Tapan · prut, c1 Tenor horne, c2 Doboš, d1 Druga truba, d2 Činele, e1 Saksofon, e2 Hop!, f1 Bas truba, f2 Daire, g1 Treća truba, g2 Doboš · rub, h1 Tenor horne · druga, h2 Tapan · prelaz.
- Cairo 1960: a1 Kontrabas, a2 Tabla · doum, b1 Oud, b2 Tabla · tek, c1 Qanun, c2 Riq, d1 Mutriba, d2 Daff, e1 Koro, e2 Sagat, f1 Kamanjat, f2 Tabla · ka, g1 Akkordion, g2 Dohola, h1 Nay, h2 Tabla · sarba.
- Amritsar 1980: a1 Bass, a2 Dhol · dagga, b1 Tumbi, b2 Dhol · tilli, c1 Harmonium, c2 Chimta, d1 Gayak, d2 Dholki, e1 Toli, e2 Taali, f1 Algoza, f2 Dholki · thap, g1 Sarangi, g2 Hoi!, h1 Bulbul tarang, h2 Dhol · tod.
- Ubud 1935: a1 Jegogan, a2 Gong ageng, b1 Ugal, b2 Kempli, c1 Gangsa · polos, c2 Kendang wadon, d1 Suling, d2 Kendang lanang, e1 Gangsa · sangsih, e2 Ceng-ceng, f1 Calung, f2 Kempur, g1 Reyong, g2 Klentong, h1 Rebab, h2 Kendang · angsel.
- Lima 1975: a1 Bajo, a2 Cajón · grave, b1 Guitarra · punteo, b2 Cajón · agudo, c1 Guitarra · bordón, c2 Cajita, d1 Cantante, d2 Quijada, e1 Coro, e2 Palmas, f1 Guitarra · rasgueo, f2 Cencerro, g1 Coro · segunda, g2 Congas, h1 Coro · lamento, h2 Cajón · repique.
- Yirrkala 1960: a1 Yidaki, a2 Bilma, b1 Songman, b2 Bilma · second pair, c1 Yidaki · hoot, c2 Feet, d1 Second singer, d2 Hands, e1 Group, e2 Thighs, f1 Yidaki · overtone, f2 Calls, g1 High voices, g2 Bilma · roll, h1 Humming, h2 Feet · stamp.
- Papeete 1960: a1 Pahu tupa'i, a2 Tō'ere tāmau, b1 Tō'ere arata'i, b2 Fa'atete, c1 Tō'ere · second, c2 Pahu rima, d1 Vivo, d2 Tō'ere · small, e1 Pū, e2 'Ofe, f1 Tō'ere · great, f2 Shouts, g1 Ukulele, g2 Fa'atete · roll, h1 Voices, h2 Pahu · final.
- Honolulu 1935: a1 Bass, a2 Ipu · thump, b1 Steel guitar, b2 Ipu · slap, c1 Ukulele, c2 'Uli'uli, d1 Singer, d2 Pū'ili, e1 Harmony, e2 'Ili'ili, f1 Guitar, f2 Kāla'au, g1 Low harmony, g2 Pahu, h1 Humming, h2 Ipu · turn.
- Rotorua 1920: a1 Rōpū · low, a2 Waewae, b1 Kaea, b2 Thighs, c1 Rōpū, c2 Chest, d1 Rōpū · wāhine, d2 Hands, e1 Pūtātara, e2 Forearms, f1 Kōauau, f2 Hī!, g1 Humming, g2 Poi, h1 Pūkāea, h2 Waewae · last.
- Port Moresby 1970: a1 Bamboo band, a2 Kundu, b1 Lead guitar, b2 Shell rattle, c1 Ukulele, c2 Bamboo · sandal, d1 Singer, d2 Sticks, e1 High harmony, e2 Hand claps, f1 Rhythm guitar, f2 Coconut shells, g1 Low harmony, g2 Garamut, h1 Humming, h2 Kundu · turn.
