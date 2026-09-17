/**
 * Auto-Charting & Algorithmic Technical Analysis Utilities
 * 
 * Automatically detects:
 * 1. Key Support & Resistance (S/R) levels using pivot clustering across candle history.
 * 2. Breakout & Range status (proximity to key levels).
 * 3. Dynamic Trade Setup levels (Optimal Entry, Take-Profit Target, Stop-Loss line, Risk-to-Reward ratio).
 */

/**
 * Identifies swing highs and swing lows from historical OHLC candle data.
 * @param {Array} candles - Array of { open, high, low, close, time }
 * @param {number} window - Lookback/lookahead pivot window (default 3)
 */
export function findPivots(candles = [], window = 3) {
  if (!Array.isArray(candles) || candles.length < window * 2 + 1) return { highs: [], lows: [] }

  const highs = []
  const lows = []

  for (let i = window; i < candles.length - window; i++) {
    const current = candles[i]
    let isHigh = true
    let isLow = true

    for (let j = 1; j <= window; j++) {
      if (candles[i - j].high >= current.high || candles[i + j].high >= current.high) {
        isHigh = false
      }
      if (candles[i - j].low <= current.low || candles[i + j].low <= current.low) {
        isLow = false
      }
    }

    if (isHigh) {
      highs.push({ price: current.high, time: current.time, index: i })
    }
    if (isLow) {
      lows.push({ price: current.low, time: current.time, index: i })
    }
  }

  return { highs, lows }
}

/**
 * Clusters nearby price levels within a percentage tolerance (e.g. 1.5%)
 * to identify major support floors and resistance ceilings tested multiple times.
 */
function clusterLevels(pivots, tolerance = 0.015) {
  if (!pivots || pivots.length === 0) return []

  const sorted = [...pivots].sort((a, b) => a.price - b.price)
  const clusters = []

  for (const item of sorted) {
    let matchedCluster = null

    for (const cluster of clusters) {
      const avgPrice = cluster.totalPrice / cluster.count
      if (Math.abs(item.price - avgPrice) / avgPrice <= tolerance) {
        matchedCluster = cluster
        break
      }
    }

    if (matchedCluster) {
      matchedCluster.totalPrice += item.price
      matchedCluster.count += 1
      matchedCluster.prices.push(item.price)
    } else {
      clusters.push({
        totalPrice: item.price,
        count: 1,
        prices: [item.price]
      })
    }
  }

  return clusters.map(c => ({
    price: parseFloat((c.totalPrice / c.count).toFixed(2)),
    touches: c.count
  })).sort((a, b) => b.touches - a.touches) // Strongest tested first
}

/**
 * Analyzes candle history and returns the strongest Support and Resistance levels
 * relative to the current market price.
 * 
 * @param {Array} candles - Array of OHLC candles
 * @param {number} currentPrice - Current market price
 * @returns {Object} { resistance: [{ price, touches, level }], support: [{ price, touches, level }], summary: string }
 */
export function detectSupportResistance(candles = [], currentPrice = 0) {
  if (!Array.isArray(candles) || candles.length < 10) {
    return { resistance: [], support: [], pivotCount: 0, status: 'Insufficient Data' }
  }

  const latestPrice = currentPrice > 0 ? currentPrice : candles[candles.length - 1]?.close || 100
  const { highs, lows } = findPivots(candles, 3)

  const resistanceClusters = clusterLevels(highs, 0.018)
    .filter(c => c.price > latestPrice * 1.003) // Above current price
    .sort((a, b) => a.price - b.price) // Ascending from nearest to farthest

  const supportClusters = clusterLevels(lows, 0.018)
    .filter(c => c.price < latestPrice * 0.997) // Below current price
    .sort((a, b) => b.price - a.price) // Descending from nearest down

  // Pick up to 2 strongest/nearest levels each
  const resistance = resistanceClusters.slice(0, 2).map((r, idx) => ({
    ...r,
    level: `R${idx + 1}`,
    distancePct: parseFloat(((r.price - latestPrice) / latestPrice * 100).toFixed(2))
  }))

  const support = supportClusters.slice(0, 2).map((s, idx) => ({
    ...s,
    level: `S${idx + 1}`,
    distancePct: parseFloat(((latestPrice - s.price) / latestPrice * 100).toFixed(2))
  }))

  // Determine market structure status
  let status = 'Range Bound'
  const nearestR = resistance[0]
  const nearestS = support[0]

  if (nearestR && nearestR.distancePct < 1.2) {
    status = 'Testing Major Resistance (Watch for Breakout or Rejection)'
  } else if (nearestS && nearestS.distancePct < 1.2) {
    status = 'Testing Key Support Floor (Potential Demand Rebound)'
  } else if (nearestR && nearestS) {
    status = `Oscillating in Channel ($${nearestS.price} - $${nearestR.price})`
  }

  return {
    resistance,
    support,
    nearestResistance: nearestR || null,
    nearestSupport: nearestS || null,
    status,
    totalPivots: highs.length + lows.length
  }
}

