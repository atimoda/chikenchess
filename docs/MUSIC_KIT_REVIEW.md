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
