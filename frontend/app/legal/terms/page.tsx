import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Terminal Zero',
  description: 'Terms and conditions for using the Terminal Zero crypto trading simulator.',
}

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-10">Effective: February 2026</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
        <p className="text-gray-400 leading-relaxed">
          By accessing or using Terminal Zero, you agree to be bound by these Terms of Service. If you do not
          agree to these terms, you must not use the service. We reserve the right to update these terms at any
          time, and continued use of the platform after changes constitutes acceptance of the revised terms.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">2. Nature of Service</h2>
        <p className="text-gray-400 leading-relaxed">
          Terminal Zero is a <span className="text-white font-semibold">SIMULATED trading environment</span>. No real
          cryptocurrency or money is involved at any time. All balances, profits, losses, and trading results shown
          on the platform are entirely fictional and exist solely for educational and skill-building purposes. Market
          prices displayed are sourced from live exchanges for realism but do not represent actual tradeable quotes.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">3. NOT Financial Advice</h2>
        <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5 mb-4">
          <p className="text-white font-bold text-lg mb-2">THIS IS NOT FINANCIAL ADVICE</p>
          <p className="text-gray-400 leading-relaxed">
            Terminal Zero does not provide investment advice, recommendations, or guidance on real-world financial
            decisions. Nothing on this platform should be construed as a recommendation to buy, sell, or hold any
            cryptocurrency or financial instrument. Simulated trading results do not guarantee or predict future
            real-world performance.
          </p>
        </div>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">4. Nigerian Regulatory Note</h2>
        <p className="text-gray-400 leading-relaxed">
          Terminal Zero is a trading simulator and educational tool. It is <span className="text-white font-semibold">NOT
          a Virtual Asset Service Provider (VASP)</span> and does not facilitate real cryptocurrency transactions.
          Terminal Zero does not hold, transfer, or exchange any virtual assets on behalf of users. As a simulation
          platform, it falls outside the regulatory scope of the Securities and Exchange Commission (SEC) of Nigeria
          and the Central Bank of Nigeria (CBN) frameworks governing VASPs and digital asset exchanges.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">5. User Accounts</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-400">
          <li>You must be at least 18 years of age to create an account.</li>
          <li>You must provide accurate and complete information during registration.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must notify us immediately of any unauthorized use of your account.</li>
          <li>One account per person. Multiple accounts may be terminated without notice.</li>
        </ul>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">6. Acceptable Use</h2>
        <p className="text-gray-400 leading-relaxed mb-4">You agree not to:</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-400">
          <li>Attempt to manipulate the simulated trading environment or exploit system vulnerabilities.</li>
          <li>Use automated scripts, bots, or tools to gain an unfair advantage in competitions or challenges.</li>
          <li>Misrepresent simulated trading results as real financial performance.</li>
          <li>Use the platform for any illegal or unauthorized purpose.</li>
          <li>Interfere with or disrupt the service or servers connected to the service.</li>
          <li>Harvest or collect user information without consent.</li>
        </ul>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual Property</h2>
        <p className="text-gray-400 leading-relaxed">
          All content, features, and functionality of Terminal Zero -- including but not limited to the design,
          software, text, graphics, logos, and icons -- are the exclusive property of Terminal Zero and are
          protected by copyright, trademark, and other intellectual property laws. You may not reproduce,
          distribute, or create derivative works without our prior written consent.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">8. Subscription and Billing</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-400">
          <li><span className="text-gray-300 font-medium">Auto-Renewal:</span> Subscriptions automatically renew at the end of each billing period unless cancelled.</li>
          <li><span className="text-gray-300 font-medium">Cancellation:</span> You may cancel your subscription at any time. You will retain access to paid features until the end of your current billing period.</li>
          <li><span className="text-gray-300 font-medium">Refunds (Annual Plans):</span> Annual plan subscribers may request a full refund within 7 days of purchase.</li>
          <li><span className="text-gray-300 font-medium">Refunds (Monthly Plans):</span> Monthly subscriptions are non-refundable.</li>
          <li><span className="text-gray-300 font-medium">Free Trial:</span> New users receive a 14-day free trial of Pro features. No payment is required during the trial period.</li>
          <li><span className="text-gray-300 font-medium">Price Changes:</span> We reserve the right to modify subscription pricing with 30 days advance notice.</li>
        </ul>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
        <p className="text-gray-400 leading-relaxed">
          Terminal Zero is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. We do not
          guarantee uninterrupted or error-free service. In no event shall Terminal Zero be liable for any
          indirect, incidental, special, consequential, or punitive damages arising from your use of the
          platform. Our total liability shall not exceed the amount you paid for the service in the 12 months
          preceding the claim.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">10. Termination</h2>
        <p className="text-gray-400 leading-relaxed">
          We reserve the right to suspend or terminate your account at our sole discretion, without prior notice,
          for conduct that we determine violates these Terms of Service or is harmful to other users, us, or
          third parties, or for any other reason. Upon termination, your right to use the service will immediately
          cease.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">11. Changes to Terms</h2>
        <p className="text-gray-400 leading-relaxed">
          We may revise these Terms of Service at any time. Material changes will be communicated via email or
          a prominent notice on the platform at least 14 days before they take effect. Your continued use of
          Terminal Zero after the effective date constitutes acceptance of the updated terms.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
        <p className="text-gray-400 leading-relaxed">
          For questions about these Terms of Service, contact us at{' '}
          <a href="mailto:legal@terminalzero.com" className="text-indigo-400 hover:underline">legal@terminalzero.com</a>.
        </p>
      </section>
    </article>
  )
}
