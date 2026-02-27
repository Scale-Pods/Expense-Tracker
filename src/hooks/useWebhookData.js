import { useState, useEffect, useCallback } from 'react';
import { fetchWebhookData } from '../utils/api';

export const useWebhookData = (action = 'Expense') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchWebhookData(action);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => {
    getData();
    // Refresh data every 5 minutes to catch exchange rate fluctuations
    const interval = setInterval(getData, 300000);
    
    return () => {
      clearInterval(interval);
    };
  }, [getData]);

  return { data, loading, error, refetch: getData };
};
