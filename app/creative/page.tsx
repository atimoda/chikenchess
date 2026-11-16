import { Fragment } from 'react'
import { CreativeStudio } from '@/components/creative-studio'

export const metadata = { title: 'Creative Mode · ChicKenChess' }

// the keyed Fragment: see app/patio/page.tsx (useId and the page's first client component)
export default function CreativePage() {
  return <Fragment key="page"><CreativeStudio /></Fragment>
}
