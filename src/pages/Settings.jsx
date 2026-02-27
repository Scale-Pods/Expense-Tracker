import React, { useState } from 'react';
import { useAuth } from '../hooks/AuthContext';
import {
  Lock, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle,
  ShieldCheck, LogOut, User
} from 'lucide-react';
import '../styles/settings.css';

export default function Settings() {
  const { currentUser, changePassword, logout } = useAuth();

  /* ---- Change Password State ---- */
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdStatus, setPwdStatus] = useState(null); // { type: 'success'|'error', msg }
  const [isSaving, setIsSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdStatus(null);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdStatus({ type: 'error', msg: 'All fields are required.' });
      return;
    }
    if (newPwd.length < 6) {
      setPwdStatus({ type: 'error', msg: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdStatus({ type: 'error', msg: 'New passwords do not match.' });
      return;
    }
    if (newPwd === currentPwd) {
      setPwdStatus({ type: 'error', msg: 'New password must be different from the current password.' });
      return;
    }

    setIsSaving(true);
    await new Promise(r => setTimeout(r, 500));
    const result = changePassword(currentPwd, newPwd);
    setIsSaving(false);

    if (result.success) {
      setPwdStatus({ type: 'success', msg: 'Password updated successfully!' });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } else {
      setPwdStatus({ type: 'error', msg: result.error });
    }
  };

  /* Strength meter */
  const getStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 0-5
  };

  const strength = getStrength(newPwd);
  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength] || '';
  const strengthClass = ['', 'very-weak', 'weak', 'fair', 'strong', 'very-strong'][strength] || '';

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account and preferences</p>
      </div>

      <div className="settings-grid">

        {/* Account Info Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <User size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Account Information</h2>
              <p className="settings-card-desc">Your current session details</p>
            </div>
          </div>

          <div className="account-info-rows">
            <div className="account-info-row">
              <span className="account-info-label">Username</span>
              <span className="account-info-value account-info-badge">{currentUser?.username}</span>
            </div>
            <div className="account-info-row">
              <span className="account-info-label">Role</span>
              <span className="account-info-value account-role-badge">{currentUser?.role}</span>
            </div>
            <div className="account-info-row">
              <span className="account-info-label">Session</span>
              <span className="account-info-value account-session-badge">
                <span className="session-dot" />
                Active
              </span>
            </div>
          </div>

          <button className="settings-logout-btn" onClick={logout}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Change Password Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Change Password</h2>
              <p className="settings-card-desc">Update your account password</p>
            </div>
          </div>

          <form className="pwd-form" onSubmit={handleChangePassword} noValidate>
            {/* Current Password */}
            <div className="pwd-field">
              <label htmlFor="settings-current-pwd" className="pwd-label">
                <Lock size={13} /> Current Password
              </label>
              <div className="pwd-input-wrap">
                <input
                  id="settings-current-pwd"
                  type={showCurrent ? 'text' : 'password'}
                  className="pwd-input"
                  placeholder="Enter current password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pwd-eye-btn"
                  onClick={() => setShowCurrent(v => !v)}
                  aria-label="Toggle current password visibility"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="pwd-field">
              <label htmlFor="settings-new-pwd" className="pwd-label">
                <KeyRound size={13} /> New Password
              </label>
              <div className="pwd-input-wrap">
                <input
                  id="settings-new-pwd"
                  type={showNew ? 'text' : 'password'}
                  className="pwd-input"
                  placeholder="Enter new password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pwd-eye-btn"
                  onClick={() => setShowNew(v => !v)}
                  aria-label="Toggle new password visibility"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength meter */}
              {newPwd && (
                <div className="strength-meter">
                  <div className="strength-bars">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`strength-bar ${i <= strength ? `filled ${strengthClass}` : ''}`}
                      />
                    ))}
                  </div>
                  <span className={`strength-label ${strengthClass}`}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="pwd-field">
              <label htmlFor="settings-confirm-pwd" className="pwd-label">
                <Lock size={13} /> Confirm New Password
              </label>
              <div className="pwd-input-wrap">
                <input
                  id="settings-confirm-pwd"
                  type={showConfirm ? 'text' : 'password'}
                  className={`pwd-input ${confirmPwd && newPwd && confirmPwd !== newPwd ? 'mismatch' : ''} ${confirmPwd && newPwd && confirmPwd === newPwd ? 'match' : ''}`}
                  placeholder="Confirm new password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pwd-eye-btn"
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Status Message */}
            {pwdStatus && (
              <div className={`pwd-status ${pwdStatus.type}`} role="alert">
                {pwdStatus.type === 'success'
                  ? <CheckCircle2 size={15} />
                  : <AlertCircle size={15} />
                }
                {pwdStatus.msg}
              </div>
            )}

            <button
              type="submit"
              className={`pwd-submit-btn ${isSaving ? 'loading' : ''}`}
              disabled={isSaving}
            >
              {isSaving
                ? <span className="pwd-spinner" />
                : <><ShieldCheck size={16} /> Update Password</>
              }
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
