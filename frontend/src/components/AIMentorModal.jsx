import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  Send,
  ShieldCheck,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Award,
  BookOpen,
  DollarSign,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Play,
  Sliders,
  Calculator,
  Percent
} from 'lucide-react'

// Realistic & High-Alpha Co-Trading Goal Presets
const GOAL_PRESETS = [
  {
    id: 'steady',
    name: 'Steady Compounder',
    badge: '🛡️ Warren Recommended',
    badgeClass: 'safe',
    subtitle: '+15% in 30 Days (1,000 → 1,150)',
    startDefault: 1000,
    targetDefault: 1150,
    daysDefault: 30,
    tradeTargetGain: 2.0, // +2.0% per trade
    tradeStopLoss: 1.0,  // -1.0% stop
    riskLevel: 'LOW',
    feasibilityBadge: '🟢 Low Risk • Highly Sustainable (Warren Approved)',
    description: 'Safe, low-stress compounding without risking your shirt. Ideal for building wealth sustainably.',
    warrenAdvice: '“The snowball effect! Rule #1: Never lose money. Rule #2: Never forget Rule #1. At +15%/month, 1,000 becomes over 5,300 in a year with complete peace of mind.”',
    quantAdvice: '“Clean low-beta compounder. We ride high-conviction ETFs and large-cap moats with 2:1 R/R and zero stress.”'
  },
  {
    id: 'growth',
    name: 'Growth Trader (2x)',
    badge: '📈 Balanced Swing',
    badgeClass: 'balanced',
    subtitle: '2x in 90 Days (1,000 → 2,000)',
    startDefault: 1000,
    targetDefault: 2000,
    daysDefault: 90,
    tradeTargetGain: 3.5, // +3.5% per trade
    tradeStopLoss: 1.5,  // -1.5% stop
    riskLevel: 'MODERATE',
    feasibilityBadge: '🟡 Moderate Risk • Disciplined Swing Growth',
    description: 'Disciplined swing trading on breakout momentum. Double your account in a quarter with controlled risk.',
    warrenAdvice: '“90 days gives compounding room to breathe. Focus on quality businesses with volume catalysts and keep a margin of safety.”',
    quantAdvice: '“Double your bag in 3 months! ~0.77%/day compounding is very achievable with our breakout scanner. Let’s hunt momentum!”'
  },
  {
    id: 'sprint',
    name: 'Alpha Sprint (3x)',
    badge: '⚡ Quant Alpha',
    badgeClass: 'alpha',
    subtitle: '3x in 60 Days (1,000 → 3,000)',
    startDefault: 1000,
    targetDefault: 3000,
    daysDefault: 60,
    tradeTargetGain: 5.5, // +5.5% per trade
    tradeStopLoss: 2.0,  // -2.0% stop
    riskLevel: 'HIGH_ALPHA',
    feasibilityBadge: '🟠 High Alpha • Aggressive Breakouts',
    description: 'High momentum sprint trading. Fast compounding on crypto and tech runners with tight trailing stops.',
    warrenAdvice: '“This is aggressive, son. If you choose this, I insist on strict 2.0% stop-losses so a single drawdown never ruins us.”',
    quantAdvice: '“Now we’re talking! 3x in 60 days is the quant sweet spot! We ride volume spikes on SOL, NVDA, and BTC with 2.75:1 R/R!”'
  },
  {
    id: 'custom',
    name: 'Custom Target',
    badge: '🎯 Custom Blueprint',
    badgeClass: 'custom',
    subtitle: 'Define Your Numbers',
    startDefault: 1000,
    targetDefault: 5000,
    daysDefault: 45,
    tradeTargetGain: 4.5,
    tradeStopLoss: 2.0,
    riskLevel: 'CALCULATED',
    description: 'Enter your custom starting capital, target amount, and timeframe to see the exact required daily rate and feasibility rating.'
  }
]

