/**
 * Shared invoice utility functions used by both Create Invoice and All Invoices pages.
 */

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr) || /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export const toWords = (num, currency = 'INR') => {
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

/**
 * Reconstruct a full invoice data object from a flat webhook row
 * for re-rendering the invoice template.
 */
export const reconstructInvoiceData = (row) => {
  // Reconstruct items: prioritize JSON 'items' field, then fallback to flattened fields
  let items = [];
  if (row.items) {
    try {
      items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
      if (!Array.isArray(items)) items = [];
    } catch (e) {
      console.warn('Failed to parse items JSON', e);
      items = [];
    }
  }
  
  if (items.length === 0 && row.itemDescriptions && row.itemAmounts) {
    const descs = row.itemDescriptions.split(',').map(s => s.trim());
    const amts = row.itemAmounts.split(',').map(s => s.trim());
    items = descs.map((d, i) => ({ description: d, amount: amts[i] || '0' }));
  }
  
  if (items.length === 0) {
    items = [{ description: row.description || 'Service', amount: String(row.amount || '0') }];
  }

  // Reconstruct name (clientName + clientAddress with newline)
  let name = row.name || '';
  if (!name && row.clientName) {
    name = row.clientAddress ? `${row.clientName}\n${row.clientAddress}` : row.clientName;
  }

  // Determine type and region
  let type = row.type || 'Proforma';
  let region = row.region || 'India';
  if (row.invoiceType) {
    const it = row.invoiceType.toLowerCase();
    if (it.includes('tax')) type = 'Tax';
    else if (it.includes('performa') || it.includes('proforma')) type = 'Proforma';
    
    if (it.includes('uae')) region = 'UAE';
    else if (it.includes('india')) region = 'India';
  }

  return {
    type,
    region,
    name,
    email: row.email || '',
    currency: row.currency || (region === 'UAE' ? 'AED' : 'INR'),
    amount: String(row.amount || '0'),
    amountPaid: String(row.amountPaid || '0'),
    dueAmount: String(row.dueAmount || '0'),
    items,
    dueDate: row.dueDate || '',
    invoiceDate: row.invoiceDate || '',
    terms: row.terms || '',
    accHolder: row.accHolder || 'SCALEPODS LLP',
    bankName: row.bankName || 'HDFC Bank Ltd',
    accNo: String(row.accNo || '50200119456950'),
    ifsc: row.ifsc || 'HDFC0000060',
    branch: row.branch || 'FORT',
    accType: row.accType || 'Current Account',
    myGstin: row.myGstin || '27AFUFS0352J1ZI',
    clientGstin: String(row.clientGstin || ''),
    clientState: row.clientState || (region === 'India' ? 'Maharashtra' : ''),
    amountInWords: row.amountInWords || '',
    paymentTerm: row.paymentTerm || 'One Time',
    sacCode: String(row.sacCode || '998313'),
  };
};
