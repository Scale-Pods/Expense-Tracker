import React, { useState, useMemo } from 'react';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';
import { useWebhookData } from '../hooks/useWebhookData';
import { useCurrency } from '../hooks/CurrencyContext';
import { Search, Calendar, ArrowUpDown, Loader, AlertCircle, Filter, Tag, X } from 'lucide-react';
import { format, parse, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import CubeLoader from '../components/ui/cube-loader';
import '../styles/payments.css';

const MonthlyPayments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);
  
  // Custom Range State
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

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
      const rawCategory = exp.Category || exp["Category"] || exp.Type || exp["Type"] || 'Other';
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
         category: rawCategory,
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

  const categories = useMemo(() => {
    const catSet = new Set(['All']);
    let relevantData = paymentsData;
    if (isCustomRange) {
        if (dateRange.start && dateRange.end) {
            const start = startOfDay(new Date(dateRange.start));
            const end = endOfDay(new Date(dateRange.end));
            relevantData = relevantData.filter(p => isWithinInterval(p.date, { start, end }));
        }
    } else {
        relevantData = relevantData.filter(p => p.date && format(p.date, 'yyyy-MM') === selectedMonth);
    }
    
    relevantData.forEach(p => catSet.add(p.category));
    return Array.from(catSet).sort();
  }, [paymentsData, selectedMonth, isCustomRange, dateRange]);

  const filteredData = useMemo(() => {
    let data = paymentsData;

    if (isCustomRange) {
      if (dateRange.start && dateRange.end) {
        const start = startOfDay(new Date(dateRange.start));
        const end = endOfDay(new Date(dateRange.end));
        data = data.filter(p => isWithinInterval(p.date, { start, end }));
      } else {
        return []; // Don't show data until both dates are set
      }
    } else {
      data = data.filter(p => p.date && format(p.date, 'yyyy-MM') === selectedMonth);
    }

    if (selectedCategory !== 'All') {
      data = data.filter(p => p.category === selectedCategory);
    }

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
  }, [searchTerm, sortConfig, selectedMonth, selectedCategory, isCustomRange, dateRange, paymentsData, convert]);

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
      header: 'Category', 
      accessor: 'category',
      align: 'center',
      render: (row) => <Badge variant="secondary">{row.category}</Badge>
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

  if (loading && !webhookResponse) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CubeLoader />
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
    setIsCustomRange(false);
    setSelectedMonth(month);
    setIsMonthSelectOpen(false);
    setSelectedCategory('All');
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setIsCategorySelectOpen(false);
  };

  return (
    <div className="payments-container redesigned">
      <div className="payments-header">
        <div className="header-title-group">
          <h1>Monthly Payments</h1>
          <p>
            {isCustomRange 
              ? `Range: ${dateRange.start || '...'} to ${dateRange.end || '...'}`
              : `Track expenses for ${format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')}`
            }
          </p>
        </div>
        
        <div className="header-filters">
          <div className="custom-dropdown-container">
            <button 
              className={`custom-dropdown-trigger ${isMonthSelectOpen ? 'active' : ''}`}
              onClick={() => { setIsMonthSelectOpen(!isMonthSelectOpen); setIsCategorySelectOpen(false); }}
            >
              <Calendar size={18} />
              <span>{isCustomRange ? 'Custom Range' : format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')}</span>
              <ArrowUpDown size={14} className={`chevron ${isMonthSelectOpen ? 'rotate' : ''}`} />
            </button>
            
            {isMonthSelectOpen && (
              <div className="custom-dropdown-menu animate-dropdown">
                <button 
                    className={`dropdown-item ${isCustomRange ? 'selected' : ''}`}
                    onClick={() => { setIsCustomRange(true); setIsMonthSelectOpen(false); setSelectedCategory('All'); }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={14} /> Custom Date Range...
                    </div>
                </button>
                <div className="menu-divider" />
                {months.map(m => (
                  <button 
                    key={m} 
                    className={`dropdown-item ${(!isCustomRange && selectedMonth === m) ? 'selected' : ''}`}
                    onClick={() => handleMonthSelect(m)}
                  >
                    {format(parse(m, 'yyyy-MM', new Date()), 'MMMM yyyy')}
                    {(!isCustomRange && selectedMonth === m) && <div className="dot"></div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="custom-dropdown-container">
            <button 
              className={`custom-dropdown-trigger ${isCategorySelectOpen ? 'active' : ''}`}
              onClick={() => { setIsCategorySelectOpen(!isCategorySelectOpen); setIsMonthSelectOpen(false); }}
            >
              <Filter size={18} />
              <span>{selectedCategory}</span>
              <ArrowUpDown size={14} className={`chevron ${isCategorySelectOpen ? 'rotate' : ''}`} />
            </button>
            
            {isCategorySelectOpen && (
              <div className="custom-dropdown-menu animate-dropdown">
                {categories.map(cat => (
                  <button 
                    key={cat} 
                    className={`dropdown-item ${selectedCategory === cat ? 'selected' : ''}`}
                    onClick={() => handleCategorySelect(cat)}
                  >
                    {cat}
                    {selectedCategory === cat && <div className="dot"></div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isCustomRange && (
        <div className="custom-range-bar animate-slide-down">
            <div className="range-inputs">
                <div className="range-field">
                    <label>Start Date</label>
                    <input 
                        type="date" 
                        value={dateRange.start} 
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})} 
                    />
                </div>
                <div className="range-field">
                    <label>End Date</label>
                    <input 
                        type="date" 
                        value={dateRange.end} 
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})} 
                    />
                </div>
            </div>
            <button className="clear-range-btn" onClick={() => { setIsCustomRange(false); setSelectedMonth(months[0] || format(new Date(), 'yyyy-MM')); }}>
                <X size={16} /> Exit Custom Range
            </button>
        </div>
      )}

      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-flex">
            <div className="stat-icon-box"><Tag size={20} /></div>
            <div>
              <p className="stat-label">Total Spent</p>
              <h2 className="stat-value">{formatAmount(totalMonthly)}</h2>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-flex">
            <div className="stat-icon-box blue"><Filter size={20} /></div>
            <div>
              <p className="stat-label">Records</p>
              <h2 className="stat-value">{filteredData.length}</h2>
            </div>
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
