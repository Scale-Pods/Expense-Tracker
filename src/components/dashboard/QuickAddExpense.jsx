import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Check, Loader2, AlertCircle } from 'lucide-react';
import Card from '../common/Card';
import { submitExpense } from '../../utils/api';
import { useAuth } from '../../hooks/AuthContext';
import './QuickAddExpense.css';

const QuickAddExpense = ({ onRefresh }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error'
  const [message, setMessage] = useState('');
  const [webhookResult, setWebhookResult] = useState(null);
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStatus('error');
        setMessage('Image size should be less than 5MB');
        return;
      }
      
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuickComplete = async (option) => {
    setIsSubmitting(true);
    setStatus(null);
    try {
      const result = await submitExpense(`Type: ${option}`, null, currentUser?.email || '');
      if (result.error) {
        setStatus('error');
        setMessage(result.message || 'Quick complete failed.');
      } else {
        const isIncomplete = result.status === 'incomplete' || result.needs_input;
        setStatus(isIncomplete ? 'warning' : 'success');
        setMessage(result.message || result.output || 'Expense completed!');
        setWebhookResult(result);
        
        if (!isIncomplete) {
          setWebhookResult(null);
          if (onRefresh) onRefresh();
        }
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred during quick completion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text && !image) return;

    setIsSubmitting(true);
    setStatus(null);
    
    try {
      const result = await submitExpense(text, image, currentUser?.email || '');
      
      if (result.error) {
        setStatus('error');
        setMessage(result.message || 'Submission failed');
      } else {
        // Detect if the result indicates incomplete information
        const isIncomplete = result.status === 'incomplete' || result.needs_input;
        setStatus(isIncomplete ? 'warning' : 'success');
        
        // Use the dynamic message from the webhook node
        const displayMsg = result.message || result.output || (isIncomplete ? 'Incomplete information.' : 'Expense tracked!');
        setMessage(displayMsg);
        setWebhookResult(result);
        
        // Always clear image and text after a successful upload to prevent re-sending the same data
        if (image) {
          removeImage();
        }
        setText('');

        // If it was a full success, complete the cycle.
        // For 'incomplete' results, we keep status/message so the user can see what's missing.
        if (!isIncomplete) {
          setWebhookResult(null);
          if (onRefresh) onRefresh();
        }
        
        // Status remains visible until manually dismissed
      }
    } catch {
      setStatus('error');
      setMessage('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="quick-add-card">
      <div className="quick-add-header">
        <h3 className="quick-add-title">Quick Entry</h3>
        <span className="quick-add-subtitle">Track expense via text or image</span>
      </div>
      
      <form onSubmit={handleSubmit} className="quick-add-form">
        <div className="input-container">
          {!preview && (
            <textarea
              placeholder="e.g., GitHub Copilot $10, AWS Bill $150 or just paste merchant details..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSubmitting}
              className="quick-add-textarea"
            />
          )}
          
          {preview && (
            <div className="image-preview-container">
              <img src={preview} alt="Receipt preview" className="image-preview" />
              <button 
                type="button" 
                onClick={removeImage}
                className="remove-image-btn"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="quick-add-actions">
          <div className="attachment-actions">
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              disabled={isSubmitting}
              className={`action-btn attachment-btn ${image ? 'active' : ''}`}
              title="Add image/receipt"
            >
              <ImageIcon size={20} />
              <span>{image ? 'Image Attached' : 'Attach Receipt'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!text && !image)}
            className="submit-btn"
          >
            {isSubmitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : status === 'success' ? (
              <Check size={20} />
            ) : (
              <Send size={20} />
            )}
            <span>Track Expense</span>
          </button>
        </div>

        {status && (
          <div className={`status-message-container ${status}`}>
            <div className="status-message-header">
              {status === 'error' || status === 'warning' ? <AlertCircle size={20} /> : <Check size={20} />}
              <span className="status-title">
                {status === 'success' ? 'Processing Complete' : status === 'warning' ? 'Information Needed' : 'Submission Error'}
              </span>
            </div>
            
            <div className="status-content-wrapper">
              {message && message.split('\n').filter(l => l.trim()).filter(l => !l.toLowerCase().includes('if any details are incorrect')).map((line, idx) => {
                const isBullet = line.trim().startsWith('•') || line.trim().startsWith('*') || line.trim().startsWith('-');
                const cleanLine = isBullet ? line.trim().substring(1).trim() : line.trim();
                
                if (isBullet) {
                  const colonIndex = cleanLine.indexOf(':');
                  if (colonIndex !== -1) {
                    const key = cleanLine.substring(0, colonIndex).trim();
                    const value = cleanLine.substring(colonIndex + 1).trim();
                    return (
                      <div key={idx} className="status-detail-row">
                        <span className="detail-label">{key}</span>
                        <span className="detail-value">{value}</span>
                      </div>
                    );
                  }
                  return <div key={idx} className="status-detail-text">{cleanLine}</div>;
                }
                
                return <div key={idx} className={`status-primary-text ${idx === 0 ? 'highlight' : ''}`}>{cleanLine}</div>;
              })}
            </div>

            {status === 'warning' && webhookResult?.missing_fields?.length === 1 && webhookResult?.missing_fields?.includes('Type') && (
              <div className="quick-options-grid">
                {[
                  'Recurring Monthly', 
                  'Recurring Weekly', 
                  'One Time', 
                  'Salaries', 
                  'Commision'
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleQuickComplete(option)}
                    disabled={isSubmitting}
                    className="quick-option-btn"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            <div className="status-actions" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  if (status === 'success' && onRefresh) onRefresh();
                  setStatus(null);
                  setMessage('');
                  setWebhookResult(null);
                }}
                className="submit-btn"
                style={{ padding: '0.5rem 1.5rem' }}
              >
                Okay
              </button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
};

export default QuickAddExpense;
