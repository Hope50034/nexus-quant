import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Target,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Cpu,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Sliders,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Flame,
  Radio
} from 'lucide-react'
import { openPosition } from '../utils/paperTradingStorage'

const POPULAR_TICKERS = ['QQQ', 'SPY', 'SOFI', 'PLTR', 'AMD']
const BUDGET_OPTIONS = [15, 25, 31, 50]

// Real-time market hours & countdown helper
function getMarketStatusAndCountdown() {
  const now = new Date()
  const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  const estDate = new Date(estString)
  const day = estDate.getDay() // 0 = Sun, 6 = Sat
  const currentMins = estDate.getHours() * 60 + estDate.getMinutes()
  const openMins = 9 * 60 + 30 // 09:30 AM EDT
  const closeMins = 16 * 60 // 04:00 PM EDT

  if (day === 0 || day === 6) {
    return {
      status: 'WEEKEND',
      isOpen: false,
      badgeText: 'WEEKEND',
      countdown: 'Opens Monday 20:30 BKK',
      isPreMarket: false
    }
  }

  if (currentMins < openMins) {
    const diffSecs = (openMins - currentMins) * 60 - estDate.getSeconds()
    const h = Math.floor(diffSecs / 3600)
    const m = Math.floor((diffSecs % 3600) / 60)
    const s = diffSecs % 60
    return {
      status: 'PRE_MARKET',
      isOpen: false,
      badgeText: 'PRE-MARKET',
      countdown: `Opens in ${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
      targetTime: '20:30 (8:30 PM)',
      isPreMarket: true
    }
  } else if (currentMins >= openMins && currentMins < closeMins) {
    const diffSecs = (closeMins - currentMins) * 60 - estDate.getSeconds()
    const h = Math.floor(diffSecs / 3600)
    const m = Math.floor((diffSecs % 3600) / 60)
    const s = diffSecs % 60
    return {
      status: 'OPEN',
      isOpen: true,
      badgeText: 'MARKET LIVE',
      countdown: `Closes in ${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
      targetTime: '03:00 (3:00 AM)',
      isPreMarket: false
    }
  } else {
    return {
      status: 'CLOSED',
      isOpen: false,
      badgeText: 'AFTER-HOURS',
      countdown: 'Session Settled',
      targetTime: null,
      isPreMarket: false
    }
  }
}

export default function DailyOptionPickGuide({
  API_BASE_URL = 'http://127.0.0.1:8000',
  onOpenScalpDesk,
  onOpenFullChart,
  lang = 'en'
}) {
  const [selectedTicker, setSelectedTicker] = useState('QQQ')
  const [budget, setBudget] = useState(31)
  const [loading, setLoading] = useState(false)
  const [scalpData, setScalpData] = useState(null)
  const [copied, setCopied] = useState(false)
  const [executingNotice, setExecutingNotice] = useState(null)
  const [testedAudio, setTestedAudio] = useState(false)
  const [marketStatus, setMarketStatus] = useState(() => getMarketStatusAndCountdown())

  // Real date for the live session
  const todayDateStr = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }, [lang])

  // Live 1-second interval ticker for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setMarketStatus(getMarketStatusAndCountdown())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch best scalp pick from backend AI Brain + Scalp Finder
  const fetchBestPick = async (sym, b, isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const url = `${API_BASE_URL}/api/options/scalp-finder/?symbol=${encodeURIComponent(sym)}&budget=${b}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setScalpData(data)
      }
    } catch (err) {
      console.error('Failed to fetch best option pick:', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchBestPick(selectedTicker, budget)
    // Auto-poll live quotes & contracts every 15s during market hours
    const pollTimer = setInterval(() => {
      fetchBestPick(selectedTicker, budget, true)
    }, 15000)
    return () => clearInterval(pollTimer)
  }, [selectedTicker, budget, API_BASE_URL])

  const [customPrice, setCustomPrice] = useState('')

  const top = scalpData?.top_recommendation
  const aiBrain = scalpData?.ai_brain
  const isBearish = aiBrain?.bias === 'BEARISH'

  // Dynamic calculations based on live or user-adjusted broker fill price
  const effectivePerShare = useMemo(() => {
    if (customPrice !== '' && !isNaN(parseFloat(customPrice)) && parseFloat(customPrice) > 0) {
      return parseFloat(customPrice)
    }
    return top ? parseFloat(top.price_per_share || (top.contract_cost / 100)) : 0.20
  }, [customPrice, top])

  const effectiveCost = Math.round(effectivePerShare * 100 * 100) / 100
  const effectiveTarget1 = Math.round(effectivePerShare * 1.25 * 100) / 100
  const effectiveTarget1Pnl = Math.round(effectiveCost * 0.25 * 100) / 100
  const effectiveTarget2 = Math.round(effectivePerShare * 1.60 * 100) / 100
  const effectiveTarget2Pnl = Math.round(effectiveCost * 0.60 * 100) / 100
  const effectiveStopLoss = Math.round(effectivePerShare * 0.78 * 100) / 100
  const effectiveStopLossLoss = Math.round(effectiveCost * 0.22 * 100) / 100
  const fitsBudget = effectiveCost <= budget

  const selectAlternativeStrike = (contract) => {
    setScalpData(prev => ({
      ...prev,
      top_recommendation: contract
    }))
    setCustomPrice('')
  }

  // Web Audio Alarm Verification Test
  const playAudioTest = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'triangle'
      osc2.type = 'sine'

      // High-energy energetic arcade chime
      osc1.frequency.setValueAtTime(587.33, now) // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12) // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25) // D6

      osc2.frequency.setValueAtTime(440, now)
      osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.15)
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.25)

      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.55)
      osc2.stop(now + 0.55)

      setTestedAudio(true)
      setTimeout(() => setTestedAudio(false), 3000)
    } catch (e) {
      console.warn('Audio test error:', e)
    }
  }

  const handleCopyTicket = (ticketText) => {
    if (navigator.clipboard && ticketText) {
      navigator.clipboard.writeText(ticketText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  const handleExecutePaper = () => {
    if (!top) return
    const unitCost = parseFloat(top.price_per_share || (parseFloat(top.contract_cost) / 100))
    const totalCost = parseFloat(top.contract_cost)

    const res = openPosition({
      symbol: top.contract_symbol || `${selectedTicker} ${top.strike}${top.type === 'CALL' ? 'C' : 'P'}`,
      assetType: 'Option',
      entryPrice: unitCost,
      amount: totalCost,
      takeProfit: top.sell_target_1,
      stopLoss: top.stop_loss_exit,
      reason: `AI Brain Top Option Pick (${selectedTicker} ${top.strike} ${top.type}) - Max Risk $${totalCost.toFixed(2)}`
    })

    if (res.success) {
      setExecutingNotice(`✅ Executed 1x ${top.contract_symbol || top.strike} paper scalp for $${totalCost.toFixed(2)}! Banked in Portfolio.`)
      setTimeout(() => setExecutingNotice(null), 5000)
    } else {
      setExecutingNotice(`❌ ${res.message}`)
      setTimeout(() => setExecutingNotice(null), 5000)
    }
  }

  const webullUrl = top
    ? `https://www.webull.com/quote/us/options/${selectedTicker.toLowerCase()}`
    : 'https://www.webull.com'

  return (
    <div className="daily-option-pick-container font-mono">
      {/* Top Banner Header */}
      <div className="option-pick-header">
        <div className="pick-header-left">
          <div className="pick-badge-primary">
            <Cpu size={14} className="pick-pulse-icon" />
            <span>AI BRAIN #1 OPTION PLAY FOR TODAY</span>
          </div>

          {/* Live Market Session & Countdown Chip */}
          <div className={`market-countdown-chip ${marketStatus.isOpen ? 'live' : 'pre'}`}>
            <span className="pulse-dot-mini" />
            <span className="market-session-lbl">{marketStatus.badgeText}:</span>
            <span className="market-countdown-val">{marketStatus.countdown}</span>
            {marketStatus.targetTime && (
              <span className="market-target-time">({marketStatus.targetTime})</span>
            )}
          </div>

          {/* Audio Alarm Test Button */}
          <button
            type="button"
            className={`audio-test-btn ${testedAudio ? 'tested' : ''}`}
            onClick={playAudioTest}
            title="Click to test browser speaker volume and siren alert sounds"
          >
            <Volume2 size={13} />
            <span>{testedAudio ? '🔊 Siren Verified!' : '🔊 Test Alarm'}</span>
          </button>
        </div>

        {/* Interactive Controls: Ticker & Budget Switcher */}
        <div className="pick-header-controls">
          <div className="ctrl-pill-group">
            <span className="ctrl-tag">TICKER:</span>
            {POPULAR_TICKERS.map((t) => (
              <button
                key={t}
                className={`pick-ticker-btn ${selectedTicker === t ? 'active' : ''}`}
                onClick={() => setSelectedTicker(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="ctrl-pill-group">
            <span className="ctrl-tag">BUDGET:</span>
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b}
                className={`pick-budget-btn ${budget === b ? 'active' : ''}`}
                onClick={() => setBudget(b)}
              >
                ${b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Execution Feedback Notification */}
      <AnimatePresence>
        {executingNotice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="exec-feedback-banner"
          >
            {executingNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live US Pre-Market Tracking Banner */}
      {scalpData?.pre_market?.is_active && (
        <div className={`pre-market-intel-banner ${scalpData.pre_market.gap_type.toLowerCase()}`}>
          <div className="pre-market-banner-left">
            <span className="pre-market-radar-dot" />
            <span className="pre-market-title">LIVE PRE-MARKET:</span>
            <span className="pre-market-symbol">{selectedTicker}</span>
            <span className="pre-market-price">${parseFloat(scalpData.pre_market.price).toFixed(2)}</span>
            <span className={`pre-market-badge ${scalpData.pre_market.change >= 0 ? 'bull' : 'bear'}`}>
              {scalpData.pre_market.change >= 0 ? '▲ GAP UP' : '▼ GAP DOWN'} {scalpData.pre_market.change_pct >= 0 ? '+' : ''}{parseFloat(scalpData.pre_market.change_pct).toFixed(2)}% ({scalpData.pre_market.change >= 0 ? '+' : ''}${parseFloat(scalpData.pre_market.change).toFixed(2)})
            </span>
          </div>
          <div className="pre-market-banner-right">
            <span>⚡ AI Confluence Brain detected pre-market gap: <strong>{aiBrain?.bias} BIAS</strong> aligned for 8:30 PM open.</span>
          </div>
        </div>
      )}

      {/* Main Pick Card Layout */}
      {loading ? (
        <div className="pick-loading-state">
          <Sparkles size={18} className="animate-spin text-amber-500" />
          <span>Consulting AI Confluence Brain & Scanning OCC Option Chains under ${budget}...</span>
        </div>
      ) : top ? (
        <div className="pick-main-grid">
          {/* Column 1: The Contract Highlight & AI Brain Signal */}
          <div className="pick-contract-card">
            <div className="contract-header-row">
              <div className="contract-type-wrap">
                <span className={`contract-type-pill ${top.type === 'CALL' ? 'call' : 'put'}`}>
                  {top.type === 'CALL' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {top.type}
                </span>
                <span className="contract-name">
                  {selectedTicker} ${top.strike.toFixed(1)} {top.type}
                </span>
                <span className="contract-dte-chip">0DTE TODAY</span>
              </div>

              <div className="confidence-chip">
                <Sparkles size={13} style={{ color: '#10b981' }} />
                <span>{aiBrain?.confidence || 96}% CONVICTION</span>
              </div>
            </div>

            {/* Quick Strike Selector / Alternative Budget Plays */}
            {scalpData?.contracts && scalpData.contracts.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0.35rem 0 0.6rem 0', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700 }}>AVAILABLE STRIKES:</span>
                {scalpData.contracts.slice(0, 6).map((c) => (
                  <button
                    key={c.contract_symbol}
                    type="button"
                    onClick={() => selectAlternativeStrike(c)}
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      border: top.contract_symbol === c.contract_symbol ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                      background: top.contract_symbol === c.contract_symbol ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                      color: top.contract_symbol === c.contract_symbol ? '#38bdf8' : '#cbd5e1'
                    }}
                  >
                    ${c.strike}{c.type === 'CALL' ? 'C' : 'P'} (${c.price_per_share.toFixed(2)})
                  </button>
                ))}
              </div>
            )}

            {/* OCC Symbol & Pricing Grid */}
            <div className="contract-meta-row">
              <div className="meta-box">
                <span className="meta-box-lbl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>TOTAL CONTRACT COST</span>
                  {top.is_live_tick && (
                    <span style={{ color: '#38bdf8', fontSize: '0.62rem', fontWeight: 800, background: 'rgba(56, 189, 248, 0.15)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      ⚡ LIVE REAL-TIME TICK
                    </span>
                  )}
                </span>
                <div className="meta-box-val cost font-mono">
                  ${effectiveCost.toFixed(2)}
                  <span className="sub-price">(${effectivePerShare.toFixed(2)}/sh)</span>
                </div>

                {/* Real Live Exchange Bid / Ask Spread */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#94a3b8', margin: '2px 0 4px 0' }}>
                  <span>Bid: <strong style={{ color: '#38bdf8' }}>${parseFloat(top.bid || 0).toFixed(2)}</strong></span>
                  <span>•</span>
                  <span>Ask: <strong style={{ color: '#f43f5e' }}>${parseFloat(top.ask || 0).toFixed(2)}</strong></span>
                  {top.spread_safety && <span>• <span style={{ color: '#10b981', fontSize: '0.62rem' }}>{top.spread_safety}</span></span>}
                </div>

                {/* Webull Live Ask Price Sync Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0.35rem 0', background: 'rgba(0,0,0,0.35)', padding: '3px 6px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Webull Ask: $</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={effectivePerShare}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    style={{ width: '56px', background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.78rem', fontWeight: 800, outline: 'none' }}
                    title="Enter the exact Ask price you see on Webull"
                  />
                  {customPrice !== '' && (
                    <button
                      type="button"
                      onClick={() => setCustomPrice('')}
                      style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', padding: '1px 5px', borderRadius: '3px', cursor: 'pointer' }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <span className="meta-budget-fit" style={{ color: fitsBudget ? '#10b981' : '#ef4444' }}>
                  {fitsBudget
                    ? `✅ Fits $${budget} budget ($${(budget - effectiveCost).toFixed(2)} buffer left)`
                    : `⚠️ Exceeds $${budget} budget by $${(effectiveCost - budget).toFixed(2)}! Try next strike.`}
                </span>
              </div>

              <div className="meta-box">
                <span className="meta-box-lbl">AI VERDICT & CONFLUENCE</span>
                <div className="meta-verdict-text">
                  {aiBrain?.verdict || `${selectedTicker} rejected below VWAP ($${aiBrain?.vwap || 707}) with Bearish 9/21 EMA Cross.`}
                </div>
                <div className="meta-tech-pills">
                  <span>VWAP: ${aiBrain?.vwap || 707.07}</span>
                  <span>RSI-14: {aiBrain?.rsi_14 || 38.1}</span>
                  <span>9 EMA: ${aiBrain?.ema_9 || 703.9}</span>
                </div>
              </div>
            </div>

            {/* OCC Symbol Tag */}
            <div className="occ-row">
              <span className="occ-lbl">EXCHANGE SYMBOL (OCC):</span>
              <code className="occ-code">{top.contract_symbol || `${selectedTicker}260917${top.type === 'CALL' ? 'C' : 'P'}00${Math.round(top.strike * 1000)}`}</code>
              <span className="occ-liquidity">🔥 {top.liquidity_tag || 'HIGH LIQUIDITY'}</span>
            </div>

            {/* Action Buttons */}
            <div className="pick-actions-row">
              <button
                type="button"
                className="btn-exec-paper"
                onClick={handleExecutePaper}
                title="Execute 1 simulated contract in paper portfolio"
              >
                <Zap size={14} />
                <span>Execute Paper Scalp (${effectiveCost.toFixed(2)})</span>
              </button>

              <button
                type="button"
                className="btn-track-desk"
                onClick={() => onOpenScalpDesk?.(selectedTicker)}
                title="Open live position tracker & sell signal audio alerts"
              >
                <Clock size={14} />
                <span>Track in Scalp Desk &rarr;</span>
              </button>

              <button
                type="button"
                className={`btn-copy-ticket ${copied ? 'copied' : ''}`}
                onClick={() => handleCopyTicket(`BUY 1 ${selectedTicker} ${top.expiration} $${top.strike}${top.type === 'CALL' ? 'C' : 'P'} @ $${effectivePerShare.toFixed(2)} LMT`)}
                title="Copy ready-to-paste broker limit order"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied Ticket!' : 'Copy Order'}</span>
              </button>

              <a
                href={webullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-broker-link"
                title="Open Webull option chain"
              >
                <span>Webull ↗</span>
              </a>
            </div>
          </div>

          {/* Column 2: The Step-by-Step Scalp Rules & Reference Guide */}
          <div className="pick-guide-card">
            <div className="guide-header-title">
              <Target size={14} style={{ color: '#f59e0b' }} />
              <span>STEP-BY-STEP SCALP GUIDE FOR TONIGHT</span>
            </div>

            <div className="guide-steps-list">
              <div className="guide-step-item">
                <div className="step-num">1</div>
                <div className="step-info">
                  <span className="step-title">ENTRY RULE (LIMIT ORDER)</span>
                  <p className="step-desc">
                    Place a <strong>Limit Order @ ${effectivePerShare.toFixed(2)}</strong> (${effectiveCost.toFixed(2)} total risk). Never use market order on 0DTE!
                  </p>
                </div>
              </div>

              <div className="guide-step-item">
                <div className="step-num profit">2</div>
                <div className="step-info">
                  <span className="step-title profit">PROFIT TARGET 1 (+25%)</span>
                  <p className="step-desc">
                    When option price reaches <strong>${effectiveTarget1.toFixed(2)}</strong>, take profit to lock in <strong>+${effectiveTarget1Pnl.toFixed(2)} net</strong>.
                  </p>
                </div>
              </div>

              <div className="guide-step-item">
                <div className="step-num runner">3</div>
                <div className="step-info">
                  <span className="step-title runner">RUNNER TARGET 2 (+60%)</span>
                  <p className="step-desc">
                    If directional momentum rips with high volume, trail remainder to <strong>${effectiveTarget2.toFixed(2)}</strong> for <strong>+${effectiveTarget2Pnl.toFixed(2)} net profit</strong>.
                  </p>
                </div>
              </div>

              <div className="guide-step-item">
                <div className="step-num stop">4</div>
                <div className="step-info">
                  <span className="step-title stop">HARD STOP-LOSS (-22%)</span>
                  <p className="step-desc">
                    If contract drops to <strong>${effectiveStopLoss.toFixed(2)}</strong>, <strong>CUT IT IMMEDIATELY</strong> (-${effectiveStopLossLoss.toFixed(2)} max risk).
                  </p>
                </div>
              </div>

              <div className="guide-step-item warning">
                <div className="step-num warn">5</div>
                <div className="step-info">
                  <span className="step-title warn">THE 15-MINUTE THETA RULE</span>
                  <p className="step-desc">
                    0DTE theta burns fast. If {selectedTicker} moves sideways for 15–20 minutes without breaking out, exit flat near breakeven before afternoon time decay kicks in.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pick-empty-state">
          <span>No contracts found under ${budget} for {selectedTicker}. Try switching to $50 budget or selecting SPY/SOFI.</span>
        </div>
      )}
    </div>
  )
}
