import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useWebhookData } from './useWebhookData';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const { data: webhookResponse } = useWebhookData();
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('app-currency');
    return saved || 'USD';
  });

  // Calculate dynamic exchange rate from real data
  const exchangeRate = useMemo(() => {
    if (!webhookResponse?.data || !Array.isArray(webhookResponse.data)) return 83.5; // fallback
    
    // Find first record with both USD and INR
    const validRecord = webhookResponse.data.find(exp => {
      const usd = String(exp["Amount in $ (If Applicable)"] || "0");
      const inr = String(exp["Amount in ₹"] || "0");
      return usd !== "0" && inr !== "0" && inr !== "INR Not Available";
    });

    if (validRecord) {
      const usdVal = parseFloat(String(validRecord["Amount in $ (If Applicable)"]).replace(/[^0-9.]/g, '')) || 0;
      const inrVal = parseFloat(String(validRecord["Amount in ₹"]).replace(/[^0-9.]/g, '')) || 0;
      if (usdVal > 0 && inrVal > 0) {
        return inrVal / usdVal;
      }
    }

    return 83.5; // default if no dual-currency record found
  }, [webhookResponse]);

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
