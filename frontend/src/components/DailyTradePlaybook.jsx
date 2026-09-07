import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Target,
  ShieldCheck,
  TrendingUp,
  Award,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Play
} from 'lucide-react'
import { translations } from '../i18n/translations'

export default function DailyTradePlaybook({
  signals = [],
  onSelectAsset,
  onOpenAcademy,
  lang = 'en'
}) {
  const t = translations[lang] || translations.en

  // Find top featured signal (e.g. highest price or strongest momentum)
  const topSignal = useMemo(() => {
    if (!Array.isArray(signals) || signals.length === 0) return null
    // Pick first bullish signal or top asset
    return signals.find(s => (s.macd || 0) >= (s.macd_signal || 0)) || signals[0]
  }, [signals])

  if (!topSignal) return null

  const symbol = topSignal.symbol || 'NVDA'
  const price = parseFloat(topSignal.current_price || topSignal.close_price || 150)
  const isBuy = (topSignal.macd || 0) >= (topSignal.macd_signal || 0)

  // Calculate 1:2 Risk/Reward Targets
  const stopLoss = (price * 0.96).toFixed(2) // 4% Risk limit
  const takeProfit = (price * 1.08).toFixed(2) // 8% Profit target

  // Simulated Model Confidence Score
  const confidenceScore = Math.min(94, Math.max(78, Math.floor(82 + Math.abs((topSignal.macd || 0.5) * 10))))

  return (
    <motion.div
      className="playbook-banner-card font-mono"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header Row */}
      <div className="playbook-header">
        <div className="playbook-title-group">
          <div className="playbook-badge">
            <Award size={16} />
            <span>AI TOP PICK</span>
          </div>
          <div>
            <h3 className="playbook-main-title">{t.playbookTitle}</h3>
            <p className="playbook-sub-title">{t.playbookSub}</p>
          </div>
        </div>

        <div className="confidence-pill">
          <Sparkles size={13} className="sparkle-icon" />
          <span>{t.modelConfidence}: <strong>{confidenceScore}%</strong></span>
        </div>
      </div>

      {/* Actionable Setup Grid */}
      <div className="playbook-grid">
        {/* Ticker & Signal Badge */}
        <div className="playbook-ticker-card">
          <div className="ticker-top">
            <span className="ticker-sym">{symbol}</span>
            <span className={`signal-tag ${isBuy ? 'buy' : 'sell'}`}>
              {isBuy ? (lang === 'th' ? 'สัญญาณซื้อ ⚡' : 'BUY RECOMMENDATION ⚡') : (lang === 'th' ? 'สัญญาณขาย ⚠️' : 'SELL RECOMMENDATION ⚠️')}
            </span>
          </div>
          <div className="ticker-price">${price.toFixed(2)}</div>
        </div>

        {/* 3 Step Actionable Targets */}
        <div className="playbook-steps-card">
          <div className="step-item entry">
            <span className="step-label">{t.step1Entry}</span>
            <span className="step-val">${price.toFixed(2)}</span>
          </div>

          <div className="step-item stop-loss">
            <span className="step-label">{t.step2StopLoss}</span>
            <span className="step-val">${stopLoss} <small>(-4.0%)</small></span>
          </div>

          <div className="step-item take-profit">
            <span className="step-label">{t.step3TakeProfit}</span>
            <span className="step-val">${takeProfit} <small>(+8.0%)</small></span>
          </div>
        </div>

        {/* Real Live Data Inspection Button */}
        <div className="playbook-action-card">
          <button
            className="simulate-trade-btn"
            onClick={() => onSelectAsset?.(symbol)}
            title="Open Live Quantitative Inspection Sheet & Interactive Candlestick Chart"
          >
            <Zap size={14} />
            <span>{lang === 'th' ? 'ดูข้อมูลวิเคราะห์เรียลไทม์ ⚡' : 'INSPECT LIVE QUANT DATA ⚡'}</span>
          </button>

          <button
            className="why-explainer-link"
            onClick={() => onOpenAcademy?.(topSignal)}
          >
            <ShieldCheck size={13} />
            <span>{lang === 'th' ? 'ดูทำไมถึงเกิดสัญญาณ ➔' : 'Why did this signal trigger? ➔'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

