import { ArrowDown, ArrowRight, ChevronsUp, Egg, Footprints } from 'lucide-react'
import type { ChickenParamMeta } from '@/lib/chicken/param-meta'

// The same movement symbols as the touch controls; full labels stay accessible.
export function CombinationLabel({ meta }: { meta: ChickenParamMeta }) {
  if (meta.group !== 'Combinações' || !meta.label.includes(':') || meta.key === 'broodStandOnMove') return <>{meta.label}</>
  const prefix = meta.label.split(':')[0].toLowerCase()
  const actions = [
    ...(prefix.includes('frente') ? [{ Icon: ArrowRight, name: 'Mover para o lado' }] : []),
    ...(prefix.includes('baixo') ? [{ Icon: ArrowDown, name: 'Agachar' }] : []),
    ...(prefix.includes('corr') ? [{ Icon: Footprints, name: 'Correr' }] : []),
    ...(prefix.includes('choc') || prefix.includes('shocking') ? [{ Icon: Egg, name: 'Chocar' }] : []),
    ...(prefix.includes('pular') || prefix.includes('pulo') || prefix.includes('shocking') ? [{ Icon: ChevronsUp, name: 'Pular' }] : []),
  ]
  const scope = prefix.includes('no chão') ? ' no chão' : prefix.includes('no ar') ? ' no ar' : ''
  return <span className="inline-flex items-center gap-1" aria-label={meta.label} title={meta.label}>
    {actions.map(({ Icon, name }, i) => <span key={name} className="inline-flex items-center gap-1" aria-hidden="true">
      {i > 0 && <span className="opacity-60">+</span>}<span title={name}><Icon className="size-4 shrink-0" /></span>
    </span>)}
    <span aria-hidden="true">{scope}: {meta.label.split(':').slice(1).join(':').trim()}</span>
  </span>
}
