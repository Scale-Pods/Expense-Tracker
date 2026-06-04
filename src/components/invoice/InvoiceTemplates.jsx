import React from 'react';
import { formatDate, toWords } from '../../utils/invoiceUtils';

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
            <strong style={{ fontSize: '13px' }}>#{showGst ? 'TX' : 'INV'}//{(data.invoiceDate || "").split('-').join('')}</strong>
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
              <th style={{ padding: '6px 15px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', width: '150px' }}>Amount ({data.currency})</th>
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
              <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: '#1a1a1a' }}>{data.currency} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="terms-section" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', background: '#fff' }}>
        <div style={{ padding: '5px 25px 0 25px' }}>
          <div style={{ padding: '8px', background: '#fafafa', borderLeft: '4px solid #1a1a1a' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '3px' }}>Total Amount in Words:</strong>
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
              {total > 0 ? (data.amountInWords || toWords(total, 'INR')) : "Zero Rupees Only"}
            </span>
          </div>
        </div>

        <div style={{ padding: '8px 25px 15px' }}>
          <strong style={{ fontSize: '11px', color: '#333', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Terms & Conditions:</strong>

          {termsArray.length > 0 ? (
            termsArray.map((t, i) => (
              <div key={i} style={{ margin: '0 0 3px 0', background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
                {t}
              </div>
            ))
          ) : (
            <div style={{ margin: 0, background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
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
            <strong style={{ fontSize: '13px' }}>#TX/{data.name?.split('\n')[0].toUpperCase().replace(/\s+/g, '')}/{(data.invoiceDate || "").split('-').join('')}</strong>
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
            <strong>A/c Type:</strong> {data.accType || "Current Account"}
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: '#1a1a1a', color: 'white' }}>
              <th style={{ padding: '6px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Description of Services</th>
              <th style={{ padding: '6px 15px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', width: '150px' }}>Amount ({data.currency})</th>
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
              <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: '#1a1a1a' }}>{data.currency} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="terms-section" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', background: '#fff' }}>
        <div style={{ padding: '5px 25px 0 25px' }}>
          <div style={{ padding: '8px', background: '#fafafa', borderLeft: '4px solid #1a1a1a' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '3px' }}>Total Amount in Words:</strong>
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
              {total > 0 ? (data.amountInWords || toWords(total, 'AED')) : "Zero UAE Dirhams Only"}
            </span>
          </div>
        </div>

        <div style={{ padding: '8px 25px 15px' }}>
          <strong style={{ fontSize: '11px', color: '#333', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Terms & Conditions:</strong>

          {termsArray.length > 0 ? (
            termsArray.map((t, i) => (
              <div key={i} style={{ margin: '0 0 3px 0', background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
                {t}
              </div>
            ))
          ) : (
            <div style={{ margin: 0, background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
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
          <p style={{ margin: '5px 0', fontWeight: 'bold' }}>#SPx{data.name?.split('\n')[0].replace(/\s+/g, '')}-{(formatDate(data.invoiceDate)).replace(/-/g, '.')}</p>
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
              <strong>{data.currency} {subtotal.toLocaleString()}</strong>
            </div>
            {showGst && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                  <span>CGST (9%):</span>
                  <span>{data.currency} {cgst.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                  <span>SGST (9%):</span>
                  <span>{data.currency} {sgst.toLocaleString()}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
              <span>Total Amount:</span>
              <strong>{data.currency} {total.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d32f2f' }}>
              <span>Balance Due:</span>
              <strong>{data.currency} {(total - (Number(data.amountPaid) || 0)).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ background: '#333', color: '#fff' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
            <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>SAC</th>
            <th style={{ padding: '12px', textAlign: 'right', width: '150px' }}>Amount ({data.currency})</th>
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
            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>{data.currency} {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
          {showGst && (
            <>
              <tr>
                <td colSpan="2" style={{ padding: '5px 12px', textAlign: 'right', color: '#666' }}>CGST (9%)</td>
                <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: '600' }}>{data.currency} {cgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td colSpan="2" style={{ padding: '5px 12px', textAlign: 'right', color: '#666', borderBottom: '1px solid #eee' }}>SGST (9%)</td>
                <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #eee' }}>{data.currency} {sgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </>
          )}
          <tr>
            <td colSpan="2" style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>{showGst ? 'Grand Total (Incl. GST)' : 'Grand Total'}</td>
            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', fontSize: '18px', background: '#f9f9f9' }}>{data.currency} {total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="terms-section" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ marginBottom: '30px', padding: '15px', background: '#f9f9f9', borderRadius: '5px', borderLeft: '5px solid #333' }}>
          <strong style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '5px' }}>Amount in Words:</strong>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{toWords(total, 'INR')}</span>
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
            <div style={{ fontSize: '11px', color: '#777', lineHeight: '1.4' }}>
              {termsArray.length > 0 ? termsArray.map((t, i) => <div key={i} style={{ marginBottom: '3px' }}>{t}</div>) : "Standard terms apply."}
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
          <p style={{ margin: '5px 0', fontSize: '13px', fontWeight: '600', color: '#666' }}>#SPx{data.name?.split('\n')[0].replace(/\s+/g, '')}-{(formatDate(data.invoiceDate)).replace(/-/g, '.')}</p>
          <div style={{ marginTop: '10px', display: 'inline-block' }}>
            <table className="details-table" style={{ borderCollapse: 'collapse', marginLeft: 'auto' }}>
              <tbody>
                <tr><td style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>Date:</td><td style={{ padding: '4px 8px', fontSize: '13px', textAlign: 'left' }}>{formatDate(data.invoiceDate)}</td></tr>
                <tr><td style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>Due Date:</td><td style={{ padding: '4px 8px', fontSize: '13px', textAlign: 'left' }}>{formatDate(data.dueDate)}</td></tr>
                <tr style={{ color: '#d32f2f', background: 'rgba(211, 47, 47, 0.05)' }}>
                  <td style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>Balance Due:</td>
                  <td style={{ padding: '4px 8px', fontSize: '13px', textAlign: 'left', fontWeight: '800' }}>{data.currency} {(total - (Number(data.amountPaid) || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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
                <td style={{ padding: '12px', fontSize: '13px', verticalAlign: 'top' }}>{data.currency} {Number(item.amount).toLocaleString()}</td>
                <td style={{ padding: '12px', fontSize: '13px', verticalAlign: 'top', textAlign: 'right', fontWeight: '700' }}>{data.currency} {Number(item.amount).toLocaleString()}</td>
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
          <strong>A/c Type:</strong> {data.accType || "Current Account"}<br />
          <strong>Branch:</strong> {data.branch || "FORT"}
        </div>

        <div className="summary-section" style={{ flex: '0 1 250px', minWidth: '200px' }}>
          <table className="summary-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr className="total-row" style={{ backgroundColor: '#f8f8f8', fontWeight: 'bold', border: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontSize: '14px' }}>Total:</td>
                <td style={{ textAlign: 'right', padding: '12px', fontSize: '14px' }}>{data.currency} {total.toLocaleString()}</td>
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
              {total > 0 ? (data.amountInWords || toWords(total, 'AED')) : "Zero UAE Dirhams Only"}
            </span>
          </div>
        </div>

        <div style={{ padding: '8px 25px 15px' }}>
          <strong style={{ fontSize: '11px', color: '#333', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Terms & Conditions:</strong>

          {termsArray.length > 0 ? (
            termsArray.map((t, i) => (
              <div key={i} style={{ margin: '0 0 3px 0', background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
                {t}
              </div>
            ))
          ) : (
            <div style={{ margin: 0, background: '#fff', fontSize: '12px', color: '#777', lineHeight: '1.2' }}>
              1. Standard terms apply. 2. This is a computer generated document.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const InvoicePaper = ({ data }) => {
  if (!data) return null;
  const isIndia = (data.region || 'India').toLowerCase() === 'india';
  const isTax = (data.type || 'Proforma').toLowerCase() === 'tax';

  if (isIndia && isTax) return <IndiaTaxInvoice data={data} />;
  if (isIndia && !isTax) return <IndiaProformaInvoice data={data} />;
  if (!isIndia && isTax) return <UAETaxInvoice data={data} />;
  return <UAEProformaInvoice data={data} />;
};
