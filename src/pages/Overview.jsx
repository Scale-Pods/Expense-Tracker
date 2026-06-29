import React, { useMemo, useState } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import Badge from '../components/common/Badge';
import { useWebhookData } from '../hooks/useWebhookData';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area, LabelList
} from 'recharts';
import { format, subDays, subMonths, subYears, isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  Clock, 
  X, 
  ChevronDown,
  DollarSign, 
  Search,
  Receipt,
  FileText,
  PlusCircle
} from 'lucide-react';
import { useTheme } from '../hooks/ThemeContext';
import { useCurrency } from '../hooks/CurrencyContext';
import QuickEntryDrawer from '../components/dashboard/QuickEntryDrawer';
import CubeLoader from '../components/ui/cube-loader';
import CustomSelect from '../components/common/CustomSelect';
import '../styles/dashboard.css';

const Overview = () => {
  const { theme } = useTheme();
  const { currency, symbol, formatAmount, convert, exchangeRate } = useCurrency();
  const { data: webhookResponse, loading, error, refetch: refetchExpenses } = useWebhookData();
  const { data: remindersResponse, refetch: refetchReminders } = useWebhookData('Reminder');
  const { data: revenueResponse } = useWebhookData('Client');

  const { data: cardsResponse } = useWebhookData('Cards');

  const [activePieIndex, setActivePieIndex] = React.useState(null);
  const [isAreaHovered, setIsAreaHovered] = React.useState(false);
  
  // Filtering state
  const [dateFilter, setDateFilter] = React.useState('1 month'); // Default
  const [customRange, setCustomRange] = React.useState({ start: '', end: '' });
  const [cardFilter, setCardFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [paidByFilter, setPaidByFilter] = useState('all');
  const [isEntryDrawerOpen, setIsEntryDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  const handleRefresh = React.useCallback(() => {
    refetchExpenses();
    refetchReminders();
  }, [refetchExpenses, refetchReminders]);

  const overviewData = useMemo(() => {
    const defaultData = {
      KPIData: { totalMonthlySpend: 0, totalAnnualCommitments: 0, recurringSpendPercentage: 0, activeServicesCount: 0 },
      spendByCategory: [], monthlySpendTrend: [], topServices: [], upcomingRenewals: [],
      revenueStats: { accountsReceivable: 0, realizedRevenue: 0, recurringRevenue: 0 }
    };

    let accountsReceivable = 0;
    let realizedRevenue = 0;
    let recurringRevenue = 0;

    if (revenueResponse?.data && Array.isArray(revenueResponse.data)) {
      revenueResponse.data.forEach(item => {
        // Apply Date Filter to Revenue
        let dt = null;
        if (item.Date) {
          const parts = item.Date.split('/');
          if (parts.length === 3) dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          else dt = new Date(item.Date);
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
          
          if (startDate && isBefore(dt, startOfDay(startDate))) return;
          if (dateFilter === 'custom' && customRange.end && isAfter(dt, endOfDay(new Date(customRange.end)))) return;
        }

        const getVal = (keys) => {
          for (const k of keys) if (item[k] !== undefined) return item[k];
          return 0;
        };
        const realised = parseFloat(String(getVal(['Realised Revenue', 'RealisedRevenue', 'Realised', 'realisedRevenue'])).replace(/[^0-9.-]/g, '')) || 0;
        const recv = parseFloat(String(getVal(['Receivables', 'receivables', 'Receivable'])).replace(/[^0-9.-]/g, '')) || 0;
        const income = parseFloat(String(getVal(['Income Amount', 'IncomeAmount', 'Income', 'incomeAmount'])).replace(/[^0-9.-]/g, '')) || 0;
        realizedRevenue += realised;
        accountsReceivable += recv;
        const status = (item.Status || item.status || '').toLowerCase();
        if (status === 'active') recurringRevenue += income;
      });
    }

    if (!webhookResponse?.data || !Array.isArray(webhookResponse.data)) {
      return { ...defaultData, revenueStats: { accountsReceivable, realizedRevenue, recurringRevenue } };
    }

    const expenses = (webhookResponse.data || []).filter(exp => {
      // 1. Date Filter
      let dt = null;
      if (exp.Date) {
        const parts = exp.Date.split('/');
        if (parts.length === 3) dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        else dt = new Date(exp.Date);
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

    let monthlySpend = 0;
    let annualSpend = 0;
    let recurringCount = 0;
    let validDateExpenses = [];
    const categoryMap = {};
    const serviceMap = {};

      expenses.forEach(exp => {
        let amt = 0;
        const usdStr = String(exp["Amount in $ (If Applicable)"] || "");
        const inrStr = String(exp["Amount in ₹"] || "");
        const hasUsd = usdStr && usdStr !== "0" && usdStr !== "INR Not Available";
        const hasInr = inrStr && inrStr !== "0" && inrStr !== "INR Not Available";

        if (hasUsd && hasInr) {
          amt = parseFloat(usdStr.replace(/[^0-9.]/g, '')) || 0;
        } else if (hasInr) {
          amt = (parseFloat(inrStr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate;
        } else if (hasUsd) {
          amt = parseFloat(usdStr.replace(/[^0-9.]/g, '')) || 0;
        }
        
        exp.amt = amt; // Fix: Attach amt to exp object

        let dt = null;
        if (exp.Date) {
          const parts = exp.Date.split('/');
          if (parts.length === 3) dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          else dt = new Date(exp.Date);
          if (dt && !isNaN(dt.getTime())) {
            validDateExpenses.push({ ...exp, dt, amt });
          }
        }

        const now = new Date();
        if (dt && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()) {
          monthlySpend += amt;
        }
        annualSpend += amt * 12;
        const type = exp.Type?.toLowerCase() || '';
        if (type.includes('recurring') || type.includes('subscription') || type.includes('salary')) recurringCount++;
      });

    let parsedReminders = [];
    if (remindersResponse?.data && Array.isArray(remindersResponse.data)) {
      parsedReminders = remindersResponse.data.map((item, idx) => {
        const title = item.Service || item["Tracker Title"] || item.Title || item.title || item.Description || item["Spent On"] || 'Untitled Reminder';
        let dayOfMonth = item["Due Date"] || item["Day of Month"] || item.DayOfMonth || '1';
        let amt = 0;
        const usd = String(item["Amount in $ (If Applicable)"] || "0");
        const inr = String(item["Amount in ₹"] || "0");
        if (usd && usd !== "0") amt = parseFloat(usd.replace(/[^0-9.]/g, '')) || 0;
        else if (inr && inr !== "0") amt = (parseFloat(inr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate; 
        return { id: item.UniqueID || `rem-${idx}`, name: title, date: `Day ${dayOfMonth} monthly`, amount: amt, status: item.Status || 'pending' };
      }).filter(r => r.name !== 'Untitled Reminder' || r.amount > 0);
    }

    const activeServicesCount = new Set(expenses.map(e => (e["Spent On"] || '').toLowerCase().trim())).size;
    const recurringPercentage = expenses.length ? Math.round((recurringCount / expenses.length) * 100) : 0;
    const COLORS = ['#00E5CC', '#7C3AED', '#F59E0B', '#EF4444', '#10B981'];
    
    // Dynamically change grouping based on filters
    const isFiltered = typeFilter !== 'all' || cardFilter !== 'all' || paidByFilter !== 'all';
    const displayMap = {};
    const displayNames = {};

    expenses.forEach(exp => {
      const amt = exp.amt || 0;
      // If filtered, show individual items. Otherwise show categories.
      const rawLabel = isFiltered 
        ? (exp["Spent On"] || exp.Service || exp.Title || 'Unnamed Item')
        : (exp.Category || exp["Category"] || exp.Type || 'Unknown');
      
      const key = rawLabel.toLowerCase().trim();
      displayMap[key] = (displayMap[key] || 0) + amt;
      displayNames[key] = rawLabel;
    });

    const sortedCats = Object.keys(displayMap).map(k => ({ name: displayNames[k], value: displayMap[k] })).sort((a,b) => b.value - a.value);
    let topCats = sortedCats.slice(0, 10).map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }));
    if (sortedCats.length > 10) topCats.push({ name: 'Others', value: sortedCats.slice(10).reduce((sum, item) => sum + item.value, 0), color: 'rgba(255,255,255,0.3)' });

    const monthlyMap = {};
    validDateExpenses.forEach(exp => {
      const monthStr = format(exp.dt, 'MMM yyyy');
      monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + exp.amt;
    });
    const trendArray = Object.keys(monthlyMap).map(k => ({ month: k, amount: monthlyMap[k] }));

    return {
      KPIData: { totalMonthlySpend: monthlySpend, totalAnnualCommitments: annualSpend, recurringSpendPercentage: recurringPercentage, activeServicesCount },
      spendByCategory: topCats,
      monthlySpendTrend: trendArray.length ? trendArray : [{month: 'This Month', amount: monthlySpend}],
      topServices: sortedCats.slice(0, 5),
      upcomingRenewals: parsedReminders.slice(0, 5),
      revenueStats: { 
        accountsReceivable, 
        realizedRevenue, 
        recurringRevenue,
        netProfit: realizedRevenue - (monthlySpend * exchangeRate)
      }
    };
  }, [webhookResponse, remindersResponse, revenueResponse, exchangeRate, dateFilter, customRange, cardFilter, typeFilter, paidByFilter]);

  const { KPIData, spendByCategory, monthlySpendTrend, topServices, upcomingRenewals, revenueStats } = overviewData;

  if (loading && !webhookResponse) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CubeLoader />
      </div>
    );
  }

  const isDark = theme === 'dark';
  const chartTheme = {
    tooltip: {
      contentStyle: { 
        background: isDark ? 'rgba(10, 20, 50, 0.8)' : 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(16px)', 
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, 
        borderRadius: '12px', 
        padding: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
      },
      itemStyle: { color: isDark ? 'white' : '#111827', fontSize: '13px', fontFamily: 'DM Sans' },
      labelStyle: { color: isDark ? 'rgba(255,255,255,0.5)' : '#4B5563', marginBottom: '4px', fontSize: '11px' }
    },
    text: isDark ? 'rgba(255,255,255,0.4)' : '#374151',
    grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-sleek stagger-load flex justify-between items-end">
        <div className="header-text-group">
          <p className="subtitle-muted">Real-time visibility into your financial ecosystem</p>
          <h1 className="title-bold">Dashboard Overview</h1>
        </div>
        <div className="header-actions">
          <button 
            className="add-entry-btn-sleek"
            onClick={() => setIsEntryDrawerOpen(true)}
          >
            <PlusCircle size={16} />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      <div className={`dashboard-filter-bar-sleek stagger-load ${showFilters ? 'open' : ''}`}>
        <button 
          className="filter-toggle-btn"
          onClick={() => setShowFilters(v => !v)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="20" y2="12"/>
            <line x1="12" y1="18" x2="20" y2="18"/>
          </svg>
          <span>Filters</span>
          <ChevronDown size={14} className={`filter-chevron ${showFilters ? 'open' : ''}`} />
        </button>

        <div className="filter-dropdown-content">
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
              <div className="pill-input-wrapper">
                <input 
                  type="date" 
                  value={customRange.start} 
                  onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                  className="date-pill-input"
                />
              </div>
              <span className="pill-separator">to</span>
              <div className="pill-input-wrapper">
                <input 
                  type="date" 
                  value={customRange.end} 
                  onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                  className="date-pill-input"
                />
              </div>
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
            <X size={14} />
            <span>Reset</span>
          </button>
        </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card cyan">
          <div className="kpi-icon-wrapper"><DollarSign size={20} color="#00E5CC" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Monthly Spend</p>
            <h3 className="kpi-value">{formatAmount(KPIData.totalMonthlySpend)}</h3>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-icon-wrapper"><Clock size={20} color="#F59E0B" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Accounts Receivable</p>
            <h3 className="kpi-value">₹{(revenueStats?.accountsReceivable || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon-wrapper"><Wallet size={20} color="#10B981" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Realized Revenue</p>
            <h3 className="kpi-value">₹{(revenueStats?.realizedRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-icon-wrapper"><TrendingUp size={20} color="#7C3AED" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Net Profit (Monthly)</p>
            <h3 className="kpi-value">₹{(revenueStats?.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <div className="charts-carousel">
          <div className="chart-card">
            <h3 className="text-white mb-6 font-semibold">Spend by Category</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={spendByCategory.map(d => ({ ...d, value: Number(convert(d.value)) || 0 }))} 
                layout="vertical"
                margin={{ left: 20, right: 40, top: 20, bottom: 20 }}
              >
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: chartTheme.text, fontSize: 11, fontWeight: 500 }} 
                  width={120} 
                />
                <Tooltip 
                  {...chartTheme.tooltip} 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  formatter={(v) => `${symbol}${Number(v).toLocaleString()}`} 
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                   {spendByCategory.map((entry, index) => (
                    <Cell key={`bar-cat-${index}`} fill={entry.color} />
                  ))}
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    formatter={(v) => `${symbol}${Number(v).toLocaleString()}`}
                    style={{ fill: chartTheme.text, fontSize: '10px', fontWeight: 'bold' }}
                    offset={10}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3 className="text-white mb-6 font-semibold">Monthly Spend Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart 
                data={monthlySpendTrend.map(d => ({ ...d, amount: convert(d.amount) }))}
                onMouseEnter={() => setIsAreaHovered(true)}
                onMouseLeave={() => setIsAreaHovered(false)}
              >
                <defs>
                  <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5CC" stopOpacity={isDark ? 0.3 : 0.6}/>
                    <stop offset="95%" stopColor="#00E5CC" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTheme.text, fontSize: 11 }} tickFormatter={(v) => `${symbol}${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                <Tooltip {...chartTheme.tooltip} formatter={(v) => `${symbol}${Number(v).toLocaleString()}`} />
                <Area type="monotone" dataKey="amount" stroke="#00E5CC" strokeWidth={3} fillOpacity={1} fill="url(#cyanGradient)" filter={isDark ? "drop-shadow(0 0 8px #00E5CC)" : "none"} dot={{ r: 4, fill: '#00E5CC', strokeWidth: 0 }}>
                   {!isAreaHovered && (
                     <LabelList 
                       dataKey="amount" 
                       position="top" 
                       offset={10}
                       formatter={(v) => `${symbol}${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}`}
                       style={{ fill: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: '10px', fontWeight: 'bold' }}
                     />
                   )}
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="renewals-section">
          <div className="chart-card mb-6">
            <h3 className="text-white mb-6 font-semibold">Expensive Categories</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topServices.map(d => ({ ...d, value: Number(convert(d.value)) || 0 }))} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartTheme.text, fontSize: 11 }} width={80} />
                <Tooltip 
                  {...chartTheme.tooltip} 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  formatter={(v) => `${symbol}${Number(v).toLocaleString()}`} 
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={16}>
                   {topServices.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={`url(#barGrad-${index})`} />
                  ))}
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    formatter={(v) => `${symbol}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    style={{ fill: chartTheme.text, fontSize: '10px', fontWeight: 'bold' }}
                    offset={10}
                  />
                </Bar>
                <defs>
                   {topServices.map((_, i) => (
                    <linearGradient key={`barGrad-${i}`} id={`barGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00E5CC" />
                      <stop offset="100%" stopColor="#0EA5E9" />
                    </linearGradient>
                  ))}
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card renewals-card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold">Upcoming Renewals</h3>
              <a href="#/reminders" className="text-xs text-primary font-semibold hover:underline">View All</a>
            </div>
            <div className="renewals-list">
              {upcomingRenewals.map((item) => (
                <div key={item.id} className="renewal-item">
                  <div className="renewal-info">
                    <h4>{item.name}</h4>
                    <p>{item.date}</p>
                  </div>
                  <div className="status-badge active">
                    {formatAmount(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <QuickEntryDrawer 
        onRefresh={handleRefresh} 
        isOpen={isEntryDrawerOpen} 
        setIsOpen={setIsEntryDrawerOpen} 
      />
    </div>
  );
};

export default Overview;
