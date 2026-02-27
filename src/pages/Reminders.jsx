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
  AlertCircle
} from 'lucide-react';
import '../styles/reminders.css';

const WEBHOOK_URL = 'https://n8n.srv1010832.hstgr.cloud/webhook/92cd2226-0f40-44fe-969b-03bef4a3e7cb';

const Reminders = () => {
  const [newReminder, setNewReminder] = useState({ title: '', dayOfMonth: '1', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: webhookResponse, loading, error, refetch } = useWebhookData('Reminder');
  const [manualReminders, setManualReminders] = useState([]);

  useEffect(() => {
    if (webhookResponse && webhookResponse.data && Array.isArray(webhookResponse.data)) {
      const formatted = webhookResponse.data.map((item, idx) => {
        // Robust mapping to handle different naming conventions from the webhook
        const title = item["Tracker Title"] || 
                    item["Spent On"] || 
                    item.Title || 
                    item.title || 
                    item["Service"] ||
                    'Untitled Reminder';
        
        let dayOfMonth = item["Day of Month"] || 
                         item.DayOfMonth || 
                         item.dayOfMonth || 
                         item.day || 
                         '1';
        
        // If dayOfMonth is default but a Date string exists, try to extract the day part
        if (dayOfMonth === '1' && item.Date && typeof item.Date === 'string') {
          const dateParts = item.Date.split('/');
          if (dateParts.length >= 1) {
            dayOfMonth = dateParts[0];
          }
        }

        const description = item["Notes & Context"] || 
                          item["Spent From"] ||
                          item.Description || 
                          item.description || 
                          item["Vendor"] ||
                          '';

        return {
          id: item.UniqueID || item.id || `rem-${idx}`,
          title,
          dayOfMonth,
          description,
          status: item.Status || item.status || 'pending'
        };
      });
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
        data: {
          ...newReminder,
          createdAt: new Date().toISOString()
        }
      };

      const response = await fetch(`${WEBHOOK_URL}?action=MonthlyR`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setNewReminder({ title: '', dayOfMonth: '1', description: '' });
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error('Failed to send reminder:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    refetch(); // Fetch again after confirmation
  };


  const resolveReminder = (id) => {
    setManualReminders(manualReminders.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
  };

  const deleteReminder = (id) => {
    setManualReminders(manualReminders.filter(r => r.id !== id));
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
            <p className="text-red-600/80">{error?.message || webhookResponse?.message || 'Could not synchronize with the reminder endpoint.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reminders-container redesigned">
      <div className="reminders-welcome">
        <div className="welcome-tag">
          <Sparkles size={14} /> Powering Financial Clarity
        </div>
        <h1>Action Center & Tasks</h1>
        <p>Intelligence-driven reminders to keep your spend tracking precise.</p>
      </div>

      <div className="reminders-grid">
        <div className="main-tasks">

          {/* Planned Tasks Section */}
          <section className="task-section">
            <div className="section-header">
              <div className="title-with-badge">
                <Bell size={20} className="text-primary" />
                <h2>Manual Trackers</h2>
                <Badge variant="info">{manualReminders.filter(r => r.status !== 'resolved').length}</Badge>
              </div>
              <p className="section-desc">Personal tasks and monthly recurring milestones</p>
            </div>
            
            <div className="modern-task-list">
              {manualReminders.length > 0 ? (
                manualReminders.map((item) => (
                  <div key={item.id} className={`task-card manual ${item.status === 'resolved' ? 'resolved' : ''}`}>
                    <div className="task-main">
                      <div className="task-icon-container blue">
                        <Sparkles size={20} />
                      </div>
                      <div className="task-body">
                        <div className="task-top">
                          <h3>{item.title}</h3>
                          <div className="task-actions-group">
                            <span className="task-meta-tag"><Clock size={12} /> Day {item.dayOfMonth} monthly</span>
                            <button onClick={() => deleteReminder(item.id)} className="btn-delete-task" title="Delete Task">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="task-desc">{item.description}</p>
                        {item.status !== 'resolved' && (
                          <button onClick={() => resolveReminder(item.id)} className="btn-mark-done">
                            <CheckCircle size={14} /> Resolve Task
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state-simple">
                  <p>No planned tasks recorded.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Form */}
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
                    placeholder="e.g. Domain Renewal"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="redesign-group">
                <label>Day of Month</label>
                <div className="input-with-icon">
                  <Calendar size={16} className="icon" />
                  <select 
                    value={newReminder.dayOfMonth}
                    onChange={(e) => setNewReminder({...newReminder, dayOfMonth: e.target.value})}
                    required
                  >
                    {[...Array(30)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Day {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="redesign-group">
                <label>Notes & Context</label>
                <textarea 
                  placeholder="Key details to remember..."
                  value={newReminder.description}
                  onChange={(e) => setNewReminder({...newReminder, description: e.target.value})}
                ></textarea>
              </div>
              
              <button type="submit" className="btn-submit-redesign" disabled={submitting}>
                {submitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <><Send size={18} /> Save</>
                )}
              </button>
            </form>
          </div>
          
          <div className="info-card-modern">
            <div className="info-icon">
              <Info size={18} />
            </div>
            <div className="info-text">
              <h4>Direct Synchronization</h4>
              <p>All manual trackers created here are instantly deployed to your n8n automation workflow for centralized tracking.</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-icon success">
              <CheckCircle size={40} />
            </div>
            <h2>Tracker Saved Successfully</h2>
            <p>Your monthly tracker has been deployed to the automation workflow and is now active.</p>
            <button className="btn-modal-ok" onClick={handleCloseConfirmation}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
