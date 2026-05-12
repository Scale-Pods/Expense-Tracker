import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Database, 
  Clock, 
  Calendar, 
  CheckCircle, 
  ArrowRight, 
  TrendingUp, 
  Wallet, 
  Briefcase,
  RefreshCw
} from 'lucide-react';
import { useWebhookData } from '../hooks/useWebhookData';
import Card from './common/Card';

const WebhookDataSection = ({ 
  initialType = 'Expense', 
  activeTab: controlledTab, 
  onTabChange,
  externalData,
  externalLoading,
  externalRefetch
}) => {
  const navigate = useNavigate();
  const [internalTab, setInternalTab] = useState(initialType);
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
  
  const setActiveTab = (tab) => {
    if (onTabChange) onTabChange(tab);
    setInternalTab(tab);
  };

  // Fetch internally only if external data is not provided
  const internalFetch = useWebhookData(activeTab);
  
  const webhookResponse = externalData !== undefined ? externalData : internalFetch.data;
  const loading = externalLoading !== undefined ? externalLoading : internalFetch.loading;
  const refetch = externalRefetch !== undefined ? externalRefetch : internalFetch.refetch;

  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (webhookResponse) {
      setLastUpdated(new Date());
    }
  }, [webhookResponse]);

  const tabs = [
    { id: 'Expense', label: 'Expenditure', icon: Wallet },
    { id: 'Investment', label: 'Investments', icon: TrendingUp },
    { id: 'Client', label: 'Client Revenue', icon: Briefcase },
  ];

  const rawData = webhookResponse?.data || [];

  const renderTableHeader = () => {
    switch (activeTab) {
      case 'Investment':
        return (
          <tr>
            <th>Investor</th>
            <th>Amount</th>
            <th>Platform / Note</th>
            <th>Date</th>
          </tr>
        );
      case 'Client':
        return (
          <tr>
            <th>Client Name</th>
            <th>Service</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        );
      default:
        return (
          <tr>
            <th>Spent On</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        );
    }
  };

  const renderTableRow = (item, idx) => {
    switch (activeTab) {
      case 'Investment':
        return (
          <tr key={idx} className="hover:bg-primary/5 transition-colors">
            <td className="font-bold text-main">{item.Name || item.name || 'User'}</td>
            <td className="font-mono font-bold text-emerald-400">
              ₹ {parseFloat(String(item.Amount || item.Value || 0).replace(/[^0-9.-]/g, '')).toLocaleString()}
            </td>
            <td className="text-sm text-muted">
              {item.Note || item["Note / Platform"] || 'N/A'}
            </td>
            <td>
              <div className="flex items-center gap-2 text-muted text-xs font-medium">
                <Calendar size={12} />
                {item.Date || item.date || 'N/A'}
              </div>
            </td>
          </tr>
        );
      case 'Client':
        return (
          <tr key={idx} className="hover:bg-primary/5 transition-colors">
            <td className="font-bold text-main">{item["Client Name"] || item.Client || 'Unknown'}</td>
            <td>
              <span className="px-2 py-1 rounded-md bg-glass-bg border border-glass-border text-[10px] font-bold uppercase">
                {item.Service || item["Service Type"] || 'N/A'}
              </span>
            </td>
            <td className="font-mono font-bold text-emerald-400">
              {item.Currency || '₹'} {item["Income Amount"] || item.Amount || '0'}
            </td>
            <td>
              <div className="flex items-center gap-2 text-muted text-xs font-medium">
                <Calendar size={12} />
                {item["Realised Date"] || item.Date || 'N/A'}
              </div>
            </td>
            <td>
              <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold uppercase bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 w-fit">
                <CheckCircle size={10} />
                {item.Status || 'Active'}
              </div>
            </td>
          </tr>
        );
      default:
        return (
          <tr key={idx} className="hover:bg-primary/5 transition-colors">
            <td className="font-bold text-main">{item["Spent On"] || 'Unknown'}</td>
            <td>
              <span className="px-2 py-1 rounded-md bg-glass-bg border border-glass-border text-xs font-semibold">
                {item.Category || item.Type || 'Uncategorized'}
              </span>
            </td>
            <td className="font-mono font-bold text-main">
              {item["Amount in ₹"] && item["Amount in ₹"] !== "0" ? `₹${item["Amount in ₹"]}` : `$${item["Amount in $ (If Applicable)"] || '0'}`}
            </td>
            <td>
              <div className="flex items-center gap-2 text-muted text-sm">
                <Calendar size={12} />
                {item.Date || 'N/A'}
              </div>
            </td>
            <td>
              {item.Status ? (
                <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                  <CheckCircle size={12} />
                  {item.Status}
                </span>
              ) : (
                <span className="text-muted text-xs italic">Pending</span>
              )}
            </td>
          </tr>
        );
    }
  };

  return (
    <div className="recent-transactions-section" style={{ marginTop: '3rem', paddingBottom: '2rem' }}>
      <div className="section-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-primary/10 rounded-lg text-primary">
             <Database size={20} />
           </div>
           <div>
             <h3 className="text-xl font-bold">Fetched Webhook Data</h3>
             <p className="text-sm text-muted">Raw records being ingested and analyzed in real-time</p>
           </div>
        </div>
        
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex items-center gap-2 text-xs font-medium text-muted bg-glass-bg px-3 py-1.5 rounded-full border border-glass-border mr-2">
            <Clock size={12} />
            Last Synced: {format(lastUpdated, 'HH:mm:ss')}
          </div>
          <button 
            onClick={() => refetch()} 
            className="p-2 bg-glass-bg border border-glass-border rounded-lg hover:bg-glass-highlight transition-all hover:scale-105 active:scale-95 group"
            title="Refresh active stream"
          >
            <RefreshCw size={16} className={`text-primary ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </div>

      <div className="tab-switcher-container mb-6">
        <div className="tab-switcher-wrapper">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="raw-data-card overflow-hidden">
        <div className="overflow-x-auto min-h-[400px] relative">
          {loading && (
             <div className="absolute inset-0 bg-glass-bg/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <RefreshCw size={32} className="text-primary animate-spin" />
             </div>
          )}
          <table className="raw-data-table w-full text-left">
            <thead>
              {renderTableHeader()}
            </thead>
            <tbody>
              {rawData.length > 0 ? (
                rawData.slice(0, 10).map((item, idx) => renderTableRow(item, idx))
              ) : (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-muted">
                    {loading ? 'Fetching records...' : 'No records found in this stream.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rawData.length > 10 && (
           <div className="p-6 border-t border-glass-border flex justify-center bg-glass-highlight/20">
              <button 
                 onClick={() => navigate('/webhook')}
                 className="flex items-center gap-2 text-sm font-bold text-primary hover:gap-4 transition-all group"
              >
                View All {rawData.length} Records 
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
        )}
      </Card>
    </div>
  );
};

export default WebhookDataSection;
