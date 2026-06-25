import React, { useState } from 'react';
import { Send, Sparkles, Loader2, X, ArrowLeft } from 'lucide-react';
import '../../styles/email-dialog.css';

const PROFORMA_BODY = `Hi,

I hope you're doing well.

Please find attached the proforma invoice for the proposed services from ScalePods LLP.

This invoice is shared for your review and approval. Kindly proceed with the payment to initiate the engagement.

Bank details for remittance are mentioned in the invoice. If you have any questions or require any modifications, please feel free to reach out.

We look forward to working with you.

Warm regards,
ScalePods LLP`;

const TAX_BODY = `Hi,

We hope you're doing well.

Please find attached the tax invoice for the services rendered by ScalePods LLP.

This invoice is being shared for your records and accounting purposes against the completed payment and engagement. We sincerely appreciate the opportunity to work with your team and thank you for your trust in our services.

Should you require any additional documentation, payment acknowledgements, or clarification regarding the invoice, please feel free to reach out. Our team will be happy to assist.

We look forward to continuing our partnership and supporting your business with future initiatives.

Warm Regards,
ScalePods LLP`;

const getDefaultBody = (invoiceData) => {
  return (invoiceData?.type || '').toLowerCase() === 'tax' ? TAX_BODY : PROFORMA_BODY;
};

const getDefaultSubject = (invoiceData) => {
  const firstItem = invoiceData?.items?.[0]?.description;
  const serviceName = firstItem || 'Proposed Services';
  const prefix = (invoiceData?.type || '').toLowerCase() === 'tax' ? 'Tax' : 'Proforma';
  return `${prefix} Invoice for ${serviceName} - ScalePods`;
};

const EmailDialog = ({ isOpen, onClose, onSend, invoiceData, isSending }) => {
  const [emailSubject, setEmailSubject] = useState(getDefaultSubject(invoiceData));
  const [emailBody, setEmailBody] = useState(getDefaultBody(invoiceData));
  const [requirements, setRequirements] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setEmailSubject(getDefaultSubject(invoiceData));
      setEmailBody(getDefaultBody(invoiceData));
      setRequirements('');
      setShowAiInput(false);
    }
  }, [isOpen]);

  const handleAskAi = async () => {
    if (!requirements.trim()) return;
    setIsGeneratingAi(true);
    try {
      const clientName = invoiceData?.name?.split('\n')[0] || 'Client';
      const payload = {
        requirements: requirements.trim(),
        invoiceData: {
          clientName,
          type: invoiceData?.type || 'Proforma',
          region: invoiceData?.region || 'India',
          amount: invoiceData?.amount || '',
          currency: invoiceData?.currency || 'INR',
          items: invoiceData?.items || [],
        }
      };
      const response = await fetch(`${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_WEBHOOK_ID_EMAIL_AI}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('AI generation failed');
      const raw = await response.json();
      const outputStr = raw?.data?.[0]?.output || raw?.[0]?.data?.[0]?.output;
      const parsed = outputStr ? JSON.parse(outputStr) : raw;
      if (parsed.subject) setEmailSubject(parsed.subject);
      setEmailBody(parsed.body || parsed.message || parsed.emailBody || JSON.stringify(parsed));
    } catch (err) {
      console.error('AI generation error:', err);
      alert('Failed to generate email body. Please try again.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSend = () => {
    onSend({ subject: emailSubject, body: emailBody });
  };

  if (!isOpen) return null;

  return (
    <div className="email-dialog-overlay" onClick={onClose}>
      <div className="email-dialog" onClick={e => e.stopPropagation()}>
        <div className="email-dialog-header">
          <div className="email-dialog-header-left">
            <Send size={18} />
            <h3>Send Invoice</h3>
          </div>
          <button className="email-dialog-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="email-dialog-body">
          <div className="email-field">
            <label>Subject</label>
            <input
              type="text"
              className="email-subject-input"
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>
          <div className="email-field">
            <label>Email Body</label>
            <textarea
              className="email-body-textarea"
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              rows={14}
            />
          </div>

          <div className={`email-ai-section ${showAiInput ? 'expanded' : ''}`}>
            {!showAiInput ? (
              <button className="email-ai-trigger" onClick={() => setShowAiInput(true)}>
                <Sparkles size={16} />
                <span>Ask AI</span>
              </button>
            ) : (
              <>
                <div className="email-ai-header">
                  <Sparkles size={16} />
                  <span>Custom Requirements</span>
                  <button className="email-ai-collapse" onClick={() => setShowAiInput(false)} title="Collapse">
                    <X size={16} />
                  </button>
                </div>
                <p className="email-ai-hint">
                  Describe any customizations you want in the email body, then click Generate.
                </p>
                <textarea
                  className="email-requirements-input"
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                  placeholder="E.g. Mention the project deadline, add a discount note, change the tone to urgent..."
                  rows={3}
                  autoFocus
                />
                <div className="email-ai-actions">
                  <button className="email-ai-btn secondary" onClick={() => setShowAiInput(false)}>
                    Cancel
                  </button>
                  <button
                    className="email-ai-btn"
                    onClick={handleAskAi}
                    disabled={isGeneratingAi || !requirements.trim()}
                  >
                    {isGeneratingAi ? (
                      <><Loader2 className="animate-spin" size={16} /> Generating...</>
                    ) : (
                      <><Sparkles size={16} /> Generate</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="email-dialog-footer">
          <button className="email-btn secondary" onClick={onClose}>
            <ArrowLeft size={16} />
            <span>Cancel</span>
          </button>
          <button
            className="email-btn primary"
            onClick={handleSend}
            disabled={isSending || !emailBody.trim()}
          >
            {isSending ? (
              <><Loader2 className="animate-spin" size={18} /> Sending...</>
            ) : (
              <><Send size={18} /> Send Invoice</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailDialog;
