import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, RefreshCw, Search, Download, ArrowUpDown,
  Calendar, User, DollarSign, Loader2, AlertCircle, Receipt, Eye, X, Send, Repeat
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { reconstructInvoiceData } from '../utils/invoiceUtils';
import { InvoicePaper } from '../components/invoice/InvoiceTemplates';
import EmailDialog from '../components/invoice/EmailDialog';
import CustomSelect from '../components/common/CustomSelect';
import '../styles/all-invoices.css';

const AllInvoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('invoiceDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterType, setFilterType] = useState('all');
  
  // Modal state
  const [viewInvoice, setViewInvoice] = useState(null);
  const [isDownloading, setIsDownloading] = useState(null); // Row index
  const downloadContainerRef = useRef();

  // Email state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailInvoiceData, setEmailInvoiceData] = useState(null);
  const [emailPdfBlob, setEmailPdfBlob] = useState(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [isViewSending, setIsViewSending] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_DATA}?action=Invoice`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const json = await res.json();
      
      let list = [];
      if (Array.isArray(json) && json[0]?.data) list = json[0].data;
      else if (Array.isArray(json)) list = json;
      else if (json?.data) list = Array.isArray(json.data) ? json.data : [json.data];
      else list = [json];
      
      setInvoices(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleDirectDownload = async (row, e, index) => {
    e.stopPropagation();
    setIsDownloading(index);
    const data = reconstructInvoiceData(row);
    
    // Create a temporary div for html2pdf
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    
    // We need to render the component into this element
    // Since we're in React, we'll use a hidden ref instead for better reliability
    setViewInvoice(data); // Set data so it renders in the hidden ref
    
    setTimeout(async () => {
      const pdfElement = downloadContainerRef.current;
      const opt = {
        margin: 0,
        filename: `Invoice_${data.name?.split('\n')[0] || 'Record'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css'] }
      };

      try {
        await html2pdf().set(opt).from(pdfElement).save();
      } catch (err) {
        console.error('Download failed', err);
      } finally {
        setIsDownloading(null);
        setViewInvoice(null);
        document.body.removeChild(element);
      }
    }, 500);
  };

  const handleRowClick = (row) => {
    const data = reconstructInvoiceData(row);
    setViewInvoice(data);
  };

  const handleEmailClick = async (row, e) => {
    e.stopPropagation();
    setIsEmailLoading(true);
    const data = reconstructInvoiceData(row);
    setViewInvoice(data);

    setTimeout(async () => {
      try {
        const opt = {
          margin: 0,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css'] }
        };
        const rawBlob = await html2pdf().set(opt).from(downloadContainerRef.current).output('blob');
        const blob = new Blob([rawBlob], { type: 'application/pdf' });
        setEmailPdfBlob(blob);
        setEmailInvoiceData(data);
        setShowEmailDialog(true);
      } catch (err) {
        console.error('PDF generation for email failed', err);
        alert('Failed to generate PDF for email');
      } finally {
        setIsEmailLoading(false);
      }
    }, 500);
  };

  const handleEmailSend = async ({ subject, body }) => {
    if (!emailInvoiceData || !emailPdfBlob) {
      alert('Error: No data to send');
      return;
    }

    setIsEmailSending(true);
    try {
      const data = emailInvoiceData;
      const clientName = data.name?.split('\n')[0] || '';
      const clientAddress = data.name?.split('\n').slice(1).join(', ') || '';
      const items = data.items || [];
      const itemsJson = JSON.stringify(items);
      const lineItemDescription = items.map(item => item.description).filter(Boolean).join(', ');

      const typeKey = (data.type || 'Proforma').toLowerCase().replace('proforma', 'performa');
      const regionKey = (data.region || 'India').toLowerCase();
      const actionType = `${typeKey}${regionKey}`;

      const payload = {
        event: 'send',
        invoiceType: `${typeKey}-${regionKey}`,
        type: data.type || '',
        region: data.region || '',
        name: data.name || '',
        clientName,
        clientAddress,
        email: data.email || '',
        lineItemDescription,
        currency: data.currency || '',
        amount: data.amount || '',
        amountPaid: data.amountPaid || '',
        dueAmount: data.dueAmount || '',
        invoiceDate: data.invoiceDate || '',
        dueDate: data.dueDate || '',
        paymentTerm: data.paymentTerm || '',
        items: itemsJson,
        clientGstin: data.clientGstin || '',
        clientState: data.clientState || '',
        myGstin: data.myGstin || '',
        sacCode: data.sacCode || '',
        amountInWords: data.amountInWords || '',
        accHolder: data.accHolder || '',
        bankName: data.bankName || '',
        accNo: data.accNo || '',
        ifsc: data.ifsc || '',
        branch: data.branch || '',
        accType: data.accType || '',
        terms: data.terms || '',
        emailSubject: subject,
        emailBody: body,
      };

      const webhookUrl = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_INVOICE}?action=${actionType}`;

      const formData = new FormData();
      formData.append('file', emailPdfBlob, `Invoice_${clientName.replace(/\s+/g, '_')}.pdf`);
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setShowEmailDialog(false);
        setEmailPdfBlob(null);
        setEmailInvoiceData(null);
        alert('Invoice sent successfully!');
      } else {
        const errorText = await response.text();
        throw new Error(`Webhook failed: ${errorText}`);
      }
    } catch (err) {
      alert('Error: ' + err.message);
      console.error('Email Send Error:', err);
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleViewSend = async () => {
    if (!viewInvoice) return;
    const clientName = viewInvoice.name?.split('\n')[0] || 'Client';
    const typeLabel = viewInvoice.type || 'Proforma';
    if (!window.confirm(`Send this ${typeLabel} invoice to ${clientName}?`)) return;

    setIsViewSending(true);
    try {
      await new Promise(r => setTimeout(r, 300));

      const opt = {
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css'] }
      };
      const rawBlob = await html2pdf().set(opt).from(downloadContainerRef.current).output('blob');
      const blob = new Blob([rawBlob], { type: 'application/pdf' });

      setEmailPdfBlob(blob);
      setEmailInvoiceData(viewInvoice);
      setShowEmailDialog(true);
    } catch (err) {
      alert('Error generating PDF: ' + err.message);
      console.error('View Send Error:', err);
    } finally {
      setIsViewSending(false);
    }
  };

  // Filtering
  const filtered = invoices.filter(inv => {
    const name = (inv.clientName || inv.name || '').toLowerCase();
    const email = (inv.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || name.includes(search) || email.includes(search);
    const matchesType = filterType === 'all' || (inv.type || '').toLowerCase() === filterType;
    return matchesSearch && matchesType;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (['amount', 'amountPaid'].includes(sortField)) {
      valA = Number(valA) || 0; valB = Number(valB) || 0;
    } else {
      valA = valA.toString().toLowerCase(); valB = valB.toString().toLowerCase();
    }
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className="all-invoices-page">
      <div className="ai-page-header">
        <div className="ai-header-text">
          <p className="ai-tagline">History</p>
          <h1>Invoice Records</h1>
        </div>
        <button className="ai-refresh-btn" onClick={fetchInvoices} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
          <span>Refresh List</span>
        </button>
      </div>

      <div className="ai-controls">
        <div className="ai-search-box">
          <Search size={16} />
          <input type="text" placeholder="Search client or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="ai-filters">
          <CustomSelect 
            value={filterType} 
            onChange={setFilterType} 
            options={[
              { label: 'All Invoice Types', value: 'all' },
              { label: 'Tax Invoice', value: 'tax' },
              { label: 'Proforma Invoice', value: 'proforma' }
            ]}
          />
        </div>
      </div>

      <div className="ai-table-container glass-panel">
        {loading ? (
          <div className="ai-loading-state"><Loader2 size={36} className="spin" /><p>Fetching records...</p></div>
        ) : error ? (
          <div className="ai-error-state"><AlertCircle size={36} /><p>{error}</p><button onClick={fetchInvoices}>Try Again</button></div>
        ) : sorted.length === 0 ? (
          <div className="ai-empty-state"><FileText size={48} /><p>No records found</p></div>
        ) : (
          <div className="ai-table-scroll">
            <table className="ai-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('clientName')}><span>Client Name</span><ArrowUpDown size={12} /></th>
                  <th onClick={() => handleSort('invoiceDate')}><span>Date</span><ArrowUpDown size={12} /></th>
                  <th>Email Address</th>
                  <th>Type</th>
                  <th onClick={() => handleSort('amount')}><span>Amount</span><ArrowUpDown size={12} /></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv, idx) => (
                  <tr key={idx} onClick={() => handleRowClick(inv)} className="clickable-row">
                    <td className="td-client">
                      <span className="cell-inner">
                        <User size={14} />
                        <span className="client-name">{inv.clientName || inv.name?.split?.('\n')?.[0] || '—'}</span>
                      </span>
                    </td>
                    <td className="td-date"><span className="cell-inner"><Calendar size={14} /><span>{fmtDate(inv.invoiceDate)}</span></span></td>
                    <td className="td-email">{inv.email || '—'}</td>
                    <td><span className={`ai-badge ${inv.type?.toLowerCase() === 'tax' ? 'badge-tax' : inv.type?.toLowerCase() === 'proforma' ? 'badge-proforma' : ''}`}>{inv.type || '—'}</span></td>
                    <td className="td-amount">
                      <span className="currency">{inv.currency === 'AED' ? 'AED' : '₹'}</span>
                      {Number(inv.amount || 0).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          className="ai-download-btn" 
                          onClick={(e) => handleDirectDownload(inv, e, idx)}
                          disabled={isDownloading !== null || isEmailLoading}
                          title="Download PDF"
                        >
                          {isDownloading === idx ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                        </button>
                        <button 
                          className="ai-download-btn ai-email-btn" 
                          onClick={(e) => handleEmailClick(inv, e)}
                          disabled={isEmailLoading || isDownloading !== null}
                          title="Send via email"
                        >
                          {isEmailLoading ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewInvoice && !isDownloading && !isEmailLoading && !showEmailDialog && (
        <div className="ai-modal-overlay" onClick={() => setViewInvoice(null)}>
          <div className="ai-modal-content" onClick={e => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>View Invoice</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="ai-type-toggle"
                  onClick={() => setViewInvoice(prev => ({
                    ...prev,
                    type: prev.type === 'Tax' ? 'Proforma' : 'Tax'
                  }))}
                  title="Switch between Proforma and Tax"
                >
                  <Repeat size={14} />
                  <span>{viewInvoice.type === 'Tax' ? 'Proforma' : 'Tax'}</span>
                </button>
                <button
                  className="ai-view-send-btn"
                  onClick={handleViewSend}
                  disabled={isViewSending}
                  title="Send this invoice via email"
                >
                  {isViewSending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                  <span>{isViewSending ? 'Sending...' : 'Send'}</span>
                </button>
                <button className="ai-modal-close" onClick={() => setViewInvoice(null)}><X size={20} /></button>
              </div>
            </div>
            <div className="ai-modal-body">
              <div className="readonly-notice" onClick={() => navigate('/invoice', { state: { prefill: viewInvoice } })} title="Click to edit in Create Invoice"><Eye size={14} /> Read-only View — <strong>Click to Edit</strong></div>
              <div className="invoice-preview-container">
                <InvoicePaper data={viewInvoice} />
              </div>
            </div>
          </div>
        </div>
      )}

      <EmailDialog
        isOpen={showEmailDialog}
        onClose={() => { setShowEmailDialog(false); setEmailPdfBlob(null); }}
        onSend={handleEmailSend}
        invoiceData={emailInvoiceData}
        isSending={isEmailSending}
      />

      {/* Hidden container for background PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={downloadContainerRef}>
          {viewInvoice && <InvoicePaper data={viewInvoice} />}
        </div>
      </div>
    </div>
  );
};

export default AllInvoices;
