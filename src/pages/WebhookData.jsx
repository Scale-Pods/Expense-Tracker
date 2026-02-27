import React from 'react';
import Card from '../components/common/Card';
import { useWebhookData } from '../hooks/useWebhookData';
import { useCurrency } from '../hooks/CurrencyContext';
import { Database, RefreshCw, AlertCircle, Calendar, CreditCard, DollarSign, Clock, CheckCircle } from 'lucide-react';
import '../styles/global.css';

const WebhookData = () => {
  const { data, loading, error } = useWebhookData();
  const { exchangeRate } = useCurrency();

  const formatWaitingFor = (val) => {
    try {
      if (typeof val === 'string' && val.startsWith('[')) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.join(", ");
      }
    } catch { /* ignore */ }
    return val;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="modern-loading-screen">
          <div className="loader-visual">
            <div className="loader-aura"></div>
            <div className="loader-ring"></div>
            <div className="loader-dot"></div>
          </div>
          <p className="loading-text-modern">Streaming Live Data</p>
        </div>
      );
    }

    if (error || (data && data.error)) {
      return (
        <div className="p-6 bg-red-50/80 border border-red-100 rounded-xl text-red-600 flex items-start shadow-sm hover:shadow-md transition-shadow">
          <AlertCircle className="mr-3 mt-0.5 flex-shrink-0" size={24} />
          <div>
            <h4 className="font-bold text-red-700 mb-1">Webhook Synchronization Failed</h4>
            <p className="text-sm text-red-600/90 leading-relaxed mb-2">{data?.message || error?.message || 'Could not fetch live data from the endpoint.'}</p>
            {data?.status && (
              <span className="inline-block mt-1 font-mono text-xs bg-red-100 px-2 py-1 rounded border border-red-200 text-red-700">
                HTTP {data.status}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return (
        <div className="p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <Database size={24} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No expenses currently found returned from the endpoint.</p>
          <p className="text-sm text-gray-400 mt-2">Check the n8n workflow execution logs.</p>
        </div>
      );
    }

    const expenses = data.data;

    const displayNames = {};
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Live Connection Established
          </span>
        <div className="flex items-center gap-3">
          <span className="text-sm bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full text-gray-500 font-medium flex items-center shadow-sm">
            <Database size={14} className="mr-2 text-gray-400" />
            {expenses.length} Records Ingestion
          </span>
          <span className="text-sm bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full text-blue-600 font-medium flex items-center shadow-sm">
            <RefreshCw size={14} className="mr-2 text-blue-400" />
            Rate: 1 USD = {exchangeRate.toFixed(2)} INR
          </span>
        </div>
        </div>
        
        <div className="overflow-x-auto bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100/80">
          <table className="w-full text-left text-sm whitespace-nowrap lg:whitespace-normal">
            <thead className="bg-[#f8fafc] border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl text-center w-16">No.</th>
                <th className="px-6 py-4 min-w-[200px]">Spent On</th>
                <th className="px-6 py-4 min-w-[120px]">Amount</th>
                <th className="px-6 py-4 min-w-[150px]">Date & Time</th>
                <th className="px-6 py-4 min-w-[150px]">Status & Payment</th>
                <th className="px-6 py-4 rounded-tr-xl min-w-[200px]">Missing Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {expenses.map((expense, idx) => {
                const rawName = expense["Spent On"] || 'Unknown Merchant';
                const nameKey = rawName.toLowerCase().trim();
                if (!displayNames[nameKey]) displayNames[nameKey] = rawName;
                const normalizedName = displayNames[nameKey];

                return (
                  <tr key={expense.UniqueID || idx} className="hover:bg-blue-50/30 transition-all duration-200 group">
                    <td className="px-6 py-5 text-center font-semibold text-gray-400">
                      <span className="bg-gray-50 w-8 h-8 rounded-full flex items-center justify-center mx-auto border border-gray-100 group-hover:bg-white transition-colors">
                        {expense.row_number || idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-gray-900 text-base mb-1">{normalizedName}</div>
                    <div className="flex items-center text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded w-fit group-hover:bg-white transition-colors border border-transparent group-hover:border-gray-100">
                      ID: {(expense.UniqueID || '').substring(0,8)}...
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-2">
                       {expense["Amount in $ (If Applicable)"] && expense["Amount in $ (If Applicable)"] !== "0" && (
                         <div className="flex items-center font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit border border-emerald-100">
                           <DollarSign size={14} className="mr-0.5 opacity-70" />
                           {expense["Amount in $ (If Applicable)"]}
                         </div>
                       )}
                       {expense["Amount in ₹"] && expense["Amount in ₹"] !== "INR Not Available" && expense["Amount in ₹"] !== "0" && (
                         <div className="flex items-center font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md w-fit border border-blue-100">
                           ₹ {expense["Amount in ₹"]}
                         </div>
                       )}
                       {(!expense["Amount in $ (If Applicable)"] || expense["Amount in $ (If Applicable)"] === "0") && (!expense["Amount in ₹"] || expense["Amount in ₹"] === "INR Not Available" || expense["Amount in ₹"] === "0") && (
                          <span className="text-gray-400 text-xs italic">N/A</span>
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center text-gray-700 font-medium mb-1.5">
                      <Calendar size={14} className="mr-2 text-primary opacity-80" />
                      {expense.Date || 'No Date'}
                    </div>
                    <div className="flex items-center text-gray-500 text-xs font-medium">
                      <Clock size={13} className="mr-2 opacity-70" />
                      {expense["Time "] || 'No Time'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                         <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                           expense.Type === 'One Time' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100'
                         }`}>
                           {expense.Type || 'Unknown'}
                         </span>
                         {expense.Status ? (
                            <span className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              <CheckCircle size={12} className="mr-1" />
                              {expense.Status}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[11px] uppercase tracking-wide font-semibold italic bg-gray-50 px-2 py-1 rounded border border-gray-100">Pending</span>
                          )}
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center text-xs text-gray-600 font-medium">
                          <span className="text-gray-400 w-12">From:</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{expense["Spent From"] || 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600 font-medium">
                          <span className="text-gray-400 w-12">Card:</span>
                          <span className="flex items-center">
                             <CreditCard size={12} className="mr-1.5 text-gray-400" />
                             {expense["Card Number"] || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    {expense["Waiting For"] && expense["Waiting For"] !== "[]" ? (
                      <div className="flex items-start text-amber-700 text-xs font-medium bg-amber-50/80 px-3 py-2.5 rounded-lg border border-amber-200/50 leading-relaxed shadow-sm">
                        <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0 text-amber-500" />
                        <span>{formatWaitingFor(expense["Waiting For"])}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-2 rounded-lg text-xs font-bold">
                        <CheckCircle size={14} className="mr-1.5" />
                        All Meta Present
                      </div>
                    )}
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary rounded-lg text-white">
          <Database size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Webhook Data</h1>
          <p className="text-gray-500 text-sm">Real-time sync from n8n automation workflow</p>
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-premium">
        <div className="p-1 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 px-4">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <span className="ml-2 text-xs text-gray-400 font-medium tracking-wider">WEBHOOK_RESPONSE_STREAM</span>
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </Card>
    </div>
  );
};

export default WebhookData;
