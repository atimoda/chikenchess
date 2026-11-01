import { OnlineProvider } from '@/components/online/online-provider'
import { ChickenPatio } from '@/components/chicken/chicken-patio'

export const metadata = { title: 'Pátio da Galinha · ChicKenChess' }

export default function PatioPage() {
  return <OnlineProvider><ChickenPatio /></OnlineProvider>
}
