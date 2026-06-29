import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import { 
  Search, 
  ArrowUpDown, 
  Users, 
  TrendingUp, 
  Wallet, 
  Clock, 
  AlertCircle, 
  Plus, 
  Briefcase,
  CheckCircle,
  Send,
  Info,
  Target,
  Trash2,
  Calendar,
  Mail,
  Phone,
  Database,
  RefreshCw,
  ArrowRight,
  IndianRupee
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  Legend,
  BarChart,
  Bar,
  LabelList
} from 'recharts';
import { useWebhookData } from '../hooks/useWebhookData';
import { useTheme } from '../hooks/ThemeContext';
import CubeLoader from '../components/ui/cube-loader';
import WebhookDataSection from '../components/WebhookDataSection';
import '../styles/payments.css';
import '../styles/reminders.css';

const WEBHOOK_URL = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_GENERAL}`;

const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'AED', symbol: 'د.إ' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'JPY', symbol: '¥' }
];

const ClientRevenue = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'clientName', direction: 'desc' });
  const { theme } = useTheme();
  
  // Lifted state for reactive switching
  const [activeTab, setActiveTab] = useState('Client');
  const { data: webhookResponse, loading, error, refetch } = useWebhookData(activeTab);
  
  // Also need Expense data for P&L comparison (only used when on Client tab)
  const { data: expenseDataRaw } = useWebhookData('Expense');

  const [activePieIndex, setActivePieIndex] = useState(null);
  const [isAreaHovered, setIsAreaHovered] = useState(false);
  const [hoveredBarKey, setHoveredBarKey] = useState(null);

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    if (webhookResponse) {
      setLastUpdated(new Date());
    }
  }, [webhookResponse]);

  const [newRevenue, setNewRevenue] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    services: [{ name: '', amount: '' }],
    currency: 'INR',
    incomeAmount: '',
    realisedRevenue: '',
    realisedDate: '',
    receivables: '',
    receivableDate: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState({ show: false, title: '', message: '' });

  const isClientView = activeTab === 'Client';
  const isInvestmentView = activeTab === 'Investment';
  const isExpenseView = activeTab === 'Expense';

  const [dataTab, setDataTab] = useState('Client');
  useEffect(() => {
    if (!loading && webhookResponse) {
      setDataTab(activeTab);
    }
  }, [loading, webhookResponse, activeTab]);

  const rawData = useMemo(() => {
    if (activeTab !== dataTab) return [];
    return webhookResponse?.data || [];
  }, [webhookResponse, activeTab, dataTab]);

  const revenueData = useMemo(() => {
    if (!Array.isArray(rawData)) return [];
    
    return rawData.map((item, idx) => {
      const getVal = (keys) => {
        for (const k of keys) if (item[k] !== undefined) return item[k];
        return null;
      };

      if (isClientView) {
        const income   = getVal(['Income Amount', 'IncomeAmount', 'Income', 'incomeAmount']) ?? 0;
        const realised = getVal(['Realised Revenue', 'RealisedRevenue', 'Realised', 'realisedRevenue']) ?? 0;
        const recv     = getVal(['Receivables', 'receivables', 'Receivable']) ?? 0;
        const servicesRaw = getVal(['Service', 'service', 'Service Type', 'Services']);
        let displayService = 'N/A';
        if (Array.isArray(servicesRaw)) {
          displayService = servicesRaw.map(s => typeof s === 'object' ? s.name : s).filter(Boolean).join(', ');
        } else if (servicesRaw) {
          displayService = servicesRaw;
        }

        return {
          id:             item.UniqueID || item.id || idx,
          clientName:     getVal(['Client Name', 'ClientName', 'Client', 'clientName']) || 'Unknown Client',
          service:        displayService,
          incomeAmount:   parseFloat(String(income).replace(/[^0-9.-]/g, ''))   || 0,
          realisedRevenue:parseFloat(String(realised).replace(/[^0-9.-]/g, '')) || 0,
          receivables:    parseFloat(String(recv).replace(/[^0-9.-]/g, ''))     || 0,
          realisedDate:   getVal(['Realised Date', 'realisedDate', 'RealisedDate', 'Date of Realisation']) || '',
          receivableDate: getVal(['Receivable Date', 'receivableDate', 'ReceivableDate', 'Expected Date']) || '',
          currency:       getVal(['Currency', 'currency']) || 'INR',
          status:         item.Status || item.status || 'Active',
          rowNumber:      item.row_number || (idx + 1)
        };
      } else {
        // Generic mapping for other streams
        let amount = 0;
        if (isInvestmentView) {
          amount = parseFloat(String(item.Amount || item.Value || 0).replace(/[^0-9.-]/g, ''));
        } else {
          amount = parseFloat(String(item["Amount in ₹"] || item.Amount || 0).replace(/[^0-9.-]/g, ''));
        }

        return {
          id: item.UniqueID || item.id || idx,
          clientName: item["Spent On"] || item.Name || item.Category || 'Unknown',
          service: item.Category || item.Note || item["Note / Platform"] || 'N/A',
          incomeAmount: amount,
          realisedRevenue: amount,
          receivables: 0,
          realisedDate: item.Date || item.date || '',
          currency: 'INR',
          status: 'Active',
          rowNumber: item.row_number || (idx + 1)
        };
      }
    });
  }, [rawData, isClientView, isInvestmentView]);

  const filteredData = useMemo(() => {
    let data = [...revenueData];
    if (searchTerm) {
      data = data.filter(item =>
        item.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (sortConfig.key) {
      data.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [searchTerm, sortConfig, revenueData]);

  const stats = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      acc.totalIncome += curr.incomeAmount;
      acc.totalRealised += curr.realisedRevenue;
      acc.totalReceivables += curr.receivables;
      return acc;
    }, { totalIncome: 0, totalRealised: 0, totalReceivables: 0 });
  }, [filteredData]);

  const pieData = useMemo(() => [
    { name: isClientView ? 'Realised' : 'Total', value: stats.totalRealised, color: '#10b981' },
    { name: isClientView ? 'Receivables' : 'Remaining', value: stats.totalReceivables, color: '#f43f5e' }
  ], [stats, isClientView]);

  const timeData = useMemo(() => {
    const groups = revenueData.reduce((acc, curr) => {
      const date = curr.realisedDate || 'N/A';
      if (!acc[date]) acc[date] = 0;
      acc[date] += curr.realisedRevenue;
      return acc;
    }, {});
    
    return Object.keys(groups)
      .filter(d => d !== 'N/A' && d.includes('/'))
      .sort((a, b) => {
        const [mA, dA, yA] = a.split('/');
        const [mB, dB, yB] = b.split('/');
        return new Date(yA, mA-1, dA) - new Date(yB, mB-1, dB);
      })
      .map(date => ({ date, amount: groups[date] }));
  }, [revenueData]);

  const expenseData = useMemo(() => {
    const list = expenseDataRaw?.data || [];
    if (!Array.isArray(list)) return [];
    return list.map(item => ({
      amount: parseFloat(String(item.Amount || item.amount || item["Amount in ₹"] || 0).replace(/[^0-9.-]/g, '')),
      date: item.Date || item.date || item["Tracker Date"] || ''
    }));
  }, [expenseDataRaw]);

  const totalExpenses = useMemo(() => expenseData.reduce((sum, item) => sum + item.amount, 0), [expenseData]);

  const chartConfig = useMemo(() => ({
    gridStroke: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)',
    tooltipBg: theme === 'dark' ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
    tooltipBorder: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
    tickColor: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)',
    textColor: theme === 'dark' ? '#FFFFFF' : '#111827',
  }), [theme]);

  const profitPieData = useMemo(() => [
    { name: isClientView ? 'Revenue' : activeTab, value: stats.totalIncome, color: '#14b8a6' },
    { name: 'Global Expenses', value: totalExpenses, color: '#f59e0b' }
  ], [stats, totalExpenses, isClientView, activeTab]);

  const comparisonData = useMemo(() => {
    const months = {};
    revenueData.forEach(r => {
      const date = r.realisedDate || '';
      if (date.includes('/')) {
        const parts = date.split('/');
        const key = `${parts[2]}-${parts[0].padStart(2, '0')}`;
        if (!months[key]) months[key] = { month: key.split('-')[1], revenue: 0, expense: 0 };
        months[key].revenue += r.realisedRevenue;
      }
    });
    expenseData.forEach(e => {
      const date = e.date || '';
      if (date.includes('/')) {
        const parts = date.split('/');
        const key = `${parts[2]}-${parts[0].padStart(2, '0')}`;
        if (!months[key]) months[key] = { month: key.split('-')[1], revenue: 0, expense: 0 };
        months[key].expense += e.amount;
      }
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [revenueData, expenseData]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleAddRevenue = async (e) => {
    e.preventDefault();
    if (!newRevenue.clientName) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${WEBHOOK_URL}?action=RE`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRevenue,
          realisedDate: newRevenue.realisedDate || new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString()
        })
      });
      if (response.ok) {
        setConfirmation({ show: true, title: 'Revenue Entry Added', message: 'The new revenue data has been successfully synced.' });
        setNewRevenue({ clientName: '', clientEmail: '', clientPhone: '', services: [{ name: '', amount: '' }], currency: 'INR', incomeAmount: '', realisedRevenue: '', realisedDate: '', receivables: '', receivableDate: '' });
      }
    } catch (error) {
      console.error('Failed to add revenue:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { 
      header: <div className="sort-header" onClick={() => requestSort('clientName')}>{isClientView ? 'Client Name' : 'Description'} <ArrowUpDown size={14} /></div>, 
      accessor: 'clientName',
      align: 'left',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-main">{row.clientName}</span>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{row.service}</span>
        </div>
      )
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('incomeAmount')}>Value <ArrowUpDown size={14} /></div>, 
      accessor: 'incomeAmount',
      align: 'right',
      render: (row) => <span className="font-medium text-white/80">₹{row.incomeAmount.toLocaleString()}</span>
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('realisedRevenue')}>Realised <ArrowUpDown size={14} /></div>, 
      accessor: 'realisedRevenue',
      align: 'right',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-400">₹{row.realisedRevenue.toLocaleString()}</span>
          {row.realisedDate && <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{row.realisedDate}</span>}
        </div>
      )
    },
    { 
      header: 'Receivables', 
      accessor: 'receivables',
      align: 'right',
      render: (row) => <span className="font-bold text-rose-400">₹{row.receivables.toLocaleString()}</span>
    }
  ];

  if (loading && !webhookResponse) {
    return <div className="flex items-center justify-center min-h-[60vh]"><CubeLoader /></div>;
  }

  return (
    <div className="payments-container redesigned">
      <div className="payments-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="header-title-group">
          <p className="top-tagline">Real-time {activeTab.toLowerCase()} analytics and monitoring</p>
          <h1>{isClientView ? 'Revenue Tracking' : `${activeTab} Analysis`}</h1>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Live Sync Status</span>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-500">Connected · {activeTab}</span>
            </div>
          </div>
          <button onClick={() => refetch()} className="p-3 bg-glass-bg border border-glass-border rounded-xl hover:bg-glass-highlight transition-all shadow-sm group">
            <RefreshCw size={18} className={`text-primary ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </div>

      <div className="reminders-grid">
        <div className="main-tasks">
          <div className="stats-grid">
            <Card className="stat-card">
              <div className="stat-flex">
                <div className="stat-icon-box"><TrendingUp size={20} /></div>
                <div>
                  <p className="stat-label">Total Value</p>
                  <h2 className="stat-value">₹{stats.totalIncome.toLocaleString()}</h2>
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="stat-flex">
                <div className="stat-icon-box" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}><Wallet size={20} /></div>
                <div>
                  <p className="stat-label">Realised</p>
                  <h2 className="stat-value" style={{ color: '#10b981' }}>₹{stats.totalRealised.toLocaleString()}</h2>
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="stat-flex">
                <div className="stat-icon-box" style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' }}><Clock size={20} /></div>
                <div>
                  <p className="stat-label">Pending / Recv</p>
                  <h2 className="stat-value" style={{ color: '#f43f5e' }}>₹{stats.totalReceivables.toLocaleString()}</h2>
                </div>
              </div>
            </Card>
          </div>

          <div className="charts-carousel-revenue">
            <Card className="chart-card-premium accent-cyan">
              <div className="chart-header">
                <h3>Trend Analysis</h3>
                <p>{isClientView ? 'Realised income' : activeTab} over time</p>
              </div>
              <div style={{ height: '180px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartConfig.gridStroke} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} tickFormatter={(val) => `₹${val>=1000?(val/1000).toFixed(0)+'k' : val}`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', background: chartConfig.tooltipBg, border: `1px solid ${chartConfig.tooltipBorder}`, color: chartConfig.textColor }} />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#14b8a6" 
                      strokeWidth={2} 
                      fill="url(#colorRev)"
                      onMouseEnter={() => setIsAreaHovered(true)}
                      onMouseLeave={() => setIsAreaHovered(false)}
                    >
                      {!isAreaHovered && (
                        <LabelList 
                          dataKey="amount" 
                          position="top" 
                          offset={10}
                          formatter={(v) => `₹${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}`}
                          style={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: '9px', fontWeight: 'bold' }}
                        />
                      )}
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="chart-card-premium accent-pink">
              <div className="chart-header">
                <h3>Collection Ratio</h3>
                <p>Status distribution</p>
              </div>
              <div className="donut-legend-row">
                <div className="compact-donut-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={pieData} 
                        cx="50%" cy="50%" 
                        innerRadius={45} 
                        outerRadius={60} 
                        paddingAngle={5} 
                        dataKey="value"
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                          if (activePieIndex === index) return null;
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 18;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text x={x} y={y} fill={theme === 'dark' ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: '9px', fontWeight: 'bold' }}>
                              ₹{value >= 1000 ? Math.round(value/1000) + 'k' : Math.round(value)}
                            </text>
                          );
                        }}
                      >
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="compact-legend">
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color }}></div>
                      <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: '10px', fontWeight: 'bold' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="chart-card-premium accent-yellow">
              <div className="chart-header">
                <h3>Comparison</h3>
                <p>Stream vs Expenses</p>
              </div>
              <div style={{ height: '180px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartConfig.gridStroke} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} tickFormatter={(val) => `₹${val>=1000?(val/1000).toFixed(0)+'k' : val}`} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ borderRadius: '12px', background: chartConfig.tooltipBg, border: `1px solid ${chartConfig.tooltipBorder}`, color: chartConfig.textColor }} />
                    <Bar 
                      dataKey="revenue" 
                      fill="#14b8a6" 
                      radius={[4, 4, 0, 0]} 
                      name={activeTab}
                      onMouseEnter={() => setHoveredBarKey('revenue')}
                      onMouseLeave={() => setHoveredBarKey(null)}
                    >
                      {hoveredBarKey !== 'revenue' && (
                        <LabelList 
                          dataKey="revenue" 
                          position="top" 
                          formatter={(v) => v > 0 ? `₹${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}` : ''}
                          style={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: '8px', fontWeight: 'bold' }}
                        />
                      )}
                    </Bar>
                    <Bar 
                      dataKey="expense" 
                      fill="#f59e0b" 
                      radius={[4, 4, 0, 0]} 
                      name="Expense"
                      onMouseEnter={() => setHoveredBarKey('expense')}
                      onMouseLeave={() => setHoveredBarKey(null)}
                    >
                      {hoveredBarKey !== 'expense' && (
                        <LabelList 
                          dataKey="expense" 
                          position="top" 
                          formatter={(v) => v > 0 ? `₹${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}` : ''}
                          style={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: '8px', fontWeight: 'bold' }}
                        />
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="payments-table-card">
            <div className="table-controls">
              <div className="payments-search-wrapper">
                <Search size={18} className="payments-search-icon" />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="payments-search-input" />
              </div>
            </div>
            <div className="table-responsive">
              <Table columns={columns} data={filteredData} emptyMessage="No data found." />
            </div>
          </Card>
        </div>

        <aside className="reminder-sidebar">
          {isClientView && (
            <div className="premium-form-card">
              <div className="form-head">
                <div className="form-icon" style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3>Add Revenue</h3>
                  <p>New billing record</p>
                </div>
              </div>
              
              <form onSubmit={handleAddRevenue} className="reminder-form-redesign">
                <div className="redesign-group">
                  <label>Client Name</label>
                  <div className="premium-input-field">
                    <Briefcase size={16} className="icon-prefix" />
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Corp" 
                      value={newRevenue.clientName} 
                      onChange={(e) => setNewRevenue({...newRevenue, clientName: e.target.value})} 
                      required 
                    />
                  </div>
                </div>

                <div className="redesign-group">
                  <label>Total Value (INR)</label>
                  <div className="premium-input-field">
                    <IndianRupee size={16} className="icon-prefix" />
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={newRevenue.incomeAmount} 
                      onChange={(e) => setNewRevenue({...newRevenue, incomeAmount: e.target.value})} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-row-compact" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="redesign-group">
                    <label>Realised (Paid)</label>
                    <div className="premium-input-field">
                      <Wallet size={16} className="icon-prefix text-emerald-400" />
                      <input 
                        type="number" 
                        placeholder="0" 
                        value={newRevenue.realisedRevenue} 
                        onChange={(e) => setNewRevenue({...newRevenue, realisedRevenue: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="redesign-group">
                    <label>Receivables</label>
                    <div className="premium-input-field">
                      <Clock size={16} className="icon-prefix text-rose-400" />
                      <input 
                        type="number" 
                        placeholder="0" 
                        value={newRevenue.receivables} 
                        onChange={(e) => setNewRevenue({...newRevenue, receivables: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>

                <div className="redesign-group">
                  <label>Realised Date</label>
                  <div className="premium-input-field">
                    <Calendar size={16} className="icon-prefix" />
                    <input 
                      type="date" 
                      value={newRevenue.realisedDate} 
                      onChange={(e) => setNewRevenue({...newRevenue, realisedDate: e.target.value})} 
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                </div>

                <div className="redesign-group">
                  <label>Client Email</label>
                  <div className="premium-input-field">
                    <Mail size={16} className="icon-prefix" />
                    <input 
                      type="email" 
                      placeholder="client@example.com" 
                      value={newRevenue.clientEmail} 
                      onChange={(e) => setNewRevenue({...newRevenue, clientEmail: e.target.value})} 
                    />
                  </div>
                </div>

                <button type="submit" className="btn-submit-redesign" disabled={submitting} style={{ background: '#14b8a6', marginTop: '0.5rem' }}>
                  {submitting ? <RefreshCw size={20} className="animate-spin" /> : <><Send size={18} /> Add Entry</>}
                </button>
              </form>
            </div>
          )}
          <div className="info-card-modern">
            <div className="info-icon"><Info size={18} /></div>
            <div className="info-text"><h4>Real-time Sync</h4><p>Data is instantly updated across the platform.</p></div>
          </div>
        </aside>
      </div>

      <WebhookDataSection 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        externalData={webhookResponse}
        externalLoading={loading}
        externalRefetch={refetch}
      />

      {confirmation.show && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-icon success"><CheckCircle size={40} /></div>
            <h2>{confirmation.title}</h2>
            <p>{confirmation.message}</p>
            <button className="btn-modal-ok" onClick={() => setConfirmation({show: false})}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientRevenue;
