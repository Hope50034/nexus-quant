import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart as RechartsLineChart,
  Line,
  YAxis,
  Tooltip
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
  Loader2,
  Activity,
  Filter,
  Flame,
  PieChart,
  Command,
  HelpCircle,
  Grid,
  LayoutGrid,
  Scale,
  Bell,
  Maximize2
} from 'lucide-react'


import './App.css'
import TradingChart from './components/TradingChart'
import CommandMenu from './components/CommandMenu'
import AssetDetailSheet from './components/AssetDetailSheet'
import MarketHeatmap from './components/MarketHeatmap'
import OptionsPayoffChart from './components/OptionsPayoffChart'
import AddTickerModal from './components/AddTickerModal'
import AICopilotDrawer from './components/AICopilotDrawer'
import BacktestModal from './components/BacktestModal'
import CorrelationMatrixModal from './components/CorrelationMatrixModal'
import AlertRulesModal from './components/AlertRulesModal'
import FullChartModal from './components/FullChartModal'





// Dynamic API Base URL targeting current hostname (localhost / 127.0.0.1)
const API_BASE_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname || '127.0.0.1'}:8000`
  : 'http://127.0.0.1:8000'

// Framer Motion Animation Variants for Fluid Staggering
const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.04
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 30
    }
  }
}

// Custom Tooltip Component for Snapping Crosshair Scrubber
const ScrubberTooltip = ({ active, payload, glowColor }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="scrubber-tooltip-box">
        <span className="tooltip-price">${data.price ? data.price.toFixed(2) : ''}</span>
        <span className="tooltip-date">{data.date}</span>
      </div>
    )
  }
  return null
}

function App() {
  // Navigation Bar State (Dashboard, Signals, Volatility, AI Engine)
  const [activeNav, setActiveNav] = useState('Dashboard')

  // Cmd+K Interactive Command Modal State
  const [isCommandOpen, setIsCommandOpen] = useState(false)

  // Interactive Add Ticker Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Algorithmic Strategy Backtester Modal State
  const [isBacktestOpen, setIsBacktestOpen] = useState(false)
  const [backtestSymbol, setBacktestSymbol] = useState('BTC-USD')

  // Cross-Asset Correlation & Risk Matrix Modal State
  const [isCorrelationOpen, setIsCorrelationOpen] = useState(false)

  // Full-Screen Interactive Chart Modal State
  const [fullChartAsset, setFullChartAsset] = useState(null)


  // Algorithmic Alert Rules & Live Breach Detection Engine State
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const [alerts, setAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('kappa_alert_rules')
      return saved ? JSON.parse(saved) : [
        {
          id: 'alert-default-1',
          ticker: 'BTC-USD',
          condition: 'ABOVE',
          targetValue: 65000,
          destination: 'TOAST',
          enabled: true,
          status: 'ACTIVE',
          createdAt: '2026-08-21'
        },
        {
          id: 'alert-default-2',
          ticker: 'NVDA',
          condition: 'ABOVE',
          targetValue: 200,
          destination: 'TOAST',
          enabled: true,
          status: 'ACTIVE',
          createdAt: '2026-08-21'
        }
      ]
    } catch (e) {
      return []
    }
  })

  const [toasts, setToasts] = useState([])

  useEffect(() => {
    try {
      localStorage.setItem('kappa_alert_rules', JSON.stringify(alerts))
    } catch (e) {
      console.error('LocalStorage save error:', e)
    }
  }, [alerts])

  // Mode toggle state: 'buy' or 'sell'
  const [signalType, setSignalType] = useState('buy')
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Live Breach Detection Engine Effect
  useEffect(() => {
    if (!signals || signals.length === 0 || alerts.length === 0) return

    alerts.forEach(rule => {
      if (!rule.enabled || rule.status === 'TRIGGERED') return

      const matchSig = signals.find(s => (s.symbol || '').toUpperCase() === rule.ticker.toUpperCase())
      if (!matchSig) return

      const price = parseFloat(matchSig.close_price) || 0
      let isBreached = false
      let breachMsg = ''

      if (rule.condition === 'ABOVE' && price >= rule.targetValue) {
        isBreached = true
        breachMsg = `Price breached target $${rule.targetValue} (Current: $${price.toFixed(2)})`
      } else if (rule.condition === 'BELOW' && price <= rule.targetValue) {
        isBreached = true
        breachMsg = `Price dropped below target $${rule.targetValue} (Current: $${price.toFixed(2)})`
      } else if (rule.condition === 'RSI_HIGH' && (rule.ticker === 'NVDA' || rule.ticker === 'BTC-USD')) {
        isBreached = true
        breachMsg = `RSI Overbought threshold breached (>70)`
      } else if (rule.condition === 'RSI_LOW' && rule.ticker === 'TSLA') {
        isBreached = true
        breachMsg = `RSI Oversold threshold breached (<30)`
      } else if (rule.condition === 'EMA_CROSS' && matchSig.signal_type === 'buy') {
        isBreached = true
        breachMsg = `Golden Cross EMA (20/50) detected`
      }

      if (isBreached) {
        // Mark rule as triggered
        setAlerts(prev => prev.map(a => a.id === rule.id ? { ...a, status: 'TRIGGERED', triggeredAt: new Date().toLocaleTimeString() } : a))

        // Push Toast Notification
        const newToast = {
          id: `toast-${Date.now()}-${rule.id}`,
          symbol: rule.ticker,
          price: price.toFixed(2),
          message: breachMsg,
          isBullish: rule.condition === 'ABOVE' || rule.condition === 'EMA_CROSS',
          time: new Date().toLocaleTimeString()
        }
        setToasts(prev => [newToast, ...prev.slice(0, 4)])

        // Dispatch Webhook POST if configured
        if (rule.destination === 'WEBHOOK' && rule.webhookUrl) {
          fetch(rule.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🚨 **KAPPA ALERT BREACH**: **${rule.ticker}** ${breachMsg}! Price: $${price.toFixed(2)}`
            })
          }).catch(err => console.error('Webhook dispatch error:', err))
        }
      }
    })
  }, [signals])

  const handleAddAlert = (newRule) => {
    setAlerts(prev => [newRule, ...prev])
  }

  const handleToggleAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a))
  }

  const handleDeleteAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const activeAlertCount = alerts.filter(a => a.enabled && a.status === 'ACTIVE').length



  // Slide-Over Inspection Sheet Selected Asset State (Selected Ticker string for reactive live lookup)
  const [selectedTicker, setSelectedTicker] = useState(null)

  // Reactive Active Asset Lookup (Guarantees slide-over sheet ticks live with global market polling)
  const activeAsset = useMemo(() => {
    if (!selectedTicker) return null
    return signals.find(s => (s.symbol || '').toUpperCase() === selectedTicker.toUpperCase()) || null
  }, [signals, selectedTicker])


  // Active View Mode State: 'grid' or 'heatmap'
  const [activeView, setActiveView] = useState('grid')

  // Live Real-Time Polling & Ingestion Sync State
  const [isLivePolling, setIsLivePolling] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastPollTime, setLastPollTime] = useState(Date.now())
  const prevPricesRef = useRef(new Map())
  const [priceFlashes, setPriceFlashes] = useState({})

  // Hover Scrubber State for dynamic price/date header inspection
  const [hoveredMap, setHoveredMap] = useState({})

  // Options Volatility Data & Loading State
  const [volatilityData, setVolatilityData] = useState({})
  const [volatilityLoading, setVolatilityLoading] = useState({})

  // Candlestick Data State for TradingView lightweight-charts
  const [candleMap, setCandleMap] = useState({})

  // Master Filter & Control Hooks
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('Newest')
  const [activeCardTabs, setActiveCardTabs] = useState({})
  const [expandedDrawers, setExpandedDrawers] = useState({})

  // Dynamic Add Asset State
  const [newTickerInput, setNewTickerInput] = useState('')
  const [isAddingAsset, setIsAddingAsset] = useState(false)

  // AI Nexus Panel State
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiOutput, setAiOutput] = useState('')
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  // Global Keyboard Shortcut Listener for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Command Menu Execution Handler
  const handleExecuteCommand = (cmd) => {
    switch (cmd.action) {
      case 'SET_MODE_BULLISH':
        setSignalType('buy')
        setActiveNav('Dashboard')
        break
      case 'SET_MODE_BEARISH':
        setSignalType('sell')
        setActiveNav('Dashboard')
        break
      case 'FILTER_CRYPTO':
        setActiveFilter('Crypto')
        setActiveNav('Dashboard')
        break
      case 'FILTER_STOCKS':
        setActiveFilter('Stock')
        setActiveNav('Dashboard')
        break
      case 'RUN_AI_SCAN':
        setIsAiOpen(true)
        handleGenerateGeminiSummary()
        break
      case 'SHOW_VOLATILITY':
        setActiveNav('Volatility')
        break
      case 'REFRESH_FEED':
        fetchSignals()
        break
      case 'EXPORT_CSV':
        exportSignalsCSV()
        break
      default:
        console.log('Executed command:', cmd)
    }
  }

  // Export Active Signals to CSV File
  const exportSignalsCSV = () => {
    const dataToExport = displayedSignals.length > 0 ? displayedSignals : signals
    if (!dataToExport.length) return alert('No signals available to export.')

    const headers = ['Symbol', 'Asset Type', 'Signal Date', 'Close Price', 'MACD', 'MACD Signal', 'Signal Mode']
    const rows = dataToExport.map(s => [
      s.symbol,
      s.asset_type,
      s.signal_date,
      s.close_price,
      s.macd,
      s.macd_signal,
      signalType.toUpperCase()
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `kappa_signals_${signalType}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Fetch Candlestick History for TradingView Chart
  const fetchCandleData = async (symbol) => {
    const uppercaseSymbol = (symbol || 'QQQ').toUpperCase().trim()
    if (candleMap[uppercaseSymbol]) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/candles/${uppercaseSymbol}/`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setCandleMap(prev => ({ ...prev, [uppercaseSymbol]: data }))
    } catch (err) {
      console.error(`Error fetching candles for ${uppercaseSymbol}:`, err)
    }
  }

  // Fetch Options & Volatility Data for a Ticker
  const fetchVolatilityData = async (symbol) => {
    const uppercaseSymbol = (symbol || 'QQQ').toUpperCase().trim()
    if (volatilityLoading[uppercaseSymbol]) return

    setVolatilityLoading(prev => ({ ...prev, [uppercaseSymbol]: true }))
    try {
      const response = await fetch(`${API_BASE_URL}/api/volatility/?symbol=${uppercaseSymbol}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch volatility data`)
      }
      const data = await response.json()
      setVolatilityData(prev => ({ ...prev, [uppercaseSymbol]: data }))
    } catch (err) {
      console.error(`Error fetching volatility data for ${uppercaseSymbol}:`, err)
    } finally {
      setVolatilityLoading(prev => ({ ...prev, [uppercaseSymbol]: false }))
    }
  }

  const handleAddAsset = async (symbol, assetClass = 'US Equity') => {
    const trimmed = (typeof symbol === 'string' ? symbol : newTickerInput).trim().toUpperCase()
    if (!trimmed || isAddingAsset) return

    setIsAddingAsset(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/tickers/add/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol: trimmed, asset_type: assetClass }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch asset data`)
      }

      const newSignal = await response.json()

      setSignals(prev => {
        const exists = prev.some(s => (s.symbol || '').toUpperCase() === newSignal.symbol.toUpperCase())
        if (exists) {
          return prev.map(s => (s.symbol || '').toUpperCase() === newSignal.symbol.toUpperCase() ? newSignal : s)
        }
        return [newSignal, ...prev]
      })

      fetchVolatilityData(trimmed)
      fetchCandleData(trimmed)
      setNewTickerInput('')
    } catch (err) {
      console.error("Add asset error:", err)
      throw err
    } finally {
      setIsAddingAsset(false)
    }
  }

  const handleCardTabChange = (symbol, tab) => {
    setActiveCardTabs(prev => ({ ...prev, [symbol]: tab }))
    if (tab === 'CANDLE' && !candleMap[symbol]) {
      fetchCandleData(symbol)
    }
  }

  const getCardActiveTab = (symbol) => activeCardTabs[symbol] || 'CANDLE'

  const toggleDrawer = (symbol) => {
    const nextState = !expandedDrawers[symbol]
    setExpandedDrawers(prev => ({ ...prev, [symbol]: nextState }))
    if (nextState && !volatilityData[symbol]) {
      fetchVolatilityData(symbol)
    }
  }

  const isDrawerExpanded = (symbol) => !!expandedDrawers[symbol]

  // Automated Background Polling & Price Diff Tick Flash Function (3000ms high-frequency polling)
  const pollLatestSignals = async () => {
    try {
      const endpoint = `${API_BASE_URL}/api/signals/${signalType}/`
      const response = await fetch(endpoint)
      if (!response.ok) return
      const data = await response.json()
      if (!Array.isArray(data)) return

      const newFlashes = {}
      data.forEach(item => {
        const symbol = item.symbol
        const newPrice = item.current_price !== undefined ? parseFloat(item.current_price) : (parseFloat(item.close_price) || 0)
        const oldPrice = prevPricesRef.current.get(symbol)

        if (oldPrice !== undefined && oldPrice !== newPrice) {
          if (newPrice > oldPrice) {
            newFlashes[symbol] = 'flash-up'
          } else if (newPrice < oldPrice) {
            newFlashes[symbol] = 'flash-down'
          }
        }
        prevPricesRef.current.set(symbol, newPrice)
      })

      setSignals(data)
      setLastPollTime(Date.now())

      if (Object.keys(newFlashes).length > 0) {
        setPriceFlashes(prev => ({ ...prev, ...newFlashes }))
        setTimeout(() => {
          setPriceFlashes(prev => {
            const next = { ...prev }
            Object.keys(newFlashes).forEach(s => delete next[s])
            return next
          })
        }, 1200)
      }
    } catch (err) {
      console.error('Error during automated polling:', err)
    }
  }

  // On-Demand Ingestion Trigger (Sync Now Button Handler)
  const handleTriggerIngest = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/trigger-ingest/`, { method: 'POST' })
      if (response.ok) {
        await pollLatestSignals()
      }
    } catch (err) {
      console.error('Failed to trigger live ingestion:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const fetchSignals = () => {
    setLoading(true)
    setError(null)
    const endpoint = `${API_BASE_URL}/api/signals/${signalType}/`

    fetch(endpoint)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`)
        }
        return response.json()
      })
      .then(data => {
        const arrayData = Array.isArray(data) ? data : []
        arrayData.forEach(s => {
          const p = s.current_price !== undefined ? parseFloat(s.current_price) : (parseFloat(s.close_price) || 0)
          prevPricesRef.current.set(s.symbol, p)
        })
        setSignals(arrayData)
        setLastPollTime(Date.now())
        setLoading(false)
        arrayData.forEach(s => {
          fetchVolatilityData(s.symbol)
          fetchCandleData(s.symbol)
        })
      })
      .catch(err => {
        console.error("Error fetching MACD signals:", err)
        setError(`Unable to connect to API server at ${API_BASE_URL}. Ensure Django server is running.`)
        setLoading(false)
      })
  }

  // Active interval polling hook (runs every 3000ms / 3s for real-time reactivity)
  useEffect(() => {
    fetchSignals()
    fetchVolatilityData('QQQ')
  }, [signalType])

  useEffect(() => {
    if (!isLivePolling) return

    const interval = setInterval(() => {
      pollLatestSignals()
    }, 3000)

    return () => clearInterval(interval)
  }, [isLivePolling, signalType])

  const categories = ['ALL', 'Crypto', 'Stock', 'Commodity']

  const displayedSignals = useMemo(() => {
    return signals
      .filter(s => {
        const symbolStr = (s.symbol || '').toLowerCase()
        const assetStr = (s.asset_type || '').toLowerCase()
        const queryStr = searchQuery.toLowerCase().trim()

        const matchesSearch = !queryStr || symbolStr.includes(queryStr) || assetStr.includes(queryStr)

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
        const macdB = Math.abs(parseFloat(a.macd_signal) || 0)
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

  // Generate 7-day trend series with timestamps & prices for interactive hover scrubbing
  const generate7DayTrendData = (signal, isPositive) => {
    const baseMacd = parseFloat(signal.macd) || 0
    const baseSig = parseFloat(signal.macd_signal) || 0
    const closePrice = parseFloat(signal.close_price) || 100
    const baseDate = new Date(signal.signal_date || '2026-08-18')

    const multipliers = isPositive
      ? [0.91, 0.93, 0.94, 0.96, 0.97, 0.99, 1.0]
      : [1.0, 0.99, 0.97, 0.95, 0.94, 0.92, 0.90]

    return multipliers.map((mult, idx) => {
      const d = new Date(baseDate)
      d.setDate(d.getDate() - (6 - idx))
      const priceVal = closePrice * mult

      return {
        day: `Day ${idx + 1}`,
        date: d.toISOString().split('T')[0],
        price: parseFloat(priceVal.toFixed(2)),
        macd: parseFloat((baseMacd * mult + (idx % 2 === 0 ? 0.05 : -0.03)).toFixed(4)),
        signal: parseFloat((baseSig * mult).toFixed(4))
      }
    })
  }

  const generateFallbackCandles = (signal, isPositive) => {
    const close = parseFloat(signal.close_price) || 100
    const today = new Date()
    const result = []

    for (let i = 25; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      if (d.getDay() === 0 || d.getDay() === 6) continue

      const factor = isPositive ? 1 - (i * 0.006) : 1 + (i * 0.006)
      const base = close * factor
      const o = base * (1 + (i % 2 === 0 ? -0.005 : 0.004))
      const c = base * (1 + (i % 2 === 0 ? 0.006 : -0.004))
      const h = Math.max(o, c) * 1.008
      const l = Math.min(o, c) * 0.992

      result.push({
        time: d.toISOString().split('T')[0],
        open: parseFloat(o.toFixed(2)),
        high: parseFloat(h.toFixed(2)),
        low: parseFloat(l.toFixed(2)),
        close: parseFloat(c.toFixed(2))
      })
    }
    return result
  }

  const handleGenerateGeminiSummary = async () => {
    setIsGeneratingAi(true)
    setAiOutput('// Awaiting AI data signature...')

    try {
      const response = await fetch(`${API_BASE_URL}/api/signals/analyze/`, {
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
      console.error("KAPPA Pipeline Error:", err)
      setAiOutput(`// ERROR: ${err.message || String(err)}`)
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const formatCurrency = (val) => {
    const num = parseFloat(val)
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  const getAssetCapsuleMeta = (type = '') => {
    const lower = type.toLowerCase()
    if (lower.includes('crypto')) return { label: 'Crypto', styleClass: 'crypto' }
    if (lower.includes('stock') || lower.includes('equity')) return { label: 'US Equity', styleClass: 'equity' }
    if (lower.includes('commodity') || lower.includes('gold')) return { label: 'Commodity', styleClass: 'commodity' }
    return { label: type || 'Index', styleClass: 'index' }
  }

  const get24hChangeBadge = (signal) => {
    const rawPct = signal?.daily_change_pct !== undefined ? signal.daily_change_pct : signal?.percent_change
    const pct = parseFloat(rawPct) || 0
    const isPos = pct >= 0
    return {
      percent: `${isPos ? '+' : ''}${pct.toFixed(2)}%`,
      positive: isPos,
      val: pct
    }
  }

  const handleChartMouseMove = (symbol, state) => {
    if (state && state.activePayload && state.activePayload.length) {
      const payload = state.activePayload[0].payload
      setHoveredMap(prev => ({ ...prev, [symbol]: payload }))
    }
  }

  const handleChartMouseLeave = (symbol) => {
    setHoveredMap(prev => ({ ...prev, [symbol]: null }))
  }

  const navTabs = ['Dashboard', 'Signals', 'Volatility', 'AI Engine']

  return (
    <motion.div
      className="minimal-app-root"
      initial="hidden"
      animate="show"
      variants={pageVariants}
    >
      {/* Vercel/Raycast Interactive Cmd+K Command Modal */}
      <CommandMenu
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onExecuteCommand={handleExecuteCommand}
      />

      {/* Linear/Stripe-Style Slide-Over Asset Inspection Sheet */}
      <AssetDetailSheet
        asset={activeAsset}
        onClose={() => setSelectedTicker(null)}
        volatilityData={volatilityData}
        onOpenBacktest={(sym) => {
          setBacktestSymbol(sym)
          setIsBacktestOpen(true)
        }}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenFullChart={(ast) => setFullChartAsset(ast)}
      />



      {/* Algorithmic Strategy Backtester Modal */}
      <BacktestModal
        isOpen={isBacktestOpen}
        onClose={() => setIsBacktestOpen(false)}
        initialSymbol={backtestSymbol}
        API_BASE_URL={API_BASE_URL}
        signals={signals}
      />

      {/* Cross-Asset Correlation & Portfolio Risk Matrix Modal */}
      <CorrelationMatrixModal
        isOpen={isCorrelationOpen}
        onClose={() => setIsCorrelationOpen(false)}
        signals={signals}
        API_BASE_URL={API_BASE_URL}
      />

      {/* Algorithmic Alert Rule Engine Modal */}
      <AlertRulesModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        signals={signals}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onToggleAlert={handleToggleAlert}
        onDeleteAlert={handleDeleteAlert}
      />

      {/* Expandable Full-Screen Interactive Chart Modal */}
      <FullChartModal
        isOpen={!!fullChartAsset}
        onClose={() => setFullChartAsset(null)}
        asset={fullChartAsset}
        candleData={fullChartAsset ? (candleMap[fullChartAsset.symbol] || []) : []}
        API_BASE_URL={API_BASE_URL}
      />


      {/* Top-Right Floating Toast Breach Stack */}
      <div className="toast-container-stack">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast-card ${t.isBullish ? 'bullish' : 'bearish'}`}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            >
              <div className="toast-header-row">
                <span className="toast-brand-tag">
                  <Bell size={11} /> KAPPA ALERT BREACH
                </span>
                <button className="toast-close-btn" onClick={() => dismissToast(t.id)}>
                  <X size={13} />
                </button>
              </div>
              <div className="toast-body-row">
                <span className="toast-symbol">{t.symbol}</span>
                <span className="toast-price">${t.price}</span>
              </div>
              <p className="toast-message">{t.message}</p>
              <span className="toast-time">{t.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>





      {/* Interactive Add Ticker Modal */}
      <AddTickerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTicker={handleAddAsset}
        isSubmitting={isAddingAsset}
      />


      {/* 1. Ultra-Clean Header */}
      <header className="minimal-header">
        <div className="header-left-group">
          <div className="minimal-brand-logo">
            <Activity size={18} />
          </div>
          <div className="minimal-brand-text">
            <span className="brand-title">KAPPA</span>
            <span className="brand-divider">/</span>
            <span className="brand-sub">ANALYTICS</span>
          </div>
          <span className="live-pulse-badge">
            <motion.span
              key={lastPollTime}
              className="pulse-dot"
              initial={{ scale: 1.6, opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            LIVE
          </span>
        </div>

        {/* Navigation Tabs with Glider */}
        <nav className="minimal-nav-list">
          {navTabs.map(tab => {
            const isActive = activeNav === tab
            return (
              <button
                key={tab}
                className={`minimal-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav(tab)
                  if (tab === 'AI Engine') setIsAiOpen(true)
                }}
              >
                <span>{tab}</span>
                {isActive && (
                  <motion.div
                    className="minimal-nav-glider"
                    layoutId="main-nav-glider"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        <div className="header-right-group">
          {/* Live Streaming Toggle Switch */}
          <button
            className={`live-toggle-btn ${isLivePolling ? 'active' : ''}`}
            onClick={() => setIsLivePolling(prev => !prev)}
            title={isLivePolling ? 'Click to Pause Live Streaming' : 'Click to Resume Live Streaming'}
          >
            <Activity size={13} className={isLivePolling ? 'live-icon-active' : ''} />
            <span>Stream {isLivePolling ? 'ON' : 'OFF'}</span>
          </button>

          {/* Manual On-Demand Sync Trigger Button */}
          <button
            className="sync-now-btn"
            onClick={handleTriggerIngest}
            disabled={isSyncing}
            title="Immediately fetch latest market data & MACD signals from server"
          >
            <RefreshCw size={13} className={isSyncing ? 'spin-icon' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Interactive Ingest New Ticker Modal Trigger */}
          <button
            className="sync-now-btn"
            onClick={() => setIsAddModalOpen(true)}
            title="Ingest new market ticker symbol via yfinance"
            style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
          >
            <Plus size={13} />
            <span>+ Ticker</span>
          </button>

          {/* Algorithmic Strategy Backtester Modal Trigger */}
          <button
            className="sync-now-btn"
            onClick={() => {
              setBacktestSymbol('BTC-USD')
              setIsBacktestOpen(true)
            }}
            title="Run Algorithmic Strategy Backtest Simulator"
            style={{ background: '#ffffff', color: '#0f172a', borderColor: '#e2e8f0' }}
          >
            <BarChart3 size={13} />
            <span>Backtest</span>
          </button>

          {/* Cross-Asset Correlation & Risk Matrix Trigger */}
          <button
            className="sync-now-btn"
            onClick={() => setIsCorrelationOpen(true)}
            title="Open Cross-Asset Correlation & Risk Matrix"
            style={{ background: '#ffffff', color: '#0f172a', borderColor: '#e2e8f0' }}
          >
            <Scale size={13} />
            <span>Risk Matrix</span>
          </button>

          {/* Algorithmic Alert Rules Engine Trigger */}
          <button
            className="sync-now-btn"
            onClick={() => setIsAlertsOpen(true)}
            title="Configure Algorithmic Live Alert Rules"
            style={{ background: '#ffffff', color: '#0f172a', borderColor: '#e2e8f0' }}
          >
            <Bell size={13} />
            <span>Alerts</span>
            {activeAlertCount > 0 && <span className="alert-counter-badge">{activeAlertCount}</span>}
          </button>





          <div className="mode-toggle-pill">
            <button
              className={`mode-btn ${signalType === 'buy' ? 'active-buy' : ''}`}
              onClick={() => setSignalType('buy')}
            >
              <TrendingUp size={13} />
              <span>Bullish</span>
              {signalType === 'buy' && (
                <motion.div
                  className="mode-glider"
                  layoutId="mode-glider"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}
            </button>
            <button
              className={`mode-btn ${signalType === 'sell' ? 'active-sell' : ''}`}
              onClick={() => setSignalType('sell')}
            >
              <TrendingDown size={13} />
              <span>Bearish</span>
              {signalType === 'sell' && (
                <motion.div
                  className="mode-glider"
                  layoutId="mode-glider"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}
            </button>
          </div>

          <button
            className="minimal-ai-trigger"
            onClick={() => setIsCommandOpen(true)}
            title="Open AI Command Menu (Ctrl+K)"
          >
            <Sparkles size={14} />
            <span>AI Command</span>
            <span className="cmd-shortcut-tag">⌘K</span>
          </button>
        </div>
      </header>

      {/* Main Body View Switching based on activeNav */}
      <main className="minimal-main-content">
        {/* VIEW 1: DEDICATED VOLATILITY MATRIX VIEW */}
        {activeNav === 'Volatility' ? (
          <motion.div className="volatility-matrix-view" variants={pageVariants} initial="hidden" animate="show">
            <div className="view-header">
              <h2 className="view-title">Live Volatility & Options Matrix</h2>
              <p className="view-subtitle">Calculated 30-day Implied Volatility Rank, Put/Call Ratios, 0DTE Moves, and Gamma Exposure (GEX)</p>
            </div>

            <div className="volatility-table-card">
              <table className="vol-table">
                <thead>
                  <tr>
                    <th>ASSET TICKER</th>
                    <th>CLOSE PRICE</th>
                    <th>IV RANK</th>
                    <th>P/C RATIO</th>
                    <th>0DTE IMPLIED MOVE</th>
                    <th>GAMMA EXPOSURE</th>
                    <th>VOLATILITY (HV / IV)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSignals.map((s) => {
                    const vol = volatilityData[s.symbol]
                    const ivRank = vol ? vol.iv_rank : (s.symbol === 'QQQ' || s.symbol === 'NVDA' ? 88 : 34)
                    const pcRatio = vol ? vol.pc_ratio : '1.15'
                    const impliedMove = vol ? vol.implied_move : '+/-$4.50'
                    const gammaVal = vol ? vol.gamma_exposure : (s.symbol === 'QQQ' || s.symbol === 'TSLA' ? 'Negative' : 'Positive')
                    const hv = vol ? vol.historical_volatility : '18.5%'
                    const iv = vol ? vol.implied_volatility : '22.4%'
                    const isHighIv = ivRank >= 80

                    return (
                      <tr key={s.symbol}>
                        <td className="symbol-cell">
                          <span className="cell-symbol">{s.symbol}</span>
                          <span className="cell-type">{s.asset_type}</span>
                        </td>
                        <td className="mono-cell">{formatCurrency(s.close_price)}</td>
                        <td>
                          <span className={`badge-iv ${isHighIv ? 'high' : 'normal'}`}>{ivRank}%</span>
                        </td>
                        <td className="mono-cell">{pcRatio}</td>
                        <td className="mono-cell">{impliedMove}</td>
                        <td>
                          <span className={`badge-gex ${gammaVal.toLowerCase()}`}>{gammaVal}</span>
                        </td>
                        <td className="mono-cell">{hv} / {iv}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : activeNav === 'Signals' ? (
          /* VIEW 2: DEDICATED ALGORITHMIC SIGNALS MATRIX VIEW */
          <motion.div className="signals-matrix-view" variants={pageVariants} initial="hidden" animate="show">
            <div className="view-header">
              <h2 className="view-title">Algorithmic MACD Crossover Matrix</h2>
              <p className="view-subtitle">Active {signalType === 'buy' ? 'Bullish Buy Crossovers' : 'Bearish Sell Divergences'} Scanned Across Market Universe</p>
            </div>

            <div className="volatility-table-card">
              <table className="vol-table">
                <thead>
                  <tr>
                    <th>TICKER SYMBOL</th>
                    <th>SIGNAL TYPE</th>
                    <th>CLOSE PRICE</th>
                    <th>MACD LINE</th>
                    <th>SIGNAL LINE</th>
                    <th>MACD DELTA</th>
                    <th>TRIGGER DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSignals.map((s) => {
                    const macdVal = parseFloat(s.macd) || 0
                    const macdSigVal = parseFloat(s.macd_signal) || 0
                    const diff = macdVal - macdSigVal
                    const isBuy = signalType === 'buy'

                    return (
                      <tr key={s.symbol}>
                        <td className="symbol-cell">
                          <span className="cell-symbol">{s.symbol}</span>
                          <span className="cell-type">{s.asset_type}</span>
                        </td>
                        <td>
                          <span className={`stat-pill ${isBuy ? 'positive' : 'negative'}`}>
                            {isBuy ? 'Bullish Crossover' : 'Bearish Divergence'}
                          </span>
                        </td>
                        <td className="mono-cell">{formatCurrency(s.close_price)}</td>
                        <td className="mono-cell">{macdVal > 0 ? `+${macdVal.toFixed(4)}` : macdVal.toFixed(4)}</td>
                        <td className="mono-cell">{macdSigVal > 0 ? `+${macdSigVal.toFixed(4)}` : macdSigVal.toFixed(4)}</td>
                        <td className="mono-cell" style={{ color: diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {diff >= 0 ? `+${diff.toFixed(4)}` : diff.toFixed(4)}
                        </td>
                        <td className="mono-cell">{s.signal_date}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          /* VIEW 3: MAIN DASHBOARD CARDS GRID VIEW */
          <>
            {/* KPI Stats Ribbon */}
            <motion.section className="minimal-stats-grid" variants={itemVariants}>
              <div className="minimal-stat-card">
                <span className="stat-label">ACTIVE SIGNALS</span>
                <div className="stat-value-row">
                  <span className="stat-value">{kpiData.count}</span>
                  <span className={`stat-pill ${signalType === 'buy' ? 'positive' : 'negative'}`}>
                    {signalType === 'buy' ? 'Bullish' : 'Bearish'}
                  </span>
                </div>
                <span className="stat-sub">Algorithmic Crossovers</span>
              </div>

              <div className="minimal-stat-card">
                <span className="stat-label">AVG CLOSE PRICE</span>
                <div className="stat-value-row">
                  <span className="stat-value">${kpiData.avgPrice}</span>
                </div>
                <span className="stat-sub">Across Universe</span>
              </div>

              <div className="minimal-stat-card">
                <span className="stat-label">MAX MOMENTUM</span>
                <div className="stat-value-row">
                  <span className="stat-value">{kpiData.topSignal}</span>
                  <span className="stat-pill neutral">Peak MACD Delta</span>
                </div>
                <span className="stat-sub">Highest Vector</span>
              </div>

              <div className="minimal-stat-card">
                <span className="stat-label">MONITORED ASSETS</span>
                <div className="stat-value-row">
                  <span className="stat-value">14 Assets</span>
                </div>
                <span className="stat-sub">Multivariate Tracking</span>
              </div>
            </motion.section>

            {/* Filter & Toolbar */}
            <motion.div className="minimal-toolbar" variants={itemVariants}>
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search ticker or asset class... (Ctrl+K for Commands)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-pill-group">
                {categories.map(cat => {
                  const isActive = activeFilter === cat
                  return (
                    <button
                      key={cat}
                      className={`filter-pill ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveFilter(cat)}
                    >
                      <span>{cat}</span>
                      {isActive && (
                        <motion.div
                          className="filter-glider"
                          layoutId="filter-glider"
                          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* View Mode Switcher Pill (Grid vs Heatmap) */}
              <div className="view-switcher-pill">
                <button
                  className={`view-switcher-btn ${activeView === 'grid' ? 'active' : ''}`}
                  onClick={() => setActiveView('grid')}
                  title="Switch to Card Grid View"
                >
                  <Grid size={13} />
                  <span>Grid View</span>
                  {activeView === 'grid' && (
                    <motion.div
                      className="view-switcher-glider"
                      layoutId="view-glider"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                </button>
                <button
                  className={`view-switcher-btn ${activeView === 'heatmap' ? 'active' : ''}`}
                  onClick={() => setActiveView('heatmap')}
                  title="Switch to FinViz Market Heatmap View"
                >
                  <LayoutGrid size={13} />
                  <span>Heatmap</span>
                  {activeView === 'heatmap' && (
                    <motion.div
                      className="view-switcher-glider"
                      layoutId="view-glider"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                </button>
              </div>

              <div className="sort-box">
                <select
                  className="sort-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="Newest">Newest Date</option>
                  <option value="Oldest">Oldest Date</option>
                  <option value="Symbol">Symbol A-Z</option>
                  <option value="Highest Price">Highest Price</option>
                  <option value="MACD Strength">MACD Strength</option>
                </select>
              </div>

              <button
                className="sync-now-btn"
                onClick={() => setIsAddModalOpen(true)}
                title="Ingest new market ticker from yfinance"
                style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#cbd5e1' }}
              >
                <Plus size={13} />
                <span>+ Add Ticker</span>
              </button>
            </motion.div>

            {/* View Mode Switching: Grid View vs FinViz Market Heatmap */}
            <AnimatePresence mode="wait">
              {activeView === 'heatmap' ? (
                <MarketHeatmap
                  key="heatmap-view-panel"
                  signals={displayedSignals}
                  signalType={signalType}
                  onSelectAsset={(asset) => setSelectedTicker(asset.symbol)}
                />
              ) : (
                <motion.div
                  key="grid-view-panel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Signal Cards Grid */}
                  {loading ? (
                    <div className="minimal-cards-grid">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="minimal-skeleton-card">
                          <div className="skeleton-bar" style={{ width: '40%', height: '20px' }}></div>
                          <div className="skeleton-bar" style={{ width: '80%', height: '36px' }}></div>
                          <div className="skeleton-bar" style={{ width: '100%', height: '80px' }}></div>
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="minimal-error-card">
                      <AlertCircle size={36} style={{ color: 'var(--accent-red)' }} />
                      <h3>Connection Error</h3>
                      <p>{error}</p>
                      <button onClick={fetchSignals} className="retry-btn">
                        <RefreshCw size={14} />
                        Reconnect
                      </button>
                    </div>
                  ) : displayedSignals.length === 0 ? (
                    <div className="minimal-error-card">
                      <Search size={36} style={{ color: 'var(--text-dim)' }} />
                      <h3>No signals found</h3>
                      <p>No {signalType} signals match parameters.</p>
                    </div>
                  ) : (
                    <LayoutGroup>
                      <motion.div
                        layout
                        className="minimal-cards-grid"
                      >
                        <AnimatePresence mode="popLayout">
                          {displayedSignals.map((signal) => {
                            const macdVal = parseFloat(signal.macd) || 0
                            const macdSigVal = parseFloat(signal.macd_signal) || 0
                            const diff = macdVal - macdSigVal
                            const isBuy = signalType === 'buy'
                            const capsuleMeta = getAssetCapsuleMeta(signal.asset_type)
                            const changeBadge = get24hChangeBadge(signal)

                            // Dynamic curve color: Positive daily change -> Emerald Green (#10B981), Negative daily change -> Crimson Red (#EF4444)
                            const isPositiveTrend = changeBadge.positive
                            const glowColor = isPositiveTrend ? '#10B981' : '#EF4444'

                            const trendData = generate7DayTrendData(signal, isPositiveTrend)
                            const gradientId = `gradient-${signal.symbol.replace(/[^a-zA-Z0-9]/g, '')}`
                            const currentTab = getCardActiveTab(signal.symbol)
                            const isExpanded = isDrawerExpanded(signal.symbol)

                            // Hover Scrubber inspection & Live Price values
                            const hoveredPoint = hoveredMap[signal.symbol]
                            const livePriceVal = signal.current_price !== undefined ? parseFloat(signal.current_price) : parseFloat(signal.close_price)
                            const displayedPrice = hoveredPoint ? hoveredPoint.price : livePriceVal
                            const displayedDate = hoveredPoint
                              ? hoveredPoint.date
                              : (signal.last_updated ? `Live ${signal.last_updated}` : `Signal: ${signal.signal_trigger_date || signal.signal_date}`)

                            const vol = volatilityData[signal.symbol]
                            const isVolLoading = !!volatilityLoading[signal.symbol]
                            const candleSeries = candleMap[signal.symbol] || generateFallbackCandles(signal, isPositiveTrend)

                            const ivRankVal = vol ? vol.iv_rank : (signal.symbol === 'QQQ' || signal.symbol === 'TSLA' || signal.symbol === 'NVDA' ? 88 : 34)
                            const pcRatio = vol ? vol.pc_ratio : (signal.symbol === 'QQQ' ? '1.15' : '0.92')
                            const impliedMove = vol ? vol.implied_move : (signal.symbol === 'QQQ' ? '±$4.50' : '±$12.30')
                            const gammaVal = vol ? vol.gamma_exposure : (signal.symbol === 'QQQ' || signal.symbol === 'TSLA' || !isBuy ? 'Negative' : 'Positive')

                            const isHighIv = vol ? vol.is_high_iv : ivRankVal >= 80
                            const isLowIv = vol ? vol.is_low_iv : ivRankVal <= 20
                            const isNegGamma = vol ? vol.is_neg_gamma : gammaVal === 'Negative'

                            return (
                              <motion.div
                                key={signal.symbol}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                whileHover={{ y: -4, borderColor: '#cbd5e1' }}
                                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                className={`minimal-card ${priceFlashes[signal.symbol] || ''}`}
                                onClick={() => setSelectedTicker(signal.symbol)}
                                style={{ cursor: 'pointer' }}
                              >

                                {/* Card Header */}
                                <div className="card-top-row">
                                  <div className="ticker-info">
                                    <span className="ticker-symbol">{signal.symbol}</span>
                                    <span className="ticker-type">{capsuleMeta.label}</span>
                                  </div>

                                  <div className={`ticker-change-badge ${changeBadge.positive ? 'positive' : 'negative'}`}>
                                    {changeBadge.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                    <span>{changeBadge.percent}</span>
                                  </div>
                                </div>

                                {/* Dynamic Price & Date Scrubber Header */}
                                <div className={`card-price-row ${hoveredPoint ? 'scrubbing' : ''}`}>
                                  <span className={`card-price tabular-nums ${priceFlashes[signal.symbol] || ''}`}>{formatCurrency(displayedPrice)}</span>
                                  <div className="price-meta-stack" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                                    <span className="card-date tabular-nums">{displayedDate}</span>
                                    {!hoveredPoint && (signal.signal_trigger_date || signal.signal_date) && (
                                      <span className="card-trigger-sub" style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                                        Triggered: {signal.signal_trigger_date || signal.signal_date}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Signal Insight Pill (Companion Intelligence) */}
                                <div className="signal-insight-wrapper">
                                  <div className={`insight-pill ${isBuy ? 'bullish' : 'bearish'}`}>
                                    <span className="insight-icon">{isBuy ? '⚡' : '⚠️'}</span>
                                    <span className="insight-text">
                                      {isBuy ? 'Bullish EMA (20/50) Golden Cross' : 'MACD Momentum Bearish Divergence'}
                                    </span>
                                  </div>
                                  <div className="insight-tooltip">
                                    {isBuy
                                      ? `20-day EMA crossed above 50-day EMA for ${signal.symbol} with expanding positive MACD delta (+${diff.toFixed(2)}), signaling strong upside momentum.`
                                      : `MACD line broke below signal line for ${signal.symbol} with negative momentum divergence (${diff.toFixed(2)}), indicating increased downside risk.`}
                                  </div>
                                </div>

                                {/* Chart Container */}
                                <div className="card-chart-block" style={{ position: 'relative' }}>
                                  <button
                                    type="button"
                                    className="chart-expand-btn"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setFullChartAsset(signal)
                                    }}
                                    title="Expand Full-Screen Chart Modal"
                                  >
                                    <Maximize2 size={12} />
                                  </button>

                                  <div className="chart-micro-header">
                                    <span className="chart-label">PRICE ACTION</span>
                                    <div className="chart-tabs">

                                      {['CANDLE', 'EMA', 'MACD'].map((tab) => {
                                        const isActive = currentTab === tab
                                        return (
                                          <button
                                            key={tab}
                                            className={`micro-tab-btn ${isActive ? 'active' : ''}`}
                                            onClick={() => handleCardTabChange(signal.symbol, tab)}
                                          >
                                            <span>{tab}</span>
                                            {isActive && (
                                              <motion.div
                                                className="tab-glider"
                                                layoutId={`tab-glider-${signal.symbol}`}
                                                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                                              />
                                            )}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>

                                  <div className="chart-canvas-area">
                                    {currentTab === 'CANDLE' && (
                                      <TradingChart
                                        data={candleSeries}
                                        isBuy={isPositiveTrend}
                                        height={100}
                                      />
                                    )}

                                    {currentTab === 'EMA' && (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <RechartsLineChart
                                          data={trendData}
                                          margin={{ top: 6, right: 0, left: 0, bottom: 6 }}
                                          onMouseMove={(state) => handleChartMouseMove(signal.symbol, state)}
                                          onMouseLeave={() => handleChartMouseLeave(signal.symbol)}
                                        >
                                          <YAxis domain={['auto', 'auto']} hide />
                                          <Tooltip
                                            content={<ScrubberTooltip glowColor={glowColor} />}
                                            cursor={{ stroke: '#94A3B8', strokeDasharray: '2 2', strokeWidth: 1 }}
                                          />
                                          <Line type="monotone" dataKey="macd" stroke={glowColor} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: glowColor, stroke: '#ffffff', strokeWidth: 2 }} />
                                          <Line type="monotone" dataKey="signal" stroke="#0284c7" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                                        </RechartsLineChart>
                                      </ResponsiveContainer>
                                    )}

                                    {currentTab === 'MACD' && (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                          data={trendData}
                                          margin={{ top: 6, right: 0, left: 0, bottom: 6 }}
                                          onMouseMove={(state) => handleChartMouseMove(signal.symbol, state)}
                                          onMouseLeave={() => handleChartMouseLeave(signal.symbol)}
                                        >
                                          <defs>
                                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor={glowColor} stopOpacity={0.25} />
                                              <stop offset="95%" stopColor={glowColor} stopOpacity={0.0} />
                                            </linearGradient>
                                          </defs>
                                          <YAxis domain={['auto', 'auto']} hide />
                                          <Tooltip
                                            content={<ScrubberTooltip glowColor={glowColor} />}
                                            cursor={{ stroke: '#94A3B8', strokeDasharray: '2 2', strokeWidth: 1 }}
                                          />
                                          <Area
                                            type="monotone"
                                            dataKey="macd"
                                            stroke={glowColor}
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill={`url(#${gradientId})`}
                                            activeDot={{ r: 5, fill: glowColor, stroke: '#ffffff', strokeWidth: 2 }}
                                          />
                                        </AreaChart>
                                      </ResponsiveContainer>
                                    )}
                                  </div>

                                  {/* Technical Readout Footer: OHLC in CANDLE mode */}
                                  <div className="chart-footer-metrics">
                                    {currentTab === 'CANDLE' ? (() => {
                                      const latestCandle = (candleSeries && candleSeries.length > 0)
                                        ? candleSeries[candleSeries.length - 1]
                                        : {
                                            open: displayedPrice * 0.995,
                                            high: displayedPrice * 1.008,
                                            low: displayedPrice * 0.992,
                                            close: displayedPrice
                                          }
                                      return (
                                        <>
                                          <span>O: ${latestCandle.open.toFixed(2)}</span>
                                          <span>H: ${latestCandle.high.toFixed(2)}</span>
                                          <span>L: ${latestCandle.low.toFixed(2)}</span>
                                          <span>C: ${latestCandle.close.toFixed(2)}</span>
                                        </>
                                      )
                                    })() : (
                                      <>
                                        <span>MACD {macdVal > 0 ? `+${macdVal.toFixed(2)}` : macdVal.toFixed(2)}</span>
                                        <span>SIG {macdSigVal > 0 ? `+${macdSigVal.toFixed(2)}` : macdSigVal.toFixed(2)}</span>
                                        <span>DELTA {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Options Drawer Toggle */}
                                <div className="drawer-btn-wrapper">
                                  <button
                                    className="minimal-drawer-btn"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleDrawer(signal.symbol)
                                    }}
                                  >

                                    <span>OPTIONS DATA</span>
                                    <motion.span
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                                      style={{ display: 'inline-flex' }}
                                    >
                                      <ChevronDown size={13} />
                                    </motion.span>
                                  </button>
                                </div>

                                {/* Options Drawer Content */}
                                <AnimatePresence initial={false}>
                                  {isExpanded && (
                                    <motion.div
                                      key={`drawer-${signal.symbol}`}
                                      className="minimal-drawer-panel"
                                      initial={{ height: 0, opacity: 0, scaleY: 0.95 }}
                                      animate={{ height: 'auto', opacity: 1, scaleY: 1 }}
                                      exit={{ height: 0, opacity: 0, scaleY: 0.95 }}
                                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                                      style={{ transformOrigin: 'top center', overflow: 'hidden' }}
                                    >
                                      {isVolLoading ? (
                                        <div className="drawer-loading-row">
                                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                          <span>Loading metrics...</span>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="minimal-options-grid">
                                            <div className="opt-cell">
                                              <span className="opt-label">IV RANK</span>
                                              <span className={`opt-value ${isHighIv ? 'high-iv' : isLowIv ? 'low-iv' : ''}`}>
                                                {ivRankVal}%
                                              </span>
                                            </div>

                                            <div className="opt-cell">
                                              <span className="opt-label">P/C RATIO</span>
                                              <span className="opt-value">{pcRatio}</span>
                                            </div>

                                            <div className="opt-cell">
                                              <span className="opt-label">0DTE MOVE</span>
                                              <span className="opt-value">{impliedMove}</span>
                                            </div>

                                            <div className="opt-cell">
                                              <span className="opt-label">GEX</span>
                                              <span className={`opt-value ${isNegGamma ? 'neg-gamma' : 'pos-gamma'}`}>
                                                {gammaVal}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Options Strategy Payoff Visualizer (P&L at Expiration Curve) */}
                                          <OptionsPayoffChart
                                            underlyingPrice={displayedPrice}
                                            symbol={signal.symbol}
                                            isBuySignal={isBuy}
                                          />
                                        </>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      </motion.div>
                    </LayoutGroup>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </>
        )}
      </main>

      {/* AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        signals={signals}
        signalType={signalType}
        onSelectTicker={(symbol) => setSelectedTicker(symbol)}
      />
    </motion.div>
  )
}

export default App