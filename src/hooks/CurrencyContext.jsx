import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('app-currency');
    return saved || 'USD';
  });
  const [exchangeRate, setExchangeRate] = useState(1);

  const fetchExchangeRate = useCallback(async () => {
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
      const data = await res.json();
      if (data?.rates?.INR) {
        setExchangeRate(data.rates.INR);
      }
    } catch {
      // fallback to 1 if API fails
    }
  }, []);

  useEffect(() => {
    fetchExchangeRate();
  }, [fetchExchangeRate]);

  const formats = {
    USD: { symbol: '$', rate: 1, locale: 'en-US' },
    INR: { symbol: '₹', rate: exchangeRate, locale: 'en-IN' }
  };

  useEffect(() => {
    localStorage.setItem('app-currency', currency);
  }, [currency]);

  const toggleCurrency = () => {
    setCurrency(prev => prev === 'USD' ? 'INR' : 'USD');
  };

  const formatAmount = (usdAmount) => {
    const config = formats[currency];
    const converted = usdAmount * config.rate;
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(converted);
  };

  const convert = (usdAmount) => {
    return usdAmount * formats[currency].rate;
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      toggleCurrency, 
      formatAmount, 
      convert,
      symbol: formats[currency].symbol,
      exchangeRate
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
