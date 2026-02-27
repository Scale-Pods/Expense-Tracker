import React, { useMemo } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import { useWebhookData } from '../hooks/useWebhookData';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { format } from 'date-fns';
import { Loader, AlertCircle } from 'lucide-react';
import { useTheme } from '../hooks/ThemeContext';
import { useCurrency } from '../hooks/CurrencyContext';
import '../styles/categories.css';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const CategoryAnalysis = () => {
  const { theme } = useTheme();
  const { currency, symbol, formatAmount, convert } = useCurrency();
  const { data: webhookResponse, loading, error } = useWebhookData();

  const chartConfig = {
    gridStroke: theme === 'dark' ? '#334155' : '#E5E7EB',
    tooltipBg: theme === 'dark' ? '#1E293B' : '#FFFFFF',
    tooltipBorder: theme === 'dark' ? '#334155' : '#E5E7EB',
    tooltipText: theme === 'dark' ? '#F8FAFC' : '#111827',
  };

  const { spendByCategory, categoryTrendData, allFoundCategories } = useMemo(() => {
    if (!webhookResponse || !webhookResponse.data || !Array.isArray(webhookResponse.data)) {
      return { spendByCategory: [], categoryTrendData: [], allFoundCategories: [] };
    }

    const expenses = webhookResponse.data;
    const categoryMap = {};
    const trendMap = {}; 
    const categoriesSet = new Set();

    const displayNames = {};
    expenses.forEach(exp => {
      let amt = 0;
      const usd = String(exp["Amount in $ (If Applicable)"] || "0");
      const inr = String(exp["Amount in ₹"] || "0");
      if (usd && usd !== "0" && usd !== "INR Not Available") {
         amt = parseFloat(usd.replace(/[^0-9.]/g, '')) || 0;
      } else if (inr && inr !== "0" && inr !== "INR Not Available") {
         amt = (parseFloat(inr.replace(/[^0-9.]/g, '')) || 0) / 83; 
      }

      if (amt === 0) return;

      const rawName = exp["Spent On"] || 'Unknown';
      const nameKey = rawName.toLowerCase().trim();
      if (!displayNames[nameKey]) displayNames[nameKey] = rawName;
      const normalizedName = displayNames[nameKey];

      categoriesSet.add(normalizedName);
      categoryMap[normalizedName] = (categoryMap[normalizedName] || 0) + amt;

      if (exp.Date) {
         try {
           let dt = new Date();
           const parts = exp.Date.split('/');
           if (parts.length === 3) {
             dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
           } else {
             dt = new Date(exp.Date);
           }
           if (!isNaN(dt.getTime())) {
             const monthStr = format(dt, 'MMM yyyy');
             if (!trendMap[monthStr]) trendMap[monthStr] = {};
             trendMap[monthStr][normalizedName] = (trendMap[monthStr][normalizedName] || 0) + amt;
             trendMap[monthStr].dt = dt;
           }
         } catch { /* ignore */ }
      }
    });

    const sortedCats = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] })).sort((a,b) => b.value - a.value);
    
    let topCats = sortedCats.map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }));
    
    const unsortedTrendArray = Object.keys(trendMap).map(monthStr => {
      return { month: monthStr, ...trendMap[monthStr] };
    });

    unsortedTrendArray.sort((a,b) => a.dt - b.dt);
    
    return {
      spendByCategory: topCats,
      categoryTrendData: unsortedTrendArray,
      allFoundCategories: Array.from(categoriesSet)
    };
  }, [webhookResponse]);

  const convertedTrendData = useMemo(() => {
    return categoryTrendData.map(monthData => {
      const converted = { ...monthData };
      allFoundCategories.forEach(cat => {
        if (converted[cat]) converted[cat] = convert(converted[cat]);
      });
      return converted;
    });
  }, [categoryTrendData, allFoundCategories, convert]);

  if (loading) {
    return (
      <div className="modern-loading-screen">
        <div className="loader-visual">
          <div className="loader-aura"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>
        <p className="loading-text-modern">Analyzing Categories</p>
      </div>
    );
  }

  if (error || (webhookResponse && webhookResponse.error)) {
    return (
      <div className="categories-container">
        <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <p className="text-red-600/80">Failed to aggregate stats. {error?.message || webhookResponse?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="categories-container">
      {/* Summary Cards */}
      <div className="category-cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {spendByCategory.map((cat, index) => (
          <Card key={index} className="category-summary-card">
            <div className="category-header">
              <span className="category-dot" style={{ backgroundColor: cat.color }}></span>
              <h4 className="category-name">{cat.name}</h4>
            </div>
            <div className="category-stats">
              <div className="stat-item">
                <p className="stat-label">Total Spend</p>
                <p className="stat-value">{formatAmount(cat.value)}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Avg. Monthly</p>
                <p className="stat-value">{formatAmount(Math.round(cat.value / 12))}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="category-charts-grid grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <ChartCard title={`Monthly Spend by Merchant (${currency})`} className="lg:col-span-2 min-h-[400px]">
          {convertedTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={convertedTrendData}>
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
                <Legend iconType="circle" />
                {allFoundCategories.map((cat, i) => (
                   <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">No trend data available</div>
          )}
        </ChartCard>

        <ChartCard title={`Category Distribution (${currency})`} className="lg:col-span-1 min-h-[400px]">
           {spendByCategory.length > 0 ? (
             <ResponsiveContainer width="100%" height={350}>
               <PieChart>
                <Pie
                  data={spendByCategory.map(d => ({ ...d, value: convert(d.value) }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
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
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
             </ResponsiveContainer>
           ) : (
             <div className="flex h-full items-center justify-center text-gray-400">No category data available</div>
           )}
        </ChartCard>
      </div>
    </div>
  );
};

export default CategoryAnalysis;
