import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Radio,
  Send,
  Sliders,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react'

const CONDITION_OPTIONS = [
  { id: 'ABOVE', label: 'Price Crosses Above (≥)', defaultVal: '200' },
  { id: 'BELOW', label: 'Price Crosses Below (≤)', defaultVal: '150' },
  { id: 'RSI_HIGH', label: 'RSI Overbought (>70)', defaultVal: '70' },
  { id: 'RSI_LOW', label: 'RSI Oversold (<30)', defaultVal: '30' },
  { id: 'EMA_CROSS', label: 'EMA 20/50 Golden Cross', defaultVal: '1' }
]

export default function AlertRulesModal({
  isOpen = false,
  onClose,
  signals = [],
  alerts = [],
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
  initialTicker = 'BTC-USD'
}) {
  const [ticker, setTicker] = useState(initialTicker)
  const [condition, setCondition] = useState('ABOVE')
  const [targetValue, setTargetValue] = useState('200')
  const [destination, setDestination] = useState('TOAST') // 'TOAST' | 'WEBHOOK'
  const [webhookUrl, setWebhookUrl] = useState('')

  // Sync initialTicker when modal opens
  useEffect(() => {
    if (initialTicker) setTicker(initialTicker)
  }, [initialTicker, isOpen])

  // ESC key listener to dismiss modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Dynamically resolve tickers dropdown
  const tickerOptions = useMemo(() => {
    const defaultList = ['BTC-USD', 'NVDA', 'QQQ', 'SPY', 'TSLA', 'AMD', 'META', 'AAPL', 'MSFT', 'SOL-USD', 'ETH-USD']
    const signalSymbols = (signals || []).map(s => (s.symbol || '').toUpperCase()).filter(Boolean)
    return Array.from(new Set([...signalSymbols, ...defaultList])).sort()
  }, [signals])

  // Update target value default when condition changes
  const handleConditionChange = (cId) => {
    setCondition(cId)
    const currentSig = signals.find(s => (s.symbol || '').toUpperCase() === ticker.toUpperCase())
    const close = currentSig ? parseFloat(currentSig.close_price) : 200

    if (cId === 'ABOVE') setTargetValue((close * 1.05).toFixed(2))
    else if (cId === 'BELOW') setTargetValue((close * 0.95).toFixed(2))
    else if (cId === 'RSI_HIGH') setTargetValue('70')
    else if (cId === 'RSI_LOW') setTargetValue('30')
    else setTargetValue('1')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!ticker) return alert('Please select a target ticker symbol.')

    const newRule = {
      id: `alert-${Date.now()}`,
      ticker: ticker.toUpperCase(),
      condition,
      targetValue: parseFloat(targetValue) || 0,
      destination,
      webhookUrl: destination === 'WEBHOOK' ? webhookUrl.trim() : '',
      enabled: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().split('T')[0]
    }

    onAddAlert?.(newRule)
    setWebhookUrl('')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="alert-modal-root">
          {/* Translucent Backdrop */}
          <motion.div
            className="alert-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal Shell Card */}
          <div className="alert-modal-wrapper">
            <motion.div
              className="alert-card"
              initial={{ opacity: 0, scale: 0.95, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {/* Modal Header */}
              <div className="alert-header">
                <div className="header-title-group">
                  <div className="alert-icon-badge">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h2 className="alert-title">Algorithmic Alert Rule Engine</h2>
                    <p className="alert-sub">Set live breach triggers for Toast & Webhook dispatches</p>
                  </div>
                </div>
                <button className="alert-close-btn" onClick={onClose} title="Close (ESC)">
                  <X size={18} />
                </button>
              </div>

              {/* Form & Active Rules Body */}
              <div className="alert-body">
                {/* Rule Creation Form Card */}
                <form className="alert-form-card" onSubmit={handleSubmit}>
                  <div className="form-section-title">
                    <Plus size={14} className="title-icon" />
                    <span>CREATE NEW ALERT RULE</span>
                  </div>

                  <div className="form-grid">
                    {/* Ticker Dropdown */}
                    <div className="form-group">
                      <label className="form-label">TARGET SYMBOL</label>
                      <select
                        className="form-select font-mono"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value)}
                      >
                        {tickerOptions.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Condition Pill Selector */}
                    <div className="form-group col-span-2">
                      <label className="form-label">TECHNICAL TRIGGER CONDITION</label>
                      <div className="condition-pill-group">
                        {CONDITION_OPTIONS.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className={`cond-pill ${condition === c.id ? 'active' : ''}`}
                            onClick={() => handleConditionChange(c.id)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Threshold Target Value Input */}
                    <div className="form-group">
                      <label className="form-label">TRIGGER THRESHOLD LEVEL</label>
                      <div className="target-input-wrapper font-mono">
                        <span>$</span>
                        <input
                          type="number"
                          className="target-input"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          step="any"
                          required
                        />
                      </div>
                    </div>

                    {/* Destination Switcher */}
                    <div className="form-group">
                      <label className="form-label">ALERT DISPATCH DESTINATION</label>
                      <div className="dest-pill-group">
                        <button
                          type="button"
                          className={`dest-pill ${destination === 'TOAST' ? 'active' : ''}`}
                          onClick={() => setDestination('TOAST')}
                        >
                          In-App Toast
                        </button>
                        <button
                          type="button"
                          className={`dest-pill ${destination === 'WEBHOOK' ? 'active' : ''}`}
                          onClick={() => setDestination('WEBHOOK')}
                        >
                          Discord Webhook
                        </button>
                      </div>
                    </div>

                    {/* Optional Webhook URL Input */}
                    {destination === 'WEBHOOK' && (
                      <div className="form-group col-span-2">
                        <label className="form-label">DISCORD / SLACK WEBHOOK URL</label>
                        <input
                          type="url"
                          className="webhook-input font-mono"
                          placeholder="https://discord.com/api/webhooks/..."
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-submit-row">
                    <button type="submit" className="add-rule-btn">
                      <Plus size={14} />
                      <span>Add Alert Rule</span>
                    </button>
                  </div>
                </form>

                {/* Active Alert Rules Table */}
                <div className="active-rules-card">
                  <div className="rules-card-header">
                    <span className="rules-card-title">ACTIVE ALERT RULES ({alerts.length})</span>
                  </div>

                  <div className="rules-table-wrapper">
                    <table className="rules-table">
                      <thead>
                        <tr>
                          <th>STATUS</th>
                          <th>TICKER</th>
                          <th>CONDITION & THRESHOLD</th>
                          <th>DESTINATION</th>
                          <th>STATE</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="empty-rules">No alert rules configured yet. Create one above!</td>
                          </tr>
                        ) : (
                          alerts.map((a) => {
                            const condObj = CONDITION_OPTIONS.find(c => c.id === a.condition)
                            const condLabel = condObj ? condObj.label : a.condition
                            const isTriggered = a.status === 'TRIGGERED'

                            return (
                              <tr key={a.id}>
                                <td>
                                  <span className={`status-badge ${isTriggered ? 'triggered' : 'active'}`}>
                                    {isTriggered ? 'TRIGGERED' : 'MONITORING'}
                                  </span>
                                </td>
                                <td className="mono-cell font-bold">{a.ticker}</td>
                                <td>
                                  <span className="cond-desc font-mono">{condLabel} @ {a.targetValue}</span>
                                </td>
                                <td>
                                  <span className="dest-tag font-mono">
                                    {a.destination === 'WEBHOOK' ? 'Discord Webhook' : 'In-App Toast'}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className={`toggle-switch ${a.enabled ? 'on' : 'off'}`}
                                    onClick={() => onToggleAlert?.(a.id)}
                                    title={a.enabled ? 'Disable Rule' : 'Enable Rule'}
                                  >
                                    <span className="switch-handle" />
                                  </button>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="delete-rule-btn"
                                    onClick={() => onDeleteAlert?.(a.id)}
                                    title="Delete Rule"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="alert-footer">
                <span className="footer-brand font-mono">KAPPA // BREACH DETECTION ENGINE</span>
                <button className="alert-done-btn" onClick={onClose}>
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
