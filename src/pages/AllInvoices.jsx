import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, RefreshCw, Search, Download, ArrowUpDown,
  Calendar, User, DollarSign, Loader2, AlertCircle, Receipt, Eye, X
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { reconstructInvoiceData } from '../utils/invoiceUtils';
import { InvoicePaper } from '../components/invoice/InvoiceTemplates';
import '../styles/all-invoices.css';

const AllInvoices = () => {
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
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
    if (['amountPaid'].includes(sortField)) {
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
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Invoice Types</option>
            <option value="tax">Tax Invoice</option>
            <option value="proforma">Proforma Invoice</option>
          </select>
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
                  <th onClick={() => handleSort('amountPaid')}><span>Amount Paid</span><ArrowUpDown size={12} /></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv, idx) => (
                  <tr key={idx} onClick={() => handleRowClick(inv)} className="clickable-row">
                    <td className="td-client">
                      <User size={14} />
                      <span className="client-name">{inv.clientName || inv.name?.split?.('\n')?.[0] || '—'}</span>
                    </td>
                    <td className="td-date"><Calendar size={14} /><span>{fmtDate(inv.invoiceDate)}</span></td>
                    <td className="td-email">{inv.email || '—'}</td>
                    <td><span className={`ai-badge ${inv.type?.toLowerCase() === 'tax' ? 'badge-tax' : 'badge-proforma'}`}>{inv.type || '—'}</span></td>
                    <td className="td-amount paid">
                      <span className="currency">{inv.currency === 'AED' ? 'AED' : '₹'}</span>
                      {Number(inv.amountPaid || 0).toLocaleString()}
                    </td>
                    <td>
                      <button 
                        className="ai-download-btn" 
                        onClick={(e) => handleDirectDownload(inv, e, idx)}
                        disabled={isDownloading !== null}
                      >
                        {isDownloading === idx ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewInvoice && !isDownloading && (
        <div className="ai-modal-overlay" onClick={() => setViewInvoice(null)}>
          <div className="ai-modal-content" onClick={e => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>View Invoice</h3>
              <button className="ai-modal-close" onClick={() => setViewInvoice(null)}><X size={20} /></button>
            </div>
            <div className="ai-modal-body">
              <div className="readonly-notice"><Eye size={14} /> Read-only View</div>
              <div className="invoice-preview-container">
                <InvoicePaper data={viewInvoice} />
              </div>
            </div>
          </div>
        </div>
      )}

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
