import React, { useMemo } from 'react';
import Card from '../components/common/Card';
import ChartCard from '../components/charts/ChartCard';
import { useWebhookData } from '../hooks/useWebhookData';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { format } from 'date-fns';
import { useTheme } from '../hooks/ThemeContext';
import { useCurrency } from '../hooks/CurrencyContext';
import CubeLoader from '../components/ui/cube-loader';
import { AlertCircle } from 'lucide-react';
import '../styles/categories.css';

const COLORS = ['#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#0D9488', '#EC4899', '#2DD4BF'];

const CategoryAnalysis = () => {
  const { theme } = useTheme();
  const { currency, symbol, formatAmount, convert, exchangeRate } = useCurrency();
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
      const usdStr = String(exp["Amount in $ (If Applicable)"] || "");
      const inrStr = String(exp["Amount in ₹"] || "");
      
      if (usdStr && usdStr !== "0" && usdStr !== "INR Not Available") {
        amt = parseFloat(usdStr.replace(/[^0-9.]/g, '')) || 0;
      } else if (inrStr && inrStr !== "0" && inrStr !== "INR Not Available") {
        amt = (parseFloat(inrStr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate;
      }

      if (amt === 0) return;

      const rawName = exp.Category || exp.Type || 'Uncategorized';
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
    const unsortedTrendArray = Object.keys(trendMap).map(monthStr => ({ month: monthStr, ...trendMap[monthStr] }));
    unsortedTrendArray.sort((a,b) => a.dt - b.dt);
    
    return {
      spendByCategory: topCats,
      categoryTrendData: unsortedTrendArray,
      allFoundCategories: Array.from(categoriesSet)
    };
  }, [webhookResponse, exchangeRate]);

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

  return (
    <div className="categories-container stagger-load">
      <div className="payments-header" style={{ marginBottom: '2.5rem' }}>
        <div className="header-title-group">
          <p className="top-tagline">Deep-dive into where your capital is allocated</p>
          <h1>Categorical Spend Analysis</h1>
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

      <div className="category-charts-grid">
        <ChartCard title={`Monthly Spend by Category (${currency})`}>
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

        <ChartCard title={`Category Distribution (${currency})`}>
           {spendByCategory.length > 0 ? (
             <ResponsiveContainer width="100%" height={350}>
               <PieChart>
                <Pie
                  data={spendByCategory.map(d => ({ ...d, value: convert(d.value) }))}
                  cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value"
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
