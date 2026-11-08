# Revisão dos kits — 01/10/2026

## Resultado e limite da revisão

Os 46 presets foram auditados com as 16 brancas ativas e todas as seis cenas, consultando o bundle real do Strudel. A implementação amplia instrumentação, forma e variação controlada; não constitui aprovação por escuta perceptiva de todos os kits. A avaliação estética de gênero e o desempenho em aparelho físico continuam pendentes. A coleção é de composições originais orientadas por estilos, não reproduções das músicas citadas.

## Achados e mudanças

| Achado verificável | Mudança aplicada | Limite restante |
| --- | --- | --- |
| Quatro bancos de frases, algumas partes com a mesma célula repetida | Seis cenas A–F; E de quatro compassos com espaços/respostas, F de oito compassos com retomada; Manchester tem motivos e grooves E/F próprios | Bases rítmicas podem repetir de propósito; seis cenas não significam seis células exclusivas em cada bumbo |
| Centro harmônico único por seção, com pouco movimento dentro dela | Percursos de quatro fundamentais por compasso em E/F dos 45 perfis de piano roll, compartilhados por baixo/melodia/acordes | Os percursos são direção de arranjo; adequação cultural fina e condução melódica exigem escuta |
| Pianos, sax, guitarras, baixos e várias percussões ainda eram aproximações sintetizadas | Três bancos CC0 com gravações, mapas de várias alturas, camadas dinâmicas e tomadas alternativas; trocas compatíveis nos presets | Órgão/Rhodes/clav/steel/accordion e alguns papéis regionais continuam aproximações |
| Diferenças de convenção de oitava nas fontes novas | Espectro conferido: sax/marimba com mapa uma oitava acima do nome da fonte; baixo uma abaixo; guitarra elétrica conferida também no SFZ | Essa conferência não é um teste de afinação centesimal de cada nota/articulação |
| Nomes de WAV com `#` viravam fragmentos de URL | Registro e preload escapam a URL, preservando nota afinada e caminho local | Arquivos antigos e novas fontes seguem registrados |
| Parâmetros fixos não davam pequenas mudanças a cada repetição | Drive/Reverb/Swing com dois limites, um valor por loop inteiro, reentrada distinta e exportação equivalente | Não substituem composição. Swing adicional exagerado pode descaracterizar levadas já swingadas |

## Prioridades para escuta

1. Rock/punk/southern rock: conferir ataque e peso da hollowbody com Drive; uma guitarra limpa saturada não equivale automaticamente a uma guitarra de rock gravada com amp/palm-mute. O baixo novo é dedilhado, não uma gravação de palheta.
2. Jazz/Manchester/blues: conferir legato, articulação das respostas, densidade das teclas e relação entre sax e trompete. O sax gravado é tenor, não barítono/clarinete; o Rhodes FM permanece sintético.
3. Folk/bossa/choro/sertanejo: conferir nylon, espaços e protagonismo das melodias. Violão de aço e acordeão ainda são sínteses. Papéis explicitamente chamados de pandeiro usam a gravação de pandeiro, não a pandeireta genérica.
4. World rhythms: conferir instrumentos regionais antes de aprovar autenticidade. Uma síntese genérica de tambor não foi substituída indiscriminadamente por um tímpano orquestral. Zabumba, timbau, certas flautas e percussões de mão ainda precisam de fontes específicas.
5. Eletrônicos/disco/kwaito: conferir kick/baixo, espaço dos hats e transições E/F. Fontes sintéticas foram mantidas quando fazem parte da paleta; “acústico” não é uma melhoria universal.
6. Classical: conferir o balanço e a naturalidade dos ataques/caudas, sobretudo quando várias cordas sustentam acordes. Mapas gravados não garantem fraseado de arco natural.

## Reprodução da auditoria

`node scripts/review-kits.cjs --serve` gera `.artifacts/music-review-2026-10-01/catalog.json` e um JSON por cidade, depois abre uma ponte local em `http://127.0.0.1:3011`. `--serve-only` reutiliza os dados existentes. Os arquivos incluem fontes, contagem de ataques, bancos distintos por voz, presença A–F, duração e código de 16/32 peças. Não editam kits salvos. A porta pode ser definida por `MUSIC_REVIEW_PORT`.

