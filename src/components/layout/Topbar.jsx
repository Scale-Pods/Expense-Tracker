import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../../hooks/ThemeContext';
import { useAuth } from '../../hooks/AuthContext';
import { useCurrency } from '../../hooks/CurrencyContext';
import '../../styles/topbar.css';

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

  const pageTitle = location.pathname === '/' 
    ? `${getGreeting()}, ${currentUser?.username?.split(' ')[0] || 'User'} 👋`
    : location.pathname.slice(1).replace('-', ' ').toUpperCase();

  return (
    <header className="topbar">
      <div className="greeting-section">
        <h2>{pageTitle}</h2>
      </div>
      
      <div className="topbar-actions">
        <button className="action-pill currency-toggle-pill" onClick={toggleCurrency}>
          <span>{currency === 'INR' ? '₹ INR' : '$ USD'}</span>
        </button>
        
        <button onClick={toggleTheme} className="theme-toggle-btn">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        
        <div className="action-pill date-pill">
          <span>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