export default function AIMentorModal({
  isOpen,
  onClose,
  signals = [],
  activeAsset = null,
  onSelectAsset,
  lang = 'en'
}) {
  const [activePersona, setActivePersona] = useState('quant') // 'quant' | 'warren'
  const [activeTab, setActiveTab] = useState('challenge') // 'challenge' | 'pick' | 'chat'
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const chatBottomRef = useRef(null)

  // Currency selection
  const [currency, setCurrency] = useState('THB') // 'THB' | 'USD'
  const currSym = currency === 'THB' ? '฿' : '$'

  // Goal Presets & Custom Engine State
  const [selectedPresetId, setSelectedPresetId] = useState('steady')
  const [customStart, setCustomStart] = useState(1000)
  const [customTarget, setCustomTarget] = useState(2000)
  const [customDays, setCustomDays] = useState(90)

  const activePreset = useMemo(() => {
    return GOAL_PRESETS.find(p => p.id === selectedPresetId) || GOAL_PRESETS[0]
  }, [selectedPresetId])

  const isCustom = selectedPresetId === 'custom'

  const startingCapital = isCustom ? (Math.max(10, Number(customStart) || 1000)) : activePreset.startDefault
  const targetCapital = isCustom ? (Math.max(startingCapital + 10, Number(customTarget) || 2000)) : activePreset.targetDefault
  const totalDays = isCustom ? Math.max(1, Number(customDays) || 30) : activePreset.daysDefault

  // Daily required compounding rate: r = (Target / Start)^(1 / Days) - 1
  const dailyRequiredRatePct = useMemo(() => {
    if (targetCapital <= startingCapital || totalDays <= 0) return 0
    const ratio = targetCapital / startingCapital
    const daily = Math.pow(ratio, 1 / totalDays) - 1
    return parseFloat((daily * 100).toFixed(2))
  }, [startingCapital, targetCapital, totalDays])

  // Feasibility assessment
  const feasibility = useMemo(() => {
    if (dailyRequiredRatePct <= 0.55) {
      return {
        level: 'low',
        label: '🟢 Low Risk • Highly Sustainable (Warren Approved)',
        tip: 'Achievable with index funds, value dividend stocks, and patient compounding.'
      }
    } else if (dailyRequiredRatePct <= 1.25) {
      return {
        level: 'moderate',
        label: '🟡 Moderate Risk • Disciplined Swing Growth',
        tip: 'Achievable with systematic momentum breakouts and strict stop loss execution.'
      }
    } else if (dailyRequiredRatePct <= 2.5) {
      return {
        level: 'high',
        label: '🟠 High Alpha • Aggressive Momentum Required',
        tip: 'Requires volatile assets (Crypto/Tech runners), high win rates, and trailing profit locks.'
      }
    } else {
      return {
        level: 'extreme',
        label: '🔴 Extreme Speculation • High Risk of Wipeout',
        tip: '>2.5%/day compounding requires high leverage or 100% win-rates. One bad trade wipes out the account.'
      }
    }
  }, [dailyRequiredRatePct])

  // Co-Trade Capital tracking
  const [currentCapital, setCurrentCapital] = useState(1000)
  const [currentDay, setCurrentDay] = useState(1)
  const [coPositions, setCoPositions] = useState([])
  const [toastNotice, setToastNotice] = useState(null)

  // Handle Switching Preset
  const handleSelectPreset = (presetId) => {
    setSelectedPresetId(presetId)
    const p = GOAL_PRESETS.find(x => x.id === presetId) || GOAL_PRESETS[0]
    const newStart = presetId === 'custom' ? (Number(customStart) || 1000) : p.startDefault
    setCurrentCapital(newStart)
    setCurrentDay(1)
    setCoPositions([])
    setToastNotice(`🎯 Switched Goal to "${p.name}"! War Chest set to ${currSym}${newStart.toLocaleString()}`)
    setTimeout(() => setToastNotice(null), 3500)
  }

  // Active target & stop loss for co-trades based on preset or custom daily rate
  const tradeTargetGain = useMemo(() => {
    if (isCustom) {
      return Math.max(1.5, Math.min(10.0, parseFloat((dailyRequiredRatePct * 1.5).toFixed(1))))
    }
    return activePreset.tradeTargetGain
  }, [isCustom, dailyRequiredRatePct, activePreset])

  const tradeStopLoss = useMemo(() => {
    if (isCustom) {
      return Math.min(2.5, Math.max(1.0, parseFloat((tradeTargetGain * 0.45).toFixed(1))))
    }
    return activePreset.tradeStopLoss
  }, [isCustom, tradeTargetGain, activePreset])

  // Derive Live Real-Time Recommendations for Warren vs Quant Bro
  const mentorInsights = useMemo(() => {
    if (!signals || signals.length === 0) {
      return {
        warren: null,
        quant: null
      }
    }

    // --- WARREN BUFFETT'S VALUE & MOAT FILTER ---
    const warrenCandidates = signals.filter(s => {
      const sym = (s.symbol || '').toUpperCase()
      const type = (s.asset_type || '').toLowerCase()
      return ['SPY', 'VOO', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'GLD', 'GOLD', 'BRK.B', 'JNJ'].includes(sym) ||
             type.includes('index') || type.includes('commodity') || type.includes('equity')
    })
    const warrenPool = warrenCandidates.length > 0 ? warrenCandidates : signals
    const sortedWarren = [...warrenPool].sort((a, b) => {
      const rsiA = parseFloat(a.radar?.rsi) || 50
      const rsiB = parseFloat(b.radar?.rsi) || 50
      return rsiA - rsiB
    })
    const warrenPickAsset = sortedWarren[0] || signals[0]
    const warrenPrice = warrenPickAsset.current_price !== undefined
      ? parseFloat(warrenPickAsset.current_price)
      : parseFloat(warrenPickAsset.close_price || 100)
    const warrenStop = parseFloat((warrenPrice * (1 - tradeStopLoss / 100)).toFixed(2))
    const warrenTarget = parseFloat((warrenPrice * (1 + tradeTargetGain / 100)).toFixed(2))
    const warrenRsi = parseFloat(warrenPickAsset.radar?.rsi) || 48.5

    // --- QUANT BRO'S MOMENTUM & ALPHA FILTER ---
    const sortedQuant = [...signals].sort((a, b) => {
      const volA = parseFloat(a.radar?.vol_spike_ratio) || 1.0
      const volB = parseFloat(b.radar?.vol_spike_ratio) || 1.0
      const diffA = (parseFloat(a.macd) || 0) - (parseFloat(a.macd_signal) || 0)
      const diffB = (parseFloat(b.macd) || 0) - (parseFloat(b.macd_signal) || 0)
      return (volB * 2 + diffB) - (volA * 2 + diffA)
    })
    const quantPickAsset = sortedQuant[0] || signals[0]
    const quantPrice = quantPickAsset.current_price !== undefined
      ? parseFloat(quantPickAsset.current_price)
      : parseFloat(quantPickAsset.close_price || 100)
    const quantStop = parseFloat((quantPrice * (1 - tradeStopLoss / 100)).toFixed(2))
    const quantDailySprintTarget = parseFloat((quantPrice * (1 + tradeTargetGain / 100)).toFixed(2))
    const quantVolRatio = parseFloat(quantPickAsset.radar?.vol_spike_ratio) || 1.8

    return {
      warren: {
        asset: warrenPickAsset,
        price: warrenPrice,
        stopLoss: warrenStop,
        target: warrenTarget,
        rsi: warrenRsi,
        reasoning: `"${warrenPickAsset.symbol} is trading near $${warrenPrice.toFixed(2)} with an RSI of ${warrenRsi.toFixed(1)}. While impatient speculators gamble, this business possesses durable economic moat characteristics. We are targeting ${currSym}${targetCapital.toLocaleString()} together. Rule #1 stays: NEVER LOSE MONEY. We cap our downside at $${warrenStop.toFixed(2)}."`,
        goldenRule: "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1.",
        setupName: "Margin of Safety Compounder Setup"
      },
      quant: {
        asset: quantPickAsset,
        price: quantPrice,
        stopLoss: quantStop,
        target1: quantDailySprintTarget,
        volRatio: quantVolRatio,
        reasoning: `"Yo bro! We're chasing our target of ${currSym}${targetCapital.toLocaleString()}! That means we need +${dailyRequiredRatePct}% daily compounding. Look at ${quantPickAsset.symbol} right now at $${quantPrice.toFixed(2)}: ${quantVolRatio.toFixed(1)}x volume surge with an expanding MACD delta. We risk $${(quantPrice - quantStop).toFixed(2)} to make $${(quantDailySprintTarget - quantPrice).toFixed(2)}. Let's execute Day ${currentDay}!"`,
        goldenRule: "Respect the stop loss, trade the trend, and compound daily milestones!",
        setupName: "High-Alpha Momentum Breakout"
      }
    }
  }, [signals, currentDay, tradeTargetGain, tradeStopLoss, startingCapital, targetCapital, totalDays, dailyRequiredRatePct, currSym])

  // Initialize welcome message per persona and selected goal
  useEffect(() => {
    if (!isOpen) return

    if (activePersona === 'warren') {
      setMessages([
        {
          id: 'welcome-warren',
          sender: 'mentor',
          persona: 'warren',
          text: `Welcome, my friend. We are co-investing toward ${currSym}${targetCapital.toLocaleString()} in ${totalDays} days. Rule #1 is: Never lose money. We'll pick high-conviction asymmetric setups and protect our principal with strict stops.`
        }
      ])
    } else {
      setMessages([
        {
          id: 'welcome-quant',
          sender: 'mentor',
          persona: 'quant',
          text: `Yo bro! Let's get this bag together! Starting at ${currSym}${startingCapital.toLocaleString()} targeting ${currSym}${targetCapital.toLocaleString()} in ${totalDays} days. That's a +${dailyRequiredRatePct}% daily compounded pace. Let's co-execute Day ${currentDay}!`
        }
      ])
    }
  }, [isOpen, activePersona, selectedPresetId, startingCapital, targetCapital, totalDays, dailyRequiredRatePct, currSym])

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Execute Co-Trade with Mentor
  const handleExecuteCoTrade = (asset, entryPrice, stopLoss, targetPrice) => {
    const positionSize = Math.max(50, Math.round(currentCapital * 0.20)) // 20% max position size
    const shares = (positionSize / entryPrice).toFixed(4)
    const newPos = {
      id: Date.now().toString(),
      symbol: asset.symbol,
      entryPrice,
      stopLoss,
      targetPrice,
      positionSize,
      shares,
      persona: activePersona,
      day: currentDay,
      targetGainPct: tradeTargetGain,
      stopLossPct: tradeStopLoss,
      status: 'OPEN',
      entryDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setCoPositions(prev => [newPos, ...prev])
    setToastNotice(`🚀 Co-Trade Placed: ${currSym}${positionSize.toLocaleString()} in ${asset.symbol} with ${activePersona === 'warren' ? 'Uncle Warren' : 'The Quant Bro'}!`)
    setTimeout(() => setToastNotice(null), 4000)
  }

  // Close Co-Trade and Realize Profit
  const handleCloseCoTrade = (posId, isWin = true) => {
    const pos = coPositions.find(p => p.id === posId)
    if (!pos) return

    const gainPct = pos.targetGainPct || tradeTargetGain
    const lossPct = pos.stopLossPct || tradeStopLoss
    const pnl = isWin ? pos.positionSize * (gainPct / 100) : -(pos.positionSize * (lossPct / 100))
    setCurrentCapital(prev => Math.max(50, Math.round(prev + pnl)))
    setCoPositions(prev => prev.map(p => p.id === posId ? { ...p, status: isWin ? `WON (+${gainPct}%)` : `STOPPED (-${lossPct}%)` } : p))
    if (isWin) {
      setCurrentDay(prev => Math.min(totalDays, prev + 1))
      setToastNotice(`🎉 Day ${pos.day} Milestone Hit! +${currSym}${pnl.toFixed(2)} banked into Co-War Chest!`)
    } else {
      setToastNotice(`🛡️ Stop-loss respected. Loss strictly capped at -${currSym}${Math.abs(pnl).toFixed(2)}. Capital preserved!`)
    }
    setTimeout(() => setToastNotice(null), 4000)
  }

  // Handle Chat Queries
  const handleSendMessage = (textQuery) => {
    const query = textQuery || chatInput.trim()
    if (!query || isThinking) return

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: query
    }
    setMessages(prev => [...prev, userMsg])
    setChatInput('')
    setIsThinking(true)

    setTimeout(() => {
      let reply = ''
      const q = query.toUpperCase()
      const matchedSignal = signals.find(s => q.includes(s.symbol))

      if (activePersona === 'warren') {
        if (q.includes('GOAL') || q.includes('10X') || q.includes('STRATEGY') || q.includes('SAFE')) {
          if (dailyRequiredRatePct > 2.0) {
            reply = `Reaching ${currSym}${targetCapital.toLocaleString()} in ${totalDays} days requires +${dailyRequiredRatePct}% compounded daily. In all my years in Omaha, I have seen that chasing such furious paces forces investors to take lethal leverage. Rule #1 is Never Lose Money. Give your capital more time, and compounding will make you rich slowly.`
          } else {
            reply = `Our target of ${currSym}${targetCapital.toLocaleString()} over ${totalDays} days requires +${dailyRequiredRatePct}% daily compounding. This is achievable if we never risk more than 1.5% per trade. When Mr. Market offers a bargain, we step up; otherwise, we wait patiently.`
          }
        } else if (matchedSignal) {
          const p = matchedSignal.current_price || matchedSignal.close_price || 100
          const rsi = parseFloat(matchedSignal.radar?.rsi) || 50
          reply = `${matchedSignal.symbol} is trading at $${parseFloat(p).toFixed(2)} with an RSI of ${rsi.toFixed(1)}. Price is what you pay; value is what you get. If we co-invest in this, we set our stop-loss at $${(p * (1 - tradeStopLoss / 100)).toFixed(2)}.`
        } else {
          reply = `In investing, patience and discipline trump IQ every single day. Stick to our co-investing plan, protect your principal, and let compounding work for us.`
        }
      } else {
        // QUANT BRO PERSONA
        if (q.includes('GOAL') || q.includes('10X') || q.includes('STRATEGY') || q.includes('SAFE')) {
          if (dailyRequiredRatePct > 2.5) {
            reply = `Bro! +${dailyRequiredRatePct}% daily is legendary sprint territory! To pull this off without wiping out, our risk management has to be surgical. No holding overnight baggers, strict 2.5% stops, and trailing profits on volume surges!`
          } else {
            reply = `Love our target of ${currSym}${targetCapital.toLocaleString()} in ${totalDays} days! ~${dailyRequiredRatePct}% daily required is totally in the strike zone of our algorithmic scanner. We hunt 2.5:1 R/R setups with volume catalysts!`
          }
        } else if (matchedSignal) {
          const p = matchedSignal.current_price || matchedSignal.close_price || 100
          const vol = parseFloat(matchedSignal.radar?.vol_spike_ratio) || 1.0
          reply = `Checking tape on ${matchedSignal.symbol}: Spot $${parseFloat(p).toFixed(2)} with ${vol.toFixed(1)}x volume. If we take this co-trade, we risk ${tradeStopLoss}% to target +${tradeTargetGain}% for our daily milestone!`
        } else {
          reply = `Let's lock in! Consistency and cutting losses fast is what makes traders wealthy. Let's hunt today's high-alpha setup!`
        }
      }

      const mentorReply = {
        id: (Date.now() + 1).toString(),
        sender: 'mentor',
        persona: activePersona,
        text: reply
      }
      setMessages(prev => [...prev, mentorReply])
      setIsThinking(false)
    }, 500)
  }

  if (!isOpen) return null

  const isWarren = activePersona === 'warren'
  const activeInsight = isWarren ? mentorInsights.warren : mentorInsights.quant
  const progressPct = targetCapital <= startingCapital ? 0 : Math.min(100, Math.max(0, ((currentCapital - startingCapital) / (targetCapital - startingCapital)) * 100))

  return (
    <AnimatePresence>
      <div className="sheet-root-container">
        {/* Transparent Non-Blurring Click-Outside Backdrop */}
        <div
          className="sheet-backdrop"
          style={{ background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
          onClick={onClose}
        />

        {/* Slide-over Panel (High Z-Index, Crisp 100% Sharp) */}
        <motion.aside
          className={`mentor-modal-panel ${isWarren ? 'warren-theme' : 'quant-theme'}`}
          style={{ zIndex: 2050 }}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mentor-header">
            <div className="mentor-profile-group">
              <div className="mentor-avatar-badge">
                <span className="mentor-avatar-icon">{isWarren ? '🎩' : '⚡'}</span>
              </div>
              <div className="mentor-meta-titles">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h2 className="mentor-name-title">
                    {isWarren ? 'Uncle Warren' : 'The Quant Bro'}
                  </h2>
                  <span className="mentor-role-tag">
                    {isWarren ? 'Value & Moat Co-Pilot' : 'Alpha Momentum Partner'}
                  </span>
                </div>
                <span className="mentor-subtitle-status">
                  <span className="mentor-live-dot" /> Co-Investing With You • Real-Time Guided Trading
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Persona Switcher */}
              <div className="persona-switcher-pill">
                <button
                  type="button"
                  className={`persona-tab-btn ${isWarren ? 'active' : ''}`}
                  onClick={() => setActivePersona('warren')}
                  title="Switch to Warren Buffett (Value, Moat, Capital Protection)"
                >
                  <span>🎩 Warren</span>
                </button>
                <button
                  type="button"
                  className={`persona-tab-btn ${!isWarren ? 'active' : ''}`}
                  onClick={() => setActivePersona('quant')}
                  title="Switch to The Quant Bro (Momentum, Breakouts, High Alpha)"
                >
                  <span>⚡ Quant Bro</span>
                </button>
              </div>

              <button className="sheet-close-btn" onClick={onClose} title="Close Mentor Desk">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Sub-Tabs: Target Challenge vs Alpha Pick vs Chat */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0.4rem 1.35rem', gap: '0.5rem' }}>
            <button
              className={`filter-pill ${activeTab === 'challenge' ? 'active' : ''}`}
              onClick={() => setActiveTab('challenge')}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}
            >
              🚀 Target Challenge
            </button>
            <button
              className={`filter-pill ${activeTab === 'pick' ? 'active' : ''}`}
              onClick={() => setActiveTab('pick')}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}
            >
              🎯 Daily Alpha Pick
            </button>
            <button
              className={`filter-pill ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}
            >
              💬 Ask {isWarren ? 'Warren' : 'Bro'}
            </button>
          </div>

          {/* Toast Notification for Co-Trade Actions */}
          {toastNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: '#0f172a', color: '#38bdf8', padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center', borderBottom: '1px solid #0284c7' }}
            >
              {toastNotice}
            </motion.div>
          )}

          {/* Body Content */}
          <div className="mentor-body-scroll">

            {/* TAB 1: CO-INVESTING GOAL ENGINE & CHALLENGE */}
            {activeTab === 'challenge' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* 1. GOAL PRESET SELECTOR & CURRENCY */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Target size={14} color="#0284c7" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                        SELECT CO-INVESTING GOAL
                      </span>
                    </div>

                    {/* Currency Toggle */}
                    <div className="currency-toggle-pill">
                      <button
                        type="button"
                        className={`currency-btn ${currency === 'THB' ? 'active' : ''}`}
                        onClick={() => setCurrency('THB')}
                        title="Thai Baht (฿)"
                      >
                        ฿ THB
                      </button>
                      <button
                        type="button"
                        className={`currency-btn ${currency === 'USD' ? 'active' : ''}`}
                        onClick={() => setCurrency('USD')}
                        title="US Dollar ($)"
                      >
                        $ USD
                      </button>
                    </div>
                  </div>

                  {/* 4 Preset Option Cards */}
                  <div className="goal-presets-grid">
                    {GOAL_PRESETS.map((p) => {
                      const isSelected = selectedPresetId === p.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`goal-preset-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelectPreset(p.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span className={`preset-badge-tag ${p.badgeClass}`}>
                              {p.badge}
                            </span>
                            {isSelected && <CheckCircle2 size={13} color="#0284c7" />}
                          </div>
                          <span className="preset-title">{p.name}</span>
                          <span className="preset-sub">{p.subtitle}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom Inputs Panel (Rendered only when Custom Preset is active) */}
                  {isCustom && (
                    <div className="custom-goal-panel">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <Sliders size={13} color="#0284c7" />
                        <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#1e293b' }}>
                          Custom Blueprint Parameters
                        </span>
                      </div>
                      
                      <div className="custom-inputs-row">
                        <div className="custom-field-group">
                          <label className="custom-field-label">START ({currSym})</label>
                          <input
                            type="number"
                            className="custom-field-input"
                            value={customStart}
                            min={10}
                            step={100}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setCustomStart(val)
                              setCurrentCapital(val)
                            }}
                          />
                        </div>

                        <div className="custom-field-group">
                          <label className="custom-field-label">TARGET ({currSym})</label>
                          <input
                            type="number"
                            className="custom-field-input"
                            value={customTarget}
                            min={customStart + 10}
                            step={100}
                            onChange={(e) => setCustomTarget(Number(e.target.value))}
                          />
                        </div>

                        <div className="custom-field-group">
                          <label className="custom-field-label">DAYS</label>
                          <input
                            type="number"
                            className="custom-field-input"
                            value={customDays}
                            min={1}
                            max={365}
                            step={5}
                            onChange={(e) => setCustomDays(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* Feasibility Alert */}
                      <div className={`feasibility-banner ${feasibility.level}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <AlertTriangle size={13} />
                          <span>{feasibility.label}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                          +{dailyRequiredRatePct}%/day
                        </span>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>
                        {feasibility.tip}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. CHALLENGE WAR CHEST DASHBOARD CARD */}
                <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', borderRadius: '14px', padding: '1.25rem', border: '1px solid #334155', boxShadow: '0 8px 25px rgba(15, 23, 42, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.5px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                      🔥 {activePreset.name.toUpperCase()} CHALLENGE
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>
                      DAY {currentDay} OF {totalDays}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>CO-TRADING WAR CHEST</span>
                      <span style={{ fontSize: '1.65rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                        {currSym}{currentCapital.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>TARGET ({(targetCapital / startingCapital).toFixed(1)}x)</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                        {currSym}{targetCapital.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div style={{ width: `${Math.max(4, progressPct)}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #10b981)', transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                    <span>Start: {currSym}{startingCapital.toLocaleString()}</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>Daily Needed: +{dailyRequiredRatePct}%/day</span>
                    <span>Target: {currSym}{targetCapital.toLocaleString()}</span>
                  </div>
                </div>

                {/* 3. MENTOR'S PERSONA STRATEGY & REALITY CHECK */}
                <div className="recom-why-box" style={{ background: '#ffffff', border: isWarren ? '1px solid #fde68a' : '1px solid #bae6fd' }}>
                  <div className="why-box-title" style={{ color: isWarren ? '#b45309' : '#0369a1' }}>
                    <Sparkles size={14} />
                    <span>{isWarren ? `Uncle Warren's Strategy for ${activePreset.name}:` : `Quant Bro's Playbook for ${activePreset.name}:`}</span>
                  </div>
                  <p className="why-box-text" style={{ fontSize: '0.775rem', color: '#334155', fontStyle: 'normal' }}>
                    {isWarren
                      ? (isCustom
                          ? (dailyRequiredRatePct > 2.0
                              ? `“Son, targeting ${currSym}${targetCapital.toLocaleString()} in ${totalDays} days requires +${dailyRequiredRatePct}% daily. This pace forces excessive leverage and puts all your hard-earned capital in mortal danger. Give yourself 90 to 180 days to let the snowball of compounding work safely.”`
                              : `“This is an intelligent, realistic blueprint. Reaching ${currSym}${targetCapital.toLocaleString()} in ${totalDays} days requires +${dailyRequiredRatePct}% daily compounding. We protect our capital with 1.5% stops and wait for great businesses at fair prices.”`)
                          : activePreset.warrenAdvice)
                      : (isCustom
                          ? (dailyRequiredRatePct > 2.5
                              ? `“Bro, +${dailyRequiredRatePct}%/day is god-tier alpha sprint mode! If you want to run this, you can't hesitate on stop-losses for even 1 second. Or extend your timeline so we can swing with higher win-rates and zero stress!”`
                              : `“Clean custom setup! +${dailyRequiredRatePct}% daily is perfectly inside our momentum scanner's sweet spot. We'll ride volume breakouts with 2.5:1 reward-to-risk!”`)
                          : activePreset.quantAdvice)}
                  </p>
                </div>

                {/* 4. TODAY'S RECOMMENDED CO-TRADE */}
                {activeInsight && (
                  <div className="mentor-recom-card" style={{ border: '2px solid #0284c7' }}>
                    <div className="recom-header-row">
                      <span className="recom-badge font-mono" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                        ⚡ DAY {currentDay} CO-TRADE PICK
                      </span>
                      <span className="recom-strategy-tag font-mono">
                        Target: +{tradeTargetGain}% Milestone
                      </span>
                    </div>

                    <div className="recom-asset-row">
                      <div>
                        <span className="recom-symbol">{activeInsight.asset?.symbol}</span>
                        <span className="recom-asset-type">{activeInsight.asset?.asset_type}</span>
                      </div>
                      <div className="recom-price-stack">
                        <span className="recom-price font-mono">${activeInsight.price.toFixed(2)}</span>
                        <span className="recom-live-label font-mono">Live Entry Spot</span>
                      </div>
                    </div>

                    {/* Action Plan Grid */}
                    <div className="mentor-action-plan-grid font-mono">
                      <div className="plan-cell entry">
                        <span className="plan-label">POSITION SIZE</span>
                        <span className="plan-val">{currSym}{Math.max(50, Math.round(currentCapital * 0.20)).toLocaleString()}</span>
                        <span className="plan-sub">20% War Chest</span>
                      </div>

                      <div className="plan-cell stop-loss">
                        <span className="plan-label">STOP LOSS (-{tradeStopLoss}%)</span>
                        <span className="plan-val text-red">${activeInsight.stopLoss.toFixed(2)}</span>
                        <span className="plan-sub">Max Risk: {currSym}{(Math.max(50, Math.round(currentCapital * 0.20)) * (tradeStopLoss / 100)).toFixed(1)}</span>
                      </div>

                      <div className="plan-cell target">
                        <span className="plan-label">MILESTONE (+{tradeTargetGain}%)</span>
                        <span className="plan-val text-green">${(activeInsight.price * (1 + tradeTargetGain / 100)).toFixed(2)}</span>
                        <span className="plan-sub">+{currSym}{(Math.max(50, Math.round(currentCapital * 0.20)) * (tradeTargetGain / 100)).toFixed(1)} Gain</span>
                      </div>
                    </div>

                    <button
                      className="recom-inspect-btn font-mono"
                      onClick={() => handleExecuteCoTrade(activeInsight.asset, activeInsight.price, activeInsight.stopLoss, activeInsight.price * (1 + tradeTargetGain / 100))}
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', marginTop: '0.5rem', padding: '0.75rem' }}
                    >
                      <Play size={14} fill="#ffffff" />
                      <span>EXECUTE CO-TRADE WITH MENTOR ({currSym}{Math.max(50, Math.round(currentCapital * 0.20)).toLocaleString()} Position)</span>
                    </button>
                  </div>
                )}

                {/* 5. ACTIVE CO-POSITIONS LEDGER */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                      📋 ACTIVE CO-TRADE LEDGER ({coPositions.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => { setCurrentCapital(startingCapital); setCurrentDay(1); setCoPositions([]); }}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <RotateCcw size={11} /> Reset {activePreset.name} Challenge
                    </button>
                  </div>

                  {coPositions.length === 0 ? (
                    <p style={{ fontSize: '0.725rem', color: '#94a3b8', textAlign: 'center', margin: '0.5rem 0' }}>
                      No co-trades open yet. Click "EXECUTE CO-TRADE WITH MENTOR" above to launch Day {currentDay}!
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {coPositions.map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.65rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a', fontFamily: 'var(--font-mono)' }}>{p.symbol}</span>
                            <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '0.4rem' }}>Day {p.day} • {currSym}{p.positionSize}</span>
                          </div>
                          {p.status === 'OPEN' ? (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                className="filter-pill active"
                                onClick={() => handleCloseCoTrade(p.id, true)}
                                style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: '#10b981' }}
                                title={`Target Reached: Bank +${p.targetGainPct || tradeTargetGain}% Profit!`}
                              >
                                Target Hit (+{p.targetGainPct || tradeTargetGain}%)
                              </button>
                              <button
                                className="filter-pill"
                                onClick={() => handleCloseCoTrade(p.id, false)}
                                style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', color: '#ef4444', borderColor: '#fca5a5' }}
                                title={`Stop Loss Hit: Cap loss at -${p.stopLossPct || tradeStopLoss}%`}
                              >
                                Stop Out (-{p.stopLossPct || tradeStopLoss}%)
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: p.status.includes('WON') ? '#059669' : '#dc2626' }}>
                              {p.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: DAILY ALPHA PICK (Where & Why) */}
            {activeTab === 'pick' && activeInsight && (
              <div className="mentor-recom-card">
                <div className="recom-header-row">
                  <span className="recom-badge font-mono">
                    {isWarren ? '🛡️ #1 VALUE PICK TODAY' : '⚡ #1 MOMENTUM BREAKOUT TODAY'}
                  </span>
                  <span className="recom-strategy-tag font-mono">
                    {activeInsight.setupName}
                  </span>
                </div>

                <div className="recom-asset-row">
                  <div className="recom-asset-info">
                    <span className="recom-symbol">{activeInsight.asset?.symbol}</span>
                    <span className="recom-asset-type">{activeInsight.asset?.asset_type || 'US Equity'}</span>
                  </div>
                  <div className="recom-price-stack">
                    <span className="recom-price font-mono">${activeInsight.price.toFixed(2)}</span>
                    <span className="recom-live-label font-mono">Real-Time Quote</span>
                  </div>
                </div>

                {/* Plain English Why */}
                <div className="recom-why-box">
                  <div className="why-box-title">
                    <Sparkles size={13} style={{ color: isWarren ? '#f59e0b' : '#06b6d4' }} />
                    <span>{isWarren ? "Why Uncle Warren Recommends This:" : "Quant Bro's Technical Catalyst:"}</span>
                  </div>
                  <p className="why-box-text">
                    {activeInsight.reasoning}
                  </p>
                </div>

                {/* Action Plan */}
                <div className="mentor-action-plan-grid font-mono">
                  <div className="plan-cell entry">
                    <span className="plan-label">1. ENTRY ZONE</span>
                    <span className="plan-val">${activeInsight.price.toFixed(2)}</span>
                    <span className="plan-sub">Spot Market</span>
                  </div>

                  <div className="plan-cell stop-loss">
                    <span className="plan-label">2. STOP LOSS (RISK LIMIT)</span>
                    <span className="plan-val text-red">${activeInsight.stopLoss.toFixed(2)}</span>
                    <span className="plan-sub">Strict Safety Net</span>
                  </div>

                  <div className="plan-cell target">
                    <span className="plan-label">3. PROFIT TARGET</span>
                    <span className="plan-val text-green">
                      ${isWarren ? activeInsight.target.toFixed(2) : activeInsight.target1.toFixed(2)}
                    </span>
                    <span className="plan-sub">{isWarren ? '15% Compounding' : '2.5:1 R/R'}</span>
                  </div>
                </div>

                {/* Golden Rule */}
                <div className="mentor-golden-rule">
                  <Award size={14} className="rule-icon" />
                  <span className="rule-text"><strong>Mentor's Golden Rule:</strong> {activeInsight.goldenRule}</span>
                </div>

                <button
                  className="recom-inspect-btn font-mono"
                  onClick={() => {
                    onSelectAsset?.(activeInsight.asset?.symbol)
                    onClose()
                  }}
                >
                  <span>INSPECT {activeInsight.asset?.symbol} ON LIVE CHARTS</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}

            {/* TAB 3: CHAT DIALOGUE */}
            {activeTab === 'chat' && (
              <div className="mentor-chat-section">
                <div className="chat-section-header">
                  <BookOpen size={14} />
                  <span>Ask {isWarren ? 'Uncle Warren' : 'The Quant Bro'} Anything</span>
                </div>

                {/* Quick Query Chips */}
                <div className="quick-chips-row">
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => handleSendMessage(`How do we reach ${currSym}${targetCapital.toLocaleString()} in ${totalDays} days safely?`)}
                  >
                    🚀 Goal Strategy?
                  </button>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => handleSendMessage("What is your #1 stock pick today and why?")}
                  >
                    🎯 #1 Pick Today?
                  </button>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => handleSendMessage("How do I set stop loss for maximum profit?")}
                  >
                    🛡️ Risk Rules
                  </button>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => handleSendMessage(`Analyze ${activeAsset?.symbol || 'SPY'} for me`)}
                  >
                    🔍 Analyze {activeAsset?.symbol || 'SPY'}
                  </button>
                </div>

                {/* Message Feed */}
                <div className="mentor-messages-scroll">
                  {messages.map((m) => {
                    const isMentor = m.sender === 'mentor'
                    return (
                      <div
                        key={m.id}
                        className={`mentor-msg-row ${isMentor ? 'mentor-msg' : 'user-msg'}`}
                      >
                        {isMentor && (
                          <div className="msg-avatar-icon">
                            {m.persona === 'warren' ? '🎩' : '⚡'}
                          </div>
                        )}
                        <div className={`msg-bubble ${isMentor ? (m.persona === 'warren' ? 'warren-bubble' : 'quant-bubble') : 'user-bubble'}`}>
                          {isMentor && (
                            <span className="msg-sender-name">
                              {m.persona === 'warren' ? 'Uncle Warren' : 'The Quant Bro'}
                            </span>
                          )}
                          <p className="msg-text">{m.text}</p>
                        </div>
                      </div>
                    )
                  })}

                  {isThinking && (
                    <div className="mentor-msg-row mentor-msg">
                      <div className="msg-avatar-icon">{isWarren ? '🎩' : '⚡'}</div>
                      <div className="msg-bubble mentor-bubble thinking-bubble">
                        <span>{isWarren ? 'Uncle Warren is reflecting on the fundamentals...' : 'Quant Bro is calculating real-time order flow...'}</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Form */}
                <form
                  className="mentor-input-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                >
                  <input
                    type="text"
                    className="mentor-chat-input"
                    placeholder={`Ask ${isWarren ? 'Uncle Warren' : 'The Quant Bro'} anything...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="mentor-send-btn"
                    disabled={!chatInput.trim() || isThinking}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}

          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}
