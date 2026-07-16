import { ArrowLeft, ExternalLink, FileText, ShieldCheck } from 'lucide-react'
import { Logo } from './Logo'

export type LegalPageKind = 'privacy' | 'terms'

const repositoryUrl = 'https://github.com/ShinKhantPaing772/supply-chain-game'

function PrivacyPolicy() {
  return <>
    <p className="legalIntro">This policy explains how the Supply-Chain Management Game handles information when you use the game at <a href="https://scm.npaing.com">scm.npaing.com</a>.</p>
    <section><h2>1. Information stored by the game</h2><p>The game stores chapter saves, daily decisions, unlocked chapters, tutorial preferences, and best scores in your browser’s local storage. This information remains on your device and is not intentionally transmitted to a game account, game database, or game analytics service.</p></section>
    <section><h2>2. Information processed when the site loads</h2><p>Like most websites, the hosting service may process standard request information such as your IP address, browser type, requested page, and request time to deliver and secure the site. The game also loads fonts through the Google Fonts Web API. Google states that font requests can include an IP address, requested URL, user-agent header, and referrer, and that Google Fonts data is not used to profile end users or for targeted advertising. See <a href="https://developers.google.com/fonts/faq/privacy" target="_blank" rel="noreferrer">Google Fonts privacy information <ExternalLink size={13} /></a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy <ExternalLink size={13} /></a>.</p></section>
    <section><h2>3. How information is used</h2><p>Browser-stored game information is used only to restore saved months, calculate progress and scores, remember preferences, and let you continue playing. The game does not use advertising cookies, sell personal information, or create marketing profiles.</p></section>
    <section><h2>4. Your choices and deletion</h2><p>You can delete one month’s save from its campaign card or use <strong>Delete all progress</strong> to remove all game-created browser data. You can also clear site data through your browser settings. Removing browser storage is permanent and the game cannot recover it.</p></section>
    <section><h2>5. Children and students</h2><p>The game is intended as an educational simulation and does not ask players to create accounts or submit names, email addresses, or other profile information. Schools, guardians, and students should follow their own device and internet-use policies.</p></section>
    <section><h2>6. Security and retention</h2><p>Game saves remain until you delete them, clear browser storage, or the browser removes them. Because saves are stored on your device, anyone with access to the same browser profile may be able to access or remove them. No browser-storage system can be guaranteed to be error-free or permanently available.</p></section>
    <section><h2>7. Third-party links</h2><p>The game and these policies may link to third-party websites. Their privacy practices are governed by their own policies, not this one.</p></section>
    <section><h2>8. Changes and contact</h2><p>This policy may be updated as the game changes. The effective date above identifies the current version. Questions or concerns can be submitted through the project’s <a href={repositoryUrl} target="_blank" rel="noreferrer">GitHub repository <ExternalLink size={13} /></a>.</p></section>
  </>
}

function TermsOfService() {
  return <>
    <p className="legalIntro">These terms govern access to and use of the Supply-Chain Management Game at <a href="https://scm.npaing.com">scm.npaing.com</a>. By using the game, you agree to these terms.</p>
    <section><h2>1. Educational purpose</h2><p>The game is an educational simulation. Its demand, pricing, supplier, financial, and disruption models are simplified for learning and entertainment. Results are not professional supply-chain, financial, legal, or business advice and should not be used as the sole basis for real-world decisions.</p></section>
    <section><h2>2. Permission to use the game</h2><p>You may use the game for personal, classroom, and other lawful educational purposes. This permission is limited, non-exclusive, revocable, and does not transfer ownership of the game, its content, or its branding.</p></section>
    <section><h2>3. Acceptable use</h2><p>You agree not to interfere with the site, attempt unauthorized access, distribute malicious code, misuse the game to violate another person’s rights, or use automated activity that materially disrupts availability for others. You must comply with applicable laws and any school or workplace rules that apply to you.</p></section>
    <section><h2>4. Students and minors</h2><p>If you are not legally able to accept these terms yourself, use the game only with authorization from a parent, guardian, school, or other responsible adult.</p></section>
    <section><h2>5. Saves and availability</h2><p>Game progress is stored locally in your browser. You are responsible for the device and browser profile used to access it. Saves may be lost if site data is deleted, storage is unavailable, or the application changes. The game may be updated, interrupted, or discontinued without guaranteeing continuous availability.</p></section>
    <section><h2>6. Third-party services and open-source software</h2><p>The game relies on hosting, font delivery, and open-source software provided by third parties. Their services and licenses may have separate terms. Links to third-party sites are provided for convenience and do not imply control or endorsement.</p></section>
    <section><h2>7. Disclaimer</h2><p>The game is provided “as is” and “as available.” To the extent permitted by applicable law, no warranties are made that the game will always be available, secure, accurate, error-free, or suitable for a particular purpose. Rights that cannot legally be excluded remain unaffected.</p></section>
    <section><h2>8. Limitation of responsibility</h2><p>To the extent permitted by applicable law, the game’s operator and contributors are not responsible for indirect, incidental, or consequential losses arising from use of or inability to use the game, including loss of browser-stored progress. This limitation does not apply where liability cannot legally be limited.</p></section>
    <section><h2>9. Changes and contact</h2><p>These terms may be updated as the game evolves. Continued use after an update means the updated terms apply from their effective date. Questions can be submitted through the project’s <a href={repositoryUrl} target="_blank" rel="noreferrer">GitHub repository <ExternalLink size={13} /></a>.</p></section>
  </>
}

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const isPrivacy = kind === 'privacy'
  return <main className="legalScreen">
    <header className="homeHeader"><Logo /><a className="legalBack" href="#"><ArrowLeft size={15} /> Back to the game</a></header>
    <article className="legalDocument">
      <div className="legalTitle"><span>{isPrivacy ? <ShieldCheck size={26} /> : <FileText size={26} />}</span><div><p className="eyebrow lime">SCM / GAME · LEGAL</p><h1>{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h1><small>Effective July 15, 2026</small></div></div>
      {isPrivacy ? <PrivacyPolicy /> : <TermsOfService />}
    </article>
    <footer className="legalFooter"><span>Supply-Chain Management Game</span><nav aria-label="Legal pages"><a className={isPrivacy ? 'active' : ''} href="#/privacy">Privacy</a><a className={!isPrivacy ? 'active' : ''} href="#/terms">Terms</a></nav></footer>
  </main>
}
