'use client'
import { InfoTip } from '../info-tip'
import { Knob, LARGE_KNOB_SIZE, type KnobUpdateMode } from '../knob'
import { RangeKnob, type IntegerRange } from '../range-knob'
import styles from '../creative-studio.module.css'

const RANGE_HELP: Record<string,string> = {
 'Volume geral':'Controla o volume da banda inteira.', 'Octaves':'Sem L, S ou N selecionado, ajusta uma oitava fixa. Ao escolher uma bolinha, o knob passa a controlar dois limites inclusivos: L sorteia por repetição do loop, S por entrada na seção A–H e N por ataque, mantendo a mesma oitava nas notas simultâneas. N é a opção inicial. Samples sem afinação não mudam de altura.',
 'Ganho do instrumento':'Volume base do timbre (0 a 1). Multiplica o Ganho adicional: base 0,3 × adicional 0,5 resulta em 0,15 antes dos acentos/velocidades das notas e do mixer. Alterar aqui preserva o multiplicador da peça e suas regras.',
 'Ganho adicional':'Multiplicador do ganho base da peça (0 a 2): 1 não muda, 0,5 reduz pela metade, 2 dobra e 0 silencia. Estados/Eventos podem sobrepor esse ganho e restaurá-lo ao terminar; o ganho base do instrumento permanece separado. Não é uma soma de volumes.', 'Ataque':'Tempo para a nota atingir seu volume. Curto produz ataque definido; longo produz entrada suave.',
 'Sustentação':'Nível mantido após o decaimento, enquanto a nota dura.', 'Liberação':'Tempo de saída da nota depois de encerrar sua duração.',
 'Duração da nota (fração)':'Fração da duração rítmica ocupada pelo som. Valores menores deixam mais espaço entre ataques.',
 'Passa-baixas':'Sem L, S ou N selecionado, ajusta um corte fixo de 20 Hz a 20 kHz. Ao escolher uma bolinha, o knob passa a controlar dois limites; N sorteia por ataque e é a opção inicial. Atenua frequências acima do corte; reduzir deixa o timbre mais fechado. Uma regra de filtro ativa tem prioridade e restaura os valores ao terminar.', 'Passa-altas':'Atenua frequências abaixo do corte. Aumentar remove graves.',
 'Pan':'Posição estéreo: valores negativos deslocam para a esquerda, positivos para a direita.', 'Pan adicional':'Ajuste salvo que se soma à posição da coluna, conforme Abertura estéreo do tabuleiro. Mover a peça altera o Pan final do áudio, não este valor base. Abertura zero remove a influência da coluna. O Pan próprio da nota pode substituir o resultado.', 'Reverb':'Sem L, S ou N selecionado, ajusta uma ambiência fixa (0 a 100%). Ao escolher uma bolinha, o knob passa a controlar dois limites: L sorteia por loop, S por entrada na seção e N por ataque (padrão). É envio para buses compartilhados, não um reverb separado por nota.', 'Delay':'Quantidade de repetições do som.',
 'Drive':'Sem L, S ou N selecionado, ajusta uma saturação fixa de 0 a 10. Ao escolher uma bolinha, o knob passa a controlar dois limites: L sorteia por loop, S por entrada na seção e N por ataque (padrão). Zero dispensa a distorção.',
 'Swing':'Sem L, S ou N selecionado, ajusta um swing fixo de 0 a 50%. Ao escolher uma bolinha, o knob passa a controlar dois limites: L sorteia por loop, S por entrada na seção e N por ataque (padrão). Atrasa os contratempos, sem antecipar notas; notas simultâneas mantêm o mesmo atraso. Soma-se ao timing escrito no kit; o gesto manual continua imediato.',
 'Chance de tocar':'Probabilidade de cada evento do piano roll tocar. 0% remove todos os eventos; 100% toca todos. Usa o modificador nativo degradeBy do Strudel. Aplica-se aos loops automáticos, não à nota manual no tabuleiro. No Criativo, o valor é salvo no kit; na partida, vale só para a sessão atual.',
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

export function ParameterKnob({ label, value, min, max, step = 0.01, unit = '', logarithmic = false, formatValue, updateMode = 'immediate', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; logarithmic?: boolean; formatValue?: (value: number) => string; updateMode?: KnobUpdateMode; onChange: (value: number) => void
}) {
  const defaultFormat = (current: number) => {
    if (unit === ' Hz') return current >= 1000 ? `${Number((current / 1000).toFixed(1))}kHz` : `${Number(current.toFixed(3))}Hz`
    return `${Number(current.toFixed(3))}${unit.trim()}`
  }
  const labelContent = <div className={styles.parameterKnobLabel}><span>{label}</span><InfoTip label={label}>{RANGE_HELP[label] ?? `Ajusta ${label.toLowerCase()} nesta configuração. Intervalo: ${min} a ${max}${unit}.`}</InfoTip></div>
  return <div className={styles.parameterKnob}>
    <Knob label={label} labelContent={labelContent} labelPosition="bottom" size={LARGE_KNOB_SIZE} value={value} min={min} max={max} step={step} logarithmic={logarithmic} formatValue={formatValue ?? defaultFormat} updateMode={updateMode} onChange={onChange} />
  </div>
}

export function ParameterRangeKnob({ label, value, min, max, step = 1, formatValue, formatSingleValue, updateMode = 'immediate', onChange }: {
  label: string; value: IntegerRange; min: number; max: number; step?: number; formatValue?: (value: IntegerRange) => string; formatSingleValue?: (value: number) => string; updateMode?: KnobUpdateMode; onChange: (value: IntegerRange) => void
}) {
  const labelContent = <div className={styles.parameterKnobLabel}><span>{label}</span><InfoTip label={label}>{RANGE_HELP[label] ?? `Ajusta os limites de ${label.toLowerCase()} entre ${min} e ${max}.`}</InfoTip></div>
  return <div className={styles.parameterKnob}>
    <RangeKnob label={label} labelContent={labelContent} labelPosition="bottom" size={LARGE_KNOB_SIZE} value={value} min={min} max={max} step={step} showFrequency updateMode={updateMode} formatValue={formatValue ?? (range => `${range.first}–${range.second}`)} formatSingleValue={formatSingleValue} onChange={onChange} />
  </div>
}
