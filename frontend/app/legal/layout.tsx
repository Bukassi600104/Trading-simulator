import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070714]">
      <header className="border-b border-[#1a1a2e] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-bold text-indigo-400">Terminal Zero</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">&larr; Back to App</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-[#1a1a2e] px-6 py-6 text-center">
        <p className="text-xs text-gray-600">&copy; 2026 Terminal Zero. All rights reserved.</p>
      </footer>
    </div>
  )
}
