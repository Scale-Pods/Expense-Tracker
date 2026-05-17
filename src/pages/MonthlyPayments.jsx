import React, { useState, useMemo } from 'react';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';
import { useWebhookData } from '../hooks/useWebhookData';
import { useCurrency } from '../hooks/CurrencyContext';
import { Search, Calendar, ArrowUpDown, Loader, AlertCircle, Filter, Tag, X, ChevronDown } from 'lucide-react';
import { format, parse, isWithinInterval, startOfDay, endOfDay, subDays, subMonths, subYears, isBefore, isAfter } from 'date-fns';
import CubeLoader from '../components/ui/cube-loader';
import CustomSelect from '../components/common/CustomSelect';
import '../styles/payments.css';
import '../styles/dashboard.css';

const MonthlyPayments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [dateFilter, setDateFilter] = useState('1 month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [cardFilter, setCardFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [paidByFilter, setPaidByFilter] = useState('all');

  const { data: webhookResponse, loading, error } = useWebhookData();
  const { data: cardsResponse } = useWebhookData('Cards');
  const { currency, symbol, convert, formatAmount, exchangeRate } = useCurrency();

  const paymentsData = useMemo(() => {
    if (!webhookResponse || !webhookResponse.data || !Array.isArray(webhookResponse.data)) {
      return [];
    }

    const displayNames = {};
    return webhookResponse.data.map((exp, idx) => {
      const inrStr = String(exp["Amount in ₹"] || "0");
      let costVal = 0;
      if (inrStr !== "0" && inrStr !== "INR Not Available") {
         costVal = (parseFloat(inrStr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate; 
      } else {
         let amtStr = String(exp["Amount in $ (If Applicable)"] || "0");
         if (amtStr !== "0" && amtStr !== "INR Not Available") {
            costVal = parseFloat(amtStr.replace(/[^0-9.]/g, '')) || 0;
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
         status: exp.Status ? 'Cleared' : 'Pending',
         card: exp["Paid Via"] || exp.PaidVia || exp.Card || '',
         paidBy: exp["Paid By"] || exp.PaidBy || ''
      };
    }).filter(s => s.cost > 0 && s.date);
  }, [webhookResponse, exchangeRate]);

  const filterOptions = useMemo(() => {
    const cards = new Set();
    const types = new Set();
    const people = new Set();
    
    if (cardsResponse?.data && Array.isArray(cardsResponse.data)) {
      cardsResponse.data.forEach(item => {
        const auth = item.Authorizer || '';
        const num = item["Card Number"] || '';
        const cardStr = num ? `${auth} - ${num}` : auth;
        if (cardStr) cards.add(cardStr);
      });
    }

    if (webhookResponse?.data && Array.isArray(webhookResponse.data)) {
      webhookResponse.data.forEach(item => {
        const card = item["Paid Via"] || item.PaidVia || item.Card;
        const type = item.Type;
        const person = item["Paid By"] || item.PaidBy;
        if (card) cards.add(card);
        if (type) types.add(type);
        if (person) people.add(person);
      });
    }
    
    return {
      cards: Array.from(cards).sort(),
      types: Array.from(types).sort(),
      people: Array.from(people).sort()
    };
  }, [webhookResponse, cardsResponse]);

  const filteredData = useMemo(() => {
    let data = paymentsData;

    if (dateFilter !== 'all time') {
        const now = new Date();
        let startDate = null;
        if (dateFilter === '7 days') startDate = subDays(now, 7);
        else if (dateFilter === '3 weeks') startDate = subDays(now, 21);
        else if (dateFilter === '1 month') startDate = subMonths(now, 1);
        else if (dateFilter === '3 month') startDate = subMonths(now, 3);
        else if (dateFilter === '6 month') startDate = subMonths(now, 6);
        else if (dateFilter === '1 year') startDate = subYears(now, 1);
        else if (dateFilter === 'custom' && customRange.start) startDate = new Date(customRange.start);
        
        data = data.filter(p => {
          if (!p.date) return false;
          if (startDate && isBefore(p.date, startOfDay(startDate))) return false;
          if (dateFilter === 'custom' && customRange.end && isAfter(p.date, endOfDay(new Date(customRange.end)))) return false;
          return true;
        });
    }

    if (cardFilter !== 'all') {
      data = data.filter(p => p.card.toLowerCase() === cardFilter.toLowerCase());
    }

    if (typeFilter !== 'all') {
      data = data.filter(p => p.type.toLowerCase() === typeFilter.toLowerCase());
    }

    if (paidByFilter !== 'all') {
      data = data.filter(p => p.paidBy.toLowerCase() === paidByFilter.toLowerCase());
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
  }, [searchTerm, sortConfig, dateFilter, customRange, cardFilter, typeFilter, paidByFilter, paymentsData, convert]);

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



  return (
    <div className="payments-container redesigned">
      <div className="dashboard-header-sleek stagger-load flex justify-between items-end mb-8">
        <div className="header-text-group">
          <p className="subtitle-muted">Detailed view of your expenditures</p>
          <h1 className="title-bold">Monthly Payments</h1>
        </div>
      </div>

      <div className="dashboard-filter-bar-sleek stagger-load mb-6">
        <div className="filter-row-flush">
          <CustomSelect 
            label="Date Range"
            value={dateFilter} 
            onChange={setDateFilter} 
            options={[
              { label: 'All Time', value: 'all time' },
              { label: '7 Days', value: '7 days' },
              { label: '3 Weeks', value: '3 weeks' },
              { label: '1 Month', value: '1 month' },
              { label: '3 Months', value: '3 month' },
              { label: '6 Months', value: '6 month' },
              { label: '1 Year', value: '1 year' },
              { label: 'Custom', value: 'custom' }
            ]} 
          />

          {dateFilter === 'custom' && (
            <div className="custom-filter-pill custom-range-pills">
              <div className="pill-input-wrapper">
                <input 
                  type="date" 
                  value={customRange.start} 
                  onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                  className="date-pill-input"
                />
              </div>
              <span className="pill-separator">to</span>
              <div className="pill-input-wrapper">
                <input 
                  type="date" 
                  value={customRange.end} 
                  onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                  className="date-pill-input"
                />
              </div>
            </div>
          )}

          <CustomSelect 
            label="Card / Paid Via"
            value={cardFilter} 
            onChange={setCardFilter} 
            options={[
              { label: 'All Cards', value: 'all' },
              ...filterOptions.cards.map(card => ({ label: card, value: card }))
            ]} 
          />

          <CustomSelect 
            label="Type"
            value={typeFilter} 
            onChange={setTypeFilter} 
            options={[
              { label: 'All Types', value: 'all' },
              ...['Salary', 'One-time', 'Tools', 'Subscriptions', 'Ads', 'Overheads', 'Incentive'].map(type => ({ label: type, value: type.toLowerCase() }))
            ]} 
          />

          <CustomSelect 
            label="Paid By"
            value={paidByFilter} 
            onChange={setPaidByFilter} 
            options={[
              { label: 'Everyone', value: 'all' },
              ...filterOptions.people.map(person => ({ label: person, value: person }))
            ]} 
          />

          <button 
            className="reset-btn-minimal"
            onClick={() => {
              setDateFilter('1 month');
              setCardFilter('all');
              setTypeFilter('all');
              setPaidByFilter('all');
              setCustomRange({ start: '', end: '' });
            }}
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

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
