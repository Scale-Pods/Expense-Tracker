import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle } from 'lucide-react';

/**
 * ConfirmationPortal — renders at document.body via React Portal.
 * Completely isolated from the Reminders page render cycle.
 * Props:
 *   title: string
 *   message: string
 *   countdownSeconds: number  (default 3)
 *   onClose(): called when user clicks OK after countdown
 */
const ConfirmationPortal = ({ title, message, countdownSeconds = 3, onClose }) => {
  const [remaining, setRemaining] = useState(countdownSeconds);

  useEffect(() => {
    setRemaining(countdownSeconds);
  }, [countdownSeconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const ready = remaining <= 0;

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
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
          color: '#10b981',
        }}>
          <CheckCircle size={38} />
        </div>

        <h2 style={{
          margin: '0 0 0.5rem',
          fontSize: '1.25rem',
          fontWeight: 800,
          color: 'var(--color-text-main, #f1f5f9)',
        }}>
          {title}
        </h2>

        <p style={{
          margin: '0 0 1.75rem',
          fontSize: '0.875rem',
          color: 'var(--color-text-muted, #94a3b8)',
          lineHeight: 1.6,
        }}>
          {message}
        </p>

        {/* Countdown ring */}
        {!ready && (
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted, #94a3b8)',
            marginBottom: '1rem',
          }}>
            Waiting for automation to process… ({remaining}s)
          </p>
        )}

        <button
          onClick={ready ? onClose : undefined}
          disabled={!ready}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: 700,
            border: 'none',
            cursor: ready ? 'pointer' : 'not-allowed',
            background: ready
              ? 'var(--color-primary, #00E5CC)'
              : 'rgba(255,255,255,0.08)',
            color: ready ? '#000' : 'var(--color-text-muted, #94a3b8)',
            transition: 'all 0.3s ease',
          }}
        >
          {ready ? '✓ OK — Sync Data' : `OK (${remaining}s)`}
        </button>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default ConfirmationPortal;
