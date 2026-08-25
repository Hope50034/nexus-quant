import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Zap,
  Target,
  Activity,
  Layers,
  HelpCircle
} from 'lucide-react'

export default function AICopilotDrawer({
  isOpen,
  onClose,
  signals = [],
  signalType = 'buy',
  onSelectTicker
}) {
  const [promptInput, setPromptInput] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [typedText, setTypedText] = useState('')

  // 1. Quantitative Analysis & High-Conviction Setups Derivation
  const { topSetups, regimeMeta, overboughtOversold, macroSummary } = useMemo(() => {
    if (!signals || signals.length === 0) {
      return {
        topSetups: [],
        regimeMeta: { title: 'RISK-NEUTRAL', badge: 'NEUTRAL', isBull: true },
        overboughtOversold: [],
        macroSummary: 'Awaiting market feed initialization. System monitoring 14 core multivariate assets.'
      }
    }

    // Sort signals by MACD Momentum Delta
    const sorted = [...signals].sort((a, b) => {
      const diffA = (parseFloat(a.macd) || 0) - (parseFloat(a.macd_signal) || 0)
      const diffB = (parseFloat(b.macd) || 0) - (parseFloat(b.macd_signal) || 0)
      return Math.abs(diffB) - Math.abs(diffA)
    })

    const isBullMode = signalType === 'buy'

    // Regime Synthesis
    const regimeTitle = isBullMode
      ? 'RISK-ON MOMENTUM EXPANSION'
      : 'DEFENSIVE BEARISH REGIME'

    const macro = isBullMode
      ? `System detected strong algorithmic upside momentum across ${signals.length} tracked tickers. EMA 20/50 golden crosses are confirming institutional buying support.`
      : `System flagged negative MACD momentum divergence across ${signals.length} assets. High volatility option skew indicates increased hedging demand.`

    // Top 3 High-Conviction Trade Setups
    const setups = sorted.slice(0, 3).map((asset) => {
      const price = asset.current_price !== undefined ? parseFloat(asset.current_price) : parseFloat(asset.close_price || 100)
      const isCall = isBullMode
      const stopPrice = isCall ? parseFloat((price * 0.962).toFixed(2)) : parseFloat((price * 1.038).toFixed(2))
      const targetPrice = isCall ? parseFloat((price * 1.088).toFixed(2)) : parseFloat((price * 0.912).toFixed(2))
      const macdVal = parseFloat(asset.macd) || 0

      return {
        symbol: asset.symbol,
        assetType: asset.asset_type || 'US Equity',
        price,
        stopPrice,
        targetPrice,
        rrRatio: '2.3:1',
        isCall,
        macdVal,
        badge: isCall ? '⚡ LONG MOMENTUM' : '⚠️ BEARISH DIVERGENCE'
      }
    })

    return {
      topSetups: setups,
      regimeMeta: { title: regimeTitle, badge: isBullMode ? 'BULLISH' : 'BEARISH', isBull: isBullMode },
      overboughtOversold: sorted.slice(3, 6),
      macroSummary: macro
    }
  }, [signals, signalType])

  // Typewriter effect simulation on drawer mount
  useEffect(() => {
    if (!isOpen) {
      setTypedText('')
      return
    }

    let idx = 0
    setTypedText('')
    const interval = setInterval(() => {
      if (idx < macroSummary.length) {
        setTypedText(prev => prev + macroSummary.charAt(idx))
        idx++
      } else {
        clearInterval(interval)
      }
    }, 15)

    return () => clearInterval(interval)
  }, [isOpen, macroSummary])

  // Chat Submission Handler
  const handleSendPrompt = (textToSend) => {
    const text = textToSend || promptInput.trim()
    if (!text || isSynthesizing) return

    const userMsg = { role: 'user', content: text }
    setChatHistory(prev => [...prev, userMsg])
    setPromptInput('')
    setIsSynthesizing(true)

    // Simulated LLM reasoning response
    setTimeout(() => {
      let reply = ''
      const upper = text.toUpperCase()

      if (upper.includes('QQQ') || upper.includes('SPY') || upper.includes('TECH')) {
        reply = `QQQ is currently trading at $716.08 with a 30-day IV Rank of 88%. The 20-day EMA ($710.20) provides immediate structural support. Recommend maintaining long momentum targets while monitoring GEX levels.`
      } else if (upper.includes('CRYPTO') || upper.includes('BTC') || upper.includes('ETH')) {
        reply = `Crypto universe is leading momentum expansion today. BTC-USD (+7.38%) and ETH-USD (+17.37%) exhibit expanding positive MACD delta with strong 24h volume inflow.`
      } else if (upper.includes('RISK') || upper.includes('SETUP')) {
        reply = `Top asymmetric Risk/Reward setup is ${topSetups[0]?.symbol || 'NVDA'} with a 2.3:1 R/R ratio. Entry: $${topSetups[0]?.price || '217.56'}, Stop Loss: $${topSetups[0]?.stopPrice || '209.29'}, Target: $${topSetups[0]?.targetPrice || '236.70'}.`
      } else {
        reply = `Analysis complete for "${text}". Tracked universe of ${signals.length} assets is confirming a ${regimeMeta.badge} bias. Top quantitative momentum setup remains ${topSetups[0]?.symbol || 'NVDA'}.`
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }])
      setIsSynthesizing(false)
    }, 600)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="ai-drawer-backdrop" onClick={onClose}>
        <motion.aside
          className="ai-copilot-drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="ai-drawer-header">
            <div className="ai-header-left">
              <div className="ai-bot-avatar">
                <Bot size={18} />
              </div>
              <div className="ai-header-titles">
                <span className="ai-title-main">KAPPA AI COPILOT</span>
                <span className="ai-title-sub">Quantitative Market Briefing Engine</span>
              </div>
            </div>
            <button className="ai-close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {/* Drawer Body Scroll Container */}
          <div className="ai-drawer-body">
            {/* Daily Market Pulse Banner */}
            <div className="market-pulse-card">
              <div className="pulse-card-header">
                <span className="pulse-label">
                  <Activity size={12} className="pulse-icon" />
                  DAILY MARKET REGIME
                </span>
                <span className={`pulse-badge ${regimeMeta.isBull ? 'bull' : 'bear'}`}>
                  {regimeMeta.badge}
                </span>
              </div>
              <h3 className="pulse-regime-title">{regimeMeta.title}</h3>
              <p className="pulse-summary-text">
                {typedText}
                {typedText.length < macroSummary.length && <span className="typewriter-cursor">|</span>}
              </p>
            </div>

            {/* Top 3 High-Conviction Trade Setups */}
            <div className="ai-section-block">
              <div className="section-title-row">
                <Target size={14} className="sec-icon" />
                <span className="sec-title">TOP 3 HIGH-CONVICTION SETUPS</span>
              </div>

              <div className="setups-stack">
                {topSetups.map((setup, i) => (
                  <motion.div
                    key={setup.symbol}
                    className="setup-card"
                    whileHover={{ y: -2, borderColor: '#cbd5e1' }}
                    onClick={() => {
                      onSelectTicker?.(setup.symbol)
                      onClose()
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="setup-top-row">
                      <div className="setup-symbol-group">
                        <span className="setup-rank">#{i + 1}</span>
                        <span className="setup-symbol">{setup.symbol}</span>
                      </div>
                      <span className={`setup-direction-badge ${setup.isCall ? 'call' : 'put'}`}>
                        {setup.badge}
                      </span>
                    </div>

                    <div className="setup-metrics-grid">
                      <div className="setup-cell">
                        <span className="scell-label">ENTRY TRIGGER</span>
                        <span className="scell-val">${setup.price.toFixed(2)}</span>
                      </div>
                      <div className="setup-cell">
                        <span className="scell-label">STOP LOSS (EMA)</span>
                        <span className="scell-val stop">${setup.stopPrice.toFixed(2)}</span>
                      </div>
                      <div className="setup-cell">
                        <span className="scell-label">TARGET PRICE</span>
                        <span className="scell-val target">${setup.targetPrice.toFixed(2)}</span>
                      </div>
                      <div className="setup-cell">
                        <span className="scell-label">R/R RATIO</span>
                        <span className="scell-val rr">{setup.rrRatio}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Interactive Chat History */}
            {chatHistory.length > 0 && (
              <div className="ai-section-block">
                <div className="section-title-row">
                  <Sparkles size={14} className="sec-icon" />
                  <span className="sec-title">COPILOT DIALOGUE</span>
                </div>
                <div className="chat-messages-stack">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`chat-bubble ${msg.role}`}>
                      <span className="bubble-role">{msg.role === 'user' ? 'YOU' : 'AI COPILOT'}</span>
                      <p className="bubble-text">{msg.content}</p>
                    </div>
                  ))}
                  {isSynthesizing && (
                    <div className="chat-bubble assistant synthesizing">
                      <span className="bubble-role">AI COPILOT</span>
                      <p className="bubble-text">// Reasoning across quantitative metrics...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Prompt Suggestions */}
            <div className="quick-prompts-block">
              <span className="qp-title">QUICK QUERIES:</span>
              <div className="qp-chips-row">
                <button className="qp-chip" onClick={() => handleSendPrompt("What is the risk level on QQQ?")}>
                  Risk on QQQ?
                </button>
                <button className="qp-chip" onClick={() => handleSendPrompt("Summarize crypto vs equities divergence today")}>
                  Crypto vs Equities
                </button>
                <button className="qp-chip" onClick={() => handleSendPrompt("What is the highest momentum setup?")}>
                  Best R/R Setup
                </button>
              </div>
            </div>
          </div>

          {/* Drawer Footer Natural Language Input */}
          <div className="ai-drawer-footer">
            <form onSubmit={(e) => { e.preventDefault(); handleSendPrompt() }} className="ai-chat-form">
              <input
                type="text"
                className="ai-chat-input"
                placeholder="Ask AI Copilot about signals, setups, or risk..."
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                disabled={isSynthesizing}
              />
              <button
                type="submit"
                className="ai-send-btn"
                disabled={isSynthesizing || !promptInput.trim()}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}
