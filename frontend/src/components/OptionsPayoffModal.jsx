import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts'
import {
  Zap,
  X,
  Sliders,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Percent,
  Layers,
  ShieldCheck,
  BarChart2
} from 'lucide-react'

// Standard normal cumulative distribution function (CDF) approximation
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp(-x * x / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x >= 0 ? 1 - p : p
}

// Standard normal probability density function (PDF)
function normalPDF(x) {
  return 0.3989423 * Math.exp(-x * x / 2)
}

// Black-Scholes Formula & Greeks Calculation
function calculateBlackScholes(S, K, T_days, r = 0.05, v_pct = 30, optionType = 'call') {
  const T = Math.max(T_days / 365, 0.0001)
  const v = Math.max(v_pct / 100, 0.01)

  const d1 = (Math.log(S / K) + (r + (v * v) / 2) * T) / (v * Math.sqrt(T))
  const d2 = d1 - v * Math.sqrt(T)

  let price, delta, theta

  if (optionType === 'call') {
    price = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2)
    delta = normalCDF(d1)
    theta = (- (S * normalPDF(d1) * v) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normalCDF(d2)) / 365
  } else {
    price = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1)
    delta = normalCDF(d1) - 1
    theta = (- (S * normalPDF(d1) * v) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365
  }

  const gamma = normalPDF(d1) / (S * v * Math.sqrt(T))
  const vega = (S * normalPDF(d1) * Math.sqrt(T)) / 100

  return {
    price: Math.max(price, 0),
    delta: parseFloat(delta.toFixed(4)),
    gamma: parseFloat(gamma.toFixed(4)),
    theta: parseFloat(theta.toFixed(4)),
    vega: parseFloat(vega.toFixed(4))
  }
}

const STRATEGY_PRESETS = [
  { id: 'CALL', label: 'Long Call', desc: 'Bullish strategy with unlimited upside' },
  { id: 'PUT', label: 'Long Put', desc: 'Bearish hedge against downside fall' },
  { id: 'BULL_SPREAD', label: 'Bull Call Spread', desc: 'Capped risk & capped reward bullish spread' },
  { id: 'BEAR_SPREAD', label: 'Bear Put Spread', desc: 'Capped risk & capped reward bearish spread' },
  { id: 'STRADDLE', label: 'Long Straddle', desc: 'Neutral high-volatility breakout strategy' },
  { id: 'IRON_CONDOR', label: 'Iron Condor', desc: 'Range-bound theta decay income strategy' }
]

