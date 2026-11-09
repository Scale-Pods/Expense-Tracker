/**
 * Shared invoice utility functions used by both Create Invoice and All Invoices pages.
 */
import { getDefaultCurrency, getCurrencyName } from './currencyConstants';

export const parseSmartDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const p1 = parseInt(parts[0], 10);
  const p2 = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);

  // Try M/D/YYYY first
  const d1 = new Date(y, p1 - 1, p2);
  if (d1.getMonth() === p1 - 1 && d1.getDate() === p2) return d1;

  // Fallback to D/M/YYYY
  const d2 = new Date(y, p2 - 1, p1);
  if (d2.getMonth() === p2 - 1 && d2.getDate() === p1) return d2;

  return null;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr) || /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const d = parseSmartDate(dateStr);
  if (d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
  const currencyName = getCurrencyName(currency);
  
  let res = '';
  if (currency === 'INR') {
    res = convertIndia(whole) + 'Rupees ';
    if (fraction > 0) res += 'and ' + convertIndia(fraction) + 'Paise ';
  } else if (currency === 'AED') {
    res = convertInternational(whole) + 'UAE Dirhams ';
    if (fraction > 0) res += 'and ' + convertInternational(fraction) + 'Fils ';
  } else if (currency === 'QAR') {
    res = convertInternational(whole) + 'Qatari Riyals ';
    if (fraction > 0) res += 'and ' + convertInternational(fraction) + 'Dirhams ';
  } else {
    res = convertInternational(whole) + currencyName + ' ';
    if (fraction > 0) res += 'and ' + convertInternational(fraction) + 'Cents ';
  }
  return res + 'Only';
};

/**
 * Parse body column or body JSON object from webhook row if present.
 */
export const extractRowBody = (row) => {
  if (!row) return {};
  if (row.body) {
    if (typeof row.body === 'object') return row.body;
    if (typeof row.body === 'string') {
      try {
        return JSON.parse(row.body);
      } catch (e) {
        console.warn('Failed to parse row.body JSON', e);
      }
    }
  }
  return {};
};

/**
 * Extract the accurate invoice number from a webhook row,
 * prioritizing the nested 'body' column where payload data is recorded.
 */
export const getInvoiceNumberFromRow = (row) => {
  if (!row) return '';
  const parsedBody = extractRowBody(row);
  return (
    parsedBody.invoiceNo ||
    parsedBody.invoice_no ||
    parsedBody['Invoice No'] ||
    parsedBody['Invoice Number'] ||
    row.invoiceNo ||
    row.invoice_no ||
    row['Invoice No'] ||
    row['Invoice Number'] ||
    ''
  );
};

/**
 * Given a list of existing invoice objects or raw rows, calculate the next sequential invoice number.
 * e.g., if highest existing number is 27 (or 027), next is 28 (or SP/INV-028 / INV-028).
 */
export const getNextInvoiceNumber = (invoices = [], defaultPrefix = 'SP/INV-') => {
  let maxNum = 0;
  let detectedPrefix = defaultPrefix;
  let paddingLength = 3;

  invoices.forEach(inv => {
    const invNo = getInvoiceNumberFromRow(inv);
    if (!invNo) return;

    // Match any trailing or standalone number, e.g. "SP/INV-027" -> 27, "SP-25" -> 25, "27" -> 27
    const match = String(invNo).trim().match(/^(.*?)(0*)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const leadingZeros = match[2];
      const digits = match[3];
      const num = parseInt(digits, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
        if (prefix) detectedPrefix = prefix;
        paddingLength = Math.max((leadingZeros + digits).length, 3);
      }
    }
  });

  if (maxNum === 0) {
    return `${defaultPrefix}001`;
  }

  const nextNum = maxNum + 1;
  const paddedNext = String(nextNum).padStart(paddingLength, '0');
  return `${detectedPrefix}${paddedNext}`;
};

/**
 * Remove characters that are not allowed in file names (Windows/macOS).
 * Invoice numbers like "SP/INV-034" become "SP-INV-034".
 */
export const sanitizeForFileName = (value) =>
  String(value || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-\s]+|[-\s]+$/g, '');

/**
 * Build the PDF file name so it ends with the invoice number,
 * e.g. "Invoice_Acme_Corp_SP-INV-034.pdf".
 */
