import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Terminal Zero',
  description: 'How Terminal Zero collects, uses, and protects your personal data.',
}

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Effective: February 2026</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
        <p className="text-gray-400 leading-relaxed">
          Terminal Zero (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates a simulated cryptocurrency trading platform
          designed for educational purposes. This Privacy Policy explains how we collect, use, store, and protect
          your personal information when you use our service. No real cryptocurrency or money is involved in our
          platform at any time.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">2. Data We Collect</h2>
        <p className="text-gray-400 leading-relaxed mb-4">We collect the following categories of information:</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-400">
          <li><span className="text-gray-300 font-medium">Account Information:</span> Email address, display name, and hashed password.</li>
          <li><span className="text-gray-300 font-medium">Trading Activity:</span> Simulated orders, positions, portfolio balances, journal entries, and challenge progress.</li>
          <li><span className="text-gray-300 font-medium">Technical Data:</span> IP address, browser type, device information, and operating system.</li>
          <li><span className="text-gray-300 font-medium">Usage Data:</span> Pages visited, features used, session duration, and interaction patterns.</li>
          <li><span className="text-gray-300 font-medium">Payment Data:</span> Subscription tier and billing status (payment details are processed by third-party providers and never stored on our servers).</li>
        </ul>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Data</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-400">
          <li>Provide, maintain, and improve the Terminal Zero trading simulator.</li>
          <li>Manage your account, subscriptions, and free trial periods.</li>
          <li>Generate analytics and performance insights for your trading activity.</li>
          <li>Send transactional emails (account verification, password resets, trial notifications).</li>
          <li>Detect and prevent abuse, fraud, and unauthorized access.</li>
          <li>Comply with legal obligations.</li>
        </ul>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">4. Data Storage</h2>
        <p className="text-gray-400 leading-relaxed">
          Your data is stored on Supabase PostgreSQL databases hosted on secure cloud infrastructure. All data
          is encrypted in transit (TLS 1.2+) and at rest. Access to production databases is restricted to
          authorized personnel with multi-factor authentication.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-400">
          <li><span className="text-gray-300 font-medium">Account data:</span> Retained until you request deletion of your account.</li>
          <li><span className="text-gray-300 font-medium">Server logs:</span> Retained for 90 days, then automatically purged.</li>
          <li><span className="text-gray-300 font-medium">Database backups:</span> Retained for 30 days on a rolling basis.</li>
          <li><span className="text-gray-300 font-medium">Payment records:</span> Retained as required by applicable tax and financial regulations.</li>
        </ul>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">6. Third-Party Services</h2>
        <p className="text-gray-400 leading-relaxed mb-4">We share data with the following trusted third parties only as necessary to provide our service:</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-400">
          <li><span className="text-gray-300 font-medium">Stripe:</span> Payment processing for subscriptions (US/international).</li>
          <li><span className="text-gray-300 font-medium">Paystack:</span> Payment processing for African markets.</li>
          <li><span className="text-gray-300 font-medium">Sentry:</span> Error tracking and application monitoring.</li>
          <li><span className="text-gray-300 font-medium">Bybit:</span> Read-only market data feed for real-time prices. No Bybit account is required to use Terminal Zero.</li>
        </ul>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights (GDPR)</h2>
        <p className="text-gray-400 leading-relaxed mb-4">If you are located in the European Economic Area, you have the following rights:</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-400">
          <li><span className="text-gray-300 font-medium">Access:</span> Request a copy of the personal data we hold about you.</li>
          <li><span className="text-gray-300 font-medium">Rectification:</span> Request correction of inaccurate or incomplete data.</li>
          <li><span className="text-gray-300 font-medium">Erasure:</span> Request deletion of your personal data (&quot;right to be forgotten&quot;).</li>
          <li><span className="text-gray-300 font-medium">Data Portability:</span> Receive your data in a structured, machine-readable format.</li>
          <li><span className="text-gray-300 font-medium">Object:</span> Object to processing of your data for specific purposes.</li>
        </ul>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">8. How to Exercise Your Rights</h2>
        <p className="text-gray-400 leading-relaxed">
          To exercise any of your data rights, contact us at{' '}
          <a href="mailto:privacy@terminalzero.com" className="text-[#11d473] hover:underline">privacy@terminalzero.com</a>.
          We will respond to your request within 30 days. You may be asked to verify your identity before we
          process your request.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">9. Cookies</h2>
        <p className="text-gray-400 leading-relaxed">
          Terminal Zero uses <span className="text-gray-300 font-medium">essential cookies only</span> for authentication
          and session management. These cookies are strictly necessary for the platform to function and cannot be
          disabled. We offer an opt-in for analytics cookies, which help us understand how users interact with our
          platform. No advertising or tracking cookies are used.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">10. Data Sale</h2>
        <p className="text-gray-400 leading-relaxed font-medium">
          We do not sell, rent, or trade your personal data to third parties. Your information is used solely to
          provide and improve the Terminal Zero service.
        </p>
      </section>

      <hr className="border-[#1a1a2e] my-8" />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">11. Contact</h2>
        <p className="text-gray-400 leading-relaxed">
          For any privacy-related questions or concerns, contact us at{' '}
          <a href="mailto:privacy@terminalzero.com" className="text-[#11d473] hover:underline">privacy@terminalzero.com</a>.
        </p>
      </section>
    </article>
  )
}