export default function OptionsPayoffModal({
  isOpen = false,
  onClose,
  signals = [],
  initialSymbol = 'QQQ'
}) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [strategy, setStrategy] = useState('BULL_SPREAD')

  // Parameter Inputs State
  const [spotPrice, setSpotPrice] = useState(480)
  const [strike1, setStrike1] = useState(480)
  const [strike2, setStrike2] = useState(490)
  const [strike3, setStrike3] = useState(470)
  const [strike4, setStrike4] = useState(500)
  const [daysToExpiry, setDaysToExpiry] = useState(7)
  const [impliedVol, setImpliedVol] = useState(25)

  // ESC Key Listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Sync spot price when symbol changes or modal opens
  useEffect(() => {
    const match = (signals || []).find(s => (s.symbol || '').toUpperCase() === symbol.toUpperCase())
    let price = 480
    if (match) {
      const cleaned = String(match.current_price || match.close_price || '').replace(/[^0-9.-]/g, '')
      price = parseFloat(cleaned) || 480
    }
    setSpotPrice(price)
    setStrike1(Math.round(price))
    setStrike2(Math.round(price * 1.03))
    setStrike3(Math.round(price * 0.97))
    setStrike4(Math.round(price * 1.06))
  }, [symbol, signals, isOpen])


  // Compute Black-Scholes Greeks for active strategy
  const greeks = useMemo(() => {
    const S = spotPrice
    const T = daysToExpiry
    const iv = impliedVol

    if (strategy === 'CALL') {
      return calculateBlackScholes(S, strike1, T, 0.05, iv, 'call')
    } else if (strategy === 'PUT') {
      return calculateBlackScholes(S, strike1, T, 0.05, iv, 'put')
    } else if (strategy === 'BULL_SPREAD') {
      const c1 = calculateBlackScholes(S, strike1, T, 0.05, iv, 'call')
      const c2 = calculateBlackScholes(S, strike2, T, 0.05, iv, 'call')
      return {
        price: c1.price - c2.price,
        delta: parseFloat((c1.delta - c2.delta).toFixed(4)),
        gamma: parseFloat((c1.gamma - c2.gamma).toFixed(4)),
        theta: parseFloat((c1.theta - c2.theta).toFixed(4)),
        vega: parseFloat((c1.vega - c2.vega).toFixed(4))
      }
    } else if (strategy === 'BEAR_SPREAD') {
      const p1 = calculateBlackScholes(S, strike1, T, 0.05, iv, 'put')
      const p2 = calculateBlackScholes(S, strike3, T, 0.05, iv, 'put')
      return {
        price: p1.price - p2.price,
        delta: parseFloat((p1.delta - p2.delta).toFixed(4)),
        gamma: parseFloat((p1.gamma - p2.gamma).toFixed(4)),
        theta: parseFloat((p1.theta - p2.theta).toFixed(4)),
        vega: parseFloat((p1.vega - p2.vega).toFixed(4))
      }
    } else if (strategy === 'STRADDLE') {
      const c1 = calculateBlackScholes(S, strike1, T, 0.05, iv, 'call')
      const p1 = calculateBlackScholes(S, strike1, T, 0.05, iv, 'put')
      return {
        price: c1.price + p1.price,
        delta: parseFloat((c1.delta + p1.delta).toFixed(4)),
        gamma: parseFloat((c1.gamma + p1.gamma).toFixed(4)),
        theta: parseFloat((c1.theta + p1.theta).toFixed(4)),
        vega: parseFloat((c1.vega + p1.vega).toFixed(4))
      }
    } else {
      // IRON CONDOR
      const pPutLong = calculateBlackScholes(S, strike3, T, 0.05, iv, 'put')
      const pPutShort = calculateBlackScholes(S, strike1, T, 0.05, iv, 'put')
      const pCallShort = calculateBlackScholes(S, strike2, T, 0.05, iv, 'call')
      const pCallLong = calculateBlackScholes(S, strike4, T, 0.05, iv, 'call')
      return {
        price: (pPutShort.price + pCallShort.price) - (pPutLong.price + pCallLong.price),
        delta: parseFloat((-pPutLong.delta + pPutShort.delta - pCallShort.delta + pCallLong.delta).toFixed(4)),
        gamma: parseFloat((-pPutLong.gamma + pPutShort.gamma - pCallShort.gamma + pCallLong.gamma).toFixed(4)),
        theta: parseFloat((-pPutLong.theta + pPutShort.theta - pCallShort.theta + pCallLong.theta).toFixed(4)),
        vega: parseFloat((-pPutLong.vega + pPutShort.vega - pCallShort.vega + pCallLong.vega).toFixed(4))
      }
    }
  }, [spotPrice, strike1, strike2, strike3, strike4, daysToExpiry, impliedVol, strategy])

  // Generate 2D Profit/Loss Payoff Curve Data (-25% to +25% price range)
  const payoffData = useMemo(() => {
    const points = []
    const minP = spotPrice * 0.75
    const maxP = spotPrice * 1.25
    const step = (maxP - minP) / 50

    const initialCost = greeks.price * 100 // 1 contract = 100 shares

    for (let price = minP; price <= maxP; price += step) {
      let pnl = 0

      if (strategy === 'CALL') {
        const intrinsic = Math.max(price - strike1, 0)
        pnl = (intrinsic * 100) - initialCost
      } else if (strategy === 'PUT') {
        const intrinsic = Math.max(strike1 - price, 0)
        pnl = (intrinsic * 100) - initialCost
      } else if (strategy === 'BULL_SPREAD') {
        const intrinsic1 = Math.max(price - strike1, 0)
        const intrinsic2 = Math.max(price - strike2, 0)
        pnl = ((intrinsic1 - intrinsic2) * 100) - initialCost
      } else if (strategy === 'BEAR_SPREAD') {
        const intrinsic1 = Math.max(strike1 - price, 0)
        const intrinsic3 = Math.max(strike3 - price, 0)
        pnl = ((intrinsic1 - intrinsic3) * 100) - initialCost
      } else if (strategy === 'STRADDLE') {
        const intrinsicCall = Math.max(price - strike1, 0)
        const intrinsicPut = Math.max(strike1 - price, 0)
        pnl = ((intrinsicCall + intrinsicPut) * 100) - initialCost
      } else {
        // IRON CONDOR
        const pPutLong = Math.max(strike3 - price, 0)
        const pPutShort = Math.max(strike1 - price, 0)
        const pCallShort = Math.max(price - strike2, 0)
        const pCallLong = Math.max(price - strike4, 0)
        const payoffAtExp = (pPutShort + pCallShort) - (pPutLong + pCallLong)
        pnl = (initialCost) - (payoffAtExp * 100)
      }

      points.push({
        underlyingPrice: parseFloat(price.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2)),
        profitZone: pnl >= 0 ? pnl : 0,
        lossZone: pnl < 0 ? pnl : 0
      })
    }

    return points
  }, [spotPrice, strike1, strike2, strike3, strike4, strategy, greeks.price])

  // Calculate Max Profit, Max Loss & Breakeven
  const metrics = useMemo(() => {
    const pnlList = payoffData.map(d => d.pnl)
    const maxProfitVal = Math.max(...pnlList)
    const maxLossVal = Math.min(...pnlList)

    const isProfitInfinite = strategy === 'CALL' || strategy === 'STRADDLE'
    const maxProfitStr = isProfitInfinite ? 'Unlimited ∞' : `$${maxProfitVal.toFixed(2)}`
    const maxLossStr = `$${Math.abs(maxLossVal).toFixed(2)}`

    // Breakeven Prices
    let breakevenStr = ''
    if (strategy === 'CALL') breakevenStr = `$${(strike1 + greeks.price).toFixed(2)}`
    else if (strategy === 'PUT') breakevenStr = `$${(strike1 - greeks.price).toFixed(2)}`
    else if (strategy === 'BULL_SPREAD') breakevenStr = `$${(strike1 + greeks.price).toFixed(2)}`
    else if (strategy === 'BEAR_SPREAD') breakevenStr = `$${(strike1 - greeks.price).toFixed(2)}`
    else if (strategy === 'STRADDLE') breakevenStr = `$${(strike1 - greeks.price).toFixed(2)} / $${(strike1 + greeks.price).toFixed(2)}`
    else breakevenStr = `$${(strike1 - greeks.price).toFixed(2)} / $${(strike2 + greeks.price).toFixed(2)}`

    return {
      maxProfit: maxProfitStr,
      maxLoss: maxLossStr,
      breakeven: breakevenStr,
      netCost: `$${(greeks.price * 100).toFixed(2)}`
    }
  }, [payoffData, strategy, strike1, strike2, greeks.price])

  const tickerOptions = useMemo(() => {
    const list = ['QQQ', 'NVDA', 'BTC-USD', 'SPY', 'TSLA', 'AMD', 'META', 'AAPL', 'MSFT', 'SOL-USD', 'ETH-USD']
    const sigSyms = (signals || []).map(s => (s.symbol || '').toUpperCase()).filter(Boolean)
    return Array.from(new Set([...sigSyms, ...list])).sort()
  }, [signals])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="options-modal-root">
          {/* Translucent Backdrop */}
          <motion.div
            className="options-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal Shell Card */}
          <div className="options-modal-wrapper">
            <motion.div
              className="options-card"
              initial={{ opacity: 0, scale: 0.96, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -15 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {/* Header Bar */}
              <div className="options-header">
                <div className="header-title-group">
                  <div className="options-icon-badge">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h2 className="options-title">0DTE Options Payoff & Black-Scholes Greeks Engine</h2>
                    <p className="options-sub">Interactive 2D strategy payoff graph, sensitivity matrix, and risk analytics</p>
                  </div>
                </div>

                <div className="header-controls font-mono">
                  <select
                    className="options-select"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                  >
                    {tickerOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button className="options-close-btn" onClick={onClose} title="Close (ESC)">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Strategy Selector Pills */}
              <div className="strategy-pill-bar">
                {STRATEGY_PRESETS.map(s => (
                  <button
                    key={s.id}
                    className={`strategy-pill ${strategy === s.id ? 'active' : ''}`}
                    onClick={() => setStrategy(s.id)}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Modal Main Body */}
              <div className="options-body">
                {/* Left Panel: Inputs & Black-Scholes Greeks HUD */}
                <div className="options-left-panel">
                  {/* Parameter Inputs Card */}
                  <div className="param-card">
                    <div className="card-section-title">
                      <Sliders size={13} />
                      <span>STRATEGY PARAMETERS</span>
                    </div>

                    <div className="param-grid">
                      <div className="param-group">
                        <label className="param-label">UNDERLYING SPOT ($)</label>
                        <input
                          type="number"
                          className="param-input font-mono"
                          value={spotPrice}
                          onChange={(e) => setSpotPrice(parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="param-group">
                        <label className="param-label">PRIMARY STRIKE (K1)</label>
                        <input
                          type="number"
                          className="param-input font-mono"
                          value={strike1}
                          onChange={(e) => setStrike1(parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {(strategy === 'BULL_SPREAD' || strategy === 'BEAR_SPREAD' || strategy === 'IRON_CONDOR') && (
                        <div className="param-group">
                          <label className="param-label">SECONDARY STRIKE (K2)</label>
                          <input
                            type="number"
                            className="param-input font-mono"
                            value={strike2}
                            onChange={(e) => setStrike2(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      )}

                      {strategy === 'IRON_CONDOR' && (
                        <>
                          <div className="param-group">
                            <label className="param-label">PUT WING STRIKE (K3)</label>
                            <input
                              type="number"
                              className="param-input font-mono"
                              value={strike3}
                              onChange={(e) => setStrike3(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="param-group">
                            <label className="param-label">CALL WING STRIKE (K4)</label>
                            <input
                              type="number"
                              className="param-input font-mono"
                              value={strike4}
                              onChange={(e) => setStrike4(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </>
                      )}

                      <div className="param-group">
                        <label className="param-label">DAYS TO EXPIRY (DTE)</label>
                        <input
                          type="number"
                          className="param-input font-mono"
                          value={daysToExpiry}
                          min="0"
                          max="365"
                          onChange={(e) => setDaysToExpiry(parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="param-group">
                        <label className="param-label">IMPLIED VOL (IV %)</label>
                        <input
                          type="number"
                          className="param-input font-mono"
                          value={impliedVol}
                          min="1"
                          max="300"
                          onChange={(e) => setImpliedVol(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Black-Scholes Greeks Analytics Grid */}
                  <div className="greeks-card">
                    <div className="card-section-title">
                      <BarChart2 size={13} />
                      <span>BLACK-SCHOLES GREEKS</span>
                    </div>

                    <div className="greeks-grid">
                      <div className="greek-box">
                        <span className="greek-name">DELTA (Δ)</span>
                        <span className="greek-val font-mono">{greeks.delta}</span>
                        <span className="greek-sub">Price Sensitivity</span>
                      </div>

                      <div className="greek-box">
                        <span className="greek-name">GAMMA (Γ)</span>
                        <span className="greek-val font-mono">{greeks.gamma}</span>
                        <span className="greek-sub">Delta Rate of Change</span>
                      </div>

                      <div className="greek-box">
                        <span className="greek-name">THETA (Θ)</span>
                        <span className="greek-val font-mono">{greeks.theta}</span>
                        <span className="greek-sub">1-Day Time Decay</span>
                      </div>

                      <div className="greek-box">
                        <span className="greek-name">VEGA (ν)</span>
                        <span className="greek-val font-mono">{greeks.vega}</span>
                        <span className="greek-sub">1% IV Change</span>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Risk Metrics Summary */}
                  <div className="risk-summary-card font-mono">
                    <div className="risk-row">
                      <span className="risk-label">MAX PROFIT:</span>
                      <span className="risk-val profit">{metrics.maxProfit}</span>
                    </div>
                    <div className="risk-row">
                      <span className="risk-label">MAX LOSS:</span>
                      <span className="risk-val loss">{metrics.maxLoss}</span>
                    </div>
                    <div className="risk-row">
                      <span className="risk-label">BREAKEVEN:</span>
                      <span className="risk-val">{metrics.breakeven}</span>
                    </div>
                    <div className="risk-row">
                      <span className="risk-label">EST. CONTRACT COST:</span>
                      <span className="risk-val">{metrics.netCost}</span>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Interactive 2D Payoff Chart */}
                <div className="options-right-panel">
                  <div className="payoff-chart-header">
                    <span className="chart-title">STRATEGY EXPIRATION P&L PAYOFF CURVE</span>
                    <span className="chart-sub font-mono">Spot: ${spotPrice.toFixed(2)}</span>
                  </div>

                  <div className="payoff-chart-container">
                    <ResponsiveContainer width="100%" height={380}>
                      <AreaChart
                        data={payoffData}
                        margin={{ top: 15, right: 20, left: 15, bottom: 15 }}
                      >
                        <defs>
                          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="underlyingPrice"
                          stroke="#94a3b8"
                          fontSize={11}
                          fontFamily="var(--font-mono)"
                          tickFormatter={(val) => `$${val}`}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          fontFamily="var(--font-mono)"
                          tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem'
                          }}
                          formatter={(value) => [`$${value}`, 'P&L']}
                          labelFormatter={(label) => `Stock Price: $${label}`}
                        />
                        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                        <ReferenceLine x={spotPrice} stroke="#38bdf8" strokeWidth={1.5} label={{ value: 'Spot', fill: '#38bdf8', fontSize: 10 }} />

                        <Area
                          type="monotone"
                          dataKey="profitZone"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#profitGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="lossZone"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#lossGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="options-footer">
                <span className="footer-brand font-mono">KAPPA // BLACK-SCHOLES OPTIONS ENGINE</span>
                <button className="options-done-btn" onClick={onClose}>
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
