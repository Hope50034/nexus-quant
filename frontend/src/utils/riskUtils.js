/**
 * Risk Rating Utility for Retail & Beginner Investors
 * Rates assets on a 1 to 5 Capital Protection Scale:
 * Level 1: Low Risk (Index ETFs & Safe Havens)
 * Level 2: Moderate Risk (Blue-Chip Tech & Established Leaders)
 * Level 3: Medium-High Risk (High Beta Growth Equity)
 * Level 4: High Risk (Major Digital Assets / Cryptocurrencies)
 * Level 5: Very High Risk (High Volatility Altcoins & Speculative Assets)
 */

export function getRiskRatingMeta(symbol = '', assetType = '', lang = 'en') {
  const sym = (symbol || '').toUpperCase()
  const type = (assetType || '').toLowerCase()

  // Level 1: Low Risk (Index ETFs, Treasuries, Commodities/Gold)
  const isLevel1 = ['SPY', 'VOO', 'QQQ', 'DIA', 'IWM', 'TLT', 'GOLD', 'GC=F', 'SHV'].includes(sym) ||
                   type.includes('index') || type.includes('etf') || type.includes('treasury')

  // Level 2: Moderate Risk (Blue-Chip Tech, Mega-Cap Staples)
  const isLevel2 = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'BRK.B', 'JNJ', 'PG', 'XOM', 'V', 'MA'].includes(sym)

  // Level 4 & 5: Cryptocurrencies & Altcoins
  const isMajorCrypto = ['BTC', 'BTC-USD', 'ETH', 'ETH-USD'].includes(sym)
  const isCrypto = type.includes('crypto') || sym.includes('-USD') || sym.includes('USDT')

  let level = 3
  let titleEn = 'Level 3: Medium Risk'
  let titleTh = 'ระดับ 3: ความเสี่ยงปานกลาง'
  let badgeClass = 'risk-level-3'
  let icon = '📈'
  let color = '#f59e0b' // Amber
  let descEn = 'Growth equity asset. Moderate price swings expected.'
  let descTh = 'หุ้นเติบโตความเสี่ยงปานกลาง อาจมีความผันผวนของราคาในระยะสั้น'

  if (isLevel1) {
    level = 1
    titleEn = 'Level 1: Low Risk'
    titleTh = 'ระดับ 1: ความเสี่ยงต่ำ'
    badgeClass = 'risk-level-1'
    icon = '🛡️'
    color = '#10b981' // Emerald Green
    descEn = 'Diversified benchmark ETF / Safe haven asset. Ideal for long-term capital preservation.'
    descTh = 'สินทรัพย์อ้างอิงดัชนี / มีความมั่นคงสูง เหมาะสำหรับสะสมความมั่งคั่งระยะยาว'
  } else if (isLevel2) {
    level = 2
    titleEn = 'Level 2: Moderate Risk'
    titleTh = 'ระดับ 2: ความเสี่ยงปานกลาง'
    badgeClass = 'risk-level-2'
    icon = '⚖️'
    color = '#0284c7' // Sky Blue
    descEn = 'Established mega-cap leader with strong balance sheet & proven historical resilience.'
    descTh = 'หุ้นผู้นำตลาดขนาดใหญ่ มีงบการเงินแข็งแกร่ง ความเสี่ยงต่ำกว่าหุ้นทั่วไป'
  } else if (isMajorCrypto) {
    level = 4
    titleEn = 'Level 4: High Risk'
    titleTh = 'ระดับ 4: ความเสี่ยงสูง'
    badgeClass = 'risk-level-4'
    icon = '⚡'
    color = '#f97316' // Orange
    descEn = 'Major digital asset (Crypto). High upside potential accompanied by sharp short-term volatility.'
    descTh = 'สินทรัพย์ดิจิทัลหลัก มีโอกาสเติบโตสูง แต่มีความผันผวนของราคาสูง'
  } else if (isCrypto) {
    level = 5
    titleEn = 'Level 5: Very High Risk'
    titleTh = 'ระดับ 5: ความเสี่ยงสูงมาก'
    badgeClass = 'risk-level-5'
    icon = '🔥'
    color = '#ef4444' // Crimson Red
    descEn = 'Speculative altcoin asset. Expect extreme price swings — only invest risk capital.'
    descTh = 'เหรียญคริปโตความเสี่ยงสูงมาก มีความผันผวนรุนแรง เหมาะสำหรับผู้รับความเสี่ยงได้สูง'
  }

  return {
    level,
    label: lang === 'th' ? titleTh : titleEn,
    shortLabel: `Risk ${level}/5`,
    icon,
    color,
    badgeClass,
    description: lang === 'th' ? descTh : descEn
  }
}
