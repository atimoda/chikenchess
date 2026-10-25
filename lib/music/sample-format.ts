// Shared by the music catalog and the map's own sounds, without loading the catalog.
/** Catalog files are Ogg Opus with an AAC twin; browsers unsure about Opus (older Safari) load the .m4a. */
export const SAMPLE_FORMAT: 'ogg' | 'm4a' = typeof Audio === 'undefined' || new Audio().canPlayType('audio/ogg; codecs="opus"') === 'probably' ? 'ogg' : 'm4a'
const withFormat = (file: string) => SAMPLE_FORMAT === 'm4a' ? file.replace(/\.ogg$/, '.m4a') : file
export const sampleUrl = (file: string) => encodeURI(withFormat(file)).replace(/#/g, '%23').replace(/\?/g, '%3F')
