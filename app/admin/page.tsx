import { Fragment } from 'react'
import { OnlineProvider } from '@/components/online/online-provider'
import { AdminPanel } from '@/components/admin/admin-panel'

export const metadata = { title: 'Admin · ChicKenChess', robots: { index: false, follow: false } }

// the keyed Fragment: see app/patio/page.tsx (useId and the page's first client component)
export default function AdminPage() {
  return <Fragment key="page"><OnlineProvider><AdminPanel /></OnlineProvider></Fragment>
}
