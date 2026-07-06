export const REGIONS = [
  { name: 'India', currency: 'INR' },
  { name: 'UAE', currency: 'AED' },
  { name: 'United States', currency: 'USD' },
  { name: 'United Kingdom', currency: 'GBP' },
  { name: 'Europe', currency: 'EUR' },
  { name: 'Singapore', currency: 'SGD' },
  { name: 'Canada', currency: 'CAD' },
  { name: 'Australia', currency: 'AUD' },
  { name: 'Japan', currency: 'JPY' },
];

export const CURRENCIES = [
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'AED', symbol: '\u062F.\u0625', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen' },
];

export const getCurrencySymbol = (code) => {
  const c = CURRENCIES.find(c => c.code === code);
  return c ? c.symbol : code;
};

export const getDefaultCurrency = (region) => {
  const r = REGIONS.find(r => r.name === region);
  return r ? r.currency : 'USD';
};

export const getCurrencyName = (code) => {
  const c = CURRENCIES.find(c => c.code === code);
  return c ? c.name : code;
};
