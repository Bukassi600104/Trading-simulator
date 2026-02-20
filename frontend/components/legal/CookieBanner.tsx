'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }
  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d1a] border-t border-[#1a1a2e] p-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-400 text-center sm:text-left">
          We use essential cookies for authentication and session management. Read our{' '}
          <Link href="/legal/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>.
        </p>
        <div className="flex gap-3 shrink-0">
          <button onClick={decline} className="px-4 py-1.5 text-sm text-gray-400 border border-[#1a1a2e] rounded-lg hover:border-gray-500 transition-colors">Decline</button>
          <button onClick={accept} className="px-4 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">Accept</button>
        </div>
      </div>
    </div>
  )
}