O cliente `scripts/render-kit-review.js` usa `renderPatternAudio` do Strudel instalado e `OfflineAudioContext`, com o áudio Superdough verdadeiro. Renderiza a forma completa em PCM estéreo de 24 kHz, mede pico/RMS/amostras fora de ±1 e registra erros de samples/DSP. `white` é a banda normal de 16 papéis; `all` ativa as 32 peças espelhadas como teste de estresse, sem remover pausas de arranjo. A renderização pode demorar vários minutos por kit neste ambiente; artefatos completos só devem ser contados quando `status` confirmar término, não quando foram colocados na fila.

O limite de polifonia offline é maior que a contagem de ataques agendados, pois esse renderer agenda toda a forma antes de avançar o relógio. Não é o limite do runtime ao vivo nem uma aprovação de CPU mobile. Os WAVs não incluem o mixer pós-Strudel por equipe do aplicativo; o snapshot/exportação e seus ganhos são mantidos. Caudas após o fim da forma não são adicionadas à medição. Instrumentos por ataque podem conter ruído natural da gravação.

`npm run test:music` inclui regressões de ranges, seções, exportação, harmonia, migração e versão; `npm run typecheck` verifica os contratos. Passe nesses checks antes de marcar a implementação pronta. Não use o número de testes ou ausência de clipping para dizer que uma música “soa autêntica”.

O teste de playback ao vivo revelou também uma corrida na inicialização do processador de distorção. A engine agora aguarda seu registro para vozes com Drive, mantém notas secas imediatas e descarta notas distorcidas que ficaram antigas durante a espera. Drive zero remove o controle DSP da nota, em vez de criar um processador desnecessário. A regressão verifica espera e cancelamento; o navegador verifica a reprodução efetiva.

Fontes e regeneração dos bancos: `public/samples/README.md`. Mecânica, prioridades e cancelamento: `GAME_MECHANICS.md`. Ideias de novos timbres/arranjos devem continuar na agenda, não ser apresentadas como implementadas.

## Quatro kits Electronic World — 06/11/2026

