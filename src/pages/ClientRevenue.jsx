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
  Phone
} from 'lucide-react';
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
  Bar
} from 'recharts';
import { useWebhookData } from '../hooks/useWebhookData';
import { useTheme } from '../hooks/ThemeContext';
import CubeLoader from '../components/ui/cube-loader';
import '../styles/payments.css';
import '../styles/reminders.css';

const WEBHOOK_URL = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_GENERAL}`;
const DATA_WEBHOOK_URL = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_DATA}`;

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
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: expenseDataRaw } = useWebhookData('Expense');

  const fetchRevenueData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${DATA_WEBHOOK_URL}?action=Client`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json)) {
        setRawData(json[0]?.data ?? json);
      } else if (json?.data && Array.isArray(json.data)) {
        setRawData(json.data);
      } else {
        setRawData([]);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRevenueData(); }, [fetchRevenueData]);

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
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [submittingClient, setSubmittingClient] = useState(false);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_DATA}?action=Client`);
      const result = await response.json();
      if (result && result.data && Array.isArray(result.data)) {
        setClients(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  React.useEffect(() => {
    fetchClients();
  }, []);

  React.useEffect(() => {
    const total = newRevenue.services.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    if (total > 0) {
      setNewRevenue(prev => ({ ...prev, incomeAmount: total.toString() }));
    }
  }, [newRevenue.services]);

  React.useEffect(() => {
    const income = parseFloat(newRevenue.incomeAmount) || 0;
    const realised = parseFloat(newRevenue.realisedRevenue) || 0;
    const calculated = (income - realised).toFixed(2);
    
    setNewRevenue(prev => ({
      ...prev,
      receivables: calculated > 0 ? calculated : (calculated < 0 ? calculated : '0.00')
    }));
  }, [newRevenue.incomeAmount, newRevenue.realisedRevenue]);

  const revenueData = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];
    return rawData.map((item, idx) => {
      const getVal = (keys) => {
        for (const k of keys) if (item[k] !== undefined) return item[k];
        return null;
      };
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
    });
  }, [rawData]);

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
    { name: 'Realised', value: stats.totalRealised, color: '#10b981' },
    { name: 'Receivables', value: stats.totalReceivables, color: '#f43f5e' }
  ], [stats]);

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
        const [dA, mA, yA] = a.split('/');
        const [dB, mB, yB] = b.split('/');
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

  const { theme } = useTheme();

  const chartConfig = useMemo(() => ({
    gridStroke: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    tooltipBg: theme === 'dark' ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
    tooltipBorder: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    tickColor: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    textColor: theme === 'dark' ? '#FFFFFF' : '#1F2937'
  }), [theme]);

  const profitPieData = useMemo(() => [
    { name: 'Revenue', value: stats.totalIncome, color: '#14b8a6' },
    { name: 'Expenses', value: totalExpenses, color: '#f59e0b' }
  ], [stats, totalExpenses]);

  const comparisonData = useMemo(() => {
    const months = {};
    revenueData.forEach(r => {
      const date = r.realisedDate || '';
      if (date.includes('/')) {
        const parts = date.split('/');
        const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
        if (!months[key]) months[key] = { month: key.split('-')[1], revenue: 0, expense: 0 };
        months[key].revenue += r.realisedRevenue;
      }
    });
    expenseData.forEach(e => {
      const date = e.date || '';
      if (date.includes('/')) {
        const parts = date.split('/');
        const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
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

  const handleAddService = () => {
    setNewRevenue({
      ...newRevenue,
      services: [...newRevenue.services, { name: '', amount: '' }]
    });
  };

  const handleServiceChange = (index, field, value) => {
    const updatedServices = [...newRevenue.services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    setNewRevenue({
      ...newRevenue,
      services: updatedServices
    });
  };

  const handleRemoveService = (index) => {
    if (newRevenue.services.length <= 1) return;
    const updatedServices = newRevenue.services.filter((_, i) => i !== index);
    setNewRevenue({
      ...newRevenue,
      services: updatedServices
    });
  };

  const handleAddRevenue = async (e) => {
    e.preventDefault();
    if (!newRevenue.clientName) return;
    setSubmitting(true);
    try {
      const payload = {
        ...newRevenue,
        realisedDate: newRevenue.realisedDate || new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      };
      const response = await fetch(`${WEBHOOK_URL}?action=RE`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setNewRevenue({ 
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
        setConfirmation({
          show: true,
          title: 'Revenue Entry Added',
          message: 'The new revenue data has been successfully synced with the backend.'
        });
      }
    } catch (error) {
      console.error('Failed to add revenue:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseConfirmation = () => {
    setConfirmation({ ...confirmation, show: false });
    fetchRevenueData();
  };

  const handleDeleteRevenue = async (id) => {
    const itemToDelete = revenueData.find(r => r.id === id);
    if (!itemToDelete) return;
    try {
      const response = await fetch(`${WEBHOOK_URL}?action=DLRevenue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemToDelete,
          row: itemToDelete.rowNumber
        })
      });
      if (response.ok) {
        setConfirmation({
          show: true,
          title: 'Entry Deleted',
          message: 'The revenue record has been successfully removed.'
        });
      }
    } catch (error) {
      console.error('Failed to delete revenue:', error);
    }
  };

  const columns = [
    { 
      header: <div className="sort-header" onClick={() => requestSort('clientName')}>Client Name <ArrowUpDown size={14} /></div>, 
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
      header: <div className="sort-header" onClick={() => requestSort('incomeAmount')}>Income <ArrowUpDown size={14} /></div>, 
      accessor: 'incomeAmount',
      align: 'right',
      render: (row) => <span className="font-medium text-white/80">{CURRENCIES.find(c => c.code === row.currency)?.symbol || '₹'}{row.incomeAmount.toLocaleString()}</span>
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('realisedRevenue')}>Realised <ArrowUpDown size={14} /></div>, 
      accessor: 'realisedRevenue',
      align: 'right',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-400">{CURRENCIES.find(c => c.code === row.currency)?.symbol || '₹'}{row.realisedRevenue.toLocaleString()}</span>
          {row.realisedDate && (
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
              {row.realisedDate}
            </span>
          )}
        </div>
      )
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('receivables')}>Receivables <ArrowUpDown size={14} /></div>, 
      accessor: 'receivables',
      align: 'right',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-rose-400">{CURRENCIES.find(c => c.code === row.currency)?.symbol || '₹'}{row.receivables.toLocaleString()}</span>
          {row.receivableDate && (
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
              Due: {row.receivableDate}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      align: 'center',
      render: (row) => (
        <button onClick={() => handleDeleteRevenue(row.id)} className="btn-delete-task" style={{ padding: '8px' }}>
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CubeLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="services-container">
        <div className="p-6 bg-red-50/5 rounded-xl border border-red-500/20 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <p className="text-red-400">Failed to load client revenue data. {error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-container redesigned">
      <div className="payments-header">
        <div className="header-title-group">
          <p className="top-tagline">Real-time client income and receivable analytics</p>
          <h1>Revenue Tracking</h1>
        </div>
      </div>

      <div className="reminders-grid">
        <div className="main-tasks">
          <div className="stats-grid">
            <Card className="stat-card">
              <div className="stat-flex">
                <div className="stat-icon-box"><TrendingUp size={20} /></div>
                <div>
                  <p className="stat-label">Total Income</p>
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
                  <p className="stat-label">Receivables</p>
                  <h2 className="stat-value" style={{ color: '#f43f5e' }}>₹{stats.totalReceivables.toLocaleString()}</h2>
                </div>
              </div>
            </Card>
          </div>

          <div className="charts-carousel-revenue">
            <Card className="chart-card-premium accent-cyan">
              <div className="chart-header">
                <h3>Revenue Flow</h3>
                <p>Realised income over time</p>
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
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} tickFormatter={(val) => `₹${val>=1000?(val/1000).toFixed(0)+'k':val}`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', background: chartConfig.tooltipBg, border: `1px solid ${chartConfig.tooltipBorder}`, color: chartConfig.textColor }} />
                    <Area type="monotone" dataKey="amount" stroke="#14b8a6" strokeWidth={2} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="chart-card-premium accent-pink">
              <div className="chart-header">
                <h3>Collection Status</h3>
                <p>Realised vs. Pending</p>
              </div>
              <div className="donut-legend-row">
                <div className="compact-donut-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
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
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="chart-card-premium accent-yellow">
              <div className="chart-header">
                <h3>P&L Comparison</h3>
                <p>Monthly distribution</p>
              </div>
              <div style={{ height: '180px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartConfig.gridStroke} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartConfig.tickColor }} tickFormatter={(val) => `₹${val>=1000?(val/1000).toFixed(0)+'k':val}`} />
                    <Tooltip cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', background: chartConfig.tooltipBg, border: `1px solid ${chartConfig.tooltipBorder}`, color: chartConfig.textColor }} />
                    <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="expense" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="horizontal-legend">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#14b8a6' }}></div> Revenue</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#f59e0b' }}></div> Expense</div>
              </div>
            </Card>

            <Card className="chart-card-premium accent-green">
              <div className="chart-header">
                <h3>Operational Margin</h3>
                <p>Expense vs Revenue ratio</p>
              </div>
              <div className="donut-legend-row">
                <div className="compact-donut-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={profitPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                        {profitPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="compact-legend">
                  {profitPieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color }}></div>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card className="payments-table-card">
            <div className="table-controls">
              <div className="payments-search-wrapper">
                <Search size={18} className="payments-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search client..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="payments-search-input"
                />
              </div>
            </div>
            <div className="table-responsive">
              <Table columns={columns} data={filteredData} emptyMessage="No revenue data found." />
            </div>
          </Card>
        </div>

        <aside className="reminder-sidebar">
          <div className="premium-form-card">
            <div className="form-head">
              <div className="form-icon"><Plus size={24} /></div>
              <div>
                <h3>Add Revenue Entry</h3>
                <p>New client billing record</p>
              </div>
            </div>
            <form onSubmit={handleAddRevenue} className="reminder-form-redesign">
              <div className="redesign-group">
                <label>Client Details</label>
                <div className="input-with-icon">
                  <Briefcase size={16} className="icon" />
                  <input 
                    type="text" 
                    placeholder="Client Name" 
                    value={newRevenue.clientName} 
                    onChange={(e) => setNewRevenue({...newRevenue, clientName: e.target.value})} 
                    required 
                  />
                </div>
                <div className="input-row-multi">
                  <div className="input-with-icon">
                    <Mail size={14} className="icon" />
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      value={newRevenue.clientEmail} 
                      onChange={(e) => setNewRevenue({...newRevenue, clientEmail: e.target.value})} 
                    />
                  </div>
                  <div className="input-with-icon">
                    <Phone size={14} className="icon" />
                    <input 
                      type="text" 
                      placeholder="Phone Number" 
                      value={newRevenue.clientPhone} 
                      onChange={(e) => setNewRevenue({...newRevenue, clientPhone: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <div className="redesign-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>Services / Line Items</label>
                  <button type="button" onClick={handleAddService} className="btn-add-mini">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                <div className="services-list-container">
                  {newRevenue.services.map((service, index) => (
                    <div key={index} className="service-entry-row animate-in">
                      <input 
                        type="text" 
                        placeholder="Service name..." 
                        value={service.name} 
                        onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                        className="service-name-input"
                      />
                      <div className="amount-input-wrapper">
                        <span className="currency-prefix">{CURRENCIES.find(c => c.code === newRevenue.currency)?.symbol || '₹'}</span>
                        <input 
                          type="number" 
                          placeholder="0.00" 
                          value={service.amount} 
                          onChange={(e) => handleServiceChange(index, 'amount', e.target.value)}
                          className="service-amount-input"
                        />
                      </div>
                      {newRevenue.services.length > 1 && (
                        <button type="button" onClick={() => handleRemoveService(index)} className="btn-remove-service">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="redesign-group">
                <div className="input-row-multi">
                  <div className="field-block">
                    <label>Currency</label>
                    <select 
                      value={newRevenue.currency} 
                      onChange={(e) => setNewRevenue({...newRevenue, currency: e.target.value})}
                      className="form-select-premium"
                    >
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                    </select>
                  </div>
                  <div className="field-block">
                    <label>Total Income</label>
                    <div className="input-with-icon read-only">
                      <IndianRupee size={16} className="icon" />
                      <input type="text" value={newRevenue.incomeAmount} readOnly placeholder="0.00" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="redesign-group">
                <label>Realised Revenue</label>
                <div className="input-row-multi">
                  <div className="input-with-icon">
                    <IndianRupee size={16} className="icon" />
                    <input 
                      type="number" 
                      placeholder="Amount realised" 
                      value={newRevenue.realisedRevenue} 
                      onChange={(e) => setNewRevenue({...newRevenue, realisedRevenue: e.target.value})} 
                    />
                  </div>
                  <div className="input-with-icon">
                    <Calendar size={16} className="icon" />
                    <input 
                      type="date" 
                      value={newRevenue.realisedDate} 
                      onChange={(e) => setNewRevenue({...newRevenue, realisedDate: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <div className="redesign-group">
                <label>Receivables Info</label>
                <div className="input-row-multi">
                  <div className="input-with-icon read-only">
                    <IndianRupee size={16} className="icon" />
                    <input type="text" value={newRevenue.receivables} readOnly placeholder="Balance" />
                  </div>
                  <div className="input-with-icon">
                    <Clock size={16} className="icon" />
                    <input 
                      type="date" 
                      value={newRevenue.receivableDate} 
                      onChange={(e) => setNewRevenue({...newRevenue, receivableDate: e.target.value})} 
                      placeholder="Due Date"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-submit-redesign" disabled={submitting}>
                {submitting ? 'Syncing...' : 'Track Revenue'}
              </button>
            </form>
          </div>
        </aside>
      </div>

      {confirmation.show && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-icon success"><CheckCircle size={40} /></div>
            <h2>{confirmation.title}</h2>
            <p>{confirmation.message}</p>
            <button className="btn-modal-ok" onClick={handleCloseConfirmation}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

const IndianRupee = ({ size, className }) => <span className={className} style={{ fontSize: size }}>₹</span>;

export default ClientRevenue;
