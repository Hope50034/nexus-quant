// frontend/src/utils/paperTradingStorage.js

const STORAGE_KEY = 'nexus_quant_paper_portfolio';
const DEFAULT_INITIAL_BALANCE = 10000.0;

export const DEFAULT_PORTFOLIO = {
  balance: DEFAULT_INITIAL_BALANCE,
  initialBalance: DEFAULT_INITIAL_BALANCE,
  positions: [],
  history: []
};

/**
 * Retrieves portfolio from localStorage or initializes default.
 */
export function getPortfolio() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      savePortfolio(DEFAULT_PORTFOLIO);
      return { ...DEFAULT_PORTFOLIO };
    }
    const data = JSON.parse(raw);
    return {
      balance: typeof data.balance === 'number' ? data.balance : DEFAULT_INITIAL_BALANCE,
      initialBalance: typeof data.initialBalance === 'number' ? data.initialBalance : DEFAULT_INITIAL_BALANCE,
      positions: Array.isArray(data.positions) ? data.positions : [],
      history: Array.isArray(data.history) ? data.history : []
    };
  } catch (err) {
    console.error('Error loading paper portfolio:', err);
    return { ...DEFAULT_PORTFOLIO };
  }
}

/**
 * Saves portfolio to localStorage and dispatches an event for reactive UI updates.
 */
export function savePortfolio(portfolio) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
    window.dispatchEvent(new CustomEvent('paperPortfolioUpdated', { detail: portfolio }));
  } catch (err) {
    console.error('Error saving paper portfolio:', err);
  }
}

/**
 * Executes a simulated BUY order.
 */
