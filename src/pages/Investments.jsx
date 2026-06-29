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
  Target,
  RefreshCw,
  Database,
  Clock,
  ArrowRight,
  Wallet,
  Briefcase
} from 'lucide-react';
import { useWebhookData } from '../hooks/useWebhookData';
import { useAuth } from '../hooks/AuthContext';
import { useTheme } from '../hooks/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import CubeLoader from '../components/ui/cube-loader';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LabelList
} from 'recharts';
import WebhookDataSection from '../components/WebhookDataSection';
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
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // Lifted state for data switcher
  const [activeTab, setActiveTab] = useState('Investment');
  const { data: webhookResponse, loading, error, refetch } = useWebhookData(activeTab);

  const [isAreaHovered, setIsAreaHovered] = useState(false);

  const [dataTab, setDataTab] = useState('Investment');
  useEffect(() => {
    if (!loading && webhookResponse) {
      setDataTab(activeTab);
    }
  }, [loading, webhookResponse, activeTab]);

  const rawDataList = useMemo(() => {
    if (activeTab !== dataTab) return [];
    return webhookResponse?.data || [];
  }, [webhookResponse, activeTab, dataTab]);

  const investmentData = useMemo(() => {
    if (!Array.isArray(rawDataList)) return [];
    
    return rawDataList.map((item, idx) => {
      // Robust field mapping based on tab type
      let amount = 0;
      let date = '';
      let note = '';
      let name = '';

      if (activeTab === 'Investment') {
        amount = parseFloat(String(item.Amount || item.amount || item.Value || 0).replace(/[^0-9.-]/g, ''));
        date = item.Date || item.date || item.Timestamp || '';
        note = item.Note || item.note || item["Note / Platform"] || 'N/A';
        name = item.Name || item.name || 'User';
      } else if (activeTab === 'Client') {
        amount = parseFloat(String(item["Income Amount"] || item.Amount || 0).replace(/[^0-9.-]/g, ''));
        date = item["Realised Date"] || item.Date || '';
        note = item.Service || item["Service Type"] || 'N/A';
        name = item["Client Name"] || item.Client || 'Client';
      } else {
        // Expense
        amount = parseFloat(String(item["Amount in ₹"] || item.Amount || 0).replace(/[^0-9.-]/g, ''));
        date = item.Date || '';
        note = item["Spent On"] || 'N/A';
        name = item.Category || item.Type || 'Uncategorized';
      }
      
      return {
        id: item.UniqueID || item.id || idx,
        amount,
        date,
        note,
        name,
        rowNumber: item.row_number || (idx + 1)
      };
    });
  }, [rawDataList, activeTab]);

  const stats = useMemo(() => {
    const total = investmentData.reduce((sum, item) => sum + item.amount, 0);
    return {
      total,
      count: investmentData.length,
      latest: investmentData.length > 0 ? investmentData[0].amount : 0
    };
  }, [investmentData]);

  const chartData = useMemo(() => {
    const sorted = [...investmentData].sort((a, b) => {
        const [mA, dA, yA] = a.date.split('/');
        const [mB, dB, yB] = b.date.split('/');
        const dateA = new Date(`${yA}-${mA}-${dA}`);
        const dateB = new Date(`${yB}-${mB}-${dB}`);
        return dateA - dateB;
    });
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

  const isInvestment = activeTab === 'Investment';
  const isRevenue = activeTab === 'Client';
  const isExpense = activeTab === 'Expense';

  const columns = [
    { header: 'Date', accessor: 'date', align: 'left', render: (row) => <span className="font-medium">{row.date}</span> },
    { header: `Amount (INR)`, accessor: 'amount', align: 'right', render: (row) => <span className="font-bold text-emerald-500">₹{row.amount.toLocaleString()}</span> },
    { header: isRevenue ? 'Service' : isExpense ? 'Description' : 'Note / Platform', accessor: 'note', align: 'left' },
    { header: isRevenue ? 'Client' : isExpense ? 'Category' : 'Investor', accessor: 'name', align: 'right' }
  ];

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

  if (loading && !webhookResponse) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CubeLoader />
      </div>
    );
  }

  return (
    <div className="reminders-container redesigned stagger-load">
      <div className="reminders-grid">
        <div className="main-tasks">
          <div className="flex justify-between items-end mb-8">
            <div className="reminders-welcome">
              <div className="welcome-tag">
                <Sparkles size={14} /> {isInvestment ? 'Growing Your Wealth' : isRevenue ? 'Tracking Income' : 'Monitoring Spend'}
              </div>
              <p className="top-tagline">
                {isInvestment ? 'Track your capital deployments and monitor financial growth.' : 
                 isRevenue ? 'Analyze client billables and incoming revenue streams.' : 
                 'Review expenditure patterns and categorical outflows.'}
              </p>
              <h1>{isInvestment ? 'Investment Portfolio' : isRevenue ? 'Revenue Stream' : 'Expenditure Analysis'}</h1>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Live Sync Status</span>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-500">Connected · {activeTab}</span>
                </div>
              </div>
              <button 
                onClick={() => refetch()} 
                className="p-3 bg-glass-bg border border-glass-border rounded-xl hover:bg-glass-highlight transition-all hover:scale-105 active:scale-95 group shadow-sm"
                title="Force Refresh Data"
              >
                <RefreshCw size={18} className={`text-emerald-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
            </div>
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '2rem', display: 'grid', gap: '1.5rem' }}>
            <Card className="stat-card-premium">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                {isInvestment ? <TrendingUp size={24} /> : isRevenue ? <Briefcase size={24} /> : <Wallet size={24} />}
              </div>
              <div className="stat-info">
                <p>Total {isRevenue ? 'Revenue' : 'Capital'}</p>
                <h3>₹{stats.total.toLocaleString()}</h3>
              </div>
            </Card>
            <Card className="stat-card-premium">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <Target size={24} />
              </div>
              <div className="stat-info">
                <p>Recent {isRevenue ? 'Receipt' : 'Deployment'}</p>
                <h3>₹{stats.latest.toLocaleString()}</h3>
              </div>
            </Card>
          </div>

          {investmentData.length > 0 && (
            <Card className="chart-card-premium" style={{ marginBottom: '2.5rem', padding: '1.5rem', borderRadius: '24px' }}>
              <div className="chart-header" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{isRevenue ? 'Revenue Trajectory' : 'Growth Insights'}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Cumulative {activeTab.toLowerCase()} over time</p>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)' }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, `Total ${activeTab}`]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTotal)"
                      onMouseEnter={() => setIsAreaHovered(true)}
                      onMouseLeave={() => setIsAreaHovered(false)}
                    >
                      {!isAreaHovered && (
                        <LabelList 
                          dataKey="total" 
                          position="top" 
                          offset={12}
                          formatter={(v) => `₹${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}`}
                          style={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)', fontSize: '10px', fontWeight: 'bold' }}
                        />
                      )}
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <section className="task-section">
            <div className="section-header">
              <div className="title-with-badge">
                {isInvestment ? <TrendingUp size={20} className="text-emerald-500" /> : <Database size={20} className="text-emerald-500" />}
                <h2>{activeTab} History</h2>
                <Badge variant="success">{investmentData.length}</Badge>
              </div>
            </div>

            <Card className="payments-table-card">
              <Table 
                columns={columns} 
                data={investmentData} 
                emptyMessage={`No ${activeTab.toLowerCase()} records recorded yet.`} 
              />
            </Card>
          </section>
        </div>

        <aside className="reminder-sidebar">
          {isInvestment && (
            <div className="premium-form-card">
              <div className="form-head">
                <div className="form-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
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

                <button type="submit" className="btn-submit-redesign" disabled={submitting} style={{ background: '#10b981' }}>
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : <><Target size={18} /> Record Investment</>}
                </button>
              </form>
            </div>
          )}

          <div className="info-card-modern">
            <div className="info-icon"><Database size={18} /></div>
            <div className="info-text">
              <h4>Real-time Ingestion</h4>
              <p>All data is instantly tracked across global sheets.</p>
            </div>
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
