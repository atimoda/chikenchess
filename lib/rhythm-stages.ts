import type { CampaignId } from './campaigns'
import type { CreativeSession } from './music/creative'
import type { Meter } from './music/meter'

/** Dates set the scene for original studies; they are not claimed premieres. */
export interface RhythmStage {
  id: string; name: string; country: string; year: number; genre: string; meter: Meter; bpm: number
  root: CreativeSession['root']; scale: CreativeSession['scale']; campaign: CampaignId
  lat: number; lng: number; color: string; description: string
}
type Row = [string, string, string, number, string, Meter, number, RhythmStage['root'], RhythmStage['scale'], CampaignId, number, number, string, string]
const rows: Row[] = [
  ['rio-1930','Rio de Janeiro','Brazil',1930,'Samba','2/4',104,'C','Maior','brazilian',-22.9068,-43.1729,'#edb75c','A two-beat surdo foundation meets syncopated strings and answering percussion in an original samba study.'],
  ['rio-1910','Rio de Janeiro','Brazil',1910,'Choro','2/4',112,'D','Maior','brazilian',-22.9068,-43.1729,'#81d8bc','Nimble flute phrases trade places with a descending guitar bass and short chord replies.'],
  ['recife-1935','Recife','Brazil',1935,'Frevo','2/4',152,'F','Maior','brazilian',-8.0476,-34.877,'#ef795e','Brass calls and marching snare figures propel a bright, compact carnival ensemble.'],
  ['recife-1950','Recife','Brazil',1950,'Baião / pé de serra','2/4',108,'G','Mixolídia','brazilian',-8.0476,-34.877,'#e5c36f','Accordion phrases ride a two-beat low-drum pattern, with dry offbeat percussion and a dancing bass.'],
  ['piracicaba-1940','Piracicaba','Brazil',1940,'Sertanejo de raiz / cateretê','2/4',100,'G','Maior','brazilian',-22.7253,-47.6492,'#c99a6b','Bright plucked strings and paired melodic voices answer a spare rural dance pulse.'],
  ['rio-1960','Rio de Janeiro','Brazil',1960,'Bossa nova','4/4',116,'F','Maior','brazilian',-22.9068,-43.1729,'#80c9d2','Soft nylon-string syncopations, restrained percussion and extended chords leave room around the melody.'],
  ['new-york-1962','New York City','USA',1962,'Jazz waltz','3/4',138,'D','Dórica','harmonic-songbook',40.7128,-74.006,'#bd9de0','A walking three-beat bass supports brushed accents, piano chords and a reed conversation.'],
  ['london-1977','London','UK',1977,'Rock ballad in six','6/8',72,'D','Maior','world-ballads',51.5074,-0.1278,'#d698ad','Two broad pulses carry piano triplets, guitar answers and a growing arena-style refrain.'],
  ['memphis-1967','Memphis','USA',1967,'Soul ballad','12/8',68,'F','Maior','world-ballads',35.1495,-90.049,'#de9b71','Triplet piano and organ support a warm bass, a patient backbeat and brief horn replies.'],
  ['kingston-1973','Kingston','Jamaica',1973,'Roots reggae','4/4',76,'A','Menor natural','world-rhythms',17.9712,-76.7936,'#b7d56c','Offbeat guitar chops surround a spacious one-drop drum pattern and a mobile bass line.'],
  ['leipzig-1723','Leipzig','Germany',1723,'Baroque pastoral','9/8',76,'G','Maior','classical',51.3397,12.3731,'#d7c296','Three ternary pulses carry an original pastoral dialogue between strings, flute and plucked continuo.'],
  ['vienna-1825','Vienna','Austria',1825,'Orchestral alla breve','2/2',108,'C','Maior','classical',48.2082,16.3738,'#bcbce5','Two half-note pulses support running strings, wind answers and broad orchestral cadences.'],
  ['oakland-1959','Oakland','USA',1959,'Jazz in five','5/4',152,'E','Dórica','harmonic-songbook',37.8044,-122.2712,'#79b9cd','A three-plus-two piano vamp opens space for a reed melody and an independent drum reply.'],
  ['canterbury-1972','Canterbury','UK',1972,'Progressive pastoral','9/8',92,'A','Dórica','harmonic-songbook',51.2802,1.0789,'#b4c985','Organ and guitar unfold over three ternary pulses, with a lighter middle section and a returning riff.'],
  ['cambridge-1973','Cambridge','UK',1973,'Progressive rock in seven','7/4',118,'E','Menor natural','harmonic-songbook',52.2053,0.1218,'#d18e78','A four-plus-three bass figure anchors clipped guitars, organ swells and an asymmetric backbeat.'],
  ['istanbul-1970','Istanbul','Turkey',1970,'Turkish dance study','5/8',210,'D','Menor natural','world-rhythms',41.0082,28.9784,'#75c4c0','A three-plus-two dance cycle links a plucked melody with low and dry percussion answers.'],
  ['kalamata-1930','Kalamata','Greece',1930,'Kalamatianos study','7/8',210,'D','Maior','world-rhythms',37.0389,22.1142,'#89b9e3','A long-short-short dance cycle groups seven eighth notes as three plus two plus two.'],
  ['santiago-del-estero-1960','Santiago del Estero','Argentina',1960,'Chacarera study','6/8',102,'A','Menor natural','world-rhythms',-27.7834,-64.2642,'#ceaa78','Guitar and violin cross a two-pulse six-eighth cycle with a three-accent drum response.'],
]
export const RHYTHM_STAGES: RhythmStage[] = rows.map(([id,name,country,year,genre,meter,bpm,root,scale,campaign,lat,lng,color,description]) => ({ id,name,country,year,genre,meter,bpm,root,scale,campaign,lat,lng,color,description }))
