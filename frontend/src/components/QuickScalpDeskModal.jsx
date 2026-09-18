import { useState, useEffect, useMemo } from 'react'
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
  Sparkles,
  ShieldCheck,
  Volume2,
  VolumeX,
  Flame,
  Download
} from 'lucide-react'
import {
  openPosition,
  closePosition,
  getPortfolio,
  calculatePortfolioStats,
  exportPortfolioHistoryToCSV
} from '../utils/paperTradingStorage'

const POPULAR_TICKERS = ['QQQ', 'SPY', 'SOFI', 'PLTR', 'AMD', 'NVDA', 'TSLA']
const BUDGET_PRESETS = [10, 15, 20, 25, 30, 31, 50, 75, 100]

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
  const [showPlaybookGuide, setShowPlaybookGuide] = useState(true)

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
  const [soundMode, setSoundMode] = useState('GAMER') // 'GAMER' | 'CHIME'
  const [soundVolume, setSoundVolume] = useState(0.30) // 0.30 loud, 0.15 med, 0 muted
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )
  const [customAlertPrice, setCustomAlertPrice] = useState('')
  const [customAlertActive, setCustomAlertActive] = useState(false)
  const [customAlertFired, setCustomAlertFired] = useState(false)
  const [activePositionId, setActivePositionId] = useState(null)
  const [positionClosedNotice, setPositionClosedNotice] = useState(null)

  const playSignalSound = (type, customMode = soundMode) => {
    if (!soundEnabled || soundVolume <= 0) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      const vol = soundVolume
      const now = ctx.currentTime

      if (type === 'PROFIT') {
        if (customMode === 'GAMER') {
          // High-pitch 4-note victory arpeggio (C6 -> E6 -> G6 -> C7) designed to pierce gaming headsets
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(1046.50, now)
          osc.frequency.setValueAtTime(1318.51, now + 0.09)
          osc.frequency.setValueAtTime(1567.98, now + 0.18)
          osc.frequency.setValueAtTime(2093.00, now + 0.27)
          gain.gain.setValueAtTime(vol * 1.5, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65)
          osc.start(now)
          osc.stop(now + 0.65)
        } else {
          // Melodic 2-tone chime
          osc.frequency.setValueAtTime(587.33, now)
          osc.frequency.setValueAtTime(880, now + 0.1)
          gain.gain.setValueAtTime(vol, now)
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
          osc.start(now)
          osc.stop(now + 0.35)
        }
      } else if (type === 'STOP') {
        // Urgent descending siren buzzer for stop loss
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(440, now)
        osc.frequency.setValueAtTime(330, now + 0.12)
        osc.frequency.setValueAtTime(220, now + 0.24)
        gain.gain.setValueAtTime(vol * 1.3, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
        osc.start(now)
        osc.stop(now + 0.55)
      } else if (type === 'CUSTOM') {
        // High-pitch alert ping
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now)
        osc.frequency.setValueAtTime(1318.5, now + 0.12)
        gain.gain.setValueAtTime(vol * 1.2, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
        osc.start(now)
        osc.stop(now + 0.45)
      }
    } catch (e) {
      console.warn('Audio alert error:', e)
    }
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Desktop push notifications are not supported in this browser.')
      return
    }
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') {
      sendDesktopNotification(
        '🎮 Desktop Game Alerts Enabled!',
        'You will receive Windows notification toasts when options hit +25%, +60% profit, or stop loss while you game.',
        'test-notif'
      )
    }
  }

  const sendDesktopNotification = (title, body, tag = 'scalp-alert') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag,
          renotify: true,
          requireInteraction: true // Stays visible until clicked so gamers never miss it!
        })
        notif.onclick = () => {
          window.focus()
          notif.close()
        }
      } catch (e) {
        console.warn('Desktop notification error:', e)
      }
    }
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

  // Check for any matching open option position when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const port = getPortfolio()
        const match = port.positions.find(p => p.symbol.startsWith(symbol) && p.assetType === 'Option')
        if (match) {
          setActivePositionId(match.id)
          setTradeEntryPrice(match.entryPrice)
          setTradeCurrentPrice(match.entryPrice)
          const qty = Math.max(1, Math.round(match.quantity / 100))
          setContractQty(qty)
          setIsTimerRunning(true)
        }
      } catch (e) {}
    }
  }, [isOpen, symbol])

  const handleExecutePaperScalp = () => {
    setStatusMsg(null)
    setPositionClosedNotice(null)
    const target = activeTrade || scalpData?.top_recommendation
    if (!target) return

    const unitCost = Number(target.price_per_share || (target.contract_cost / 100))
    const totalCost = Number((target.contract_cost * contractQty).toFixed(2))

    const res = openPosition({
      symbol: target.contract_symbol || `${symbol} ${target.strike}${target.type === 'CALL' ? 'C' : 'P'}`,
      assetType: 'Option',
      entryPrice: unitCost,
      amount: totalCost,
      takeProfit: target.sell_target_1,
      stopLoss: target.stop_loss_exit,
      reason: `0DTE Scalp ${target.contract_symbol || symbol} (${contractQty}x contract, Max Risk $${totalCost.toFixed(2)})`
    })

    if (res.success) {
      setActivePositionId(res.position.id)
      setActiveTrade(target)
      setTradeEntryPrice(unitCost)
      setTradeCurrentPrice(unitCost)
      setIsTimerRunning(true)
      setElapsedSeconds(0)
      setStatusMsg(`✅ Executed ${contractQty}x contract ($${totalCost.toFixed(2)}) paper trade! Tracking live.`)
    } else {
      setStatusMsg(`❌ ${res.message}`)
    }
  }

  const handleClosePaperPosition = () => {
    const currentP = Number(tradeCurrentPrice)
    if (activePositionId) {
      const res = closePosition(activePositionId, currentP)
      if (res.success) {
        const closed = res.closedTrade
        setPositionClosedNotice({
          pnlDollar: closed.pnlDollar,
          pnlPercent: closed.pnlPercent,
          outcome: closed.outcome,
          exitPrice: currentP
        })
        setActivePositionId(null)
        setIsTimerRunning(false)
        playSignalSound(closed.pnlDollar >= 0 ? 'PROFIT' : 'STOP')
        setStatusMsg(`🎉 Sold at $${currentP.toFixed(2)}! Net PnL: ${closed.pnlDollar >= 0 ? '+' : ''}$${closed.pnlDollar.toFixed(2)} (${closed.pnlPercent >= 0 ? '+' : ''}${closed.pnlPercent.toFixed(1)}%) banked to balance.`)
      }
    } else {
      const totalC = costTotal
      const exitVal = currentTotal
      const diff = exitVal - totalC
      const pct = totalC > 0 ? (diff / totalC) * 100 : 0
      setPositionClosedNotice({
        pnlDollar: diff,
        pnlPercent: pct,
        outcome: diff >= 0 ? 'WIN' : 'LOSS',
        exitPrice: currentP
      })
      setIsTimerRunning(false)
      playSignalSound(diff >= 0 ? 'PROFIT' : 'STOP')
      setStatusMsg(`🎉 Paper scalp closed at $${currentP.toFixed(2)}! Net PnL: ${diff >= 0 ? '+' : ''}$${diff.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`)
    }
  }

  const handleLoadPosition = (contract) => {
    if (!contract) return
    const unitCost = parseFloat(contract.price_per_share || (parseFloat(contract.contract_cost) / 100))
    setActiveTrade(contract)
    setTradeEntryPrice(unitCost)
    setTradeCurrentPrice(unitCost)
    setIsTimerRunning(true)
    setElapsedSeconds(0)
    setCustomAlertFired(false)
    setStatusMsg(`📡 Tracking ${contract.contract_symbol || contract.strike} live. Sell signal engine active!`)
  }

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
    if (!isOpen) return
    if (isTarget2Hit || isTarget1Hit) {
      playSignalSound('PROFIT')
    } else if (isStopLossHit) {
      playSignalSound('STOP')
    }
  }, [isOpen, isTarget1Hit, isTarget2Hit, isStopLossHit])

  // Flashing window title for background gaming tabs
  useEffect(() => {
    if (!isOpen) return
    let interval = null
    const originalTitle = 'WEHAWT QUANT'
    if (isTarget2Hit || isTarget1Hit || isStopLossHit) {
      const alertLabel = isTarget2Hit ? '🚀 +60% PROFIT!' : isTarget1Hit ? '🎯 +25% TARGET!' : '🔴 STOP LOSS!'
      interval = setInterval(() => {
        document.title = document.title === originalTitle ? `(🚨 ${alertLabel}) ${symbol}` : originalTitle
      }, 800)
    } else {
      document.title = originalTitle
    }
    return () => {
      if (interval) clearInterval(interval)
      document.title = originalTitle
    }
  }, [isOpen, isTarget1Hit, isTarget2Hit, isStopLossHit, symbol])

  // Desktop push notification triggers (visible over video games)
  useEffect(() => {
    if (!isOpen) return
    if (isTarget2Hit) {
      sendDesktopNotification(
        `🚀 RUNNER TARGET 2 HIT (+60%)!`,
        `Your ${symbol} scalp reached $${tradeCurrentPrice.toFixed(2)} (+${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)}). Sell remaining contracts now!`,
        'target-2'
      )
    } else if (isTarget1Hit) {
      sendDesktopNotification(
        `🎯 TAKE PROFIT TARGET 1 REACHED (+25%)!`,
        `Your ${symbol} scalp is at $${tradeCurrentPrice.toFixed(2)} (+$${pnlDollars.toFixed(2)}). Sell 1st contract to lock in green!`,
        'target-1'
      )
    } else if (isStopLossHit) {
      sendDesktopNotification(
        `🔴 STOP LOSS TRIGGERED (-22%)!`,
        `Your ${symbol} scalp dropped to $${tradeCurrentPrice.toFixed(2)} (-$${Math.abs(pnlDollars).toFixed(2)}). Cut the position immediately!`,
        'stop-loss'
      )
    } else if (isTimeLimitWarning) {
      sendDesktopNotification(
        `⏳ 15-MINUTE TIME STOP REACHED`,
        `Your ${symbol} position has been open 15 mins with no breakout. Close to avoid theta decay!`,
        'time-stop'
      )
    }
  }, [isOpen, isTarget1Hit, isTarget2Hit, isStopLossHit, isTimeLimitWarning, symbol, tradeCurrentPrice, pnlDollars])

  // Custom Price Alert Trigger
  useEffect(() => {
    if (!isOpen) return
    if (customAlertActive && !customAlertFired && customAlertPrice) {
      const targetP = parseFloat(customAlertPrice)
      if (!isNaN(targetP) && tradeCurrentPrice >= targetP) {
        setCustomAlertFired(true)
        playSignalSound('CUSTOM')
        sendDesktopNotification(
          `🔔 CUSTOM PRICE TARGET REACHED!`,
          `${symbol} option hit your target of $${targetP.toFixed(2)} (Current: $${tradeCurrentPrice.toFixed(2)})!`,
          'custom-alert'
        )
      }
    }
  }, [isOpen, tradeCurrentPrice, customAlertPrice, customAlertActive, customAlertFired, symbol])

  // Webull URL
  const cleanSym = symbol.replace('-USD', '').toLowerCase()
  const webullUrl = `https://app.webull.com/quote/us/option/nasdaq-${cleanSym}`

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Paper Trading Streak & Performance Stats
  const paperStats = useMemo(() => {
    try {
      return calculatePortfolioStats(getPortfolio())
    } catch (e) {
      return null
    }
  }, [isOpen, statusMsg, positionClosedNotice])

  if (!isOpen) return null

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

                    {/* 1-Minute Scalp Playbook: When to Buy & When to Stop */}
                    <div style={{
                      marginBottom: '12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      overflow: 'hidden'
                    }}>
                      <div
                        onClick={() => setShowPlaybookGuide(!showPlaybookGuide)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'linear-gradient(90deg, rgba(2, 132, 199, 0.2) 0%, rgba(15, 23, 42, 0.4) 100%)',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem' }}>🎯</span>
                          <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#38bdf8', letterSpacing: '0.3px' }}>
                            1-MINUTE CHEAT SHEET: EXACTLY WHEN TO BUY & WHEN TO STOP
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: '4px' }}>
                          {showPlaybookGuide ? '▲ Collapse' : '▼ View Rules'}
                        </span>
                      </div>

                      {showPlaybookGuide && (
                        <div style={{ padding: '10px 14px', fontSize: '0.75rem', lineHeight: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '10px' }}>
                            {/* WHEN TO BUY */}
                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px', padding: '9px 11px' }}>
                              <div style={{ color: '#10b981', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>🟢</span> WHEN TO BUY (3 GREEN LIGHTS):
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', spaceY: '4px' }}>
                                <li><strong style={{ color: '#f8fafc' }}>Trend Confluence:</strong> If price &gt; VWAP and 9 EMA &gt; 21 EMA, buy <strong>CALLS</strong>. If price &lt; VWAP and 9 EMA &lt; 21 EMA, buy <strong>PUTS</strong>.</li>
                                <li><strong style={{ color: '#f8fafc' }}>Tight Spread:</strong> Bid/Ask spread must be <strong>$0.01 – $0.02</strong>. Never buy wide spreads ($0.05+).</li>
                                <li><strong style={{ color: '#f8fafc' }}>Order Execution:</strong> Place a <strong>Limit Order at Bid or Mid-Price</strong> on Webull. Never use Market Orders!</li>
                              </ul>
                            </div>

                            {/* WHEN TO STOP / EXIT */}
                            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', padding: '9px 11px' }}>
                              <div style={{ color: '#ef4444', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>🔴</span> WHEN TO STOP / SELL (3 HARD RULES):
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', spaceY: '4px' }}>
                                <li><strong style={{ color: '#10b981' }}>Target 1 (+25%):</strong> Sell 1st contract / 50% to bank cash. Move stop-loss to entry on rest.</li>
                                <li><strong style={{ color: '#10b981' }}>Runner Target 2 (+60%):</strong> Sell remaining contracts. Do not get greedy!</li>
                                <li><strong style={{ color: '#ef4444' }}>Hard Stop (-22%):</strong> Cut immediately if down -22%. <em>Never hold a losing 0DTE to zero.</em></li>
                                <li><strong style={{ color: '#f59e0b' }}>15-Min Time Stop:</strong> If no breakout in 15 mins, exit at breakeven before theta decay starts.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Data Mismatch Explainer */}
                          <div style={{ padding: '6px 10px', borderRadius: '5px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#fde68a', fontSize: '0.71rem' }}>
                            <strong style={{ color: '#fbbf24' }}>💡 Why prices may differ from Webull / Broker:</strong> Free public exchange feeds (Yahoo Finance) are delayed by ~15 mins and freeze outside NYSE market hours (9:30 AM – 4:00 PM EST). Webull uses live real-time OPRA feeds. 
                            Look up the OCC code on Webull, enter using Webull's live Bid/Ask, and click <strong>"Sync With My Broker Fill Price"</strong> below to track your real-time dollar profit with exact mathematical accuracy!
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="hero-badge-row">
                      <span className="hero-status-tag">
                        <Sparkles size={13} />
                        BEST SCALP PICK RIGHT NOW FOR ${budget}
                      </span>
                      <span className="hero-spot-info">
                        {symbol} {scalpData.pre_market?.is_active ? 'Pre-Market:' : 'Spot:'} <strong>${scalpData.pre_market?.is_active ? parseFloat(scalpData.pre_market.price).toFixed(2) : scalpData.current_underlying_price}</strong> ({scalpData.pre_market?.is_active ? `${scalpData.pre_market.change >= 0 ? '+' : ''}${parseFloat(scalpData.pre_market.change_pct).toFixed(2)}% ${scalpData.pre_market.gap_type.replace('_', ' ')}` : `${scalpData.intraday_change_pct >= 0 ? '+' : ''}${scalpData.intraday_change_pct}% 15m Momentum`})
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

                        {/* Official OCC Exchange Contract & Slippage Verification */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                          margin: '0.35rem 0 0.55rem 0',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'rgba(2, 132, 199, 0.08)',
                          border: '1px solid rgba(2, 132, 199, 0.25)',
                          fontSize: '0.74rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <ShieldCheck size={14} style={{ color: '#38bdf8' }} />
                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>OCC SYMBOL:</span>
                            <span style={{ color: '#f8fafc', fontWeight: 700, letterSpacing: '0.5px' }}>
                              {scalpData.top_recommendation.contract_symbol || `${symbol} OPTION`}
                            </span>
                            <button
                              onClick={() => handleCopyTicket(scalpData.top_recommendation.contract_symbol || scalpData.top_recommendation.webull_ticker, 'occ-hero')}
                              style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: copiedId === 'occ-hero' ? '#10b981' : '#cbd5e1',
                                borderRadius: '3px',
                                padding: '1px 6px',
                                fontSize: '0.68rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Copy official OCC Clearing symbol for broker"
                            >
                              {copiedId === 'occ-hero' ? <Check size={10} /> : <Copy size={10} />}
                              <span>{copiedId === 'occ-hero' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                            <span>
                              Bid/Ask: <strong style={{ color: '#f8fafc' }}>${scalpData.top_recommendation.bid ?? '—'} / ${scalpData.top_recommendation.ask ?? '—'}</strong>
                            </span>
                            <span style={{
                              padding: '1px 6px',
                              borderRadius: '3px',
                              background: (scalpData.top_recommendation.spread <= 0.02) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: (scalpData.top_recommendation.spread <= 0.02) ? '#10b981' : '#f59e0b',
                              fontWeight: 700
                            }}>
                              Spread: ${scalpData.top_recommendation.spread !== undefined ? scalpData.top_recommendation.spread.toFixed(2) : '0.01'} ({scalpData.top_recommendation.spread_safety || 'LOW SLIPPAGE'})
                            </span>
                            {scalpData.top_recommendation.implied_volatility !== undefined && (
                              <span style={{ color: '#c084fc', fontWeight: 600 }}>
                                📊 IV: {scalpData.top_recommendation.implied_volatility}%
                              </span>
                            )}
                          </div>
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
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#10b981', color: '#fff' }}
                        onClick={handleExecutePaperScalp}
                      >
                        <Zap size={13} />
                        <span>Execute Paper Scalp (${(parseFloat(scalpData.top_recommendation.contract_cost) * contractQty).toFixed(2)})</span>
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
                      <div className="contract-preview-badge" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <span>{symbol} {(activeTrade || scalpData.top_recommendation)?.expiration} ${(activeTrade || scalpData.top_recommendation)?.strike} {(activeTrade || scalpData.top_recommendation)?.type}</span>
                        {(activeTrade || scalpData.top_recommendation)?.contract_symbol && (
                          <span style={{ fontSize: '0.70rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.3px', background: 'rgba(2, 132, 199, 0.15)', padding: '1px 6px', borderRadius: '3px' }}>
                            🛡️ {(activeTrade || scalpData.top_recommendation).contract_symbol}
                          </span>
                        )}
                      </div>

                      {/* Quantity Bar */}
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
                      </div>

                      {/* Gamer & Background Alerts Customization Suite */}
                      <div style={{
                        margin: '0.45rem 0 0.65rem 0',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '0.74rem'
                      }}>
                        {/* Top Controls Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={requestNotificationPermission}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                background: notifPermission === 'granted' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(2, 132, 199, 0.18)',
                                border: `1px solid ${notifPermission === 'granted' ? '#10b981' : '#0284c7'}`,
                                color: notifPermission === 'granted' ? '#10b981' : '#38bdf8',
                                cursor: 'pointer'
                              }}
                              title="Trigger Windows desktop notifications so you never miss a sell target while playing video games"
                            >
                              <Bell size={11} />
                              <span>{notifPermission === 'granted' ? '🔔 Game Push Alerts: ON' : '🔔 Enable Game Push Alerts'}</span>
                            </button>

                            {/* Sound Mode Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                onClick={() => setSoundMode('GAMER')}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '0.68rem',
                                  borderRadius: '3px',
                                  background: soundMode === 'GAMER' ? '#10b981' : 'rgba(255,255,255,0.06)',
                                  color: soundMode === 'GAMER' ? '#000' : '#94a3b8',
                                  fontWeight: soundMode === 'GAMER' ? 800 : 500,
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                title="High-frequency loud 4-tone arpeggio designed to pierce through game audio and headsets"
                              >
                                🎮 Gamer Loud
                              </button>
                              <button
                                onClick={() => setSoundMode('CHIME')}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '0.68rem',
                                  borderRadius: '3px',
                                  background: soundMode === 'CHIME' ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                                  color: soundMode === 'CHIME' ? '#000' : '#94a3b8',
                                  fontWeight: soundMode === 'CHIME' ? 800 : 500,
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                title="Smooth gentle 2-tone melodic chime"
                              >
                                🔔 Chime
                              </button>
                            </div>
                          </div>

                          {/* Volume & Test Controls */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => {
                                if (soundVolume === 0.30) setSoundVolume(0.15)
                                else if (soundVolume === 0.15) setSoundVolume(0)
                                else setSoundVolume(0.30)
                              }}
                              style={{
                                background: 'none',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '3px',
                                padding: '2px 6px',
                                fontSize: '0.68rem',
                                color: soundVolume > 0 ? '#e2e8f0' : '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Toggle audio alert volume level"
                            >
                              {soundVolume > 0 ? <Volume2 size={11} /> : <VolumeX size={11} />}
                              <span>{soundVolume === 0.30 ? 'Loud 100%' : soundVolume === 0.15 ? 'Med 50%' : 'Muted'}</span>
                            </button>

                            <button
                              onClick={() => playSignalSound('PROFIT')}
                              style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '3px',
                                padding: '2px 6px',
                                fontSize: '0.68rem',
                                color: '#38bdf8',
                                cursor: 'pointer'
                              }}
                              title="Play a test sound to calibrate your headset volume"
                            >
                              Test Sound 🔊
                            </button>
                          </div>
                        </div>

                        {/* Custom Price Alert Sub-bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '5px', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.70rem', fontWeight: 600 }}>Custom Price Alert:</span>
                          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.12)', padding: '1px 6px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.70rem' }}>$</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder={target1Price.toFixed(2)}
                              value={customAlertPrice}
                              onChange={(e) => {
                                setCustomAlertPrice(e.target.value)
                                setCustomAlertFired(false)
                              }}
                              style={{
                                width: '55px',
                                background: 'none',
                                border: 'none',
                                color: '#f8fafc',
                                fontSize: '0.72rem',
                                padding: '2px 4px',
                                outline: 'none'
                              }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (!customAlertPrice) setCustomAlertPrice(target1Price.toFixed(2))
                              setCustomAlertActive(!customAlertActive)
                              setCustomAlertFired(false)
                            }}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.70rem',
                              borderRadius: '3px',
                              background: customAlertActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.06)',
                              border: `1px solid ${customAlertActive ? '#10b981' : 'rgba(255,255,255,0.15)'}`,
                              color: customAlertActive ? '#10b981' : '#cbd5e1',
                              fontWeight: customAlertActive ? 700 : 500,
                              cursor: 'pointer'
                            }}
                          >
                            {customAlertActive ? (customAlertFired ? '✅ Alert Fired!' : '🟢 Alert Armed') : '+ Arm Price Alert'}
                          </button>
                        </div>
                      </div>

                      {/* Quick Sync from Orderbook */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginBottom: '8px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        background: 'rgba(2, 132, 199, 0.1)',
                        border: '1px dashed rgba(56, 189, 248, 0.3)'
                      }}>
                        <span style={{ fontSize: '0.70rem', color: '#38bdf8', fontWeight: 700 }}>
                          ⚡ QUICK SYNC FROM LIVE ORDERBOOK:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {scalpData?.top_recommendation?.ask && (
                            <button
                              onClick={() => {
                                const ask = parseFloat(scalpData.top_recommendation.ask)
                                setTradeEntryPrice(ask)
                                setTradeCurrentPrice(ask)
                              }}
                              style={{
                                padding: '2px 6px',
                                fontSize: '0.68rem',
                                borderRadius: '3px',
                                background: 'rgba(255,255,255,0.08)',
                                color: '#e2e8f0',
                                border: '1px solid rgba(255,255,255,0.15)',
                                cursor: 'pointer'
                              }}
                              title="Set price to current Ask quote"
                            >
                              Ask: ${scalpData.top_recommendation.ask}
                            </button>
                          )}
                          {scalpData?.top_recommendation?.bid && (
                            <button
                              onClick={() => {
                                const bid = parseFloat(scalpData.top_recommendation.bid)
                                setTradeEntryPrice(bid)
                                setTradeCurrentPrice(bid)
                              }}
                              style={{
                                padding: '2px 6px',
                                fontSize: '0.68rem',
                                borderRadius: '3px',
                                background: 'rgba(255,255,255,0.08)',
                                color: '#e2e8f0',
                                border: '1px solid rgba(255,255,255,0.15)',
                                cursor: 'pointer'
                              }}
                              title="Set price to current Bid quote"
                            >
                              Bid: ${scalpData.top_recommendation.bid}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="price-inputs-row">
                        <div className="p-input-box">
                          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>You Paid (Broker Fill):</span>
                            <span style={{ color: '#10b981', fontSize: '0.68rem' }}>Limit Fill</span>
                          </label>
                          <div className="input-wrap">
                            <span>$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={tradeEntryPrice}
                              onChange={(e) => setTradeEntryPrice(parseFloat(e.target.value) || 0.15)}
                            />
                          </div>
                          <span className="hint">Total Entry Cost: ${costTotal}</span>
                        </div>

                        <div className="p-input-box">
                          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Live Option Price:</span>
                            <span style={{ color: '#38bdf8', fontSize: '0.68rem' }}>Webull Tick</span>
                          </label>
                          <div className="input-wrap">
                            <span>$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={tradeCurrentPrice}
                              onChange={(e) => setTradeCurrentPrice(parseFloat(e.target.value) || 0.15)}
                            />
                          </div>
                          <span className="hint">Current Value: ${currentTotal}</span>
                        </div>
                      </div>

                      {/* Live Quick Simulation / Tick Stepper Buttons */}
                      <div className="quick-sim-buttons">
                        <span className="sim-label">LIVE TICK CONTROLS:</span>
                        <button onClick={() => setTradeCurrentPrice((prev) => parseFloat(Math.max(0.01, prev - 0.01).toFixed(2)))} className="sim-pill red">-1¢ Tick</button>
                        <button onClick={() => setTradeCurrentPrice((prev) => parseFloat((prev + 0.01).toFixed(2)))} className="sim-pill green">+1¢ Tick</button>
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

                        {/* Interactive Sell / Close Action Bar */}
                        <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button
                            onClick={handleClosePaperPosition}
                            style={{
                              width: '100%',
                              padding: '9px 14px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              background: isTarget2Hit || isTarget1Hit
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : isStopLossHit
                                ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                                : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                              color: '#ffffff',
                              boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Zap size={15} />
                            <span>
                              {isTarget2Hit
                                ? `SELL NOW: LOCK IN +60% RUNNER (+${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)})`
                                : isTarget1Hit
                                ? `SELL 1ST CONTRACT: BANK +25% PROFIT (+${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)})`
                                : isStopLossHit
                                ? `CUT LOSS AT STOP-LOSS (-$${Math.abs(pnlDollars).toFixed(2)})`
                                : `SELL / CLOSE POSITION NOW AT $${tradeCurrentPrice.toFixed(2)} (${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)})`}
                            </span>
                          </button>

                          {positionClosedNotice && (
                            <div style={{
                              padding: '6px 10px',
                              borderRadius: '4px',
                              background: positionClosedNotice.pnlDollar >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              border: `1px solid ${positionClosedNotice.pnlDollar >= 0 ? '#10b981' : '#ef4444'}`,
                              color: positionClosedNotice.pnlDollar >= 0 ? '#10b981' : '#ef4444',
                              fontSize: '0.74rem',
                              textAlign: 'center',
                              fontWeight: 700
                            }}>
                              ✅ Scalp position closed & banked to Paper Portfolio! PnL: {positionClosedNotice.pnlDollar >= 0 ? '+' : ''}${positionClosedNotice.pnlDollar.toFixed(2)} ({positionClosedNotice.pnlPercent >= 0 ? '+' : ''}${positionClosedNotice.pnlPercent.toFixed(1)}%)
                            </div>
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
                            {c.contract_symbol && (
                              <span style={{ fontSize: '0.67rem', color: '#38bdf8', letterSpacing: '0.3px', fontWeight: 600 }}>
                                🛡️ {c.contract_symbol}
                              </span>
                            )}
                          </div>

                          <div className="col-pricing">
                            <span className="cost-val">${parseFloat(c.contract_cost).toFixed(2)}</span>
                            <span className="share-val">(${parseFloat(c.price_per_share).toFixed(2)}/sh)</span>
                            <span className="vol-val">Vol: {c.volume ? c.volume.toLocaleString() : '0'}</span>
                            {c.spread !== undefined && (
                              <span style={{ fontSize: '0.68rem', color: c.spread <= 0.02 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                Spread: ${c.spread.toFixed(2)}
                              </span>
                            )}
                            {c.implied_volatility !== undefined && (
                              <span style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 600 }}>
                                IV: {c.implied_volatility}%
                              </span>
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
                onClick={handleExecutePaperScalp}
              >
                <Zap size={13} />
                <span>Simulate Scalp in Paper Trading (${(parseFloat(scalpData?.top_recommendation?.contract_cost || budget) * contractQty).toFixed(2)})</span>
              </button>

              {paperStats && paperStats.totalClosed > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: paperStats.streakType === 'WIN' ? '#10b981' : paperStats.streakType === 'LOSS' ? '#ef4444' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: paperStats.streakType === 'WIN' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${paperStats.streakType === 'WIN' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    <Flame size={12} />
                    <span>{paperStats.currentStreakBadge}</span>
                  </span>

                  <button
                    onClick={() => exportPortfolioHistoryToCSV(getPortfolio())}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(2, 132, 199, 0.1)',
                      border: '1px solid rgba(2, 132, 199, 0.3)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      color: '#38bdf8',
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Download trade history as a CSV file"
                  >
                    <Download size={11} />
                    <span>CSV Ledger</span>
                  </button>
                </div>
              )}

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
