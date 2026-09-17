import type { CreativeSession } from '../creative'

export type StyleProfile={name:string;bpm:number;root:CreativeSession['root'];scale:CreativeSession['scale'];bass:string[];lead:string[];drums:number[][];bassBars:number;leadBars:number;accentBars:number;swing:number;colors:[string,string,string];sections:number[];reference:string;url:string}
