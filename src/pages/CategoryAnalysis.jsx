import React, { useMemo, useState, useEffect } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import { useWebhookData } from '../hooks/useWebhookData';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import CustomSelect from '../components/common/CustomSelect';
import { useTheme } from '../hooks/ThemeContext';
import { useCurrency } from '../hooks/CurrencyContext';
import CubeLoader from '../components/ui/cube-loader';
import { AlertCircle, RefreshCw, Sparkles, Database } from 'lucide-react';
import WebhookDataSection from '../components/WebhookDataSection';
import '../styles/categories.css';

const COLORS = ['#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#0D9488', '#EC4899', '#2DD4BF', '#8B5CF6', '#F97316'];

const processExpense = (data, exchangeRate) => {
  const categoryStats = {};
  const trendMap = {};
  const categoriesSet = new Set();
  const displayNames = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  (data || []).forEach(exp => {
    let amt = 0;
    const usdStr = String(exp['Amount in $ (If Applicable)'] || '');
    const inrStr = String(exp['Amount in ₹'] || '');
    const hasUsd = usdStr && usdStr !== '0' && usdStr !== 'INR Not Available';
    const hasInr = inrStr && inrStr !== '0' && inrStr !== 'INR Not Available';

    if (hasUsd && hasInr) {
      amt = parseFloat(usdStr.replace(/[^0-9.]/g, '')) || 0;
    } else if (hasInr) {
      amt = (parseFloat(inrStr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate;
    } else if (hasUsd) {
      amt = parseFloat(usdStr.replace(/[^0-9.]/g, '')) || 0;
    }

    let rawName = exp.Type || exp.Category || 'Uncategorized';
    let nameKey = rawName.toLowerCase().trim();
    
    // Normalize plural/singular names to match EXACT_EXPENSE_CATS
    if (nameKey === 'salaries') nameKey = 'salary';
    if (nameKey === 'tool') nameKey = 'tools';
    if (nameKey === 'subscription') nameKey = 'subscriptions';
    if (nameKey === 'ad') nameKey = 'ads';
    if (nameKey === 'overhead') nameKey = 'overheads';
    if (nameKey === 'incentives') nameKey = 'incentive';

    if (!displayNames[nameKey]) displayNames[nameKey] = nameKey.charAt(0).toUpperCase() + nameKey.slice(1);
    const cat = displayNames[nameKey];
    categoriesSet.add(cat);

    if (!categoryStats[cat]) {
      categoryStats[cat] = { value: 0, thisYear: 0, thisMonth: 0, topExpenseThisMonth: null };
    }

    if (amt > 0) {
      categoryStats[cat].value += amt;
      if (exp.Date) {
        try {
          const parts = exp.Date.split('/');
          const dt = parts.length === 3 ? new Date(`${parts[2]}-${parts[0]}-${parts[1]}`) : new Date(exp.Date);
          if (!isNaN(dt.getTime())) {
            const monthStr = format(dt, 'MMM yyyy');
            if (!trendMap[monthStr]) trendMap[monthStr] = {};
            trendMap[monthStr][cat] = (trendMap[monthStr][cat] || 0) + amt;
            trendMap[monthStr].dt = dt;

            if (dt.getFullYear() === currentYear) {
              categoryStats[cat].thisYear += amt;
              if (dt.getMonth() === currentMonth) {
                categoryStats[cat].thisMonth += amt;
                if (!categoryStats[cat].topExpenseThisMonth || amt > categoryStats[cat].topExpenseThisMonth.amt) {
                  categoryStats[cat].topExpenseThisMonth = {
                    amt,
                    name: exp['Spent On'] || exp.Service || exp.Title || exp.Vendor || 'Unknown'
                  };
                }
              }
            }
          }
        } catch { /* ignore */ }
      }
    }
  });

  return { categoryStats, trendMap, categoriesSet };
};

const processInvestment = (data) => {
  const categoryStats = {};
  const trendMap = {};
  const categoriesSet = new Set();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  (data || []).forEach(item => {
    const amt = parseFloat(String(item.Amount || item.Value || 0).replace(/[^0-9.-]/g, '')) || 0;
    const cat = item.Note || item['Note / Platform'] || item.Name || 'General';
    categoriesSet.add(cat);

    if (!categoryStats[cat]) {
      categoryStats[cat] = { value: 0, thisYear: 0, thisMonth: 0, topExpenseThisMonth: null };
    }

    if (amt > 0) {
      categoryStats[cat].value += amt;
      const dateStr = item.Date || item.date || '';
      if (dateStr) {
        try {
          const parts = dateStr.split('/');
          const dt = parts.length === 3 ? new Date(`${parts[2]}-${parts[0]}-${parts[1]}`) : new Date(dateStr);
          if (!isNaN(dt.getTime())) {
            const monthStr = format(dt, 'MMM yyyy');
            if (!trendMap[monthStr]) trendMap[monthStr] = {};
            trendMap[monthStr][cat] = (trendMap[monthStr][cat] || 0) + amt;
            trendMap[monthStr].dt = dt;

            if (dt.getFullYear() === currentYear) {
              categoryStats[cat].thisYear += amt;
              if (dt.getMonth() === currentMonth) {
                categoryStats[cat].thisMonth += amt;
                if (!categoryStats[cat].topExpenseThisMonth || amt > categoryStats[cat].topExpenseThisMonth.amt) {
                  categoryStats[cat].topExpenseThisMonth = {
                    amt,
                    name: item['Asset Name'] || item.Name || item.Asset || 'Unknown'
                  };
                }
              }
            }
          }
        } catch { /* ignore */ }
      }
    }
  });

  return { categoryStats, trendMap, categoriesSet };
};

const processClient = (data) => {
  const categoryStats = {};
  const trendMap = {};
  const categoriesSet = new Set();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  (data || []).forEach(item => {
    const getVal = (keys) => { for (const k of keys) if (item[k] !== undefined) return item[k]; return null; };
    const realised = parseFloat(String(getVal(['Realised Revenue', 'RealisedRevenue', 'Realised', 'realisedRevenue']) || 0).replace(/[^0-9.-]/g, '')) || 0;
    const cat = getVal(['Client Name', 'ClientName', 'Client', 'clientName']) || 'Unknown Client';
    categoriesSet.add(cat);

    if (!categoryStats[cat]) {
      categoryStats[cat] = { value: 0, thisYear: 0, thisMonth: 0, topExpenseThisMonth: null };
    }

    if (realised > 0) {
      categoryStats[cat].value += realised;
      const dateStr = getVal(['Realised Date', 'realisedDate', 'RealisedDate']) || '';
      if (dateStr) {
        try {
          const parts = dateStr.split('/');
          const dt = parts.length === 3 ? new Date(`${parts[2]}-${parts[0]}-${parts[1]}`) : new Date(dateStr);
          if (!isNaN(dt.getTime())) {
            const monthStr = format(dt, 'MMM yyyy');
            if (!trendMap[monthStr]) trendMap[monthStr] = {};
            trendMap[monthStr][cat] = (trendMap[monthStr][cat] || 0) + realised;
            trendMap[monthStr].dt = dt;

            if (dt.getFullYear() === currentYear) {
              categoryStats[cat].thisYear += realised;
              if (dt.getMonth() === currentMonth) {
                categoryStats[cat].thisMonth += realised;
                if (!categoryStats[cat].topExpenseThisMonth || realised > categoryStats[cat].topExpenseThisMonth.amt) {
                  categoryStats[cat].topExpenseThisMonth = {
                    amt: realised,
                    name: getVal(['Invoice Number', 'Invoice', 'Description', 'Item']) || 'Payment'
                  };
                }
              }
            }
          }
        } catch { /* ignore */ }
      }
    }
  });

  return { categoryStats, trendMap, categoriesSet };
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
  const { data: cardsResponse } = useWebhookData('Cards');

  const [activePieIndex, setActivePieIndex] = useState(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  // Filtering state
  const [dateFilter, setDateFilter] = useState('1 month'); // Default
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [cardFilter, setCardFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [paidByFilter, setPaidByFilter] = useState('all');

  const [dataTab, setDataTab] = useState('Expense');
  useEffect(() => {
    if (!loading && webhookResponse) {
      setDataTab(activeTab);
    }
  }, [loading, webhookResponse, activeTab]);

  // Extract unique filter options from raw data
  const filterOptions = useMemo(() => {
    const cards = new Set();
    const types = new Set();
    const people = new Set();
    
    if (cardsResponse?.data && Array.isArray(cardsResponse.data)) {
      cardsResponse.data.forEach(item => {
        const auth = item.Authorizer || '';
        const num = item["Card Number"] || '';
        const cardStr = num ? `${auth} - ${num}` : auth;
        if (cardStr) cards.add(cardStr);
      });
    }

    if (webhookResponse?.data && Array.isArray(webhookResponse.data)) {
      webhookResponse.data.forEach(item => {
        const card = item["Paid Via"] || item.PaidVia || item.Card;
        const type = item.Type;
        const person = item["Paid By"] || item.PaidBy;
        if (card) cards.add(card);
        if (type) types.add(type);
        if (person) people.add(person);
      });
    }
    
    return {
      cards: Array.from(cards).sort(),
      types: Array.from(types).sort(),
      people: Array.from(people).sort()
    };
  }, [webhookResponse, cardsResponse]);

  const filteredRawData = useMemo(() => {
    if (!webhookResponse?.data || !Array.isArray(webhookResponse.data)) return [];
    
    return webhookResponse.data.filter(exp => {
      // 1. Date Filter
      let dt = null;
      if (exp.Date || exp.date) {
        const dStr = exp.Date || exp.date;
        const parts = dStr.split('/');
        if (parts.length === 3) dt = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
        else dt = new Date(dStr);
      } else if (exp["Realised Date"] || exp.realisedDate || exp.RealisedDate) {
        const dStr = exp["Realised Date"] || exp.realisedDate || exp.RealisedDate;
        const parts = dStr.split('/');
        if (parts.length === 3) dt = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
        else dt = new Date(dStr);
      }
      
      if (dt && !isNaN(dt.getTime())) {
        const now = new Date();
        let startDate = null;
        if (dateFilter === '7 days') startDate = subDays(now, 7);
        else if (dateFilter === '3 weeks') startDate = subDays(now, 21);
        else if (dateFilter === '1 month') startDate = subMonths(now, 1);
        else if (dateFilter === '3 month') startDate = subMonths(now, 3);
        else if (dateFilter === '6 month') startDate = subMonths(now, 6);
        else if (dateFilter === '1 year') startDate = subYears(now, 1);
        else if (dateFilter === 'custom' && customRange.start) startDate = new Date(customRange.start);
        
        if (startDate && isBefore(dt, startOfDay(startDate))) return false;
        if (dateFilter === 'custom' && customRange.end && isAfter(dt, endOfDay(new Date(customRange.end)))) return false;
      }

      // 2. Card Filter
      if (cardFilter !== 'all') {
        const card = (exp["Paid Via"] || exp.PaidVia || exp.Card || '').toLowerCase();
        if (card !== cardFilter.toLowerCase()) return false;
      }

      // 3. Type Filter
      if (typeFilter !== 'all') {
        const type = (exp.Type || '').toLowerCase();
        if (type !== typeFilter.toLowerCase()) return false;
      }

      // 4. Paid By Filter
      if (paidByFilter !== 'all') {
        const person = (exp["Paid By"] || exp.PaidBy || '').toLowerCase();
        if (person !== paidByFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [webhookResponse, dateFilter, customRange, cardFilter, typeFilter, paidByFilter]);

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

    const rawData = filteredRawData;
    let result;
    if (activeTab === 'Investment') {
      result = processInvestment(rawData);
    } else if (activeTab === 'Client') {
      result = processClient(rawData);
    } else {
      result = processExpense(rawData, exchangeRate);
    }

    const { categoryStats, trendMap, categoriesSet } = result;

    let topCats = [];
    if (activeTab === 'Expense') {
      const EXACT_EXPENSE_CATS = ['Salary', 'One-time', 'Tools', 'Subscriptions', 'Ads', 'Overheads', 'Incentive'];
      topCats = EXACT_EXPENSE_CATS.map((catName, i) => {
        const matchKey = Object.keys(categoryStats).find(k => k.toLowerCase() === catName.toLowerCase());
        const stat = matchKey ? categoryStats[matchKey] : { value: 0, thisYear: 0, thisMonth: 0, topExpenseThisMonth: null };
        return { name: catName, ...stat, color: COLORS[i % COLORS.length] };
      });
    } else {
      const sortedCats = Object.keys(categoryStats)
        .map(k => ({ name: k, ...categoryStats[k] }))
        .sort((a, b) => b.value - a.value);
      topCats = sortedCats.map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }));
    }

    const trendArray = Object.keys(trendMap)
      .map(monthStr => ({ month: monthStr, ...trendMap[monthStr] }))
      .sort((a, b) => a.dt - b.dt);

    return {
      spendByCategory: topCats,
      categoryTrendData: trendArray,
      allFoundCategories: Array.from(categoriesSet),
    };
  }, [filteredRawData, webhookResponse, activeTab, dataTab, exchangeRate]);

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

      <div className="dashboard-filter-bar-sleek stagger-load">
        <div className="filter-row-flush">
          <CustomSelect 
            label="Date Range"
            value={dateFilter} 
            onChange={setDateFilter} 
            options={[
              { label: 'All Time', value: 'all time' },
              { label: '7 Days', value: '7 days' },
              { label: '3 Weeks', value: '3 weeks' },
              { label: '1 Month', value: '1 month' },
              { label: '3 Months', value: '3 month' },
              { label: '6 Months', value: '6 month' },
              { label: '1 Year', value: '1 year' },
              { label: 'Custom', value: 'custom' }
            ]} 
          />

          {dateFilter === 'custom' && (
            <div className="custom-filter-pill custom-range-pills">
              <input 
                type="date" 
                className="date-pill-input"
                value={customRange.start}
                onChange={e => setCustomRange(p => ({ ...p, start: e.target.value }))}
              />
              <span className="pill-separator">to</span>
              <input 
                type="date" 
                className="date-pill-input"
                value={customRange.end}
                onChange={e => setCustomRange(p => ({ ...p, end: e.target.value }))}
              />
            </div>
          )}

          <CustomSelect 
            label="Card / Paid Via"
            value={cardFilter} 
            onChange={setCardFilter} 
            options={[
              { label: 'All Cards', value: 'all' },
              ...filterOptions.cards.map(card => ({ label: card, value: card }))
            ]} 
          />

          <CustomSelect 
            label="Type"
            value={typeFilter} 
            onChange={setTypeFilter} 
            options={[
              { label: 'All Types', value: 'all' },
              ...['Salary', 'One-time', 'Tools', 'Subscriptions', 'Ads', 'Overheads', 'Incentive'].map(type => ({ label: type, value: type.toLowerCase() }))
            ]} 
          />

          <CustomSelect 
            label="Paid By"
            value={paidByFilter} 
            onChange={setPaidByFilter} 
            options={[
              { label: 'Everyone', value: 'all' },
              ...filterOptions.people.map(person => ({ label: person, value: person }))
            ]} 
          />

          <button 
            className="reset-btn-minimal"
            onClick={() => {
              setDateFilter('1 month');
              setCardFilter('all');
              setTypeFilter('all');
              setPaidByFilter('all');
              setCustomRange({ start: '', end: '' });
            }}
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="category-cards-grid">
        {spendByCategory.map((cat, index) => (
          <Card key={index} className="category-summary-card">
            <div className="category-header" style={{ marginBottom: '20px' }}>
              <span className="category-dot" style={{ backgroundColor: cat.color }}></span>
              <h4 className="category-name truncate pr-2" title={cat.name}>{cat.name}</h4>
            </div>
            
            <div className="flex justify-between items-end mb-8">
              <div className="stat-item flex-1">
                <p className="text-[10px] uppercase font-bold text-muted tracking-widest mb-1">This Year</p>
                <p className="text-lg font-bold text-primary truncate w-full" title={formatAmount(cat.thisYear)}>{formatAmount(cat.thisYear)}</p>
              </div>
              <div className="stat-item flex-1 text-right flex flex-col items-end">
                <p className="text-[10px] uppercase font-bold text-muted tracking-widest mb-1">This Month</p>
                <p className="text-lg font-bold text-primary truncate w-full text-right" title={formatAmount(cat.thisMonth)}>{formatAmount(cat.thisMonth)}</p>
              </div>
            </div>

            {cat.topExpenseThisMonth ? (
              <div className="mt-auto pt-5 border-t border-glass-border">
                <p className="text-[9px] uppercase font-bold text-amber-500/80 tracking-widest mb-2.5 flex items-center gap-1.5">
                  <Sparkles size={12} /> Top {isRevenue ? 'Payment' : 'Expense'} This Month
                </p>
                <div className="flex justify-between items-center bg-black/20 rounded-md p-2.5">
                  <p className="text-[11px] text-muted truncate max-w-[110px]" title={cat.topExpenseThisMonth.name}>
                    {cat.topExpenseThisMonth.name}
                  </p>
                  <p className="text-[11px] font-bold text-primary text-right pl-2">
                    {formatAmount(cat.topExpenseThisMonth.amt)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-auto pt-5 border-t border-glass-border">
                <p className="text-[9px] uppercase font-bold text-muted tracking-widest mb-2.5 flex items-center gap-1.5">
                  <Sparkles size={12} className="opacity-50" /> Top {isRevenue ? 'Payment' : 'Expense'} This Month
                </p>
                <div className="flex justify-between items-center bg-black/10 rounded-md p-2.5">
                  <p className="text-[11px] text-muted opacity-50 italic">No activity</p>
                </div>
              </div>
            )}
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
            <div className="flex flex-col items-center justify-center h-full w-full gap-3 opacity-50 py-10">
              <Database size={32} className="text-muted" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">No Data Found</p>
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
            <div className="flex flex-col items-center justify-center h-full w-full gap-3 opacity-50 py-10">
              <Database size={32} className="text-muted" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">No Distribution Data</p>
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
