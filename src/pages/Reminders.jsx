import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { useWebhookData } from '../hooks/useWebhookData';
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
  Loader,
  AlertCircle,
  IndianRupee,
  Tag,
  CreditCard
} from 'lucide-react';
import '../styles/reminders.css';

const WEBHOOK_URL = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_GENERAL}`;

const Reminders = () => {
  const [newReminder, setNewReminder] = useState({ 
    title: '', 
    description: '',
    amount: '',
    costType: 'Fixed',
    debitDate: '1',
    mode: ''
  });
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', number: '' });
  const [submittingCard, setSubmittingCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState({ show: false, title: '', message: '' });
  
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
          title: '', description: '', amount: '', costType: 'Fixed', debitDate: '1',
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
    setConfirmation({ ...confirmation, show: false });
    refetch();
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCard.name) return;
    setSubmittingCard(true);
    try {
      const response = await fetch(`${WEBHOOK_URL}?action=AddCard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard)
      });
      if (response.ok) {
        setIsAddCardModalOpen(false);
        const addedCardDisplay = `${newCard.name}${newCard.number ? ` - ${newCard.number}` : ''}`;
        setNewReminder(prev => ({ ...prev, mode: addedCardDisplay }));
        setNewCard({ name: '', number: '' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchCards();
      }
    } catch (error) {
      console.error('Failed to add card:', error);
    } finally {
      setSubmittingCard(false);
    }
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

  if (loading) {
    return (
      <div className="modern-loading-screen">
        <div className="loader-visual">
          <div className="loader-aura"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>
        <p className="loading-text-modern">Syncing Monthly Trackers</p>
      </div>
    );
  }

  if (error || (webhookResponse && webhookResponse.error)) {
    return (
      <div className="reminders-container redesigned">
        <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-start shadow-sm max-w-2xl mx-auto mt-20">
          <AlertCircle className="text-red-500 mr-4 mt-1" size={32} />
          <div>
            <h3 className="text-xl font-bold text-red-700">Sync Failed</h3>
            <p className="text-red-600/80">{error?.message || webhookResponse?.message || 'Could not synchronize.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reminders-container redesigned">
      <div className="reminders-grid">
        <div className="main-tasks">
          <div className="reminders-welcome">
            <div className="welcome-tag">
              <Sparkles size={14} /> Powering Financial Clarity
            </div>
            <h1>Action Center & Tasks</h1>
            <p>Intelligence-driven reminders to keep your spend tracking precise.</p>
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
                <label>Amount (INR)</label>
                <div className="input-with-icon">
                  <IndianRupee size={16} className="icon" />
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={newReminder.amount}
                    onChange={(e) => setNewReminder({...newReminder, amount: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="redesign-group">
                <label>Type of Cost</label>
                <div className="input-with-icon">
                  <Tag size={16} className="icon" />
                  <select 
                    value={newReminder.costType}
                    onChange={(e) => setNewReminder({...newReminder, costType: e.target.value})}
                    required
                  >
                    <option value="Fixed">Fixed Cost</option>
                    <option value="Variable">Variable Cost</option>
                  </select>
                </div>
              </div>

              <div className="redesign-group">
                <label>Date of Debit (Day of Month)</label>
                <div className="calendar-mini-grid">
                  {[...Array(30)].map((_, i) => {
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
                <label>Payment Mode (Cards)</label>
                <div className="input-with-icon">
                  <CreditCard size={16} className="icon" />
                  <select 
                    value={newReminder.mode}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') setIsAddCardModalOpen(true);
                      else setNewReminder({...newReminder, mode: e.target.value});
                    }}
                    required
                    disabled={loadingCards}
                  >
                    {loadingCards ? (
                      <option>Loading cards...</option>
                    ) : (
                      <>
                        {cards.map((card, idx) => {
                          const display = `${card.Authorizer || card.CardName || 'Card'}${card["Card Number"] ? ` - ${card["Card Number"]}` : ''}`;
                          return <option key={idx} value={display}>{display}</option>;
                        })}
                        <option value="ADD_NEW">+ Add New Card...</option>
                      </>
                    )}
                  </select>
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

      {confirmation.show && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <CheckCircle size={40} className="modal-icon success" />
            <h2>{confirmation.title}</h2>
            <p>{confirmation.message}</p>
            <button className="btn-modal-ok" onClick={handleCloseConfirmation}>OK</button>
          </div>
        </div>
      )}

      <AddCardModal 
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onSave={handleAddCard}
        cardData={newCard}
        setCardData={setNewCard}
        submitting={submittingCard}
      />
    </div>
  );
};

const AddCardModal = ({ isOpen, onClose, onSave, cardData, setCardData, submitting }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="confirmation-modal">
        <CreditCard size={40} className="modal-icon" />
        <h2>Add New Card</h2>
        <form onSubmit={onSave} className="reminder-form-redesign" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <div className="redesign-group">
            <label>Card Name</label>
            <input type="text" value={cardData.name} onChange={(e) => setCardData({...cardData, name: e.target.value})} required className="pwd-input" />
          </div>
          <div className="redesign-group">
            <label>Last 4 Digits</label>
            <input type="text" value={cardData.number} onChange={(e) => setCardData({...cardData, number: e.target.value})} maxLength={4} className="pwd-input" />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
            <button type="button" className="btn-modal-ok" style={{ background: 'var(--color-border)' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-modal-ok" disabled={submitting}>
              {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Save Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Reminders;
