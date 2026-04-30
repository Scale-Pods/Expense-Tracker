import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertCircle, Loader2, RefreshCw, ChevronRight, IndianRupee, DollarSign, Banknote } from 'lucide-react';
import '../../styles/billing-queue.css';

const BILLING_WEBHOOK_URL = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_BILLING}`;

const getCurrencyIcon = (currency) => {
  const c = (currency || 'INR').toUpperCase();
  if (c === 'INR') return <IndianRupee size={14} />;
  if (c === 'USD') return <DollarSign size={14} />;
  return <Banknote size={14} />;
};

const BillingQueue = ({ onSelectClient }) => {
  const [queueAction, setQueueAction] = useState('proforma'); // 'proforma' or 'tax'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BILLING_WEBHOOK_URL}?action=${queueAction}`);
      if (!response.ok) throw new Error('Failed to fetch billing queue');
      const result = await response.json();
      
      console.log('Billing Queue Result:', result);
      
      let extractedData = [];
      if (Array.isArray(result)) {
        // Handle n8n standard format: [{json: {...}}, {json: {...}}] or just [{...}, {...}]
        extractedData = result.map(item => item.json || item);
      } else if (result.data && Array.isArray(result.data)) {
        extractedData = result.data;
      } else if (result.items && Array.isArray(result.items)) {
        extractedData = result.items;
      } else if (typeof result === 'object' && result !== null) {
        // Maybe it's a single object returned as data
        extractedData = [result.json || result];
      }
      
      setData(extractedData);
    } catch (err) {
      console.error('Error fetching queue:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [queueAction]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleClientClick = (item) => {
    if (onSelectClient) {
      onSelectClient(item, queueAction);
    }
  };

  return (
    <div className="billing-queue-section">
      <div className="queue-type-switch">
        <button 
          className={queueAction === 'proforma' ? 'active' : ''} 
          onClick={() => setQueueAction('proforma')}
        >
          Proforma Clients
        </button>
        <button 
          className={queueAction === 'tax' ? 'active' : ''} 
          onClick={() => setQueueAction('tax')}
        >
          Tax Clients
        </button>
        <div className={`switch-bg ${queueAction}`}></div>
      </div>

      <div className="queue-list">
        {loading ? (
          <div className="queue-state-container">
            <Loader2 className="spinner" size={32} />
            <p>Fetching {queueAction} clients...</p>
          </div>
        ) : error ? (
          <div className="queue-state-container error">
            <AlertCircle size={32} />
            <p>{error}</p>
            <button onClick={fetchQueue} className="retry-btn">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="queue-state-container empty">
            <Clock size={32} />
            <p>No {queueAction} clients found</p>
          </div>
        ) : (
          data.map((item, index) => {
            const clientName = item['Client Name'] || item.client || item.name || 'Unknown';
            const receivable = item['Receivables'] ?? item['Income Amount'] ?? item.amount ?? 0;
            const currency = item['Currency'] || item.currency || 'INR';
            const service = item['Service'] || '';

            return (
              <div 
                key={item.row_number || index} 
                className="queue-client-row"
                onClick={() => handleClientClick(item)}
                title="Click to load into invoice form"
              >
                <div className="client-row-left">
                  <div className="client-avatar">
                    {clientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="client-row-info">
                    <span className="client-row-name">{clientName}</span>
                    {service && <span className="client-row-service">{service}</span>}
                  </div>
                </div>
                <div className="client-row-right">
                  <span className="client-row-amount">
                    {getCurrencyIcon(currency)}
                    <span>{Number(receivable).toLocaleString()}</span>
                  </span>
                  <ChevronRight size={16} className="client-row-chevron" />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="queue-footer">
        <p>{data.length > 0 ? `${data.length} client${data.length > 1 ? 's' : ''} · Tap to create invoice` : 'Queue updates automatically'}</p>
      </div>
    </div>
  );
};

export default BillingQueue;
