import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { 
  FileText, 
  Download, 
  Printer, 
  Share2, 
  Loader2, 
  Eye, 
  AlertCircle,
  Send
} from 'lucide-react';
import InvoiceForm from '../components/layout/InvoiceForm';
import '../styles/invoices.css';

const Invoices = () => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const invoiceRef = useRef();
  const paginatedContainerRef = useRef();

  const handleGenerate = async () => {
    if (!invoiceRef.current) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Use paginatedContainer if available (has all pages), else fall back to first page ref
      const element = paginatedContainerRef.current || invoiceRef.current;
      const opt = {
        margin: 0,
        filename: `Invoice_${liveData?.name || 'ScalePods'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], after: '.a4-page-block' }
      };

      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      setPdfBlob(pdfBlob);
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
    } catch (err) {
      setError('Failed to generate PDF locally: ' + err.message);
      console.error('PDF Generation Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToClient = async () => {
    if (!pdfBlob || !liveData) return;
    
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfBlob, `Invoice_${liveData.name.replace(/\s+/g, '_')}.pdf`);
      
      // Send individual fields for easier automation handling
      formData.append('to', liveData.email);
      formData.append('subject', `${liveData.type} Invoice - ${liveData.name}`);
      formData.append('body', `Dear ${liveData.name},\n\nPlease find attached the ${liveData.type.toLowerCase()} invoice for ${liveData.amount} ${liveData.currency}.\n\nBest regards,\nScalePods Team`);
      
      // Include original row details if it came from the Billing Queue
      if (liveData.originalDetails) {
        formData.append('details', JSON.stringify(liveData.originalDetails));
      }
      
      // Keep original data field for backward compatibility or complex needs
      formData.append('data', JSON.stringify(liveData));
      
      // Determine action type for the webhook query
      const actionType = liveData.originalDetails 
        ? `E${liveData.type.toLowerCase()}` 
        : liveData.type.toLowerCase();
      
      const webhookUrl = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_INVOICE}?action=${actionType}`;
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        alert('Invoice sent successfully to client!');
      } else {
        throw new Error('Failed to send to webhook');
      }
    } catch (err) {
      console.error('Send error:', err);
      alert('Error sending to client: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };



  const toWords = (num, currency = 'INR') => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertIndia = (n_val) => {
      const n = ('000000000' + n_val).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n) return '';
      let str = '';
      str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
      str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
      str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
      str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
      str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
      return str;
    };

    const convertInternational = (n_val) => {
      if (n_val === 0) return '';
      let str = '';
      if (n_val >= 1000000) {
        str += convertInternational(Math.floor(n_val / 1000000)) + 'Million ';
        n_val %= 1000000;
      }
      if (n_val >= 1000) {
        str += convertInternational(Math.floor(n_val / 1000)) + 'Thousand ';
        n_val %= 1000;
      }
      if (n_val >= 100) {
        str += a[Math.floor(n_val / 100)] + 'Hundred ';
        n_val %= 100;
      }
      if (n_val > 0) {
        if (str !== '') str += 'and ';
        if (n_val < 20) str += a[n_val];
        else str += b[Math.floor(n_val / 10)] + ' ' + a[n_val % 10];
      }
      return str;
    };

    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    
    let res = '';
    if (currency === 'INR') {
      res = convertIndia(whole) + 'Rupees ';
      if (fraction > 0) res += 'and ' + convertIndia(fraction) + 'Paise ';
    } else {
      res = convertInternational(whole) + (currency === 'AED' ? 'UAE Dirhams ' : currency + ' ');
      if (fraction > 0) res += 'and ' + convertInternational(fraction) + (currency === 'AED' ? 'Fils ' : '');
    }
    return res + 'Only';
  };

  const IndiaTaxInvoice = ({ data }) => {
    if (!data) return null;
    const termsArray = data.terms ? data.terms.split('\n').filter(t => t.trim() !== '') : [];
    const subtotal = Number(data.amount) || 0;
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    const total = subtotal + cgst + sgst;

    return (
      <div className="india-tax-invoice a4-container" style={{ padding: '0', border: '1px solid #e0e0e0', color: '#1a1a1a' }}>
        {/* Header Title */}
        <div style={{ textAlign: 'center', background: '#f2f2f2', padding: '6px', borderBottom: '2px solid #1a1a1a', letterSpacing: '2px' }}>
          <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', color: '#000' }}>Tax Invoice</h1>
        </div>
        
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ flex: 1, padding: '10px', borderRight: '1px solid #e0e0e0' }}>
            <img src="https://res.cloudinary.com/dc3a1bfvk/image/upload/v1777098139/ScalePods_-_Logo-_FINAL_----1-01_1_-min_hvvqyt.png" width="120" alt="Logo" style={{ marginBottom: '4px' }} />
            <div style={{ fontSize: '12px', lineHeight: '1.2' }}>
              <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>SCALEPODS LLP</strong>
              503-A Crescent House, 159/161 Crescent House,<br />
              Mumbai, MH - 400009<br />
              <strong>GSTIN:</strong> {data.myGstin || "27XXXXXXXXXXXXZ"}<br />
              <strong>State:</strong> Maharashtra (27)
            </div>
          </div>
          <div style={{ width: '280px', padding: '10px', background: '#fafafa', fontSize: '12px', lineHeight: '1.2' }}>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Invoice Number</span>
              <strong style={{ fontSize: '13px' }}>#TX/{data.name?.toUpperCase()}/{(data.invoiceDate || "").split('-').join('')}</strong>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Invoice Date</span>
              <strong>{data.invoiceDate}</strong>
            </div>
            <div>
              <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Place of Supply</span>
              <strong>{data.clientState || "Maharashtra (27)"}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ flex: 1, padding: '8px', borderRight: '1px solid #e0e0e0' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Bill To:</h3>
            <div style={{ fontSize: '13px', lineHeight: '1.2' }}>
              <strong style={{ fontSize: '15px', display: 'block' }}>{data.name}</strong>
              {data.email && <div style={{ color: '#555' }}>{data.email}</div>}
              <div style={{ marginTop: '8px' }}>
                <strong>GSTIN:</strong> {data.clientGstin || "Unregistered"}<br />
                <strong>State:</strong> {data.clientState || "Maharashtra"}
              </div>
            </div>
          </div>
          <div style={{ width: '280px', padding: '8px', fontSize: '12px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Bank Transfer Details:</h3>
            <div style={{ lineHeight: '1.2' }}>
              <strong>Bank:</strong> {data.bankName || "HDFC Bank Ltd"}<br />
              <strong>A/c Name:</strong> {data.accHolder || "SCALEPODS LLP"}<br />
              <strong>A/c No:</strong> {data.accNo || "50200119456950"}<br />
              <strong>IFSC:</strong> {data.ifsc || "HDFC0000060"}
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a1a1a', color: 'white' }}>
              <th style={{ padding: '6px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Description of Services</th>
              <th style={{ padding: '6px 15px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', width: '100px' }}>SAC</th>
              <th style={{ padding: '6px 15px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', width: '150px' }}>Amount ({data.currency})</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 15px', verticalAlign: 'top' }}>
                  <strong style={{ fontSize: '13px' }}>{item.description}</strong><br />
                  <span style={{ fontSize: '11px', color: '#666' }}>Software automation and workflow orchestration services.</span>
                </td>
                <td style={{ padding: '8px 15px', textAlign: 'center', verticalAlign: 'top', color: '#666' }}>998311</td>
                <td style={{ padding: '8px 15px', textAlign: 'right', verticalAlign: 'top', fontWeight: '600' }}>{Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
            
            <tr>
              <td colSpan="2" style={{ padding: '5px 15px', textAlign: 'right', color: '#666' }}>Subtotal (Taxable Value)</td>
              <td style={{ padding: '5px 15px', textAlign: 'right', fontWeight: '600' }}>{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            <tr>
              <td colSpan="2" style={{ padding: '3px 15px', textAlign: 'right', color: '#666' }}>CGST (9%)</td>
              <td style={{ padding: '3px 15px', textAlign: 'right', fontWeight: '600' }}>{cgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            <tr>
              <td colSpan="2" style={{ padding: '3px 15px', textAlign: 'right', color: '#666', borderBottom: '1px solid #eee' }}>SGST (9%)</td>
              <td style={{ padding: '3px 15px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #eee' }}>{sgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            <tr style={{ background: '#f8f9fa' }}>
              <td colSpan="2" style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px' }}>Grand Total (Incl. GST)</td>
              <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: '#1a1a1a' }}>{data.currency} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ padding: '5px 25px 0 25px', background: '#fff' }}>
          <div className="page-break-inside-avoid" style={{ padding: '8px', background: '#fafafa', borderLeft: '4px solid #1a1a1a' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '3px' }}>Total Amount in Words:</strong>
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
              {total > 0 ? (data.amountInWords || toWords(total, 'INR')) : "Zero Rupees Only"}
            </span>
          </div>
        </div>

        <div className="page-break-inside-avoid" style={{ padding: '8px 25px 0 25px', background: '#fff' }}>
          <strong style={{ fontSize: '11px', color: '#333', display: 'block', textTransform: 'uppercase' }}>Terms & Conditions:</strong>
        </div>

        {termsArray.length > 0 
          ? termsArray.map((t, i) => (
              <div key={i} className="page-break-inside-avoid" style={{ padding: '0 25px 0 25px', margin: 0, background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
                {t}
              </div>
            )) 
          : (
              <div className="page-break-inside-avoid" style={{ padding: '0 25px 0 25px', margin: 0, background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
                1. Standard terms apply. 2. This is a computer generated document.
              </div>
            )
        }
        <div style={{ paddingBottom: '25px', background: '#fff' }}></div>
      </div>
    );
  };

  const UAETaxInvoice = ({ data }) => {
    if (!data) return null;
    const termsArray = data.terms ? data.terms.split('\n').filter(t => t.trim() !== '') : [];
    const total = Number(data.amount) || 0;

    return (
      <div className="uae-tax-invoice a4-container" style={{ padding: '0', border: '1px solid #e0e0e0', color: '#1a1a1a' }}>
        {/* Header Title */}
        <div style={{ textAlign: 'center', background: '#f2f2f2', padding: '6px', borderBottom: '2px solid #1a1a1a', letterSpacing: '2px' }}>
          <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', color: '#000' }}>Tax Invoice</h1>
        </div>
        
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ flex: 1, padding: '10px', borderRight: '1px solid #e0e0e0' }}>
            <img src="https://res.cloudinary.com/dc3a1bfvk/image/upload/v1777098139/ScalePods_-_Logo-_FINAL_----1-01_1_-min_hvvqyt.png" width="120" alt="Logo" style={{ marginBottom: '4px' }} />
            <div style={{ fontSize: '12px', lineHeight: '1.2' }}>
              <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>SCALEPODS LLP</strong>
              503-A Crescent House, Mumbai, MH - 400009<br />
              <strong>TRN:</strong> {data.myGstin || "100XXXXXXXXXXXX"}<br />
            </div>
          </div>
          <div style={{ width: '280px', padding: '10px', background: '#fafafa', fontSize: '12px', lineHeight: '1.2' }}>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Invoice Number</span>
              <strong style={{ fontSize: '13px' }}>#TX/{data.name?.toUpperCase()}/{(data.invoiceDate || "").split('-').join('')}</strong>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Invoice Date</span>
              <strong>{data.invoiceDate}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ flex: 1, padding: '8px', borderRight: '1px solid #e0e0e0' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Bill To:</h3>
            <div style={{ fontSize: '13px', lineHeight: '1.2' }}>
              <strong style={{ fontSize: '15px', display: 'block' }}>{data.name}</strong>
              {data.email && <div style={{ color: '#555' }}>{data.email}</div>}
              <div style={{ marginTop: '8px' }}>
                <strong>TRN:</strong> {data.clientGstin || "Unregistered"}<br />
              </div>
            </div>
          </div>
          <div style={{ width: '280px', padding: '8px', fontSize: '12px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Bank Transfer Details:</h3>
            <div style={{ lineHeight: '1.2' }}>
              <strong>Bank:</strong> {data.bankName || "HDFC Bank Ltd"}<br />
              <strong>A/c Name:</strong> {data.accHolder || "SCALEPODS LLP"}<br />
              <strong>A/c No:</strong> {data.accNo || "50200119456950"}<br />
              <strong>IFSC:</strong> {data.ifsc || "HDFC0000060"}
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a1a1a', color: 'white' }}>
              <th style={{ padding: '6px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Description of Services</th>
              <th style={{ padding: '6px 15px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', width: '150px' }}>Amount ({data.currency})</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 15px', verticalAlign: 'top' }}>
                  <strong style={{ fontSize: '13px' }}>{item.description}</strong><br />
                  <span style={{ fontSize: '11px', color: '#666' }}>Services as discussed.</span>
                </td>
                <td style={{ padding: '8px 15px', textAlign: 'right', verticalAlign: 'top', fontWeight: '600' }}>{Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
            
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px' }}>Total Invoice Value</td>
              <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: '#1a1a1a' }}>{data.currency} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ padding: '5px 25px 0 25px', background: '#fff' }}>
          <div className="page-break-inside-avoid" style={{ padding: '8px', background: '#fafafa', borderLeft: '4px solid #1a1a1a' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '3px' }}>Total Amount in Words:</strong>
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
              {total > 0 ? (data.amountInWords || toWords(total, 'AED')) : "Zero UAE Dirhams Only"}
            </span>
          </div>
        </div>

        <div className="page-break-inside-avoid" style={{ padding: '8px 25px 0 25px', background: '#fff' }}>
          <strong style={{ fontSize: '11px', color: '#333', display: 'block', textTransform: 'uppercase' }}>Terms & Conditions:</strong>
        </div>

        {termsArray.length > 0 
          ? termsArray.map((t, i) => (
              <div key={i} className="page-break-inside-avoid" style={{ padding: '0 25px 0 25px', margin: 0, background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
                {t}
              </div>
            )) 
          : (
              <div className="page-break-inside-avoid" style={{ padding: '0 25px 0 25px', margin: 0, background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
                1. Standard terms apply. 2. This is a computer generated document.
              </div>
            )
        }
        <div style={{ paddingBottom: '25px', background: '#fff' }}></div>
      </div>
    );
  };

  const UAEProformaInvoice = ({ data }) => {
    if (!data) return null;
    const termsArray = data.terms ? data.terms.split('\n').filter(t => t.trim() !== '') : [];
    const total = Number(data.amount) || 0;

    return (
      <div className="uae-proforma-invoice a4-container">
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div className="logo-section">
            <img src="https://res.cloudinary.com/dc3a1bfvk/image/upload/v1777098139/ScalePods_-_Logo-_FINAL_----1-01_1_-min_hvvqyt.png" alt="ScalePods Logo" style={{ width: '130px' }} />
            <div className="company-address" style={{ fontSize: '12px', lineHeight: '1.2', maxWidth: '300px', marginTop: '5px' }}>
              <strong>SCALEPODS LLP</strong><br />
              503-A Floor-5th, 159/161, Crescent house, Mumbai, MH - 400009
            </div>
          </div>
          
          <div className="invoice-details" style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, color: '#444', textTransform: 'uppercase', fontSize: '20px' }}>Proforma Invoice</h2>
            <p style={{ margin: '5px 0', fontSize: '13px' }}>#SPx{data.name}-{(data.invoiceDate || "").replace(/-/g, '.')}</p>
            <table className="details-table" style={{ marginTop: '10px', borderCollapse: 'collapse', float: 'right' }}>
              <tbody>
                <tr><td style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>Date:</td><td style={{ padding: '4px 8px', fontSize: '13px' }}>{data.invoiceDate}</td></tr>
                <tr><td style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>Due Date:</td><td style={{ padding: '4px 8px', fontSize: '13px' }}>{data.dueDate}</td></tr>
                <tr style={{ color: '#d32f2f' }}>
                  <td style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>Balance Due:</td>
                  <td style={{ padding: '4px 8px', fontSize: '13px' }}>{data.currency} {(total - (Number(data.amountPaid) || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="billing-info" style={{ marginBottom: '15px' }}>
          <h3 style={{ fontSize: '13px', marginBottom: '4px', color: '#777' }}>Bill To:</h3>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
        </div>

        <table className="item-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #eee', padding: '6px', textAlign: 'left', fontSize: '13px' }}>Item</th>
              <th style={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #eee', padding: '6px', textAlign: 'left', fontSize: '13px' }}>Quantity</th>
              <th style={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #eee', padding: '6px', textAlign: 'left', fontSize: '13px' }}>Rate</th>
              <th style={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #eee', padding: '6px', textAlign: 'right', fontSize: '13px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px', verticalAlign: 'top' }}>
                  <strong>{item.description}</strong><br />
                  <span style={{ fontSize: '11px', color: '#777' }}>Services as discussed</span>
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px', verticalAlign: 'top' }}>1</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px', verticalAlign: 'top' }}>{data.currency} {Number(item.amount).toLocaleString()}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px', verticalAlign: 'top', textAlign: 'right' }}>{data.currency} {Number(item.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="bank-details" style={{ width: '60%', fontSize: '12px', background: '#fafafa', padding: '15px', borderRadius: '4px', marginBottom: '30px' }}>
            <h4 style={{ margin: '0 0 10px 0', textDecoration: 'underline' }}>Bank Details:</h4>
            <strong>Account Holder:</strong> {data.accHolder || "SCALEPODS LLP"}<br />
            <strong>Bank Name:</strong> {data.bankName || "HDFC Bank Ltd"}<br />
            <strong>Account Number:</strong> {data.accNo || "50200119456950"}<br />
            <strong>Branch IFSC:</strong> {data.ifsc || "HDFC0000060"}<br />
            <strong>Branch:</strong> {data.branch || "FORT"}
          </div>

          <div className="summary-section" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
            <table className="summary-table" style={{ width: '250px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr className="total-row" style={{ backgroundColor: '#f8f8f8', fontWeight: 'bold' }}>
                  <td style={{ padding: '8px', fontSize: '14px' }}>Total:</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontSize: '14px' }}>{data.currency} {total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ padding: '10px 0 0 0', background: '#fff' }}>
          <div className="page-break-inside-avoid" style={{ padding: '15px', background: '#fafafa', borderLeft: '4px solid #1a1a1a' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '5px' }}>Total Amount in Words:</strong>
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
              {total > 0 ? (data.amountInWords || toWords(total, 'AED')) : "Zero UAE Dirhams Only"}
            </span>
          </div>
        </div>

        <div className="page-break-inside-avoid" style={{ padding: '8px 0 0 0', background: '#fff', borderTop: '1px solid #eee', marginTop: '10px' }}>
          <h4 style={{ margin: '0 0 2px 0', color: '#333', fontSize: '11px' }}>Terms & Conditions:</h4>
        </div>

        {termsArray.length > 0 
          ? termsArray.map((term, index) => (
              <div key={index} className="page-break-inside-avoid" style={{ padding: '0 0 0 0', margin: 0, background: '#fff', fontSize: '12px', color: '#666', lineHeight: '1.2' }}>
                {term}
              </div>
            )) 
          : (
              <div className="page-break-inside-avoid" style={{ padding: '0 0 0 0', margin: 0, background: '#fff', fontSize: '12px', color: '#666', lineHeight: '1.2' }}>
                1. Standard terms apply. Please contact info@scalepods.co for details.
              </div>
            )
        }
        <div style={{ paddingBottom: '25px', background: '#fff' }}></div>
      </div>
    );
  };

  const IndiaProformaInvoice = ({ data }) => {
    if (!data) return null;
    const termsArray = data.terms ? data.terms.split('\n').filter(t => t.trim() !== '') : [];
    const subtotal = Number(data.amount) || 0;
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    const total = subtotal + cgst + sgst;

    return (
      <div className="india-proforma-invoice a4-container">
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div className="logo-section">
            <img src="https://res.cloudinary.com/dc3a1bfvk/image/upload/v1777098139/ScalePods_-_Logo-_FINAL_----1-01_1_-min_hvvqyt.png" alt="ScalePods Logo" style={{ width: '130px' }} />
            <div className="company-address" style={{ fontSize: '11px', lineHeight: '1.2', maxWidth: '300px', marginTop: '5px', color: '#555' }}>
              <strong>SCALEPODS LLP</strong><br />
              503-A Floor-5th, 159/161, Crescent house, Mumbai, MH - 400009<br />
              <strong>GSTIN:</strong> {data.myGstin || "27XXXXXXXXXXXXZ"}
            </div>
          </div>
          
          <div className="invoice-details" style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, color: '#222', textTransform: 'uppercase', fontSize: '18px', letterSpacing: '1px' }}>Proforma Invoice</h2>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>#SPx{data.name}-{(data.invoiceDate || "").replace(/-/g, '.')}</p>
            <table className="details-table" style={{ marginTop: '10px', borderCollapse: 'collapse', float: 'right' }}>
              <tbody>
                <tr><td style={{ padding: '3px 8px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>Date:</td><td style={{ padding: '3px 8px', fontSize: '12px' }}>{data.invoiceDate}</td></tr>
                <tr><td style={{ padding: '3px 8px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>Place of Supply:</td><td style={{ padding: '3px 8px', fontSize: '12px' }}>{data.clientState || "Maharashtra (27)"}</td></tr>
                <tr style={{ color: '#d32f2f' }}>
                  <td style={{ padding: '3px 8px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>Balance Due:</td>
                  <td style={{ padding: '3px 8px', fontSize: '12px' }}>{data.currency} {(total - (Number(data.amountPaid) || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="billing-info" style={{ marginBottom: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <h3 style={{ fontSize: '11px', marginBottom: '4px', color: '#777', textTransform: 'uppercase' }}>Bill To:</h3>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{data.name}</p>
          <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>GSTIN: {data.clientGstin || "Unregistered"}</div>
        </div>

        <table className="item-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #333', padding: '6px', textAlign: 'left', fontSize: '12px' }}>Service Description</th>
              <th style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #333', padding: '6px', textAlign: 'left', fontSize: '12px' }}>SAC</th>
              <th style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #333', padding: '6px', textAlign: 'left', fontSize: '12px' }}>Rate</th>
              <th style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #333', padding: '6px', textAlign: 'right', fontSize: '12px' }}>Taxable Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px', verticalAlign: 'top' }}>
                  <strong>{item.description}</strong><br />
                  <span style={{ fontSize: '10px', color: '#777' }}>AI & Automation Workflow Implementation</span>
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px', verticalAlign: 'top' }}>998311</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px', verticalAlign: 'top' }}>{data.currency} {Number(item.amount).toLocaleString()}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px', verticalAlign: 'top', textAlign: 'right' }}>{data.currency} {Number(item.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="bank-details" style={{ width: '55%', fontSize: '11px', background: '#fafafa', padding: '15px', borderRadius: '4px', border: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 8px 0', textDecoration: 'underline', color: '#444' }}>Bank Details for Transfer:</h4>
            <strong>Account Holder:</strong> {data.accHolder || "SCALEPODS LLP"}<br />
            <strong>Bank:</strong> {data.bankName || "HDFC Bank Ltd"}<br />
            <strong>A/C No:</strong> {data.accNo || "50200119456950"}<br />
            <strong>IFSC:</strong> {data.ifsc || "HDFC0000060"}<br />
            <strong>Branch:</strong> {data.branch || "FORT"}
          </div>

          <div className="summary-section" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
            <table className="summary-table" style={{ width: '280px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 8px', fontSize: '13px', borderBottom: '1px solid #f5f5f5' }}>Taxable Subtotal:</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '13px', borderBottom: '1px solid #f5f5f5' }}>{data.currency} {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px', fontSize: '13px', borderBottom: '1px solid #f5f5f5' }}>CGST (9%):</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '13px', borderBottom: '1px solid #f5f5f5' }}>{data.currency} {cgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px', fontSize: '13px', borderBottom: '1px solid #f5f5f5' }}>SGST (9%):</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '13px', borderBottom: '1px solid #f5f5f5' }}>{data.currency} {sgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr className="total-row" style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold', color: '#000', borderTop: '1px solid #333' }}>
                  <td style={{ padding: '6px 8px', fontSize: '13px', borderBottom: '1px solid #f5f5f5' }}>Grand Total:</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '13px', borderBottom: '1px solid #f5f5f5' }}>{data.currency} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ padding: '10px 0 0 0', background: '#fff' }}>
          <div className="page-break-inside-avoid" style={{ padding: '15px', background: '#fafafa', borderLeft: '4px solid #1a1a1a' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '5px' }}>Total Amount in Words:</strong>
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
              {total > 0 ? (data.amountInWords || toWords(total, 'INR')) : "Zero Rupees Only"}
            </span>
          </div>
        </div>

        <div className="page-break-inside-avoid" style={{ padding: '8px 0 0 0', background: '#fff', borderTop: '1px solid #eee', marginTop: '10px' }}>
          <h4 style={{ margin: '0 0 2px 0', color: '#333', fontSize: '10px' }}>Terms & Conditions:</h4>
        </div>

        {termsArray.length > 0 
          ? termsArray.map((term, index) => (
              <div key={index} className="page-break-inside-avoid" style={{ padding: '0 0 0 0', margin: 0, background: '#fff', fontSize: '12px', color: '#666', lineHeight: '1.2' }}>
                {term}
              </div>
            )) 
          : (
              <div className="page-break-inside-avoid" style={{ padding: '0 0 0 0', margin: 0, background: '#fff', fontSize: '12px', color: '#666', lineHeight: '1.2' }}>
                1. This is a Proforma Invoice, not a Tax Invoice. 2. 18% GST applied as per SAC 998311. 3. Full payment required to initiate automation setup.
              </div>
            )
        }
        <div style={{ paddingBottom: '25px', background: '#fff' }}></div>
      </div>
    );
  };

  const InvoicePaper = ({ data }) => {
    if (!data) return null;

    if (data.region === 'India') {
      return data.type === 'Tax' ? <IndiaTaxInvoice data={data} /> : <IndiaProformaInvoice data={data} />;
    } else {
      return data.type === 'Tax' ? <UAETaxInvoice data={data} /> : <UAEProformaInvoice data={data} />;
    }
  };

  /**
   * PaginatedPreview — measures rendered invoice content and splits it
   * into separate A4 page blocks with physical gaps between them,
   * exactly like Google Docs or Microsoft Word.
   */
  const PaginatedPreview = ({ data }) => {
    const measureRef = useRef(null);
    const [pages, setPages] = useState([]);
    // A4 content area: 297mm total - 15mm top padding - 15mm bottom padding = 267mm usable
    const CONTENT_HEIGHT_PX = 267 * (96 / 25.4); // ~1009px usable per page

    useEffect(() => {
      if (!measureRef.current || !data) return;

      // Small delay to ensure the DOM has rendered fully
      const timer = setTimeout(() => {
        const container = measureRef.current;
        if (!container) return;

        // Drill into the invoice root element (the .a4-container div)
        const invoiceRoot = container.querySelector('.a4-container, .invoice-paper');
        if (!invoiceRoot) return;

        const sections = Array.from(invoiceRoot.children);
        if (sections.length === 0) return;

        const newPages = [];
        let currentPageSections = [];
        let currentPageHeight = 0;

        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          const sectionHeight = rect.height;
          const marginTop = parseFloat(getComputedStyle(section).marginTop) || 0;
          const marginBottom = parseFloat(getComputedStyle(section).marginBottom) || 0;
          const totalHeight = sectionHeight + marginTop + marginBottom;

          if (currentPageHeight + totalHeight > CONTENT_HEIGHT_PX && currentPageSections.length > 0) {
            // This section overflows — push current page and start new one
            newPages.push(currentPageSections);
            currentPageSections = [section.cloneNode(true)];
            currentPageHeight = totalHeight;
          } else {
            currentPageSections.push(section.cloneNode(true));
            currentPageHeight += totalHeight;
          }
        });

        if (currentPageSections.length > 0) {
          newPages.push(currentPageSections);
        }

        // Only paginate if content actually overflows one page
        if (newPages.length > 1) {
          setPages(newPages);
        } else {
          setPages([]); // Single page — use normal render
        }
      }, 100);

      return () => clearTimeout(timer);
    }, [data]);

    return (
      <>
        {/* Hidden measurement container — renders the real invoice off-screen */}
        <div
          ref={measureRef}
          style={{
            position: 'fixed',
            top: 0,
            left: '-9999px',
            width: '210mm',
            background: 'white',
            color: '#333',
            visibility: 'hidden',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <InvoicePaper data={data} />
        </div>

        {/* Visible output */}
        {pages.length > 1 ? (
          <div ref={paginatedContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0', width: '100%', alignItems: 'center' }}>
            {pages.map((pageNodes, pageIdx) => {
              const invoiceRoot = measureRef.current?.querySelector('.a4-container, .invoice-paper');
              const rootClass = invoiceRoot?.className || 'a4-container';

              return (
                <div key={pageIdx} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Page gap separator */}
                  {pageIdx > 0 && (
                    <div className="page-separator">
                      <div className="page-separator-line" />
                      <span className="page-separator-label">Page {pageIdx + 1}</span>
                      <div className="page-separator-line" />
                    </div>
                  )}
                  <div
                    className={`${rootClass} a4-page-block`}
                    ref={pageIdx === 0 ? invoiceRef : null}
                    dangerouslySetInnerHTML={{ __html: pageNodes.map(n => n.outerHTML).join('') }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          // Single page — render normally
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }} ref={invoiceRef}>
            <InvoicePaper data={data} />
          </div>
        )}
      </>
    );
  };


  return (
        <div className="invoice-generator-page">
      <div className="preview-section">
        <div className="preview-content">
          {isGenerating && (
            <div className="preview-state loading" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 30, borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <Loader2 className="spinner" size={48} color="var(--color-primary)" />
              <p style={{ marginTop: '1rem', fontWeight: '600', color: '#fff' }}>Generating Official PDF...</p>
            </div>
          )}


          <PaginatedPreview data={liveData} />

          {pdfUrl && (
            <div className="preview-actions-overlay success-state">
              <div className="success-message">
                <div className="success-icon">✓</div>
                <span>PDF Ready for Download!</span>
              </div>
              <div className="button-group">
                <button 
                  className="action-btn-premium secondary" 
                  onClick={() => { setPdfUrl(null); setPdfBlob(null); }}
                  disabled={isSending}
                >
                  <Eye size={18} />
                  <span>Dismiss</span>
                </button>
                <button 
                  className="action-btn-premium" 
                  onClick={handleSendToClient}
                  disabled={isSending}
                  style={{ background: 'var(--color-primary-dark)' }}
                >
                  {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  <span>{isSending ? 'Sending...' : 'Send to Client'}</span>
                </button>
                <a href={pdfUrl} download={`Invoice_${liveData?.name}.pdf`} className="action-btn-premium">
                  <Download size={18} />
                  <span>Download Now</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="form-section-sidebar">
        <InvoiceForm onGenerate={handleGenerate} onUpdate={setLiveData} />
      </div>
    </div>
  );
};

export default Invoices;
