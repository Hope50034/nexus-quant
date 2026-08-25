import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  XAxis,
  Tooltip,
  ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, ShieldAlert, Target, Percent } from 'lucide-react'

export default function OptionsPayoffChart({ underlyingPrice = 100, symbol = 'QQQ', isBuySignal = true }) {
  const currentPrice = parseFloat(underlyingPrice) || 100

  // 1. Interactive Options Strategy Controls
  const [strategy, setStrategy] = useState(isBuySignal ? 'CALL' : 'PUT')
  const [strikePrice, setStrikePrice] = useState(Math.round(currentPrice))

  // Estimated option premium (~2.8% of spot price)
  const premium = useMemo(() => {
    return parseFloat((currentPrice * 0.028).toFixed(2))
  }, [currentPrice])

  // 2. Quantitative Payoff Spectrum Calculation (±20% around underlying price)
  const { chartData, breakevenPrice, maxRisk, estimatedPop } = useMemo(() => {
    const minPrice = currentPrice * 0.82
    const maxPrice = currentPrice * 1.18
    const step = (maxPrice - minPrice) / 30

    const isCall = strategy === 'CALL'
    const breakeven = isCall ? strikePrice + premium : strikePrice - premium
    const maxLoss = premium * 100 // Per standard 100-share contract

    // Implied Probability of Profit (POP) estimation based on moneyness distance
    const distToBreakeven = isCall
      ? ((currentPrice - breakeven) / currentPrice) * 100
      : ((breakeven - currentPrice) / currentPrice) * 100
    const rawPop = 52 + distToBreakeven * 1.8
    const pop = Math.min(Math.max(Math.round(rawPop), 32), 85)

    const points = []
    for (let i = 0; i <= 30; i++) {
      const price = parseFloat((minPrice + i * step).toFixed(2))
      let pnl = 0

      if (isCall) {
        pnl = Math.max(0, price - strikePrice) - premium
      } else {
        pnl = Math.max(0, strikePrice - price) - premium
      }

      pnl = parseFloat((pnl * 100).toFixed(2)) // 100x multiplier

      points.push({
        price,
        pnl,
        profitZone: pnl >= 0 ? pnl : 0,
        lossZone: pnl < 0 ? pnl : 0,
      })
    }

    return {
      chartData: points,
      breakevenPrice: parseFloat(breakeven.toFixed(2)),
      maxRisk: parseFloat(maxLoss.toFixed(2)),
      estimatedPop: pop,
    }
  }, [currentPrice, strikePrice, premium, strategy])

  return (
    <div className="payoff-chart-card">
      <div className="payoff-header">
        <div className="payoff-title-group">
          <Target size={13} className="payoff-title-icon" />
          <span className="payoff-title">OPTIONS PAYOFF AT EXPIRATION (P&L)</span>
        </div>

        {/* Strategy Selector Toggle */}
        <div className="payoff-strategy-toggle">
          <button
            className={`payoff-strat-btn ${strategy === 'CALL' ? 'active-call' : ''}`}
            onClick={() => setStrategy('CALL')}
          >
            <TrendingUp size={11} />
            <span>Long Call</span>
          </button>
          <button
            className={`payoff-strat-btn ${strategy === 'PUT' ? 'active-put' : ''}`}
            onClick={() => setStrategy('PUT')}
          >
            <TrendingDown size={11} />
            <span>Long Put</span>
          </button>
        </div>
      </div>

      {/* Strike Price Adjustment Range Slider */}
      <div className="payoff-slider-row">
        <div className="slider-label-group">
          <span className="slider-label">STRIKE PRICE:</span>
          <span className="slider-value">${strikePrice.toFixed(2)}</span>
        </div>
        <input
          type="range"
          className="payoff-slider"
          min={Math.round(currentPrice * 0.85)}
          max={Math.round(currentPrice * 1.15)}
          step={0.5}
          value={strikePrice}
          onChange={(e) => setStrikePrice(parseFloat(e.target.value))}
        />
        <span className="premium-tag">Est. Premium: ${premium.toFixed(2)}/sh</span>
      </div>

      {/* Dynamic P&L Curve Chart Area */}
      <div className="payoff-canvas-container" style={{ width: '100%', height: '120px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 6, left: 6, bottom: 4 }}>
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="lossGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="price" hide domain={['auto', 'auto']} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  const isProfit = data.pnl >= 0
                  return (
                    <div className="payoff-tooltip-box">
                      <span className="tt-spot">Price: ${data.price.toFixed(2)}</span>
                      <span className={`tt-pnl ${isProfit ? 'profit' : 'loss'}`}>
                        P&L: {isProfit ? '+' : ''}${data.pnl.toFixed(2)}
                      </span>
                    </div>
                  )
                }
                return null
              }}
            />
            {/* Zero Baseline */}
            <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" strokeWidth={1} />
            {/* Current Spot Price Reference Line */}
            <ReferenceLine x={currentPrice} stroke="#3B82F6" strokeWidth={1.5} label="" />
            {/* Breakeven Point Marker */}
            <ReferenceLine x={breakevenPrice} stroke="#06B6D4" strokeDasharray="2 2" strokeWidth={1.5} />

            <Area
              type="monotone"
              dataKey="pnl"
              stroke={strategy === 'CALL' ? '#10B981' : '#EF4444'}
              strokeWidth={2}
              fill={strategy === 'CALL' ? 'url(#profitGrad)' : 'url(#lossGrad)'}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 3-Column Quantitative Level Readout */}
      <div className="payoff-metrics-bar">
        <div className="payoff-metric-cell">
          <span className="pcell-label">
            <ShieldAlert size={10} /> MAX RISK
          </span>
          <span className="pcell-value risk">-${maxRisk.toFixed(2)}</span>
        </div>

        <div className="payoff-metric-cell">
          <span className="pcell-label">
            <Target size={10} /> BREAKEVEN
          </span>
          <span className="pcell-value breakeven">${breakevenPrice.toFixed(2)}</span>
        </div>

        <div className="payoff-metric-cell">
          <span className="pcell-label">
            <Percent size={10} /> EST. POP
          </span>
          <span className="pcell-value pop">{estimatedPop}%</span>
        </div>
      </div>
    </div>
  )
}
