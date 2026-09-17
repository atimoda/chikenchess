'use client'
import { InfoTip } from '../info-tip'
import styles from '../creative-studio.module.css'

const RANGE_HELP: Record<string,string> = {
 'Volume geral':'Controla o volume da banda inteira.', 'Oitava':'Registro das notas deste instrumento. Cada oitava dobra ou divide a frequência por dois.',
 'Ganho do instrumento':'Volume base desta voz, multiplicado pelos acentos e pelo ganho da peça.', 'Ataque':'Tempo para a nota atingir seu volume. Curto produz ataque definido; longo produz entrada suave.',
 'Sustentação':'Nível mantido após o decaimento, enquanto a nota dura.', 'Liberação':'Tempo de saída da nota depois de encerrar sua duração.',
 'Duração da nota (fração)':'Fração da duração rítmica ocupada pelo som. Valores menores deixam mais espaço entre ataques.',
 'Passa-baixas':'Atenua frequências acima do corte. Reduzir deixa o timbre mais fechado.', 'Passa-altas':'Atenua frequências abaixo do corte. Aumentar remove graves.',
 'Pan':'Posição estéreo: valores negativos deslocam para a esquerda, positivos para a direita.', 'Reverb':'Quantidade de ambiência e cauda reverberante.', 'Delay':'Quantidade de repetições do som.',
}
export function Range({ label, value, min, max, step = 0.01, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void
}) {
  return <label className={styles.range}>
    <span>{label}<InfoTip label={label}>{RANGE_HELP[label] ?? `Ajusta ${label.toLowerCase()} nesta configuração. Intervalo: ${min} a ${max}${unit}.`}</InfoTip><output>{Number(value.toFixed(3))}{unit}</output></span>
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
  </label>
}

