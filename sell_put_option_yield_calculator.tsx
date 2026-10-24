import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  Percent, 
  Layers, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight,
  HelpCircle,
  RefreshCw,
  Calculator,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine, 
  ReferenceDot 
} from 'recharts';

// Preset tickers with realistic defaults for fast testing
const PRESET_TICKERS = {
  QQQ: { name: "Invesco QQQ Trust", price: 490.50, defaultStrike: 475.00, defaultPremium: 6.80, defaultDTE: 30 },
  NVDA: { name: "NVIDIA Corp", price: 138.20, defaultStrike: 130.00, defaultPremium: 3.50, defaultDTE: 30 },
  TSLA: { name: "Tesla Inc", price: 220.00, defaultStrike: 205.00, defaultPremium: 7.20, defaultDTE: 30 },
  AAPL: { name: "Apple Inc", price: 232.00, defaultStrike: 225.00, defaultPremium: 2.90, defaultDTE: 30 },
  MSFT: { name: "Microsoft Corp", price: 425.00, defaultStrike: 410.00, defaultPremium: 5.40, defaultDTE: 30 }
};

export default function App() {
  // Input states
  const [ticker, setTicker] = useState('QQQ');
  const [stockPrice, setStockPrice] = useState(490.50);
  const [strikePrice, setStrikePrice] = useState(475.00);
  const [premium, setPremium] = useState(6.80);
  const [contracts, setContracts] = useState(1);
  const [dte, setDte] = useState(30);
  const [customCapital, setCustomCapital] = useState(null); // Null means auto-calculate

  // Fast preset switch
  const handleSelectPreset = (symbol) => {
    const data = PRESET_TICKERS[symbol];
    if (data) {
      setTicker(symbol);
      setStockPrice(data.price);
      setStrikePrice(data.defaultStrike);
      setPremium(data.defaultPremium);
      setDte(data.defaultDTE);
      setCustomCapital(null);
    }
  };

  // Metric Calculations
  const calculatedMetrics = useMemo(() => {
    const sharesCount = contracts * 100;
    const totalCapitalNeeded = customCapital !== null ? customCapital : strikePrice * sharesCount;
    const maxProfitTotal = premium * sharesCount;
    const absoluteYieldPct = totalCapitalNeeded > 0 ? (maxProfitTotal / totalCapitalNeeded) * 100 : 0;
    
    // Annualized return (Compound / Simple)
    const annualizedYieldPct = dte > 0 ? (absoluteYieldPct * (365 / dte)) : 0;
    
    const breakEven = strikePrice - premium;
    const downsideCushionPct = stockPrice > 0 ? ((stockPrice - breakEven) / stockPrice) * 100 : 0;
    const strikeDiscountPct = stockPrice > 0 ? ((stockPrice - strikePrice) / stockPrice) * 100 : 0;

    // Risk Assessment
    let riskLevel = 'LOW';
    let riskLabel = '安全邊界充裕 (OTM 遠虛值)';
    let riskColor = 'text-emerald-400 bg-emerald-950/50 border-emerald-800';

    if (strikePrice >= stockPrice) {
      riskLevel = 'HIGH';
      riskLabel = '實值期權 (ITM) - 被指派/接股風險極高';
      riskColor = 'text-rose-400 bg-rose-950/50 border-rose-800';
    } else if (downsideCushionPct < 3) {
      riskLevel = 'MEDIUM-HIGH';
      riskLabel = '平值附近 (ATM) - 價格波動易引發指派';
      riskColor = 'text-amber-400 bg-amber-950/50 border-amber-800';
    } else if (downsideCushionPct < 6) {
      riskLevel = 'MEDIUM';
      riskLabel = '中等虛值 (Moderate OTM) - 正常市場防護';
      riskColor = 'text-cyan-400 bg-cyan-950/50 border-cyan-800';
    }

    return {
      sharesCount,
      totalCapitalNeeded,
      maxProfitTotal,
      absoluteYieldPct,
      annualizedYieldPct,
      breakEven,
      downsideCushionPct,
      strikeDiscountPct,
      riskLevel,
      riskLabel,
      riskColor
    };
  }, [stockPrice, strikePrice, premium, contracts, dte, customCapital]);

  // Scenario Table Data Generator
  const scenarioMatrix = useMemo(() => {
    const scenarios = [
      { label: '大漲 (+10%)', price: stockPrice * 1.10 },
      { label: '小漲 (+5%)', price: stockPrice * 1.05 },
      { label: '現價不變 (Current)', price: stockPrice },
      { label: '履約價 (Strike)', price: strikePrice },
      { label: '損益平衡點 (Break-even)', price: calculatedMetrics.breakEven },
      { label: '下跌 (-10%)', price: stockPrice * 0.90 },
      { label: '大跌 (-20%)', price: stockPrice * 0.80 },
    ];

    return scenarios.map(sc => {
      let pnlPerShare = 0;
      if (sc.price >= strikePrice) {
        pnlPerShare = premium; // Max profit
      } else {
        pnlPerShare = premium - (strikePrice - sc.price);
      }

      const totalPnL = pnlPerShare * calculatedMetrics.sharesCount;
      const roi = calculatedMetrics.totalCapitalNeeded > 0 ? (totalPnL / calculatedMetrics.totalCapitalNeeded) * 100 : 0;
      const isAssigned = sc.price < strikePrice;

      return {
        ...sc,
        pnlPerShare,
        totalPnL,
        roi,
        isAssigned
      };
    });
  }, [stockPrice, strikePrice, premium, calculatedMetrics]);

  // Payoff Chart Data Generator
  const chartData = useMemo(() => {
    const data = [];
    const minPrice = Math.max(0, calculatedMetrics.breakEven * 0.75);
    const maxPrice = stockPrice * 1.25;
    const step = (maxPrice - minPrice) / 60;

    for (let p = minPrice; p <= maxPrice; p += step) {
      let profit = 0;
      if (p >= strikePrice) {
        profit = calculatedMetrics.maxProfitTotal;
      } else {
        profit = (premium - (strikePrice - p)) * calculatedMetrics.sharesCount;
      }

      data.push({
        stockPrice: parseFloat(p.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        isPositive: profit >= 0
      });
    }

    return data;
  }, [stockPrice, strikePrice, premium, calculatedMetrics]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-900 pb-12">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg text-emerald-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Sell Put 期權收益與風險算盤
                <span className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">Webull / Bloomberg Style</span>
              </h1>
              <p className="text-xs text-slate-400">美股現金擔保看跌期權 (Cash-Secured Put) 量化模擬與損益分析</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2">
            <span className="text-xs text-slate-400 mr-1">快捷選擇預設標的:</span>
            {Object.keys(PRESET_TICKERS).map(symbol => (
              <button
                key={symbol}
                onClick={() => handleSelectPreset(symbol)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                  ticker === symbol 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20' 
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* TOP ROW: Key Metrics Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Annualized Return */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
            <div className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>年化收益率 (APY)</span>
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
              {calculatedMetrics.annualizedYieldPct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              到期收益率: {calculatedMetrics.absoluteYieldPct.toFixed(2)}%
            </div>
          </div>

          {/* Max Profit */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>最大到期權利金</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
              ${calculatedMetrics.maxProfitTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              ${premium.toFixed(2)} / 股 × {calculatedMetrics.sharesCount} 股
            </div>
          </div>

          {/* Break-even Price */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>損益平衡點</span>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-tight">
              ${calculatedMetrics.breakEven.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              相當於打折扣買入底層正股
            </div>
          </div>

          {/* Downside Cushion */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>安全邊界 (緩衝空間)</span>
              <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-tight">
              {calculatedMetrics.downsideCushionPct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              現價距平衡點容忍跌幅
            </div>
          </div>

          {/* Capital Allocation */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>履約所需保證金</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-indigo-300 tracking-tight">
              ${calculatedMetrics.totalCapitalNeeded.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              100% 現金擔保要求
            </div>
          </div>

          {/* Risk Badge Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>被指派/接股風險</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className={`mt-1 text-xs font-bold px-2 py-1 rounded border text-center ${calculatedMetrics.riskColor}`}>
              {calculatedMetrics.riskLevel}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-1" title={calculatedMetrics.riskLabel}>
              {calculatedMetrics.riskLabel}
            </div>
          </div>

        </div>

        {/* MIDDLE SECTION: Interactive Control Panel & Payoff Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Parameter Control Input Panel (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                期權交易參數設定 (Parameters)
              </h2>
              <button 
                onClick={() => handleSelectPreset('QQQ')}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> 重置數據
              </button>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4">

              {/* Ticker Symbol & Current Stock Price Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">正股代號 (Ticker)</label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 uppercase"
                    placeholder="e.g. QQQ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">正股現價 ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stockPrice}
                    onChange={(e) => setStockPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Strike Price Slider & Input */}
              <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-300">行權價 Strike Price ($)</label>
                  <span className="font-mono text-cyan-400 font-bold">${strikePrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min={Math.max(1, stockPrice * 0.7)}
                    max={stockPrice * 1.2}
                    step={0.5}
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(parseFloat(e.target.value) || 0)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs font-mono text-white text-right focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>折價折讓: {calculatedMetrics.strikeDiscountPct.toFixed(2)}%</span>
                  <span>{strikePrice < stockPrice ? '虛值 (OTM)' : '實值 (ITM)'}</span>
                </div>
              </div>

              {/* Premium Per Share Slider & Input */}
              <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-300">單股權利金 Premium ($)</label>
                  <span className="font-mono text-emerald-400 font-bold">${premium.toFixed(2)}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min={0.05}
                    max={Math.max(10, stockPrice * 0.1)}
                    step={0.05}
                    value={premium}
                    onChange={(e) => setPremium(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <input
                    type="number"
                    step="0.05"
                    value={premium}
                    onChange={(e) => setPremium(parseFloat(e.target.value) || 0)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs font-mono text-white text-right focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="text-[10px] text-slate-500">
                  每張合約可即時收入權利金: <span className="text-emerald-400 font-mono">${(premium * 100).toFixed(2)}</span>
                </div>
              </div>

              {/* DTE and Contracts Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <label className="font-semibold text-slate-300">到期天數 DTE</label>
                    <span className="font-mono text-cyan-400">{dte} 天</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="730"
                    value={dte}
                    onChange={(e) => setDte(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <label className="font-semibold text-slate-300">合約張數 (Contracts)</label>
                    <span className="font-mono text-indigo-400">{contracts} 張 ({calculatedMetrics.sharesCount}股)</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={contracts}
                    onChange={(e) => setContracts(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Optional Custom Capital Editable */}
              <div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>履約預留資金 / 佔用保證金 ($)</span>
                  {customCapital !== null && (
                    <button 
                      onClick={() => setCustomCapital(null)}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      恢復默認全額擔保
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={customCapital !== null ? customCapital : calculatedMetrics.totalCapitalNeeded}
                  onChange={(e) => setCustomCapital(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:border-cyan-500 focus:outline-none"
                  placeholder="自動計算 (Strike * 100 * Contracts)"
                />
              </div>

            </div>
          </div>

          {/* Right Column: Interactive PnL Diagram Chart (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  到期損益圖表 (Payoff Diagram at Expiry)
                </h2>
                <p className="text-xs text-slate-400">綠色區域為盈利，紅色區域為接股/虧損</p>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="flex items-center gap-1 text-slate-300 font-mono">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span> 損益平衡: ${calculatedMetrics.breakEven.toFixed(2)}
                </span>
                <span className="flex items-center gap-1 text-slate-300 font-mono">
                  <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full inline-block"></span> 行權價: ${strikePrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="w-full h-72 sm:h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.0}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>

                  <XAxis 
                    dataKey="stockPrice" 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => `$${val}`}
                    domain={['dataMin', 'dataMax']}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`$${value.toFixed(2)}`, '預估損益']}
                    labelFormatter={(label) => `到期股價: $${label}`}
                  />

                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <ReferenceLine x={calculatedMetrics.breakEven} stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'Break-even', fill: '#06b6d4', fontSize: 10, position: 'top' }} />
                  <ReferenceLine x={strikePrice} stroke="#10b981" strokeWidth={1.5} label={{ value: 'Strike', fill: '#10b981', fontSize: 10, position: 'top' }} />
                  <ReferenceLine x={stockPrice} stroke="#a855f7" strokeWidth={1.5} label={{ value: 'Current', fill: '#a855f7', fontSize: 10, position: 'top' }} />

                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    fill="url(#profitGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend Summary Note */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>最高盈利鎖定為 <strong className="text-emerald-400 font-mono">${calculatedMetrics.maxProfitTotal.toFixed(2)}</strong></span>
              <span>跌破 <strong className="text-cyan-300 font-mono">${calculatedMetrics.breakEven.toFixed(2)}</strong> 後開始產生账面虧損</span>
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: Scenario PnL Matrix & Educational Strategy Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Expiry Scenario Matrix Table (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                到期情境與損益矩陣 (Scenario PnL Matrix)
              </h2>
              <span className="text-xs text-slate-400">不同結算價下的投資回報</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">到期情境</th>
                    <th className="pb-2 font-medium">預估結算價</th>
                    <th className="pb-2 font-medium">是否被指派接股</th>
                    <th className="pb-2 font-medium text-right">單張/總損益 ($)</th>
                    <th className="pb-2 font-medium text-right">回報率 (ROI)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {scenarioMatrix.map((item, index) => {
                    const isProfit = item.totalPnL >= 0;
                    return (
                      <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 font-sans font-medium text-slate-300">{item.label}</td>
                        <td className="py-2.5 text-slate-200 font-bold">${item.price.toFixed(2)}</td>
                        <td className="py-2.5">
                          {item.isAssigned ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" /> 需接股 (Assigned)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                              <XCircle className="w-3 h-3" /> 作廢賺權利金
                            </span>
                          )}
                        </td>
                        <td className={`py-2.5 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${item.totalPnL.toFixed(2)}
                        </td>
                        <td className={`py-2.5 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}{item.roi.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Strategy & Educational Notes (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-400" />
                  Sell Put 雙重勝算與策略指南
                </h2>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4" /> 結果 A：股價保持在行權價以上 (OTM)
                  </div>
                  <p className="text-slate-400">
                    期權到期無價值失效，您無須買入任何股票，<strong className="text-slate-200">100% 穩賺權利金收入</strong> (${calculatedMetrics.maxProfitTotal.toFixed(2)})，資金解鎖後可繼續下一輪 Sell Put。
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4" /> 結果 B：股價跌破行權价 (ITM)
                  </div>
                  <p className="text-slate-400">
                    您需要以行權價 <strong className="text-slate-200">${strikePrice.toFixed(2)}</strong> 被指派買入正股。但扣除收取的權利金後，您的實質持股成本降至 <strong className="text-cyan-300 font-mono">${calculatedMetrics.breakEven.toFixed(2)}</strong>，相當於以優惠折扣成功建倉。
                  </p>
                </div>

                <div className="bg-rose-950/30 border border-rose-900/50 p-3 rounded-xl space-y-1 text-rose-200">
                  <div className="font-bold flex items-center gap-1 text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> 風險提示 (Risk Warning)
                  </div>
                  <p className="text-[11px] text-rose-300/80">
                    若底層正股（如 QQQ、TSLA）遭遇黑天鵝暴跌並跌破損益平衡點，您將面臨浮虧。請務必確保账户留足現金擔保，避免使用過度槓桿。
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Credit Footer */}
            <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span>美股期權量化策略模組</span>
              <span className="font-mono">QQQ / NVDA / TSLA Ready</span>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}