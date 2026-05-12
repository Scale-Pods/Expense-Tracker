import React, { useMemo } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import Badge from '../components/common/Badge';
import { useWebhookData } from '../hooks/useWebhookData';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area, LabelList
} from 'recharts';
import { DollarSign, Calendar, RefreshCw, Layers, AlertCircle, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../hooks/ThemeContext';
import { useCurrency } from '../hooks/CurrencyContext';
import QuickEntryDrawer from '../components/dashboard/QuickEntryDrawer';
import CubeLoader from '../components/ui/cube-loader';
import '../styles/dashboard.css';

const Overview = () => {
  const { theme } = useTheme();
  const { currency, symbol, formatAmount, convert, exchangeRate } = useCurrency();
  const { data: webhookResponse, loading, error, refetch: refetchExpenses } = useWebhookData();
  const { data: remindersResponse, refetch: refetchReminders } = useWebhookData('Reminder');

  const [activePieIndex, setActivePieIndex] = React.useState(null);
  const [isAreaHovered, setIsAreaHovered] = React.useState(false);

  const handleRefresh = React.useCallback(() => {
    refetchExpenses();
    refetchReminders();
  }, [refetchExpenses, refetchReminders]);

  const {
    KPIData,
    spendByCategory,
    monthlySpendTrend,
    topServices,
    upcomingRenewals
  } = useMemo(() => {
    const defaultData = {
      KPIData: { totalMonthlySpend: 0, totalAnnualCommitments: 0, recurringSpendPercentage: 0, activeServicesCount: 0 },
      spendByCategory: [], monthlySpendTrend: [], topServices: [], upcomingRenewals: []
    };

    if (!webhookResponse?.data || !Array.isArray(webhookResponse.data)) return defaultData;

    const expenses = webhookResponse.data;
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
      
      if (usdStr && usdStr !== "0" && usdStr !== "INR Not Available") {
        amt = parseFloat(usdStr.replace(/[^0-9.]/g, '')) || 0;
      } else if (inrStr && inrStr !== "0" && inrStr !== "INR Not Available") {
        amt = (parseFloat(inrStr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate;
      }

      monthlySpend += amt;
      annualSpend += amt * 12;
      const type = exp.Type?.toLowerCase() || '';
      if (type.includes('recurring') || type.includes('subscription') || type.includes('salary')) {
        recurringCount++;
      }

      let dt = new Date();
      if (exp.Date) {
        try {
          const parts = exp.Date.split('/');
          if (parts.length === 3) {
            dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            dt = new Date(exp.Date);
          }
          if (!isNaN(dt.getTime())) {
            validDateExpenses.push({ ...exp, dt, amt });
          }
        } catch { /* ignore parse error */ }
      }

      const rawCategory = exp.Category || exp["Category"] || exp.Type || exp["Type"] || exp["Spent On"] || 'Unknown';
      const categoryKey = rawCategory.toLowerCase().trim();
      categoryMap[categoryKey] = (categoryMap[categoryKey] || 0) + amt;
      serviceMap[categoryKey] = (serviceMap[categoryKey] || 0) + amt;
      if (!serviceMap._displayNames) serviceMap._displayNames = {};
      if (!serviceMap._displayNames[categoryKey]) serviceMap._displayNames[categoryKey] = rawCategory;
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
    const sortedCats = Object.keys(categoryMap).map(k => ({ name: serviceMap._displayNames[k], value: categoryMap[k] })).sort((a,b) => b.value - a.value);
    let topCats = sortedCats.slice(0, 5).map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }));
    if (sortedCats.length > 5) topCats.push({ name: 'Others', value: sortedCats.slice(5).reduce((sum, item) => sum + item.value, 0), color: 'rgba(255,255,255,0.3)' });

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
      upcomingRenewals: parsedReminders.slice(0, 5)
    };
  }, [webhookResponse, remindersResponse, exchangeRate]);

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
    <div className="dashboard-container stagger-load">
      <div className="payments-header" style={{ marginBottom: '2.5rem' }}>
        <div className="header-title-group">
          <p className="top-tagline">Real-time visibility into your financial ecosystem</p>
          <h1>Dashboard Overview</h1>
        </div>
      </div>
      <QuickEntryDrawer onRefresh={handleRefresh} />

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
          <div className="kpi-icon-wrapper"><Calendar size={20} color="#F59E0B" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Annual Commitments</p>
            <h3 className="kpi-value">{formatAmount(KPIData.totalAnnualCommitments)}</h3>
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon-wrapper"><RefreshCw size={20} color="#10B981" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Recurring Spend</p>
            <h3 className="kpi-value">{KPIData.recurringSpendPercentage}%</h3>
          </div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-icon-wrapper"><Layers size={20} color="#7C3AED" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Active Services</p>
            <h3 className="kpi-value">{KPIData.activeServicesCount}</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <div className="charts-carousel">
          <div className="chart-card">
            <h3 className="text-white mb-6 font-semibold">Spend by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {spendByCategory.map((entry, index) => (
                    <filter key={`glow-${index}`} id={`glow-${index}`}>
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  ))}
                </defs>
                <Pie
                  data={spendByCategory.map(d => ({ ...d, value: convert(d.value) }))}
                  cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value"
                  stroke="none"
                  onMouseEnter={(_, index) => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                    if (activePieIndex === index) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 25;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
                        {symbol}{value >= 1000 ? Math.round(value/1000) + 'k' : Math.round(value)}
                      </text>
                    );
                  }}
                >
                  {spendByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: isDark ? `drop-shadow(0 0 6px ${entry.color})` : 'none' }} />
                  ))}
                </Pie>
                <Tooltip {...chartTheme.tooltip} formatter={(v) => `${symbol}${Number(v).toLocaleString()}`} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '30px', color: chartTheme.text }} />
              </PieChart>
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
    </div>
  );
};

export default Overview;
