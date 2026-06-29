import React, { useMemo, useState } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LabelList
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
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);
  
  // Hover tracking states for labels
  const [activePieIndex, setActivePieIndex] = useState(null);
  const [isAreaHovered, setIsAreaHovered] = useState(false);
  const [hoveredBarKey, setHoveredBarKey] = useState(null);

  const loading = expLoading || revLoading;
  const error = expError || revError;

  const chartConfig = useMemo(() => ({
    gridStroke: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    tooltipBg: theme === 'dark' ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
    tooltipBorder: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
    tickColor: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)',
    textColor: theme === 'dark' ? '#FFFFFF' : '#111827',
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
      const usdStr = String(exp["Amount in $ (If Applicable)"] || "0");
      const inrStr = String(exp["Amount in ₹"] || "0");
      const hasUsd = usdStr !== "0" && usdStr !== "INR Not Available";
      const hasInr = inrStr !== "0" && inrStr !== "INR Not Available";

      if (hasUsd && hasInr) {
        amt = parseFloat(usdStr.replace(/[^0-9.]/g, '')) || 0;
      } else if (hasInr) {
        amt = (parseFloat(inrStr.replace(/[^0-9.]/g, '')) || 0) / (exchangeRate || 1);
      } else if (hasUsd) {
        amt = parseFloat(usdStr.replace(/[^0-9.]/g, '')) || 0;
      }
      let dt = null;
      if (exp.Date) {
        const parts = exp.Date.split('/');
        if (parts.length === 3) {
          dt = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
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
        dt = new Date(`${p[2]}-${p[0]}-${p[1]}`);
      }
      return { ...item, amt: amt / (exchangeRate || 1), dt };
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
          <p className="top-tagline">{isCustomRangeActive ? 'Custom Period Analysis' : 'Monthly projections and fiscal health analysis'}</p>
          <h1>Financial Reports</h1>
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
            <div 
              className={`custom-dropdown-trigger ${isMonthSelectOpen ? 'active' : ''}`}
              onClick={() => setIsMonthSelectOpen(!isMonthSelectOpen)}
            >
              <ArrowUpDown size={14} className="opacity-50" />
              <span>{isCustomRangeActive ? 'Custom Range' : monthOptions.find(opt => opt.value === selectedMonth)?.label}</span>
            </div>
            
            {isMonthSelectOpen && (
              <div className="custom-dropdown-menu animate-dropdown" style={{ right: 0 }}>
                <button 
                  className={`dropdown-item ${isCustomRangeActive ? 'selected' : ''}`}
                  onClick={() => { setIsCustomRangeActive(true); setIsMonthSelectOpen(false); }}
                >
                  Custom Range...
                </button>
                <div className="menu-divider" />
                {monthOptions.map(opt => (
                  <button 
                    key={opt.value} 
                    className={`dropdown-item ${(!isCustomRangeActive && selectedMonth === opt.value) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedMonth(opt.value);
                      setIsCustomRangeActive(false);
                      setIsMonthSelectOpen(false);
                    }}
                  >
                    {opt.label}
                    {(!isCustomRangeActive && selectedMonth === opt.value) && <div className="dot"></div>}
                  </button>
                ))}
              </div>
            )}
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
                <Area 
                  type="monotone" 
                  dataKey="Actual" 
                  stroke="#14B8A6" 
                  fill="rgba(20, 184, 166, 0.1)" 
                  strokeWidth={2}
                  onMouseEnter={() => setIsAreaHovered(true)}
                  onMouseLeave={() => setIsAreaHovered(false)}
                >
                  {!isAreaHovered && (
                    <LabelList 
                      dataKey="Actual" 
                      position="top" 
                      offset={10}
                      formatter={(v) => v > 0 ? `${symbol}${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}` : ''}
                      style={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: '9px', fontWeight: 'bold' }}
                    />
                  )}
                </Area>
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
                <Bar 
                  dataKey="Recurring" 
                  stackId="a" 
                  fill="#10B981" 
                  radius={[4, 4, 0, 0]} 
                  onMouseEnter={() => setHoveredBarKey('Recurring')}
                  onMouseLeave={() => setHoveredBarKey(null)}
                >
                  {hoveredBarKey !== 'Recurring' && (
                    <LabelList 
                      dataKey="Recurring" 
                      position="center" 
                      formatter={(v) => v > 0 ? `${symbol}${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}` : ''}
                      style={{ fill: '#fff', fontSize: '8px', fontWeight: 'bold', pointerEvents: 'none' }}
                    />
                  )}
                </Bar>
                <Bar 
                  dataKey="OneTime" 
                  stackId="a" 
                  fill="#F59E0B" 
                  radius={[0, 0, 0, 0]} 
                  onMouseEnter={() => setHoveredBarKey('OneTime')}
                  onMouseLeave={() => setHoveredBarKey(null)}
                >
                  {hoveredBarKey !== 'OneTime' && (
                    <LabelList 
                      dataKey="OneTime" 
                      position="center" 
                      formatter={(v) => v > 0 ? `${symbol}${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}` : ''}
                      style={{ fill: '#fff', fontSize: '8px', fontWeight: 'bold', pointerEvents: 'none' }}
                    />
                  )}
                </Bar>
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
            <h3>Financial Health</h3>
            <p>Revenue vs Expense & Profitability</p>
          </div>
          <div style={{ display: 'flex', width: '100%', height: '180px', gap: '1rem' }}>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
              <div className="donut-legend-row" style={{ height: '100%', margin: 0 }}>
                <div className="compact-donut-container" style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={comparisonPieData.map(d => ({ ...d, value: convert(d.value) }))} 
                        cx="50%" cy="50%" 
                        innerRadius={35} 
                        outerRadius={50} 
                        paddingAngle={5} 
                        dataKey="value"
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                        label={({ cx, cy, midAngle, outerRadius, value, index }) => {
                          if (activePieIndex === index) return null;
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 15;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text x={x} y={y} fill={theme === 'dark' ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: '9px', fontWeight: 'bold' }}>
                              {symbol}{value >= 1000 ? Math.round(value/1000) + 'k' : Math.round(value)}
                            </text>
                          );
                        }}
                      >
                        {comparisonPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(val) => `${symbol}${val.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="compact-legend" style={{ alignSelf: 'center' }}>
                    {comparisonPieData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: d.color }}></div>
                        <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 'bold', fontSize: '10px' }}>{d.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderLeft: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)', paddingLeft: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: filteredStats.profit >= 0 ? '#10B981' : '#F43F5E', margin: 0 }}>
                {filteredStats.profit >= 0 ? '+' : ''}{symbol}{Math.round(convert(filteredStats.profit)).toLocaleString()}
              </h2>
              <div style={{ width: '100%', display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                <div style={{ flex: 1, padding: '0.25rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                  <p style={{ fontSize: '9px', color: '#10B981', margin: 0, fontWeight: '700' }}>REV</p>
                  <p style={{ fontSize: '10px', fontWeight: '800', margin: 0 }}>{symbol}{Math.round(convert(filteredStats.revenue)).toLocaleString()}</p>
                </div>
                <div style={{ flex: 1, padding: '0.25rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                  <p style={{ fontSize: '9px', color: '#F59E0B', margin: 0, fontWeight: '700' }}>EXP</p>
                  <p style={{ fontSize: '10px', fontWeight: '800', margin: 0 }}>{symbol}{Math.round(convert(filteredStats.expense)).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="chart-card-premium accent-cyan" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chart-header">
            <h3>Monthly Burn Summary</h3>
            <p>Trajectory and runway analysis</p>
          </div>
          <div className="burn-stats-compact" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
