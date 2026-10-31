import { OnlineProvider } from '@/components/online/online-provider'
import { AdminPanel } from '@/components/admin/admin-panel'

export const metadata = { title: 'Admin · ChicKenChess', robots: { index: false, follow: false } }

export default function AdminPage() {
  return <OnlineProvider><AdminPanel /></OnlineProvider>
}
