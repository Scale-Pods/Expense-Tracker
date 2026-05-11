import React, { useState, useRef, useEffect } from 'react';
import { 
  Pencil, 
  ChevronRight, 
  Image as ImageIcon, 
  Send, 
  X, 
  Check, 
  Loader2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { submitExpense } from '../../utils/api';
import { useAuth } from '../../hooks/AuthContext';
import './QuickAddExpense.css';

const QuickAddExpense = ({ onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', 'warning'
  const [message, setMessage] = useState('');
  const [webhookResult, setWebhookResult] = useState(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const { currentUser } = useAuth();

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // Only collapse if we are not in the middle of an interaction that needs to be visible
        if (status !== 'warning') {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [status]);

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

  const removeImage = (e) => {
    e?.stopPropagation();
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
            setIsExpanded(false);
            setStatus(null);
            setMessage('');
          }, 2000);
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
    e?.preventDefault();
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
        
        const displayMsg = result.message || result.output || (isIncomplete ? 'Incomplete information.' : 'Expense tracked!');
        setMessage(displayMsg);
        setWebhookResult(result);
        
        if (image) removeImage();
        setText('');

        if (!isIncomplete) {
          setWebhookResult(null);
          if (onRefresh) onRefresh();
          setTimeout(() => {
            setIsExpanded(false);
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

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="quick-add-container" ref={containerRef}>
      {/* Collapsed State Bar */}
      <div className="quick-add-bar" onClick={toggleExpand}>
        <div className="bar-icon">
          <Pencil size={16} />
        </div>
        <input 
          type="text" 
          className="bar-input"
          placeholder="e.g., GitHub Copilot $10, AWS $150..."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!isExpanded) setIsExpanded(true);
          }}
          onFocus={() => setIsExpanded(true)}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="bar-divider"></div>
        <button className={`bar-toggle-btn ${isExpanded ? 'expanded' : ''}`}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="quick-add-panel">
          <div className="panel-header">
            <span className="panel-title">Quick Entry</span>
            <span className="panel-subtitle">Track expense via text or image</span>
          </div>

          <form onSubmit={handleSubmit} className="panel-form">
            <div className="panel-textarea-wrapper">
              <textarea
                className="panel-textarea"
                placeholder="e.g., GitHub Copilot $10, AWS Bill $150 or just paste merchant details..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
              
              {preview && (
                <div className="image-preview-mini">
                  <img src={preview} alt="Receipt" />
                  <button type="button" className="remove-img-mini" onClick={removeImage}>
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>

            <div className="panel-actions">
              <button 
                type="button" 
                className="btn-attach"
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
                className="btn-track"
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
            <div className={`panel-status ${status}`}>
              <div className="panel-status-header">
                {status === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{status === 'success' ? 'Success' : status === 'warning' ? 'Information Needed' : 'Error'}</span>
              </div>
              <p>{message}</p>
              
              {status === 'warning' && webhookResult?.missing_fields?.includes('Type') && (
                <div className="quick-options-grid" style={{ marginTop: '10px', paddingLeft: '0' }}>
                  {['Salary', 'One-time', 'Tools', 'Subscriptions', 'Ads', 'Overheads'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleQuickComplete(option)}
                      className="quick-option-btn"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickAddExpense;
