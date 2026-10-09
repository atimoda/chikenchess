import { OnlineProvider } from '@/components/online/online-provider'
import { AdminPanel } from '@/components/admin/admin-panel'

export const metadata = { title: 'Admin · ChickenChess', robots: { index: false, follow: false } }

export default function AdminPage() {
  return <OnlineProvider><AdminPanel /></OnlineProvider>
}
