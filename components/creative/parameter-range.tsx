'use client'
import { InfoTip } from '../info-tip'
import { Knob } from '../knob'
import { RangeKnob, type IntegerRange } from '../range-knob'
import styles from '../creative-studio.module.css'

const RANGE_HELP: Record<string,string> = {
 'Volume geral':'Controla o volume da banda inteira.', 'Range':'Escolhe duas oitavas inclusivas; limites iguais fixam a altura. L sorteia por repetição do loop, S por entrada na seção A–H e N por ataque, com a mesma oitava nas notas simultâneas. Kits anteriores sem frequência mantêm o sorteio por compasso, indicado como legado, até escolher L/S/N. Samples sem afinação não mudam de altura.',
 'Ganho do instrumento':'Volume base do timbre (0 a 1). Multiplica o Ganho adicional: base 0,3 × adicional 0,5 resulta em 0,15 antes dos acentos/velocidades das notas e do mixer. Alterar aqui preserva o multiplicador da peça e suas regras.',
 'Ganho adicional':'Multiplicador do ganho base da peça (0 a 2): 1 não muda, 0,5 reduz pela metade, 2 dobra e 0 silencia. Estados/Eventos podem sobrepor esse ganho e restaurá-lo ao terminar; o ganho base do instrumento permanece separado. Não é uma soma de volumes.', 'Ataque':'Tempo para a nota atingir seu volume. Curto produz ataque definido; longo produz entrada suave.',
 'Sustentação':'Nível mantido após o decaimento, enquanto a nota dura.', 'Liberação':'Tempo de saída da nota depois de encerrar sua duração.',
 'Duração da nota (fração)':'Fração da duração rítmica ocupada pelo som. Valores menores deixam mais espaço entre ataques.',
 'Passa-baixas':'Dois limites de corte, de 20 Hz a 20 kHz. Atenua frequências acima do corte; reduzir deixa o timbre mais fechado. L sorteia por loop, S por entrada na seção e N por ataque (padrão). Limites iguais fixam o corte. Uma regra de filtro ativa tem prioridade e restaura o range ao terminar.', 'Passa-altas':'Atenua frequências abaixo do corte. Aumentar remove graves.',
 'Pan':'Posição estéreo: valores negativos deslocam para a esquerda, positivos para a direita.', 'Pan adicional':'Ajuste salvo que se soma à posição da coluna, conforme Abertura estéreo do tabuleiro. Mover a peça altera o Pan final do áudio, não este valor base. Abertura zero remove a influência da coluna. O Pan próprio da nota pode substituir o resultado.', 'Reverb':'Dois limites de ambiência (0 a 100%). L sorteia por loop, S por entrada na seção e N por ataque. Limites iguais fixam o efeito. É envio para buses compartilhados, não um reverb separado por nota.', 'Delay':'Quantidade de repetições do som.',
 'Drive':'Dois limites de saturação, de 0 a 10. L sorteia por loop, S por entrada na seção e N por ataque. Limites iguais fixam o efeito; zero dispensa a distorção.',
 'Swing':'Dois limites de swing adicional, de 0 a 50%. L sorteia por loop, S por entrada na seção e N por ataque. Atrasa os contratempos, sem antecipar notas; notas simultâneas mantêm o mesmo atraso. Soma-se ao timing escrito no kit; limites iguais fixam o swing. O gesto manual continua imediato.',
 'Distorção':'Saturação de 0 a 10 aplicada a este instrumento em todas as variações.', 'Nível da distorção':'Controla o volume do efeito no Strudel (distortvol). Não é uma porcentagem de mistura seco/molhado; ajuste o ganho ao comparar timbres.',
 'Slide de afinação':'Aplica o mesmo envelope a todas as notas afinadas deste instrumento, em todas as variações. Para slides ocasionais, edite uma nota no piano roll.',
 'Tempo do slide':'Tempo do envelope global deste instrumento em todas as variações. Só atua quando Slide de afinação é diferente de zero; uma nota com slide próprio usa seu próprio tempo. Intervalo de 0,001 a 2 segundos.',
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

export function ParameterRangeKnob({ label, value, min, max, step = 1, formatValue, legacyFrequency, onChange }: {
  label: string; value: IntegerRange; min: number; max: number; step?: number; formatValue?: (value: IntegerRange) => string; legacyFrequency?: boolean; onChange: (value: IntegerRange) => void
}) {
  return <div className={styles.parameterKnob}>
    <div className={styles.parameterKnobLabel}><span>{label}</span><InfoTip label={label}>{RANGE_HELP[label] ?? `Ajusta os limites de ${label.toLowerCase()} entre ${min} e ${max}.`}</InfoTip></div>
    <RangeKnob label={label} value={value} min={min} max={max} step={step} hideLabel showFrequency legacyFrequency={legacyFrequency} formatValue={formatValue ?? (range => `${range.first}–${range.second}`)} onChange={onChange} />
  </div>
}
