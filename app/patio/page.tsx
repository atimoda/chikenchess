import { Fragment } from 'react'
import { OnlineProvider } from '@/components/online/online-provider'
import { ChickenPatio } from '@/components/chicken/chicken-patio'

export const metadata = { title: 'Pátio da Galinha · ChicKenChess' }

// The keyed Fragment keeps the page's first client component out of the list Next puts the page in. React 19.2
// forgets that list's position when such a component's code arrives after hydration has reached it, and every
// useId below it (the patterns of the Pátio's art) then differs from the server's: a hydration error on entering.
export default function PatioPage() {
  return <Fragment key="page"><OnlineProvider><ChickenPatio /></OnlineProvider></Fragment>
}
