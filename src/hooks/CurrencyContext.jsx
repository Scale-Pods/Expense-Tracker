import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebhookData } from './useWebhookData';

const CurrencyContext = createContext();

const FALLBACK_RATE = 85;

export const CurrencyProvider = ({ children }) => {
  const { data: webhookResponse } = useWebhookData();
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('app-currency');
    return saved || 'USD';
  });
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);

  // Derive rate from data as primary source
  const dataRate = (() => {
    if (!webhookResponse?.data || !Array.isArray(webhookResponse.data)) return null;
    const validRecord = webhookResponse.data.find(exp => {
      const usd = String(exp["Amount in $ (If Applicable)"] || "0");
      const inr = String(exp["Amount in ₹"] || "0");
      return usd !== "0" && inr !== "0" && inr !== "INR Not Available";
    });
    if (validRecord) {
      const usdVal = parseFloat(String(validRecord["Amount in $ (If Applicable)"]).replace(/[^0-9.]/g, '')) || 0;
      const inrVal = parseFloat(String(validRecord["Amount in ₹"]).replace(/[^0-9.]/g, '')) || 0;
      if (usdVal > 0 && inrVal > 0) return inrVal / usdVal;
    }
    return null;
  })();

  // Fetch live rate from API as secondary source
  const fetchExchangeRate = useCallback(async () => {
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
      const data = await res.json();
      if (data?.rates?.INR) {
        setExchangeRate(data.rates.INR);
        return;
      }
    } catch {
      // API unavailable, fall through to data-derived or hardcoded
    }
    if (dataRate) setExchangeRate(dataRate);
    else setExchangeRate(FALLBACK_RATE);
  }, [dataRate]);

  useEffect(() => {
    // Use data rate immediately if available
    if (dataRate) setExchangeRate(dataRate);
    // Also try API for a more current rate
    fetchExchangeRate();
  }, [fetchExchangeRate, dataRate]);

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
