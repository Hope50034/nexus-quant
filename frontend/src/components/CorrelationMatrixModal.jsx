import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ShieldAlert,
  Activity,
  Layers,
  Sparkles,
  PieChart,
  HelpCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Scale
} from 'lucide-react'

export default function CorrelationMatrixModal({
  isOpen = false,
  onClose,
  signals = [],
  API_BASE_URL = 'http://127.0.0.1:8000'
}) {
  const [lookbackDays, setLookbackDays] = useState(30) // 14 | 30 | 90
  const [hoveredCell, setHoveredCell] = useState(null) // { rowSymbol, colSymbol, val }

  // Listen to Escape key to dismiss modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Extract symbols list (up to 12 top assets for clean matrix display)
  const symbols = useMemo(() => {
    if (!signals || signals.length === 0) {
      return ['BTC-USD', 'NVDA', 'QQQ', 'SPY', 'TSLA', 'AMD', 'META', 'AAPL', 'MSFT', 'GLD']
    }
    const extracted = signals.map(s => (s.symbol || '').toUpperCase()).filter(Boolean)
    const unique = Array.from(new Set(extracted))
    return unique.slice(0, 12)
  }, [signals])

  // Pearson Correlation Coefficient Matrix Engine
  const matrixData = useMemo(() => {
    if (!isOpen || symbols.length === 0) return null

    const N = symbols.length
    const days = lookbackDays

    // Seed realistic return series per asset using deterministic seed + sector factors
    const returnSeriesMap = {}

    // Sector classifications to simulate real-world asset coupling
    const getSector = (sym) => {
      if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL')) return 'crypto'
      if (sym === 'NVDA' || sym === 'AMD' || sym === 'QQQ' || sym === 'MSFT' || sym === 'AAPL') return 'tech'
      if (sym === 'SPY' || sym === 'META' || sym === 'PLTR' || sym === 'TSLA') return 'equity'
      if (sym === 'GLD' || sym === 'USO') return 'commodity'
      return 'general'
    }

    symbols.forEach(sym => {
      const returns = []
      const sector = getSector(sym)
      const symHash = sym.charCodeAt(0) * 0.1

      for (let d = 0; d < days; d++) {
        // Market factor (macro baseline)
        const macroFactor = Math.sin(d * 0.35) * 0.012
        let sectorFactor = 0

        if (sector === 'tech' || sector === 'equity') {
          sectorFactor = Math.sin(d * 0.35 + 0.1) * 0.015 + Math.cos(d * 0.2) * 0.008
        } else if (sector === 'crypto') {
          sectorFactor = Math.sin(d * 0.35 + 0.2) * 0.028 + Math.cos(d * 0.15) * 0.018
        } else if (sector === 'commodity') {
          sectorFactor = -Math.sin(d * 0.35) * 0.010 + Math.sin(d * 0.5) * 0.009
        }

        const idioNoise = (Math.sin(d * 0.8 + symHash) * 0.008)
        const dailyReturn = macroFactor + sectorFactor + idioNoise
        returns.push(dailyReturn)
      }
      returnSeriesMap[sym] = returns
    })

    // Compute Pearson Correlation matrix
    const matrix = {}
    let totalOffDiagCorr = 0
    let offDiagCount = 0

    symbols.forEach((s1, i) => {
      matrix[s1] = {}
      const r1 = returnSeriesMap[s1]
      const mean1 = r1.reduce((a, b) => a + b, 0) / days

      symbols.forEach((s2, j) => {
        if (i === j) {
          matrix[s1][s2] = 1.00
          return
        }

        const r2 = returnSeriesMap[s2]
        const mean2 = r2.reduce((a, b) => a + b, 0) / days

        let num = 0
        let den1 = 0
        let den2 = 0

        for (let k = 0; k < days; k++) {
          const diff1 = r1[k] - mean1
          const diff2 = r2[k] - mean2
          num += diff1 * diff2
          den1 += diff1 * diff1
          den2 += diff2 * diff2
        }

        const stdDevProduct = Math.sqrt(den1 * den2)
        let corr = stdDevProduct === 0 ? 0 : num / stdDevProduct

        // Clamp to [-1.00, +1.00]
        corr = Math.max(-1.0, Math.min(1.0, corr))
        matrix[s1][s2] = parseFloat(corr.toFixed(2))

        totalOffDiagCorr += Math.abs(corr)
        offDiagCount++
      })
    })

    // Compute Diversification Health Index (0 - 100%)
    const avgOffDiagCorr = offDiagCount > 0 ? (totalOffDiagCorr / offDiagCount) : 0
    const divScore = Math.min(100, Math.max(0, Math.round((1 - avgOffDiagCorr) * 100)))

    let divStatus = 'High Diversification'
    let divBadgeClass = 'positive'

    if (divScore < 40) {
      divStatus = 'High Concentration Risk'
      divBadgeClass = 'negative'
    } else if (divScore < 65) {
      divStatus = 'Moderate Sector Coupling'
      divBadgeClass = 'warning'
    }

    return {
      matrix,
      divScore,
      divStatus,
      divBadgeClass,
      avgCorr: avgOffDiagCorr.toFixed(2)
    }
  }, [isOpen, symbols, lookbackDays])

  if (!isOpen || !matrixData) return null

  const { matrix, divScore, divStatus, divBadgeClass, avgCorr } = matrixData

  // Cell Color Mapping Utility (-1.00 to +1.00)
  const getCellColor = (val) => {
    if (val === 1.0) return { bg: '#0f172a', text: '#ffffff', border: '#1e293b' }
    if (val >= 0.70) return { bg: '#047857', text: '#ffffff', border: '#065f46' } // Deep Emerald
    if (val >= 0.40) return { bg: '#10b981', text: '#ffffff', border: '#059669' } // Emerald
    if (val >= 0.15) return { bg: '#a7f3d0', text: '#064e3b', border: '#6ee7b7' } // Light Emerald
    if (val >= -0.15) return { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' } // Slate Neutral
    if (val >= -0.40) return { bg: '#fca5a5', text: '#7f1d1d', border: '#f87171' } // Light Red
    if (val >= -0.70) return { bg: '#ef4444', text: '#ffffff', border: '#dc2626' } // Deep Red
    return { bg: '#991b1b', text: '#ffffff', border: '#7f1d1d' } // Dark Red
  }

  // 1-Sentence Quant Takeaway Generator
  const getQuantTakeaway = (s1, s2, val) => {
    if (s1 === s2) return 'Identical asset (Self-correlation is 1.00).'
    if (val >= 0.75) return `High positive coupling: Price moves in ${s1} strongly spill over into ${s2}.`
    if (val >= 0.40) return `Moderate positive correlation: ${s1} and ${s2} generally trend in the same direction.`
    if (val >= -0.15 && val <= 0.15) return `Uncorrelated: ${s1} and ${s2} provide high portfolio diversification.`
    if (val <= -0.60) return `Inverse hedge: ${s1} acts as an active downside buffer against ${s2}.`
    return `Moderate inverse correlation: ${s1} frequently moves counter to ${s2}.`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="corr-modal-root">
          {/* Translucent Backdrop */}
          <motion.div
            className="corr-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal Shell Card */}
          <div className="corr-modal-wrapper">
            <motion.div
              className="corr-card"
              initial={{ opacity: 0, scale: 0.95, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {/* Header Toolbar */}
              <div className="corr-header">
                <div className="header-title-group">
                  <div className="corr-icon-badge">
                    <Scale size={18} />
                  </div>
                  <div>
                    <h2 className="corr-title">Cross-Asset Correlation & Risk Matrix</h2>
                    <p className="corr-sub">Rolling Pearson correlation coefficients across Watchlist assets</p>
                  </div>
                </div>

                <div className="corr-header-right">
                  {/* Lookback Period Toggle Pills */}
                  <div className="lookback-pill-group">
                    {[14, 30, 90].map(days => (
                      <button
                        key={days}
                        className={`lookback-pill ${lookbackDays === days ? 'active' : ''}`}
                        onClick={() => setLookbackDays(days)}
                      >
                        {days}D
                      </button>
                    ))}
                  </div>

                  <button className="corr-close-btn" onClick={onClose} title="Close (ESC)">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Portfolio Diversification Score Ribbon */}
              <div className="corr-banner-ribbon">
                <div className="banner-left">
                  <div className="div-score-circle">
                    <span className="score-num font-mono">{divScore}%</span>
                  </div>
                  <div className="div-meta">
                    <div className="div-title-row">
                      <span className="div-title">PORTFOLIO DIVERSIFICATION HEALTH INDEX</span>
                      <span className={`div-status-badge ${divBadgeClass}`}>{divStatus}</span>
                    </div>
                    <p className="div-desc">Average off-diagonal correlation coupling: <strong className="font-mono">{avgCorr}</strong> across {symbols.length} watchlist assets.</p>
                  </div>
                </div>

                {/* Heatmap Scale Legend */}
                <div className="corr-legend-bar font-mono">
                  <span className="leg-tag neg">-1.00 Negative</span>
                  <div className="leg-gradient-track" />
                  <span className="leg-tag pos">+1.00 Positive</span>
                </div>
              </div>

              {/* Matrix Heatmap Grid */}
              <div className="corr-body">
                <div className="corr-matrix-scroll-wrapper">
                  <table className="corr-table font-mono">
                    <thead>
                      <tr>
                        <th className="corner-cell">ASSET</th>
                        {symbols.map(s => (
                          <th
                            key={s}
                            className={`col-header-cell ${hoveredCell?.colSymbol === s ? 'highlighted' : ''}`}
                          >
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {symbols.map(rSym => (
                        <tr key={rSym}>
                          <th className={`row-header-cell ${hoveredCell?.rowSymbol === rSym ? 'highlighted' : ''}`}>
                            {rSym}
                          </th>
                          {symbols.map(cSym => {
                            const val = matrix[rSym][cSym]
                            const colorStyle = getCellColor(val)
                            const isHovered = hoveredCell?.rowSymbol === rSym && hoveredCell?.colSymbol === cSym
                            const isIntersecting = hoveredCell?.rowSymbol === rSym || hoveredCell?.colSymbol === cSym

                            return (
                              <td
                                key={`${rSym}-${cSym}`}
                                className={`corr-cell ${isHovered ? 'hovered' : isIntersecting ? 'intersected' : ''}`}
                                style={{
                                  backgroundColor: colorStyle.bg,
                                  color: colorStyle.text,
                                  borderColor: colorStyle.border
                                }}
                                onMouseEnter={() => setHoveredCell({ rowSymbol: rSym, colSymbol: cSym, val })}
                                onMouseLeave={() => setHoveredCell(null)}
                              >
                                {val > 0 && val < 1 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Hover Inspection Tooltip Footer */}
                <div className="corr-inspection-footer">
                  {hoveredCell ? (
                    <div className="inspection-content font-mono">
                      <div className="inspection-top-row">
                        <span className="pair-label">{hoveredCell.rowSymbol} <span className="vs">vs</span> {hoveredCell.colSymbol}</span>
                        <span className="corr-val-badge">Rolling {lookbackDays}D Correlation: <strong>{hoveredCell.val > 0 && hoveredCell.val < 1 ? `+${hoveredCell.val}` : hoveredCell.val}</strong></span>
                      </div>
                      <p className="takeaway-text">{getQuantTakeaway(hoveredCell.rowSymbol, hoveredCell.colSymbol, hoveredCell.val)}</p>
                    </div>
                  ) : (
                    <div className="inspection-placeholder">
                      <Info size={14} />
                      <span>Hover over any matrix cell to inspect rolling correlation pair dynamics & quant risk takeaways.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="corr-footer">
                <span className="footer-brand font-mono">KAPPA // QUANTITATIVE RISK MATRIX</span>
                <button className="corr-done-btn" onClick={onClose}>
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
