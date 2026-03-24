import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  CreditCard, 
  PieChart, 
  FileText, 
  Settings, 
  Database, 
  Bell,
  ChevronDown,
  ChevronUp,
  LogOut,
  KeyRound
} from 'lucide-react';

import Logo from '../common/Logo';
import { useAuth } from '../../hooks/AuthContext';
import '../../styles/sidebar.css';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    location.pathname === '/webhook' || location.pathname === '/settings'
  );

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Reminders', path: '/reminders', icon: <Bell size={20} /> },
    { name: 'Monthly Payments', path: '/monthly', icon: <Calendar size={20} /> },
    { name: 'Category Analysis', path: '/categories', icon: <PieChart size={20} /> },
    { name: 'Reports', path: '/reports', icon: <FileText size={20} /> },
  ];

  const handleSettingsToggle = (e) => {
    e.preventDefault();
    setIsSettingsOpen(!isSettingsOpen);
  };

  const [showMobileLogout, setShowMobileLogout] = useState(false);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <NavLink to="/" className="logo-link" onClick={closeSidebar}>
          <Logo className="sidebar-logo" />
        </NavLink>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}

        <div className={`nav-group ${isSettingsOpen ? 'open' : ''}`}>
          <button 
            className={`nav-item settings-item ${isSettingsOpen ? 'active' : ''}`} 
            onClick={handleSettingsToggle}
          >
            <Settings size={20} />
            <span>Settings</span>
            <div className="chevron">
              {isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>
          
          {isSettingsOpen && (
            <div className="sub-nav">
              <NavLink 
                to="/settings"
                className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <KeyRound size={18} />
                <span>Account & Password</span>
              </NavLink>
              <NavLink 
                to="/webhook"
                className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <Database size={18} />
                <span>Webhook Data</span>
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button 
          className={`user-profile-logout ${showMobileLogout ? 'show-logout' : ''}`} 
          onClick={(e) => {
            if (window.innerWidth <= 1024 && !showMobileLogout) {
              e.preventDefault();
              setShowMobileLogout(true);
            } else {
              logout();
            }
          }}
          onMouseLeave={() => setShowMobileLogout(false)}
          title="Sign out"
        >
          <div className="profile-content">
            <div className="avatar">
              {currentUser?.initials || currentUser?.username?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <p className="user-name">{currentUser?.username}</p>
              <p className="user-role">{currentUser?.email || 'User'}</p>
            </div>
          </div>
          <div className="logout-content">
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
