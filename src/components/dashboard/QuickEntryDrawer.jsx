import React, { useState, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronLeft,
  Image as ImageIcon, 
  Send, 
  X, 
  Check, 
  Loader2, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { submitExpense } from '../../utils/api';
import { useAuth } from '../../hooks/AuthContext';
import './QuickEntryDrawer.css';

const QuickEntryDrawer = ({ onRefresh, isOpen, setIsOpen }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [webhookResult, setWebhookResult] = useState(null);
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();

  const toggleDrawer = () => setIsOpen(!isOpen);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
          setTimeout(() => {
            setIsOpen(false);
            setStatus(null);
            setMessage('');
          }, 2000);
        }
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred.');
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
        const isIncomplete = result.status === 'incomplete' || result.needs_input;
        setStatus(isIncomplete ? 'warning' : 'success');
        setMessage(result.message || result.output || 'Expense tracked!');
        setWebhookResult(result);
        
        if (image) removeImage();
        setText('');

        if (!isIncomplete) {
          setWebhookResult(null);
          if (onRefresh) onRefresh();
          setTimeout(() => {
            setIsOpen(false);
            setStatus(null);
            setMessage('');
          }, 2000);
        }
      }
    } catch {
      setStatus('error');
      setMessage('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="quick-entry-drawer-container">
      {/* Pinned Toggle Button */}
      <button 
        className={`drawer-toggle-btn ${isOpen ? 'open' : ''}`} 
        onClick={toggleDrawer}
        aria-label="Toggle Quick Entry"
      >
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Overlay */}
      <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)}></div>

      {/* Slide-out Panel */}
      <div className={`drawer-panel ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-header-row">
            <button className="drawer-close-btn" onClick={() => setIsOpen(false)} aria-label="Close">
              <ArrowLeft size={20} />
            </button>
            <div className="drawer-header-text">
              <span className="drawer-title">Quick Entry</span>
              <span className="drawer-subtitle">Track expense via text or image</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="drawer-textarea-wrapper">
            <textarea
              className="drawer-textarea"
              placeholder="e.g., GitHub Copilot $10, AWS Bill $150 or just paste merchant details..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            
            {preview && (
              <div className="image-preview-drawer">
                <img src={preview} alt="Receipt" />
                <button type="button" className="remove-img-drawer" onClick={removeImage}>
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="drawer-actions">
            <button 
              type="button" 
              className="btn-drawer btn-drawer-attach"
              onClick={() => fileInputRef.current.click()}
            >
              <ImageIcon size={18} />
              <span>Attach Receipt</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              style={{ display: 'none' }}
            />

            <button 
              type="submit" 
              className="btn-drawer btn-drawer-track"
              disabled={isSubmitting || (!text && !image)}
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  <span>Track Expense</span>
                </>
              )}
            </button>
          </div>
        </form>

        {status && (
          <div className={`drawer-status ${status}`}>
            <div className="drawer-status-header">
              {status === 'success' ? <Check size={18} /> : 
               status === 'warning' ? <AlertCircle size={18} /> : 
               <X size={18} />}
              <span>{status === 'success' ? 'Success' : status === 'warning' ? 'Details Needed' : 'Error'}</span>
            </div>
            <div className="drawer-status-body">
              {message.split('\n').flatMap((line, i) => {
                if (line.includes('•')) {
                  return line.split('•').filter(p => p.trim()).map((p, idx) => (
                    <p key={`bullet-${i}-${idx}`} className="missing-field-line">• {p.trim()}</p>
                  ));
                }
                return <p key={`line-${i}`}>{line}</p>;
              })}
            </div>
            
            {status === 'warning' && webhookResult?.missing_fields?.includes('Type') && (
              <div className="drawer-options-container">
                <span className="options-label">Select Category:</span>
                <div className="drawer-options-grid">
                  {['Salary', 'One-time', 'Tools', 'Subscriptions', 'Ads', 'Overheads', 'Incentive'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleQuickComplete(option)}
                      className="drawer-option-btn"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickEntryDrawer;
