import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { useWebhookData } from '../hooks/useWebhookData';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  Plus, 
  ClipboardList,
  Clock,
  Send,
  Loader2,
  Sparkles,
  Info,
  Trash2,
  IndianRupee,
  Tag,
  CreditCard,
  RefreshCw,
  Database,
  ArrowRight
} from 'lucide-react';
import CubeLoader from '../components/ui/cube-loader';
import WebhookDataSection from '../components/WebhookDataSection';
import AddCardDialog from '../components/reminders/AddCardDialog';
import ConfirmationPortal from '../components/reminders/ConfirmationPortal';
import '../styles/reminders.css';

const WEBHOOK_URL = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_GENERAL}`;

const Reminders = () => {
  const [newReminder, setNewReminder] = useState({ 
    title: '', 
    description: '',
    amount: '',
    costType: 'Salary',
    classification: 'Fixed Cost',
    debitDate: '1',
    mode: ''
  });
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState({ show: false, title: '', message: '' });
  const navigate = useNavigate();
  
  const { data: webhookResponse, loading, error, refetch } = useWebhookData('Reminder');




  const [manualReminders, setManualReminders] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState({});

  const toggleTaskExpansion = (id) => {
    setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchCards = async () => {
    setLoadingCards(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_DATA}?action=Cards`);
      const result = await response.json();
      if (result && result.data && Array.isArray(result.data)) {
        setCards(result.data);
        if (result.data.length > 0) {
          setNewReminder(prev => {
            if (prev.mode) return prev;
            const firstCard = result.data[0];
            const name = firstCard.Authorizer || firstCard.CardName || 'Card';
            const num = firstCard["Card Number"] || '';
            return { ...prev, mode: `${name}${num ? ` - ${num}` : ''}` };
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (webhookResponse && webhookResponse.data && Array.isArray(webhookResponse.data)) {
      const formatted = webhookResponse.data.map((item, idx) => {
        const title = item.Service || item["Tracker Title"] || item["Spent On"] || item.Title || item.title || 'Untitled Reminder';
        let dayOfMonth = item["Due Date"] || item["Day of Month"] || item.DayOfMonth || item.dayOfMonth || item.day || '1';
        if (dayOfMonth === '1' && item.Date && typeof item.Date === 'string') {
          const dateParts = item.Date.split('/');
          if (dateParts.length >= 1) dayOfMonth = dateParts[0];
        }
        const description = item.Description || item["Notes & Context"] || item["Spent From"] || item.description || item["Vendor"] || '';
        let amount = '0';
        if (item.Cost && item.Cost !== "0") amount = item.Cost;
        else if (item["Amount in ₹"] && item["Amount in ₹"] !== "0" && item["Amount in ₹"] !== "INR Not Available") amount = item["Amount in ₹"];
        else if (item["Amount in $ (If Applicable)"] && item["Amount in $ (If Applicable)"] !== "0") amount = item["Amount in $ (If Applicable)"];
        else amount = item.Amount || item["Amount"] || item.amount || '0';

        return {
          id: item.UniqueID || item.id || `rem-${idx}`,
          title,
          dayOfMonth,
          description,
          amount,
          costType: item["Cost Type"] || item.costType || 'Fixed',
          debitDate: item["Debit Date"] || item["Date of Debit"] || item.debitDate || dayOfMonth || '',
          mode: item["Payment Mode"] || item["Mode"] || item.mode || '',
          status: item.Status || item.status || 'pending',
          rowNumber: item.row_number || (idx + 1)
        };
      }).filter(r => r.title !== 'Untitled Reminder' || r.description);
      setManualReminders(formatted);
    }
  }, [webhookResponse]);

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.title) return;
    setSubmitting(true);
    try {
      const payload = {
        type: 'monthly_reminder',
        data: { ...newReminder, createdAt: new Date().toISOString() }
      };
      const response = await fetch(`${WEBHOOK_URL}?action=MonthlyR`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setNewReminder({ 
          title: '', description: '', amount: '', costType: 'Salary', classification: 'Fixed Cost', debitDate: '1',
          mode: cards.length > 0 ? `${cards[0].Authorizer || cards[0].CardName || 'Card'}${cards[0]["Card Number"] ? ` - ${cards[0]["Card Number"]}` : ''}` : ''
        });
        setConfirmation({
          show: true,
          title: 'Tracker Saved Successfully',
          message: 'Your monthly tracker has been deployed to the automation workflow.'
        });
      }
    } catch (error) {
      console.error('Failed to send reminder:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseConfirmation = () => {
    setConfirmation({ show: false, title: '', message: '' });
    refetch();
  };

  const handleCardSaved = async (displayName) => {
    setShowAddCard(false);
    // refresh the card list then auto-select the newly added card
    await fetchCards();
    setNewReminder(prev => ({ ...prev, mode: displayName }));
  };

  const resolveReminder = (id) => {
    setManualReminders(manualReminders.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
  };

  const deleteReminder = async (id) => {
    const itemToDelete = manualReminders.find(r => r.id === id);
    if (!itemToDelete) return;
    try {
      const response = await fetch(`${WEBHOOK_URL}?action=DLReminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...itemToDelete, row: itemToDelete.rowNumber })
      });
      if (response.ok) {
        setConfirmation({
          show: true,
          title: 'Tracker Deleted',
          message: 'The monthly tracker has been successfully removed.'
        });
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (loading && !webhookResponse && !manualReminders.length) {
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
                <Sparkles size={14} /> Powering Financial Clarity
              </div>
              <p className="top-tagline">Intelligence-driven reminders to keep your spend tracking precise.</p>
              <h1>Action Center & Tasks</h1>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Live Sync Status</span>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-500">Connected to Sheets</span>
                </div>
              </div>
              <button 
                onClick={() => refetch()} 
                className="p-3 bg-glass-bg border border-glass-border rounded-xl hover:bg-glass-highlight transition-all hover:scale-105 active:scale-95 group shadow-sm"
                title="Force Refresh Data"
              >
                <RefreshCw size={18} className={`text-primary ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
            </div>
          </div>

          <section className="task-section">
            <div className="section-header">
              <div className="title-with-badge">
                <Bell size={20} className="text-primary" />
                <h2>Manual Trackers</h2>
                <Badge variant="info">{manualReminders.filter(r => r.status !== 'resolved').length}</Badge>
              </div>
            </div>
            
            <div className="modern-task-list">
              {manualReminders.length > 0 ? (
                <div className="tasks-grid-modern">
                  {manualReminders.map((item) => (
                    <div key={item.id} className={`modern-tracker-card ${item.status === 'resolved' ? 'resolved' : ''}`}>
                      <div className="tracker-card-glow"></div>
                      <div className="tracker-header">
                        <div className="tracker-icon-box">
                          <Sparkles size={20} />
                        </div>
                        <div className="tracker-status-tag">
                          <Clock size={12} /> {item.status === 'resolved' ? 'Completed' : 'Active'}
                        </div>
                      </div>
                      <div className="tracker-content">
                        <h3>{item.title}</h3>
                        <p className="tracker-desc">{item.description}</p>
                        <div className="tracker-stats">
                          <div className="stat-pill">
                            <span className="pill-label">Amount</span>
                            <span className="pill-value">₹{item.amount}</span>
                          </div>
                          <div className="stat-pill">
                            <span className="pill-label">Schedule</span>
                            <span className="pill-value">Day {item.dayOfMonth}</span>
                          </div>
                        </div>
                      </div>
                      <div className="tracker-actions">
                        {item.status !== 'resolved' && (
                          <button onClick={() => resolveReminder(item.id)} className="action-btn-primary">
                            <CheckCircle size={16} /> Resolve
                          </button>
                        )}
                        <button onClick={() => deleteReminder(item.id)} className="action-btn-danger">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-simple">
                  <ClipboardList size={40} />
                  <p>No planned tasks recorded yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="reminder-sidebar">
          <div className="premium-form-card">
            <div className="form-head">
              <div className="form-icon">
                <Plus size={24} />
              </div>
              <div>
                <h3>Create Monthly Tracker</h3>
                <p>Syncs directly with n8n workflow</p>
              </div>
            </div>
            
            <form onSubmit={handleAddReminder} className="reminder-form-redesign">
              <div className="redesign-group">
                <label>Tracker Title</label>
                <div className="input-with-icon">
                  <ClipboardList size={16} className="icon" />
                  <input 
                    type="text" 
                    placeholder="e.g. AWS Reserved Instance"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="redesign-group">
                <label>Category (Type of Cost)</label>
                <div className="input-with-icon">
                  <Tag size={16} className="icon" />
                  <select 
                    value={newReminder.costType}
                    onChange={(e) => setNewReminder({...newReminder, costType: e.target.value})}
                    required
                  >
                    <option value="Salary">Salary</option>
                    <option value="One-Time tools">One-Time tools</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Ads">Ads</option>
                    <option value="Overheads">Overheads</option>
                  </select>
                </div>
              </div>

              <div className="redesign-group">
                <label>Cost Classification</label>
                <div className="input-with-icon">
                  <Database size={16} className="icon" />
                  <select 
                    value={newReminder.classification}
                    onChange={(e) => setNewReminder({...newReminder, classification: e.target.value})}
                    required
                  >
                    <option value="Fixed Cost">Fixed Cost</option>
                    <option value="Variable Cost">Variable Cost</option>
                  </select>
                </div>
              </div>

              <div className="redesign-group">
                <label>Date of Debit (Day of Month)</label>
                <div className="calendar-mini-grid">
                  {[...Array(31)].map((_, i) => {
                    const day = String(i + 1);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`calendar-mini-day ${newReminder.debitDate === day ? 'active' : ''}`}
                        onClick={() => setNewReminder({...newReminder, debitDate: day})}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="redesign-group">
                <div className="flex justify-between items-center mb-2">
                  <label className="mb-0">Payment Mode (Cards)</label>
                  <button 
                    type="button" 
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    onClick={() => setShowAddCard(true)}
                  >
                    + Add New
                  </button>
                </div>
                <div className="input-with-icon">
                  <CreditCard size={16} className="icon" />
                  <select 
                    value={newReminder.mode}
                    onChange={(e) => setNewReminder({...newReminder, mode: e.target.value})}
                    required
                    disabled={loadingCards}
                  >
                    {loadingCards ? (
                      <option>Loading cards...</option>
                    ) : (
                      <>
                        <option value="">Select a card...</option>
                        {cards.map((card, idx) => {
                          const display = `${card.Authorizer || card.CardName || 'Card'}${card["Card Number"] ? ` - ${card["Card Number"]}` : ''}`;
                          return <option key={idx} value={display}>{display}</option>;
                        })}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="redesign-group">
                <label>Amount (INR) - Optional</label>
                <div className="input-with-icon">
                  <IndianRupee size={16} className="icon" />
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={newReminder.amount}
                    onChange={(e) => setNewReminder({...newReminder, amount: e.target.value})}
                  />
                </div>
              </div>

              <div className="redesign-group">
                <label>Notes & Context</label>
                <textarea 
                  placeholder="Key details..."
                  value={newReminder.description}
                  onChange={(e) => setNewReminder({...newReminder, description: e.target.value})}
                ></textarea>
              </div>
              
              <button type="submit" className="btn-submit-redesign" disabled={submitting}>
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <><Send size={18} /> Save</>}
              </button>
            </form>
          </div>

          <div className="info-card-modern">
            <div className="info-icon"><Info size={18} /></div>
            <div className="info-text">
              <h4>Direct Synchronization</h4>
              <p>All manual trackers created here are instantly deployed to n8n.</p>
            </div>
          </div>
        </aside>
      </div>

      <WebhookDataSection initialType="Expense" />

      {confirmation.show && (
        <ConfirmationPortal
          title={confirmation.title}
          message={confirmation.message}
          countdownSeconds={3}
          onClose={handleCloseConfirmation}
        />
      )}

      {showAddCard && (
        <AddCardDialog
          onSuccess={handleCardSaved}
          onClose={() => setShowAddCard(false)}
        />
      )}
    </div>
  );
};



export default Reminders;
