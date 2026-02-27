import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import './styles/global.css';

import Overview from './pages/Overview';
import MonthlyPayments from './pages/MonthlyPayments';
import CategoryAnalysis from './pages/CategoryAnalysis';
import Reports from './pages/Reports';
import WebhookData from './pages/WebhookData';
import Reminders from './pages/Reminders';
import Settings from './pages/Settings';
import Login from './pages/Login';

import { useAuth } from './hooks/AuthContext';

function ProtectedRoute({ children }) {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return null; // Brief while restoring session
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return null;
  if (currentUser) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public: Login */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected: Dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="monthly" element={<MonthlyPayments />} />
          <Route path="categories" element={<CategoryAnalysis />} />
          <Route path="reports" element={<Reports />} />
          <Route path="webhook" element={<WebhookData />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
