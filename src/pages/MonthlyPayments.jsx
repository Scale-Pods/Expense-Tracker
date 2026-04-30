import React, { useState, useMemo } from 'react';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';
import { useWebhookData } from '../hooks/useWebhookData';
import { useCurrency } from '../hooks/CurrencyContext';
import { Search, Calendar, ArrowUpDown, Loader, AlertCircle } from 'lucide-react';
import { format, parse } from 'date-fns';
import '../styles/payments.css';

const MonthlyPayments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);

  const { data: webhookResponse, loading, error } = useWebhookData();
  const { currency, symbol, convert, formatAmount, exchangeRate } = useCurrency();

  const paymentsData = useMemo(() => {
    if (!webhookResponse || !webhookResponse.data || !Array.isArray(webhookResponse.data)) {
      return [];
    }

    const displayNames = {};
    return webhookResponse.data.map((exp, idx) => {
      let amtStr = String(exp["Amount in $ (If Applicable)"] || "0");
      let costVal = 0;
      if (amtStr !== "0" && amtStr !== "INR Not Available") {
         costVal = parseFloat(amtStr.replace(/[^0-9.]/g, '')) || 0;
      } else {
         const inrStr = String(exp["Amount in ₹"] || "0");
         if (inrStr !== "0" && inrStr !== "INR Not Available") {
            costVal = (parseFloat(inrStr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate; 
         }
      }

      const rawName = exp["Spent On"] || 'Unknown';
      const nameKey = rawName.toLowerCase().trim();
      if (!displayNames[nameKey]) displayNames[nameKey] = rawName;
      const normalizedName = displayNames[nameKey];

      let date = null;
      if (exp.Date) {
        try {
          const parts = exp.Date.split('/');
          if (parts.length === 3) {
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            date = new Date(exp.Date);
          }
        } catch { /* ignore parse error */ }
      }

      return {
         id: exp.UniqueID || idx,
         name: normalizedName,
         vendor: exp["Spent From"] || 'Unknown',
         category: normalizedName,
         type: exp.Type || 'Unknown',
         cost: costVal,
         date: date,
         dateStr: exp.Date || 'No Date',
         status: exp.Status ? 'Cleared' : 'Pending'
      };
    }).filter(s => s.cost > 0 && s.date);
  }, [webhookResponse, exchangeRate]);

  const months = useMemo(() => {
    const monthSet = new Set();
    paymentsData.forEach(p => {
      if (p.date) {
        monthSet.add(format(p.date, 'yyyy-MM'));
      }
    });
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [paymentsData]);

  const filteredData = useMemo(() => {
    let data = paymentsData.filter(p => p.date && format(p.date, 'yyyy-MM') === selectedMonth);

    if (searchTerm) {
      data = data.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig.key) {
      data.sort((a, b) => {
        const valA = sortConfig.key === 'cost' ? convert(a.cost) : a[sortConfig.key];
        const valB = sortConfig.key === 'cost' ? convert(b.cost) : b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [searchTerm, sortConfig, selectedMonth, paymentsData, convert]);

  const totalMonthly = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.cost, 0);
  }, [filteredData]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const columns = [
    { 
      header: <div className="sort-header" onClick={() => requestSort('name')}>Service <ArrowUpDown size={14} /></div>, 
      accessor: 'name',
      align: 'left',
      render: (row) => <span className="font-medium text-main">{row.name}</span>
    },
    { 
      header: 'Type', 
      accessor: 'type',
      align: 'center',
      render: (row) => <Badge variant={row.type === 'Recurring' ? 'info' : 'secondary'}>{row.type}</Badge>
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('cost')}>Amount ({currency}) <ArrowUpDown size={14} /></div>, 
      accessor: 'cost',
      align: 'right',
      render: (row) => <span className="font-bold text-main">{symbol}{convert(row.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('date')}>Date <ArrowUpDown size={14} /></div>, 
      accessor: 'dateStr',
      align: 'center',
      className: 'nowrap'
    },
    { 
      header: 'Status', 
      accessor: 'status',
      align: 'right',
      render: (row) => (
        <Badge variant={row.status === 'Cleared' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
  ];

  if (loading) {
    return (
      <div className="modern-loading-screen">
        <div className="loader-visual">
          <div className="loader-aura"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>
        <p className="loading-text-modern">Synchronizing Payments</p>
      </div>
    );
  }

  if (error || (webhookResponse && webhookResponse.error)) {
    return (
      <div className="services-container">
        <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <p className="text-red-600/80">Failed to load monthly payments. {error?.message || webhookResponse?.message}</p>
        </div>
      </div>
    );
  }

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setIsMonthSelectOpen(false);
  };

  return (
    <div className="payments-container">
      <div className="payments-header">
        <div className="header-title-group">
          <h1>Monthly Payments</h1>
          <p>Track expenses for {format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')}</p>
        </div>
        
        <div className="custom-dropdown-container">
          <button 
            className={`custom-dropdown-trigger ${isMonthSelectOpen ? 'active' : ''}`}
            onClick={() => setIsMonthSelectOpen(!isMonthSelectOpen)}
          >
            <Calendar size={18} />
            <span>{format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')}</span>
            <ArrowUpDown size={14} className={`chevron ${isMonthSelectOpen ? 'rotate' : ''}`} />
          </button>
          
          {isMonthSelectOpen && (
            <div className="custom-dropdown-menu animate-dropdown">
              {months.map(m => (
                <button 
                  key={m} 
                  className={`dropdown-item ${selectedMonth === m ? 'selected' : ''}`}
                  onClick={() => handleMonthSelect(m)}
                >
                  {format(parse(m, 'yyyy-MM', new Date()), 'MMMM yyyy')}
                  {selectedMonth === m && <div className="dot"></div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-flex">
            <p className="stat-label">Total Spent</p>
            <h2 className="stat-value">{formatAmount(totalMonthly)}</h2>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-flex">
            <p className="stat-label">Transactions</p>
            <h2 className="stat-value">{filteredData.length}</h2>
          </div>
        </Card>
      </div>

      <Card className="payments-table-card">
        <div className="table-controls">
          <div className="payments-search-wrapper">
            <Search size={18} className="payments-search-icon" />
            <input 
              type="text" 
              placeholder="Search service..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="payments-search-input"
            />
          </div>
        </div>
        
        <div className="table-responsive">
          <Table columns={columns} data={filteredData} emptyMessage="No payments found." />
        </div>
      </Card>
    </div>
  );
};

export default MonthlyPayments;
