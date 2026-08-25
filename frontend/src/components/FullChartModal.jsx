import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createChart, ColorType, CandlestickSeries, AreaSeries, LineSeries, HistogramSeries } from 'lightweight-charts'
import {
  X,
  Maximize2,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  Check
} from 'lucide-react'

// Calculate Exponential Moving Average (EMA)
function calculateEMA(candles, period) {
  if (!Array.isArray(candles) || candles.length === 0) return []
  const k = 2 / (period + 1)
  let ema = candles[0].close
  return candles.map((d, i) => {
    if (i === 0) return { time: d.time, value: parseFloat(ema.toFixed(2)) }
    ema = d.close * k + ema * (1 - k)
    return { time: d.time, value: parseFloat(ema.toFixed(2)) }
  })
}

// Deduplicate candle timestamps
function deduplicateCandles(arr) {
  if (!Array.isArray(arr)) return []
  const seen = new Set()
  return arr.filter(item => {
    if (!item || !item.time) return false
    if (seen.has(item.time)) return false
    seen.add(item.time)
    return true
  })
}

export default function FullChartModal({
  isOpen = false,
  onClose,
  asset,
  candleData = [],
  API_BASE_URL
}) {
  const chartContainerRef = useRef(null)
  const chartInstanceRef = useRef(null)

  // Top Header Controls State
  const [timeframe, setTimeframe] = useState('1M')
  const [chartType, setChartType] = useState('CANDLE') // 'CANDLE' | 'AREA' | 'LINE'
  const [showEma20, setShowEma20] = useState(true)
  const [showEma50, setShowEma50] = useState(true)
  const [showVolume, setShowVolume] = useState(true)

  // Fetched Candles State if not passed directly
  const [fetchedCandles, setFetchedCandles] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Dynamic Crosshair HUD State
  const [hudData, setHudData] = useState(null)

  const symbol = (asset?.symbol || 'QQQ').toUpperCase()
  const assetType = asset?.asset_type || 'Stock'

  // Fetch candle data if candleData prop is empty
  useEffect(() => {
    if (!isOpen || (candleData && candleData.length > 0)) {
      setFetchedCandles(candleData || [])
      return
    }

    const fetchCandles = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL || 'http://127.0.0.1:8000'}/api/candles/${symbol}/`)
        if (response.ok) {
          const data = await response.json()
          setFetchedCandles(data)
        }
      } catch (err) {
        console.error('Error fetching full chart candles:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandles()
  }, [isOpen, symbol, candleData, API_BASE_URL])

  // Process and filter candles based on timeframe
  const activeCandles = useMemo(() => {
    const raw = fetchedCandles.length > 0 ? fetchedCandles : (candleData || [])
    if (!Array.isArray(raw) || raw.length === 0) {
      // Fallback synthetic candles if API is empty
      const base = parseFloat(asset?.close_price || asset?.current_price || 150)
      const today = new Date()
      const synthetic = []
      for (let i = 60; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        if (d.getDay() === 0 || d.getDay() === 6) continue
        const open = base + (Math.sin(i * 0.2) * 4)
        const high = open + Math.abs(Math.cos(i * 0.3) * 3) + 0.5
        const low = open - Math.abs(Math.sin(i * 0.3) * 3) - 0.5
        const close = low + (high - low) * 0.6
        synthetic.push({
          time: d.toISOString().split('T')[0],
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: Math.floor(1000000 + Math.random() * 5000000)
        })
      }
      return synthetic
    }

    const deduped = deduplicateCandles(raw)

    if (timeframe === '1D') return deduped.slice(-5)
    if (timeframe === '1W') return deduped.slice(-7)
    if (timeframe === '1M') return deduped.slice(-30)
    if (timeframe === '1Y') return deduped.slice(-252)
    return deduped // 'ALL' (Full 1-year historical dataset)
  }, [fetchedCandles, candleData, timeframe, asset])


  // ESC Key Listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Mount Lightweight Charts Canvas
  useEffect(() => {
    if (!isOpen || !chartContainerRef.current || activeCandles.length === 0) return

    chartContainerRef.current.innerHTML = ''

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 520,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(226, 232, 240, 0.6)' },
        horzLines: { color: 'rgba(226, 232, 240, 0.6)' },
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
        vertLine: { color: '#0f172a', width: 1, style: 2 },
        horzLine: { color: '#0f172a', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartInstanceRef.current = chart

    // Main Series (Candlestick / Area / Line)
    let mainSeries
    if (chartType === 'CANDLE') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      })
      mainSeries.setData(activeCandles)
    } else if (chartType === 'AREA') {
      mainSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(16, 185, 129, 0.4)',
        bottomColor: 'rgba(16, 185, 129, 0.02)',
        lineColor: '#10b981',
        lineWidth: 2,
      })
      const areaData = activeCandles.map(c => ({ time: c.time, value: c.close }))
      mainSeries.setData(areaData)
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#0284c7',
        lineWidth: 2,
      })
      const lineData = activeCandles.map(c => ({ time: c.time, value: c.close }))
      mainSeries.setData(lineData)
    }

    // Indicator Overlay: 20 EMA
    if (showEma20) {
      const ema20Series = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 1.5,
        title: 'EMA 20',
      })
      ema20Series.setData(calculateEMA(activeCandles, 20))
    }

    // Indicator Overlay: 50 EMA
    if (showEma50) {
      const ema50Series = chart.addSeries(LineSeries, {
        color: '#f97316',
        lineWidth: 1.5,
        title: 'EMA 50',
      })
      ema50Series.setData(calculateEMA(activeCandles, 50))
    }

    // Indicator Overlay: Volume Histogram
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#cbd5e1',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        scaleMargins: { top: 0.75, bottom: 0 },
      })

      const volumeData = activeCandles.map(c => ({
        time: c.time,
        value: c.volume || 1000000,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'
      }))
      volumeSeries.setData(volumeData)
    }

    // Subscribe to Crosshair Movement for HUD Update
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHudData(null)
        return
      }

      const candle = activeCandles.find(c => c.time === param.time)
      if (candle) {
        const change = candle.close - candle.open
        const pct = candle.open > 0 ? (change / candle.open) * 100 : 0
        setHudData({
          date: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          change: change,
          pct: pct,
          volume: candle.volume
        })
      }
    })

    chart.timeScale().fitContent()

    // Handle Window Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove()
        chartInstanceRef.current = null
      }
    }
  }, [isOpen, activeCandles, chartType, showEma20, showEma50, showVolume])

  if (!isOpen) return null

  // Resolve Latest Quote Details for Top Header Banner
  const latestQuote = activeCandles[activeCandles.length - 1] || {}
  const currentPrice = asset?.current_price || asset?.close_price || latestQuote.close || 150
  const prevClose = asset?.previous_close || latestQuote.open || currentPrice
  const changePct = asset?.percent_change !== undefined
    ? asset.percent_change
    : ((currentPrice - prevClose) / prevClose * 100)
  const isBullish = changePct >= 0

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fullchart-modal-root">
          {/* Translucent Backdrop */}
          <motion.div
            className="fullchart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Full Screen Chart Card */}
          <div className="fullchart-wrapper">
            <motion.div
              className="fullchart-card"
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {/* Header Controls Bar */}
              <div className="fullchart-header">
                {/* Left: Asset Ticker Info */}
                <div className="fullchart-ticker-group">
                  <div className="ticker-badge">{assetType.toUpperCase()}</div>
                  <h2 className="ticker-symbol">{symbol}</h2>
                  <span className="ticker-price font-mono">${parseFloat(currentPrice).toFixed(2)}</span>
                  <span className={`ticker-change font-mono ${isBullish ? 'bullish' : 'bearish'}`}>
                    {isBullish ? '+' : ''}{parseFloat(changePct).toFixed(2)}%
                  </span>
                </div>

                {/* Center: Controls (Timeframe | Chart Type | Indicators) */}
                <div className="fullchart-controls-group">
                  {/* Timeframe Selector */}
                  <div className="ctrl-pill-group">
                    {['1D', '1W', '1M', '1Y', 'ALL'].map(tf => (
                      <button
                        key={tf}
                        className={`ctrl-pill ${timeframe === tf ? 'active' : ''}`}
                        onClick={() => setTimeframe(tf)}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  {/* Chart Type Toggle */}
                  <div className="ctrl-pill-group">
                    <button
                      className={`ctrl-pill ${chartType === 'CANDLE' ? 'active' : ''}`}
                      onClick={() => setChartType('CANDLE')}
                    >
                      Candles
                    </button>
                    <button
                      className={`ctrl-pill ${chartType === 'AREA' ? 'active' : ''}`}
                      onClick={() => setChartType('AREA')}
                    >
                      Area
                    </button>
                    <button
                      className={`ctrl-pill ${chartType === 'LINE' ? 'active' : ''}`}
                      onClick={() => setChartType('LINE')}
                    >
                      Line
                    </button>
                  </div>

                  {/* Indicator Overlays */}
                  <div className="ctrl-overlay-group">
                    <button
                      className={`overlay-pill ema-20 ${showEma20 ? 'active' : ''}`}
                      onClick={() => setShowEma20(prev => !prev)}
                    >
                      {showEma20 && <Check size={11} />} 20 EMA
                    </button>
                    <button
                      className={`overlay-pill ema-50 ${showEma50 ? 'active' : ''}`}
                      onClick={() => setShowEma50(prev => !prev)}
                    >
                      {showEma50 && <Check size={11} />} 50 EMA
                    </button>
                    <button
                      className={`overlay-pill vol ${showVolume ? 'active' : ''}`}
                      onClick={() => setShowVolume(prev => !prev)}
                    >
                      {showVolume && <Check size={11} />} Volume
                    </button>
                  </div>
                </div>

                {/* Right: Close Button */}
                <button className="fullchart-close-btn" onClick={onClose} title="Close (ESC)">
                  <X size={18} />
                </button>
              </div>

              {/* Dynamic Crosshair OHLC HUD */}
              <div className="fullchart-hud-bar font-mono">
                {hudData ? (
                  <div className="hud-content">
                    <span className="hud-date">{hudData.date}</span>
                    <span className="hud-val">O: <strong>${hudData.open.toFixed(2)}</strong></span>
                    <span className="hud-val">H: <strong>${hudData.high.toFixed(2)}</strong></span>
                    <span className="hud-val">L: <strong>${hudData.low.toFixed(2)}</strong></span>
                    <span className="hud-val">C: <strong>${hudData.close.toFixed(2)}</strong></span>
                    <span className={`hud-val ${hudData.pct >= 0 ? 'bullish' : 'bearish'}`}>
                      Chg: <strong>{hudData.pct >= 0 ? '+' : ''}{hudData.pct.toFixed(2)}%</strong>
                    </span>
                    {hudData.volume && (
                      <span className="hud-val">Vol: <strong>{(hudData.volume / 1000000).toFixed(2)}M</strong></span>
                    )}
                  </div>
                ) : (
                  <span className="hud-placeholder">Hover cursor over chart canvas for dynamic OHLC inspection</span>
                )}
              </div>

              {/* Canvas Container */}
              <div className="fullchart-canvas-container" ref={chartContainerRef} />
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
