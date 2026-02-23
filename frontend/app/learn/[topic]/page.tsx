import { Metadata } from "next";
import Link from "next/link";

interface Props {
  params: { topic: string };
}

const TOPICS = [
  {
    slug: "rsi",
    title: "Relative Strength Index (RSI)",
    subtitle: "A momentum oscillator to identify overbought and oversold conditions",
    description:
      "RSI is one of the most widely used technical indicators. Learn how to calculate it, interpret readings, and apply RSI strategies to crypto trading.",
    sections: [
      {
        heading: "What is RSI?",
        content:
          "The Relative Strength Index (RSI) is a momentum oscillator that measures the speed and magnitude of price changes. Developed by J. Welles Wilder, RSI oscillates between 0 and 100. Values above 70 indicate overbought conditions; below 30 indicate oversold conditions.",
      },
      {
        heading: "RSI Formula",
        content:
          "RSI = 100 – (100 / (1 + RS)), where RS = Average Gain / Average Loss over N periods (default 14). Average Gain and Loss are smoothed using Wilder's exponential moving average.",
      },
      {
        heading: "Trading Signals",
        content:
          "Classic RSI signals: (1) Overbought/Oversold — RSI > 70 suggests potential reversal down; RSI < 30 suggests potential reversal up. (2) Divergence — when price makes new highs but RSI does not, bearish divergence signals weakness. (3) Centerline crossover — RSI crossing 50 signals trend direction.",
      },
      {
        heading: "RSI in Crypto Markets",
        content:
          "Crypto markets are more volatile than traditional assets. RSI levels of 80/20 often work better than the standard 70/30. During strong bull trends, RSI can stay above 70 for extended periods — use RSI in context with trend direction.",
      },
      {
        heading: "Practice on Terminal Zero",
        content:
          "Terminal Zero displays real-time RSI on all charts and lets you backtest RSI-based strategies against historical crypto data. Use the Strategy Builder to automate RSI rules.",
      },
    ],
  },
  {
    slug: "moving-averages",
    title: "Moving Averages",
    subtitle: "Trend-following indicators to smooth price data and identify direction",
    description:
      "Moving averages are the foundation of trend following. Learn SMA, EMA, their crossovers, and how to use them effectively in crypto markets.",
    sections: [
      {
        heading: "Simple vs Exponential Moving Average",
        content:
          "SMA (Simple Moving Average) gives equal weight to all periods. EMA (Exponential Moving Average) gives more weight to recent prices, making it more responsive to new data. For crypto trading, EMA is usually preferred due to faster reaction to volatile price moves.",
      },
      {
        heading: "Golden Cross & Death Cross",
        content:
          "Golden Cross: The 50-period MA crosses above the 200-period MA — bullish signal. Death Cross: The 50-period MA crosses below the 200-period MA — bearish signal. These work well on daily timeframes for identifying major trend shifts in Bitcoin and Ethereum.",
      },
      {
        heading: "Dynamic Support & Resistance",
        content:
          "Moving averages act as dynamic support and resistance. The 20 EMA is popular on shorter timeframes; the 200 SMA is widely watched on daily charts. Price bouncing off the 200 SMA in an uptrend is a classic entry signal.",
      },
    ],
  },
  {
    slug: "candlestick-patterns",
    title: "Candlestick Patterns",
    subtitle: "Read price action through candlestick formations",
    description:
      "Japanese candlestick charts reveal market psychology. Learn the most reliable reversal and continuation patterns used by professional crypto traders.",
    sections: [
      {
        heading: "Reading Candlesticks",
        content:
          "Each candle shows open, high, low, and close (OHLC). A green/white candle means close > open (bullish); red/black means close < open (bearish). The wicks show the full range of the move, while the body shows where price started and ended.",
      },
      {
        heading: "Reversal Patterns",
        content:
          "Key reversal patterns: Doji (indecision — open ≈ close), Hammer (bullish reversal at support — small body, long lower wick), Shooting Star (bearish reversal at resistance — small body, long upper wick), Engulfing (a candle that completely encloses the previous).",
      },
      {
        heading: "Continuation Patterns",
        content:
          "Three White Soldiers (3 consecutive green candles — strong bullish momentum), Three Black Crows (3 consecutive red — bearish), Inside Bar / Harami (pause in trend, potential breakout setup).",
      },
    ],
  },
  {
    slug: "risk-management",
    title: "Risk Management in Crypto",
    subtitle: "Protect your capital — the most important trading skill",
    description:
      "Professional traders obsess over risk management. Learn position sizing, stop losses, risk-reward ratios, and how to survive in volatile crypto markets.",
    sections: [
      {
        heading: "The 1-2% Rule",
        content:
          "Never risk more than 1-2% of your portfolio on a single trade. If you have $10,000, your maximum loss per trade is $100-200. This rule prevents any single bad trade from significantly damaging your account.",
      },
      {
        heading: "Stop Losses",
        content:
          "Always use stop losses. Determine your stop loss before entering a trade, not after. Place stops below key support (for longs) or above key resistance (for shorts). Avoid round number traps.",
      },
      {
        heading: "Risk-Reward Ratio",
        content:
          "Only take trades with a favorable risk-reward ratio (minimum 1:2 — risk $1 to make $2). With a 1:2 ratio and 40% win rate, you're still profitable. Target 1:3 or higher for best results.",
      },
      {
        heading: "Leverage and Liquidation",
        content:
          "Leverage amplifies both gains and losses. At 10× leverage, a 10% adverse move wipes out your position. Use leverage only when you have edge, keep it low (2-5× max for most traders), and always calculate liquidation price before entering.",
      },
    ],
  },
  {
    slug: "fibonacci-retracements",
    title: "Fibonacci Retracements",
    subtitle: "Natural price levels that traders watch worldwide",
    description:
      "Fibonacci levels are among the most-watched price levels in crypto. Learn how to draw them, identify key retracements, and use them for entry and target setting.",
    sections: [
      {
        heading: "The Key Levels",
        content:
          "Core Fibonacci retracement levels: 23.6%, 38.2%, 50%, 61.8% (the Golden Ratio), and 78.6%. Draw from a swing low to swing high (or vice versa) to identify where price might retrace before continuing the trend.",
      },
      {
        heading: "The 61.8% Golden Ratio",
        content:
          "The 61.8% level (derived from the golden ratio φ) is the most important. In strong trends, retracements to the 61.8% level often hold as support, providing high-probability entries with tight stops.",
      },
      {
        heading: "Fibonacci Extensions",
        content:
          "Extensions project where price might go after the retracement. Common targets: 127.2%, 161.8%, 261.8% of the original move. Use extensions to set take-profit targets.",
      },
    ],
  },
  {
    slug: "macd",
    title: "MACD Indicator",
    subtitle: "Trend and momentum in one indicator",
    description:
      "MACD (Moving Average Convergence Divergence) combines trend following and momentum. Learn to read the MACD line, signal line, and histogram for trading signals.",
    sections: [
      {
        heading: "MACD Components",
        content:
          "MACD Line = 12-period EMA – 26-period EMA. Signal Line = 9-period EMA of MACD Line. Histogram = MACD Line – Signal Line. When the MACD line crosses above the signal line, it's bullish; below is bearish.",
      },
      {
        heading: "Divergence Signals",
        content:
          "MACD divergence is powerful: if price makes new highs but MACD makes lower highs, bearish divergence warns of trend exhaustion. Bullish divergence (price lower lows, MACD higher lows) signals potential reversal.",
      },
      {
        heading: "Zero Line Crosses",
        content:
          "MACD crossing above zero = the short-term EMA is above the long-term EMA (bullish trend). Use zero line crosses to confirm trend direction and align your trades with momentum.",
      },
    ],
  },
  {
    slug: "leverage-trading",
    title: "Leverage Trading Explained",
    subtitle: "Understanding margin, liquidation, and the risks of leverage",
    description:
      "Leverage lets you control a larger position with less capital — but dramatically increases risk. Master leverage mechanics before trading with real money.",
    sections: [
      {
        heading: "How Leverage Works",
        content:
          "At 10× leverage, $1,000 controls a $10,000 position. If BTC rises 5%, your profit is $500 (50% return). If BTC falls 5%, your loss is $500 (50% of your capital) — and at ~10% adverse move, you're liquidated.",
      },
      {
        heading: "Margin and Liquidation",
        content:
          "Initial margin = position size / leverage. Maintenance margin is the minimum balance to keep a position open (typically 0.5%). When unrealized losses reduce your balance below maintenance margin, your position is forcibly closed (liquidated).",
      },
      {
        heading: "Safe Leverage Usage",
        content:
          "Most professional traders use 2-5× leverage maximum. High leverage (20-100×) is speculation, not trading. Always calculate liquidation price before entering. Use isolated margin mode to cap losses to your position margin.",
      },
    ],
  },
  {
    slug: "market-structure",
    title: "Market Structure",
    subtitle: "Read the market's framework to trade with the trend",
    description:
      "Market structure is the framework of higher highs/lows and lower highs/lows that defines trend direction. Learn to read structure before applying any indicators.",
    sections: [
      {
        heading: "Uptrend Structure",
        content:
          "An uptrend is defined by Higher Highs (HH) and Higher Lows (HL). Each new high exceeds the previous high, and each pullback holds above the previous low. This shows bulls are in control.",
      },
      {
        heading: "Break of Structure",
        content:
          "A Break of Structure (BOS) occurs when price breaks a key high or low. In an uptrend, a break of the most recent HL is a warning sign. A break of the previous swing low (Change of Character) signals a potential trend reversal.",
      },
      {
        heading: "Trading with Structure",
        content:
          "Only buy in uptrend structure; only sell in downtrend structure. Enter on pullbacks to previous highs-turned-support in uptrends. Combining structure with indicators dramatically improves trade quality.",
      },
    ],
  },
  {
    slug: "dollar-cost-averaging",
    title: "Dollar-Cost Averaging (DCA)",
    subtitle: "A systematic approach to building crypto positions",
    description:
      "DCA removes the stress of timing the market by spreading purchases over time. Learn when DCA outperforms lump-sum investing and how to implement it effectively.",
    sections: [
      {
        heading: "What is DCA?",
        content:
          "Dollar-cost averaging means investing a fixed amount at regular intervals regardless of price. If you invest $100 in BTC every month, you buy more when price is low and less when it's high, averaging down your cost basis over time.",
      },
      {
        heading: "DCA vs Lump Sum",
        content:
          "Lump sum outperforms DCA in consistently rising markets (~66% of the time historically). DCA outperforms in volatile and declining markets. For high-volatility crypto assets, DCA reduces the risk of mistiming the market at a peak.",
      },
      {
        heading: "Advanced DCA Strategies",
        content:
          "Value Averaging: increase purchase size when price is below trend, decrease when above. DCA into dips: set automatic buys triggered by X% price drops. Both improve on simple time-based DCA in volatile markets.",
      },
    ],
  },
];

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = TOPICS.find((t) => t.slug === params.topic) || TOPICS[0];
  return {
    title: `${topic.title} — Crypto Trading Guide | Terminal Zero`,
    description: topic.description,
    keywords: [topic.slug, "crypto trading", "learn trading", "Terminal Zero"],
    openGraph: {
      title: `${topic.title} | Terminal Zero Learn`,
      description: topic.subtitle,
    },
  };
}

