import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Bell,
  Sliders,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Sparkles
} from 'lucide-react'
import { openPosition } from '../utils/paperTradingStorage'

const POPULAR_TICKERS = ['QQQ', 'SPY', 'SOFI', 'PLTR', 'AMD', 'NVDA', 'TSLA']
const BUDGET_PRESETS = [10, 15, 20, 25, 30, 50, 75, 100]

export default function QuickScalpDeskModal({
  isOpen = false,
  onClose,
  initialSymbol = 'QQQ',
  API_BASE_URL = 'http://127.0.0.1:8000',
  onOpenBacktest
}) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [budget, setBudget] = useState(30)
  const [budgetInput, setBudgetInput] = useState('30')
  const [direction, setDirection] = useState('AUTO') // 'AUTO' | 'BULLISH' | 'BEARISH'
  const [selectedExpiration, setSelectedExpiration] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scalpData, setScalpData] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Active Position Tracker State
  const [activeTrade, setActiveTrade] = useState(null)
  const [tradeEntryPrice, setTradeEntryPrice] = useState(0.30)
  const [tradeCurrentPrice, setTradeCurrentPrice] = useState(0.30)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)
  const [autoSyncMarket, setAutoSyncMarket] = useState(false)

  const [contractQty, setContractQty] = useState(1)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const playSignalSound = (type) => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      if (type === 'PROFIT') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime)
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
        osc.start()
        osc.stop(ctx.currentTime + 0.35)
      } else if (type === 'STOP') {
        osc.frequency.setValueAtTime(329.63, ctx.currentTime)
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      }
    } catch (e) {}
  }

  const getMarketSession = () => {
    const now = new Date()
    const estString = now.toLocaleString("en-US", { timeZone: "America/New_York" })
    const estDate = new Date(estString)
    const day = estDate.getDay()
    const timeInMins = estDate.getHours() * 60 + estDate.getMinutes()

    if (day === 0 || day === 6) {
      return { isOpen: false, label: 'WEEKEND (CLOSED)' }
    }
    if (timeInMins >= 570 && timeInMins < 960) {
      return { isOpen: true, label: 'US MARKET OPEN (LIVE)' }
    }
    if (timeInMins >= 240 && timeInMins < 570) {
      return { isOpen: false, label: 'PRE-MARKET (OPENS 9:30 AM EST)' }
    }
    return { isOpen: false, label: 'AFTER-HOURS (SETTLED)' }
  }

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol)
      setSelectedExpiration(null)
    }
  }, [initialSymbol])

  // Debounced sync from budgetInput to budget so user can freely type without jumping
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = parseFloat(budgetInput)
      if (!isNaN(parsed) && parsed >= 5 && parsed <= 2000 && parsed !== budget) {
        setBudget(parsed)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [budgetInput, budget])

  useEffect(() => {
    if (isOpen) {
      fetchScalpContracts(symbol, budget, selectedExpiration)
    }
  }, [isOpen, symbol, budget, direction, selectedExpiration])

  // 15-Minute Scalp Timer
  useEffect(() => {
    let interval = null
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  // Auto-sync live option price from market every 10s if enabled
  useEffect(() => {
    let interval = null
    if (autoSyncMarket && isOpen) {
      interval = setInterval(() => {
        fetchScalpContracts(symbol, budget, selectedExpiration)
      }, 10000)
    }
    return () => clearInterval(interval)
  }, [autoSyncMarket, isOpen, symbol, budget, selectedExpiration])

  // Sync active contract price whenever new market data arrives
  useEffect(() => {
    if (scalpData && activeTrade) {
      const match = scalpData.contracts?.find(
        (c) => c.strike === activeTrade.strike && c.type === activeTrade.type
      )
      if (match && match.price_per_share) {
        setTradeCurrentPrice(match.price_per_share)
      }
    }
  }, [scalpData, activeTrade])

  const fetchScalpContracts = async (targetSym, targetBudget, targetExp = selectedExpiration) => {
    setLoading(true)
    try {
      let url = `${API_BASE_URL}/api/options/scalp-finder/?symbol=${encodeURIComponent(targetSym)}&budget=${targetBudget}&direction=${direction}`
      if (targetExp) {
        url += `&expiration=${encodeURIComponent(targetExp)}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setScalpData(data)
        // If no active trade, initialize with top recommendation
        if (data.top_recommendation && !activeTrade) {
          const top = data.top_recommendation
          setTradeEntryPrice(top.price_per_share)
          setTradeCurrentPrice(top.price_per_share)
        }
      }
    } catch (err) {
      console.error('Failed to fetch scalp contracts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyTicket = (ticketText, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ticketText)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2500)
    }
  }
  const handleCopyWebull = handleCopyTicket

  const handleLoadPosition = (contract) => {
    setActiveTrade(contract)
    setTradeEntryPrice(contract.price_per_share)
    setTradeCurrentPrice(contract.price_per_share)
    setElapsedSeconds(0)
    setIsTimerRunning(true)
  }

  if (!isOpen) return null

  // Calculate live active scalp metrics
  const costTotal = Math.round(tradeEntryPrice * 100 * contractQty)
  const currentTotal = Math.round(tradeCurrentPrice * 100 * contractQty)
  const pnlDollars = currentTotal - costTotal
  const pnlPercent = tradeEntryPrice > 0 ? ((tradeCurrentPrice - tradeEntryPrice) / tradeEntryPrice) * 100 : 0

  const target1Price = tradeEntryPrice * 1.25
  const target2Price = tradeEntryPrice * 1.60
  const stopLossPrice = tradeEntryPrice * 0.78

  const isTarget1Hit = tradeCurrentPrice >= target1Price
  const isTarget2Hit = tradeCurrentPrice >= target2Price
  const isStopLossHit = tradeCurrentPrice <= stopLossPrice
  const isTimeLimitWarning = elapsedSeconds >= 15 * 60 // 15 minutes

  const marketSession = getMarketSession()

  // Audio alert triggers when price hits profit or stop
  useEffect(() => {
    if (isTarget2Hit || isTarget1Hit) {
      playSignalSound('PROFIT')
    } else if (isStopLossHit) {
      playSignalSound('STOP')
    }
  }, [isTarget1Hit, isTarget2Hit, isStopLossHit])

  // Webull URL
  const cleanSym = symbol.replace('-USD', '').toLowerCase()
  const webullUrl = `https://app.webull.com/quote/us/option/nasdaq-${cleanSym}`

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AnimatePresence>
      <div className="scalp-modal-overlay" onClick={onClose}>
        <motion.div
          className="scalp-modal-container font-mono"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="scalp-modal-header">
            <div className="header-left">
              <div className="scalp-icon-glow">
                <Zap size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h2 className="scalp-title">0DTE $30 Quick Scalp Terminal & Sell Signals</h2>
                  <span className="scalp-badge">MINUTE SCALPER ENGINE</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.70rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: marketSession.isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                    border: `1px solid ${marketSession.isOpen ? '#10b981' : 'rgba(148, 163, 184, 0.3)'}`,
                    color: marketSession.isOpen ? '#10b981' : '#94a3b8',
                    fontWeight: 700
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: marketSession.isOpen ? '#10b981' : '#94a3b8' }} />
                    {marketSession.label}
                  </span>
                </div>
                <p className="scalp-sub">
                  Finds real contracts under your budget with automated exit signals: Lock +25% profit or cut at -22% before theta burns.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onOpenBacktest && (
                <button
                  onClick={onOpenBacktest}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="View full 6-Month Options Backtest Audit (+246.7% Gain)"
                >
                  <TrendingUp size={14} />
                  <span>📊 6M Backtest (+246.7% ROI)</span>
                </button>
              )}
              <button className="scalp-close-btn" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Budget & Ticker Controls Bar */}
          <div className="scalp-controls-bar">
            {/* Ticker Selector */}
            <div className="ctrl-group">
              <span className="ctrl-label">ASSET:</span>
              <div className="ticker-pills">
                {POPULAR_TICKERS.map((t) => (
                  <button
                    key={t}
                    className={`t-pill ${symbol === t ? 'active' : ''}`}
                    onClick={() => setSymbol(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Selector */}
            <div className="ctrl-group">
              <span className="ctrl-label">YOUR BUDGET:</span>
              <div className="budget-pills">
                {BUDGET_PRESETS.map((b) => (
                  <button
                    key={b}
                    className={`b-pill ${budget === b ? 'active' : ''}`}
                    onClick={() => {
                      setBudget(b)
                      setBudgetInput(String(b))
                    }}
                  >
                    ${b}
                  </button>
                ))}
                <div className="custom-budget-wrap">
                  <span>$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="custom-budget-input"
                    placeholder="15"
                    value={budgetInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      setBudgetInput(val)
                    }}
                    onBlur={() => {
                      const parsed = parseFloat(budgetInput)
                      if (isNaN(parsed) || parsed < 5) {
                        setBudget(15)
                        setBudgetInput('15')
                      } else {
                        setBudget(parsed)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const parsed = parseFloat(budgetInput)
                        if (!isNaN(parsed) && parsed >= 5) {
                          setBudget(parsed)
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Direction Filter */}
            <div className="ctrl-group">
              <span className="ctrl-label">DIRECTION:</span>
              <div className="dir-pills">
                <button
                  className={`d-pill ${direction === 'AUTO' ? 'active' : ''}`}
                  onClick={() => setDirection('AUTO')}
                >
                  ⚡ Auto (MACD)
                </button>
                <button
                  className={`d-pill ${direction === 'BULLISH' ? 'active-bull' : ''}`}
                  onClick={() => setDirection('BULLISH')}
                >
                  <TrendingUp size={12} /> Calls
                </button>
                <button
                  className={`d-pill ${direction === 'BEARISH' ? 'active-bear' : ''}`}
                  onClick={() => setDirection('BEARISH')}
                >
                  <TrendingDown size={12} /> Puts
                </button>
              </div>
            </div>

            {/* Expiration Selector */}
            {scalpData?.available_expirations && scalpData.available_expirations.length > 0 && (
              <div className="ctrl-group">
                <span className="ctrl-label">EXPIRATION:</span>
                <div className="ticker-pills">
                  {scalpData.available_expirations.slice(0, 3).map((exp, idx) => {
                    const isSelected = (selectedExpiration || scalpData.expiration) === exp
                    const label = idx === 0 ? `⚡ Today (${exp.slice(5)})` : idx === 1 ? `📅 Tomorrow (${exp.slice(5)})` : `📅 ${exp.slice(5)}`
                    return (
                      <button
                        key={exp}
                        className={`t-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedExpiration(exp)}
                        title={`Filter contracts for expiration ${exp}`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Main Content */}
          <div className="scalp-modal-body">
            {loading && !scalpData ? (
              <div className="scalp-loading-box">
                <RefreshCw size={32} className="spin-icon text-cyan" />
                <h4>Scanning Real Live Market Chains for ${budget} Contracts...</h4>
                <p>Querying Yahoo Finance & Webull orderbooks for {symbol} 0DTE/1DTE strikes</p>
              </div>
            ) : scalpData ? (
              <>
                {/* 1. Top Recommendation Hero Banner */}
                {scalpData.top_recommendation && (
                  <div className="top-scalp-hero">
                    {/* AI Brain Live Confluence Banner */}
                    {scalpData.ai_brain && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        marginBottom: '10px',
                        borderRadius: '6px',
                        background: scalpData.ai_brain.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        border: `1px solid ${scalpData.ai_brain.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                        fontSize: '0.78rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontWeight: 800,
                            color: scalpData.ai_brain.bias === 'BULLISH' ? '#10b981' : '#ef4444'
                          }}>
                            🧠 AI BRAIN ({scalpData.ai_brain.confidence}% CONFIDENCE):
                          </span>
                          <span style={{ color: '#e2e8f0' }}>{scalpData.ai_brain.verdict}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.72rem' }}>
                          <span>VWAP: <strong style={{ color: '#38bdf8' }}>${scalpData.ai_brain.vwap}</strong></span>
                          <span>EMA 9/21: <strong style={{ color: scalpData.ai_brain.ema_9 >= scalpData.ai_brain.ema_21 ? '#10b981' : '#ef4444' }}>${scalpData.ai_brain.ema_9}/${scalpData.ai_brain.ema_21}</strong></span>
                          <span>RSI: <strong style={{ color: '#f59e0b' }}>{scalpData.ai_brain.rsi_14}</strong></span>
                        </div>
                      </div>
                    )}

                    <div className="hero-badge-row">
                      <span className="hero-status-tag">
                        <Sparkles size={13} />
                        BEST SCALP PICK RIGHT NOW FOR ${budget}
                      </span>
                      <span className="hero-spot-info">
                        {symbol} Spot Price: <strong>${scalpData.current_underlying_price}</strong> ({scalpData.intraday_change_pct >= 0 ? '+' : ''}{scalpData.intraday_change_pct}% 15m Momentum)
                      </span>
                    </div>

                    <div className="hero-contract-grid">
                      <div className="hero-main-details">
                        <div className="contract-title-row">
                          <span className={`type-tag ${scalpData.top_recommendation.type === 'CALL' ? 'call' : 'put'}`}>
                            {scalpData.top_recommendation.type}
                          </span>
                          <span className="strike-title">
                            ${scalpData.top_recommendation.strike} STRIKE
                          </span>
                          <span className="exp-title">
                            ({scalpData.top_recommendation.expiration})
                          </span>
                        </div>

                        <div className="cost-row">
                          <span className="exact-cost">${parseFloat(scalpData.top_recommendation.contract_cost).toFixed(2)}</span>
                          <span className="cost-unit">per contract (${parseFloat(scalpData.top_recommendation.price_per_share || (scalpData.top_recommendation.contract_cost / 100)).toFixed(2)} limit on Webull)</span>
                        </div>

                        {/* Volume-Weighted Confluence Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '0.4rem 0 0.5rem 0' }}>
                          <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#10b981', fontWeight: 700 }}>
                            🔥 Vol: {scalpData.top_recommendation.volume ? scalpData.top_recommendation.volume.toLocaleString() : '0'} contracts
                          </span>
                          {scalpData.top_recommendation.vol_oi_ratio && (
                            <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.35)', color: '#06b6d4', fontWeight: 600 }}>
                              ⚡ Volume/OI Spike: {scalpData.top_recommendation.vol_oi_ratio}x
                            </span>
                          )}
                          {scalpData.top_recommendation.probability_60pct && (
                            <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '4px', background: scalpData.top_recommendation.probability_60pct === 'HIGH' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', border: `1px solid ${scalpData.top_recommendation.probability_60pct === 'HIGH' ? '#10b981' : '#f59e0b'}`, color: scalpData.top_recommendation.probability_60pct === 'HIGH' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                              🎯 +60% Surge Odds: {scalpData.top_recommendation.probability_60pct}
                            </span>
                          )}
                        </div>

                        <p className="hero-explanation">
                          {scalpData.top_recommendation.type === 'CALL'
                            ? `Bullish Momentum: ${symbol} is pushing upwards. If it moves +$1 to +$2 in the next 15 minutes, this cheap call can surge +25% to +60%.`
                            : `Bearish Breakdown: ${symbol} is rejecting resistance. This put gives you high leverage downside exposure for only $${parseFloat(scalpData.top_recommendation.contract_cost).toFixed(2)}.`}
                        </p>
                      </div>

                      {/* Sell Signals Roadmap */}
                      <div className="hero-sell-targets">
                        <span className="targets-title">🎯 EXACT SELL TARGETS & STOP LOSS:</span>
                        <div className="target-pill-row">
                          <div className="target-box target1">
                            <span className="t-tag">SELL TARGET 1 (+25%)</span>
                            <strong className="t-val">${parseFloat(scalpData.top_recommendation.sell_target_1).toFixed(2)}</strong>
                            <span className="t-pnl">+${parseFloat(scalpData.top_recommendation.sell_target_1_pnl).toFixed(2)} profit</span>
                          </div>
                          <div className="target-box target2">
                            <span className="t-tag">RUNNER TARGET 2 (+60%)</span>
                            <strong className="t-val">${parseFloat(scalpData.top_recommendation.sell_target_2).toFixed(2)}</strong>
                            <span className="t-pnl">+${parseFloat(scalpData.top_recommendation.sell_target_2_pnl).toFixed(2)} profit</span>
                          </div>
                          <div className="target-box stoploss">
                            <span className="t-tag">HARD STOP LOSS (-22%)</span>
                            <strong className="t-val">${parseFloat(scalpData.top_recommendation.stop_loss_exit).toFixed(2)}</strong>
                            <span className="t-pnl">-${parseFloat(scalpData.top_recommendation.stop_loss_loss).toFixed(2)} cut immediately</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="hero-actions-row">
                      <a
                        href={webullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-webull-direct"
                      >
                        <span>Open {symbol} on Webull ↗</span>
                        <ExternalLink size={13} />
                      </a>

                      <button
                        className={`btn-copy-webull ${copiedId === 'hero' ? 'copied' : ''}`}
                        onClick={() => handleCopyWebull(scalpData.top_recommendation.webull_ticker, 'hero')}
                      >
                        {copiedId === 'hero' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedId === 'hero' ? 'Copied to Clipboard!' : 'Copy Webull Order Ticket'}</span>
                      </button>

                      <button
                        className="btn-load-tracker"
                        onClick={() => handleLoadPosition(scalpData.top_recommendation)}
                      >
                        <Clock size={13} />
                        <span>Track Position with Live Sell Signals</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Live Active Scalp Position & Sell Signal Monitor */}
                <div className="active-tracker-card">
                  <div className="tracker-header">
                    <div className="tracker-title-group">
                      <div className="pulse-indicator-dot" />
                      <span className="tracker-title">LIVE SCALP POSITION MONITOR & SELL SIGNALS</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="timer-toggle-btn"
                        onClick={() => setAutoSyncMarket(!autoSyncMarket)}
                        title={autoSyncMarket ? 'Auto-syncing real market price every 10s' : 'Enable auto-sync from live market quotes'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          borderRadius: '4px',
                          background: autoSyncMarket ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${autoSyncMarket ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
                          color: autoSyncMarket ? '#10b981' : '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        <RefreshCw size={11} className={autoSyncMarket ? 'spin-icon' : ''} />
                        <span>{autoSyncMarket ? 'Live Auto-Sync: ON' : 'Live Auto-Sync: OFF'}</span>
                      </button>

                      <div className="timer-controls">
                        <Clock size={13} style={{ color: isTimeLimitWarning ? '#ef4444' : '#0284c7' }} />
                        <span className={`timer-digits ${isTimeLimitWarning ? 'warning' : ''}`}>
                          {formatTimer(elapsedSeconds)} / 15:00
                        </span>
                        <button
                          className="timer-toggle-btn"
                          onClick={() => setIsTimerRunning(!isTimerRunning)}
                        >
                          {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                        <button
                          className="timer-toggle-btn"
                          onClick={() => {
                            setElapsedSeconds(0)
                            setIsTimerRunning(true)
                          }}
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="tracker-body-grid">
                    {/* Position Details Inputs */}
                    <div className="tracker-inputs-col">
                      <span className="sub-label">YOUR CONTRACT:</span>
                      <div className="contract-preview-badge">
                        {symbol} {scalpData.top_recommendation?.expiration} ${scalpData.top_recommendation?.strike} {scalpData.top_recommendation?.type}
                      </div>

                      {/* Quantity & Sound Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0.35rem 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>QTY:</span>
                          {[1, 2, 3, 5].map((q) => (
                            <button
                              key={q}
                              className={`b-pill ${contractQty === q ? 'active' : ''}`}
                              onClick={() => setContractQty(q)}
                              style={{ padding: '2px 7px', fontSize: '0.70rem', minWidth: '26px' }}
                            >
                              {q}x
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setSoundEnabled(!soundEnabled)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'none',
                            border: 'none',
                            color: soundEnabled ? '#10b981' : '#64748b',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            padding: '2px 4px'
                          }}
                          title={soundEnabled ? 'Audio alert enabled for sell signals' : 'Audio alert muted'}
                        >
                          <Bell size={12} />
                          <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
                        </button>
                      </div>

                      <div className="price-inputs-row">
                        <div className="p-input-box">
                          <label>You Paid (Per Share):</label>
                          <div className="input-wrap">
                            <span>$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={tradeEntryPrice}
                              onChange={(e) => setTradeEntryPrice(parseFloat(e.target.value) || 0.30)}
                            />
                          </div>
                          <span className="hint">Total Cost: ${costTotal}</span>
                        </div>

                        <div className="p-input-box">
                          <label>Current Option Price:</label>
                          <div className="input-wrap">
                            <span>$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={tradeCurrentPrice}
                              onChange={(e) => setTradeCurrentPrice(parseFloat(e.target.value) || 0.30)}
                            />
                          </div>
                          <span className="hint">Current Value: ${currentTotal}</span>
                        </div>
                      </div>

                      {/* Live Quick Simulation Buttons */}
                      <div className="quick-sim-buttons">
                        <span className="sim-label">SIMULATE TICK:</span>
                        <button onClick={() => setTradeCurrentPrice(parseFloat((tradeEntryPrice * 0.78).toFixed(2)))} className="sim-pill red">-22% Drop</button>
                        <button onClick={() => setTradeCurrentPrice(tradeEntryPrice)} className="sim-pill">Breakeven</button>
                        <button onClick={() => setTradeCurrentPrice(parseFloat((tradeEntryPrice * 1.25).toFixed(2)))} className="sim-pill green">+25% Pop</button>
                        <button onClick={() => setTradeCurrentPrice(parseFloat((tradeEntryPrice * 1.60).toFixed(2)))} className="sim-pill green">+60% Rip</button>
                      </div>
                    </div>

                    {/* Dynamic Real-Time Sell Signal Engine */}
                    <div className="tracker-signal-col">
                      <div className={`signal-status-box ${isTarget2Hit ? 'target2' : isTarget1Hit ? 'target1' : isStopLossHit ? 'stoploss' : isTimeLimitWarning ? 'timestop' : 'holding'}`}>
                        <div className="signal-badge-head">
                          {isTarget2Hit ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>RUNNER TARGET 2 REACHED (+60%)</span>
                            </>
                          ) : isTarget1Hit ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>TAKE PROFIT TARGET 1 REACHED (+25%)</span>
                            </>
                          ) : isStopLossHit ? (
                            <>
                              <AlertTriangle size={16} />
                              <span>STOP LOSS TRIGGERED (-22%)</span>
                            </>
                          ) : isTimeLimitWarning ? (
                            <>
                              <Clock size={16} />
                              <span>15-MINUTE TIME STOP REACHED</span>
                            </>
                          ) : (
                            <>
                              <Bell size={16} />
                              <span>POSITION ACTIVE (MONITORING IN REAL-TIME)</span>
                            </>
                          )}
                        </div>

                        <div className="signal-pnl-row">
                          <span className="pnl-dollars">
                            {pnlDollars >= 0 ? '+' : ''}${pnlDollars.toFixed(2)}
                          </span>
                          <span className="pnl-pct">
                            ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                          </span>
                        </div>

                        <div className="signal-action-instructions">
                          {isTarget2Hit ? (
                            <strong style={{ color: '#10b981' }}>
                              🚀 ACTION: SELL REMAINING CONTRACTS NOW! You locked in a massive +60% return. Do not get greedy!
                            </strong>
                          ) : isTarget1Hit ? (
                            <strong style={{ color: '#10b981' }}>
                              🎯 ACTION: SELL 1ST CONTRACT TO SECURE PROFIT (+25%). If you have multiple contracts, set stop-loss to entry price on the rest.
                            </strong>
                          ) : isStopLossHit ? (
                            <strong style={{ color: '#ef4444' }}>
                              🔴 ACTION: SELL IMMEDIATELY! Cut the loss at -${Math.abs(pnlDollars)} to preserve your capital. NEVER hold a losing 0DTE to zero!
                            </strong>
                          ) : isTimeLimitWarning ? (
                            <strong style={{ color: '#f59e0b' }}>
                              ⏳ ACTION: 15 minutes elapsed with no directional breakout. Sell at current price to avoid rapid afternoon theta decay.
                            </strong>
                          ) : (
                            <span>
                              Hold position. Looking for momentum push towards <strong>${target1Price.toFixed(2)}</strong> (+25%).
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. All Available Real Live Contracts Matching Budget */}
                <div className="contracts-table-card">
                  <div className="table-header-row">
                    <span className="table-title">ALL LIVE CONTRACTS MATCHING YOUR ${budget} BUDGET ({symbol})</span>
                    <span className="table-sub">Real market prices from Yahoo Finance / Webull</span>
                  </div>

                  <div className="contracts-list">
                    {scalpData.contracts && scalpData.contracts.length > 0 ? (
                      scalpData.contracts.map((c, idx) => (
                        <div key={idx} className="contract-row-item">
                          <div className="col-type-strike">
                            <span className={`badge-type ${c.type === 'CALL' ? 'call' : 'put'}`}>{c.type}</span>
                            <span className="strike-val">${c.strike}</span>
                            <span className="exp-val">Exp: {c.expiration}</span>
                          </div>

                          <div className="col-pricing">
                            <span className="cost-val">${parseFloat(c.contract_cost).toFixed(2)}</span>
                            <span className="share-val">(${parseFloat(c.price_per_share).toFixed(2)}/sh)</span>
                            <span className="vol-val">Vol: {c.volume ? c.volume.toLocaleString() : '0'}</span>
                            {c.vol_oi_ratio && (
                              <span style={{ fontSize: '0.68rem', color: '#06b6d4', fontWeight: 600 }}>({c.vol_oi_ratio}x OI)</span>
                            )}
                          </div>

                          <div className="col-targets">
                            <span className="t1-badge">Target 1: ${parseFloat(c.sell_target_1).toFixed(2)} (+${parseFloat(c.sell_target_1_pnl).toFixed(2)})</span>
                            <span className="sl-badge">Stop: ${parseFloat(c.stop_loss_exit).toFixed(2)} (-${parseFloat(c.stop_loss_loss).toFixed(2)})</span>
                            {c.probability_60pct && (
                              <span style={{ fontSize: '0.68rem', color: c.probability_60pct === 'HIGH' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                60% Surge: {c.probability_60pct}
                              </span>
                            )}
                          </div>

                          <div className="col-actions">
                            <button
                              className="track-sm-btn"
                              onClick={() => handleLoadPosition(c)}
                            >
                              Track Scalp
                            </button>
                            <button
                              className="copy-sm-btn"
                              onClick={() => handleCopyTicket(c.webull_ticker, `row-${idx}`)}
                            >
                              {copiedId === `row-${idx}` ? 'Copied!' : 'Copy Ticket'}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-contracts-msg">
                        No contracts found directly under ${budget}. Try increasing budget to $40 or $50.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="scalp-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                className="paper-sim-btn font-mono"
                onClick={() => {
                  setStatusMsg(null)
                  const top = scalpData?.top_recommendation
                  if (top) {
                    const res = openPosition({
                      symbol: `${symbol} ${top.strike}${top.type === 'CALL' ? 'C' : 'P'}`,
                      assetType: 'Option',
                      entryPrice: top.price_per_share,
                      amount: top.contract_cost,
                      takeProfit: top.contract_cost * 1.25,
                      stopLoss: top.contract_cost * 0.78,
                      reason: `Scalp Trade on ${symbol} ($${top.contract_cost} risk)`
                    })
                    if (res.success) {
                      setStatusMsg('✅ Executed $30 paper scalp contract in your portfolio!')
                    }
                  }
                }}
              >
                <Zap size={13} />
                <span>Simulate Scalp in Paper Trading (${budget})</span>
              </button>

              {statusMsg && (
                <span className="footer-status-text font-mono">{statusMsg}</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <a
                href={webullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-webull-link font-mono"
              >
                <span>Launch Webull ↗</span>
              </a>
              <button className="scalp-done-btn font-mono" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
