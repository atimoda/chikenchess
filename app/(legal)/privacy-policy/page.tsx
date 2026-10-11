import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalContact, LegalDocument, LegalSection } from '@/components/legal-document'
import { LEGAL_PATHS, SITE_URL } from '@/lib/site-info'

const title = 'Privacy Policy · ChickenChess'
const description = 'How ChickenChess handles account information, saved progress, online games, friendships, and privacy requests.'
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: `${SITE_URL}${LEGAL_PATHS.privacy}` },
  openGraph: { title, description, url: `${SITE_URL}${LEGAL_PATHS.privacy}` },
  twitter: { title, description },
}

const contents = [
  { id: 'responsibility', title: 'Who is responsible' },
  { id: 'information', title: 'Information we handle' },
  { id: 'google', title: 'Google account information' },
  { id: 'purposes', title: 'Why we use information' },
  { id: 'visibility', title: 'What other players can see' },
  { id: 'providers', title: 'Service providers and transfers' },
  { id: 'storage', title: 'Browser storage and analytics' },
  { id: 'retention', title: 'Retention and deletion' },
  { id: 'rights', title: 'Your choices and rights' },
  { id: 'security', title: 'Security and younger players' },
  { id: 'changes', title: 'Changes to this policy' },
] as const

export default function PrivacyPolicy() {
  return <LegalDocument title="Privacy Policy" introduction="ChickenChess combines chess with music generated on your device. This policy explains the information involved when you play, save a profile, or use online features." contents={contents}>
    <LegalSection {...contents[0]}>
      <p>The ChickenChess project operates the service at <a href={SITE_URL}>chickenchess.com</a> and is responsible for the personal information described here. For privacy questions, account deletion, or other requests, contact <LegalContact />.</p>
      <p>This policy covers the ChickenChess website and its account and multiplayer features. Services you visit through external links have their own policies.</p>
    </LegalSection>
    <LegalSection {...contents[1]}>
      <ul>
        <li><strong>Account information.</strong> Your account identifier, email address, sign-in method, and authentication information needed to keep you signed in. Google sign-in may also provide your Google identifier, name, and profile image. New player profiles receive a randomly generated, permanent baptismal name. Your separate player display name can be edited or imported from Google. Existing profiles retain their names.</li>
        <li><strong>Guest profiles and saved progress.</strong> Your display name, baptismal name, golden eggs, historical points, wins, conquered cities, and game preferences. Using account or online features can create an anonymous guest account with a unique identifier before you connect Google or email. “Anonymous” does not mean that no technical information is processed.</li>
        <li><strong>Online play and social features.</strong> Room membership, public or private room settings, kit choices, readiness, connection status, moves, powers, suggestions, match results, and friend requests or accepted friendships. Musical piece parameters shared during a match are also processed.</li>
        <li><strong>Device and operational information.</strong> Hosting and infrastructure providers may process IP addresses, request times, browser or device information, and technical logs for delivery, troubleshooting, and security. If you contact us, we receive the information you include in your message.</li>
      </ul>
      <p>Game audio is generated locally. ChickenChess does not request access to your microphone, camera, or precise device location. Creative kits and presets kept in your browser are not automatically uploaded as a cloud library; parameters you share through online play are handled separately.</p>
    </LegalSection>
    <LegalSection {...contents[2]}>
      <p>Google sign-in requests only basic identity scopes: OpenID, email, and profile. We use this information to authenticate you, connect or recover your ChickenChess profile, and maintain your account. We do not request access to Gmail messages, Google Drive files, contacts, or calendars. Your Google password stays with Google.</p>
      <p>Our use and transfer of information received from Google APIs follow the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including its Limited Use requirements. We do not sell Google account information, use it for advertising, or use it to train general-purpose AI models.</p>
      <p>Connecting a guest profile preserves its progress. If the account already has a save, you choose which profile to keep; balances are not added together. Recovery copies may be retained to protect against an accidental transfer or conflicting save.</p>
    </LegalSection>
    <LegalSection {...contents[3]}>
      <p>We use information to provide sign-in and recovery, save and synchronize progress, run rooms and matches, deliver access codes, manage friendships, share musical parameters you enable, answer support requests, and protect the service against abuse or errors.</p>
      <p>Where a legal basis is required, processing needed to provide a feature you request is based on providing that service. Security, reliability, and support may rely on legitimate interests balanced against your rights; some records may be required by law. If an optional use requires consent, we will ask for it separately. Signing in is not blanket consent to unrelated uses of your information.</p>
    </LegalSection>
    <LegalSection {...contents[4]}>
      <p>The public room directory shows the room code, creator’s display name, game mode, and occupancy. Players you interact with as opponents or through friendship requests can see your player identity, friend code, and relevant game statistics, including golden eggs and historical points. Match participants can see the shared game state and connection status.</p>
      <p>Your email address and Google account metadata are not included in public player or room listings. A private room is hidden from the public directory, but anyone with its invitation code or link may be able to view or join it while a place is available. Share invitations accordingly.</p>
      <p>Receiving an opponent’s musical parameters is an individual preference. Mixer controls and free piece-dragging gestures remain local in the current online version. Chat is not included in this version; a future chat feature will be described before it is introduced.</p>
    </LegalSection>
    <LegalSection {...contents[5]}>
      <p>We share only the information needed for the purposes above with providers that support ChickenChess:</p>
      <ul>
        <li><a href="https://supabase.com/privacy">Supabase</a> provides authentication, cloud storage of account and game records, and multiplayer infrastructure.</li>
        <li>Google processes Google sign-in, serves fonts requested by the website, and provides Google Analytics measurement. Those requests may expose normal network information, such as your IP address, to Google. See <a href="https://policies.google.com/privacy">Google’s Privacy Policy</a>.</li>
        <li><a href="https://www.brevo.com/legal/privacypolicy/">Brevo</a> delivers access-code emails when email sign-in is enabled, processing the recipient address, message, and delivery records.</li>
        <li>Website hosting and delivery providers, including <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a> or <a href="https://vercel.com/legal/privacy-policy">Vercel</a> depending on the deployment, process requests and operational information. Our email provider also processes support correspondence.</li>
      </ul>
      <p>Providers may process information outside your country. We use the safeguards available through applicable law and our providers’ data-processing arrangements. We may also disclose information when legally required or reasonably necessary to protect people and the service. If responsibility for the service changes, transferred information must remain subject to appropriate privacy protections.</p>
      <p>We do not sell or rent personal information or use it for targeted advertising.</p>
    </LegalSection>
    <LegalSection {...contents[6]}>
      <p>ChickenChess uses browser cookies and local storage for guest progress, authentication sessions, account-specific caches, recovery copies, creative presets, and preferences. The local campaign profile cookie can last up to one year and is renewed when the profile is saved. Other local data remains until removed by the browser or the relevant feature.</p>
      <p>ChickenChess uses Google Analytics to understand website usage. It may collect page paths, referrers, approximate location, and browser or device information, and uses first-party cookies to distinguish users and sessions. We record when a match starts and, when it finishes, send its mode, result, reason, number of moves, Golden Eggs saved and collected, city, and the city kits used by each side. Completion data includes aggregate counts of Freeze, Shield, Undo, Redo, Best and Worst uses; when this browser observed the start, it also includes the elapsed time observed here. We send no individual moves, player names, or account, room, or match IDs. Page URLs have query strings and fragments removed, and authentication callback pages are skipped. Google describes its collection in <a href="https://support.google.com/analytics/answer/11593727">Google Analytics data collection</a> and its <a href="https://policies.google.com/privacy">Privacy Policy</a>.</p>
      <p>On deployments hosted by Vercel, Vercel Web Analytics may also collect aggregate usage information, such as page paths, referrers, approximate country, and browser or device categories. It does not use advertising cookies. We remove query strings and fragments from page URLs sent through this integration and skip authentication callback pages. See <a href="https://vercel.com/docs/analytics/privacy-policy">Vercel’s analytics privacy information</a>.</p>
      <p>You can clear or restrict browser storage through your browser settings. This can sign you out and permanently remove unsynchronized guest progress or creative presets. Signing out does not delete your cloud account or all locally stored creations.</p>
    </LegalSection>
    <LegalSection {...contents[7]}>
      <p>We keep account and game records while needed to provide your account and requested features, resolve save conflicts, handle support, or meet legal and security needs. There is currently no automatic account deletion based only on inactivity.</p>
      <p>To request deletion, email <LegalContact />. We may verify account ownership before acting. We will delete or anonymize information where appropriate; limited records may need to remain for legal obligations, security, or the integrity of records involving other players. Copies in provider backups and logs may remain until their normal retention cycles expire.</p>
    </LegalSection>
    <LegalSection {...contents[8]}>
      <p>Depending on the law that applies to you, including Brazil’s LGPD where applicable, you may request access, correction, deletion, anonymization, portability, information about sharing, or withdrawal of consent for uses based on consent. You may also raise a complaint with your local data-protection authority. Contact <LegalContact /> to exercise these rights; we will explain any applicable limits.</p>
      <p>You can use local game features without connecting Google or email and control which musical parameters you receive. You can edit your player display name; your separate baptismal name stays with your account and cannot be edited. You can revoke ChickenChess’s Google connection in your Google Account settings. Revoking that connection does not itself delete your ChickenChess profile; contact us if you also want deletion.</p>
    </LegalSection>
    <LegalSection {...contents[9]}>
      <p>We use authentication, access controls, and encrypted network connections to protect information. No service or storage method can guarantee complete security. Keep sign-in codes and account access private, and contact us if you suspect unauthorized access.</p>
      <p>ChickenChess is a general-audience game and does not ask for a date of birth. Younger players should involve a parent or guardian when permission is required by applicable law. If you believe a child’s information has been provided without the necessary permission, contact us so we can review and address it.</p>
    </LegalSection>
    <LegalSection {...contents[10]}>
      <p>We may update this policy as the service changes. The current policy will remain at this URL with an updated date. Material changes will be communicated appropriately, and any newly required consent will be requested.</p>
      <p>For the rules governing use of the service, read our <Link href={LEGAL_PATHS.terms}>Terms of Service</Link>.</p>
    </LegalSection>
  </LegalDocument>
}
