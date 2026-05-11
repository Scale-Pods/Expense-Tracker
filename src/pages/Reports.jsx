import React, { useMemo, useState } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { Download, Loader, AlertCircle, Info, ArrowUpDown } from 'lucide-react';
import { useTheme } from '../hooks/ThemeContext';
import { useWebhookData } from '../hooks/useWebhookData';
import { useCurrency } from '../hooks/CurrencyContext';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import CubeLoader from '../components/ui/cube-loader';
import '../styles/reports.css';

const Reports = () => {
  const { theme } = useTheme();
  const { currency, symbol, formatAmount, convert, exchangeRate } = useCurrency();
  const { data: expenseResponse, loading: expLoading, error: expError } = useWebhookData('Expense');
  const { data: revenueResponse, loading: revLoading, error: revError } = useWebhookData('Client');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isCustomRangeActive, setIsCustomRangeActive] = useState(false);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const loading = expLoading || revLoading;
  const error = expError || revError;

  const chartConfig = useMemo(() => ({
    gridStroke: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    tooltipBg: theme === 'dark' ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
    tooltipBorder: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    tickColor: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    textColor: theme === 'dark' ? '#FFFFFF' : '#1F2937',
  }), [theme]);

  const {
    projectionData,
    recurringData,
    currentBurn,
    projectedEOY,
    runwayImpact,
    allExpenses,
    allRevenues
  } = useMemo(() => {
    const defaultData = {
      projectionData: [],
      recurringData: [],
      currentBurn: 0,
      projectedEOY: 0,
      runwayImpact: 0,
      allExpenses: [],
      allRevenues: []
    };

    if (!expenseResponse?.data || !Array.isArray(expenseResponse.data)) return defaultData;

    const expenses = expenseResponse.data;
    const revenues = revenueResponse?.data || [];
    const now = new Date();
    
    const processedExpenses = expenses.map(exp => {
      let amt = 0;
      const usd = String(exp["Amount in $ (If Applicable)"] || "0");
      const inr = String(exp["Amount in ₹"] || "0");
      if (usd && usd !== "0" && usd !== "INR Not Available") {
        amt = parseFloat(usd.replace(/[^0-9.]/g, '')) || 0;
      } else if (inr && inr !== "0" && inr !== "INR Not Available") {
        amt = (parseFloat(inr.replace(/[^0-9.]/g, '')) || 0) / (exchangeRate || 83.5);
      }
      let dt = null;
      if (exp.Date) {
        const parts = exp.Date.split('/');
        if (parts.length === 3) {
          dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          dt = new Date(exp.Date);
        }
      }
      return { ...exp, amt, dt };
    }).filter(e => e.dt && !isNaN(e.dt.getTime()));

    const months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));
    const recData = months.map(monthDt => {
      const monthStr = format(monthDt, 'MMM');
      const monthStart = startOfMonth(monthDt);
      const monthEnd = endOfMonth(monthDt);
      const monthExpenses = processedExpenses.filter(e => isWithinInterval(e.dt, { start: monthStart, end: monthEnd }));
      const recurring = monthExpenses.filter(e => {
          const type = e.Type?.toLowerCase() || '';
          return type.includes('recurring') || type.includes('subscription') || type.includes('salary');
      }).reduce((sum, e) => sum + e.amt, 0);
      const oneTime = monthExpenses.filter(e => {
          const type = e.Type?.toLowerCase() || '';
          return !type.includes('recurring') && !type.includes('subscription') && !type.includes('salary');
      }).reduce((sum, e) => sum + e.amt, 0);
      return { month: monthStr, Recurring: Math.round(recurring), OneTime: Math.round(oneTime) };
    });

    const projMonths = Array.from({ length: 6 }).map((_, i) => subMonths(now, 2 - i));
    let lastKnownActual = 0;
    const projData = projMonths.map((monthDt, i) => {
      const monthStr = format(monthDt, 'MMM');
      const monthStart = startOfMonth(monthDt);
      const monthEnd = endOfMonth(monthDt);
      const actualSpend = processedExpenses.filter(e => isWithinInterval(e.dt, { start: monthStart, end: monthEnd })).reduce((sum, e) => sum + e.amt, 0);
      if (i < 3) {
        lastKnownActual = actualSpend || lastKnownActual;
        return { month: monthStr, Actual: Math.round(actualSpend), Projected: Math.round(actualSpend) };
      } else {
        lastKnownActual = lastKnownActual * 1.05;
        return { month: monthStr, Projected: Math.round(lastKnownActual) };
      }
    });

    const currentMthBurn = processedExpenses.filter(e => isWithinInterval(e.dt, { start: startOfMonth(now), end: endOfMonth(now) })).reduce((sum, e) => sum + e.amt, 0);
    const prevMthBurn = processedExpenses.filter(e => isWithinInterval(e.dt, { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) })).reduce((sum, e) => sum + e.amt, 0);
    const projEOY = currentMthBurn * (1 + (Math.max(0, 12 - (now.getMonth() + 1))));

    return { projectionData: projData, recurringData: recData, currentBurn: currentMthBurn, projectedEOY: projEOY, runwayImpact: prevMthBurn ? ((currentMthBurn - prevMthBurn) / prevMthBurn) * 100 : 0, allExpenses: processedExpenses, allRevenues: revenues };
  }, [expenseResponse, revenueResponse, exchangeRate]);

  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      months.push({ label: format(d, 'MMMM yyyy'), value: format(d, 'yyyy-MM') });
    }
    return months;
  }, []);

  const filteredStats = useMemo(() => {
    let start, end;
    if (isCustomRangeActive && customRange.start && customRange.end) {
      start = new Date(customRange.start);
      end = new Date(customRange.end);
    } else {
      const [year, month] = selectedMonth.split('-');
      const mDate = new Date(parseInt(year), parseInt(month) - 1);
      start = startOfMonth(mDate);
      end = endOfMonth(mDate);
    }
    const monthlyExp = allExpenses.filter(e => isWithinInterval(e.dt, { start, end }));
    const totalExp = monthlyExp.reduce((sum, e) => sum + e.amt, 0);
    const monthlyRev = allRevenues.map(item => {
      const val = item['Realised Revenue'] || item.RealisedRevenue || item.Realised || 0;
      const amt = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
      let dt = null;
      const dateStr = item['Realised Date'] || item.realisedDate || '';
      if (dateStr.includes('/')) {
        const p = dateStr.split('/');
        dt = new Date(`${p[2]}-${p[1]}-${p[0]}`);
      }
      return { ...item, amt: amt / (exchangeRate || 83.5), dt };
    }).filter(r => r.dt && isWithinInterval(r.dt, { start, end }));
    const totalRev = monthlyRev.reduce((sum, r) => sum + r.amt, 0);
    return { revenue: totalRev, expense: totalExp, profit: totalRev - totalExp, revenueItems: monthlyRev, expenseItems: monthlyExp };
  }, [allExpenses, allRevenues, selectedMonth, exchangeRate]);

  const comparisonPieData = [
    { name: 'Revenue', value: Math.round(filteredStats.revenue), color: '#10B981' },
    { name: 'Expense', value: Math.round(filteredStats.expense), color: '#F59E0B' }
  ];

  const convertedProjectionData = useMemo(() => projectionData.map(d => ({ ...d, Actual: d.Actual !== undefined ? convert(d.Actual) : undefined, Projected: convert(d.Projected) })), [projectionData, convert]);
  const convertedRecurringData = useMemo(() => recurringData.map(d => ({ ...d, Recurring: convert(d.Recurring), OneTime: convert(d.OneTime) })), [recurringData, convert]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CubeLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <div className="p-6 bg-red-50/5 rounded-xl border border-red-500/20 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <p className="text-red-400">Failed to generate reports. {error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container redesigned">
      <div className="reports-header">
        <div className="header-title-group">
          <h1>Financial Reports</h1>
          <p>{isCustomRangeActive ? 'Custom Period Analysis' : 'Monthly projections and fiscal health analysis'}</p>
        </div>
        <div className="header-filters">
          {isCustomRangeActive && (
            <div className="custom-range-bar" style={{ margin: 0, padding: '8px 16px', borderRadius: '12px' }}>
              <div className="range-inputs" style={{ gap: '1rem' }}>
                <div className="range-field">
                  <input type="date" value={customRange.start} onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} style={{ padding: '6px 10px', fontSize: '12px' }} />
                </div>
                <div className="range-field">
                  <input type="date" value={customRange.end} onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} style={{ padding: '6px 10px', fontSize: '12px' }} />
                </div>
              </div>
            </div>
          )}
          <div className="custom-dropdown-container">
            <select 
              value={selectedMonth} 
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomRangeActive(true);
                } else {
                  setSelectedMonth(e.target.value);
                  setIsCustomRangeActive(false);
                }
              }}
              className="custom-dropdown-trigger"
              style={{ appearance: 'none', paddingRight: '40px' }}
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              <option value="custom">Custom Range...</option>
            </select>
            <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <ArrowUpDown size={14} className="opacity-50" />
            </div>
          </div>
        </div>
      </div>

      <div className="reports-grid">
        <Card className="chart-card-premium accent-cyan">
          <div className="chart-header">
            <h3>Projected Spend</h3>
            <p>MoM trajectory vs Actual</p>
          </div>
          <div style={{ height: '180px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={convertedProjectionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartConfig.gridStroke} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} tickFormatter={(val) => `${symbol}${val>=1000?(val/1000).toFixed(0)+'k':val}`} />
                <Tooltip contentStyle={{ borderRadius: '12px', background: chartConfig.tooltipBg, border: `1px solid ${chartConfig.tooltipBorder}`, color: chartConfig.textColor }} />
                <Area type="monotone" dataKey="Actual" stroke="#14B8A6" fill="rgba(20, 184, 166, 0.1)" strokeWidth={2} />
                <Area type="monotone" dataKey="Projected" stroke="#9CA3AF" fill="transparent" strokeDasharray="5 5" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="chart-card-premium accent-yellow">
          <div className="chart-header">
            <h3>Recurring vs One-time</h3>
            <p>Spending nature analysis</p>
          </div>
          <div style={{ height: '180px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={convertedRecurringData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartConfig.gridStroke} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} tickFormatter={(val) => `${symbol}${val>=1000?(val/1000).toFixed(0)+'k':val}`} />
                <Tooltip cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', background: chartConfig.tooltipBg, border: `1px solid ${chartConfig.tooltipBorder}`, color: chartConfig.textColor }} />
                <Bar dataKey="Recurring" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="OneTime" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="horizontal-legend">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#10B981' }}></div> Recurring</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#F59E0B' }}></div> One-Time</div>
          </div>
        </Card>

        <Card className="chart-card-premium accent-pink">
          <div className="chart-header">
            <h3>Collection Health</h3>
            <p>Revenue vs Expense ratio</p>
          </div>
          <div className="donut-legend-row">
            <div className="compact-donut-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={comparisonPieData.map(d => ({ ...d, value: convert(d.value) }))} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                    {comparisonPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(val) => `${symbol}${val.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="compact-legend">
                {comparisonPieData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color }}></div>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{d.name}</span>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        <Card className="chart-card-premium accent-green">
          <div className="chart-header">
            <h3>Profitability</h3>
            <p>Current month net performance</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', padding: '0.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: filteredStats.profit >= 0 ? '#10B981' : '#F43F5E', margin: 0 }}>
              {filteredStats.profit >= 0 ? '+' : ''}{symbol}{Math.round(convert(filteredStats.profit)).toLocaleString()}
            </h2>
            <div style={{ width: '100%', display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ flex: 1, padding: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <p style={{ fontSize: '10px', color: '#10B981', margin: 0, fontWeight: '700' }}>REV</p>
                <p style={{ fontSize: '12px', fontWeight: '800', margin: 0 }}>{symbol}{Math.round(convert(filteredStats.revenue)).toLocaleString()}</p>
              </div>
              <div style={{ flex: 1, padding: '0.5rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                <p style={{ fontSize: '10px', color: '#F59E0B', margin: 0, fontWeight: '700' }}>EXP</p>
                <p style={{ fontSize: '12px', fontWeight: '800', margin: 0 }}>{symbol}{Math.round(convert(filteredStats.expense)).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="summary-section">
        <Card title="Monthly Burn Summary">
          <div className="burn-stats-compact">
            <div className="burn-item-compact">
              <span className="burn-label-compact">Monthly Burn</span>
              <span className="burn-value-compact">{formatAmount(currentBurn)}</span>
              <span className={`burn-change-compact ${runwayImpact > 0 ? 'negative' : 'positive'}`}>
                {runwayImpact > 0 ? '+' : ''}{runwayImpact.toFixed(1)}% MoM
              </span>
            </div>
            <div className="burn-divider-compact"></div>
            <div className="burn-item-compact">
              <span className="burn-label-compact">EOY Projection</span>
              <span className="burn-value-compact">{formatAmount(projectedEOY)}</span>
              <span className="burn-change-compact neutral">Trajectory analysis</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
