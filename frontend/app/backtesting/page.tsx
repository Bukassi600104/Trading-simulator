'use client'

import { useState } from 'react'
import { useFeatureGate } from '@/hooks/useFeatureGate'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT', 'XRP-USDT', 'DOGE-USDT']
const INTERVALS = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1h' },
  { value: '240', label: '4h' },
  { value: 'D', label: '1D' },
]
const ENTRY_CONDITIONS = [
  { id: 'rsi_below_30', name: 'RSI Oversold (< 30)' },
  { id: 'price_above_sma20', name: 'SMA20 Breakout' },
  { id: 'ema_crossover', name: 'EMA Crossover (12/26)' },
]
const EXIT_CONDITIONS = [
  { id: 'rsi_above_70', name: 'RSI Overbought (> 70)' },
  { id: 'price_below_sma20', name: 'SMA20 Breakdown' },
  { id: 'stop_loss_5pct', name: 'Stop Loss 5%' },
  { id: 'take_profit_10pct', name: 'Take Profit 10%' },
]

interface BacktestResult {
  symbol: string
  start_date: string
  end_date: string
  starting_capital: number
  final_capital: number
  total_return_pct: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  max_drawdown_pct: number
  sharpe_ratio: number
  equity_curve: Array<{ timestamp: string; equity: number }>
  trades: Array<{
    entry_date: string
    exit_date: string
    entry_price: number
    exit_price: number
    pnl: number
    pnl_pct: number
    side: string
  }>
}

function StatBox({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  )
}

function EquityCurve({ data, starting }: { data: Array<{ timestamp: string; equity: number }>; starting: number }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.equity))
  const min = Math.min(...data.map(d => d.equity))
  const range = max - min || 1
  const width = 600
  const height = 160
  const pad = 8

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - 2 * pad)
    const y = pad + ((max - d.equity) / range) * (height - 2 * pad)
    return `${x},${y}`
  })

  const isPositive = data[data.length - 1]?.equity >= starting
  const lineColor = isPositive ? '#22c55e' : '#ef4444'

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl p-4 mb-6">
      <p className="text-sm text-gray-400 mb-3 font-medium">Equity Curve</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <line
          x1={pad} y1={pad + ((max - starting) / range) * (height - 2 * pad)}
          x2={width - pad} y2={pad + ((max - starting) / range) * (height - 2 * pad)}
          stroke="#374151" strokeWidth="1" strokeDasharray="4,4"
        />
      </svg>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>{data[0]?.timestamp?.slice(0, 10)}</span>
        <span>{data[data.length - 1]?.timestamp?.slice(0, 10)}</span>
      </div>
    </div>
  )
}

