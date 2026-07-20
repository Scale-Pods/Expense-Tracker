import React from 'react';
import { formatDate, toWords } from '../../utils/invoiceUtils';
import { getCurrencySymbol, getCurrencyName } from '../../utils/currencyConstants';

export const IndiaTaxInvoice = ({ data }) => {
  if (!data) return null;
  const termsArray = data.terms ? data.terms.split('\n').filter(t => t.trim() !== '') : [];
  const subtotal = Number(data.amount) || 0;
  const showGst = data.showGst !== false;
  const cgst = showGst ? subtotal * 0.09 : 0;
  const sgst = showGst ? subtotal * 0.09 : 0;
  const total = subtotal + cgst + sgst;

  return (
    <div className="india-tax-invoice a4-container" style={{ padding: '0', color: '#1a1a1a', background: '#fff', width: '210mm', margin: '0 auto', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      <div style={{ textAlign: 'center', background: '#f2f2f2', padding: '6px', borderBottom: '2px solid #1a1a1a', letterSpacing: '2px' }}>
        <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', color: '#000' }}>{showGst ? 'Tax Invoice' : 'Invoice'}</h1>
      </div>
      
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px', padding: '10px', borderRight: '1px solid #e0e0e0' }}>
          <img src="https://res.cloudinary.com/dc3a1bfvk/image/upload/v1777098139/ScalePods_-_Logo-_FINAL_----1-01_1_-min_hvvqyt.png" width="180" alt="Logo" style={{ marginBottom: '4px' }} />
          <div style={{ fontSize: '12px', lineHeight: '1.2' }}>
            <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>SCALEPODS LLP</strong>
            503-A Crescent House, 159/161 Crescent House, Mumbai, Maharashtra, India - 400009<br />
            {data.showMyGst !== false && (
              <>
                <strong>GSTIN:</strong> {data.myGstin || "27AFUFS0352J1ZI"}<br />
                <strong>State:</strong> Maharashtra (27)
              </>
            )}
          </div>
        </div>
        <div style={{ flex: '0 1 280px', minWidth: '200px', padding: '10px', background: '#fafafa', fontSize: '12px', lineHeight: '1.2' }}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Invoice Number</span>
            <strong style={{ fontSize: '13px' }}>{data.invoiceNo || `#${showGst ? 'TX' : 'INV'}//${(data.invoiceDate || "").split('-').join('')}`}</strong>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Invoice Date</span>
            <strong>{formatDate(data.invoiceDate)}</strong>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Payment Term</span>
            <strong>{data.paymentTerm || 'One Time'}</strong>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Place of Supply</span>
            <strong>{data.clientState || "Maharashtra"}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px', padding: '8px', borderRight: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Bill To:</h3>
          <div style={{ fontSize: '12px', lineHeight: '1.2' }}>
            {data.name.split('\n').map((line, i) => (
              i === 0 ? <strong key={i} style={{ fontSize: '15px', display: 'block', marginBottom: '2px' }}>{line}</strong> : <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
            {data.email && <div style={{ color: '#555' }}>{data.email}</div>}
            {data.clientGstin && <div style={{ marginTop: '8px' }}>
              <strong>GSTIN:</strong> {data.clientGstin}<br />
              <strong>State:</strong> {data.clientState}
            </div>}
          </div>
        </div>
        <div style={{ flex: '0 1 280px', minWidth: '200px', padding: '8px', fontSize: '12px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Bank Transfer Details:</h3>
          <div style={{ lineHeight: '1.2' }}>
            <strong>Bank:</strong> {data.bankName || "HDFC Bank Ltd"}<br />
            <strong>A/c Name:</strong> {data.accHolder || "SCALEPODS LLP"}<br />
            <strong>A/c No:</strong> {data.accNo || "50200119456950"}<br />
            <strong>IFSC:</strong> {data.ifsc || "HDFC0000060"}<br />
            <strong>A/c Type:</strong> {data.accType || "Current Account"}
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: '#1a1a1a', color: 'white' }}>
              <th style={{ padding: '6px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Description of Services</th>
              <th style={{ padding: '6px 15px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', width: '100px' }}>SAC</th>
              <th style={{ padding: '6px 15px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', width: '150px' }}>Amount ({getCurrencySymbol(data.currency)})</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} className="item-row" style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 15px', verticalAlign: 'top' }}>
                  <strong style={{ fontSize: '13px' }}>{item.description}</strong>
                </td>
                <td style={{ padding: '8px 15px', textAlign: 'center', verticalAlign: 'top', color: '#666' }}>{data.sacCode || "998313"}</td>
                <td style={{ padding: '8px 15px', textAlign: 'right', verticalAlign: 'top', fontWeight: '600' }}>{Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
            
            <tr>
              <td colSpan="2" style={{ padding: '5px 15px', textAlign: 'right', color: '#666' }}>{showGst ? 'Subtotal (Taxable Value)' : 'Total Amount'}</td>
              <td style={{ padding: '5px 15px', textAlign: 'right', fontWeight: '600' }}>{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            {showGst && (
              <>
                <tr>
                  <td colSpan="2" style={{ padding: '3px 15px', textAlign: 'right', color: '#666' }}>CGST (9%)</td>
                  <td style={{ padding: '3px 15px', textAlign: 'right', fontWeight: '600' }}>{cgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td colSpan="2" style={{ padding: '3px 15px', textAlign: 'right', color: '#666', borderBottom: '1px solid #eee' }}>SGST (9%)</td>
                  <td style={{ padding: '3px 15px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #eee' }}>{sgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </>
            )}
            <tr style={{ background: '#f8f9fa' }}>
              <td colSpan="2" style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px' }}>{showGst ? 'Grand Total (Incl. GST)' : 'Grand Total'}</td>
              <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: '#1a1a1a' }}>{getCurrencySymbol(data.currency)} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="terms-section" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', background: '#fff' }}>
        <div style={{ padding: '5px 25px 0 25px' }}>
          <div style={{ padding: '8px', background: '#fafafa', borderLeft: '4px solid #1a1a1a' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '3px' }}>Total Amount in Words:</strong>
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
              {total > 0 ? (data.amountInWords || toWords(total, data.currency)) : "Zero " + getCurrencyName(data.currency) + " Only"}
            </span>
          </div>
        </div>

        <div style={{ padding: '8px 25px 15px' }}>
          <strong style={{ fontSize: '11px', color: '#333', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Terms & Conditions:</strong>

          {termsArray.length > 0 ? (
            termsArray.map((t, i) => (
              <div key={i} className="terms-line" style={{ margin: '0 0 2px 0', padding: '1px 0', fontSize: '11px', color: '#777', lineHeight: '1.5', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                {t}
              </div>
            ))
          ) : (
            <div style={{ margin: 0, padding: '2px 0', fontSize: '12px', color: '#777', lineHeight: '1.6' }}>
              1. Standard terms apply. 2. This is a computer generated document.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const UAETaxInvoice = ({ data }) => {
  if (!data) return null;
  const termsArray = data.terms ? data.terms.split('\n').filter(t => t.trim() !== '') : [];
  const total = Number(data.amount) || 0;

  return (
    <div className="uae-tax-invoice a4-container" style={{ padding: '0', color: '#1a1a1a', background: '#fff', width: '210mm', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', background: '#f2f2f2', padding: '6px', borderBottom: '2px solid #1a1a1a', letterSpacing: '2px' }}>
        <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', color: '#000' }}>Tax Invoice</h1>
      </div>
      
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px', padding: '10px', borderRight: '1px solid #e0e0e0' }}>
          <img src="https://res.cloudinary.com/dc3a1bfvk/image/upload/v1777098139/ScalePods_-_Logo-_FINAL_----1-01_1_-min_hvvqyt.png" width="180" alt="Logo" style={{ marginBottom: '4px' }} />
          <div style={{ fontSize: '12px', lineHeight: '1.2' }}>
            <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>SCALEPODS LLP</strong>
            503-A Crescent House, 159/161 Crescent House, Mumbai, Maharashtra, India - 400009<br />
          </div>
        </div>
        <div style={{ flex: '0 1 280px', minWidth: '200px', padding: '10px', background: '#fafafa', fontSize: '12px', lineHeight: '1.2' }}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Invoice Number</span>
            <strong style={{ fontSize: '13px' }}>{data.invoiceNo || `#TX/${data.name?.split('\n')[0].toUpperCase().replace(/\s+/g, '')}/${(data.invoiceDate || "").split('-').join('')}`}</strong>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Invoice Date</span>
            <strong>{formatDate(data.invoiceDate)}</strong>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', display: 'block' }}>Payment Term</span>
            <strong>{data.paymentTerm || 'One Time'}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px', padding: '8px', borderRight: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Bill To:</h3>
          <div style={{ fontSize: '13px', lineHeight: '1.2' }}>
            {data.name.split('\n').map((line, i) => (
              i === 0 ? <strong key={i} style={{ fontSize: '15px', display: 'block', marginBottom: '2px' }}>{line}</strong> : <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
            {data.email && <div style={{ color: '#555' }}>{data.email}</div>}
            {data.clientGstin && <div style={{ marginTop: '8px' }}>
              <strong>TRN:</strong> {data.clientGstin}<br />
            </div>}
          </div>
        </div>
        <div style={{ flex: '0 1 280px', minWidth: '200px', padding: '8px', fontSize: '12px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Bank Transfer Details:</h3>
          <div style={{ lineHeight: '1.2' }}>
            <strong>Bank:</strong> {data.bankName || "HDFC Bank Ltd"}<br />
            <strong>A/c Name:</strong> {data.accHolder || "SCALEPODS LLP"}<br />
            <strong>A/c No:</strong> {data.accNo || "50200119456950"}<br />
            <strong>IFSC:</strong> {data.ifsc || "HDFC0000060"}<br />
            <strong>SWIFT:</strong> {data.swiftCode || "HDFCINBB"}<br />
            <strong>A/c Type:</strong> {data.accType || "Current Account"}
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: '#1a1a1a', color: 'white' }}>
              <th style={{ padding: '6px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Description of Services</th>
              <th style={{ padding: '6px 15px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', width: '150px' }}>Amount ({getCurrencySymbol(data.currency)})</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} className="item-row" style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 15px', verticalAlign: 'top' }}>
                  <strong style={{ fontSize: '13px' }}>{item.description}</strong>
                </td>
                <td style={{ padding: '8px 15px', textAlign: 'right', verticalAlign: 'top', fontWeight: '600' }}>{Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
            
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px' }}>Total Invoice Value</td>
              <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: '#1a1a1a' }}>{getCurrencySymbol(data.currency)} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="terms-section" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', background: '#fff' }}>
        <div style={{ padding: '5px 25px 0 25px' }}>
          <div style={{ padding: '8px', background: '#fafafa', borderLeft: '4px solid #1a1a1a' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '3px' }}>Total Amount in Words:</strong>
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
              {total > 0 ? (data.amountInWords || toWords(total, data.currency)) : "Zero " + getCurrencyName(data.currency) + " Only"}
            </span>
          </div>
        </div>

        <div style={{ padding: '8px 25px 15px' }}>
          <strong style={{ fontSize: '11px', color: '#333', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Terms & Conditions:</strong>

          {termsArray.length > 0 ? (
            termsArray.map((t, i) => (
              <div key={i} className="terms-line" style={{ margin: '0 0 2px 0', padding: '1px 0', fontSize: '11px', color: '#777', lineHeight: '1.5', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                {t}
              </div>
            ))
          ) : (
            <div style={{ margin: 0, padding: '2px 0', fontSize: '12px', color: '#777', lineHeight: '1.6' }}>
              1. Standard terms apply. 2. This is a computer generated document.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const IndiaProformaInvoice = ({ data }) => {
  if (!data) return null;
  const termsArray = data.terms ? data.terms.split('\n').filter(t => t.trim() !== '') : [];
  const subtotal = Number(data.amount) || 0;
  const showGst = data.showGst !== false;
  const cgst = showGst ? subtotal * 0.09 : 0;
  const sgst = showGst ? subtotal * 0.09 : 0;
  const total = subtotal + cgst + sgst;

  return (
    <div className="india-proforma-invoice a4-container" style={{ padding: '40px', background: '#fff', width: '210mm', margin: '0 auto', color: '#333', fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div>
          <img src="https://res.cloudinary.com/dc3a1bfvk/image/upload/v1777098139/ScalePods_-_Logo-_FINAL_----1-01_1_-min_hvvqyt.png" alt="Logo" width="180" style={{ marginBottom: '15px' }} />
          <div style={{ lineHeight: '1.4' }}>
            <strong style={{ fontSize: '16px' }}>SCALEPODS LLP</strong><br />
            503-A Floor-5th, 159/161, Crescent house, Mumbai, Maharashtra, India - 400009
            {data.showMyGst !== false && (
              <><br />
                <strong>GSTIN:</strong> {data.myGstin || "27AFUFS0352J1ZI"}<br />
                <strong>State:</strong> Maharashtra (27)
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#1a1a1a', textTransform: 'uppercase', fontWeight: '800' }}>Proforma Invoice</h1>
          <p style={{ margin: '5px 0', fontWeight: 'bold' }}>{data.invoiceNo || `#SPx${data.name?.split('\n')[0].replace(/\s+/g, '')}-${(formatDate(data.invoiceDate)).replace(/-/g, '.')}`}</p>
          <div style={{ marginTop: '10px' }}>
            <strong>Date:</strong> {formatDate(data.invoiceDate)}<br />
            <strong>Due Date:</strong> {formatDate(data.dueDate)}<br />
            <strong>Payment Term:</strong> {data.paymentTerm || 'One Time'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '50px', marginBottom: '30px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ borderBottom: '2px solid #333', paddingBottom: '5px', textTransform: 'uppercase', fontSize: '12px' }}>Client Details</h3>
          <div style={{ marginTop: '10px', lineHeight: '1.4' }}>
            {data.name.split('\n').map((line, i) => (
              i === 0 ? <strong key={i} style={{ fontSize: '15px', display: 'block', marginBottom: '2px' }}>{line}</strong> : <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
            {data.email && <div>{data.email}</div>}
            {data.clientGstin && <div>GSTIN: {data.clientGstin}</div>}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ borderBottom: '2px solid #333', paddingBottom: '5px', textTransform: 'uppercase', fontSize: '12px' }}>Payment Summary</h3>
          <div style={{ marginTop: '10px', padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Subtotal:</span>
              <strong>{getCurrencySymbol(data.currency)} {subtotal.toLocaleString()}</strong>
            </div>
            {showGst && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                  <span>CGST (9%):</span>
                  <span>{getCurrencySymbol(data.currency)} {cgst.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                  <span>SGST (9%):</span>
                  <span>{getCurrencySymbol(data.currency)} {sgst.toLocaleString()}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
              <span>Total Amount:</span>
              <strong>{getCurrencySymbol(data.currency)} {total.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d32f2f' }}>
              <span>Balance Due:</span>
              <strong>{getCurrencySymbol(data.currency)} {(total - (Number(data.amountPaid) || 0)).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ background: '#333', color: '#fff' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
            <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>SAC</th>
            <th style={{ padding: '12px', textAlign: 'right', width: '150px' }}>Amount ({getCurrencySymbol(data.currency)})</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="item-row" style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>
                <strong style={{ fontSize: '14px' }}>{item.description}</strong>
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>{data.sacCode || "998313"}</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{Number(item.amount).toLocaleString()}</td>
            </tr>
          ))}
          <tr>
            <td colSpan="2" style={{ padding: '8px 12px', textAlign: 'right', color: '#666' }}>{showGst ? 'Subtotal (Taxable Value)' : 'Total Amount'}</td>
            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>{getCurrencySymbol(data.currency)} {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
          {showGst && (
            <>
              <tr>
                <td colSpan="2" style={{ padding: '5px 12px', textAlign: 'right', color: '#666' }}>CGST (9%)</td>
                <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: '600' }}>{getCurrencySymbol(data.currency)} {cgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td colSpan="2" style={{ padding: '5px 12px', textAlign: 'right', color: '#666', borderBottom: '1px solid #eee' }}>SGST (9%)</td>
                <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #eee' }}>{getCurrencySymbol(data.currency)} {sgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </>
          )}
          <tr>
            <td colSpan="2" style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>{showGst ? 'Grand Total (Incl. GST)' : 'Grand Total'}</td>
            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', fontSize: '18px', background: '#f9f9f9' }}>{getCurrencySymbol(data.currency)} {total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="terms-section" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ marginBottom: '30px', padding: '15px', background: '#f9f9f9', borderRadius: '5px', borderLeft: '5px solid #333' }}>
          <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '5px' }}>Amount in Words:</strong>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{toWords(total, data.currency)}</span>
        </div>

        <div style={{ display: 'flex', gap: '30px' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ textTransform: 'uppercase', fontSize: '11px', color: '#666', marginBottom: '10px' }}>Bank Details</h4>
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <strong>Beneficiary:</strong> {data.accHolder || "SCALEPODS LLP"}<br />
              <strong>Bank:</strong> {data.bankName || "HDFC Bank Ltd"}<br />
              <strong>A/c No:</strong> {data.accNo || "50200119456950"}<br />
              <strong>IFSC:</strong> {data.ifsc || "HDFC0000060"}<br />
              <strong>Branch:</strong> {data.branch || "FORT"}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ textTransform: 'uppercase', fontSize: '11px', color: '#666', marginBottom: '10px' }}>Terms</h4>
            <div style={{ fontSize: '11px', color: '#777', lineHeight: '1.5', padding: '2px 0' }}>
              {termsArray.length > 0 ? termsArray.map((t, i) => <div key={i} style={{ marginBottom: '6px' }}>{t}</div>) : "Standard terms apply."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UAEProformaInvoice = ({ data }) => {
  if (!data) return null;
  const termsArray = data.terms ? data.terms.split('\n').filter(t => t.trim() !== '') : [];
  const total = Number(data.amount) || 0;

  return (
    <div className="uae-proforma-invoice a4-container" style={{ padding: '0', color: '#1a1a1a', background: '#fff', width: '210mm', margin: '0 auto' }}>
      <div className="invoice-header-top" style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', padding: '20px', flexWrap: 'wrap', borderBottom: '1px solid #eee' }}>
        <div className="logo-section" style={{ flex: '1', minWidth: '250px' }}>
          <img src="https://res.cloudinary.com/dc3a1bfvk/image/upload/v1777098139/ScalePods_-_Logo-_FINAL_----1-01_1_-min_hvvqyt.png" alt="ScalePods Logo" style={{ width: '180px' }} />
          <div className="company-address" style={{ fontSize: '12px', lineHeight: '1.2', marginTop: '8px' }}>
            <strong>SCALEPODS LLP</strong><br />
            503-A Floor-5th, 159/161, Crescent house, Mumbai, Maharashtra, India - 400009
          </div>
        </div>
        
        <div className="invoice-details" style={{ flex: '0 1 auto', textAlign: 'right', minWidth: '200px' }}>
          <h2 style={{ margin: 0, color: '#444', textTransform: 'uppercase', fontSize: '20px', fontWeight: '800' }}>Proforma Invoice</h2>
          <p style={{ margin: '5px 0', fontSize: '13px', fontWeight: '600', color: '#666' }}>{data.invoiceNo || `#SPx${data.name?.split('\n')[0].replace(/\s+/g, '')}-${(formatDate(data.invoiceDate)).replace(/-/g, '.')}`}</p>
          <div style={{ marginTop: '10px', display: 'inline-block' }}>
            <table className="details-table" style={{ borderCollapse: 'collapse', marginLeft: 'auto' }}>
              <tbody>
                <tr><td style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>Date:</td><td style={{ padding: '4px 8px', fontSize: '13px', textAlign: 'left' }}>{formatDate(data.invoiceDate)}</td></tr>
                <tr><td style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>Due Date:</td><td style={{ padding: '4px 8px', fontSize: '13px', textAlign: 'left' }}>{formatDate(data.dueDate)}</td></tr>
                <tr style={{ color: '#d32f2f', background: 'rgba(211, 47, 47, 0.05)' }}>
                  <td style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>Balance Due:</td>
                  <td style={{ padding: '4px 8px', fontSize: '13px', textAlign: 'left', fontWeight: '800' }}>{getCurrencySymbol(data.currency)} {(total - (Number(data.amountPaid) || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="billing-info" style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
        <h3 style={{ fontSize: '11px', marginBottom: '4px', color: '#777', textTransform: 'uppercase' }}>Bill To:</h3>
        <div style={{ fontSize: '12px', lineHeight: '1.2' }}>
          {data.name.split('\n').map((line, i) => (
            i === 0 ? <strong key={i} style={{ fontSize: '15px', display: 'block', marginBottom: '2px' }}>{line}</strong> : <span key={i} style={{ display: 'block' }}>{line}</span>
          ))}
          {data.email && <div>{data.email}</div>}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="item-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: '#f8f8f8', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase' }}>Item</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase' }}>Quantity</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase' }}>Rate</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', textTransform: 'uppercase' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} className="item-row" style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontSize: '13px', verticalAlign: 'top' }}>
                  <strong>{item.description}</strong>
                </td>
                <td style={{ padding: '12px', fontSize: '13px', verticalAlign: 'top' }}>1</td>
                <td style={{ padding: '12px', fontSize: '13px', verticalAlign: 'top' }}>{getCurrencySymbol(data.currency)} {Number(item.amount).toLocaleString()}</td>
                <td style={{ padding: '12px', fontSize: '13px', verticalAlign: 'top', textAlign: 'right', fontWeight: '700' }}>{getCurrencySymbol(data.currency)} {Number(item.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', padding: '20px' }}>
        <div className="bank-details" style={{ flex: '1', minWidth: '250px', fontSize: '12px', background: '#fafafa', padding: '15px', borderRadius: '4px', border: '1px solid #eee', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', textDecoration: 'underline' }}>Bank Details for Transfer:</h4>
          <strong>Account Holder:</strong> {data.accHolder || "SCALEPODS LLP"}<br />
          <strong>Bank Name:</strong> {data.bankName || "HDFC Bank Ltd"}<br />
          <strong>Account Number:</strong> {data.accNo || "50200119456950"}<br />
          <strong>Branch IFSC:</strong> {data.ifsc || "HDFC0000060"}<br />
          <strong>SWIFT:</strong> {data.swiftCode || "HDFCINBB"}<br />
          <strong>A/c Type:</strong> {data.accType || "Current Account"}<br />
          <strong>Branch:</strong> {data.branch || "FORT"}
        </div>

        <div className="summary-section" style={{ flex: '0 1 250px', minWidth: '200px' }}>
          <table className="summary-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr className="total-row" style={{ backgroundColor: '#f8f8f8', fontWeight: 'bold', border: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontSize: '14px' }}>Total:</td>
                <td style={{ textAlign: 'right', padding: '12px', fontSize: '14px' }}>{getCurrencySymbol(data.currency)} {total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="terms-section" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', background: '#fff' }}>
        <div style={{ padding: '5px 25px 0 25px' }}>
          <div style={{ padding: '8px', background: '#fafafa', borderLeft: '4px solid #1a1a1a' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '3px' }}>Total Amount in Words:</strong>
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
              {total > 0 ? (data.amountInWords || toWords(total, data.currency)) : "Zero " + getCurrencyName(data.currency) + " Only"}
            </span>
          </div>
        </div>

        <div style={{ padding: '8px 25px 15px' }}>
          <strong style={{ fontSize: '11px', color: '#333', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Terms & Conditions:</strong>

          {termsArray.length > 0 ? (
            termsArray.map((t, i) => (
              <div key={i} className="terms-line" style={{ margin: '0 0 2px 0', padding: '1px 0', fontSize: '11px', color: '#777', lineHeight: '1.5', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                {t}
              </div>
            ))
          ) : (
            <div style={{ margin: 0, padding: '2px 0', fontSize: '12px', color: '#777', lineHeight: '1.6' }}>
              1. Standard terms apply. 2. This is a computer generated document.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export const LUTExportInvoice = ({ data }) => {
  if (!data) return null;
  const termsArray = data.terms ? data.terms.split('\n').filter(t => t.trim() !== '') : [];
  const total = Number(data.amount) || 0;
  const currSym = getCurrencySymbol(data.currency);
  const currName = data.currency || 'AED';
  const lutArn = data.lutArn || 'AD270326114883Z';
  const invoiceNo = data.invoiceNo || 'SP/EXP/2026-27/001';

  // INR conversion for display
  const exchangeRate = 22.86;
  const inrEquiv = (total * exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const inrRealised = (total * exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Qty and unit price from items
  const items = data.items || [];

  const cell = (content, style = {}) => (
    <td style={{ padding: '6px 8px', border: '1px solid #ccc', fontSize: '11px', verticalAlign: 'top', ...style }}>{content}</td>
  );

  const th = (content, style = {}) => (
    <th style={{ padding: '6px 8px', border: '1px solid #ccc', background: '#1a1a1a', color: '#fff', fontSize: '10px', textTransform: 'uppercase', textAlign: 'center', ...style }}>{content}</th>
  );

  const twoColRow = (label, value, labelStyle = {}, valueStyle = {}) => (
    <tr>
      <td style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '600', color: '#333', width: '45%', ...labelStyle }}>{label}</td>
      <td style={{ padding: '3px 8px', fontSize: '11px', color: '#222', ...valueStyle }}>{value}</td>
    </tr>
  );

  return (
    <div style={{ color: '#1a1a1a', background: '#fff', width: '210mm', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>

      {/* ── PAGE 1 ── */}
      <div style={{ padding: '0', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>

        {/* Header Banner */}
        <div style={{ background: '#f7f7f7', borderBottom: '2px solid #1a1a1a', padding: '8px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#0a4fa6', letterSpacing: '1px', textTransform: 'uppercase' }}>TAX INVOICE FOR EXPORT</div>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#c00', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '2px' }}>
            SUPPLY MEANT FOR EXPORT UNDER LUT / BOND WITHOUT PAYMENT OF INTEGRATED TAX
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '4px', fontSize: '10px', color: '#444' }}>
            <span>Invoice No: <strong>{invoiceNo}</strong></span>
            <span>Invoice Date: <strong>{data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('en-GB').replace(/\//g, '-') : '—'}</strong></span>
            <span>Place of Supply: <strong>Outside India</strong></span>
          </div>
        </div>

        {/* Company + Bill To row */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
          {/* Company info */}
          <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid #ccc' }}>
            <img src="https://res.cloudinary.com/dc3a1bfvk/image/upload/v1777098139/ScalePods_-_Logo-_FINAL_----1-01_1_-min_hvvqyt.png" width="140" alt="Logo" style={{ display: 'block', marginBottom: '6px' }} />
            <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
              <strong style={{ fontSize: '13px', display: 'block' }}>SCALEPODS LLP</strong>
              503-A Floor-5th, 159/161, Crescent House,<br />
              Mumbai, Maharashtra, India - 400009<br />
              Email: info@scalepods.co
            </div>
            <div style={{ marginTop: '6px', fontSize: '11px', lineHeight: '1.5' }}>
              <strong>GSTIN: </strong>{data.myGstin || '27AFUFS0352J1ZI'}<br />
              <strong>LUT ARN: </strong>{lutArn}
            </div>
          </div>
          {/* Bill To */}
          <div style={{ flex: 1, padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Bill To / Exported To (Recipient)</div>
            <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
              {data.name ? data.name.split('\n').map((line, i) => (
                i === 0
                  ? <strong key={i} style={{ fontSize: '13px', display: 'block' }}>{line}</strong>
                  : <span key={i} style={{ display: 'block' }}>{line}</span>
              )) : null}
              {data.email && <div style={{ marginTop: '4px' }}>Email: {data.email}</div>}
              {data.clientGstin && <div>TRN: {data.clientGstin}</div>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ borderBottom: '1px solid #ccc', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {th('Description of Services', { textAlign: 'left', width: '40%' })}
                {th('SAC Code', { width: '12%' })}
                {th('QTY', { width: '8%' })}
                {th(`Unit Price (${currSym})`, { width: '18%' })}
                {th(`Amount (${currSym})`, { width: '18%', background: '#222' })}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  {cell(
                    <>
                      <strong style={{ fontSize: '11px' }}>{item.description}</strong>
                      {item.note && <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{item.note}</div>}
                    </>
                  )}
                  {cell(data.sacCode || '99831300', { textAlign: 'center', color: '#555' })}
                  {cell('1', { textAlign: 'center' })}
                  {cell(Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }), { textAlign: 'right' })}
                  {cell(<strong>{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>, { textAlign: 'right', background: '#f9f9f9' })}
                </tr>
              ))}
              <tr style={{ background: '#f2f2f2' }}>
                <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', fontSize: '12px', border: '1px solid #ccc' }}>Total ({currSym})</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '900', fontSize: '12px', color: '#c00', border: '1px solid #ccc' }}>{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Currency + Words | GST Declaration */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
          {/* Currency & Exchange Rate */}
          <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid #ccc', fontSize: '11px', lineHeight: '1.6' }}>
            <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', color: '#666', marginBottom: '4px' }}>Currency & Exchange Rate Details</div>
            <div><strong>Invoice Currency:</strong> {currName} ({data.currency === 'AED' ? 'UAE Dirhams' : data.currency})</div>
            <div><strong>Total Invoice Value:</strong> {currSym} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div><strong>Exchange Rate (Bank-realised):</strong> 1 {currName} = INR {exchangeRate.toFixed(5)}</div>
            <div style={{ marginTop: '6px', padding: '4px 8px', background: '#fff8e1', border: '1px solid #ffd54f', borderRadius: '4px' }}>
              <strong>INR Equivalent (Realised Amount):</strong>{' '}
              <span style={{ color: '#c00', fontWeight: '700' }}>₹ {inrRealised}</span>
            </div>
            <div style={{ fontSize: '9px', color: '#888', marginTop: '3px' }}>*As per actual bank statement advice. RBI does not publish daily bank realisation rate for AED.</div>
          </div>
          {/* Total in Words + GST Declaration */}
          <div style={{ flex: 1, padding: '8px 12px', fontSize: '11px', lineHeight: '1.6' }}>
            <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', color: '#666', marginBottom: '4px' }}>Total Amount in Words</div>
            <div style={{ fontWeight: '700', fontSize: '11px', textTransform: 'capitalize', marginBottom: '8px' }}>
              {total > 0 ? (data.amountInWords || toWords(total, data.currency)) : `Zero ${getCurrencyName(data.currency)} Only`}
            </div>
            <div style={{ marginTop: '6px', padding: '6px 8px', background: '#f0f4ff', border: '1px solid #c5d0e8', borderRadius: '4px' }}>
              <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', color: '#444', marginBottom: '2px' }}>GST Declaration</div>
              <div style={{ fontSize: '10px', color: '#333' }}>Supply solely meant for export under LUT / Bond without payment of Integrated Tax (IGST).</div>
            </div>
          </div>
        </div>

        {/* Bank Details + Payment Terms */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
          {/* Bank Details */}
          <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid #ccc', fontSize: '11px', lineHeight: '1.6' }}>
            <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', color: '#666', marginBottom: '4px' }}>Bank Details for Transfer</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {twoColRow('Account Holder:', data.accHolder || 'SCALEPODS LLP')}
                {twoColRow('Bank Name:', data.bankName || 'HDFC Bank Ltd')}
                {twoColRow('Account Number:', data.accNo || '50200119456950')}
                {twoColRow('Branch IFSC:', data.ifsc || 'HDFC0000060')}
                {twoColRow('SWIFT:', data.swiftCode || 'HDFCINBB')}
                {twoColRow('A/c Type:', data.accType || 'Current Account')}
                {twoColRow('Branch:', data.branch || 'FORT, Mumbai')}
              </tbody>
            </table>
          </div>
          {/* Payment Terms */}
          <div style={{ flex: 1, padding: '8px 12px', fontSize: '11px', lineHeight: '1.6' }}>
            <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', color: '#666', marginBottom: '4px' }}>Terms of Sale / Payment Terms</div>
            <div style={{ fontSize: '11px', color: '#333', marginBottom: '8px' }}>
              {data.paymentTerm === 'Recurring'
                ? '50% Advance via Wire Transfer to commence work (this invoice). Balance 50% payable via Wire Transfer on delivery.'
                : '100% Advance via Wire Transfer to commence work (this invoice). Payment due upon receipt.'}
            </div>
            <div style={{ padding: '6px 8px', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '4px', fontSize: '11px' }}>
              <strong style={{ color: '#2e7d32' }}>Payment Status:</strong>{' '}
              <span style={{ color: '#2e7d32' }}>Advance of {currSym} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} realised on {data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('en-GB').replace(/\//g, '-') : '—'} ({data.currency === 'AED' ? `₹${inrRealised}` : `₹${inrEquiv}`}).</span>
            </div>
          </div>
        </div>

        {/* Statutory Declaration Footer */}
        <div style={{ padding: '8px 12px', background: '#f7f7f7', borderTop: '2px solid #1a1a1a', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#c00', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            STATUTORY DECLARATION
          </div>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#333', marginTop: '2px', textTransform: 'uppercase' }}>
            "SUPPLY MEANT FOR EXPORT UNDER LUT / BOND WITHOUT PAYMENT OF INTEGRATED TAX"
          </div>
        </div>
      </div>

      {/* ── PAGE 2 ── */}
      <div style={{ marginTop: '8px', padding: '20px 24px', boxShadow: '0 0 10px rgba(0,0,0,0.1)', background: '#fff', pageBreakBefore: 'always' }}>
        {/* Export Declaration */}
        <div style={{ fontSize: '11px', lineHeight: '1.8', color: '#333', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
          This is an export of services and a zero-rated supply under Section 16 of the IGST Act, 2017, made under cover of Letter of
          Undertaking (LUT), without payment of Integrated Tax (IGST).
          <br />
          <strong>LUT ARN No.: {lutArn}</strong>
        </div>

        {/* Terms & Conditions */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', color: '#444' }}>Terms &amp; Conditions</div>
          {termsArray.length > 0 ? (
            termsArray.map((t, i) => (
              <div key={i} style={{ fontSize: '10px', color: '#555', lineHeight: '1.6', marginBottom: '3px' }}>{t}</div>
            ))
          ) : (
            <div style={{ fontSize: '10px', color: '#555', lineHeight: '1.6' }}>
              1. Currency &amp; Charges: Payments must be made in the currency mentioned. Any additional bank charges, conversion fees, or transaction fees are to be borne by the client.<br />
              2. Scope of Work: The services covered under this invoice are as per agreed discussion.<br />
              3. Non-Refundable: Payments made are non-refundable unless otherwise agreed in writing.<br />
              4. Confidentiality: Both parties agree to maintain the confidentiality of any business or project-related information shared during the engagement.<br />
              5. Intellectual Property: All deliverables and work products remain the property of ScalePods LLP until full payment is received.<br />
              6. Termination: Engagement can be terminated based on terms mentioned in the Service Level Agreement (SLA).<br />
              7. This invoice is issued for export of services and is not subject to Indian GST as the supply is made under LUT.<br />
              8. Support: For any queries regarding this invoice, please contact info@scalepods.co
            </div>
          )}
        </div>

        {/* Signature */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center', minWidth: '180px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '50px' }}>For SCALEPODS LLP</div>
            <div style={{ borderTop: '1px solid #aaa', paddingTop: '6px', fontSize: '11px', color: '#444' }}>Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};


export const InvoicePaper = ({ data }) => {
  if (!data) return null;

  // LUT Export overrides all other templates
  if (data.lutEnabled) return <LUTExportInvoice data={data} />;

  const region = (data.region || 'United States').toLowerCase();
  const isIndia = region === 'india';
  const isUAE = region === 'uae';
  const isTax = (data.type || 'Proforma').toLowerCase() === 'tax';

  if (isIndia && isTax) return <IndiaTaxInvoice data={data} />;
  if (isIndia && !isTax) return <IndiaProformaInvoice data={data} />;
  if (isUAE && isTax) return <UAETaxInvoice data={data} />;
  if (isUAE && !isTax) return <UAEProformaInvoice data={data} />;
  // For all other regions, use generic proforma or tax layout
  if (isTax) return <UAETaxInvoice data={data} />;
  return <UAEProformaInvoice data={data} />;
};