/**
 * Calculates standard Risk-to-Reward execution levels for any asset or trading setup.
 * Uses provided asset targets or derives them mathematically using Support/Resistance and ATR.
 * 
 * @param {Object} asset - Asset or signal data object
 * @param {Array} candles - Historical candle list
 * @param {number} currentPrice - Current market price
 */
export function calculateTradeSetupLevels(asset = {}, candles = [], currentPrice = 0) {
  const price = currentPrice > 0 
    ? currentPrice 
    : parseFloat(asset?.current_price || asset?.close_price || candles[candles.length - 1]?.close || 100)

  const isBuy = (asset?.signal_type || asset?.action || 'BUY').toUpperCase() !== 'SELL'

  // Approximate ATR (Average True Range) over last 14 candles for volatility sizing
  let atr = price * 0.025
  if (Array.isArray(candles) && candles.length >= 5) {
    const recent = candles.slice(-14)
    const ranges = recent.map(c => Math.max(c.high - c.low, Math.abs(c.high - c.close), Math.abs(c.low - c.close)))
    const sum = ranges.reduce((acc, val) => acc + val, 0)
    atr = (sum / ranges.length) || (price * 0.025)
  }

  // Support/Resistance baseline
  const sr = detectSupportResistance(candles, price)

  let targetPrice = 0
  let stopLossPrice = 0

  if (asset?.target_price && parseFloat(asset.target_price) > 0) {
    targetPrice = parseFloat(asset.target_price)
  }
  if (asset?.stop_loss && parseFloat(asset.stop_loss) > 0) {
    stopLossPrice = parseFloat(asset.stop_loss)
  }

  if (isBuy) {
    // If not explicitly provided, calculate 2:1 R:R setup based on Support and ATR
    if (!stopLossPrice) {
      if (sr.nearestSupport && sr.nearestSupport.price < price) {
        // Place stop 0.5% below nearest key support
        stopLossPrice = parseFloat((sr.nearestSupport.price * 0.995).toFixed(2))
      } else {
        stopLossPrice = parseFloat((price - (atr * 1.5)).toFixed(2))
      }
    }
    const risk = Math.max(0.01, price - stopLossPrice)

    if (!targetPrice || targetPrice <= price) {
      if (sr.nearestResistance && sr.nearestResistance.price > price && (sr.nearestResistance.price - price) > risk * 1.5) {
        targetPrice = parseFloat((sr.nearestResistance.price * 0.998).toFixed(2))
      } else {
        // Default 2.2:1 Reward to Risk
        targetPrice = parseFloat((price + (risk * 2.2)).toFixed(2))
      }
    }
  } else {
    // Short / Sell Setup
    if (!stopLossPrice) {
      stopLossPrice = parseFloat((price + (atr * 1.5)).toFixed(2))
    }
    const risk = Math.max(0.01, stopLossPrice - price)
    if (!targetPrice || targetPrice >= price) {
      targetPrice = parseFloat((price - (risk * 2.2)).toFixed(2))
    }
  }

  const potentialGain = Math.abs(targetPrice - price)
  const potentialRisk = Math.max(0.01, Math.abs(price - stopLossPrice))
  const rrRatio = parseFloat((potentialGain / potentialRisk).toFixed(2))
  const targetPct = parseFloat(((targetPrice - price) / price * 100).toFixed(2))
  const stopPct = parseFloat(((stopLossPrice - price) / price * 100).toFixed(2))

  return {
    entryPrice: price,
    targetPrice,
    stopLossPrice,
    potentialGain,
    potentialRisk,
    rrRatio,
    targetPct,
    stopPct,
    supportResistance: sr
  }
}
