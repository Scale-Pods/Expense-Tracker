import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../../hooks/ThemeContext';
import { useAuth } from '../../hooks/AuthContext';
import '../../styles/topbar.css';

import { useCurrency } from '../../hooks/CurrencyContext';

const Topbar = ({ toggleSidebar }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const { currency, toggleCurrency } = useCurrency();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/': return `${getGreeting()}, ${currentUser?.username?.split(' ')[0] || 'User'} 👋`;
      case '/reminders': return 'Action Center & Reminders';
      case '/monthly': return 'Monthly Payments';
      case '/services': return 'Services & Vendors';
      case '/categories': return 'Category Analysis';
      case '/reports': return 'Reports';
      case '/webhook': return 'Webhook Data';
      default: return 'Expense Tracker';
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Open Menu">
          <Menu size={24} />
        </button>
        <h2 className="page-title">{getPageTitle(location.pathname)}</h2>
      </div>
      <div className="topbar-actions">
        <div className="currency-selector-modular">
          <button 
            onClick={() => currency !== 'INR' && toggleCurrency()} 
            className={`currency-opt ${currency === 'INR' ? 'active' : ''}`}
          >
            ₹ INR
          </button>
          <button 
            onClick={() => currency !== 'USD' && toggleCurrency()} 
            className={`currency-opt ${currency === 'USD' ? 'active' : ''}`}
          >
            $ USD
          </button>
        </div>
        <button onClick={toggleTheme} className="theme-toggle" title="Toggle Light/Dark Mode">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <span className="date-display">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </header>
  );
};

export default Topbar;
