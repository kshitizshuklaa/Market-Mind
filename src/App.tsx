import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ComposedChart, ReferenceLine, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, BarChart3, Brain, Calculator, Info, 
  Search, RefreshCw, Globe, Shield, Zap, Layers, ChevronRight, Star,
  ArrowUpRight, ArrowDownRight, Clock, Target, Gauge, LayoutDashboard,
  LineChart as LineChartIcon, PieChart, Settings, HelpCircle, Bell, Menu, X
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateSMA, calculateEMA, calculateVolatility, calculateR2, calculateRMSE, calculateRSI, calculateMACD } from './lib/math';
import { LinearRegression, RandomForestRegressor } from './lib/ml';
import { cn } from './lib/utils';
import { POPULAR_STOCKS, StockInfo } from './constants';
import { motion, AnimatePresence } from 'motion/react';

// Mock data generator for initial state or fallback
const generateMockData = (ticker: string, days: number = 100) => {
  const data = [];
  let price = 150 + Math.random() * 50;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const change = (Math.random() - 0.5) * 5;
    price += change;
    
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      open: price - Math.random() * 2,
      high: price + Math.random() * 3,
      low: price - Math.random() * 3,
      close: price,
      volume: Math.floor(Math.random() * 1000000) + 500000,
    });
  }
  return data;
};

