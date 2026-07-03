import React, { useState, useMemo, useEffect } from 'react';
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
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';

import { parseSmartDate } from '../utils/invoiceUtils';
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
  const [sortConfig, setSortConfig] = useState({ key: 'realisedDate', direction: 'desc' });
  const { theme } = useTheme();
  
  // Lifted state for reactive switching
  const activeTab = 'Client';
  const { data: webhookResponse, loading, refetch } = useWebhookData(activeTab);
  
  // Also need Expense data for P&L comparison (only used when on Client tab)
  const { data: expenseDataRaw } = useWebhookData('Expense');

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const [activePieIndex, setActivePieIndex] = useState(null);
  const [isAreaHovered, setIsAreaHovered] = useState(false);
  const [hoveredBarKey, setHoveredBarKey] = useState(null);



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
  const [confirmation, setConfirmation] = useState({ show: false, title: '', message: '', onOk: null });

  useEffect(() => {
    const income = parseFloat(newRevenue.incomeAmount) || 0;
    const realised = parseFloat(newRevenue.realisedRevenue) || 0;
    const autoRecv = Math.max(0, income - realised);
    setNewRevenue(prev => ({ ...prev, receivables: autoRecv || '' }));
  }, [newRevenue.incomeAmount, newRevenue.realisedRevenue]);

  // Receivable collection modal state
  const [collectModal, setCollectModal] = useState(null); // { row } | null
  const [collectAmount, setCollectAmount] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [completingRow, setCompletingRow] = useState(null);
  const [showRevenueDrawer, setShowRevenueDrawer] = useState(false);

  const isClientView = activeTab === 'Client';
  const isInvestmentView = activeTab === 'Investment';

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

        if (sortConfig.key === 'realisedDate') {
          const parseDateValue = (str) => {
            if (!str) return 0;
            try {
              const d = parseSmartDate(str);
              return isNaN(d.getTime()) ? 0 : d.getTime();
            } catch {
              return 0;
            }
          };
          const dateA = parseDateValue(valA);
          const dateB = parseDateValue(valB);
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

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

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const timeData = useMemo(() => {
    const groups = revenueData.reduce((acc, curr) => {
      const date = curr.realisedDate || 'N/A';
      if (!acc[date]) acc[date] = 0;
      acc[date] += curr.realisedRevenue;
      return acc;
    }, {});
    
    return Object.keys(groups)
      .filter(d => d !== 'N/A' && d.includes('/'))
      .sort((a, b) => parseSmartDate(a) - parseSmartDate(b))
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


  const chartConfig = useMemo(() => ({
    gridStroke: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)',
    tooltipBg: theme === 'dark' ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
    tooltipBorder: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
    tickColor: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)',
    textColor: theme === 'dark' ? '#FFFFFF' : '#111827',
  }), [theme]);



  const comparisonData = useMemo(() => {
    const months = {};
    revenueData.forEach(r => {
      const date = r.realisedDate || '';
      const d = parseSmartDate(date);
      if (d) {
        const key = format(d, 'yyyy-MM');
        if (!months[key]) months[key] = { month: key.split('-')[1], revenue: 0, expense: 0 };
        months[key].revenue += r.realisedRevenue;
      }
    });
    expenseData.forEach(e => {
      const date = e.date || '';
      const d = parseSmartDate(date);
      if (d) {
        const key = format(d, 'yyyy-MM');
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
        setNewRevenue({ clientName: '', clientEmail: '', clientPhone: '', services: [{ name: '', amount: '' }], currency: 'INR', incomeAmount: '', realisedRevenue: '', realisedDate: '', receivables: '', receivableDate: '' });
        setShowRevenueDrawer(false);
        setConfirmation({ show: true, title: 'Revenue Entry Added', message: 'The new revenue data has been successfully synced.', onOk: () => refetch() });
      }
    } catch (error) {
      console.error('Failed to add revenue:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const REV_WEBHOOK = 'https://n8n.srv1010832.hstgr.cloud/webhook/92cd2226-0f40-44fe-969b-03bef4a3e7cb';

  const handleMarkComplete = async (row) => {
    if (row.receivables <= 0) return;
    setCompletingRow(row.rowNumber);
    try {
      const newRealised = row.realisedRevenue + row.receivables;
      const res = await fetch(`${REV_WEBHOOK}?action=clientrev`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: row.clientName,
          realisedRevenue: newRealised,
          receivables: 0,
          amountCollected: row.receivables,
          rowNumber: row.rowNumber,
          timestamp: new Date().toISOString()
        })
      });
      if (res.ok) {
        setConfirmation({
          show: true,
          title: 'Marked Complete!',
          message: `₹${row.receivables.toLocaleString()} realised from ${row.clientName}. Receivables cleared.`,
          onOk: () => refetch()
        });
      } else {
        alert('Failed to mark complete. Please try again.');
      }
    } catch (err) {
      console.error('Mark complete error:', err);
      alert('Network error. Please try again.');
    } finally {
      setCompletingRow(null);
    }
  };

  const handleOpenCollect = (row) => {
    setCollectModal(row);
    setCollectAmount('');
  };

  const handleCollect = async () => {
    if (!collectModal) return;
    const row = collectModal;
    const amountReceived = collectAmount
      ? parseFloat(String(collectAmount).replace(/[^0-9.]/g, '')) || 0
      : row.receivables;

    if (amountReceived <= 0) return;

    const newRealised = row.realisedRevenue + amountReceived;
    const newReceivables = Math.max(0, row.receivables - amountReceived);

    setCollecting(true);
    try {
      const res = await fetch(`${REV_WEBHOOK}?action=clientrev`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: row.clientName,
          realisedRevenue: newRealised,
          receivables: newReceivables,
          amountCollected: amountReceived,
          rowNumber: row.rowNumber,
          timestamp: new Date().toISOString()
        })
      });
      if (res.ok) {
        setCollectModal(null);
        setConfirmation({
          show: true,
          title: 'Payment Collected!',
          message: `₹${amountReceived.toLocaleString()} collected from ${row.clientName}. Realised updated to ₹${newRealised.toLocaleString()}.`,
          onOk: () => refetch()
        });
      } else {
        alert('Failed to update. Please try again.');
      }
    } catch (err) {
      console.error('Collect error:', err);
      alert('Network error. Please try again.');
    } finally {
      setCollecting(false);
    }
  };

  const columns = [
    { 
      header: <div className="sort-header" onClick={() => requestSort('clientName')}>{isClientView ? 'Client Name' : 'Description'} <ArrowUpDown size={14} /></div>, 
      accessor: 'clientName',
      align: 'left',
      style: { width: '38%' },
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
      style: { width: '17%' },
      render: (row) => <span className="font-medium text-main">₹{row.incomeAmount.toLocaleString()}</span>
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('realisedRevenue')}>Realised <ArrowUpDown size={14} /></div>, 
      accessor: 'realisedRevenue',
      align: 'right',
      style: { width: '20%' },
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
      style: { width: '25%' },
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-bold text-rose-400">₹{row.receivables.toLocaleString()}</span>
          {row.receivables > 0 && (
            <div className="flex gap-1">
              <button
                className="mark-complete-btn"
                onClick={(e) => { e.stopPropagation(); handleMarkComplete(row); }}
                disabled={completingRow === row.rowNumber}
                title="Mark as fully paid (receivables → 0)"
              >
                {completingRow === row.rowNumber ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <CheckCircle size={13} />
                )}
                Complete
              </button>
              <button
                className="collect-btn"
                onClick={(e) => { e.stopPropagation(); handleOpenCollect(row); }}
                title="Collect partial or custom amount"
              >
                <CheckCircle2 size={13} />
                Collect
              </button>
            </div>
          )}
        </div>
      )
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
                        label={({ cx, cy, midAngle, outerRadius, value, index }) => {
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
              <Table columns={columns} data={paginatedData} emptyMessage="No data found." />
            </div>

            {totalPages > 1 && (
              <div className="pagination-bar">
                <div className="pagination-info">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}&ndash;{Math.min(currentPage * PAGE_SIZE, filteredData.length)} of {filteredData.length}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="pagination-ellipsis">...</span>}
                        <button
                          className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Revenue Drawer Toggle Button */}
        {isClientView && (
          <button
            className={`revenue-drawer-toggle ${showRevenueDrawer ? 'open' : ''}`}
            onClick={() => setShowRevenueDrawer(!showRevenueDrawer)}
            title="Add Revenue"
          >
            {showRevenueDrawer ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Add Revenue Drawer */}
      {isClientView && (
        <div className="revenue-drawer-container">
          <div className={`revenue-drawer-overlay ${showRevenueDrawer ? 'open' : ''}`} onClick={() => setShowRevenueDrawer(false)} />
          <div className={`revenue-drawer-panel ${showRevenueDrawer ? 'open' : ''}`}>
            <div className="drawer-header">
              <div className="drawer-header-row">
                <div className="form-icon" style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' }}>
                  <TrendingUp size={22} />
                </div>
                <div className="drawer-header-text">
                  <span className="drawer-title">Add Revenue</span>
                  <span className="drawer-subtitle">New billing record</span>
                </div>
                <button className="drawer-close-btn" onClick={() => setShowRevenueDrawer(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddRevenue} className="drawer-form">
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
                <div className="redesign-group" style={{ marginBottom: 0 }}>
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
                <div className="redesign-group" style={{ marginBottom: 0 }}>
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

              <button type="submit" className="btn-submit-redesign" disabled={submitting} style={{ background: '#14b8a6', marginTop: '0.25rem' }}>
                {submitting ? <RefreshCw size={20} className="animate-spin" /> : <><Send size={18} /> Add Entry</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {confirmation.show && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-icon success"><CheckCircle size={40} /></div>
            <h2>{confirmation.title}</h2>
            <p>{confirmation.message}</p>
            <button className="btn-modal-ok" onClick={() => { if (confirmation.onOk) confirmation.onOk(); setConfirmation({show: false, onOk: null}); }}>OK</button>
          </div>
        </div>
      )}

      {/* Collect Receivable Modal */}
      {collectModal && (
        <div className="modal-overlay" onClick={() => setCollectModal(null)}>
          <div className="collect-modal" onClick={e => e.stopPropagation()}>
            <div className="collect-modal-header">
              <div className="collect-modal-title-group">
                <div className="collect-modal-icon">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3>Collect Receivable</h3>
                  <p className="collect-modal-client">{collectModal.clientName}</p>
                </div>
              </div>
              <button className="collect-close-btn" onClick={() => setCollectModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="collect-modal-summary">
              <div className="collect-summary-item">
                <span className="collect-summary-label">Outstanding</span>
                <span className="collect-summary-value outstanding">₹{collectModal.receivables.toLocaleString()}</span>
              </div>
              <div className="collect-summary-item">
                <span className="collect-summary-label">Already Realised</span>
                <span className="collect-summary-value realised">₹{collectModal.realisedRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="collect-custom-input-group">
              <label className="collect-input-label">Amount Received (₹)</label>
              <input
                type="number"
                className="collect-amount-input"
                placeholder={`Outstanding: ₹${collectModal.receivables.toLocaleString()}`}
                value={collectAmount}
                onChange={e => setCollectAmount(e.target.value)}
                min="0"
                max={collectModal.receivables}
                autoFocus
              />
              {collectAmount !== '' ? (
                <p className="collect-preview-subtext" style={{ marginTop: '10px' }}>
                  New Realised: <strong>₹{(collectModal.realisedRevenue + (parseFloat(collectAmount) || 0)).toLocaleString()}</strong>
                  &nbsp;·&nbsp; Remaining: <strong>₹{Math.max(0, collectModal.receivables - (parseFloat(collectAmount) || 0)).toLocaleString()}</strong>
                </p>
              ) : (
                <p className="collect-preview-subtext" style={{ marginTop: '10px' }}>
                  Leave empty to collect full <strong>₹{collectModal.receivables.toLocaleString()}</strong>
                  &nbsp;·&nbsp; New Receivable: <strong>₹0</strong>
                </p>
              )}
            </div>

            <div className="collect-modal-actions">
              <button className="collect-cancel-btn" onClick={() => setCollectModal(null)} disabled={collecting}>
                Cancel
              </button>
              <button
                className="collect-confirm-btn"
                onClick={handleCollect}
                disabled={collecting}
              >
                {collecting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <><CheckCircle2 size={16} /> Confirm Collection</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientRevenue;
