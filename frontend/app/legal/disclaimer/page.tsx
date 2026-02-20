import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trading Disclaimer | Terminal Zero',
  description: 'Terminal Zero is a simulated trading environment. No real money or cryptocurrency is involved.',
}

export default function DisclaimerPage() {
  return (
    <article className="max-w-2xl mx-auto text-center">
      {/* Warning Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-white mb-4">Trading Disclaimer</h1>
      <p className="text-gray-500 text-sm mb-10">Please read this carefully before using Terminal Zero.</p>

      <div className="space-y-6 text-left">
        <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
          <p className="text-amber-300 font-semibold text-lg mb-3">Simulated Environment</p>
          <p className="text-gray-400 leading-relaxed">
            All trading shown on Terminal Zero is <span className="text-white font-bold">SIMULATED</span> using virtual
            currency. Every balance, profit, loss, and transaction on this platform is entirely fictional.
          </p>
        </div>

        <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
          <p className="text-amber-300 font-semibold text-lg mb-3">No Real Money</p>
          <p className="text-gray-400 leading-relaxed">
            No real money, cryptocurrency, or financial assets are involved in any aspect of Terminal Zero.
            You cannot deposit, withdraw, or transfer real funds through this platform.
          </p>
        </div>

        <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
          <p className="text-amber-300 font-semibold text-lg mb-3">No Performance Guarantee</p>
          <p className="text-gray-400 leading-relaxed">
            Past simulated performance does not predict future real-world results. Market conditions, liquidity,
            slippage, and other factors in live trading differ significantly from simulated environments.
          </p>
        </div>

        <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
          <p className="text-amber-300 font-semibold text-lg mb-3">Educational Purpose Only</p>
          <p className="text-gray-400 leading-relaxed">
            This platform is for educational purposes only. It is designed to help you learn about trading
            concepts, practice strategies, and build skills in a risk-free environment.
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-6">
          <p className="text-amber-300 font-semibold text-lg mb-3">Seek Professional Advice</p>
          <p className="text-gray-400 leading-relaxed">
            Consult a qualified financial advisor before making any real investment decisions. Terminal Zero is
            not a substitute for professional financial guidance. Real trading involves substantial risk of loss
            and is not suitable for every investor.
          </p>
        </div>
      </div>
    </article>
  )
}
