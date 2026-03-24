import React, { useMemo } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import Badge from '../components/common/Badge';
import { useWebhookData } from '../hooks/useWebhookData';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { DollarSign, Calendar, RefreshCw, Layers, AlertCircle, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../hooks/ThemeContext';
import { useCurrency } from '../hooks/CurrencyContext';
import QuickAddExpense from '../components/dashboard/QuickAddExpense';
import '../styles/dashboard.css';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const Overview = () => {
  const { theme } = useTheme();
  const { currency, symbol, formatAmount, convert, exchangeRate } = useCurrency();
  const { data: webhookResponse, loading, error, refetch: refetchExpenses } = useWebhookData();
  const { data: remindersResponse, refetch: refetchReminders } = useWebhookData('Reminder');

  const handleRefresh = React.useCallback(() => {
    refetchExpenses();
    refetchReminders();
  }, [refetchExpenses, refetchReminders]);

  const chartConfig = {
    gridStroke: theme === 'dark' ? '#334155' : '#E5E7EB',
    tooltipBg: theme === 'dark' ? '#1E293B' : '#FFFFFF',
    tooltipBorder: theme === 'dark' ? '#334155' : '#E5E7EB',
    tooltipText: theme === 'dark' ? '#F8FAFC' : '#111827',
  };

  const {
    KPIData,
    spendByCategory,
    monthlySpendTrend,
    topServices,
    upcomingRenewals
  } = useMemo(() => {
    const defaultData = {
      KPIData: {
        totalMonthlySpend: 0,
        totalAnnualCommitments: 0,
        recurringSpendPercentage: 0,
        activeServicesCount: 0,
      },
      spendByCategory: [],
      monthlySpendTrend: [],
      topServices: [],
      upcomingRenewals: []
    };

    if (!webhookResponse || !webhookResponse.data || !Array.isArray(webhookResponse.data)) {
      return defaultData;
    }

    const expenses = webhookResponse.data;
    if (expenses.length === 0) return defaultData;

    let monthlySpend = 0;
    let annualSpend = 0;
    let recurringCount = 0;
    let validDateExpenses = [];
    const categoryMap = {};
    const serviceMap = {};

    expenses.forEach(exp => {
      // Parse amount logic prioritizing USD if available, else using dynamic exchangeRate for INR
      let amt = 0;
      const usd = String(exp["Amount in $ (If Applicable)"] || "0");
      const inr = String(exp["Amount in ₹"] || "0");
      if (usd && usd !== "0" && usd !== "INR Not Available") {
         amt = parseFloat(usd.replace(/[^0-9.]/g, '')) || 0;
      } else if (inr && inr !== "0" && inr !== "INR Not Available") {
         amt = (parseFloat(inr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate; 
      }

      monthlySpend += amt;
      annualSpend += amt * 12;
      if (exp.Type === 'Recurring' || exp.Type?.toLowerCase().includes('recurring')) {
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

      const rawMerchant = exp["Spent On"] || 'Unknown';
      const merchantKey = rawMerchant.toLowerCase().trim();
      
      categoryMap[merchantKey] = (categoryMap[merchantKey] || 0) + amt;
      serviceMap[merchantKey] = (serviceMap[merchantKey] || 0) + amt;

      if (!serviceMap._displayNames) serviceMap._displayNames = {};
      if (!serviceMap._displayNames[merchantKey]) serviceMap._displayNames[merchantKey] = rawMerchant;
    });

    let parsedReminders = [];
    if (remindersResponse && remindersResponse.data && Array.isArray(remindersResponse.data)) {
      parsedReminders = remindersResponse.data.map((item, idx) => {
        // Updated mapping based on actual webhook fields: "Service", "Description", "Due Date"
        const title = item.Service || 
                    item["Tracker Title"] || 
                    item.Title || 
                    item.title || 
                    item.Description || 
                    item["Spent On"] || 
                    'Untitled Reminder';
                    
        let dayOfMonth = item["Due Date"] || 
                         item["Day of Month"] || 
                         item.DayOfMonth || 
                         item.dayOfMonth || 
                         item.day || 
                         '1';
        
        if (dayOfMonth === '1' && item.Date && typeof item.Date === 'string') {
          const dateParts = item.Date.split('/');
          if (dateParts.length >= 1) dayOfMonth = dateParts[0];
        }
        
        let amt = 0;
        const usd = String(item["Amount in $ (If Applicable)"] || "0");
        const inr = String(item["Amount in ₹"] || "0");
        if (usd && usd !== "0" && usd !== "INR Not Available") {
           amt = parseFloat(usd.replace(/[^0-9.]/g, '')) || 0;
        } else if (inr && inr !== "0" && inr !== "INR Not Available") {
           amt = (parseFloat(inr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate; 
        }

        return {
          id: item.UniqueID || item.id || `rem-${idx}`,
          name: title,
          date: `Day ${dayOfMonth} monthly`,
          amount: amt,
          status: item.Status || item.status || 'pending',
          isReminder: true
        };
      }).filter(r => r.name !== 'Untitled Reminder' || r.amount > 0); // Filter out junk empty reminders
    }

    const activeServicesCount = new Set(expenses.map(e => (e["Spent On"] || '').toLowerCase().trim())).size;
    const recurringPercentage = expenses.length ? Math.round((recurringCount / expenses.length) * 100) : 0;

    const topSrv = Object.keys(serviceMap)
      .filter(k => k !== '_displayNames')
      .map(k => ({ name: serviceMap._displayNames[k], cost: serviceMap[k] }))
      .sort((a,b) => b.cost - a.cost).slice(0, 5);

    const sortedCats = Object.keys(categoryMap)
      .filter(k => k !== '_displayNames')
      .map(k => ({ name: serviceMap._displayNames[k], value: categoryMap[k] }))
      .sort((a,b) => b.value - a.value);
    
    let topCats = sortedCats.slice(0, 5).map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }));
    if (sortedCats.length > 5) {
      const othersVal = sortedCats.slice(5).reduce((sum, item) => sum + item.value, 0);
      topCats.push({ name: 'Others', value: othersVal, color: '#9CA3AF' });
    }

    const monthlyMap = {};
    validDateExpenses.forEach(exp => {
      const monthStr = format(exp.dt, 'MMM yyyy');
      monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + exp.amt;
    });
    
    validDateExpenses.sort((a,b) => a.dt - b.dt);
    const trendMapOrdered = {};
    validDateExpenses.forEach(exp => {
      const monthStr = format(exp.dt, 'MMM yyyy'); 
      trendMapOrdered[monthStr] = monthlyMap[monthStr];
    });

    const trendArray = Object.keys(trendMapOrdered).map(k => ({ month: k, amount: trendMapOrdered[k] }));

    return {
      KPIData: {
        totalMonthlySpend: monthlySpend,
        totalAnnualCommitments: annualSpend,
        recurringSpendPercentage: recurringPercentage,
        activeServicesCount: activeServicesCount,
      },
      spendByCategory: topCats,
      monthlySpendTrend: trendArray.length ? trendArray : [{month: 'This Month', amount: monthlySpend}],
      topServices: topSrv,
      upcomingRenewals: parsedReminders.slice(0, 5)
    };
  }, [webhookResponse, remindersResponse, exchangeRate]);

  if (loading && !webhookResponse) {
    return (
      <div className="modern-loading-screen">
        <div className="loader-visual">
          <div className="loader-aura"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>
        <p className="loading-text-modern">Computing Insights</p>
      </div>
    );
  }

  if (error || (webhookResponse && webhookResponse.error)) {
    return (
      <div className="dashboard-container">
        <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <div>
            <h3 className="text-xl font-bold text-red-700">Unable to load parameters</h3>
            <p className="text-red-600/80">{error?.message || webhookResponse?.message || 'A network error occurred connecting to webhook array.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Quick Add Section */}
      <QuickAddExpense onRefresh={handleRefresh} />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <Card className="kpi-card">
          <div className="kpi-icon-wrapper bg-primary-light">
            <DollarSign size={24} className="text-primary" />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Total Monthly Spend</p>
            <h3 className="kpi-value text-xl lg:text-3xl font-bold truncate">
              {formatAmount(KPIData.totalMonthlySpend)}
            </h3>
          </div>
        </Card>

        <Card className="kpi-card">
          <div className="kpi-icon-wrapper bg-success-light">
            <Calendar size={24} className="text-success" />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Annual Commitments</p>
            <h3 className="kpi-value text-xl lg:text-3xl font-bold truncate">
              {formatAmount(KPIData.totalAnnualCommitments)}
            </h3>
          </div>
        </Card>

        <Card className="kpi-card">
          <div className="kpi-icon-wrapper bg-warning-light">
            <RefreshCw size={24} className="text-warning" />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Recurring Spend</p>
            <h3 className="kpi-value text-xl lg:text-3xl font-bold">{KPIData.recurringSpendPercentage}%</h3>
          </div>
        </Card>

        <Card className="kpi-card">
          <div className="kpi-icon-wrapper bg-purple-light">
            <Layers size={24} className="text-purple" />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Active Services</p>
            <h3 className="kpi-value text-xl lg:text-3xl font-bold">{KPIData.activeServicesCount}</h3>
          </div>
        </Card>
      </div>

      {/* Combined Grid for Charts and Renewals */}
      <div className="dashboard-main-grid">
        <div className="charts-carousel">
          <ChartCard title={`Spend by Merchant (${currency})`} className="min-h-[350px]">
            {spendByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={spendByCategory.map(d => ({ ...d, value: convert(d.value) }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {spendByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${symbol}${Number(value).toLocaleString()}`}
                    contentStyle={{ backgroundColor: chartConfig.tooltipBg, borderColor: chartConfig.tooltipBorder, color: chartConfig.tooltipText }}
                    itemStyle={{ color: chartConfig.tooltipText }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No category data</div>
            )}
          </ChartCard>

          <ChartCard title={`Monthly Spend Trend (${currency})`} className="min-h-[350px]">
            {monthlySpendTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlySpendTrend.map(d => ({ ...d, amount: convert(d.amount) }))} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  <Line type="monotone" dataKey="amount" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No trend data available</div>
            )}
          </ChartCard>

          <ChartCard title={`Most Expensive Merchants (${currency})`} className="min-h-[350px]">
            {topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topServices.map(d => ({ ...d, cost: convert(d.cost) }))} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartConfig.gridStroke} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 12, className: 'truncate', fill: chartConfig.tooltipText }} />
                  <Tooltip 
                    formatter={(value) => `${symbol}${Number(value).toLocaleString()}`}
                    contentStyle={{ backgroundColor: chartConfig.tooltipBg, borderColor: chartConfig.tooltipBorder, color: chartConfig.tooltipText }}
                    itemStyle={{ color: chartConfig.tooltipText }}
                    cursor={{fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}} 
                  />
                  <Bar dataKey="cost" fill="#4F46E5" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No merchant data available</div>
            )}
          </ChartCard>
        </div>

        {/* Renewals Section */}
        <div className="bottom-section">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Upcoming Renewals</h3>
              <a href="#/reminders" className="text-xs text-primary font-semibold hover:underline">View All Reminders</a>
            </div>
            <div className="renewals-list">
              {upcomingRenewals.length > 0 ? (
                upcomingRenewals.map((item) => (
                  <div key={item.id} className="renewal-item">
                    <div className="renewal-info">
                      <p className="renewal-name">{item.name}</p>
                      <p className="renewal-date">{item.date}</p>
                    </div>
                    <div className="renewal-meta">
                      {item.amount > 0 && (
                        <span className="renewal-amount font-semibold">
                          {formatAmount(item.amount)}
                        </span>
                      )}
                      {item.status === 'resolved' || item.status === 'ok' ? (
                        <Badge variant="success">Resolved</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 mt-4 h-full py-10 flex items-center justify-center">
                  No upcoming renewals found
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Overview;
