'use client'
import { InfoTip } from '../info-tip'
import { Knob } from '../knob'
import styles from '../creative-studio.module.css'

const RANGE_HELP: Record<string,string> = {
 'Volume geral':'Controla o volume da banda inteira.', 'Oitava':'Registro das notas deste instrumento. Cada oitava dobra ou divide a frequência por dois.',
 'Ganho do instrumento':'Volume base desta voz, multiplicado pelos acentos e pelo ganho da peça.', 'Ataque':'Tempo para a nota atingir seu volume. Curto produz ataque definido; longo produz entrada suave.',
 'Sustentação':'Nível mantido após o decaimento, enquanto a nota dura.', 'Liberação':'Tempo de saída da nota depois de encerrar sua duração.',
 'Duração da nota (fração)':'Fração da duração rítmica ocupada pelo som. Valores menores deixam mais espaço entre ataques.',
 'Passa-baixas':'Atenua frequências acima do corte. Reduzir deixa o timbre mais fechado.', 'Passa-altas':'Atenua frequências abaixo do corte. Aumentar remove graves.',
 'Pan':'Posição estéreo: valores negativos deslocam para a esquerda, positivos para a direita.', 'Reverb':'Quantidade de ambiência e cauda reverberante.', 'Delay':'Quantidade de repetições do som.',
 'Distorção':'Saturação de 0 a 10 aplicada a este instrumento em todas as variações.', 'Nível da distorção':'Controla o volume do efeito no Strudel (distortvol). Não é uma porcentagem de mistura seco/molhado; ajuste o ganho ao comparar timbres.',
 'Slide de afinação':'Aplica o mesmo envelope a todas as notas afinadas deste instrumento, em todas as variações. Para slides ocasionais, edite uma nota no piano roll ou use a automação Slide.',
}
export function Range({ label, value, min, max, step = 0.01, unit = '', help = true, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; help?: boolean; onChange: (value: number) => void
}) {
  return <label className={styles.range}>
    <span>{label}{help&&<InfoTip label={label}>{RANGE_HELP[label] ?? `Ajusta ${label.toLowerCase()} nesta configuração. Intervalo: ${min} a ${max}${unit}.`}</InfoTip>}<output>{Number(value.toFixed(3))}{unit}</output></span>
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
  </label>
}

export function ParameterKnob({ label, value, min, max, step = 0.01, unit = '', logarithmic = false, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; logarithmic?: boolean; onChange: (value: number) => void
}) {
  const formatValue = (current: number) => {
    if (unit === ' Hz') return current >= 1000 ? `${Number((current / 1000).toFixed(1))}kHz` : `${Number(current.toFixed(3))}Hz`
    return `${Number(current.toFixed(3))}${unit.trim()}`
  }
  return <div className={styles.parameterKnob}>
    <div className={styles.parameterKnobLabel}><span>{label}</span><InfoTip label={label}>{RANGE_HELP[label] ?? `Ajusta ${label.toLowerCase()} nesta configuração. Intervalo: ${min} a ${max}${unit}.`}</InfoTip></div>
    <Knob label={label} value={value} min={min} max={max} step={step} logarithmic={logarithmic} formatValue={formatValue} onChange={onChange} hideLabel />
  </div>
}
