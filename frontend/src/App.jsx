import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  YAxis
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  AlertCircle,
  SlidersHorizontal,
  Layers,
  Cpu,
  BarChart3,
  Sparkles,
  X,
  Bot,
  ChevronDown,
  Plus,
  Loader2
} from 'lucide-react'
import './App.css'

// Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
}

function App() {
  // Mode toggle state: 'buy' or 'sell'
  const [signalType, setSignalType] = useState('buy')
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Master Prompt State Hooks
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('Newest')
  const [activeCardTabs, setActiveCardTabs] = useState({})
  const [expandedDrawers, setExpandedDrawers] = useState({})

  // Dynamic Add Asset State
  const [newTickerInput, setNewTickerInput] = useState('')
  const [isAddingAsset, setIsAddingAsset] = useState(false)
  const [addAssetError, setAddAssetError] = useState(null)

  const handleAddAsset = async (e) => {
    if (e) e.preventDefault()
    const trimmed = newTickerInput.trim().toUpperCase()
    if (!trimmed || isAddingAsset) return

    setIsAddingAsset(true)
    setAddAssetError(null)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/signals/add/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol: trimmed }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch asset data`)
      }

      const newSignal = await response.json()

      // Prepend to signals array state so the card instantly appears in the grid
      setSignals(prev => {
        const exists = prev.some(s => (s.symbol || '').toUpperCase() === newSignal.symbol.toUpperCase())
        if (exists) {
          return prev.map(s => (s.symbol || '').toUpperCase() === newSignal.symbol.toUpperCase() ? newSignal : s)
        }
        return [newSignal, ...prev]
      })

      setNewTickerInput('')
    } catch (err) {
      console.error("Add asset error:", err)
      setAddAssetError(err.message)
      alert(`Failed to add ticker "${trimmed}": ${err.message}`)
    } finally {
      setIsAddingAsset(false)
    }
  }

  // Card Micro-Tabs Handler
  const handleCardTabChange = (symbol, tab) => {
    setActiveCardTabs(prev => ({ ...prev, [symbol]: tab }))
  }

  const getCardActiveTab = (symbol) => activeCardTabs[symbol] || 'MACD'

  // Expandable Options Drawer Handler
  const toggleDrawer = (symbol) => {
    setExpandedDrawers(prev => ({ ...prev, [symbol]: !prev[symbol] }))
  }

  const isDrawerExpanded = (symbol) => !!expandedDrawers[symbol]

  // AI Nexus Panel State
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiOutput, setAiOutput] = useState('')
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  // Fetch signals from Django API backend
  const fetchSignals = () => {
    setLoading(true)
    setError(null)
    const endpoint = `http://127.0.0.1:8000/api/signals/${signalType}/`

    fetch(endpoint)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`)
        }
        return response.json()
      })
      .then(data => {
        setSignals(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching MACD signals:", err)
        setError("Unable to connect to local Django API server at http://127.0.0.1:8000.")
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchSignals()
  }, [signalType])

  // Category Filter Options
  const categories = ['ALL', 'Crypto', 'Stock', 'Commodity']

  // Master Filter Engine: Derived displayedSignals pipeline
  const displayedSignals = useMemo(() => {
    return signals
      .filter(s => {
        const symbolStr = (s.symbol || '').toLowerCase()
        const assetStr = (s.asset_type || '').toLowerCase()
        const queryStr = searchQuery.toLowerCase().trim()

        // Filter 1: Match searchQuery against symbol or asset_type
        const matchesSearch = !queryStr || symbolStr.includes(queryStr) || assetStr.includes(queryStr)

        // Filter 2: Match activeFilter against asset class
        const filterStr = activeFilter.toLowerCase()
        const matchesFilter =
          activeFilter === 'ALL' ||
          assetStr === filterStr ||
          (activeFilter === 'Stock' && (assetStr.includes('stock') || assetStr.includes('equity'))) ||
          (activeFilter === 'Crypto' && assetStr.includes('crypto')) ||
          (activeFilter === 'Commodity' && assetStr.includes('commodity'))

        return matchesSearch && matchesFilter
      })
      .sort((a, b) => {
        const valA = parseFloat(a.close_price) || 0
        const valB = parseFloat(b.close_price) || 0
        const macdA = Math.abs(parseFloat(a.macd) || 0)
        const macdB = Math.abs(parseFloat(b.macd) || 0)
        const dateA = new Date(a.signal_date).getTime() || 0
        const dateB = new Date(b.signal_date).getTime() || 0

        switch (sortOrder) {
          case 'Oldest':
          case 'date-asc':
            return dateA - dateB
          case 'Symbol':
          case 'symbol':
            return (a.symbol || '').localeCompare(b.symbol || '')
          case 'Highest Price':
          case 'price-desc':
            return valB - valA
          case 'MACD Strength':
          case 'macd-desc':
            return macdB - macdA
          case 'Newest':
          case 'date-desc':
          default:
            return dateB - dateA
        }
      })
  }, [signals, searchQuery, activeFilter, sortOrder])

  // Aliases for compatibility
  const filteredSignals = displayedSignals
  const filteredAndSortedSignals = displayedSignals

  // Dynamic KPI Metrics calculation based on filtered displayedSignals
  const kpiData = useMemo(() => {
    const list = displayedSignals.length > 0 ? displayedSignals : signals
    if (!list.length) return { avgPrice: '0.00', topSignal: 'N/A', count: 0 }

    const totalPrice = list.reduce((acc, curr) => acc + (parseFloat(curr.close_price) || 0), 0)
    const avgPrice = (totalPrice / list.length).toFixed(2)

    const sortedByMacd = [...list].sort((a, b) =>
      Math.abs(parseFloat(b.macd) || 0) - Math.abs(parseFloat(a.macd) || 0)
    )
    const topSignal = sortedByMacd[0]?.symbol || 'N/A'

    return {
      avgPrice,
      topSignal,
      count: displayedSignals.length
    }
  }, [displayedSignals, signals])

  // Deterministically generate a simulated 7-day MACD trend line for sparkline chart
  const generate7DayTrendData = (signal) => {
    const baseMacd = parseFloat(signal.macd) || 0
    const baseSig = parseFloat(signal.macd_signal) || 0
    const isBuy = signalType === 'buy'

    const multipliers = isBuy
      ? [0.35, 0.45, 0.52, 0.68, 0.82, 0.94, 1.0]
      : [1.0, 0.88, 0.72, 0.58, 0.45, 0.32, 0.20]

    return multipliers.map((mult, idx) => ({
      day: `Day ${idx + 1}`,
      macd: parseFloat((baseMacd * mult + (idx % 2 === 0 ? 0.05 : -0.03)).toFixed(4)),
      signal: parseFloat((baseSig * mult).toFixed(4))
    }))
  }

  // Generate Gemini Quantitative Summary via Live Backend API
  const handleGenerateGeminiSummary = async () => {
    setIsGeneratingAi(true)
    setAiOutput('// Awaiting AI data signature...')

    try {
      const response = await fetch('http://127.0.0.1:8000/api/signals/analyze/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(displayedSignals.length > 0 ? displayedSignals : signals),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`)
      }

      const data = await response.json()
      if (!data || typeof data.analysis !== 'string') {
        throw new Error('Invalid JSON response: missing "analysis" property')
      }

      setAiOutput(data.analysis)
    } catch (err) {
      console.error("NEXUS Pipeline Error:", err)
      setAiOutput(`// ERROR: ${err.message || String(err)}`)
    } finally {
      setIsGeneratingAi(false)
    }
  }

  // Format currency
  const formatCurrency = (val) => {
    const num = parseFloat(val)
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(num)
  }

  // Capsule Tag Mapping
  const getAssetCapsuleMeta = (type = '') => {
    const lower = type.toLowerCase()
    if (lower.includes('crypto')) return { label: 'Crypto', styleClass: 'crypto' }
    if (lower.includes('stock') || lower.includes('equity')) return { label: 'US Equity', styleClass: 'equity' }
    if (lower.includes('commodity') || lower.includes('gold')) return { label: 'Commodity', styleClass: 'commodity' }
    return { label: type || 'Index', styleClass: 'index' }
  }

  return (
    <div className="quant-dashboard-root">
      {/* Premium Vercel Light Mode Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo-icon">
            <Cpu size={22} />
          </div>
          <div className="brand-title-group">
            <h1 className="brand-name">NEXUS // QUANT</h1>
            <span className="brand-subtitle">Algorithmic Signal Engine // SYSTEM ONLINE</span>
          </div>
        </div>

        <div className="header-controls">
          <div className="segmented-control">
            <button
              className={`toggle-btn ${signalType === 'buy' ? 'active-buy' : ''}`}
              onClick={() => setSignalType('buy')}
            >
              <TrendingUp size={15} />
              <span>Bullish</span>
            </button>
            <button
              className={`toggle-btn ${signalType === 'sell' ? 'active-sell' : ''}`}
              onClick={() => setSignalType('sell')}
            >
              <TrendingDown size={15} />
              <span>Bearish</span>
            </button>
          </div>

          <button
            className="ai-command-btn"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Sparkles size={15} />
            <span>AI Command</span>
          </button>
        </div>
      </header>

      {/* 3. The 'Antigravity' Experience - Staggered KPI Stats Panel */}
      <motion.div
        className="kpi-row"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div className="kpi-tile" variants={itemVariants}>
          <div className={`kpi-icon ${signalType}`}>
            {signalType === 'buy' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className="kpi-content">
            <span className="kpi-title-label">Active Signals</span>
            <span className="kpi-stat-number">{kpiData.count}</span>
            <span className="kpi-meta-desc">{signalType === 'buy' ? 'Bullish Crossovers' : 'Bearish Divergences'}</span>
          </div>
        </motion.div>

        <motion.div className="kpi-tile" variants={itemVariants}>
          <div className="kpi-icon cyber">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-title-label">Avg Close Price</span>
            <span className="kpi-stat-number">${kpiData.avgPrice}</span>
            <span className="kpi-meta-desc">Across target universe</span>
          </div>
        </motion.div>

        <motion.div className="kpi-tile" variants={itemVariants}>
          <div className={`kpi-icon ${signalType}`}>
            <Zap size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-title-label">Max Momentum</span>
            <span className="kpi-stat-number">{kpiData.topSignal}</span>
            <span className="kpi-meta-desc">Strongest MACD delta</span>
          </div>
        </motion.div>

        <motion.div className="kpi-tile" variants={itemVariants}>
          <div className="kpi-icon cyber">
            <Layers size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-title-label">Asset Classes</span>
            <span className="kpi-stat-number">{categories.length - 1}</span>
            <span className="kpi-meta-desc">Multivariate tracking</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Control Toolbar & Filters */}
      <div className="toolbar-container">
        <div className="search-field-group">
          <Search size={16} className="search-icon-svg" />
          <input
            type="text"
            className="search-text-input"
            placeholder="FILTER BY SYMBOL OR ASSET..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Buttons: ALL, Crypto, Stock, Commodity */}
        <div className="filter-badge-list">
          {categories.map(cat => (
            <button
              key={cat}
              className={`asset-filter-btn ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort Dropdown Menu */}
        <div className="sort-dropdown-box">
          <SlidersHorizontal size={14} style={{ color: 'var(--text-dim)' }} />
          <select
            className="select-input-styled"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="Newest">Newest Trigger Date</option>
            <option value="Oldest">Oldest Trigger Date</option>
            <option value="Symbol">Symbol (A-Z)</option>
            <option value="Highest Price">Highest Close Price</option>
            <option value="MACD Strength">Highest MACD Strength</option>
          </select>
        </div>

        {/* Track New Ticker Dynamic Input */}
        <form className="add-asset-form" onSubmit={handleAddAsset}>
          <input
            type="text"
            className="add-asset-input"
            placeholder="TRACK NEW TICKER..."
            value={newTickerInput}
            onChange={(e) => setNewTickerInput(e.target.value)}
            disabled={isAddingAsset}
          />
          <button
            type="submit"
            className="add-asset-submit-btn"
            disabled={isAddingAsset || !newTickerInput.trim()}
            title="Fetch Live Ticker Data"
          >
            {isAddingAsset ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
          </button>
        </form>
      </div>

      {/* 2. The Signal Grid & 3. Framer Motion Cards */}
      {loading ? (
        <div className="signal-masonry-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="quant-skeleton">
              <div className="pulse-bar" style={{ width: '45%', height: '26px' }}></div>
              <div className="pulse-bar" style={{ width: '80%', height: '40px' }}></div>
              <div className="pulse-bar" style={{ width: '100%', height: '70px' }}></div>
              <div className="pulse-bar" style={{ width: '60%', height: '30px' }}></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="cyber-error-box">
          <AlertCircle size={44} style={{ color: 'var(--neon-red)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Backend Connection Failure</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{error}</p>
          <button className="action-btn-retry" onClick={fetchSignals}>
            <RefreshCw size={16} />
            RECONNECT API
          </button>
        </div>
      ) : displayedSignals.length === 0 ? (
        <div className="cyber-error-box" style={{ borderColor: 'var(--border-glass)' }}>
          <Search size={44} style={{ color: 'var(--text-dim)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>No Signals Matching Query</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No {signalType === 'buy' ? 'bullish' : 'bearish'} algorithmic signals match your filter parameters.
          </p>
        </div>
      ) : (
        <motion.div
          className="signal-masonry-grid"
          key={`${signalType}-${activeFilter}-${sortOrder}-${searchQuery}`}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {displayedSignals.map((signal) => {
            const macdVal = parseFloat(signal.macd) || 0
            const macdSigVal = parseFloat(signal.macd_signal) || 0
            const diff = macdVal - macdSigVal
            const isBuy = signalType === 'buy'
            const capsuleMeta = getAssetCapsuleMeta(signal.asset_type)
            const trendData = generate7DayTrendData(signal)
            const gradientId = `gradient-${signal.symbol.replace(/[^a-zA-Z0-9]/g, '')}`
            const glowColor = isBuy ? '#10B981' : '#EF4444'
            const currentTab = getCardActiveTab(signal.symbol)
            const isExpanded = isDrawerExpanded(signal.symbol)

            // Options Volatility Metrics Heuristic
            const ivRankVal = signal.symbol === 'QQQ' || signal.symbol === 'TSLA' || signal.symbol === 'NVDA' ? 88 : 34
            const isHighIv = ivRankVal >= 80
            const isLowIv = ivRankVal <= 20
            const pcRatio = signal.symbol === 'QQQ' ? '1.15' : '0.92'
            const impliedMove = signal.symbol === 'QQQ' ? '±$4.50' : '±$12.30'
            const isNegGamma = signal.symbol === 'QQQ' || signal.symbol === 'TSLA' || !isBuy
            const gammaVal = isNegGamma ? 'Negative' : 'Positive'

            return (
              <motion.div
                key={signal.symbol}
                className="quant-card"
                variants={itemVariants}
                whileHover={{ scale: 1.01, y: -3 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              >
                {/* Card Header */}
                <div className="quant-card-header">
                  <div className="symbol-group">
                    <span className="quant-symbol">
                      <span className={`signal-status-dot ${isBuy ? 'bullish' : 'bearish'}`} />
                      {signal.symbol}
                    </span>
                  </div>

                  <span className={`asset-capsule-tag ${capsuleMeta.styleClass}`}>
                    {capsuleMeta.label}
                  </span>
                </div>

                {/* Price & Trigger Block */}
                <div className="price-trigger-block">
                  <div className="data-cell">
                    <span className="data-cell-label">CLOSE PRICE</span>
                    <span className="data-cell-value price">{formatCurrency(signal.close_price)}</span>
                  </div>

                  <div className="data-cell">
                    <span className="data-cell-label">TRIGGER DATE</span>
                    <span className="data-cell-value date">
                      <Calendar size={13} />
                      {signal.signal_date}
                    </span>
                  </div>
                </div>

                {/* TradingView Price Action Chart Container */}
                <div className="sparkline-container">
                  <div className="sparkline-header">
                    <span className="chart-placeholder-label">PRICE ACTION CHART</span>
                    <div className="card-tab-nav" role="tablist">
                      {['MACD', 'EMA', 'CANDLE'].map((tab) => {
                        const isActive = currentTab === tab
                        return (
                          <button
                            key={tab}
                            className={`card-tab-btn ${isActive ? 'active' : ''}`}
                            onClick={() => handleCardTabChange(signal.symbol, tab)}
                          >
                            <span style={{ position: 'relative', zIndex: 1 }}>{tab}</span>
                            {isActive && (
                              <motion.div
                                className="card-tab-glider"
                                layoutId={`tab-glider-${signal.symbol}`}
                                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="recharts-wrapper-area">
                    {currentTab === 'MACD' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={glowColor} stopOpacity={0.25} />
                              <stop offset="95%" stopColor={glowColor} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <YAxis domain={['auto', 'auto']} hide />
                          <Area
                            type="monotone"
                            dataKey="macd"
                            stroke={glowColor}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#${gradientId})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    {currentTab === 'EMA' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                          <YAxis domain={['auto', 'auto']} hide />
                          <Line type="monotone" dataKey="macd" stroke={glowColor} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="signal" stroke="var(--accent-blue)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}

                    {currentTab === 'CANDLE' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                          <YAxis domain={['auto', 'auto']} hide />
                          <Bar dataKey="macd" fill={glowColor} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="sparkline-metrics-detail">
                    <span>MACD: {macdVal > 0 ? `+${macdVal.toFixed(4)}` : macdVal.toFixed(4)}</span>
                    <span>SIGNAL: {macdSigVal > 0 ? `+${macdSigVal.toFixed(4)}` : macdSigVal.toFixed(4)}</span>
                    <span>DELTA: {diff >= 0 ? `+${diff.toFixed(4)}` : diff.toFixed(4)}</span>
                  </div>
                </div>

                {/* Expandable Options Data Drawer */}
                <div className="drawer-toggle-row">
                  <button
                    className="drawer-toggle-btn"
                    onClick={() => toggleDrawer(signal.symbol)}
                  >
                    <span>OPTIONS DATA</span>
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                      <ChevronDown size={14} />
                    </motion.span>
                  </button>
                </div>

                {/* Collapsible Recessed 2x2 Options Grid */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="options-drawer-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="recessed-options-grid">
                        <div className="options-cell">
                          <span className="options-label">IV RANK</span>
                          <span className={`options-value ${isHighIv ? 'high-iv' : isLowIv ? 'low-iv' : ''}`}>
                            {ivRankVal}%
                          </span>
                        </div>

                        <div className="options-cell">
                          <span className="options-label">P/C RATIO</span>
                          <span className="options-value">{pcRatio}</span>
                        </div>

                        <div className="options-cell">
                          <span className="options-label">0DTE IMPLIED MOVE</span>
                          <span className="options-value">{impliedMove}</span>
                        </div>

                        <div className="options-cell">
                          <span className="options-label">GAMMA EXPOSURE</span>
                          <span className={`options-value ${isNegGamma ? 'neg-gamma' : 'pos-gamma'}`}>
                            {gammaVal}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* 4. The AI Nexus Panel (Collapsible Right Sidebar) */}
      <AnimatePresence>
        {isAiOpen && (
          <>
            <motion.div
              className="ai-nexus-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiOpen(false)}
            />
            <motion.aside
              className="ai-nexus-sidebar"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="ai-panel-header">
                <div className="ai-panel-title-group">
                  <Bot size={22} className="ai-panel-icon" />
                  <span className="ai-panel-title">NEXUS AI // GEMINI</span>
                </div>
                <button className="ai-close-btn" onClick={() => setIsAiOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="ai-panel-body">
                <div className="ai-context-banner">
                  <span className="ai-banner-label">LIVE DATA SIGNATURE</span>
                  <span className="ai-banner-value">
                    {signalType.toUpperCase()} MODE • {signals.length} ASSETS • TOP: {kpiData.topSignal}
                  </span>
                </div>

                <div className="ai-output-window">
                  {isGeneratingAi ? (
                    <span className="ai-loading-text">// Awaiting AI data signature...</span>
                  ) : aiOutput && aiOutput.startsWith('// ERROR:') ? (
                    <span className="ai-error-text">{aiOutput}</span>
                  ) : aiOutput ? (
                    aiOutput
                  ) : (
                    <span className="ai-placeholder-text">
                      // Awaiting data signature... Click below to generate Gemini AI quantitative analysis.
                    </span>
                  )}
                </div>
              </div>

              <div className="ai-panel-footer">
                <input
                  type="text"
                  className="ai-chat-input-box"
                  placeholder="Ask Gemini about signal risk, options IV, momentum..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateGeminiSummary()}
                />
                <button
                  className="generate-gemini-btn"
                  onClick={handleGenerateGeminiSummary}
                  disabled={isGeneratingAi}
                >
                  <Sparkles size={18} />
                  <span>{isGeneratingAi ? 'SYNTHESIZING DATA...' : 'GENERATE GEMINI SUMMARY'}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App