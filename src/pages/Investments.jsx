import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  Plus, 
  IndianRupee,
  Loader2,
  Sparkles,
  ArrowUpDown,
  Trash2,
  AlertCircle,
  Target
} from 'lucide-react';
import { useWebhookData } from '../hooks/useWebhookData';
import { useAuth } from '../hooks/AuthContext';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import '../styles/reminders.css'; // Reuse these styles

const WEBHOOK_URL = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_GENERAL}`;

const Investments = () => {
  const [newInvestment, setNewInvestment] = useState({ 
    amount: '', 
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState({ show: false, title: '', message: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const { currentUser } = useAuth();
  
  const { data: rawData, loading, error, refetch } = useWebhookData('Investment');

  const investmentData = useMemo(() => {
    const list = rawData?.data || [];
    if (!Array.isArray(list)) return [];
    return list.map((item, idx) => {
      // Robust field mapping
      const amount = parseFloat(String(item.Amount || item.amount || item.Value || 0).replace(/[^0-9.-]/g, ''));
      const date = item.Date || item.date || item.Timestamp || '';
      const note = item.Note || item.note || item["Note / Platform"] || 'N/A';
      const name = item.Name || item.name || 'User';
      
      return {
        id: item.UniqueID || item.id || idx,
        amount,
        date,
        note,
        name,
        rowNumber: item.row_number || (idx + 1)
      };
    });
  }, [rawData]);

  const stats = useMemo(() => {
    return {
      total: investmentData.reduce((sum, item) => sum + item.amount, 0),
      count: investmentData.length,
      latest: investmentData.length > 0 ? investmentData[0].amount : 0
    };
  }, [investmentData]);

  const chartData = useMemo(() => {
    const sorted = [...investmentData].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningTotal = 0;
    return sorted.map(item => {
      runningTotal += item.amount;
      return {
        date: item.date,
        amount: item.amount,
        total: runningTotal
      };
    });
  }, [investmentData]);

  const columns = [
    { header: 'Date', accessor: 'date', align: 'left', render: (row) => <span className="font-medium">{row.date}</span> },
    { header: 'Amount (INR)', accessor: 'amount', align: 'right', render: (row) => <span className="font-bold text-emerald-600">₹{row.amount.toLocaleString()}</span> },
    { header: 'Note / Platform', accessor: 'note', align: 'left' },
    { header: 'Investor', accessor: 'name', align: 'right' }
  ];

  const sortedData = useMemo(() => {
    let data = [...investmentData];
    if (sortConfig.key) {
      data.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [investmentData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAddInvestment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const nameMap = {
      'adna@scalepods.co': 'Adnan',
      'raunak@scalepods.co': 'Raunak'
    };
    const userName = nameMap[currentUser?.email] || currentUser?.username || 'User';

    try {
      const response = await fetch(`${WEBHOOK_URL}?action=Investment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newInvestment,
          Name: userName,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setConfirmation({
          show: true,
          title: 'Investment Tracked!',
          message: 'Your new investment has been recorded successfully.'
        });
        setNewInvestment({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
      }
    } catch (error) {
      console.error('Failed to add investment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvestment = async (id) => {
    const item = investmentData.find(inv => inv.id === id);
    if (!item) return;

    try {
      await fetch(`${WEBHOOK_URL}?action=DLInvestment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row: item.rowNumber })
      });
      refetch();
    } catch (error) {
      console.error('Failed to delete investment:', error);
    }
  };

  if (loading) {
    return (
      <div className="modern-loading-screen">
        <div className="loader-visual">
          <div className="loader-aura"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>
        <p className="loading-text-modern">Analyzing Investments</p>
      </div>
    );
  }

  return (
    <div className="reminders-container redesigned">
      <div className="reminders-grid">
        <div className="main-tasks">
          <div className="reminders-welcome">
            <div className="welcome-tag">
              <Sparkles size={14} /> Growing Your Wealth
            </div>
            <h1>Investment Portfolio</h1>
            <p>Track your capital deployments and monitor financial growth.</p>
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '2rem', display: 'grid', gap: '1.5rem' }}>
            <Card className="stat-card-premium">
              <div className="stat-icon-wrapper" style={{ background: 'var(--color-emerald-light)', color: 'var(--color-emerald)' }}>
                <TrendingUp size={24} />
              </div>
              <div className="stat-info">
                <p>Total Capital Invested</p>
                <h3>₹{stats.total.toLocaleString()}</h3>
              </div>
            </Card>
            <Card className="stat-card-premium">
              <div className="stat-icon-wrapper" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <Target size={24} />
              </div>
              <div className="stat-info">
                <p>Recent Deployment</p>
                <h3>₹{stats.latest.toLocaleString()}</h3>
              </div>
            </Card>
          </div>

          {investmentData.length > 0 && (
            <Card className="chart-card-premium" style={{ marginBottom: '2.5rem', padding: '1.5rem', borderRadius: '24px' }}>
              <div className="chart-header" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Growth Insights</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Cumulative investment trajectory</p>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-emerald)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-emerald)" stopOpacity={0}/>
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
                      tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Invested']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="var(--color-emerald)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <section className="task-section">
            <div className="section-header">
              <div className="title-with-badge">
                <TrendingUp size={20} className="text-emerald-500" />
                <h2>Recent Investments</h2>
                <Badge variant="success">{investmentData.length}</Badge>
              </div>
            </div>

            <Card className="payments-table-card">
              <Table 
                columns={columns} 
                data={investmentData} 
                emptyMessage="No investments recorded yet. Use the form to log your first capital deployment." 
              />
            </Card>
          </section>
        </div>

        <aside className="reminder-sidebar">
          <div className="premium-form-card">
            <div className="form-head">
              <div className="form-icon" style={{ background: 'var(--color-emerald-light)', color: 'var(--color-emerald)' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <h3>Record Investment</h3>
                <p>New capital deployment</p>
              </div>
            </div>
            
            <form onSubmit={handleAddInvestment} className="reminder-form-redesign">
              <div className="redesign-group">
                <label>Amount (INR)</label>
                <div className="premium-input-field">
                  <span className="input-icon-prefix">₹</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={newInvestment.amount}
                    onChange={(e) => setNewInvestment({...newInvestment, amount: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="redesign-group">
                <label>Investment Date</label>
                <div className="premium-input-field">
                  <input 
                    type="date" 
                    value={newInvestment.date}
                    onChange={(e) => setNewInvestment({...newInvestment, date: e.target.value})}
                    required
                    className="date-input-system"
                    style={{ paddingLeft: '14px' }}
                  />
                </div>
              </div>

              <div className="redesign-group">
                <label>Note / Platform</label>
                <div className="premium-input-field">
                  <input 
                    type="text" 
                    placeholder="e.g. Mutual Fund, Stock, Crypto"
                    value={newInvestment.note}
                    onChange={(e) => setNewInvestment({...newInvestment, note: e.target.value})}
                    style={{ paddingLeft: '14px' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn-submit-redesign" disabled={submitting} style={{ background: 'var(--color-emerald)' }}>
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <><Target size={18} /> Record Investment</>}
              </button>
            </form>
          </div>
        </aside>
      </div>

      {confirmation.show && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-icon success">
              <CheckCircle size={40} />
            </div>
            <h2>{confirmation.title}</h2>
            <p>{confirmation.message}</p>
            <button className="btn-modal-ok" onClick={() => { setConfirmation({...confirmation, show: false}); refetch(); }}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