export const buildInvoiceFileName = (invoiceNo, clientName = 'Record') => {
  const client = sanitizeForFileName(String(clientName || '').split('\n')[0])
    .replace(/\s+/g, '_') || 'Record';
  const safeInvoiceNo = sanitizeForFileName(invoiceNo);
  return safeInvoiceNo
    ? `Invoice_${client}_${safeInvoiceNo}.pdf`
    : `Invoice_${client}.pdf`;
};

/**
 * Reconstruct a full invoice data object from a flat webhook row
 * for re-rendering the invoice template.
 */
export const reconstructInvoiceData = (row) => {
  const parsedBody = extractRowBody(row);

  // Reconstruct items: prioritize body.items, then row.items, then flattened fields
  let items = [];
  const rawItems = parsedBody.items || row.items;
  if (rawItems) {
    try {
      items = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
      if (!Array.isArray(items)) items = [];
    } catch (e) {
      console.warn('Failed to parse items JSON', e);
      items = [];
    }
  }
  
  if (items.length === 0 && (parsedBody.itemDescriptions || row.itemDescriptions) && (parsedBody.itemAmounts || row.itemAmounts)) {
    const descsStr = parsedBody.itemDescriptions || row.itemDescriptions;
    const amtsStr = parsedBody.itemAmounts || row.itemAmounts;
    const descs = descsStr.split(',').map(s => s.trim());
    const amts = amtsStr.split(',').map(s => s.trim());
    items = descs.map((d, i) => ({ description: d, amount: amts[i] || '0' }));
  }
  
  if (items.length === 0) {
    items = [{ description: parsedBody.description || row.description || 'Service', amount: String(parsedBody.amount || row.amount || '0') }];
  }

  // Reconstruct name (clientName + clientAddress with newline)
  let name = parsedBody.name || row.name || '';
  const clientName = parsedBody.clientName || row.clientName;
  const clientAddress = parsedBody.clientAddress || row.clientAddress;
  if (!name && clientName) {
    name = clientAddress ? `${clientName}\n${clientAddress}` : clientName;
  }

  // Determine type and region
  let type = parsedBody.type || row.type || 'Proforma';
  let region = parsedBody.region || row.region || 'United States';
  const invoiceType = parsedBody.invoiceType || row.invoiceType;
  if (invoiceType) {
    const it = invoiceType.toLowerCase();
    if (it.includes('tax')) type = 'Tax';
    else if (it.includes('performa') || it.includes('proforma')) type = 'Proforma';
    
    if (it.includes('uae')) region = 'UAE';
    else if (it.includes('india')) region = 'India';
  }

  const invoiceNo = getInvoiceNumberFromRow(row);

  return {
    type,
    region,
    name,
    email: parsedBody.email || row.email || '',
    currency: parsedBody.currency || row.currency || getDefaultCurrency(region),
    amount: String(parsedBody.amount || row.amount || '0'),
    amountPaid: String(parsedBody.amountPaid || row.amountPaid || '0'),
    dueAmount: String(parsedBody.dueAmount || row.dueAmount || '0'),
    items,
    dueDate: parsedBody.dueDate || row.dueDate || '',
    invoiceDate: parsedBody.invoiceDate || row.invoiceDate || '',
    invoiceNo: invoiceNo || '',
    terms: parsedBody.terms || row.terms || '',
    accHolder: parsedBody.accHolder || row.accHolder || 'SCALEPODS LLP',
    bankName: parsedBody.bankName || row.bankName || 'HDFC Bank Ltd',
    accNo: String(parsedBody.accNo || row.accNo || '50200119456950'),
    ifsc: parsedBody.ifsc || row.ifsc || 'HDFC0000060',
    branch: parsedBody.branch || row.branch || 'FORT',
    swiftCode: parsedBody.swiftCode || row.swiftCode || 'HDFCINBB',
    accType: parsedBody.accType || row.accType || 'Current Account',
    myGstin: parsedBody.myGstin || row.myGstin || '27AFUFS0352J1ZI',
    clientGstin: String(parsedBody.clientGstin || row.clientGstin || ''),
    clientState: parsedBody.clientState || row.clientState || (region === 'India' ? 'Maharashtra' : ''),
    amountInWords: parsedBody.amountInWords || row.amountInWords || '',
    paymentTerm: parsedBody.paymentTerm || row.paymentTerm || 'One Time',
    sacCode: String(parsedBody.sacCode || row.sacCode || '998313'),
    lutEnabled: parsedBody.lutEnabled === 'true' || parsedBody.lutEnabled === true || row.lutEnabled === 'true' || row.lutEnabled === true,
    lutArn: parsedBody.lutArn || row.lutArn || '',
  };
};
