'use client'

import { Trash2 } from 'lucide-react'
import type { PianoNote } from '@/lib/music/piano-roll'
import { Knob, type KnobUpdateMode } from './knob'
import styles from './music-playback.module.css'

export function MusicNoteParams({note,onChange,onDelete,updateMode='immediate'}:{note:PianoNote;onChange:(patch:Partial<PianoNote>)=>void;onDelete:()=>void;updateMode?:KnobUpdateMode}) {
  const slide=note.slide??0, seconds=note.slideSeconds??.5, pan=note.pan??.5
  const tint=(value:number,initial:number)=>Math.abs(value-initial)<.0005?'#858c95':'#1688ff'
  const end={x:8+Math.max(.001,Math.min(2,seconds))/2*144,y:16-Math.max(-14,Math.min(14,slide))}
  return <section className={styles.noteParams} aria-label="Note params">
    <h3>Note params</h3>
    <div className={styles.noteParamsRow}>
      <div className={styles.noteSlideBox}>
        <Knob size={28} label="Slide" ariaLabel="Slide da nota" value={slide} min={-24} max={24} step={1} accentColor={tint(slide,0)} updateMode={updateMode} formatValue={n=>`${n}st`} onChange={slide=>onChange({slide})}/>
        <Knob size={28} label="Tempo" ariaLabel="Tempo do slide da nota" value={seconds} min={.001} max={2} step={.001} accentColor={tint(seconds,.5)} updateMode={updateMode} formatValue={n=>`${Number(n.toFixed(3))}s`} onChange={slideSeconds=>onChange({slideSeconds})}/>
        <svg className={styles.noteSlideCurve} viewBox="0 0 160 32" role="img" aria-label={`Slide: ${slide} semitons em ${seconds} segundos`}><line x1="8" x2="152" y1="16" y2="16" stroke="#425544"/><path d={`M8 16 L${end.x} ${end.y}`} fill="none" stroke="#dfa67a" strokeWidth="2"/></svg>
      </div>
      <Knob size={28} label="Acento" ariaLabel="Acento da nota" value={note.velocity} min={0} max={1} step={.01} accentColor={tint(note.velocity,.8)} updateMode={updateMode} formatValue={n=>n.toFixed(2)} onChange={velocity=>onChange({velocity})}/>
      <Knob size={28} label="Pan" ariaLabel="Pan da nota" value={pan} min={0} max={1} step={.01} accentColor={tint(pan,.5)} updateMode={updateMode} formatValue={n=>n.toFixed(2)} onChange={pan=>onChange({pan})}/>
      <button className={styles.deleteNote} type="button" aria-label="Excluir nota" title="Excluir nota" onClick={onDelete}><Trash2 size={14}/></button>
    </div>
  </section>
}
