import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, X, Loader2 } from 'lucide-react';

const WEBHOOK_URL = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_GENERAL}`;

/**
 * AddCardDialog — rendered via React Portal at document.body.
 * Completely independent of the Reminders page render cycle.
 * Props:
 *   onSuccess(displayName: string) — called after card saved successfully
 *   onClose() — called when user dismisses
 */
const AddCardDialog = ({ onSuccess, onClose }) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${WEBHOOK_URL}?action=AddCard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), number: number.trim() }),
      });
      if (res.ok) {
        const displayName = `${name.trim()}${number.trim() ? ` - ${number.trim()}` : ''}`;
        onSuccess(displayName);
      } else {
        setError('Webhook returned an error. Please try again.');
      }
    } catch (err) {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const dialog = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
      }}
    >
      <div
        style={{
          background: 'var(--color-bg-card, #1e293b)',
          border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
          borderRadius: '20px',
          padding: '2rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted, #94a3b8)',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(0, 229, 204, 0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-primary, #00E5CC)',
          }}>
            <CreditCard size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main, #f1f5f9)' }}>
              Add New Card
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted, #94a3b8)' }}>
              Saves to your payment methods
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Card Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '6px',
            }}>
              Card Holder / Bank Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AXIS or HDFC - MITHUN"
              required
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '0.9rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                color: 'var(--color-text-main, #f1f5f9)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Last 4 digits */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '6px',
            }}>
              Last 4 Digits (Optional)
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              maxLength={4}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '0.9rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                color: 'var(--color-text-main, #f1f5f9)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                color: 'var(--color-text-main, #f1f5f9)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                background: saving ? 'rgba(0,229,204,0.5)' : 'var(--color-primary, #00E5CC)',
                border: 'none', color: '#000', cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default AddCardDialog;
