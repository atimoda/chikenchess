'use client'

import styles from './creative-studio.module.css'

interface Props {
  ariaLabel: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

export function CompactNumberInput({ariaLabel,value,min,max,step=1,onChange}:Props) {
  const precision=Math.max(...[min,max,step].map(number=>(String(number).split('.')[1]??'').length))
  const adjust=(direction:-1|1)=>onChange(Number(Math.max(min,Math.min(max,value+direction*step)).toFixed(precision)))
  return <div className={styles.numberStepper}>
    <input aria-label={ariaLabel} inputMode="decimal" value={value} onChange={event=>{const next=Number(event.target.value);if(Number.isFinite(next)&&next>=min&&next<=max)onChange(next)}} />
    <button type="button" aria-label={`Diminuir ${ariaLabel}`} disabled={value<=min} onClick={()=>adjust(-1)}>−</button>
    <button type="button" aria-label={`Aumentar ${ariaLabel}`} disabled={value>=max} onClick={()=>adjust(1)}>+</button>
  </div>
}