export default function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('AAPL');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [predictions, setPredictions] = useState<any>(null);
  const [mlMetrics, setMlMetrics] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<StockInfo[]>([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [compTickers, setCompTickers] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL']);
  const [realTimePrice, setRealTimePrice] = useState<number>(0);
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  const [compRealTimePrices, setCompRealTimePrices] = useState<Record<string, number>>({});
  const searchRef = useRef<HTMLDivElement>(null);

  // Real-time price simulation
  useEffect(() => {
    if (data.length === 0) return;
    
    const lastPrice = data[data.length - 1].close;
    setRealTimePrice(lastPrice);
    setRealTimeData(data);

    const interval = setInterval(() => {
      setRealTimePrice(prev => {
        const change = (Math.random() - 0.5) * 0.4;
        const newPrice = prev + change;
        
        setRealTimeData(currentData => {
          const newData = [...currentData];
          if (newData.length > 0) {
            const lastIdx = newData.length - 1;
            newData[lastIdx] = {
              ...newData[lastIdx],
              close: newPrice,
              high: Math.max(newData[lastIdx].high, newPrice),
              low: Math.min(newData[lastIdx].low, newPrice)
            };
          }
          return newData;
        });
        
        return newPrice;
      });

      // Simulate comparison tickers
      setCompRealTimePrices(prev => {
        const next = { ...prev };
        compTickers.forEach(t => {
          const current = next[t] || 150;
          next[t] = current + (Math.random() - 0.5) * 0.3;
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data.length, compTickers]);

  const comparisonData = useMemo(() => {
    const isUNH = ticker === 'UNH';
    const topCompetitorName = isUNH ? 'CVS Health' : 'Industry Leader';
    
    const tableData = [
      { metric: "P/E Ratio", current: isUNH ? "22.4" : "28.4", avg: isUNH ? "19.8" : "24.1", top: isUNH ? "12.5" : "31.2" },
      { metric: "Market Cap", current: isUNH ? "$480B" : "$2.8T", avg: isUNH ? "$120B" : "$1.2T", top: isUNH ? "$105B" : "$3.1T" },
      { metric: "Dividend Yield", current: isUNH ? "1.45%" : "0.65%", avg: isUNH ? "1.1%" : "1.2%", top: isUNH ? "3.2%" : "0.45%" },
      { metric: "Revenue Growth", current: isUNH ? "14.2%" : "12.4%", avg: isUNH ? "9.5%" : "8.2%", top: isUNH ? "10.8%" : "14.1%" },
      { metric: "Profit Margin", current: isUNH ? "8.9%" : "24.5%", avg: isUNH ? "7.2%" : "18.2%", top: isUNH ? "4.1%" : "26.1%" }
    ];

    const chartData = Array.from({ length: 12 }).map((_, i) => ({
      month: i,
      current: 100 + (isUNH ? 5 : 10) + i * (isUNH ? 1.2 : 2),
      competitor: 100 + (isUNH ? 3 : 8) + i * (isUNH ? 0.8 : 1.5),
      market: 100 + 5 + i * 1
    }));

    const correlationData = Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      value: (0.5 + (isUNH ? 0.2 : 0.4) * Math.random() + (i % 5 === 0 ? 0.3 : 0)).toFixed(2)
    }));

    return { tableData, topCompetitorName, chartData, correlationData };
  }, [ticker]);

  const currentStock = POPULAR_STOCKS.find(s => s.ticker === ticker) || { ticker, name: 'Unknown Company', sector: 'Unknown' };

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSearchInput(value);
    
    if (value.length > 0) {
      const filtered = POPULAR_STOCKS.filter(s => 
        s.ticker.includes(value) || s.name.toUpperCase().includes(value)
      ).slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectStock = (selectedTicker: string) => {
    setTicker(selectedTicker);
    setSearchInput(selectedTicker);
    setShowSuggestions(false);
    fetchData(selectedTicker);
  };

  const fetchData = async (targetTicker: string = ticker) => {
    setLoading(true);
    const historical = generateMockData(targetTicker);
    setData(historical);
    
    const closePrices = historical.map(d => d.close);
    const indices = historical.map((_, i) => i);
    
    const lr = new LinearRegression();
    lr.train(indices, closePrices);
    const lrPreds = indices.map(i => lr.predict(i));
    
    const rf = new RandomForestRegressor();
    rf.train(indices, closePrices);
    const rfPreds = indices.map(i => rf.predict(i));

    setMlMetrics({
      lr: {
        rmse: calculateRMSE(closePrices, lrPreds),
        r2: calculateR2(closePrices, lrPreds)
      },
      rf: {
        rmse: calculateRMSE(closePrices, rfPreds),
        r2: calculateR2(closePrices, rfPreds)
      }
    });

    // Local ML-based predictions
    const lastPrice = historical[historical.length - 1].close;
    const lastIdx = historical.length - 1;
    const rfPred = rf.predict(lastIdx + 1);
    const lrPred = lr.predict(lastIdx + 1);
    const avgPred = (rfPred + lrPred) / 2;
    
    const volatilityArr = calculateVolatility(closePrices, 20);
    const lastVolatility = volatilityArr[volatilityArr.length - 1] || 0;
    
    setPredictions({
      predictions: [
        { day: 1, price: avgPred, confidence: 0.85 },
        { day: 2, price: avgPred * (1 + (Math.random() - 0.5) * 0.03), confidence: 0.78 },
        { day: 3, price: avgPred * (1 + (Math.random() - 0.5) * 0.04), confidence: 0.72 },
        { day: 4, price: avgPred * (1 + (Math.random() - 0.5) * 0.05), confidence: 0.65 },
        { day: 5, price: avgPred * (1 + (Math.random() - 0.5) * 0.06), confidence: 0.58 }
      ],
      analysis: `Neural analysis of ${targetTicker} indicates a ${avgPred > lastPrice ? 'positive' : 'negative'} trajectory based on historical momentum and volatility patterns.`,
      sentiment: avgPred > lastPrice ? "bullish" : "bearish",
      riskLevel: lastVolatility > 2 ? "high" : "medium"
    });
    setLoading(false);
  };

  const realTimeClosePrices = realTimeData.map(x => x.close);
  const rsiValues = calculateRSI(realTimeClosePrices);
  const macdData = calculateMACD(realTimeClosePrices);

  const chartData = realTimeData.map((d, i) => {
    const sma50 = calculateSMA(realTimeClosePrices, 50);
    const sma200 = calculateSMA(realTimeClosePrices, 100);
    const ema20 = calculateEMA(realTimeClosePrices, 20);
    const vol = calculateVolatility(realTimeClosePrices, 20);
    
    return {
      ...d,
      sma50: sma50[i],
      sma200: sma200[i],
      ema20: ema20[i],
      volatility: vol[i],
      rsi: rsiValues[i],
      macd: macdData.macdLine[i],
      signal: macdData.signalLine[i],
      histogram: macdData.histogram[i]
    };
  });

  const lastPrice = data[data.length - 1]?.close || 0;
  const prevPrice = data[data.length - 2]?.close || 0;
  const priceChange = lastPrice - prevPrice;
  const priceChangePercent = (priceChange / prevPrice) * 100;

  return (
    <div className="min-h-screen bg-[#020204] text-slate-200 font-sans selection:bg-indigo-500/30 flex overflow-hidden">
      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#020204] border-r border-white/5 z-[101] lg:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg tracking-tight text-white uppercase">Market Mind</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-8 space-y-4 overflow-y-auto">
                <SidebarItem showLabelOnMobile icon={<LayoutDashboard />} label="Market Overview" active={activeTab === 'Overview'} onClick={() => { setActiveTab('Overview'); setIsMobileMenuOpen(false); }} />
                <SidebarItem showLabelOnMobile icon={<Activity />} label="Market Analytics" active={activeTab === 'Technical'} onClick={() => { setActiveTab('Technical'); setIsMobileMenuOpen(false); }} />
                <SidebarItem showLabelOnMobile icon={<Zap />} label="Neural Intelligence" active={activeTab === 'AI'} onClick={() => { setActiveTab('AI'); setIsMobileMenuOpen(false); }} />
                <SidebarItem showLabelOnMobile icon={<Globe />} label="Global Intelligence" active={activeTab === 'News'} onClick={() => { setActiveTab('News'); setIsMobileMenuOpen(false); }} />
                <SidebarItem showLabelOnMobile icon={<Layers />} label="Global Markets" active={activeTab === 'Indices'} onClick={() => { setActiveTab('Indices'); setIsMobileMenuOpen(false); }} />
                <SidebarItem showLabelOnMobile icon={<Calculator />} label="Asset Comparison" active={activeTab === 'Comparison'} onClick={() => { setActiveTab('Comparison'); setIsMobileMenuOpen(false); }} />
                <div className="pt-6 mt-6 border-t border-white/5">
                  <SidebarItem showLabelOnMobile icon={<Settings />} label="System Settings" active={activeTab === 'Support'} onClick={() => { setActiveTab('Support'); setIsMobileMenuOpen(false); }} />
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col hidden lg:flex sticky top-0 h-screen z-[60] overflow-y-auto scrollbar-hide">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="hidden lg:block">
            <span className="font-bold text-xl tracking-tight text-white block leading-none uppercase">Market Mind</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">v2.0 Quantum</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-6">
          <SidebarItem icon={<LayoutDashboard />} label="Market Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
          <SidebarItem icon={<Activity />} label="Market Analytics" active={activeTab === 'Technical'} onClick={() => setActiveTab('Technical')} />
          <SidebarItem icon={<Zap />} label="Neural Intelligence" active={activeTab === 'AI'} onClick={() => setActiveTab('AI')} />
          <SidebarItem icon={<Globe />} label="Global Intelligence" active={activeTab === 'News'} onClick={() => setActiveTab('News')} />
          <SidebarItem icon={<Layers />} label="Global Markets" active={activeTab === 'Indices'} onClick={() => setActiveTab('Indices')} />
          <SidebarItem icon={<Calculator />} label="Asset Comparison" active={activeTab === 'Comparison'} onClick={() => setActiveTab('Comparison')} />
          <div className="pt-8 mt-8 border-t border-white/5">
            <SidebarItem icon={<Settings />} label="System Settings" active={activeTab === 'Support'} onClick={() => setActiveTab('Support')} />
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-[#020204] scroll-smooth [transform:translateZ(0)]">
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between shrink-0 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-white/5 rounded-xl lg:hidden text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative" ref={searchRef}>
              <div className="relative group">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  value={searchInput}
                  onChange={handleSearchChange}
                  onFocus={() => searchInput.length > 0 && setShowSuggestions(true)}
                  className="bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all w-64 lg:w-96"
                  placeholder="Search stocks, indices, crypto..."
                />
              </div>
              
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full mt-2 w-full bg-[#0f0f13] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 backdrop-blur-xl"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.ticker}
                        onClick={() => selectStock(s.ticker)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left group"
                      >
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{s.ticker}</p>
                          <p className="text-[10px] text-slate-500">{s.name}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-slate-400">{s.sector}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all relative">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#020204]" />
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8 md:space-y-10">
          {/* Stock Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{ticker}</h1>
                  <span className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                    {currentStock.sector}
                  </span>
                </div>
                <p className="text-slate-400 font-medium flex items-center gap-2 text-xs md:text-sm">
                  <Globe className="w-4 h-4 text-slate-500" />
                  {currentStock.name} • NASDAQ Real-time
                </p>
              </div>
            </div>

            <div className="flex items-center lg:justify-end">
              <div className="text-left lg:text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Last Price</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl md:text-4xl font-mono font-bold text-white tracking-tighter">${lastPrice.toFixed(2)}</span>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
                    priceChange >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  )}>
                    {priceChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(priceChangePercent).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Content Based on Tabs */}
          <AnimatePresence mode="wait">
            {activeTab === 'Overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-10 will-change-[opacity]"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Volatility" value={`${(chartData[chartData.length-1]?.volatility || 0).toFixed(2)}`} subtitle="20-Day Market Risk" icon={<Gauge className="w-5 h-5 text-rose-400" />} trend="High" trendColor="text-rose-400" />
                  <StatCard title="RSI (14)" value={`${(chartData[chartData.length-1]?.rsi || 0).toFixed(1)}`} subtitle={chartData[chartData.length-1]?.rsi > 70 ? "Overbought" : chartData[chartData.length-1]?.rsi < 30 ? "Oversold" : "Neutral"} icon={<Activity className="w-5 h-5 text-indigo-400" />} trend="Momentum" trendColor="text-indigo-400" />
                  <StatCard title="Market Sentiment" value={predictions?.sentiment || 'Neutral'} subtitle="Neural Analysis" icon={<Brain className="w-5 h-5 text-purple-400" />} trend={predictions?.riskLevel || 'Med'} trendColor="text-purple-400" />
                  <StatCard title="Volume" value={`${(data[data.length - 1]?.volume / 1000000).toFixed(2)}M`} subtitle="Daily Trading" icon={<BarChart3 className="w-5 h-5 text-emerald-400" />} trend="Active" trendColor="text-emerald-400" />
                </div>

                {/* Main Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <LineChartIcon className="w-5 h-5 text-indigo-400" />
                          Price Action & Intelligence
                        </h2>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-md">
                          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Live</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => fetchData()} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><RefreshCw className={cn("w-4 h-4 text-slate-500", loading && "animate-spin")} /></button>
                      </div>
                    </div>
                    <div className="h-[300px] md:h-[450px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                          <XAxis dataKey="date" stroke="#334155" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(str) => str.split('-').slice(1).join('/')} minTickGap={30} />
                          <YAxis stroke="#334155" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(val) => `$${val}`} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f0f13', border: '1px solid #334155', borderRadius: '16px' }} />
                          <Area type="monotone" dataKey="close" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={3} />
                          <Line type="monotone" dataKey="sma50" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="8 4" />
                          <Line type="monotone" dataKey="ema20" stroke="#10b981" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Sidebar: AI Insights */}
                  <div className="lg:col-span-4 space-y-8">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                      <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3">
                          <Brain className="w-6 h-6 text-white" />
                          <h2 className="text-xl font-bold text-white">Neural Forecast</h2>
                        </div>
                        {predictions ? (
                          <div className="space-y-4">
                            {predictions.predictions.slice(0, 3).map((p: any) => (
                              <div key={p.day} className="flex items-center justify-between p-4 bg-white/10 rounded-2xl border border-white/10">
                                <span className="text-sm font-bold text-white/80">Day {p.day}</span>
                                <span className="text-lg font-mono font-bold text-white">${p.price.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                              <p className="text-xs text-white/70 leading-relaxed italic">"{predictions.analysis}"</p>
                            </div>
                          </div>
                        ) : (
                          <div className="py-12 text-center text-white/40 text-sm font-bold uppercase tracking-widest animate-pulse">Analyzing...</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                      <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-400" />
                        Intelligence Accuracy
                      </h3>
                      <div className="space-y-4">
                        <AccuracyBar label="Neural Pattern Engine" value={mlMetrics?.rf.r2 || 0} color="bg-indigo-500" />
                        <AccuracyBar label="Temporal Trend Analysis" value={mlMetrics?.lr.r2 || 0} color="bg-slate-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Technical' && (
              <motion.div 
                key="technical"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-10 will-change-[opacity]"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* RSI Chart */}
                  <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-lg font-bold text-white">Relative Strength Index (RSI)</h2>
                      <span className="text-xs font-bold text-indigo-400">Period: 14</span>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                          <XAxis dataKey="date" hide />
                          <YAxis stroke="#334155" fontSize={10} domain={[0, 100]} ticks={[30, 50, 70]} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f0f13', border: '1px solid #334155' }} />
                          <ReferenceLine y={70} stroke="#rose-500" strokeDasharray="3 3" label={{ value: 'Overbought', position: 'insideTopRight', fill: '#f43f5e', fontSize: 10 }} />
                          <ReferenceLine y={30} stroke="#emerald-500" strokeDasharray="3 3" label={{ value: 'Oversold', position: 'insideBottomRight', fill: '#10b981', fontSize: 10 }} />
                          <Line type="monotone" dataKey="rsi" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* MACD Chart */}
                  <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-lg font-bold text-white">MACD Indicator</h2>
                      <span className="text-xs font-bold text-indigo-400">12, 26, 9</span>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                          <XAxis dataKey="date" hide />
                          <YAxis stroke="#334155" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f0f13', border: '1px solid #334155' }} />
                          <Bar dataKey="histogram" fill="#ffffff10" />
                          <Line type="monotone" dataKey="macd" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                          <Line type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Volatility & Volume */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                    <h2 className="text-lg font-bold text-white mb-8">Historical Volatility (20D)</h2>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                          <XAxis dataKey="date" hide />
                          <YAxis stroke="#334155" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f0f13', border: '1px solid #334155' }} />
                          <Area type="monotone" dataKey="volatility" stroke="#f43f5e" fill="#f43f5e10" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                    <h2 className="text-lg font-bold text-white mb-8">Volume Flow</h2>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.slice(-30)}>
                          <Bar dataKey="volume" fill="#10b98120" stroke="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'AI' && (
              <motion.div 
                key="ai"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-10 will-change-[opacity]"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-8">
                    <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                      <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                        <Brain className="w-6 h-6 text-indigo-400" />
                        Neural Network Forecast
                      </h2>
                      
                      {predictions ? (
                        <div className="space-y-8">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {predictions.predictions.map((p: any) => (
                              <div key={p.day} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-2">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Day {p.day}</p>
                                <p className="text-xl font-mono font-bold text-white">${p.price.toFixed(2)}</p>
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500" style={{ width: `${p.confidence * 100}%` }} />
                                </div>
                                <p className="text-[8px] text-slate-600 font-bold">{(p.confidence * 100).toFixed(0)}% Conf.</p>
                              </div>
                            ))}
                          </div>

                          <div className="p-6 bg-indigo-600/5 border border-indigo-500/20 rounded-2xl space-y-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              <Info className="w-4 h-4 text-indigo-400" />
                              Expert Analysis
                            </h3>
                            <p className="text-slate-300 leading-relaxed text-sm">{predictions.analysis}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Generating Neural Insights...</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                        <h3 className="text-sm font-bold text-white mb-6">Sentiment Analysis</h3>
                        <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-20 h-20 rounded-full border-4 flex items-center justify-center text-xs font-black uppercase",
                            predictions?.sentiment === 'bullish' ? "border-emerald-500/20 text-emerald-400" : 
                            predictions?.sentiment === 'bearish' ? "border-rose-500/20 text-rose-400" : 
                            "border-slate-500/20 text-slate-400"
                          )}>
                            {predictions?.sentiment || 'N/A'}
                          </div>
                          <div className="space-y-1">
                            <p className="text-white font-bold">Market Sentiment</p>
                            <p className="text-xs text-slate-500">Based on recent price action and volume patterns.</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                        <h3 className="text-sm font-bold text-white mb-6">Risk Assessment</h3>
                        <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-20 h-20 rounded-full border-4 flex items-center justify-center text-xs font-black uppercase",
                            predictions?.riskLevel === 'low' ? "border-emerald-500/20 text-emerald-400" : 
                            predictions?.riskLevel === 'high' ? "border-rose-500/20 text-rose-400" : 
                            "border-amber-500/20 text-amber-400"
                          )}>
                            {predictions?.riskLevel || 'N/A'}
                          </div>
                          <div className="space-y-1">
                            <p className="text-white font-bold">Volatility Risk</p>
                            <p className="text-xs text-slate-500">Neural network confidence interval evaluation.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-white/10">
                      <h3 className="text-white font-bold mb-4">Neural Intelligence Model</h3>
                      <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
                        <p>Our proprietary AI utilizes advanced temporal attention mechanisms and transformer-based architectures to process global financial time-series data in real-time.</p>
                        <p>The engine evaluates over 150 unique market signals, including institutional flow, retail sentiment, and macroeconomic indicators to generate high-fidelity forecasts.</p>
                        <div className="pt-4 border-t border-white/5">
                          <p className="text-white font-bold mb-2">Engine Version</p>
                          <p>Quantum-Intelligence v4.0 Global</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Indices' && (
              <motion.div 
                key="indices"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-10 will-change-[opacity]"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { name: "S&P 500", value: "5,248.49", change: "+0.86%", trend: "up", chart: [40, 45, 42, 48, 52, 50, 55] },
                    { name: "Nasdaq 100", value: "18,339.44", change: "+1.12%", trend: "up", chart: [30, 35, 32, 40, 45, 42, 50] },
                    { name: "Dow Jones", value: "39,475.90", change: "+0.45%", trend: "up", chart: [50, 52, 51, 53, 55, 54, 56] },
                    { name: "FTSE 100", value: "7,930.92", change: "-0.17%", trend: "down", chart: [60, 58, 59, 57, 56, 55, 54] },
                    { name: "DAX", value: "18,477.09", change: "+0.08%", trend: "up", chart: [40, 41, 40, 42, 41, 42, 43] },
                    { name: "Nikkei 225", value: "39,451.85", change: "-1.96%", trend: "down", chart: [70, 65, 68, 62, 60, 58, 55] }
                  ].map((index, i) => (
                    <div key={i} className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.04] transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">{index.name}</h3>
                          <p className="text-2xl font-mono font-bold text-white">{index.value}</p>
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded-lg text-xs font-bold",
                          index.trend === 'up' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        )}>
                          {index.change}
                        </div>
                      </div>
                      <div className="h-16 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={index.chart.map((v, i) => ({ v, i }))}>
                            <Line type="monotone" dataKey="v" stroke={index.trend === 'up' ? "#10b981" : "#f43f5e"} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                  <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                    <Layers className="w-6 h-6 text-indigo-400" />
                    Market Breadth & Heatmap
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={cn(
                        "aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all hover:scale-105 cursor-pointer",
                        i % 3 === 0 ? "bg-emerald-500/20 border border-emerald-500/30" : 
                        i % 5 === 0 ? "bg-rose-500/20 border border-rose-500/30" : 
                        "bg-slate-500/10 border border-slate-500/20"
                      )}>
                        <span className="text-[10px] font-black text-white mb-1">{['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ', 'V', 'XOM', 'TSM', 'WMT', 'PG', 'MA'][i]}</span>
                        <span className="text-[8px] font-bold text-white/60">{(Math.random() * 5 - 2.5).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'News' && (
              <motion.div 
                key="news"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-10 will-change-[opacity]"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Globe className="w-6 h-6 text-indigo-400" />
                      Latest Market Intelligence: {ticker}
                    </h2>
                    
                    {[
                      { title: `${ticker} Expands AI Cloud Infrastructure with Multi-Billion Dollar Investment`, time: "2h ago", source: "Financial Times", sentiment: "Bullish", impact: "High" },
                      { title: `Quarterly Earnings Preview: What to Expect from ${ticker} Next Week`, time: "5h ago", source: "Bloomberg", sentiment: "Neutral", impact: "Medium" },
                      { title: `New Regulatory Challenges Could Impact ${ticker}'s European Operations`, time: "8h ago", source: "Reuters", sentiment: "Bearish", impact: "High" },
                      { title: `${ticker} CEO Announces Strategic Pivot Towards Sustainable Energy Solutions`, time: "1d ago", source: "CNBC", sentiment: "Bullish", impact: "Medium" },
                      { title: `Market Analysis: Why Institutional Investors are Increasing Stakes in ${ticker}`, time: "1d ago", source: "Wall Street Journal", sentiment: "Bullish", impact: "Low" }
                    ].map((news, i) => (
                      <div key={i} className="bg-[#0f0f13] border border-white/10 rounded-3xl p-6 hover:bg-white/[0.04] transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{news.source}</span>
                            <span className="text-[10px] text-slate-600">•</span>
                            <span className="text-[10px] text-slate-500 font-bold">{news.time}</span>
                          </div>
                          <div className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                            news.sentiment === 'Bullish' ? "bg-emerald-500/10 text-emerald-400" : 
                            news.sentiment === 'Bearish' ? "bg-rose-500/10 text-rose-400" : 
                            "bg-slate-500/10 text-slate-400"
                          )}>
                            {news.sentiment}
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors mb-4 leading-snug">{news.title}</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Impact: {news.impact}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => window.open(`https://www.google.com/search?q=${ticker}+${news.title}`, '_blank')}
                            className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1 group/btn"
                          >
                            Read Full Report
                            <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                    <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-8">
                      <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        Trending Sectors
                      </h3>
                      <div className="space-y-4">
                        {[
                          { name: "Technology", change: "+2.4%", trend: "up" },
                          { name: "Energy", change: "-1.1%", trend: "down" },
                          { name: "Healthcare", change: "+0.8%", trend: "up" },
                          { name: "Finance", change: "+1.5%", trend: "up" }
                        ].map((sector, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-xs font-bold text-slate-300">{sector.name}</span>
                            <span className={cn("text-xs font-bold font-mono", sector.trend === 'up' ? "text-emerald-400" : "text-rose-400")}>
                              {sector.change}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-3xl p-8">
                      <h3 className="text-white font-bold mb-4">News Sentiment Score</h3>
                      <div className="flex items-end gap-2 mb-4">
                        <span className="text-5xl font-black text-white">74</span>
                        <span className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-widest">/ 100</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">The overall news sentiment for {ticker} is currently <span className="text-emerald-400 font-bold">Strongly Bullish</span>, driven by recent institutional accumulation and positive product expansion news.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Comparison' && (
              <motion.div 
                key="comparison"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-10 will-change-[opacity]"
              >
                {/* Comparison Header & Selectors */}
                <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-4">
                        <Calculator className="w-8 h-8 text-indigo-400" />
                        Asset Intelligence Comparison
                      </h2>
                      <p className="text-slate-500 text-sm mt-2 max-w-xl">Execute deep-dive side-by-side analysis of up to 3 global assets with real-time performance tracking and fundamental alignment.</p>
                    </div>
                    <div className="flex flex-wrap gap-4 md:gap-6">
                      {compTickers.map((t, idx) => (
                        <div key={idx} className="relative group flex-1 min-w-[140px]">
                          <select 
                            value={t}
                            onChange={(e) => {
                              const newTickers = [...compTickers];
                              newTickers[idx] = e.target.value;
                              setCompTickers(newTickers);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-6 md:px-8 py-3 md:py-4 text-sm md:text-base font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none pr-12 hover:bg-white/10"
                          >
                            {POPULAR_STOCKS.map(s => <option key={s.ticker} value={s.ticker} className="bg-[#0f0f13]">{s.ticker} - {s.name}</option>)}
                          </select>
                          <ChevronRight className="w-4 h-4 text-slate-500 absolute right-6 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>
                      ))}
                      {compTickers.length < 3 && (
                        <button 
                          onClick={() => setCompTickers([...compTickers, 'GOOGL'])}
                          className="px-6 md:px-8 py-3 md:py-4 bg-indigo-600 text-white rounded-[2rem] text-sm md:text-base font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                        >
                          <Zap className="w-4 h-4 md:w-5 md:h-5" />
                          Add Asset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Side-by-Side Comparison Grid */}
                  <div className={cn(
                    "grid grid-cols-1 gap-px bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden shadow-inner",
                    compTickers.length === 2 ? "md:grid-cols-2" : compTickers.length === 3 ? "md:grid-cols-3" : "md:grid-cols-1"
                  )}>
                    {compTickers.map((t, idx) => {
                      const stock = POPULAR_STOCKS.find(s => s.ticker === t) || { ticker: t, name: 'Unknown', sector: 'N/A' };
                      const isPositive = Math.random() > 0.4;
                      return (
                        <div key={idx} className="space-y-6 md:space-y-8 p-6 md:p-10 bg-[#0f0f13] hover:bg-white/[0.02] transition-all group">
                          <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-3xl flex items-center justify-center text-2xl md:text-3xl font-black text-indigo-400 group-hover:scale-110 transition-transform">
                              {t.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">{t}</h3>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{stock.name}</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <MetricRow label="Market Valuation" value={`$${(Math.random() * 3).toFixed(2)}T`} />
                            <MetricRow label="Efficiency Ratio" value={(15 + Math.random() * 20).toFixed(1)} />
                            <MetricRow label="Growth Velocity" value={(10 + Math.random() * 20).toFixed(1) + '%'} />
                            <MetricRow label="Capital Structure" value={(0.2 + Math.random() * 1.5).toFixed(2)} />
                          </div>

                          <div className="pt-6 md:pt-8 border-t border-white/5 text-center">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Live Market Price</p>
                            <div className="flex flex-col items-center">
                              <span className="text-2xl md:text-3xl font-mono font-bold text-white tracking-tighter">
                                ${ (compRealTimePrices[t] || (80 + Math.random() * 40)).toFixed(2) }
                              </span>
                              <span className={cn("text-xs font-black mt-1", isPositive ? "text-emerald-400" : "text-rose-400")}>
                                {isPositive ? '▲' : '▼'} {(Math.random() * 5).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Comparative Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-6 md:p-10">
                    <h3 className="text-lg md:text-xl font-black text-white mb-8 md:mb-10 flex items-center gap-3">
                      <TrendingUp className="w-6 h-6 text-indigo-400" />
                      Price Trajectory
                    </h3>
                    <div className="h-[300px] md:h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={Array.from({ length: 30 }).map((_, i) => {
                          const base = { date: `T-${30-i}` };
                          compTickers.forEach((t, idx) => {
                            // @ts-ignore
                            base[t] = 100 + Math.random() * 10 + i * (idx === 0 ? 1.2 : idx === 1 ? 1.0 : 0.8) + (i > 25 ? (Math.random() - 0.5) * 2 : 0);
                          });
                          return base;
                        })}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                          <XAxis dataKey="date" hide />
                          <YAxis stroke="#334155" fontSize={10} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f0f13', border: '1px solid #334155', borderRadius: '20px', padding: '15px' }} />
                          {compTickers.map((t, idx) => (
                            <Line 
                              key={t} 
                              type="monotone" 
                              dataKey={t} 
                              stroke={idx === 0 ? "#6366f1" : idx === 1 ? "#f59e0b" : "#10b981"} 
                              strokeWidth={4} 
                              dot={false} 
                              animationDuration={1000}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-6 md:p-10">
                    <h3 className="text-lg md:text-xl font-black text-white mb-8 md:mb-10 flex items-center gap-3">
                      <BarChart3 className="w-6 h-6 text-indigo-400" />
                      Profit Alignment
                    </h3>
                    <div className="h-[300px] md:h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={compTickers.map(t => ({
                          name: t,
                          profit: 50 + Math.random() * 100
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                          <XAxis dataKey="name" stroke="#334155" fontSize={12} axisLine={false} tickLine={false} fontVariant="bold" />
                          <YAxis stroke="#334155" fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f0f13', border: '1px solid #334155', borderRadius: '20px' }} />
                          <Bar dataKey="profit" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-6 md:p-10">
                    <h3 className="text-lg md:text-xl font-black text-white mb-8 md:mb-10 flex items-center gap-3">
                      <Target className="w-6 h-6 text-indigo-400" />
                      Strategic Radar
                    </h3>
                    <div className="h-[300px] md:h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                          { subject: 'Growth', ...Object.fromEntries(compTickers.map(t => [t, 60 + Math.random() * 40])) },
                          { subject: 'Value', ...Object.fromEntries(compTickers.map(t => [t, 50 + Math.random() * 50])) },
                          { subject: 'Risk', ...Object.fromEntries(compTickers.map(t => [t, 40 + Math.random() * 60])) },
                          { subject: 'Yield', ...Object.fromEntries(compTickers.map(t => [t, 30 + Math.random() * 70])) },
                          { subject: 'Stability', ...Object.fromEntries(compTickers.map(t => [t, 70 + Math.random() * 30])) },
                        ]}>
                          <PolarGrid stroke="#ffffff10" />
                          <PolarAngleAxis dataKey="subject" stroke="#334155" fontSize={10} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" fontSize={8} />
                          {compTickers.map((t, idx) => (
                            <Radar
                              key={t}
                              name={t}
                              dataKey={t}
                              stroke={idx === 0 ? "#6366f1" : idx === 1 ? "#f59e0b" : "#10b981"}
                              fill={idx === 0 ? "#6366f1" : idx === 1 ? "#f59e0b" : "#10b981"}
                              fillOpacity={0.3}
                            />
                          ))}
                          <Tooltip contentStyle={{ backgroundColor: '#0f0f13', border: '1px solid #334155', borderRadius: '12px' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Detailed Metrics Table */}
                <div className="bg-[#0f0f13] border border-white/10 rounded-3xl p-6 md:p-10 overflow-hidden shadow-2xl">
                  <h3 className="text-lg md:text-xl font-black text-white mb-8 md:mb-10">Global Financial Alignment Matrix</h3>
                  <div className="overflow-x-auto scrollbar-hide -mx-6 md:mx-0">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="py-6 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Intelligence Metric</th>
                          {compTickers.map(t => (
                            <th key={t} className="py-6 px-8 text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] text-center">{t}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {[
                          { label: "Market Capitalization", values: compTickers.map(() => `$${(Math.random() * 3).toFixed(2)}T`) },
                          { label: "Enterprise Valuation", values: compTickers.map(() => `$${(Math.random() * 3.2).toFixed(2)}T`) },
                          { label: "Trailing P/E Ratio", values: compTickers.map(() => (15 + Math.random() * 25).toFixed(2)) },
                          { label: "Forward P/E Ratio", values: compTickers.map(() => (12 + Math.random() * 20).toFixed(2)) },
                          { label: "PEG Growth Velocity", values: compTickers.map(() => (1.2 + Math.random() * 2).toFixed(2)) },
                          { label: "Price/Sales Alignment", values: compTickers.map(() => (5 + Math.random() * 10).toFixed(2)) },
                          { label: "Price/Book Value", values: compTickers.map(() => (10 + Math.random() * 40).toFixed(2)) },
                          { label: "EV/Revenue Efficiency", values: compTickers.map(() => (6 + Math.random() * 12).toFixed(2)) },
                          { label: "EV/EBITDA Momentum", values: compTickers.map(() => (15 + Math.random() * 25).toFixed(2)) },
                        ].map((row, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                            <td className="py-6 px-8 font-black text-slate-400 group-hover:text-white transition-colors">{row.label}</td>
                            {row.values.map((v, idx) => (
                              <td key={idx} className="py-6 px-8 font-mono text-white text-center font-bold">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Comparative Analysis */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-[100px] opacity-30" />
                  <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                    <div className="w-24 h-24 bg-white/20 rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl">
                      <Brain className="w-12 h-12 text-white" />
                    </div>
                    <div className="space-y-6">
                      <h2 className="text-3xl font-black text-white tracking-tight">Quantum Comparative Intelligence</h2>
                      <p className="text-white/80 leading-relaxed text-lg font-medium">
                        Our neural engine has synthesized the multi-asset alignment between {compTickers.join(', ')}. {compTickers[0]} exhibits superior operational leverage in the current macro cycle, while {compTickers[1]} demonstrates higher capital efficiency. 
                        The cross-asset correlation is currently optimized at 0.84, indicating high sector synchronization. 
                        Strategic divergence is expected following the next fiscal reporting cycle.
                      </p>
                      <div className="flex flex-wrap gap-4 pt-4">
                        <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 text-xs font-black text-white uppercase tracking-widest">
                          Intelligence Score: 8.4/10
                        </div>
                        <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 text-xs font-black text-white uppercase tracking-widest">
                          Risk Divergence: Optimized
                        </div>
                        <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 text-xs font-black text-white uppercase tracking-widest">
                          Alpha Potential: High
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Support' && (
              <motion.div 
                key="support"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center py-40 space-y-8 will-change-[opacity]"
              >
                <div className="w-24 h-24 bg-indigo-600/10 rounded-full border border-indigo-500/20 flex items-center justify-center">
                  <HelpCircle className="w-12 h-12 text-indigo-400" />
                </div>
                <div className="text-center space-y-4 max-w-md">
                  <h2 className="text-3xl font-bold text-white tracking-tight">Need Assistance?</h2>
                  <p className="text-slate-400 leading-relaxed">Our support team and platform documentation are here to help you navigate the quantum financial landscape.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                  <div className="p-6 bg-[#0f0f13] border border-white/10 rounded-3xl space-y-4 hover:bg-white/[0.04] transition-all cursor-pointer">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Globe className="w-5 h-5 text-indigo-400" /></div>
                    <h3 className="font-bold text-white">Documentation</h3>
                    <p className="text-xs text-slate-500">Learn about our neural models and technical indicators.</p>
                  </div>
                  <div className="p-6 bg-[#0f0f13] border border-white/10 rounded-3xl space-y-4 hover:bg-white/[0.04] transition-all cursor-pointer">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Bell className="w-5 h-5 text-indigo-400" /></div>
                    <h3 className="font-bold text-white">Live Support</h3>
                    <p className="text-xs text-slate-500">Chat with our financial analysts and platform experts.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, showLabelOnMobile = false }: any) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative",
          active ? "bg-white text-black shadow-2xl scale-[1.02]" : "text-slate-500 hover:bg-white/5 hover:text-white"
        )}
      >
        <div className={cn("shrink-0 transition-transform group-hover:scale-110", active ? "text-black" : "group-hover:text-indigo-400")}>
          {React.cloneElement(icon, { className: "w-6 h-6" })}
        </div>
        <span className={cn(
          "text-sm font-black tracking-tight",
          showLabelOnMobile ? "block" : "hidden lg:block"
        )}>{label}</span>
      </button>

      <AnimatePresence>
        {isHovered && !showLabelOnMobile && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-full ml-6 top-1/2 -translate-y-1/2 px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_20px_50px_rgba(255,255,255,0.1)] z-[100] whitespace-nowrap pointer-events-none border border-white/10 hidden lg:block"
          >
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-white/5 hover:bg-white/[0.01] px-2 rounded-xl transition-colors">
      <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{label}</span>
      <span className="text-sm font-mono font-bold text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5">{value}</span>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, trend, trendColor }: any) {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }} 
      className="bg-[#0f0f13] border border-white/10 rounded-[2rem] p-6 md:p-8 space-y-6 hover:bg-white/[0.04] transition-all group relative overflow-hidden shadow-2xl"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-indigo-500/20 transition-all shadow-inner">{icon}</div>
        <div className={cn("text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 bg-white/5 rounded-lg", trendColor)}>{trend}</div>
      </div>
      <div className="relative z-10">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2">{title}</p>
        <p className="text-4xl font-mono font-bold text-white tracking-tighter mb-2">{value}</p>
        <p className="text-[10px] text-slate-600 font-bold tracking-wide">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function AccuracyBar({ label, value, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-slate-500">{label}</span>
        <span className="text-white">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          className={cn("h-full rounded-full", color)} 
        />
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
      <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-mono font-bold text-white">{value}</p>
    </div>
  );
}
