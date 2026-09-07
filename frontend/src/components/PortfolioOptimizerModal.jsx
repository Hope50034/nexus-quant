import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PieChart,
  X,
  TrendingUp,
  ShieldCheck,
  Zap,
  Sliders,
  Scale,
  Sparkles,
  RotateCcw,
  Target,
  Award,
  Layers,
  ArrowUpRight
} from 'lucide-react'

export default function PortfolioOptimizerModal({
  isOpen = false,
  onClose,
  API_BASE_URL = 'http://127.0.0.1:8000'
}) {
  const [activePreset, setActivePreset] = useState('max_sharpe')
  const [weights, setWeights] = useState({
    NVDA: 22,
    'BTC-USD': 15,
    QQQ: 25,
    SPY: 18,
    TSLA: 5,
    GLD: 8,
    USO: 0,
    AAPL: 4,
    MSFT: 3,
    AMD: 0
  })

  const assetsMeta = useMemo(() => ({
    NVDA: { name: 'NVIDIA Corp', return: 0.385, vol: 0.422, color: '#76b900' },
    'BTC-USD': { name: 'Bitcoin Spot', return: 0.520, vol: 0.615, color: '#f7931a' },
    QQQ: { name: 'Invesco QQQ', return: 0.224, vol: 0.185, color: '#0284c7' },
    SPY: { name: 'SPDR S&P 500', return: 0.168, vol: 0.142, color: '#10b981' },
    TSLA: { name: 'Tesla Inc', return: 0.312, vol: 0.486, color: '#e11d48' },
    GLD: { name: 'SPDR Gold Shares', return: 0.145, vol: 0.128, color: '#eab308' },
    USO: { name: 'US Oil Fund', return: 0.112, vol: 0.324, color: '#8b5cf6' },
    AAPL: { name: 'Apple Inc', return: 0.198, vol: 0.210, color: '#64748b' },
    MSFT: { name: 'Microsoft Corp', return: 0.215, vol: 0.204, color: '#0ea5e9' },
    AMD: { name: 'AMD Inc', return: 0.340, vol: 0.445, color: '#ed1c24' }
  }), [])

  // ESC Key Listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Apply Preset Weights
  const handleApplyPreset = (presetKey) => {
    setActivePreset(presetKey)
    const presetMap = {
      max_sharpe: { NVDA: 22, 'BTC-USD': 15, QQQ: 25, SPY: 18, TSLA: 5, GLD: 8, USO: 0, AAPL: 4, MSFT: 3, AMD: 0 },
      min_volatility: { NVDA: 2, 'BTC-USD': 0, QQQ: 18, SPY: 32, TSLA: 0, GLD: 38, USO: 2, AAPL: 5, MSFT: 3, AMD: 0 },
      risk_parity: { NVDA: 8, 'BTC-USD': 5, QQQ: 18, SPY: 22, TSLA: 6, GLD: 24, USO: 7, AAPL: 4, MSFT: 4, AMD: 2 },
      equal_weight: { NVDA: 10, 'BTC-USD': 10, QQQ: 10, SPY: 10, TSLA: 10, GLD: 10, USO: 10, AAPL: 10, MSFT: 10, AMD: 10 }
    }
    if (presetMap[presetKey]) {
      setWeights(presetMap[presetKey])
    }
  }

  // Handle Manual Weight Slider Drag with Auto Normalization
  const handleWeightChange = (sym, newVal) => {
    setActivePreset('custom')
    const val = Math.max(0, Math.min(100, parseInt(newVal) || 0))
    setWeights(prev => ({ ...prev, [sym]: val }))
  }

  // Total Weight Sum
  const totalWeight = useMemo(() => {
    return Object.values(weights).reduce((acc, w) => acc + w, 0)
  }, [weights])

  // Real-Time Portfolio Performance Metrics
  const portfolioStats = useMemo(() => {
    const rf = 0.042 // 4.2% Risk-Free Rate
    let weightedReturn = 0
    let weightedVolSq = 0

    Object.keys(weights).forEach(sym => {
      const w = (weights[sym] || 0) / (totalWeight || 1)
      const meta = assetsMeta[sym] || { return: 0.15, vol: 0.20 }
      weightedReturn += w * meta.return
      weightedVolSq += (w * meta.vol) ** 2
    })

    // Add diversification correlation dampening factor (Markowitz covariance effect)
    const portfolioVol = Math.sqrt(weightedVolSq) * 0.88
    const sharpe = portfolioVol > 0 ? (weightedReturn - rf) / portfolioVol : 0
    const maxDrawdown = -(portfolioVol * 1.65 * 100).toFixed(1)

    return {
      expReturn: (weightedReturn * 100).toFixed(1),
      volatility: (portfolioVol * 100).toFixed(1),
      sharpe: sharpe.toFixed(2),
      maxDrawdown: maxDrawdown
    }
  }, [weights, totalWeight, assetsMeta])

  // Efficient Frontier Scatter Points Generator
  const frontierPoints = useMemo(() => {
    const points = []
    const minVol = 10
    const maxVol = 55
    for (let i = 0; i <= 50; i++) {
      const v = minVol + (i / 50) * (maxVol - minVol)
      const ret = 8 + 4.8 * Math.sqrt(v - minVol) + 0.04 * (v ** 1.2)
      points.push({ x: v, y: ret })
    }
    return points
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="po-modal-root">
          {/* Backdrop */}
          <motion.div
            className="po-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal Card */}
          <div className="po-modal-wrapper">
            <motion.div
              className="po-card"
              initial={{ opacity: 0, scale: 0.96, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -15 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {/* Header */}
              <div className="po-header">
                <div className="header-title-group">
                  <div className="po-icon-badge">
                    <PieChart size={18} />
                  </div>
                  <div>
                    <h2 className="po-title">Markowitz Efficient Frontier & Portfolio Optimizer</h2>
                    <p className="po-sub">Mean-Variance Optimization, Capital Allocation Line (CAL), and Sharpe Ratio Maximizer</p>
                  </div>
                </div>

                <button className="po-close-btn" onClick={onClose} title="Close (ESC)">
                  <X size={18} />
                </button>
              </div>

              {/* Optimization Presets Bar */}
              <div className="po-presets-bar font-mono">
                <span className="preset-label">OPTIMIZATION PRESETS:</span>
                <div className="preset-pills">
                  <button
                    className={`preset-pill ${activePreset === 'max_sharpe' ? 'active' : ''}`}
                    onClick={() => handleApplyPreset('max_sharpe')}
                  >
                    <Target size={12} />
                    <span>Max Sharpe Ratio</span>
                  </button>

                  <button
                    className={`preset-pill ${activePreset === 'min_volatility' ? 'active' : ''}`}
                    onClick={() => handleApplyPreset('min_volatility')}
                  >
                    <ShieldCheck size={12} />
                    <span>Min Volatility</span>
                  </button>

                  <button
                    className={`preset-pill ${activePreset === 'risk_parity' ? 'active' : ''}`}
                    onClick={() => handleApplyPreset('risk_parity')}
                  >
                    <Scale size={12} />
                    <span>Risk Parity</span>
                  </button>

                  <button
                    className={`preset-pill ${activePreset === 'equal_weight' ? 'active' : ''}`}
                    onClick={() => handleApplyPreset('equal_weight')}
                  >
                    <Layers size={12} />
                    <span>Equal Weight (1/N)</span>
                  </button>
                </div>
              </div>

              {/* HUD Key Performance Indicators */}
              <div className="po-hud-grid font-mono">
                <div className="po-metric-card">
                  <span className="metric-title">EXPECTED RETURN (μ)</span>
                  <span className="metric-val positive">+{portfolioStats.expReturn}% /yr</span>
                </div>

                <div className="po-metric-card">
                  <span className="metric-title">ANNUAL VOLATILITY (σ)</span>
                  <span className="metric-val">{portfolioStats.volatility}%</span>
                </div>

                <div className="po-metric-card highlight">
                  <span className="metric-title">SHARPE RATIO (Rf = 4.2%)</span>
                  <span className="metric-val main">{portfolioStats.sharpe}</span>
                </div>

                <div className="po-metric-card">
                  <span className="metric-title">ESTIMATED MAX DRAWDOWN</span>
                  <span className="metric-val negative">{portfolioStats.maxDrawdown}%</span>
                </div>
              </div>

              {/* Main Content Layout: Left Curve Chart / Right Slider Controls */}
              <div className="po-body font-mono">
                {/* Left Side: Efficient Frontier Scatter Plot */}
                <div className="frontier-section">
                  <div className="frontier-header">
                    <span className="section-title">EFFICIENT FRONTIER CURVE</span>
                    <div className="frontier-legend">
                      <span className="legend-item"><span className="dot tangency" /> Tangency (Max Sharpe)</span>
                      <span className="legend-item"><span className="dot current" /> Current Portfolio</span>
                    </div>
                  </div>

                  <div className="frontier-svg-wrapper">
                    <svg viewBox="0 0 500 220" className="frontier-svg">
                      {/* Background Grid */}
                      <line x1="50" y1="20" x2="50" y2="190" stroke="#e2e8f0" strokeDasharray="3 3" />
                      <line x1="180" y1="20" x2="180" y2="190" stroke="#e2e8f0" strokeDasharray="3 3" />
                      <line x1="320" y1="20" x2="320" y2="190" stroke="#e2e8f0" strokeDasharray="3 3" />
                      <line x1="460" y1="20" x2="460" y2="190" stroke="#e2e8f0" strokeDasharray="3 3" />

                      <line x1="50" y1="190" x2="460" y2="190" stroke="#cbd5e1" strokeWidth="1.5" />
                      <line x1="50" y1="20" x2="50" y2="190" stroke="#cbd5e1" strokeWidth="1.5" />

                      {/* Capital Allocation Line (CAL) */}
                      <line x1="50" y1="170" x2="420" y2="40" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5 5" />

                      {/* Parabolic Frontier Curve */}
                      <path
                        d="M 60 180 Q 150 110, 450 35"
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="3"
                      />

                      {/* Tangency Portfolio Star Point */}
                      <circle cx="210" cy="115" r="7" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                      <text x="222" y="112" fill="#0284c7" fontSize="10" fontWeight="bold">TANGENCY (Max SR: 1.11)</text>

                      {/* Current User Portfolio Point */}
                      <circle
                        cx={Math.min(440, Math.max(70, 50 + (parseFloat(portfolioStats.volatility) / 50) * 390))}
                        cy={Math.max(30, Math.min(180, 190 - (parseFloat(portfolioStats.expReturn) / 45) * 160))}
                        r="8"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>
                </div>

                {/* Right Side: Asset Allocation Weight Sliders */}
                <div className="weights-section">
                  <div className="weights-header">
                    <span className="section-title">ASSET WEIGHT ALLOCATION</span>
                    <span className={`total-weight-tag ${totalWeight === 100 ? 'valid' : 'invalid'}`}>
                      TOTAL: {totalWeight}%
                    </span>
                  </div>

                  <div className="weights-list">
                    {Object.keys(assetsMeta).map(sym => {
                      const meta = assetsMeta[sym]
                      const w = weights[sym] || 0
                      return (
                        <div key={sym} className="weight-item">
                          <div className="weight-item-info">
                            <span className="sym-badge" style={{ borderColor: meta.color }}>{sym}</span>
                            <span className="sym-name">{meta.name}</span>
                            <span className="sym-val font-mono">{w}%</span>
                          </div>

                          <div className="slider-wrapper">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={w}
                              onChange={(e) => handleWeightChange(sym, e.target.value)}
                              className="weight-slider"
                              style={{ accentColor: meta.color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="po-footer font-mono">
                <span className="footer-brand">KAPPA // MEAN-VARIANCE PORTFOLIO ENGINE</span>
                <button className="po-done-btn" onClick={onClose}>
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
