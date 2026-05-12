import React, { useMemo, useState, useEffect } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import { useWebhookData } from '../hooks/useWebhookData';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { format } from 'date-fns';
import { useTheme } from '../hooks/ThemeContext';
import { useCurrency } from '../hooks/CurrencyContext';
import CubeLoader from '../components/ui/cube-loader';
import { AlertCircle, RefreshCw, Sparkles, Database } from 'lucide-react';
import WebhookDataSection from '../components/WebhookDataSection';
import '../styles/categories.css';

const COLORS = ['#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#0D9488', '#EC4899', '#2DD4BF', '#8B5CF6', '#F97316'];

const processExpense = (data, exchangeRate) => {
  const categoryMap = {};
  const trendMap = {};
  const categoriesSet = new Set();
  const displayNames = {};

  (data || []).forEach(exp => {
    let amt = 0;
    const usdStr = String(exp['Amount in $ (If Applicable)'] || '');
    const inrStr = String(exp['Amount in ₹'] || '');
    if (usdStr && usdStr !== '0' && usdStr !== 'INR Not Available') {
      amt = parseFloat(usdStr.replace(/[^0-9.]/g, '')) || 0;
    } else if (inrStr && inrStr !== '0' && inrStr !== 'INR Not Available') {
      amt = (parseFloat(inrStr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate;
    }

    const rawName = exp.Category || exp.Type || 'Uncategorized';
    const nameKey = rawName.toLowerCase().trim();
    if (!displayNames[nameKey]) displayNames[nameKey] = rawName;
    const cat = displayNames[nameKey];
    categoriesSet.add(cat);

    if (amt > 0) {
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;
      if (exp.Date) {
        try {
          const parts = exp.Date.split('/');
          const dt = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : new Date(exp.Date);
          if (!isNaN(dt.getTime())) {
            const monthStr = format(dt, 'MMM yyyy');
            if (!trendMap[monthStr]) trendMap[monthStr] = {};
            trendMap[monthStr][cat] = (trendMap[monthStr][cat] || 0) + amt;
            trendMap[monthStr].dt = dt;
          }
        } catch { /* ignore */ }
      }
    }
  });

  return { categoryMap, trendMap, categoriesSet };
};

const processInvestment = (data) => {
  const categoryMap = {};
  const trendMap = {};
  const categoriesSet = new Set();

  (data || []).forEach(item => {
    const amt = parseFloat(String(item.Amount || item.Value || 0).replace(/[^0-9.-]/g, '')) || 0;
    const cat = item.Note || item['Note / Platform'] || item.Name || 'General';
    categoriesSet.add(cat);

    if (amt > 0) {
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;
      const dateStr = item.Date || item.date || '';
      if (dateStr) {
        try {
          const parts = dateStr.split('/');
          const dt = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : new Date(dateStr);
          if (!isNaN(dt.getTime())) {
            const monthStr = format(dt, 'MMM yyyy');
            if (!trendMap[monthStr]) trendMap[monthStr] = {};
            trendMap[monthStr][cat] = (trendMap[monthStr][cat] || 0) + amt;
            trendMap[monthStr].dt = dt;
          }
        } catch { /* ignore */ }
      }
    }
  });

  return { categoryMap, trendMap, categoriesSet };
};

const processClient = (data) => {
  const categoryMap = {};
  const trendMap = {};
  const categoriesSet = new Set();

  (data || []).forEach(item => {
    const getVal = (keys) => { for (const k of keys) if (item[k] !== undefined) return item[k]; return null; };
    const realised = parseFloat(String(getVal(['Realised Revenue', 'RealisedRevenue', 'Realised', 'realisedRevenue']) || 0).replace(/[^0-9.-]/g, '')) || 0;
    const cat = getVal(['Client Name', 'ClientName', 'Client', 'clientName']) || 'Unknown Client';
    categoriesSet.add(cat);

    if (realised > 0) {
      categoryMap[cat] = (categoryMap[cat] || 0) + realised;
      const dateStr = getVal(['Realised Date', 'realisedDate', 'RealisedDate']) || '';
      if (dateStr) {
        try {
          const parts = dateStr.split('/');
          const dt = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : new Date(dateStr);
          if (!isNaN(dt.getTime())) {
            const monthStr = format(dt, 'MMM yyyy');
            if (!trendMap[monthStr]) trendMap[monthStr] = {};
            trendMap[monthStr][cat] = (trendMap[monthStr][cat] || 0) + realised;
            trendMap[monthStr].dt = dt;
          }
        } catch { /* ignore */ }
      }
    }
  });

  return { categoryMap, trendMap, categoriesSet };
};

const TAB_LABELS = {
  Expense: 'Expenditure',
  Investment: 'Investments',
  Client: 'Client Revenue',
};

const CategoryAnalysis = () => {
  const { theme } = useTheme();
  const { currency, symbol, formatAmount, convert, exchangeRate } = useCurrency();
  const [activeTab, setActiveTab] = useState('Expense');
  const { data: webhookResponse, loading, error, refetch } = useWebhookData(activeTab);

  const [activePieIndex, setActivePieIndex] = useState(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  const [dataTab, setDataTab] = useState('Expense');
  useEffect(() => {
    if (!loading && webhookResponse) {
      setDataTab(activeTab);
    }
  }, [loading, webhookResponse, activeTab]);

  const chartConfig = {
    gridStroke: theme === 'dark' ? '#334155' : '#CBD5E1',
    tooltipBg: theme === 'dark' ? '#1E293B' : '#FFFFFF',
    tooltipBorder: theme === 'dark' ? '#334155' : '#CBD5E1',
    tooltipText: theme === 'dark' ? '#F8FAFC' : '#111827',
    tickColor: theme === 'dark' ? '#94A3B8' : '#475569',
  };

  const { spendByCategory, categoryTrendData, allFoundCategories } = useMemo(() => {
    if (activeTab !== dataTab || !webhookResponse?.data || !Array.isArray(webhookResponse.data)) {
      return { spendByCategory: [], categoryTrendData: [], allFoundCategories: [] };
    }

    const rawData = webhookResponse.data;
    let result;
    if (activeTab === 'Investment') {
      result = processInvestment(rawData);
    } else if (activeTab === 'Client') {
      result = processClient(rawData);
    } else {
      result = processExpense(rawData, exchangeRate);
    }

    const { categoryMap, trendMap, categoriesSet } = result;

    const sortedCats = Object.keys(categoryMap)
      .map(k => ({ name: k, value: categoryMap[k] }))
      .sort((a, b) => b.value - a.value);
    const topCats = sortedCats.map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }));

    const trendArray = Object.keys(trendMap)
      .map(monthStr => ({ month: monthStr, ...trendMap[monthStr] }))
      .sort((a, b) => a.dt - b.dt);

    return {
      spendByCategory: topCats,
      categoryTrendData: trendArray,
      allFoundCategories: Array.from(categoriesSet),
    };
  }, [webhookResponse, activeTab, dataTab, exchangeRate]);

  const convertedTrendData = useMemo(() => {
    return categoryTrendData.map(monthData => {
      const converted = { ...monthData };
      allFoundCategories.forEach(cat => {
        if (converted[cat]) converted[cat] = convert(converted[cat]);
      });
      return converted;
    });
  }, [categoryTrendData, allFoundCategories, convert]);

  if (loading && !webhookResponse) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CubeLoader />
      </div>
    );
  }

  if (error || (webhookResponse && webhookResponse.error)) {
    return (
      <div className="categories-container">
        <div className="p-6 bg-red-50/10 rounded-xl border border-red-500/20 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <p className="text-red-500">Failed to aggregate stats. {error?.message || webhookResponse?.message}</p>
        </div>
      </div>
    );
  }

  const streamLabel = TAB_LABELS[activeTab] || activeTab;
  const isRevenue = activeTab === 'Client';
  const isInvestment = activeTab === 'Investment';

  return (
    <div className="categories-container stagger-load">
      <div className="payments-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="header-title-group">
          <p className="top-tagline">Deep-dive into where your capital is {isRevenue ? 'originating' : 'allocated'}</p>
          <h1>{isRevenue ? 'Revenue Stream Analysis' : isInvestment ? 'Investment Allocation' : 'Categorical Spend Analysis'}</h1>
        </div>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Live Sync Status</span>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-500">
                {loading ? 'Fetching…' : `Connected · ${streamLabel}`}
              </span>
            </div>
          </div>
          <button 
            onClick={() => refetch()} 
            className="p-3 bg-glass-bg border border-glass-border rounded-xl hover:bg-glass-highlight transition-all hover:scale-105 active:scale-95 group"
            title="Force Refresh Data"
          >
            <RefreshCw size={18} className={`text-primary ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </div>

      <div className="category-cards-grid">
        {spendByCategory.map((cat, index) => (
          <Card key={index} className="category-summary-card">
            <div className="category-header">
              <span className="category-dot" style={{ backgroundColor: cat.color }}></span>
              <h4 className="category-name">{cat.name}</h4>
            </div>
            <div className="category-stats">
              <div className="stat-item">
                <p className="stat-label">Total {isRevenue ? 'Realised' : 'Spend'}</p>
                <p className="stat-value">{formatAmount(cat.value)}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Avg. Monthly</p>
                <p className="stat-value">{formatAmount(Math.round(cat.value / Math.max(categoryTrendData.length, 1)))}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="category-charts-grid">
        <ChartCard title={`Monthly ${isRevenue ? 'Revenue' : isInvestment ? 'Investment' : 'Spend'} by ${isRevenue ? 'Client' : isInvestment ? 'Platform' : 'Category'} (${currency})`}>
          {convertedTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={convertedTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartConfig.gridStroke} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartConfig.tickColor, fontSize: 11 }} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(value) => `${symbol}${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`} 
                  tick={{ fill: chartConfig.tickColor, fontSize: 11 }} 
                />
                <Tooltip 
                  formatter={(value) => `${symbol}${Number(value).toLocaleString()}`}
                  contentStyle={{ backgroundColor: chartConfig.tooltipBg, borderColor: chartConfig.tooltipBorder, color: chartConfig.tooltipText, borderRadius: '12px', border: '1px solid var(--glass-border)' }}
                  itemStyle={{ color: chartConfig.tooltipText }}
                  cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                />
                <Legend iconType="circle" />
                {allFoundCategories.map((cat, i) => (
                  <Bar 
                    key={cat} 
                    dataKey={cat} 
                    stackId="a" 
                    fill={COLORS[i % COLORS.length]} 
                    radius={[4, 4, 0, 0]} 
                    name={cat}
                    onMouseEnter={() => setHoveredBarIndex(i)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {hoveredBarIndex !== i && (
                      <LabelList 
                        dataKey={cat} 
                        position="center" 
                        formatter={(v) => v > 0 ? `${symbol}${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}` : ''}
                        style={{ fill: '#fff', fontSize: '9px', fontWeight: 'bold', pointerEvents: 'none' }}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full gap-4">
              <RefreshCw size={32} className="text-primary animate-spin opacity-50" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted animate-pulse">Aggregating Data...</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title={`${isRevenue ? 'Client' : isInvestment ? 'Platform' : 'Category'} Distribution (${currency})`}>
          {spendByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={spendByCategory.map(d => ({ ...d, value: convert(d.value) }))}
                  cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value"
                  onMouseEnter={(_, index) => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                    if (activePieIndex === index) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 25;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill={theme === 'dark' ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
                        {symbol}{value >= 1000 ? Math.round(value/1000) + 'k' : Math.round(value)}
                      </text>
                    );
                  }}
                >
                  {spendByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `${symbol}${Number(value).toLocaleString()}`}
                  contentStyle={{ backgroundColor: chartConfig.tooltipBg, borderColor: chartConfig.tooltipBorder, color: chartConfig.tooltipText, borderRadius: '12px', border: '1px solid var(--glass-border)' }}
                  itemStyle={{ color: chartConfig.tooltipText }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full gap-4">
              <RefreshCw size={32} className="text-primary animate-spin opacity-50" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted animate-pulse">Analyzing Distribution...</p>
            </div>
          )}
        </ChartCard>
      </div>

      <WebhookDataSection 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        externalData={webhookResponse}
        externalLoading={loading}
        externalRefetch={refetch}
      />
    </div>
  );
};

export default CategoryAnalysis;
