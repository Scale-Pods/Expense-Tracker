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
  Loader2, 
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
      // Handle both { data: [...] } and [{ data: [...] }] and flat array
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

  // Fetch clients on mount
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

  // Auto-calculate total income from services
  React.useEffect(() => {
    const total = newRevenue.services.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    // Only update if we have service amounts to avoid clearing manual income edits
    if (total > 0) {
      setNewRevenue(prev => ({ ...prev, incomeAmount: total.toString() }));
    }
  }, [newRevenue.services]);

  // Auto-calculate receivables: Income - Realised
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

  const profitPieData = useMemo(() => [
    { name: 'Total Revenue', value: stats.totalIncome, color: '#14b8a6' },
    { name: 'Total Expenses', value: totalExpenses, color: '#f59e0b' }
  ], [stats, totalExpenses]);

  const comparisonData = useMemo(() => {
    const months = {};
    revenueData.forEach(r => {
      const date = r.realisedDate || '';
      if (date.includes('/')) {
        const parts = date.split('/');
        const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
        if (!months[key]) months[key] = { month: key, revenue: 0, expense: 0 };
        months[key].revenue += r.realisedRevenue;
      }
    });
    expenseData.forEach(e => {
      const date = e.date || '';
      if (date.includes('/')) {
        const parts = date.split('/');
        const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
        if (!months[key]) months[key] = { month: key, revenue: 0, expense: 0 };
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
    if (newRevenue.services.length <= 1) return; // Keep at least one
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

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClientName) return;
    
    setSubmittingClient(true);
    try {
      const response = await fetch(`${WEBHOOK_URL}?action=AddClient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: newClientName })
      });

      if (response.ok) {
        setIsAddClientModalOpen(false);
        setNewRevenue(prev => ({ ...prev, clientName: newClientName }));
        setNewClientName('');
        await fetchClients(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to add client:', error);
    } finally {
      setSubmittingClient(false);
    }
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
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-main">{row.clientName}</span>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{row.service}</span>
        </div>
      )
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('incomeAmount')}>Income Amount <ArrowUpDown size={14} /></div>, 
      accessor: 'incomeAmount',
      render: (row) => <span className="font-medium text-gray-700">{CURRENCIES.find(c => c.code === row.currency)?.symbol || '₹'}{row.incomeAmount.toLocaleString()}</span>
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('realisedRevenue')}>Realised Revenue <ArrowUpDown size={14} /></div>, 
      accessor: 'realisedRevenue',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-600">{CURRENCIES.find(c => c.code === row.currency)?.symbol || '₹'}{row.realisedRevenue.toLocaleString()}</span>
          {row.realisedDate && (
            <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-tight">
              {row.realisedDate}
            </span>
          )}
        </div>
      )
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('receivables')}>Receivables <ArrowUpDown size={14} /></div>, 
      accessor: 'receivables',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-rose-500">{CURRENCIES.find(c => c.code === row.currency)?.symbol || '₹'}{row.receivables.toLocaleString()}</span>
          {row.receivableDate && (
            <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-tight">
              Due: {row.receivableDate}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <button 
          onClick={() => handleDeleteRevenue(row.id)} 
          className="btn-delete-task" 
          title="Delete Entry"
          style={{ padding: '8px' }}
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  if (loading) {
    return (
      <div className="modern-loading-screen">
        <div className="loader-visual">
          <div className="loader-aura"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>
        <p className="loading-text-modern">Aggregating Revenue Data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="services-container">
        <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <p className="text-red-600/80">Failed to load client revenue data. {error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-container redesigned">
      <div className="payments-header">
        <div className="header-title-group">
          <h1>Revenue Tracking</h1>
          <p>Real-time client income and receivable analytics</p>
        </div>
      </div>

      <div className="reminders-grid">
        <div className="main-tasks">
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
            <Card className="stat-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
                <p className="stat-label mb-0">Total Income</p>
              </div>
              <h2 className="stat-value">₹{stats.totalIncome.toLocaleString()}</h2>
            </Card>
            <Card className="stat-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={20} /></div>
                <p className="stat-label mb-0">Realised</p>
              </div>
              <h2 className="stat-value text-emerald-600">₹{stats.totalRealised.toLocaleString()}</h2>
            </Card>
            <Card className="stat-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Clock size={20} /></div>
                <p className="stat-label mb-0">Receivables</p>
              </div>
              <h2 className="stat-value text-rose-500">₹{stats.totalReceivables.toLocaleString()}</h2>
            </Card>
          </div>

          <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
            <Card className="chart-card-premium" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <div className="chart-header" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Revenue Flow</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Realised income over time</p>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#14b8a6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="chart-card-premium" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <div className="chart-header" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Collection Status</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Realised vs. Pending Receivables</p>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
            <Card className="chart-card-premium" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <div className="chart-header" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>P&L Comparison</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Revenue vs. Expenses by Month</p>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="expense" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="chart-card-premium" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <div className="chart-header" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Operational Margin</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Revenue vs. Expense Distribution</p>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={profitPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {profitPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
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

        {/* Sidebar Form */}
        <aside className="reminder-sidebar">
          <div className="premium-form-card">
            <div className="form-head">
              <div className="form-icon">
                <Plus size={24} />
              </div>
              <div>
                <h3>Add Revenue Entry</h3>
                <p>New client billing record</p>
              </div>
            </div>
            
            <form onSubmit={handleAddRevenue} className="reminder-form-redesign">
              <div className="redesign-group">
                <label>Client Name</label>
                <div className="premium-input-field">
                  <Briefcase size={16} className="input-icon-prefix" />
                  <input 
                    type="text"
                    placeholder="Enter client name..."
                    value={newRevenue.clientName}
                    onChange={(e) => setNewRevenue({...newRevenue, clientName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="dual-input-group" style={{ marginBottom: '1.5rem' }}>
                <div className="redesign-group flex-1" style={{ marginBottom: 0 }}>
                  <label>Client Email</label>
                  <div className="premium-input-field">
                    <Mail size={16} className="input-icon-prefix" />
                    <input 
                      type="email"
                      placeholder="email@example.com"
                      value={newRevenue.clientEmail}
                      onChange={(e) => setNewRevenue({...newRevenue, clientEmail: e.target.value})}
                    />
                  </div>
                </div>
                <div className="redesign-group flex-1" style={{ marginBottom: 0 }}>
                  <label>Phone Number</label>
                  <div className="premium-input-field">
                    <Phone size={16} className="input-icon-prefix" />
                    <input 
                      type="tel"
                      placeholder="+1 234..."
                      value={newRevenue.clientPhone}
                      onChange={(e) => setNewRevenue({...newRevenue, clientPhone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="redesign-group">
                <label>Services Provided</label>
                <div className="services-pointwise-list w-full">
                  {newRevenue.services.map((service, idx) => (
                    <div key={idx} className="flex flex-col gap-2 mb-4 w-full p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                      <div className="flex items-center gap-2 w-full">
                        <div className="premium-input-field flex-1">
                          <Target size={16} className="input-icon-prefix" />
                          <input 
                            type="text" 
                            placeholder="Service Name (e.g. Web Design)"
                            value={service.name}
                            onChange={(e) => handleServiceChange(idx, 'name', e.target.value)}
                            required
                          />
                        </div>
                        {newRevenue.services.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveService(idx)}
                            className="btn-remove-service"
                            title="Remove Service"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="premium-input-field w-full">
                        <span className="input-icon-prefix">{CURRENCIES.find(c => c.code === newRevenue.currency)?.symbol}</span>
                        <input 
                          type="number" 
                          placeholder="Service Amount"
                          value={service.amount}
                          onChange={(e) => handleServiceChange(idx, 'amount', e.target.value)}
                          style={{ paddingLeft: '34px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  className="btn-add-service-point"
                  onClick={handleAddService}
                >
                  <Plus size={14} /> Add New Service
                </button>
              </div>
              
              <div className="redesign-group">
                <label>Income Amount</label>
                <div className="dual-input-group">
                  <div className="premium-input-field" style={{ width: '100px' }}>
                    <select 
                      value={newRevenue.currency}
                      onChange={(e) => setNewRevenue({...newRevenue, currency: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: '12px 10px', 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--color-text-main)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr.code} value={curr.code}>{curr.code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="premium-input-field flex-1">
                    <span className="input-icon-prefix">{CURRENCIES.find(c => c.code === newRevenue.currency)?.symbol}</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={newRevenue.incomeAmount}
                      onChange={(e) => setNewRevenue({...newRevenue, incomeAmount: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="redesign-group">
                <label>Realised Revenue & Date</label>
                <div className="dual-input-group">
                  <div className="premium-input-field flex-1">
                    <span className="input-icon-prefix">{CURRENCIES.find(c => c.code === newRevenue.currency)?.symbol}</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={newRevenue.realisedRevenue}
                      onChange={(e) => setNewRevenue({...newRevenue, realisedRevenue: e.target.value})}
                    />
                  </div>
                  <div className="premium-input-field flex-1" style={{ paddingLeft: '14px' }}>
                    <input 
                      type="date" 
                      value={newRevenue.realisedDate}
                      onChange={(e) => setNewRevenue({...newRevenue, realisedDate: e.target.value})}
                      className="date-input-system"
                      style={{ paddingLeft: 0 }}
                    />
                  </div>
                </div>
              </div>

              {!(newRevenue.incomeAmount && newRevenue.realisedRevenue && parseFloat(newRevenue.incomeAmount) === parseFloat(newRevenue.realisedRevenue)) && (
                <div className="redesign-group">
                  <label>Receivables & Expected Date*</label>
                  <div className="dual-input-group">
                    <div className="premium-input-field flex-1">
                      <span className="input-icon-prefix">{CURRENCIES.find(c => c.code === newRevenue.currency)?.symbol}</span>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={newRevenue.receivables}
                        onChange={(e) => setNewRevenue({...newRevenue, receivables: e.target.value})}
                      />
                    </div>
                    <div className="premium-input-field flex-1" style={{ paddingLeft: '14px' }}>
                      <input 
                        type="date" 
                        value={newRevenue.receivableDate}
                        onChange={(e) => setNewRevenue({...newRevenue, receivableDate: e.target.value})}
                        required
                        className="date-input-system"
                        style={{ paddingLeft: 0 }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <button type="submit" className="btn-submit-redesign" disabled={submitting}>
                {submitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <><Send size={18} /> Add Entry</>
                )}
              </button>
            </form>
          </div>
          
          <div className="info-card-modern">
            <div className="info-icon">
              <Info size={18} />
            </div>
            <div className="info-text">
              <h4>Revenue Sync</h4>
              <p>Entry will be added to your Google Sheet via n8n automation for accounting.</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {confirmation.show && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-icon success">
              <CheckCircle size={40} />
            </div>
            <h2>{confirmation.title}</h2>
            <p>{confirmation.message}</p>
            <button className="btn-modal-ok" onClick={handleCloseConfirmation}>
              OK
            </button>
          </div>
        </div>
      )}

      <AddClientModal 
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSave={handleAddClient}
        clientName={newClientName}
        setClientName={setNewClientName}
        submitting={submittingClient}
      />
    </div>
  );
};

const AddClientModal = ({ isOpen, onClose, onSave, clientName, setClientName, submitting }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="confirmation-modal">
        <div className="modal-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
          <Users size={40} />
        </div>
        <h2>Add New Client</h2>
        <p>Enter the name of the new client to add to your records.</p>
        
        <form onSubmit={onSave} className="reminder-form-redesign" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <div className="redesign-group">
            <label>Client Name</label>
            <input 
              type="text" 
              placeholder="e.g. Acme Corporation"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              className="pwd-input"
              style={{ padding: '12px' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
            <button type="button" className="btn-modal-ok" style={{ background: 'var(--color-border)', color: 'var(--color-text-main)' }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-ok" disabled={submitting}>
              {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientRevenue;
