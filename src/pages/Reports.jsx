import React, { useMemo, useState } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { Download, Loader, AlertCircle, Info } from 'lucide-react';
import { useTheme } from '../hooks/ThemeContext';
import { useWebhookData } from '../hooks/useWebhookData';
import { useCurrency } from '../hooks/CurrencyContext';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import '../styles/reports.css';

const Reports = () => {
  const { theme } = useTheme();
  const { currency, symbol, formatAmount, convert, exchangeRate } = useCurrency();
  const { data: expenseResponse, loading: expLoading, error: expError } = useWebhookData('Expense');
  const { data: revenueResponse, loading: revLoading, error: revError } = useWebhookData('Client');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const loading = expLoading || revLoading;
  const error = expError || revError;

  const chartConfig = {
    gridStroke: theme === 'dark' ? '#334155' : '#E5E7EB',
    tooltipBg: theme === 'dark' ? '#1E293B' : '#FFFFFF',
    tooltipBorder: theme === 'dark' ? '#334155' : '#E5E7EB',
    tooltipText: theme === 'dark' ? '#F8FAFC' : '#111827',
  };

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
    
    // Process all expenses with numeric amounts and dates
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

    // 1. Recurring vs One-time (Last 6 months)
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));
    const recData = months.map(monthDt => {
      const monthStr = format(monthDt, 'MMM');
      const monthStart = startOfMonth(monthDt);
      const monthEnd = endOfMonth(monthDt);
      
      const monthExpenses = processedExpenses.filter(e => 
        isWithinInterval(e.dt, { start: monthStart, end: monthEnd })
      );

      const recurring = monthExpenses
        .filter(e => e.Type === 'Recurring')
        .reduce((sum, e) => sum + e.amt, 0);
      
      const oneTime = monthExpenses
        .filter(e => e.Type !== 'Recurring')
        .reduce((sum, e) => sum + e.amt, 0);

      return { month: monthStr, Recurring: Math.round(recurring), OneTime: Math.round(oneTime) };
    });

    // 2. Projections (Last 3 months Actual + Next 3 months Projected)
    const projMonths = Array.from({ length: 6 }).map((_, i) => subMonths(now, 2 - i));
    const averageGrowth = 1.05; // 5% projected MoM growth fallback
    
    let lastKnownActual = 0;
    const projData = projMonths.map((monthDt, i) => {
      const monthStr = format(monthDt, 'MMM');
      const monthStart = startOfMonth(monthDt);
      const monthEnd = endOfMonth(monthDt);
      
      const actualSpend = processedExpenses
        .filter(e => isWithinInterval(e.dt, { start: monthStart, end: monthEnd }))
        .reduce((sum, e) => sum + e.amt, 0);

      if (i < 3) { // Past or current month
        lastKnownActual = actualSpend || lastKnownActual;
        return { 
          month: monthStr, 
          Actual: Math.round(actualSpend), 
          Projected: Math.round(actualSpend) 
        };
      } else { // Future months
        lastKnownActual = lastKnownActual * averageGrowth;
        return { 
          month: monthStr, 
          Projected: Math.round(lastKnownActual) 
        };
      }
    });

    // 3. Burn Summary
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMthBurn = processedExpenses
      .filter(e => isWithinInterval(e.dt, { start: thisMonthStart, end: thisMonthEnd }))
      .reduce((sum, e) => sum + e.amt, 0);

    const prevMthBurn = processedExpenses
      .filter(e => isWithinInterval(e.dt, { start: lastMonthStart, end: lastMonthEnd }))
      .reduce((sum, e) => sum + e.amt, 0);

    const eoyMonthsRemaining = 12 - (now.getMonth() + 1);
    const projEOY = currentMthBurn * (1 + (eoyMonthsRemaining > 0 ? eoyMonthsRemaining : 0));

    return {
      projectionData: projData,
      recurringData: recData,
      currentBurn: currentMthBurn,
      projectedEOY: projEOY,
      runwayImpact: prevMthBurn ? ((currentMthBurn - prevMthBurn) / prevMthBurn) * 100 : 0,
      allExpenses: processedExpenses,
      allRevenues: revenues
    };
  }, [expenseResponse, revenueResponse]);

  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      months.push({
        label: format(d, 'MMMM yyyy'),
        value: format(d, 'yyyy-MM')
      });
    }
    return months;
  }, []);

  const filteredStats = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const mDate = new Date(parseInt(year), parseInt(month) - 1);
    const start = startOfMonth(mDate);
    const end = endOfMonth(mDate);

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
      return { ...item, amt: amt / (exchangeRate || 83.5), dt }; // Use dynamic exchange rate
    }).filter(r => r.dt && isWithinInterval(r.dt, { start, end }));
    
    const totalRev = monthlyRev.reduce((sum, r) => sum + r.amt, 0);

    return {
      revenue: totalRev,
      expense: totalExp,
      profit: totalRev - totalExp,
      revenueItems: monthlyRev,
      expenseItems: monthlyExp
    };
  }, [allExpenses, allRevenues, selectedMonth]);

  const comparisonPieData = [
    { name: 'Revenue', value: Math.round(filteredStats.revenue), color: '#10B981' },
    { name: 'Expense', value: Math.round(filteredStats.expense), color: '#F59E0B' }
  ];

  const convertedProjectionData = useMemo(() => 
    projectionData.map(d => ({
      ...d,
      Actual: d.Actual !== undefined ? convert(d.Actual) : undefined,
      Projected: convert(d.Projected)
    })), [projectionData, convert]);

  const convertedRecurringData = useMemo(() => 
    recurringData.map(d => ({
      ...d,
      Recurring: convert(d.Recurring),
      OneTime: convert(d.OneTime)
    })), [recurringData, convert]);

  if (loading) {
    return (
      <div className="modern-loading-screen">
        <div className="loader-visual">
          <div className="loader-aura"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>
        <p className="loading-text-modern">Analyzing Financial Trends</p>
      </div>
    );
  }

  if (error || (expenseResponse && expenseResponse.error) || (revenueResponse && revenueResponse.error)) {
    const errorMsg = error?.message || expenseResponse?.message || revenueResponse?.message;
    return (
      <div className="reports-container">
        <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <p className="text-red-600/80">Failed to generate reports. {errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Financial Reports & Projections</h3>
        <div className="filter-group" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Filter Period:</span>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-selector-premium"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-main)',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="reports-grid">
        <ChartCard title={`Projected Spend (${currency})`} height={350}>
          <AreaChart data={convertedProjectionData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartConfig.gridStroke} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartConfig.tooltipText }} />
            <YAxis 
               axisLine={false} 
               tickLine={false} 
               tickFormatter={(value) => `${symbol}${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`} 
               tick={{ fill: chartConfig.tooltipText }} />
            <Tooltip
              formatter={(value) => `${symbol}${Number(value).toLocaleString()}`}
              contentStyle={{ backgroundColor: chartConfig.tooltipBg, borderColor: chartConfig.tooltipBorder, color: chartConfig.tooltipText }}
              itemStyle={{ color: chartConfig.tooltipText }}
            />
            <Legend />
            <Area type="monotone" dataKey="Actual" stroke="#14B8A6" fill="#ccfbf1" fillOpacity={theme === 'dark' ? 0.2 : 0.8} strokeWidth={2} />
            <Area type="monotone" dataKey="Projected" stroke="#9CA3AF" fill="transparent" strokeDasharray="5 5" strokeWidth={2} />
          </AreaChart>
        </ChartCard>

        <ChartCard title={`Recurring vs One-time (${currency})`} height={350}>
          <BarChart data={convertedRecurringData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartConfig.gridStroke} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartConfig.tooltipText }} />
            <YAxis 
               axisLine={false} 
               tickLine={false} 
               tickFormatter={(value) => `${symbol}${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`} 
               tick={{ fill: chartConfig.tooltipText }} />
            <Tooltip
              formatter={(value) => `${symbol}${Number(value).toLocaleString()}`}
              contentStyle={{ backgroundColor: chartConfig.tooltipBg, borderColor: chartConfig.tooltipBorder, color: chartConfig.tooltipText }}
              itemStyle={{ color: chartConfig.tooltipText }}
              cursor={{fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}
            />
            <Legend />
            <Bar dataKey="Recurring" stackId="a" fill="#10B981" />
            <Bar dataKey="OneTime" stackId="a" fill="#F59E0B" />
          </BarChart>
        </ChartCard>

        <ChartCard title={`Revenue vs Expense (${currency})`} height={350}>
          <PieChart>
            <Pie
              data={comparisonPieData.map(d => ({ ...d, value: convert(d.value) }))}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {comparisonPieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: chartConfig.tooltipBg, borderColor: chartConfig.tooltipBorder, color: chartConfig.tooltipText }}
              formatter={(value) => `${symbol}${Number(value).toLocaleString()}`}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ChartCard>

        <Card title={`Monthly Margin (${currency})`} style={{ height: '350px' }}>
          <style>
            {`
              .custom-tooltip-container { position: relative; }
              .custom-tooltip {
                visibility: hidden; opacity: 0; position: absolute; bottom: 100%; left: 50%;
                transform: translateX(-50%); margin-bottom: 12px;
                background: var(--color-bg-elevated); border: 1px solid var(--color-border);
                border-radius: 12px; padding: 12px; width: max-content; min-width: 200px;
                max-width: 280px; max-height: 200px; overflow-y: auto;
                box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 100;
                transition: all 0.2s ease; text-align: left;
              }
              .custom-tooltip-container:hover .custom-tooltip {
                visibility: visible; opacity: 1;
              }
              .tooltip-row {
                display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 8px;
                font-size: 0.8rem; color: var(--color-text-main); border-bottom: 1px solid var(--color-border); padding-bottom: 4px;
              }
              .tooltip-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
              .tooltip-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
              .tooltip-amt { font-weight: 800; }
            `}
          </style>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600' }}>NET PROFIT / LOSS</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <h2 style={{ 
                  fontSize: '2.75rem', 
                  fontWeight: '900', 
                  margin: 0,
                  color: filteredStats.profit >= 0 ? '#10B981' : '#F43F5E',
                  letterSpacing: '-1px'
                }}>
                  {filteredStats.profit >= 0 ? '+' : ''}{symbol}{Math.round(convert(filteredStats.profit)).toLocaleString()}
                </h2>
              </div>
            </div>
            <div style={{ width: '100%', display: 'flex', gap: '1.25rem' }}>
              <div className="custom-tooltip-container" style={{ flex: 1, padding: '1.25rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.1)', textAlign: 'center', cursor: 'help' }}>
                <div className="custom-tooltip">
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Revenue Breakdown</div>
                  {filteredStats.revenueItems && filteredStats.revenueItems.length > 0 ? (
                    filteredStats.revenueItems.map((item, i) => (
                      <div key={i} className="tooltip-row">
                        <span className="tooltip-name">{item['Client Name'] || item.clientName || 'Unknown'}</span>
                        <span className="tooltip-amt" style={{ color: '#10B981' }}>{symbol}{Math.round(convert(item.amt)).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px 0' }}>No revenue records.</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Revenue</p>
                  <Info size={12} color="#10B981" />
                </div>
                <p style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-text-main)', margin: 0 }}>{symbol}{Math.round(convert(filteredStats.revenue)).toLocaleString()}</p>
              </div>

              <div className="custom-tooltip-container" style={{ flex: 1, padding: '1.25rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.1)', textAlign: 'center', cursor: 'help' }}>
                <div className="custom-tooltip">
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Expense Breakdown</div>
                  {filteredStats.expenseItems && filteredStats.expenseItems.length > 0 ? (
                    filteredStats.expenseItems.map((item, i) => (
                      <div key={i} className="tooltip-row">
                        <span className="tooltip-name">{item['Expense Name'] || item.expenseName || item.Merchant || 'Unknown'}</span>
                        <span className="tooltip-amt" style={{ color: '#F59E0B' }}>{symbol}{Math.round(convert(item.amt)).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px 0' }}>No expense records.</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Expenses</p>
                  <Info size={12} color="#F59E0B" />
                </div>
                <p style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-text-main)', margin: 0 }}>{symbol}{Math.round(convert(filteredStats.expense)).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="summary-section">
        <Card title="Monthly Burn Summary">
          <div className="burn-stats">
            <div className="burn-item">
              <span className="burn-label">Current Monthly Burn</span>
              <span className="burn-value">{formatAmount(currentBurn)}</span>
              <span className={`burn-change ${runwayImpact > 0 ? 'negative' : 'positive'}`}>
                {runwayImpact > 0 ? '+' : ''}{runwayImpact.toFixed(1)}% from last month
              </span>
            </div>
            <div className="burn-divider"></div>
            <div className="burn-item">
              <span className="burn-label">Projected EOY Spend</span>
              <span className="burn-value">{formatAmount(projectedEOY)}</span>
              <span className="burn-change neutral">Based on current trajectory</span>
            </div>
            <div className="burn-divider"></div>
             <div className="burn-item">
              <span className="burn-label">Trajectory Impact</span>
              <span className="burn-value">{runwayImpact > 0 ? 'Increasing' : 'Decreasing'}</span>
              <span className="burn-change neutral">Spend velocity analysis</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
