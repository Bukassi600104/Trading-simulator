import { MetadataRoute } from 'next'

const BASE = 'https://terminalzero.com'

// Paper trade coin pages
const COINS = ['bitcoin', 'ethereum', 'solana', 'bnb', 'xrp', 'dogecoin']

// Learn topic pages
const TOPICS = [
  'rsi',
  'moving-averages',
  'candlestick-patterns',
  'risk-management',
  'fibonacci-retracements',
  'macd',
  'leverage-trading',
  'market-structure',
  'dollar-cost-averaging',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const coinPages: MetadataRoute.Sitemap = COINS.map((coin) => ({
    url: `${BASE}/paper-trade/${coin}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  const learnPages: MetadataRoute.Sitemap = TOPICS.map((topic) => ({
    url: `${BASE}/learn/${topic}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.75,
  }))

  return [
    // Core pages
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/trade`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/dashboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/challenge`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/journal`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.65 },
    { url: `${BASE}/backtesting`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/defi`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/copy-trading`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/strategy-builder`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/african-market`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.55 },
    // Legal
    { url: `${BASE}/legal/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/legal/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/legal/disclaimer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    // Programmatic SEO
    ...coinPages,
    ...learnPages,
  ]
}