A primeira revisão de New York 1977, Ibiza 1986, Manchester 1988 (Acid House) e London 1992 (Jungle) foi `2026-11-06-electronic-v3`; as medições abaixo registram essa etapa de seis seções, substituída pela expansão v4 descrita a seguir. A composição e o escopo estão em [Escopo, dados e kits](mechanics/kit-revisions.md#revisão-de-quatro-kits-electronic-world--06112026).

Validação: 81 casos das suítes de kits, padrões, sound design, reações, composição online e release; `npm run typecheck`; `npm run admin:check` (78 catálogos válidos); geração reproduzível dos quatro scripts. O Criativo carregou os quatro presets; o seletor mostrou Acid House/Jungle e a versão v2.0.1.

A renderização de formas completas foi interrompida por custo do grafo offline. A medição concluída usa o Strudel/Superdough instalado, contextos novos por trecho, PCM estéreo de 24 kHz e quatro compassos **do início de cada seção A–F** com as 16 brancas; há também quatro compassos do início de F com 32 peças. São 28 trechos, todos sem erros registrados de samples/DSP e sem amostras fora de ±1:

| Kit | Maior pico entre os seis trechos de 16 peças | Pico do trecho F com 32 peças |
| --- | ---: | ---: |
| New York | −8,8 dBFS | −6,8 dBFS |
| Ibiza | −9,6 dBFS | −7,5 dBFS |
| Manchester | −8,3 dBFS | −6,4 dBFS |
| London | −11,6 dBFS | −9,6 dBFS |

Artefatos locais: `.artifacts/music-review-2026-11-06/`, com `excerpt-results.json`, JSONs de auditoria e WAVs `<cidade>-<A–F>-white.wav` / `<cidade>-F-all.wav`. Os intervalos exatos constam no relatório. A medição não inclui todas as repetições, caudas após cada trecho, reações de partida ou o mixer posterior por equipe; não é uma medição da forma completa, aprovação da qualidade musical por escuta nem teste de desempenho em aparelho físico.


### Expansão para oito seções e Kit Harmony — 06/11/2026

Revisão atual dos quatro presets: `2026-11-06-electronic-v4`. Dois bancos novos por instrumento alimentam Pre-Chorus/Bridge (New York), Hook/Bridge (Ibiza e London) e Bridge/Turnaround (Manchester). As formas têm 88/88/84/88 compassos. Progressões, ordem e contrastes estão no documento de mecânica acima.

Os seis bancos anteriores foram comparados aos perfis v3: somar a fundamental local aos graus convertidos recupera **todas** as notas e marcas originais, incluindo slides, chances, acordes e encerramentos de legato. A regressão em `kits.cases.cjs` consulta eventos reais do compilador Strudel e confere as notas MIDI do baixo nos oito novos trechos, evitando transposição dupla; também confere contraste de densidade e ausência da 303 na Bridge. O Criativo carregou os quatro presets v4, mostrou oito seções por kit, Kit Harmony ativo, os 32 campos de harmonia preenchidos e v2.0.1 no cabeçalho.

Renderização offline: quatro compassos do início de cada nova seção com 16 peças e quatro compassos da nova seção mais intensa com 32 peças. Os 12 resultados finais têm áudio não silencioso, zero erros registrados de samples/DSP e zero amostras fora de ±1. Três tentativas em uma página reutilizada produziram buffers vazios; foram descartadas e refeitas recarregando a página, com contexto limpo. O relatório bruto conserva as tentativas; `excerpt-results.json` contém os resultados finais.

| Kit | Pico do primeiro trecho novo (16) | Pico do segundo trecho novo (16) | Pico do trecho intenso (32) |
| --- | ---: | ---: | ---: |
| New York | −7,8 dBFS | −8,8 dBFS | −5,8 dBFS |
| Ibiza | −9,2 dBFS | −9,6 dBFS | −7,2 dBFS |
| Manchester | −12,2 dBFS | −9,1 dBFS | −7,1 dBFS |
| London | −10,3 dBFS | −12,4 dBFS | −8,4 dBFS |

Artefatos locais em `.artifacts/music-form-review-2026-11-06/`: auditoria da forma inteira, `ui-harmony.json`, `excerpt-results.json`, WAVs e log dos testes. As métricas cobrem os trechos indicados, não todas as repetições/caudas/reações ou desempenho físico. São evidências técnicas, não aprovação musical por escuta.

Validação final da expansão: `npm run typecheck` aprovado; quatro perfis válidos e regeneração idêntica byte a byte; quatro testes de release aprovados. `npm run test:music` executou 314 casos: 313 aprovados e uma expectativa histórica de seis bancos rejeitou corretamente a forma nova. Essa expectativa foi atualizada para conferir a ordem exata de oito bancos nesses quatro kits; a suíte pertinente `ranges.cases.cjs` foi reexecutada com 16/16 aprovados. Não houve alteração de implementação após os outros 313 casos passarem.


## Seis kits Electronic World — segunda rodada de 06/11/2026

Düsseldorf/Krautrock, Chicago/Classic House, Tokyo/Minimal, São Paulo/Hard Techno e Bristol/Trip-hop usam `2026-11-06-electronic-v3`; Goa/Psytrance usa o kit oficial `2026-11-06-design-v3`. São 13 seções novas: duas nos cinco perfis e três em Goa. Forma, harmonia, protagonismo e escopo: [segunda revisão](mechanics/kit-revisions.md#segunda-revisão-electronic-world--06112026).

As seis variações originais de Goa foram comparadas nas 32 vozes: todas as notas, durações e articulações permanecem idênticas. Um hash de regressão conserva essa garantia. Fora da forma e da revisão do catálogo, os dados globais e reações também permanecem iguais. Apenas chimbal fechado/aberto e zap receberam os pequenos cortes de ganho/filtro descritos na mecânica. Em Bristol, a comparação inversa dos graus relativos com os perfis anteriores confirmou as seis frases/articulações do teremim preservadas; parâmetros e efeitos foram mantidos. Os cinco geradores Python reproduzem os perfis byte a byte.

O navegador carregou os seis presets, mostrou os nomes novos, Kit Harmony ativo, oito seções nos cinco perfis e nove em Goa; o cabeçalho exibiu v2.0.1. Os nomes e arranjos foram registrados em `ui.json`.

Áudio offline: quatro compassos do Verse e de cada seção nova com 16 vozes, mais quatro compassos da seção final de cada kit com 32 vozes. Cada trecho foi renderizado em página/contexto limpo com Strudel/Superdough real, PCM estéreo de 24 kHz. Os **25/25 trechos** têm som não silencioso, nenhum erro registrado de samples/DSP e zero amostras fora de ±1.

| Kit | Maior pico entre os trechos de 16 vozes | Pico da seção final com 32 vozes |
| --- | ---: | ---: |
| Düsseldorf | −9,9 dBFS | −7,7 dBFS |
| Chicago | −9,3 dBFS | −7,6 dBFS |
| Tokyo | −13,5 dBFS | −12,1 dBFS |
| São Paulo | −9,6 dBFS | −8,0 dBFS |
| Bristol | −9,3 dBFS | −7,5 dBFS |
| Goa | −12,0 dBFS | −9,2 dBFS |

Artefatos locais: `.artifacts/music-six-review-2026-11-06/`, com JSONs de auditoria da forma inteira, `excerpt-results.json`, WAVs `*-sectionN-white/all.wav`, `ui.json` e logs. Os resultados são validação técnica dos intervalos renderizados, não aprovação musical por escuta, renderização de todas as caudas/reações ou medição em aparelho físico.

Validação final desta rodada: `npm run test:music` **317/317 aprovados**, incluindo consistência da versão; `npm run typecheck` aprovado; `npm run admin:check` com **78 catálogos válidos**; `git diff --check` sem problemas. A versão diária permanece v2.0.1, com os itens acrescentados à mesma entrada de 06/11/2026.


## Reconstrução Classical — 07/11/2026

Os três presets agora são kits oficiais gerados por scripts/build-classical-kits.cjs, com melodias originais em scripts/classical/scores.cjs. Cada kit tem dez seções, oito bancos por voz e períodos de dezesseis compassos, com cordas nos oito peões e madeiras/metais/contínuo ou tímpanos atrás. Forma, tonalidades, presença, reações e escopo estão em [mecânica implementada](mechanics/kit-revisions.md#reconstrução-classical--07112026).

O banco recebeu 42 gravações acústicas CC0 em onze timbres/mapas, com duas dinâmicas de violino e fontes longas de cordas e sopros. Cada arquivo tem origem imutável e SHA256 no manifesto. A checagem de afinação em um representante de cada timbre/mapa confirmou as onze fundamentais em até oito cents da nota registrada. O arquivo pitch-check.json guarda os resultados. O registro de flauta foi corrigido em uma oitava após essa checagem. Os ativos anteriores conservam seus próprios mapas.

Os três kits carregaram no Criativo com dez seções, Kit Harmony, os oito peões de cordas e os instrumentos próprios da fileira de trás. O seletor mostrou Viennese Sinfonietta em Vienna 1780 e o cabeçalho v2.1.0. Os três pares perfil/kit foram regenerados e comparados byte a byte. Os JSONs oficiais ficam abaixo do limite de importação de dois milhões de caracteres, incluindo a formatação de exportação.

A primeira medição mostrou níveis baixos, corrigidos nos três perfis. A renderização técnica final usa Strudel/Superdough real e contextos limpos, PCM estéreo de 24 kHz, com oito compassos de cada banco autoral nas 16 brancas e do tutti nas 32 peças. O tema principal também foi renderizado por dezesseis compassos completos em cada kit. As amostras registram todos os timbres e os trechos solistas em nova renderização após a correção do mapa da flauta.

A suíte completa executou 320 casos, com 318 aprovados. Duas expectativas antigas exigiam seis bancos e um instrumento no modo Sustain por cidade. Foram atualizadas para a forma orquestral de oito bancos/dez seções e para sustentações escritas diretamente em notas longas. Os casos pertinentes foram reexecutados e aprovados, incluindo os seis testes de compasso e o teste do catálogo completo. Após o ajuste de nível, os três testes de orquestra/registro foram aprovados, assim como as suítes de reações, composição online e release. TypeScript, lint dos módulos TypeScript, catálogo Admin e consistência da versão também foram aprovados. A entrada diária continua em v2.1.0.

Artefatos locais em .artifacts/classical-review-2026-11-07/ incluem auditoria da forma inteira, ui.json, pitch-check.json, resultados de renderização, WAVs e logs. As verificações de eventos e níveis não equivalem à aprovação musical por escuta nem à medição de desempenho físico. As gravações são modernas e o sequenciador ainda tem os limites de articulação e duração dos samples documentados na mecânica.


Resultados finais dos 27 intervalos distintos, após os ajustes de nível/afinação: todos têm áudio não silencioso, zero erros de samples/DSP registrados e zero amostras fora de ±1. Oito intervalos de 16 vozes cobrem os oito bancos de cada kit, com o tema principal estendido a 16 compassos, e um intervalo do tutti usa 32 vozes. As tentativas intermediárias continuam no relatório bruto.

| Kit | Maior pico em 16 vozes | Pico do tutti em 32 vozes |
| --- | ---: | ---: |
| leipzig-1723 | -12.8 dBFS | -11.1 dBFS |
| vienna | -14.7 dBFS | -13.3 dBFS |
| vienna-1825 | -14.2 dBFS | -12.7 dBFS |
