import React, { useState, useMemo } from 'react';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';
import { useWebhookData } from '../hooks/useWebhookData';
import { useCurrency } from '../hooks/CurrencyContext';
import { Search, Filter, ArrowUpDown, Loader, AlertCircle } from 'lucide-react';
import '../styles/services.css';

const Services = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterCategory, setFilterCategory] = useState('All');

  const { data: webhookResponse, loading, error } = useWebhookData();
  const { currency, symbol, convert, exchangeRate } = useCurrency();

  const servicesData = useMemo(() => {
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
         const inr = String(exp["Amount in ₹"] || "0");
         if (inr !== "0" && inr !== "INR Not Available") {
            costVal = (parseFloat(inr.replace(/[^0-9.]/g, '')) || 0) / exchangeRate; 
         }
      }

      const rawName = exp["Spent On"] || 'Unknown';
      const nameKey = rawName.toLowerCase().trim();
      if (!displayNames[nameKey]) displayNames[nameKey] = rawName;
      const normalizedName = displayNames[nameKey];

      return {
         id: exp.UniqueID || idx,
         name: normalizedName,
         vendor: exp["Spent From"] || 'Unknown',
         category: normalizedName, 
         billing: exp.Type || 'Unknown',
         cost: costVal,
         renewal: exp.Date || 'No Date',
         status: exp.Status ? 'Active' : 'Pending'
      };
    }).filter(s => s.cost > 0);
  }, [webhookResponse, exchangeRate]);

  const categories = ['All', ...new Set(servicesData.map(item => item.category))];

  const sortedAndFilteredData = useMemo(() => {
    let actionableData = [...servicesData];

    if (searchTerm) {
      actionableData = actionableData.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'All') {
      actionableData = actionableData.filter(item => item.category === filterCategory);
    }

    if (sortConfig.key) {
      actionableData.sort((a, b) => {
        const valA = sortConfig.key === 'cost' ? convert(a.cost) : a[sortConfig.key];
        const valB = sortConfig.key === 'cost' ? convert(b.cost) : b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return actionableData;
  }, [searchTerm, sortConfig, filterCategory, servicesData, convert]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const columns = [
    { 
      header: <div className="sort-header" onClick={() => requestSort('name')}>Service <ArrowUpDown size={14} /></div>, 
      accessor: 'name',
      render: (row) => <span className="font-medium text-main">{row.name}</span>
    },
    { 
      header: <div className="sort-header" onClick={() => requestSort('vendor')}>Vendor <ArrowUpDown size={14} /></div>, 
      accessor: 'vendor' 
    },
    { 
      header: 'Category', 
      accessor: 'category',
      render: (row) => <span className="text-secondary truncate block max-w-[150px]">{row.category}</span>
    },
    { header: 'Type', accessor: 'billing' },
    { 
      header: <div className="sort-header" onClick={() => requestSort('cost')}>Cost ({currency}) <ArrowUpDown size={14} /></div>, 
      accessor: 'cost',
      render: (row) => <span className="font-semibold text-emerald-600">{symbol}{convert(row.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    },
    { header: 'Date', accessor: 'renewal' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'danger'}>
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
        <p className="loading-text-modern">Fetching Service Objects</p>
      </div>
    );
  }

  if (error || (webhookResponse && webhookResponse.error)) {
    return (
      <div className="services-container">
        <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-center shadow-sm">
          <AlertCircle className="text-red-500 mr-4" size={32} />
          <p className="text-red-600/80">Failed to render service overview. {error?.message || webhookResponse?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="services-container">
      <Card className="services-card">
        <div className="services-controls">
          <div className="search-wrapper">
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search services or vendors..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-wrapper">
            <Filter size={20} className="filter-icon" />
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto rounded-lg border border-gray-100 w-full mt-4">
          <Table columns={columns} data={sortedAndFilteredData} emptyMessage="No services match your filters." />
        </div>
      </Card>
    </div>
  );
};

export default Services;