export default function BacktestingPage() {
  const { hasAccess } = useFeatureGate('backtesting')

  const [symbol, setSymbol] = useState('BTC-USDT')
  const [interval, setInterval] = useState('60')
  const [entryCondition, setEntryCondition] = useState('rsi_below_30')
  const [exitCondition, setExitCondition] = useState('rsi_above_70')
  const [stopLoss, setStopLoss] = useState(0)
  const [takeProfit, setTakeProfit] = useState(0)
  const [startDate, setStartDate] = useState('2024-01-01')
  const [endDate, setEndDate] = useState('2024-12-31')
  const [capital, setCapital] = useState(10000)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runBacktest() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_URL}/api/backtest/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          symbol,
          interval,
          strategy: {
            entry_condition: entryCondition,
            exit_condition: exitCondition,
            stop_loss_pct: stopLoss,
            take_profit_pct: takeProfit,
          },
          starting_capital: capital,
          start_date: startDate,
          end_date: endDate,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || 'Backtest failed')
        return
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError('Network error — check your connection')
    } finally {
      setLoading(false)
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#070714] flex items-center justify-center p-6">
        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-10 max-w-md text-center">
          <div className="w-14 h-14 bg-indigo-500/15 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Pro Feature</h2>
          <p className="text-gray-400 text-sm mb-6">
            Backtesting is available on the Pro plan. Replay historical strategies with real Bybit OHLCV data.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Upgrade to Pro &rarr;
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070714] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Strategy Backtesting</h1>
          <p className="text-gray-400 text-sm">Replay strategies on historical Bybit data. Results are simulated — not financial advice.</p>
        </div>

        {/* Config Panel */}
        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="w-full bg-[#070714] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Interval</label>
              <select
                value={interval}
                onChange={e => setInterval(e.target.value)}
                className="w-full bg-[#070714] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Starting Capital (USDT)</label>
              <input
                type="number"
                value={capital}
                onChange={e => setCapital(Number(e.target.value))}
                min={100}
                max={1000000}
                className="w-full bg-[#070714] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-[#070714] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-[#070714] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entry Signal</label>
              <select
                value={entryCondition}
                onChange={e => setEntryCondition(e.target.value)}
                className="w-full bg-[#070714] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {ENTRY_CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Exit Signal</label>
              <select
                value={exitCondition}
                onChange={e => setExitCondition(e.target.value)}
                className="w-full bg-[#070714] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {EXIT_CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Stop Loss % (0 = disabled)</label>
              <input
                type="number"
                value={stopLoss}
                onChange={e => setStopLoss(Number(e.target.value))}
                min={0}
                max={50}
                step={0.5}
                className="w-full bg-[#070714] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Take Profit % (0 = disabled)</label>
              <input
                type="number"
                value={takeProfit}
                onChange={e => setTakeProfit(Number(e.target.value))}
                min={0}
                max={200}
                step={1}
                className="w-full bg-[#070714] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={runBacktest}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Running backtest...' : 'Run Backtest'}
          </button>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-700/50 rounded-xl p-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatBox
                label="Total Return"
                value={`${result.total_return_pct >= 0 ? '+' : ''}${result.total_return_pct?.toFixed(2)}%`}
                color={result.total_return_pct >= 0 ? 'text-green-400' : 'text-red-400'}
              />
              <StatBox
                label="Final Capital"
                value={`$${result.final_capital?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <StatBox
                label="Win Rate"
                value={`${result.win_rate?.toFixed(1)}%`}
                color={result.win_rate >= 50 ? 'text-green-400' : 'text-amber-400'}
              />
              <StatBox
                label="Total Trades"
                value={String(result.total_trades)}
              />
              <StatBox
                label="Max Drawdown"
                value={`${result.max_drawdown_pct?.toFixed(2)}%`}
                color="text-red-400"
              />
              <StatBox
                label="Sharpe Ratio"
                value={result.sharpe_ratio?.toFixed(2) ?? 'N/A'}
                color={result.sharpe_ratio >= 1 ? 'text-green-400' : 'text-gray-300'}
              />
              <StatBox label="Wins" value={String(result.winning_trades)} color="text-green-400" />
              <StatBox label="Losses" value={String(result.losing_trades)} color="text-red-400" />
            </div>

            {/* Equity Curve */}
            <EquityCurve data={result.equity_curve} starting={result.starting_capital} />

            {/* Trade Log */}
            {result.trades && result.trades.length > 0 && (
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1a1a2e]">
                  <h3 className="text-sm font-semibold text-white">Trade Log ({result.trades.length} trades)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a1a2e] text-gray-500">
                        <th className="text-left px-4 py-3">Entry</th>
                        <th className="text-left px-4 py-3">Exit</th>
                        <th className="text-right px-4 py-3">Entry $</th>
                        <th className="text-right px-4 py-3">Exit $</th>
                        <th className="text-right px-4 py-3">P&amp;L</th>
                        <th className="text-right px-4 py-3">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.slice(0, 50).map((trade, i) => (
                        <tr key={i} className="border-b border-[#1a1a2e]/50 hover:bg-[#1a1a2e]/30">
                          <td className="px-4 py-2 text-gray-400 font-mono">{trade.entry_date?.slice(0, 10)}</td>
                          <td className="px-4 py-2 text-gray-400 font-mono">{trade.exit_date?.slice(0, 10)}</td>
                          <td className="px-4 py-2 text-right font-mono text-gray-300">${trade.entry_price?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono text-gray-300">${trade.exit_price?.toFixed(2)}</td>
                          <td className={`px-4 py-2 text-right font-mono font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl?.toFixed(2)}
                          </td>
                          <td className={`px-4 py-2 text-right font-mono ${trade.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnl_pct >= 0 ? '+' : ''}{trade.pnl_pct?.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.trades.length > 50 && (
                    <p className="text-center text-xs text-gray-600 py-3">Showing first 50 of {result.trades.length} trades</p>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-600 mt-4 text-center">
              Hypothetical results only. No slippage, fees, or market impact modelled. Not financial advice.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