export default function LearnPage({ params }: Props) {
  const topic = TOPICS.find((t) => t.slug === params.topic) || TOPICS[0];
  const others = TOPICS.filter((t) => t.slug !== topic.slug).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#07070f] text-slate-100">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#11d473]">
            Terminal Zero
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/learn/rsi" className="text-sm text-slate-400 hover:text-slate-200">
              Learn
            </Link>
            <Link
              href="/landing?auth=register"
              className="rounded-lg bg-[#11d473] px-4 py-2 text-sm font-semibold text-[#020617] hover:bg-[#0fa866] transition-colors"
            >
              Practice Free →
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex gap-8 lg:gap-12">
          {/* Main content */}
          <article className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-300">Home</Link>
              {" / "}
              <span>Learn</span>
              {" / "}
              <span className="text-slate-300">{topic.title}</span>
            </nav>

            <header className="mb-8">
              <h1 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {topic.title}
              </h1>
              <p className="text-lg text-slate-400">{topic.subtitle}</p>
            </header>

            {/* Sections */}
            <div className="space-y-8">
              {topic.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="mb-3 text-xl font-bold text-slate-100">{section.heading}</h2>
                  <p className="text-slate-400 leading-relaxed">{section.content}</p>
                </section>
              ))}
            </div>

            {/* Practice CTA */}
            <div className="mt-10 rounded-2xl border border-[#11d473]/20 bg-[#11d473]/5 p-6">
              <h3 className="mb-2 text-lg font-bold text-[#6ee7b7]">
                Practice {topic.title} Risk-Free
              </h3>
              <p className="mb-4 text-sm text-slate-400">
                Apply what you've learned with $10,000 in virtual funds. Real market prices, zero
                financial risk.
              </p>
              <Link
                href="/landing?auth=register"
                className="inline-block rounded-lg bg-[#11d473] px-6 py-2.5 text-sm font-semibold text-[#020617] hover:bg-[#0fa866] transition-colors"
              >
                Start Paper Trading Free →
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <div className="sticky top-6">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                More Guides
              </h3>
              <div className="space-y-2">
                {others.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/learn/${t.slug}`}
                    className="block rounded-lg p-3 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
                  >
                    {t.title}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-slate-600">
        <p>
          For educational purposes only. This is not financial advice. Practice with simulated
          funds before trading real money.
        </p>
        <div className="mt-3 flex justify-center gap-4">
          <Link href="/legal/privacy" className="hover:text-slate-400">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-slate-400">Terms</Link>
          <Link href="/legal/disclaimer" className="hover:text-slate-400">Disclaimer</Link>
        </div>
      </footer>
    </div>
  );
}
