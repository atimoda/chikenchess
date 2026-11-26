import { ArrowDown, ArrowRight, ChevronsUp, Egg, Footprints } from 'lucide-react'
import type { ChickenParamMeta } from '@/lib/chicken/param-meta'
import { useT } from '@/lib/i18n'

// The same movement symbols as the touch controls; full labels stay accessible.
export function CombinationLabel({ meta }: { meta: ChickenParamMeta }) {
  const t = useT()
  if (meta.group !== 'Combinações' || !meta.label.includes(':') || meta.key === 'broodStandOnMove') return <>{t(meta.label)}</>
  const prefix = meta.label.split(':')[0].toLowerCase()
  const label = t(meta.label)
  const actions = [
    ...(prefix.includes('frente') ? [{ Icon: ArrowRight, name: t('Mover para o lado') }] : []),
    ...(prefix.includes('baixo') ? [{ Icon: ArrowDown, name: t('Agachar') }] : []),
    ...(prefix.includes('corr') ? [{ Icon: Footprints, name: t('Correr') }] : []),
    ...(prefix.includes('choc') || prefix.includes('shocking') ? [{ Icon: Egg, name: t('Chocar') }] : []),
    ...(prefix.includes('pular') || prefix.includes('pulo') || prefix.includes('shocking') ? [{ Icon: ChevronsUp, name: t('Pular') }] : []),
  ]
  const scope = prefix.includes('no chão') ? ` ${t('no chão')}` : prefix.includes('no ar') ? ` ${t('no ar')}` : ''
  return <span className="inline-flex items-center gap-1" aria-label={label} title={label}>
    {actions.map(({ Icon, name }, i) => <span key={name} className="inline-flex items-center gap-1" aria-hidden="true">
      {i > 0 && <span className="opacity-60">+</span>}<span title={name}><Icon className="size-4 shrink-0" /></span>
    </span>)}
    <span aria-hidden="true">{scope}: {label.includes(':') ? label.split(':').slice(1).join(':').trim() : label}</span>
  </span>
}
