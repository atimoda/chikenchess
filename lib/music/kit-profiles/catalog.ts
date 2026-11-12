// Canonical, normalized profiles include the existing timbre and arrangement curation.
import type { StyleProfile } from './types'
import profile0 from '../../../data/music/profiles/dusseldorf.json'
import profile1 from '../../../data/music/profiles/nyc.json'
import profile2 from '../../../data/music/profiles/chicago.json'
import profile3 from '../../../data/music/profiles/detroit.json'
import profile4 from '../../../data/music/profiles/ibiza.json'
import profile5 from '../../../data/music/profiles/manchester.json'
import profile6 from '../../../data/music/profiles/berlin.json'
import profile7 from '../../../data/music/profiles/tokyo.json'
import profile8 from '../../../data/music/profiles/london.json'
import profile9 from '../../../data/music/profiles/saopaulo.json'
import profile10 from '../../../data/music/profiles/paris.json'
import profile11 from '../../../data/music/profiles/vienna.json'
import profile12 from '../../../data/music/profiles/johannesburg.json'
import profile13 from '../../../data/music/profiles/buenos-aires-1940.json'
import profile14 from '../../../data/music/profiles/dublin-1990.json'
import profile15 from '../../../data/music/profiles/new-orleans-1953.json'
import profile16 from '../../../data/music/profiles/san-diego-1999.json'
import profile17 from '../../../data/music/profiles/london-1970.json'
import profile18 from '../../../data/music/profiles/berkeley-2004.json'
import profile19 from '../../../data/music/profiles/new-york-1961.json'
import profile20 from '../../../data/music/profiles/san-francisco-1993.json'
import profile21 from '../../../data/music/profiles/paris-1945.json'
import profile22 from '../../../data/music/profiles/columbus-2013.json'
import profile23 from '../../../data/music/profiles/new-york-1930.json'
import profile24 from '../../../data/music/profiles/jacksonville-1974.json'
import profile25 from '../../../data/music/profiles/chicago-1958.json'
import profile26 from '../../../data/music/profiles/rio-1930.json'
import profile27 from '../../../data/music/profiles/rio-1910.json'
import profile28 from '../../../data/music/profiles/recife-1935.json'
import profile29 from '../../../data/music/profiles/recife-1950.json'
import profile30 from '../../../data/music/profiles/piracicaba-1940.json'
import profile31 from '../../../data/music/profiles/rio-1960.json'
import profile32 from '../../../data/music/profiles/new-york-1962.json'
import profile33 from '../../../data/music/profiles/london-1977.json'
import profile34 from '../../../data/music/profiles/memphis-1967.json'
import profile35 from '../../../data/music/profiles/kingston-1973.json'
import profile36 from '../../../data/music/profiles/leipzig-1723.json'
import profile37 from '../../../data/music/profiles/vienna-1825.json'
import profile38 from '../../../data/music/profiles/oakland-1959.json'
import profile40 from '../../../data/music/profiles/cambridge-1973.json'
import profile41 from '../../../data/music/profiles/istanbul-1970.json'
import profile42 from '../../../data/music/profiles/kalamata-1930.json'
import profile43 from '../../../data/music/profiles/santiago-del-estero-1960.json'
import profile44 from '../../../data/music/profiles/salvador-1992.json'
import profile45 from '../../../data/music/profiles/recife-1975.json'
import profile46 from '../../../data/music/profiles/rio-1995.json'
import profile47 from '../../../data/music/profiles/luanda-1982.json'
import profile48 from '../../../data/music/profiles/luanda-1965.json'
import profile49 from '../../../data/music/profiles/lagos-1975.json'
import profile50 from '../../../data/music/profiles/essaouira-1980.json'
import profile51 from '../../../data/music/profiles/maputo-1978.json'
import profile52 from '../../../data/music/profiles/dakar-1985.json'
import profile53 from '../../../data/music/profiles/luanda-1996.json'
import profile54 from '../../../data/music/profiles/harare-1981.json'
import profile55 from '../../../data/music/profiles/kinshasa-1978.json'
import profile56 from '../../../data/music/profiles/lagos-1982.json'
import profile57 from '../../../data/music/profiles/gaza-1987.json'
import profile58 from '../../../data/music/profiles/kisumu-1980.json'
import profile59 from '../../../data/music/profiles/goa.json'
import profile60 from '../../../data/music/profiles/bristol.json'
import profile61 from '../../../data/music/profiles/croydon.json'
import profile62 from '../../../data/music/profiles/durban.json'
import profile63 from '../../../data/music/profiles/rio-1984.json'
import profile64 from '../../../data/music/profiles/venice-1725.json'
import profile65 from '../../../data/music/profiles/copenhagen-1869.json'
import profile66 from '../../../data/music/profiles/paris-1913.json'
import profile67 from '../../../data/music/profiles/santo-amaro-1960.json'
import profile68 from '../../../data/music/profiles/campo-grande-1975.json'

export const STYLE_PROFILES = {
  'dusseldorf': profile0,
  'nyc': profile1,
  'chicago': profile2,
  'detroit': profile3,
  'ibiza': profile4,
  'manchester': profile5,
  'berlin': profile6,
  'tokyo': profile7,
  'london': profile8,
  'saopaulo': profile9,
  'paris': profile10,
  'vienna': profile11,
  'johannesburg': profile12,
  'buenos-aires-1940': profile13,
  'dublin-1990': profile14,
  'new-orleans-1953': profile15,
  'san-diego-1999': profile16,
  'london-1970': profile17,
  'berkeley-2004': profile18,
  'new-york-1961': profile19,
  'san-francisco-1993': profile20,
  'paris-1945': profile21,
  'columbus-2013': profile22,
  'new-york-1930': profile23,
  'jacksonville-1974': profile24,
  'chicago-1958': profile25,
  'rio-1930': profile26,
  'rio-1910': profile27,
  'recife-1935': profile28,
  'recife-1950': profile29,
  'piracicaba-1940': profile30,
  'rio-1960': profile31,
  'new-york-1962': profile32,
  'london-1977': profile33,
  'memphis-1967': profile34,
  'kingston-1973': profile35,
  'leipzig-1723': profile36,
  'vienna-1825': profile37,
  'oakland-1959': profile38,
  'cambridge-1973': profile40,
  'istanbul-1970': profile41,
  'kalamata-1930': profile42,
  'santiago-del-estero-1960': profile43,
  'salvador-1992': profile44,
  'recife-1975': profile45,
  'rio-1995': profile46,
  'luanda-1982': profile47,
  'luanda-1965': profile48,
  'lagos-1975': profile49,
  'essaouira-1980': profile50,
  'maputo-1978': profile51,
  'dakar-1985': profile52,
  'luanda-1996': profile53,
  'harare-1981': profile54,
  'kinshasa-1978': profile55,
  'lagos-1982': profile56,
  'gaza-1987': profile57,
  'kisumu-1980': profile58,
  'goa': profile59,
  'bristol': profile60,
  'croydon': profile61,
  'durban': profile62,
  'rio-1984': profile63,
  'venice-1725': profile64,
  'copenhagen-1869': profile65,
  'paris-1913': profile66,
  'santo-amaro-1960': profile67,
  'campo-grande-1975': profile68,
} as unknown as Record<string, StyleProfile>

