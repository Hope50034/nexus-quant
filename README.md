# ⚡ AURA QUANT // Terminal

> Next-Generation Quantitative Options & Momentum Intelligence Terminal with Live AI Brain, 0DTE Fast Scalp Desk, and Multi-Asset Confluence Engine.

---

## 🚀 Key Features

- **⚡ 0DTE & 1DTE Quick Scalp Desk**: Real-time contract scanner filtered by strict budgets ($10, $15, $25, $30) with automated +25% profit targets, +60% runners, and -22% capital preservation stop-losses.
- **🧠 AI Confluence Brain**: Dual-engine quantitative fusion calculating real-time Volume-Weighted Average Price (VWAP), 9/21 Fast EMA crossover, 14-period RSI, and breaking news catalysts.
- **🔥 Institutional Volume & Vol/OI Spikes**: Identifies unusual order flow surges (3x to 16x Open Interest) to calculate high-probability +60% momentum odds.
- **📊 6-Month Options Backtest Engine**: Day-by-day simulated audit on QQQ day trades proving compound returns and win-rates over historical regimes.
- **🛡️ Risk & Portfolio Management**: Monte Carlo simulation, Markowitz Efficient Frontier, and Paper Trading simulator stored in browser `localStorage`.
- **🏠 Zero-Config Home PC & Cloud Support**: Seamless automatic SQLite fallback out of the box—no SQL Server setup required.

---

## 🛠️ Quickstart (Home PC or Dev Machine)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start Django backend server
python manage.py runserver 127.0.0.1:8000
```

### 3. Frontend Setup
```bash
# Navigate to frontend folder and install dependencies
cd frontend
npm install

# Start Vite live development server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📈 Scalp Rules & Strategy
1. **Target 1 (+25%)**: Take profit to secure gains and grow small accounts.
2. **Target 2 (+60%)**: Trailing runner if institutional volume and MACD momentum rip.
3. **Hard Stop (-22%)**: Cut immediately to protect capital—never hold a losing 0DTE to zero.
4. **15-Minute Rule**: If no directional breakout in 15 minutes, exit flat to avoid afternoon theta decay.