export function openPosition({
  symbol,
  assetType = 'Stock',
  entryPrice,
  amount,
  stopLoss = null,
  takeProfit = null,
  reason = 'Quantitative Signal Follow'
}) {
  const portfolio = getPortfolio();
  const price = Number(entryPrice);
  const totalAmount = Number(amount);

  if (!price || price <= 0) {
    return { success: false, message: 'Invalid entry price' };
  }
  if (!totalAmount || totalAmount <= 0) {
    return { success: false, message: 'Please enter a valid investment amount' };
  }
  if (totalAmount > portfolio.balance) {
    return { 
      success: false, 
      message: `Insufficient cash. Available: $${portfolio.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
    };
  }

  // Calculate quantity (4 decimals for Crypto, 2 for Stocks/ETFs)
  const isCrypto = assetType === 'Crypto' || (symbol && symbol.includes('-USD'));
  const rawQty = totalAmount / price;
  const quantity = isCrypto ? Number(rawQty.toFixed(4)) : Number(rawQty.toFixed(2));
  const actualCost = Number((quantity * price).toFixed(2));

  const newPosition = {
    id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    symbol: symbol.toUpperCase(),
    assetType,
    entryPrice: price,
    quantity,
    totalCost: actualCost,
    stopLoss: stopLoss ? Number(stopLoss) : null,
    takeProfit: takeProfit ? Number(takeProfit) : null,
    entryDate: new Date().toISOString(),
    reason
  };

  portfolio.balance = Number((portfolio.balance - actualCost).toFixed(2));
  portfolio.positions.unshift(newPosition);

  savePortfolio(portfolio);
  return { success: true, position: newPosition, remainingBalance: portfolio.balance };
}

/**
 * Closes an open position at the current market price.
 */
export function closePosition(positionId, exitPrice) {
  const portfolio = getPortfolio();
  const index = portfolio.positions.findIndex(p => p.id === positionId);

  if (index === -1) {
    return { success: false, message: 'Position not found' };
  }

  const pos = portfolio.positions[index];
  const closePrice = Number(exitPrice) || pos.entryPrice;
  const exitValue = Number((pos.quantity * closePrice).toFixed(2));
  const pnlDollar = Number((exitValue - pos.totalCost).toFixed(2));
  const pnlPercent = pos.totalCost > 0 ? Number(((pnlDollar / pos.totalCost) * 100).toFixed(2)) : 0.0;

  const closedTrade = {
    id: pos.id,
    symbol: pos.symbol,
    assetType: pos.assetType,
    entryPrice: pos.entryPrice,
    exitPrice: closePrice,
    quantity: pos.quantity,
    totalCost: pos.totalCost,
    exitValue,
    pnlDollar,
    pnlPercent,
    entryDate: pos.entryDate,
    exitDate: new Date().toISOString(),
    outcome: pnlDollar >= 0 ? 'WIN' : 'LOSS',
    reason: pos.reason
  };

  portfolio.balance = Number((portfolio.balance + exitValue).toFixed(2));
  portfolio.positions.splice(index, 1);
  portfolio.history.unshift(closedTrade);

  savePortfolio(portfolio);
  return { success: true, closedTrade, newBalance: portfolio.balance };
}

/**
 * Resets the paper portfolio back to a clean starting cash balance.
 */
export function resetPortfolio(startingCash = DEFAULT_INITIAL_BALANCE) {
  const fresh = {
    balance: Number(startingCash) || DEFAULT_INITIAL_BALANCE,
    initialBalance: Number(startingCash) || DEFAULT_INITIAL_BALANCE,
    positions: [],
    history: []
  };
  savePortfolio(fresh);
  return fresh;
}

/**
 * Computes live portfolio performance metrics based on current prices.
 */
export function calculatePortfolioStats(portfolio, livePricesMap = {}) {
  const balance = portfolio?.balance || 0;
  const initialBalance = portfolio?.initialBalance || DEFAULT_INITIAL_BALANCE;
  const positions = portfolio?.positions || [];
  const history = portfolio?.history || [];

  let totalOpenCost = 0;
  let totalOpenValue = 0;

  positions.forEach(pos => {
    const livePrice = livePricesMap[pos.symbol] || pos.entryPrice;
    const currentVal = pos.quantity * livePrice;
    totalOpenCost += pos.totalCost;
    totalOpenValue += currentVal;
  });

  const totalEquity = balance + totalOpenValue;
  const unrealizedPnlDollar = totalOpenValue - totalOpenCost;
  const unrealizedPnlPercent = totalOpenCost > 0 ? (unrealizedPnlDollar / totalOpenCost) * 100 : 0.0;

  const totalRealizedPnl = history.reduce((sum, h) => sum + (h.pnlDollar || 0), 0);
  const allTimeRoiDollar = totalEquity - initialBalance;
  const allTimeRoiPercent = initialBalance > 0 ? (allTimeRoiDollar / initialBalance) * 100 : 0.0;

  const totalClosed = history.length;
  const wins = history.filter(h => (h.pnlDollar || 0) > 0).length;
  const losses = history.filter(h => (h.pnlDollar || 0) < 0).length;
  const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0.0;

  const grossWins = history.filter(h => h.pnlDollar > 0).reduce((sum, h) => sum + h.pnlDollar, 0);
  const grossLosses = Math.abs(history.filter(h => h.pnlDollar < 0).reduce((sum, h) => sum + h.pnlDollar, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 99.9 : 0.0;

  return {
    balance: Number(balance.toFixed(2)),
    initialBalance,
    totalEquity: Number(totalEquity.toFixed(2)),
    openPositionsCount: positions.length,
    totalOpenCost: Number(totalOpenCost.toFixed(2)),
    totalOpenValue: Number(totalOpenValue.toFixed(2)),
    unrealizedPnlDollar: Number(unrealizedPnlDollar.toFixed(2)),
    unrealizedPnlPercent: Number(unrealizedPnlPercent.toFixed(2)),
    totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
    allTimeRoiDollar: Number(allTimeRoiDollar.toFixed(2)),
    allTimeRoiPercent: Number(allTimeRoiPercent.toFixed(2)),
    totalClosed,
    wins,
    losses,
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2))
  };
}
