import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalContact, LegalDocument, LegalSection } from '@/components/legal-document'
import { LEGAL_PATHS, SITE_URL } from '@/lib/site-info'

const title = 'Terms of Service · ChickenChess'
const description = 'Terms for playing ChickenChess, saving a profile, using online rooms and friendships, and creating music.'
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: `${SITE_URL}${LEGAL_PATHS.terms}` },
  openGraph: { title, description, url: `${SITE_URL}${LEGAL_PATHS.terms}` },
  twitter: { title, description },
}

const contents = [
  { id: 'agreement', title: 'The service and this agreement' },
  { id: 'accounts', title: 'Accounts and saved progress' },
  { id: 'play', title: 'Online play and virtual rewards' },
  { id: 'conduct', title: 'Respectful and lawful use' },
  { id: 'creations', title: 'Music and other content' },
  { id: 'availability', title: 'Availability and responsibility' },
  { id: 'ending', title: 'Ending use or restricting access' },
  { id: 'changes', title: 'Changes, law, and contact' },
] as const

export default function TermsOfService() {
  return <LegalDocument title="Terms of Service" introduction="These terms govern your use of ChickenChess, including local play, creative music tools, accounts, and online multiplayer. Please read them alongside our Privacy Policy." contents={contents}>
    <LegalSection {...contents[0]}>
      <p>ChickenChess is operated by the ChickenChess project at <a href={SITE_URL}>chickenchess.com</a>. Contact us at <LegalContact />. By using the service, you agree to these terms to the extent permitted by applicable law.</p>
      <p>You must be legally able to enter this agreement, or have a parent or guardian’s involvement and permission where required. You remain entitled to any mandatory rights provided by the law that applies to you.</p>
      <p>ChickenChess is a game and creative tool in active development. The current online mode is 1v1 casual ChickenChess. Features available in the interface may change as we improve the service.</p>
    </LegalSection>
    <LegalSection {...contents[1]}>
      <p>You can play local features with a guest profile. Guest progress and creative presets may depend on storage in your browser and can be lost if that storage is cleared, blocked, or unavailable. Connect an account to save and recover supported profile information across devices.</p>
      <p>Google and email access codes are available sign-in methods when configured. Provide an email address you control, protect your sign-in codes and account access, and notify us if you suspect misuse. Google sign-in is also subject to Google’s applicable terms.</p>
      <p>Linking a guest profile to a new account preserves its supported progress. If an existing account already has a save, the interface asks you to choose one profile. Golden eggs and points from separate profiles are not combined. Recovery copies may be kept to resolve mistakes or conflicting saves; they do not guarantee that every lost local item can be restored.</p>
      <p>Our <Link href={LEGAL_PATHS.privacy}>Privacy Policy</Link> explains how account, game, and technical information is handled. Signing out does not delete your account.</p>
    </LegalSection>
    <LegalSection {...contents[2]}>
      <p>Online matches use the ChickenChess rules implemented in the game. Powers, Undo, and shared Best/Worst suggestions are legitimate game features. Players may use them within the rules and limits shown by the game.</p>
      <p>The server-confirmed game state determines accepted actions and recorded results. Network interruptions, bugs, or temporary unavailability can delay or prevent actions. We may correct erroneous records or rewards when needed to maintain consistent game progress. A lost connection alone does not automatically mean that a player has resigned.</p>
      <p>Golden eggs, historical points, and other game rewards are virtual progress indicators. They have no cash value, cannot be redeemed for money, and do not create a financial asset or a right to payment. The current version does not sell these rewards for real money.</p>
      <p>A public room appears in the room directory. A private room is hidden there, but its invitation link or code can allow another person to join. Friend requests require the other person’s acceptance. Be thoughtful about the names and invitations you share.</p>
    </LegalSection>
    <LegalSection {...contents[3]}>
      <p>Use the service lawfully and treat other players respectfully. Do not:</p>
      <ul>
        <li>Harass, threaten, impersonate, or use player names or other shared content to promote hate, abuse, or unlawful activity.</li>
        <li>Spam players, abuse invitations or friend requests, or collect another person’s information without an appropriate basis.</li>
        <li>Attempt unauthorized access, disrupt the service, bypass access controls, or exploit a defect to alter accounts, rewards, or game records outside the intended mechanics.</li>
        <li>Upload or share content that infringes someone else’s rights or contains malicious code.</li>
      </ul>
      <p>Report abuse or security problems to <LegalContact />. These rules also apply to any future communication features when those features become available.</p>
    </LegalSection>
    <LegalSection {...contents[4]}>
      <p>The service’s software, visual assets, music kits, recordings, and other supplied content belong to their respective owners and may be covered by third-party licenses. Using ChickenChess does not transfer ownership of those materials to you. Applicable open-source and third-party license rights remain intact.</p>
      <p>You retain any rights you hold in your original musical creations. You are responsible for having permission to use material you import or share. Exporting a creation does not remove restrictions attached to third-party samples or other source material.</p>
      <p>When you choose an online feature that shares content or musical parameters, you permit us to process and transmit that information as needed to provide the feature. This permission is limited to operating the requested service; it does not transfer ownership of your creations. Other participants may receive the information that you choose to share.</p>
    </LegalSection>
    <LegalSection {...contents[5]}>
      <p>We make reasonable efforts to keep ChickenChess usable, but cannot promise uninterrupted availability, error-free play, permanent storage, or identical performance on every device. Audio quality and timing can depend on your browser, hardware, and local settings. Keep copies of creations that matter to you.</p>
      <p>We may update, suspend, or discontinue features for maintenance, security, technical, or operational reasons. Where practical and appropriate, we will provide notice of significant changes affecting accounts or stored information.</p>
      <p>Responsibility for loss is determined by applicable law. Nothing in these terms excludes liability that cannot legally be excluded, or limits mandatory consumer, privacy, or other statutory rights.</p>
    </LegalSection>
    <LegalSection {...contents[6]}>
      <p>You may stop using ChickenChess at any time. To request account deletion, contact <LegalContact />; we may need to verify ownership. Clearing browser data or revoking Google access is separate from deleting a ChickenChess account. Retention and deletion are explained in the Privacy Policy.</p>
      <p>We may restrict access when reasonably necessary to address a violation of these terms, protect other players, or secure the service. Where appropriate, we will explain the reason. You can contact us to request a review or correct a mistake. Any restriction remains subject to applicable law.</p>
    </LegalSection>
    <LegalSection {...contents[7]}>
      <p>The current terms remain available at this URL with their effective date. We may revise them as the service evolves and will communicate material changes appropriately. If a change requires your agreement under applicable law, we will request it.</p>
      <p>The laws and mandatory protections applicable to you govern as required by law. These terms do not impose mandatory private arbitration or remove your right to contact a competent court or authority.</p>
      <p>For support, questions about these terms, or disputes, email <LegalContact /> so we can try to resolve the issue.</p>
    </LegalSection>
  </LegalDocument>
}
