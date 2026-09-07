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
  Dices,
  X,
  Sliders,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Percent,
  DollarSign,
  Activity,
  BarChart2,
  PieChart
} from 'lucide-react'

// Box-Muller transform for standard normal random variable generator N(0,1)
function gaussianRandom() {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export default function PortfolioSimulatorModal({
  isOpen = false,
  onClose,
  signals = []
}) {
  const [horizonDays, setHorizonDays] = useState(90) // 30, 90, 365

  // Default Asset Portfolio Allocation State ($100,000 Total Capital)
  const [allocations, setAllocations] = useState({
    'NVDA': 40000,
    'BTC-USD': 30000,
    'QQQ': 20000,
    'GLD': 10000
  })

  // ESC Key Listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const totalCapital = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  }, [allocations])

  // Asset Metadata Mapping (Annualized Return mu, Volatility sigma)
  const assetMeta = useMemo(() => {
    const meta = {}
    const activeSyms = Object.keys(allocations)
    activeSyms.forEach(sym => {
      const match = (signals || []).find(s => (s.symbol || '').toUpperCase() === sym.toUpperCase())
      const isCrypto = sym.includes('USD') || sym === 'BTC' || sym === 'ETH' || sym === 'SOL'
      let parsedPrice = 100
      if (match) {
        const cleaned = String(match.current_price || match.close_price || '').replace(/[^0-9.-]/g, '')
        parsedPrice = parseFloat(cleaned) || 100
      }
      meta[sym] = {
        symbol: sym,
        price: parsedPrice,
        mu: isCrypto ? 0.35 : 0.18, // 35% annual drift for crypto, 18% for equities
        sigma: isCrypto ? 0.65 : (sym === 'NVDA' || sym === 'TSLA' ? 0.45 : 0.22) // Volatility
      }
    })
    return meta
  }, [allocations, signals])


  // Run 1,000 Monte Carlo Geometric Brownian Motion (GBM) Paths
  const simulationResults = useMemo(() => {
    const numPaths = 1000
    const days = horizonDays
    const dt = 1 / 365 // Daily step

    const activeAssets = Object.keys(allocations).filter(sym => (allocations[sym] || 0) > 0)
    if (activeAssets.length === 0 || totalCapital <= 0) {
      return { fanData: [], var95: 0, cvar95: 0, sharpe: 0, maxDrawdown: 0, finalPercentiles: { p5: 0, p50: 0, p95: 0 } }
    }

    // Path storage: matrix of shape [numPaths][days + 1]
    const pathMatrix = Array.from({ length: numPaths }, () => new Float64Array(days + 1))

    // Initialize day 0 for all paths
    for (let p = 0; p < numPaths; p++) {
      pathMatrix[p][0] = totalCapital
    }

    for (let day = 1; day <= days; day++) {
      for (let p = 0; p < numPaths; p++) {
        let pathDayTotal = 0
        activeAssets.forEach(sym => {
          const dollarWeight = allocations[sym]
          const meta = assetMeta[sym] || { mu: 0.15, sigma: 0.25 }
          const Z = gaussianRandom()
          // Geometric Brownian Motion step: S_t = S_{t-1} * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
          const growth = Math.exp((meta.mu - 0.5 * meta.sigma * meta.sigma) * dt + meta.sigma * Math.sqrt(dt) * Z)
          // Estimate portfolio dollar step
          const prevAssetDollar = (pathMatrix[p][day - 1] / totalCapital) * dollarWeight
          pathDayTotal += prevAssetDollar * growth
        })
        pathMatrix[p][day] = pathDayTotal
      }
    }

    // Compute Percentiles per Day for Fan Chart Visualization
    const fanData = []
    const endingValues = []

    for (let day = 0; day <= days; day++) {
      const dayValues = []
      for (let p = 0; p < numPaths; p++) {
        dayValues.push(pathMatrix[p][day])
      }
      dayValues.sort((a, b) => a - b)

      const p5 = dayValues[Math.floor(numPaths * 0.05)]
      const p50 = dayValues[Math.floor(numPaths * 0.50)]
      const p95 = dayValues[Math.floor(numPaths * 0.95)]

      fanData.push({
        day: `Day ${day}`,
        p5: parseFloat(p5.toFixed(2)),
        p50: parseFloat(p50.toFixed(2)),
        p95: parseFloat(p95.toFixed(2))
      })

      if (day === days) {
        endingValues.push(...dayValues)
      }
    }

    // Calculate Quantitative Risk Metrics on Ending Portfolio Values
    endingValues.sort((a, b) => a - b)
    const p5Ending = endingValues[Math.floor(numPaths * 0.05)]
    const p50Ending = endingValues[Math.floor(numPaths * 0.50)]
    const p95Ending = endingValues[Math.floor(numPaths * 0.95)]

    // Value at Risk (95% VaR) = Initial Capital - 5th Percentile Ending Value
    const var95 = Math.max(totalCapital - p5Ending, 0)

    // Expected Shortfall (CVaR) = Average of worst 5% outcomes
    const worst5Pct = endingValues.slice(0, Math.floor(numPaths * 0.05))
    const avgWorst = worst5Pct.reduce((a, b) => a + b, 0) / (worst5Pct.length || 1)
    const cvar95 = Math.max(totalCapital - avgWorst, 0)

    // Portfolio Sharpe Ratio & Max Drawdown %
    const returns = endingValues.map(v => (v - totalCapital) / totalCapital)
    const avgReturn = returns.reduce((a, b) => a + b, 0) / numPaths
    const stdDevReturn = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / numPaths) || 0.01
    const sharpe = parseFloat(((avgReturn - 0.03) / stdDevReturn).toFixed(2)) // 3% risk-free rate
    const maxDrawdown = parseFloat((((totalCapital - p5Ending) / totalCapital) * 100).toFixed(2))

    return {
      fanData,
      var95: parseFloat(var95.toFixed(2)),
      cvar95: parseFloat(cvar95.toFixed(2)),
      sharpe,
      maxDrawdown,
      finalPercentiles: {
        p5: parseFloat(p5Ending.toFixed(2)),
        p50: parseFloat(p50Ending.toFixed(2)),
        p95: parseFloat(p95Ending.toFixed(2))
      }
    }
  }, [allocations, totalCapital, horizonDays, assetMeta])

  const handleAllocationChange = (sym, amount) => {
    setAllocations(prev => ({
      ...prev,
      [sym]: Math.max(parseFloat(amount) || 0, 0)
    }))
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="mc-modal-root">
          {/* Translucent Backdrop */}
          <motion.div
            className="mc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal Shell Card */}
          <div className="mc-modal-wrapper">
            <motion.div
              className="mc-card"
              initial={{ opacity: 0, scale: 0.96, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -15 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {/* Header Bar */}
              <div className="mc-header">
                <div className="header-title-group">
                  <div className="mc-icon-badge">
                    <Dices size={18} />
                  </div>
                  <div>
                    <h2 className="mc-title">Monte Carlo Portfolio Risk & VaR Simulator</h2>
                    <p className="mc-sub">1,000 Brownian motion trajectory paths, Value at Risk (95% VaR), and Expected Shortfall</p>
                  </div>
                </div>

                <div className="header-controls font-mono">
                  <div className="horizon-pill-group">
                    {[30, 90, 365].map(d => (
                      <button
                        key={d}
                        className={`horizon-pill ${horizonDays === d ? 'active' : ''}`}
                        onClick={() => setHorizonDays(d)}
                      >
                        {d === 365 ? '1 Year' : `${d} Days`}
                      </button>
                    ))}
                  </div>

                  <button className="mc-close-btn" onClick={onClose} title="Close (ESC)">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Main Modal Body */}
              <div className="mc-body">
                {/* Left Panel: Portfolio Asset Allocation Sliders */}
                <div className="mc-left-panel">
                  <div className="alloc-card">
                    <div className="card-section-title">
                      <PieChart size={13} />
                      <span>PORTFOLIO CAPITAL ALLOCATION</span>
                    </div>

                    <div className="total-capital-bar font-mono">
                      <span className="cap-label">TOTAL CAPITAL:</span>
                      <span className="cap-val">${totalCapital.toLocaleString()}</span>
                    </div>

                    <div className="alloc-list">
                      {Object.keys(allocations).map(sym => (
                        <div key={sym} className="alloc-item">
                          <div className="alloc-item-header">
                            <span className="alloc-sym font-mono">{sym}</span>
                            <span className="alloc-pct font-mono">
                              {totalCapital > 0 ? ((allocations[sym] / totalCapital) * 100).toFixed(1) : 0}%
                            </span>
                          </div>

                          <div className="alloc-input-row">
                            <input
                              type="range"
                              className="alloc-slider"
                              min="0"
                              max="100000"
                              step="2500"
                              value={allocations[sym] || 0}
                              onChange={(e) => handleAllocationChange(sym, e.target.value)}
                            />
                            <input
                              type="number"
                              className="alloc-num-input font-mono"
                              value={allocations[sym] || 0}
                              onChange={(e) => handleAllocationChange(sym, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quantitative Risk Metrics Cards */}
                  <div className="mc-risk-grid font-mono">
                    <div className="mc-risk-card">
                      <span className="risk-title">VALUE AT RISK (95% VaR)</span>
                      <span className="risk-val loss">${simulationResults.var95.toLocaleString()}</span>
                      <span className="risk-sub">Max expected loss @ 95% confidence</span>
                    </div>

                    <div className="mc-risk-card">
                      <span className="risk-title">EXPECTED SHORTFALL (CVaR)</span>
                      <span className="risk-val loss">${simulationResults.cvar95.toLocaleString()}</span>
                      <span className="risk-sub">Average loss in worst 5% tail scenarios</span>
                    </div>

                    <div className="mc-risk-card">
                      <span className="risk-title">PORTFOLIO SHARPE RATIO</span>
                      <span className="risk-val profit">{simulationResults.sharpe}</span>
                      <span className="risk-sub">Risk-adjusted excess return score</span>
                    </div>

                    <div className="mc-risk-card">
                      <span className="risk-title">MAX DRAWDOWN PROJECTION</span>
                      <span className="risk-val loss">-{simulationResults.maxDrawdown}%</span>
                      <span className="risk-sub">Worst peak-to-trough decline</span>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Interactive Quantile Fan Chart */}
                <div className="mc-right-panel">
                  <div className="fan-chart-header">
                    <span className="chart-title">1,000 SIMULATION PATHS - QUANTILE PROJECTION FAN</span>
                    <div className="legend-group font-mono">
                      <span className="legend-item p95">● 95th Percentile (Bull)</span>
                      <span className="legend-item p50">● 50th Median</span>
                      <span className="legend-item p5">● 5th Percentile (Worst)</span>
                    </div>
                  </div>

                  <div className="fan-chart-container">
                    <ResponsiveContainer width="100%" height={380}>
                      <AreaChart
                        data={simulationResults.fanData}
                        margin={{ top: 15, right: 20, left: 15, bottom: 15 }}
                      >
                        <defs>
                          <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="p5Grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="day"
                          stroke="#94a3b8"
                          fontSize={11}
                          fontFamily="var(--font-mono)"
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          fontFamily="var(--font-mono)"
                          tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
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
                          formatter={(value, name) => [
                            `$${parseFloat(value).toLocaleString()}`,
                            name === 'p95' ? '95th Percentile' : name === 'p50' ? '50th Median' : '5th Percentile'
                          ]}
                        />
                        <ReferenceLine y={totalCapital} stroke="#64748b" strokeDasharray="3 3" />

                        <Area
                          type="monotone"
                          dataKey="p95"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#p95Grad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="p50"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#p50Grad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="p5"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#p5Grad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mc-footer">
                <span className="footer-brand font-mono">KAPPA // MONTE CARLO RISK ENGINE</span>
                <button className="mc-done-btn" onClick={onClose}>
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
