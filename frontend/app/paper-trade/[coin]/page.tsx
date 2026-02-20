import { Metadata } from "next";
import Link from "next/link";

interface Props {
  params: { coin: string };
}

// Supported coins for static generation
const COINS = [
  {
    slug: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    description: "the world's first and largest cryptocurrency",
    keywords: ["BTC", "bitcoin trading", "cryptocurrency", "digital gold"],
  },
  {
    slug: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    description: "the leading smart contract platform",
    keywords: ["ETH", "ethereum trading", "smart contracts", "DeFi"],
  },
  {
    slug: "solana",
    symbol: "SOL",
    name: "Solana",
    description: "the high-performance blockchain for DeFi and NFTs",
    keywords: ["SOL", "solana trading", "fast blockchain"],
  },
  {
    slug: "bnb",
    symbol: "BNB",
    name: "BNB",
    description: "Binance's native exchange token",
    keywords: ["BNB", "binance coin", "exchange token"],
  },
  {
    slug: "xrp",
    symbol: "XRP",
    name: "XRP",
    description: "Ripple's fast cross-border payment token",
    keywords: ["XRP", "ripple", "cross-border payments"],
  },
  {
    slug: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    description: "the meme coin that became a crypto phenomenon",
    keywords: ["DOGE", "dogecoin", "meme coin"],
  },
];

export function generateStaticParams() {
  return COINS.map((c) => ({ coin: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const coin = COINS.find((c) => c.slug === params.coin) || COINS[0];
  return {
    title: `Paper Trade ${coin.name} (${coin.symbol}) — Risk-Free Crypto Simulator | Terminal Zero`,
    description: `Practice ${coin.name} trading without risking real money. Master ${coin.symbol} ${coin.description} with real-time prices, leverage up to 25×, and AI coaching.`,
    keywords: [...coin.keywords, "paper trading", "crypto simulator", "risk-free", "Terminal Zero"],
    openGraph: {
      title: `Paper Trade ${coin.name} Free — Terminal Zero`,
      description: `Master ${coin.name} trading with zero risk. Real-time prices, live charts, and AI feedback.`,
    },
  };
}

// JSON-LD structured data
function CoinSchema({ coin }: { coin: typeof COINS[0] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${coin.name} Paper Trading Simulator`,
    applicationCategory: "FinanceApplication",
    description: `Practice ${coin.name} trading with simulated funds. Real market prices, no financial risk.`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    operatingSystem: "Web",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function PaperTradePage({ params }: Props) {
  const coin = COINS.find((c) => c.slug === params.coin) || COINS[0];
  const otherCoins = COINS.filter((c) => c.slug !== coin.slug);

  return (
    <>
      <CoinSchema coin={coin} />
      <div className="min-h-screen bg-[#07070f] text-slate-100">
        {/* Nav */}
        <nav className="border-b border-white/5 px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link href="/" className="text-lg font-bold text-indigo-400">
              Terminal Zero
            </Link>
            <Link
              href="/landing?auth=register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Start Free →
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <header className="px-6 py-16 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400">
              Free Paper Trading
            </div>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Paper Trade{" "}
              <span className="text-indigo-400">{coin.name}</span> — Zero Risk
            </h1>
            <p className="mb-8 text-lg text-slate-400">
              Practice {coin.symbol}/USDT trading with $10,000 in virtual funds. Real-time Bybit
              prices, up to 25× leverage, and AI coaching — completely free.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row justify-center">
              <Link
                href="/landing?auth=register"
                className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Start Trading {coin.symbol} Free
              </Link>
              <Link
                href="/landing?auth=login"
                className="rounded-xl border border-slate-700 px-8 py-3.5 text-base font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </header>

        {/* Features */}
        <section className="px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-slate-100">
              Everything You Need to Master {coin.name} Trading
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: "📈",
                  title: "Real-Time Prices",
                  desc: `Live ${coin.symbol}/USDT prices from Bybit. No 15-minute delays — the same data professional traders use.`,
                },
                {
                  icon: "🎯",
                  title: "1–25× Leverage",
                  desc: `Simulate leveraged ${coin.name} positions and learn to manage liquidation risk without real consequences.`,
                },
                {
                  icon: "🤖",
                  title: "AI Trade Coach",
                  desc: `After every trade, Claude AI analyzes your entry, exit, and risk management with personalized feedback.`,
                },
                {
                  icon: "📒",
                  title: "Trade Journal",
                  desc: `Automatically log every ${coin.symbol} trade with notes, screenshots, and performance analytics.`,
                },
                {
                  icon: "🏆",
                  title: "Leaderboards",
                  desc: `Compete against other traders globally on ${coin.name} return percentage and Sharpe ratio.`,
                },
                {
                  icon: "📊",
                  title: "Backtesting",
                  desc: `Test your ${coin.name} strategies against historical OHLCV data before risking real capital.`,
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/5 bg-white/3 p-6"
                >
                  <div className="mb-3 text-3xl">{f.icon}</div>
                  <h3 className="mb-2 font-semibold text-slate-100">{f.title}</h3>
                  <p className="text-sm text-slate-400">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-12 bg-white/2">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-bold">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: `Is ${coin.name} paper trading really free?`,
                  a: `Yes — completely free. You get $10,000 in virtual funds, real-time ${coin.symbol} prices, and unlimited trades on the free tier. No credit card required.`,
                },
                {
                  q: `How accurate are the ${coin.symbol} paper trading prices?`,
                  a: `Terminal Zero uses live WebSocket data from Bybit, one of the world's largest crypto exchanges. Prices match real market conditions tick-by-tick.`,
                },
                {
                  q: `Can I practice ${coin.name} futures trading?`,
                  a: `Yes — you can open leveraged long and short positions on ${coin.symbol}/USDT with up to 25× leverage, simulating the exact mechanics of perpetual futures.`,
                },
                {
                  q: "What happens when I'm ready to trade real money?",
                  a: "You can export your trade journal and performance stats to any exchange. Terminal Zero doesn't offer real trading — we focus on skill-building before you go live.",
                },
              ].map((faq) => (
                <div key={faq.q} className="rounded-xl border border-white/5 p-5">
                  <h3 className="mb-2 font-semibold text-slate-100">{faq.q}</h3>
                  <p className="text-sm text-slate-400">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Other coins */}
        <section className="px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-center text-xl font-bold text-slate-300">
              Also Available
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {otherCoins.map((c) => (
                <Link
                  key={c.slug}
                  href={`/paper-trade/${c.slug}`}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors"
                >
                  Paper Trade {c.symbol}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-3xl font-bold">
              Start Paper Trading {coin.name} Today
            </h2>
            <p className="mb-8 text-slate-400">
              Join thousands of traders practicing with Terminal Zero. Free forever.
            </p>
            <Link
              href="/landing?auth=register"
              className="rounded-xl bg-indigo-600 px-10 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Create Free Account →
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-slate-600">
          <p>
            Terminal Zero is a simulated trading environment. No real money is involved.
            Past paper trading performance does not guarantee future real trading results.
          </p>
          <div className="mt-3 flex justify-center gap-4">
            <Link href="/legal/privacy" className="hover:text-slate-400">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-slate-400">Terms</Link>
            <Link href="/legal/disclaimer" className="hover:text-slate-400">Disclaimer</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
