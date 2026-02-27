import React, { useMemo } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Download, Loader, AlertCircle } from 'lucide-react';
import { useTheme } from '../hooks/ThemeContext';
import { useWebhookData } from '../hooks/useWebhookData';
import { useCurrency } from '../hooks/CurrencyContext';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import '../styles/reports.css';

const Reports = () => {
  const { theme } = useTheme();
  const { currency, symbol, formatAmount, convert } = useCurrency();
  const { data: webhookResponse, loading, error } = useWebhookData();

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
    runwayImpact
  } = useMemo(() => {
    const defaultData = {
      projectionData: [],
      recurringData: [],
      currentBurn: 0,
      projectedEOY: 0,
      runwayImpact: 0
    };

    if (!webhookResponse?.data || !Array.isArray(webhookResponse.data)) return defaultData;

    const expenses = webhookResponse.data;
    const now = new Date();
    
    // Process all expenses with numeric amounts and dates
    const processedExpenses = expenses.map(exp => {
      let amt = 0;
      const usd = String(exp["Amount in $ (If Applicable)"] || "0");
      const inr = String(exp["Amount in ₹"] || "0");
      if (usd && usd !== "0" && usd !== "INR Not Available") {
        amt = parseFloat(usd.replace(/[^0-9.]/g, '')) || 0;
      } else if (inr && inr !== "0" && inr !== "INR Not Available") {
        amt = (parseFloat(inr.replace(/[^0-9.]/g, '')) || 0) / 83;
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
      runwayImpact: prevMthBurn ? ((currentMthBurn - prevMthBurn) / prevMthBurn) * 100 : 0
    };
  }, [webhookResponse]);

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

  if (error || (webhookResponse && webhookResponse.error)) {
    return (
      <div className="reports-container">
        <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <p className="text-red-600/80">Failed to generate reports. {error?.message || webhookResponse?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h3>Financial Reports & Projections</h3>
        <div className="reports-actions">
          <button className="btn-export">
            <Download size={16} /> Export CSV
          </button>
          <button className="btn-export">
            <Download size={16} /> Export Excel
          </button>
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
            <Area type="monotone" dataKey="Actual" stroke="#4F46E5" fill="#E0E7FF" fillOpacity={theme === 'dark' ? 0.2 : 0.8} strokeWidth={2} />
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
