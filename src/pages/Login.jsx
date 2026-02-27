import React, { useState } from 'react';
import { useAuth } from '../hooks/AuthContext';
import Logo from '../components/common/Logo';
import { Eye, EyeOff, LogIn, Lock, Mail } from 'lucide-react';
import '../styles/login.css';

// Map friendly display names → Firebase emails
const NAME_TO_EMAIL = {
  'adnan':  'adnan@scalepods.co',
  'raunak': 'raunak@scalepods.co',
};

function resolveEmail(input) {
  const trimmed = input.trim().toLowerCase();
  // If it looks like an email already, use as-is
  if (trimmed.includes('@')) return trimmed;
  // Otherwise map username → email
  return NAME_TO_EMAIL[trimmed] || `${trimmed}@scalepods.co`;
}

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(''); // username OR email
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      triggerShake();
      return;
    }
    setIsLoading(true);
    const email = resolveEmail(identifier);
    const result = await login(email, password);
    setIsLoading(false);
    if (!result.success) {
      setError(result.error);
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  return (
    <div className="login-screen">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="login-card-header">
          <div className="login-logo-wrap">
            <Logo className="login-logo" />
          </div>
          <p className="login-subtitle">Sign in to your workspace</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="login-identifier" className="login-label">
              <Mail size={14} /> Username or Email
            </label>
            <div className="login-input-wrap">
              <input
                id="login-identifier"
                type="text"
                className="login-input"
                placeholder="e.g. Adnan or adnan@scalepods.com"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password" className="login-label">
              <Lock size={14} /> Password
            </label>
            <div className="login-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`login-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="login-footer-text">
          ScalePods &copy; {new Date().getFullYear()} &mdash; Expense Intelligence
        </p>
      </div>
    </div>
  );
}
