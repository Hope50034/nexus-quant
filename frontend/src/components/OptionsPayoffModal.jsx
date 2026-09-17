import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
  BarChart2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Wallet,
  Compass
} from 'lucide-react'
import { openPosition } from '../utils/paperTradingStorage'

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
  { id: 'BULL_SPREAD', label: 'Bull Call Spread', desc: 'Capped risk & cheap contract bullish spread' },
  { id: 'BEAR_SPREAD', label: 'Bear Put Spread', desc: 'Capped risk & cheap contract bearish spread' },
  { id: 'STRADDLE', label: 'Long Straddle', desc: 'Neutral high-volatility breakout strategy' },
  { id: 'IRON_CONDOR', label: 'Iron Condor', desc: 'Range-bound theta decay income strategy' }
]

export default function OptionsPayoffModal({
  isOpen = false,
  onClose,
  signals = [],
  initialSymbol = 'QQQ',
  initialStrategy = 'CALL',
  initialTargetPrice = null,
  initialDaysToExpiry = 1,
  onOpenQuickScalp
}) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [strategy, setStrategy] = useState(initialStrategy || 'CALL')
  const [statusMsg, setStatusMsg] = useState(null)
  const [copiedWebull, setCopiedWebull] = useState(false)
  const [showWebullGuide, setShowWebullGuide] = useState(false)

  // Mode state: 'simple' (Default, beginner friendly) vs 'pro' (Raw Black-Scholes Greeks)
  const [viewMode, setViewMode] = useState('simple')

  // Contract Budget Tier: 'budget' (Cheap <$80) | 'balanced' (~$150) | 'safe' ($300+)
  const [contractTier, setContractTier] = useState('budget')

  // Parameter Inputs State
  const [spotPrice, setSpotPrice] = useState(704.5)
  const [strike1, setStrike1] = useState(708)
  const [strike2, setStrike2] = useState(712)
  const [strike3, setStrike3] = useState(695)
  const [strike4, setStrike4] = useState(720)
  const [daysToExpiry, setDaysToExpiry] = useState(initialDaysToExpiry ?? 1)
  const [impliedVol, setImpliedVol] = useState(22)

  // Interactive Price Simulator for Simple Mode
  const [simulatedTargetPrice, setSimulatedTargetPrice] = useState(708)

  // Expected 1-day move calculation based on ATM Implied Volatility
  const oneDayMove = useMemo(() => {
    return spotPrice * (impliedVol / 100) * Math.sqrt(1 / 365)
  }, [spotPrice, impliedVol])

  // Sync initial values
  useEffect(() => {
    if (initialSymbol) setSymbol(initialSymbol)
    if (initialStrategy) setStrategy(initialStrategy)
    if (initialDaysToExpiry !== undefined) setDaysToExpiry(initialDaysToExpiry)
  }, [initialSymbol, initialStrategy, initialDaysToExpiry, isOpen])

  // Sync spot price and initial strikes when symbol or signals change
  useEffect(() => {
    const match = (signals || []).find(s => (s.symbol || '').toUpperCase() === symbol.toUpperCase())
    let price = 704.5
    if (match) {
      const cleaned = String(match.current_price || match.close_price || '').replace(/[^0-9.-]/g, '')
      price = parseFloat(cleaned) || 704.5
    }
    setSpotPrice(price)
    setSimulatedTargetPrice(Math.round(price + oneDayMove))

    // Default to budget tier strikes
    applyContractTier('budget', price, oneDayMove, strategy)
  }, [symbol, signals, isOpen])

  const applyContractTier = (tier, currentSpot = spotPrice, move = oneDayMove, currentStrat = strategy) => {
    setContractTier(tier)
    const isBull = currentStrat === 'CALL' || currentStrat === 'BULL_SPREAD'

    if (tier === 'budget') {
      // CHEAP CONTRACT TIER (< $75)
      // Pick OTM Strike slightly above spot for cheap premium!
      if (isBull) {
        const cheapK1 = Math.round(currentSpot + Math.max(1, move * 0.75))
        setStrike1(cheapK1)
        setStrike2(cheapK1 + 3) // Tight $3 spread
      } else {
        const cheapK1 = Math.round(currentSpot - Math.max(1, move * 0.75))
        setStrike1(cheapK1)
        setStrike3(cheapK1 - 3)
      }
    } else if (tier === 'balanced') {
      // BALANCED TIER (~$150 - $220)
      // Near ATM Strike
      if (isBull) {
        const atmK1 = Math.round(currentSpot + 0.5)
        setStrike1(atmK1)
        setStrike2(Math.round(currentSpot + move))
      } else {
        const atmK1 = Math.round(currentSpot - 0.5)
        setStrike1(atmK1)
        setStrike3(Math.round(currentSpot - move))
      }
    } else {
      // CONSERVATIVE ITM TIER ($300+)
      // In The Money for high delta
      if (isBull) {
        const itmK1 = Math.round(currentSpot - Math.max(2, move * 0.8))
        setStrike1(itmK1)
        setStrike2(Math.round(currentSpot + 2))
      } else {
        const itmK1 = Math.round(currentSpot + Math.max(2, move * 0.8))
        setStrike1(itmK1)
        setStrike3(Math.round(currentSpot - 2))
      }
    }
  }

  // ESC Key Listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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
        price: Math.max(0.15, c1.price - c2.price),
        delta: parseFloat((c1.delta - c2.delta).toFixed(4)),
        gamma: parseFloat((c1.gamma - c2.gamma).toFixed(4)),
        theta: parseFloat((c1.theta - c2.theta).toFixed(4)),
        vega: parseFloat((c1.vega - c2.vega).toFixed(4))
      }
    } else if (strategy === 'BEAR_SPREAD') {
      const p1 = calculateBlackScholes(S, strike1, T, 0.05, iv, 'put')
      const p2 = calculateBlackScholes(S, strike3, T, 0.05, iv, 'put')
      return {
        price: Math.max(0.15, p1.price - p2.price),
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
        price: Math.max(0.2, (pPutShort.price + pCallShort.price) - (pPutLong.price + pCallLong.price)),
        delta: parseFloat((-pPutLong.delta + pPutShort.delta - pCallShort.delta + pCallLong.delta).toFixed(4)),
        gamma: parseFloat((-pPutLong.gamma + pPutShort.gamma - pCallShort.gamma + pCallLong.gamma).toFixed(4)),
        theta: parseFloat((-pPutLong.theta + pPutShort.theta - pCallShort.theta + pCallLong.theta).toFixed(4)),
        vega: parseFloat((-pPutLong.vega + pPutShort.vega - pCallShort.vega + pCallLong.vega).toFixed(4))
      }
    }
  }, [spotPrice, strike1, strike2, strike3, strike4, daysToExpiry, impliedVol, strategy])

  const contractCost = useMemo(() => {
    return Math.max(15, Math.round(greeks.price * 100))
  }, [greeks.price])

  // Generate 2D Profit/Loss Payoff Curve Data
  const payoffData = useMemo(() => {
    const points = []
    const minP = spotPrice * 0.85
    const maxP = spotPrice * 1.15
    const step = (maxP - minP) / 40
    const initialCost = contractCost

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
  }, [spotPrice, strike1, strike2, strike3, strike4, strategy, contractCost])

  // Calculate Max Profit, Max Loss & Breakeven
  const metrics = useMemo(() => {
    const pnlList = payoffData.map(d => d.pnl)
    const maxProfitVal = Math.max(...pnlList)
    const maxLossVal = Math.min(...pnlList)

    const isProfitInfinite = strategy === 'CALL' || strategy === 'STRADDLE'
    const maxProfitStr = isProfitInfinite ? 'Unlimited ∞' : `$${maxProfitVal.toFixed(2)}`
    const maxLossStr = `$${Math.abs(maxLossVal).toFixed(2)}`

    let breakevenStr = ''
    if (strategy === 'CALL') breakevenStr = `$${(strike1 + (contractCost / 100)).toFixed(2)}`
    else if (strategy === 'PUT') breakevenStr = `$${(strike1 - (contractCost / 100)).toFixed(2)}`
    else if (strategy === 'BULL_SPREAD') breakevenStr = `$${(strike1 + (contractCost / 100)).toFixed(2)}`
    else if (strategy === 'BEAR_SPREAD') breakevenStr = `$${(strike1 - (contractCost / 100)).toFixed(2)}`
    else if (strategy === 'STRADDLE') breakevenStr = `$${(strike1 - (contractCost / 100)).toFixed(2)} / $${(strike1 + (contractCost / 100)).toFixed(2)}`
    else breakevenStr = `$${(strike1 - (contractCost / 100)).toFixed(2)} / $${(strike2 + (contractCost / 100)).toFixed(2)}`

    return {
      maxProfit: maxProfitStr,
      maxLoss: maxLossStr,
      breakeven: breakevenStr,
      netCost: `$${contractCost.toFixed(2)}`
    }
  }, [payoffData, strategy, strike1, strike2, contractCost])

  // Interactive Profit calculation for the slider in Simple Mode
  const simulatedPnl = useMemo(() => {
    const P = simulatedTargetPrice
    let val = 0
    if (strategy === 'CALL') {
      val = (Math.max(P - strike1, 0) * 100) - contractCost
    } else if (strategy === 'PUT') {
      val = (Math.max(strike1 - P, 0) * 100) - contractCost
    } else if (strategy === 'BULL_SPREAD') {
      const int1 = Math.max(P - strike1, 0)
      const int2 = Math.max(P - strike2, 0)
      val = ((int1 - int2) * 100) - contractCost
    } else {
      val = (Math.max(P - strike1, 0) * 100) - contractCost
    }
    return Math.round(val)
  }, [simulatedTargetPrice, strategy, strike1, strike2, contractCost])

  const simulatedRoi = useMemo(() => {
    if (contractCost <= 0) return 0
    return Math.round((simulatedPnl / contractCost) * 100)
  }, [simulatedPnl, contractCost])

  // Webull Links & Order Details
  const cleanSym = symbol.replace('-USD', '')
  const webullOptionUrl = `https://www.webull.com/quote/nasdaq-${cleanSym.toLowerCase()}/option-chain`
  const webullAppUrl = `https://app.webull.com/quote/us/option/nasdaq-${cleanSym.toLowerCase()}`

  const webullTicketString = `${cleanSym} ${daysToExpiry}DTE $${strike1} ${strategy === 'PUT' ? 'PUT' : 'CALL'} x 1 Contract (Limit ~$${(contractCost / 100).toFixed(2)})`

  const handleCopyWebull = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(webullTicketString)
      setCopiedWebull(true)
      setTimeout(() => setCopiedWebull(false), 2500)
    }
  }

  const tickerOptions = useMemo(() => {
    const list = ['QQQ', 'SPY', 'NVDA', 'AAPL', 'TSLA', 'AMD', 'MSFT', 'AMZN', 'META']
    const sigSyms = (signals || []).map(s => (s.symbol || '').toUpperCase()).filter(s => !s.includes('-USD'))
    return Array.from(new Set([...list, ...sigSyms])).sort()
  }, [signals])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="options-modal-root">
          <motion.div
            className="options-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <div className="options-modal-wrapper">
            <motion.div
              className="options-card"
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {/* Header Bar */}
              <div className="options-header">
                <div className="header-title-group">
                  <div className="options-icon-badge">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <h2 className="options-title">{symbol} Options Playbook & Payoff</h2>
                      <span className="simple-badge-indicator">
                        {viewMode === 'simple' ? '✨ Simple Webull Mode' : '📈 Pro Quant Mode'}
                      </span>
                    </div>
                    <p className="options-sub">
                      Pick cheap contracts, understand risk in plain English, and execute seamlessly on Webull.
                    </p>
                  </div>
                </div>

                <div className="header-controls font-mono" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {/* Simple vs Pro Switcher */}
                  <div className="view-mode-toggle-group">
                    <button
                      className={`mode-toggle-btn ${viewMode === 'simple' ? 'active' : ''}`}
                      onClick={() => setViewMode('simple')}
                    >
                      <Sparkles size={12} />
                      <span>Simple (Beginner)</span>
                    </button>
                    <button
                      className={`mode-toggle-btn ${viewMode === 'pro' ? 'active' : ''}`}
                      onClick={() => setViewMode('pro')}
                    >
                      <BarChart2 size={12} />
                      <span>Pro Greeks</span>
                    </button>
                  </div>

                  {/* Ticker Selector */}
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

              {/* Quick Scalp Desk Direct Shortcut Banner */}
              <div style={{
                margin: '0.6rem 1.25rem 0.2rem 1.25rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                boxShadow: '0 1px 4px rgba(245, 158, 11, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={16} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.76rem', color: '#92400e', fontWeight: 700 }}>
                    Trading 0DTE with micro-budget ($15 - $31)? Use the Quick Scalp Desk for live +25% profit targets & stop-loss signals.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose?.()
                    onOpenQuickScalp?.(symbol)
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#000000',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
                  }}
                >
                  ⚡ Open $31 Scalp Desk ↗
                </button>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* VIEW MODE 1: SIMPLE MODE (For Beginners & Cheap Contracts)   */}
              {/* ------------------------------------------------------------- */}
              {viewMode === 'simple' ? (
                <div className="simple-options-container">
                  {/* Step 1: Select Strategy & Expiration */}
                  <div className="simple-top-banner">
                    <div className="banner-left">
                      <span className="banner-tag font-mono">STEP 1: DIRECTION & TIME</span>
                      <div className="simple-strategy-pills">
                        <button
                          className={`pill-btn ${strategy === 'CALL' ? 'active-bull' : ''}`}
                          onClick={() => {
                            setStrategy('CALL')
                            applyContractTier(contractTier, spotPrice, oneDayMove, 'CALL')
                          }}
                        >
                          <TrendingUp size={14} />
                          <span>Buy Call (Betting {symbol} Goes UP)</span>
                        </button>
                        <button
                          className={`pill-btn ${strategy === 'PUT' ? 'active-bear' : ''}`}
                          onClick={() => {
                            setStrategy('PUT')
                            applyContractTier(contractTier, spotPrice, oneDayMove, 'PUT')
                          }}
                        >
                          <TrendingDown size={14} />
                          <span>Buy Put (Betting {symbol} Goes DOWN)</span>
                        </button>
                      </div>
                    </div>

                    <div className="banner-right">
                      <span className="banner-tag font-mono">EXPIRATION</span>
                      <div className="simple-dte-pills">
                        <button
                          className={`dte-chip ${daysToExpiry === 0 ? 'active' : ''}`}
                          onClick={() => setDaysToExpiry(0)}
                        >
                          0DTE (Today)
                        </button>
                        <button
                          className={`dte-chip ${daysToExpiry === 1 ? 'active' : ''}`}
                          onClick={() => setDaysToExpiry(1)}
                        >
                          1DTE (Tomorrow)
                        </button>
                        <button
                          className={`dte-chip ${daysToExpiry === 7 ? 'active' : ''}`}
                          onClick={() => setDaysToExpiry(7)}
                        >
                          1-Week
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Choose Budget / Cheap Contract Tier */}
                  <div className="simple-budget-section">
                    <div className="section-header-row">
                      <span className="section-title">
                        <Wallet size={15} style={{ color: '#0284c7' }} />
                        <span>STEP 2: CHOOSE YOUR CONTRACT BUDGET</span>
                      </span>
                      <span className="spot-price-tag font-mono">
                        {symbol} Spot Price: <strong>${spotPrice.toFixed(2)}</strong> (1-Day Expected Move: ±${oneDayMove.toFixed(2)})
                      </span>
                    </div>

                    <div className="budget-cards-grid">
                      {/* TIER 1: CHEAP / BUDGET CONTRACT */}
                      <div
                        className={`budget-tier-card ${contractTier === 'budget' ? 'selected' : ''}`}
                        onClick={() => applyContractTier('budget')}
                      >
                        <div className="tier-badge budget">
                          <span>🏷️ CHEAPEST PLAY (UNDER $75)</span>
                        </div>
                        <div className="tier-price-row font-mono">
                          <span className="tier-cost">~$35 - $65</span>
                          <span className="tier-per">/ contract</span>
                        </div>
                        <div className="tier-strike-info font-mono">
                          Strike: <strong>${Math.round(spotPrice + Math.max(1, oneDayMove * 0.75))} {strategy}</strong>
                        </div>
                        <p className="tier-desc">
                          Great for small accounts! You only risk <strong>~$50</strong>. If {symbol} pops +1%, this can double or triple (+200% ROI).
                        </p>
                        <div className="tier-check-mark">
                          {contractTier === 'budget' && <Check size={14} />}
                        </div>
                      </div>

                      {/* TIER 2: BALANCED VALUE PLAY */}
                      <div
                        className={`budget-tier-card ${contractTier === 'balanced' ? 'selected' : ''}`}
                        onClick={() => applyContractTier('balanced')}
                      >
                        <div className="tier-badge balanced">
                          <span>🎯 BEST VALUE (HIGHER WIN RATE)</span>
                        </div>
                        <div className="tier-price-row font-mono">
                          <span className="tier-cost">~$120 - $190</span>
                          <span className="tier-per">/ contract</span>
                        </div>
                        <div className="tier-strike-info font-mono">
                          Strike: <strong>${Math.round(spotPrice + 0.5)} {strategy}</strong> (At The Money)
                        </div>
                        <p className="tier-desc">
                          Higher win probability. Moves faster when {symbol} gains momentum, balancing cost with solid profit potential.
                        </p>
                        <div className="tier-check-mark">
                          {contractTier === 'balanced' && <Check size={14} />}
                        </div>
                      </div>

                      {/* TIER 3: CONSERVATIVE / IN-THE-MONEY */}
                      <div
                        className={`budget-tier-card ${contractTier === 'safe' ? 'selected' : ''}`}
                        onClick={() => applyContractTier('safe')}
                      >
                        <div className="tier-badge safe">
                          <span>🛡️ SAFER (IN-THE-MONEY)</span>
                        </div>
                        <div className="tier-price-row font-mono">
                          <span className="tier-cost">~$300+</span>
                          <span className="tier-per">/ contract</span>
                        </div>
                        <div className="tier-strike-info font-mono">
                          Strike: <strong>${Math.round(spotPrice - Math.max(2, oneDayMove * 0.8))} {strategy}</strong>
                        </div>
                        <p className="tier-desc">
                          Has real intrinsic value right now. Moves 1:1 like owning the stock, but requires more capital.
                        </p>
                        <div className="tier-check-mark">
                          {contractTier === 'safe' && <Check size={14} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Plain-English Profit Breakdown & Interactive Price Slider */}
                  <div className="simple-breakdown-box">
                    <div className="breakdown-columns">
                      {/* Left: What you risk and gain */}
                      <div className="breakdown-card">
                        <span className="b-title">📊 YOUR EXACT RISK & REWARD (NO SURPRISES)</span>
                        <div className="risk-reward-stats font-mono">
                          <div className="stat-pill risk">
                            <span className="s-label">MAXIMUM RISK</span>
                            <span className="s-val">${contractCost}</span>
                            <span className="s-sub">Webull will NEVER take more than this!</span>
                          </div>
                          <div className="stat-pill profit">
                            <span className="s-label">PROFIT POTENTIAL</span>
                            <span className="s-val">Unlimited</span>
                            <span className="s-sub">Grows as {symbol} moves your way</span>
                          </div>
                          <div className="stat-pill breakeven">
                            <span className="s-label">BREAKEVEN PRICE</span>
                            <span className="s-val">${(strike1 + (contractCost / 100)).toFixed(2)}</span>
                            <span className="s-sub">Target for 0% loss / start of pure profit</span>
                          </div>
                        </div>

                        {/* Interactive Price Slider */}
                        <div className="slider-container">
                          <div className="slider-header font-mono">
                            <span>Test Scenario: Where does {symbol} go tomorrow?</span>
                            <strong className="slider-price">${simulatedTargetPrice.toFixed(2)}</strong>
                          </div>
                          <input
                            type="range"
                            className="profit-slider"
                            min={Math.round(spotPrice - oneDayMove * 1.5)}
                            max={Math.round(spotPrice + oneDayMove * 2)}
                            step={0.5}
                            value={simulatedTargetPrice}
                            onChange={(e) => setSimulatedTargetPrice(parseFloat(e.target.value))}
                          />
                          <div className="slider-labels font-mono">
                            <span>Drop: ${(spotPrice - oneDayMove * 1.5).toFixed(0)}</span>
                            <span>Current: ${spotPrice.toFixed(0)}</span>
                            <span>Target: ${(spotPrice + oneDayMove * 2).toFixed(0)}</span>
                          </div>

                          <div className={`simulated-outcome font-mono ${simulatedPnl >= 0 ? 'win' : 'loss'}`}>
                            <span>Estimated Outcome: </span>
                            <strong>
                              {simulatedPnl >= 0 ? `+$${simulatedPnl} (+${simulatedRoi}%) PROFIT` : `-$${Math.min(contractCost, Math.abs(simulatedPnl))} CAPPED LOSS`}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Right: Webull Direct Actions & Step-by-Step */}
                      <div className="webull-action-card">
                        <div className="webull-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div className="webull-logo-badge">W</div>
                            <span className="webull-title">TRADE THIS ON WEBULL</span>
                          </div>
                          <button
                            className="webull-help-toggle"
                            onClick={() => setShowWebullGuide(!showWebullGuide)}
                          >
                            <HelpCircle size={13} />
                            <span>{showWebullGuide ? 'Hide Steps' : 'How to do it on Webull?'}</span>
                          </button>
                        </div>

                        {/* Direct Order String Ticket */}
                        <div className="webull-ticket-box font-mono">
                          <div className="ticket-label">Webull Contract To Search:</div>
                          <div className="ticket-val">{webullTicketString}</div>
                          <button
                            className={`copy-ticket-btn ${copiedWebull ? 'copied' : ''}`}
                            onClick={handleCopyWebull}
                          >
                            {copiedWebull ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copiedWebull ? 'Copied Ticket!' : 'Copy Ticket'}</span>
                          </button>
                        </div>

                        {/* Webull How-To Accordion */}
                        {showWebullGuide && (
                          <div className="webull-steps-guide">
                            <div className="w-step">
                              <span className="w-num">1</span>
                              <span>Open Webull app & search <strong>{cleanSym}</strong>.</span>
                            </div>
                            <div className="w-step">
                              <span className="w-num">2</span>
                              <span>Tap <strong>Options</strong> at the bottom & pick <strong>{daysToExpiry}DTE Expiration</strong>.</span>
                            </div>
                            <div className="w-step">
                              <span className="w-num">3</span>
                              <span>Find <strong>${strike1} {strategy}</strong> & tap <strong>Buy</strong> (Limit ~${(contractCost / 100).toFixed(2)}).</span>
                            </div>
                          </div>
                        )}

                        {/* Big Webull Link Button */}
                        <div className="webull-btns-row">
                          <a
                            href={webullAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="open-webull-direct-btn font-mono"
                          >
                            <span>Open {symbol} in Webull App ↗</span>
                            <ExternalLink size={13} />
                          </a>

                          <a
                            href={webullOptionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="open-webull-chain-btn font-mono"
                          >
                            <span>Webull Option Chain ↗</span>
                          </a>
                        </div>

                        {/* Paper Trading Execution Button */}
                        <button
                          className="paper-trade-simple-btn font-mono"
                          onClick={() => {
                            setStatusMsg(null)
                            const res = openPosition({
                              symbol: `${symbol} ${strike1}C`,
                              assetType: 'Option',
                              entryPrice: Number((contractCost / 100).toFixed(2)),
                              amount: contractCost,
                              takeProfit: Number((contractCost * 2.5).toFixed(2)),
                              stopLoss: 0,
                              reason: `Simple ${contractTier} Call on ${symbol} @ $${strike1}`
                            })
                            if (res.success) {
                              setStatusMsg({
                                type: 'SUCCESS',
                                text: `✅ Added 1 contract of ${symbol} $${strike1} to your $10K Paper Portfolio!`
                              })
                            } else {
                              setStatusMsg({
                                type: 'ERROR',
                                text: res.message || 'Simulation failed'
                              })
                            }
                          }}
                        >
                          <Zap size={14} />
                          <span>Practice in Paper Trading ($10K Sim)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ------------------------------------------------------------- */
                /* VIEW MODE 2: PRO QUANT MODE (Greeks & 2D Curve)              */
                /* ------------------------------------------------------------- */
                <>
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

                  <div className="options-body">
                    {/* Left Panel: Inputs & Greeks */}
                    <div className="options-left-panel">
                      <div className="param-card">
                        <div className="card-section-title">
                          <Sliders size={13} />
                          <span>PARAMETERS & CONTRACT INPUTS</span>
                        </div>

                        <div className="param-grid font-mono">
                          <div className="param-group">
                            <label className="param-label">Spot Price ($)</label>
                            <input
                              type="number"
                              className="param-input"
                              value={spotPrice}
                              step="0.1"
                              onChange={(e) => setSpotPrice(parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="param-group">
                            <label className="param-label">Primary Strike ($)</label>
                            <input
                              type="number"
                              className="param-input"
                              value={strike1}
                              step="1"
                              onChange={(e) => setStrike1(parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          {(strategy === 'BULL_SPREAD' || strategy === 'IRON_CONDOR') && (
                            <div className="param-group">
                              <label className="param-label">Secondary Strike ($)</label>
                              <input
                                type="number"
                                className="param-input"
                                value={strike2}
                                step="1"
                                onChange={(e) => setStrike2(parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          )}

                          <div className="param-group">
                            <label className="param-label">Days to Expiration</label>
                            <input
                              type="number"
                              className="param-input"
                              value={daysToExpiry}
                              step="1"
                              onChange={(e) => setDaysToExpiry(parseInt(e.target.value) || 0)}
                            />
                          </div>

                          <div className="param-group">
                            <label className="param-label">Implied Vol (%)</label>
                            <input
                              type="number"
                              className="param-input"
                              value={impliedVol}
                              step="1"
                              onChange={(e) => setImpliedVol(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Greeks Table */}
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

                      {/* Risk Summary */}
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

                    {/* Right Panel: Payoff Curve */}
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
                </>
              )}

              {/* Modal Footer */}
              <div className="options-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <button
                    className="options-execute-btn font-mono"
                    onClick={() => {
                      setStatusMsg(null)
                      const res = openPosition({
                        symbol: `${symbol} ${strike1}C`,
                        assetType: 'Option',
                        entryPrice: Number((contractCost / 100).toFixed(2)),
                        amount: contractCost,
                        takeProfit: Number((contractCost * 2).toFixed(2)),
                        stopLoss: 0,
                        reason: `Executed ${contractTier} Option contract for ${symbol} @ $${strike1}`
                      })
                      if (res.success) {
                        setStatusMsg({
                          type: 'SUCCESS',
                          text: `✅ Paper Order Executed: 1 Contract of ${symbol} ($${contractCost})`
                        })
                      } else {
                        setStatusMsg({
                          type: 'ERROR',
                          text: res.message || 'Simulation failed'
                        })
                      }
                    }}
                    title="Simulate executing this option contract into your $10K paper portfolio"
                  >
                    <Zap size={14} />
                    <span>Execute Option in Paper Portfolio (${contractCost})</span>
                  </button>

                  <a
                    href={webullAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="webull-footer-link font-mono"
                  >
                    <span>Open in Webull ↗</span>
                  </a>

                  {statusMsg && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: statusMsg.type === 'SUCCESS' ? '#059669' : '#dc2626'
                    }}>
                      {statusMsg.text}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button className="options-done-btn" onClick={onClose}>
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
