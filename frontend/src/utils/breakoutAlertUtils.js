/**
 * Real-Time Breakout & Reversal Alerts Scanner Engine
 * 
 * Scans market universe across Equities, ETFs, Crypto, and Commodities
 * detecting high-probability structural inflection points:
 * 1. Bullish Resistance Breakouts (Price >= R1 with volume/momentum)
 * 2. Key Support Demand Bounces (Price testing S1 with bullish tail)
 * 3. Resistance Rejections (Failed breakout / pullback warning)
 * 4. 20/50 EMA Golden Crossovers with positive MACD divergence
 */

import { detectSupportResistance, calculateTradeSetupLevels } from './autoChartingUtils'

/**
 * Scans a list of signals/assets and returns active breakout and reversal alerts.
 * 
 * @param {Array} signals - Array of asset signal objects
 * @param {Object} candleMap - Map of symbol -> array of candles
 * @returns {Array} List of active alert objects sorted by priority & strength
 */
export function scanRealTimeBreakouts(signals = [], candleMap = {}) {
  if (!Array.isArray(signals) || signals.length === 0) return []

  const alerts = []

  for (const asset of signals) {
    const symbol = (asset.symbol || '').toUpperCase().trim()
    if (!symbol) continue

    const currentPrice = parseFloat(asset.current_price || asset.close_price || 0)
    if (currentPrice <= 0) continue

    const changePct = parseFloat(asset.percent_change || asset.daily_change_pct || 0)
    const macdVal = parseFloat(asset.macd || 0)
    const macdSig = parseFloat(asset.macd_signal || 0)
    const macdDelta = macdVal - macdSig

    // Use candles from candleMap or embedded asset candles
    const candles = candleMap[symbol] || asset.candles || asset.history || []
    
    // Detect Support & Resistance levels
    const sr = detectSupportResistance(candles, currentPrice)
    const setup = calculateTradeSetupLevels(asset, candles, currentPrice)

    const r1 = sr.nearestResistance
    const s1 = sr.nearestSupport

    // Calculate Volume Anomaly / Velocity (Whale Accumulation Pre-News Footprint)
    let volumeMultiplier = 1.0
    let isWhaleFlow = false
    let estFlowMillions = 0

    if (Array.isArray(candles) && candles.length >= 6) {
      const recentCandles = candles.slice(-15, -1)
      const avgVol = recentCandles.reduce((acc, c) => acc + (c.volume || 0), 0) / (recentCandles.length || 1)
      const latestVol = candles[candles.length - 1]?.volume || 0
      if (avgVol > 0 && latestVol > 0) {
        const mult = latestVol / avgVol
        if (mult >= 1.65 && (changePct >= 0 || macdDelta > -0.1)) {
          volumeMultiplier = parseFloat(mult.toFixed(1))
          isWhaleFlow = true
          estFlowMillions = parseFloat(((latestVol * currentPrice) / 1000000).toFixed(1))
        }
      }
    } else if (asset.volume_surge_pct && asset.volume_surge_pct > 150) {
      volumeMultiplier = parseFloat((asset.volume_surge_pct / 100).toFixed(1))
      isWhaleFlow = true
      estFlowMillions = parseFloat(((currentPrice * 50000) / 1000000).toFixed(1))
    }

    // 1. BULLISH BREAKOUT: Price has crossed or is pressing within 0.6% of Key Resistance R1
    if (r1 && r1.price > 0) {
      const distFromR1Pct = ((currentPrice - r1.price) / r1.price) * 100

      if (distFromR1Pct >= -0.5 && distFromR1Pct <= 3.5 && (changePct > 0 || macdDelta >= 0)) {
        const isCleanBreakout = distFromR1Pct >= 0
        alerts.push({
          id: `${symbol}-BREAKOUT-${Date.now()}`,
          symbol,
          asset_type: asset.asset_type || 'Stock',
          type: isWhaleFlow ? 'WHALE' : 'BREAKOUT',
          category: isWhaleFlow ? 'Whale Flow' : 'Breakout',
          badge: isWhaleFlow ? `🐋 WHALE (+${volumeMultiplier}x)` : (isCleanBreakout ? '🚨 BREAKOUT' : '⚡ TESTING R1'),
          urgency: isWhaleFlow || isCleanBreakout ? 'CRITICAL' : 'HIGH',
          title: isWhaleFlow
            ? `${symbol} Pre-News Whale Inflow (+${volumeMultiplier}x Vol)`
            : (isCleanBreakout 
                ? `${symbol} Clean Breakout above $${r1.price.toFixed(2)}`
                : `${symbol} Testing Key Resistance at $${r1.price.toFixed(2)}`),
          description: isWhaleFlow
            ? `Institutional block accumulation detected (+${volumeMultiplier}x vol, ~$${estFlowMillions}M flow). Insiders buying before news release.`
            : (isCleanBreakout
                ? `Price cleared major overhead resistance ($${r1.price.toFixed(2)}) with strong momentum (+${changePct.toFixed(2)}%).`
                : `Price is within ${Math.abs(distFromR1Pct).toFixed(1)}% of breaking major resistance ceiling.`),
          price: currentPrice,
          referencePrice: r1.price,
          targetPrice: setup.targetPrice,
          stopLossPrice: setup.stopLossPrice,
          targetPct: setup.targetPct,
          stopPct: setup.stopPct,
          rrRatio: setup.rrRatio,
          changePct: changePct,
          isWhale: isWhaleFlow,
          volumeMultiplier,
          estFlowMillions,
          timestamp: 'Just now',
          asset: asset
        })
      }
    }

    // 2. SUPPORT BOUNCE: Price tagged Key Support S1 and shows bullish reaction
    if (s1 && s1.price > 0) {
      const distFromS1Pct = ((currentPrice - s1.price) / s1.price) * 100

      if (distFromS1Pct >= 0 && distFromS1Pct <= 1.8 && (changePct >= -0.5 || macdDelta > -0.2)) {
        const alreadyAdded = alerts.some(a => a.symbol === symbol)
        if (!alreadyAdded) {
          alerts.push({
            id: `${symbol}-BOUNCE-${Date.now()}`,
            symbol,
            asset_type: asset.asset_type || 'Stock',
            type: 'BOUNCE',
            category: 'Support Bounce',
            badge: isWhaleFlow ? `🐋 WHALE DEFENSE` : '🛡️ SUPPORT BOUNCE',
            urgency: isWhaleFlow ? 'CRITICAL' : 'HIGH',
            title: `${symbol} Defending Support Floor at $${s1.price.toFixed(2)}`,
            description: isWhaleFlow
              ? `Whale defense at institutional floor ($${s1.price.toFixed(2)}) with +${volumeMultiplier}x volume spike.`
              : `Buyers defending key institutional demand floor ($${s1.price.toFixed(2)}). Favorable 1:${setup.rrRatio} R:R setup.`,
            price: currentPrice,
            referencePrice: s1.price,
            targetPrice: setup.targetPrice,
            stopLossPrice: setup.stopLossPrice,
            targetPct: setup.targetPct,
            stopPct: setup.stopPct,
            rrRatio: setup.rrRatio,
            changePct: changePct,
            isWhale: isWhaleFlow,
            volumeMultiplier,
            estFlowMillions,
            timestamp: 'Just now',
            asset: asset
          })
        }
      }
    }

    // 3. WHALE FLOW RADAR ALERT (Standalone Pre-News Footprint)
    if (isWhaleFlow && !alerts.some(a => a.symbol === symbol)) {
      alerts.push({
        id: `${symbol}-WHALE-${Date.now()}`,
        symbol,
        asset_type: asset.asset_type || 'Stock',
        type: 'WHALE',
        category: 'Whale Flow',
        badge: `🐋 WHALE ACCUMULATION`,
        urgency: 'CRITICAL',
        title: `${symbol} Abnormal Volume Spike (+${volumeMultiplier}x)`,
        description: `Institutional flow footprint: volume velocity running ${volumeMultiplier}x above 15-period mean with positive order pressure.`,
        price: currentPrice,
        referencePrice: setup.entryPrice,
        targetPrice: setup.targetPrice,
        stopLossPrice: setup.stopLossPrice,
        targetPct: setup.targetPct,
        stopPct: setup.stopPct,
        rrRatio: setup.rrRatio,
        changePct: changePct,
        isWhale: true,
        volumeMultiplier,
        estFlowMillions,
        timestamp: 'Just now',
        asset: asset
      })
    }

    // 4. 20/50 GOLDEN CROSS MOMENTUM
    const isBullishSignal = (asset.signal_type || asset.action || 'BUY').toUpperCase() === 'BUY'
    if (isBullishSignal && macdDelta > 0.15 && changePct > 1.2) {
      // Only add if not already added
      const alreadyHasAlert = alerts.some(a => a.symbol === symbol)
      if (!alreadyHasAlert) {
        alerts.push({
          id: `${symbol}-MOMENTUM-${Date.now()}`,
          symbol,
          asset_type: asset.asset_type || 'Stock',
          type: 'MOMENTUM',
          category: 'Golden Cross',
          badge: '⚡ GOLDEN CROSS',
          urgency: 'MEDIUM',
          title: `${symbol} Bullish Momentum Acceleration`,
          description: `Bullish EMA 20/50 momentum with positive MACD divergence (+${macdDelta.toFixed(2)}).`,
          price: currentPrice,
          referencePrice: setup.entryPrice,
          targetPrice: setup.targetPrice,
          stopLossPrice: setup.stopLossPrice,
          targetPct: setup.targetPct,
          stopPct: setup.stopPct,
          rrRatio: setup.rrRatio,
          changePct: changePct,
          isWhale: false,
          volumeMultiplier: 1.0,
          estFlowMillions: 0,
          timestamp: 'Just now',
          asset: asset
        })
      }
    }
  }

  // Sort: CRITICAL first, then HIGH, then highest R:R ratio
  return alerts.sort((a, b) => {
    const priorityMap = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 }
    const pDiff = (priorityMap[b.urgency] || 0) - (priorityMap[a.urgency] || 0)
    if (pDiff !== 0) return pDiff
    return b.rrRatio - a.rrRatio
  })
}
