import React, { useState } from 'react';
import { Send, Globe, Building2, Calendar, Mail, FileText, FileCheck, Trash2, Plus, ListOrdered } from 'lucide-react';
import '../../styles/invoice-form.css';
import BillingQueue from './BillingQueue';

const InvoiceForm = ({ onGenerate, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'queue'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Proforma', // 'Proforma' or 'Tax'
    region: 'India', // 'India' or 'UAE'
    name: '',
    currency: 'INR',
    amount: '',
    amountPaid: '0',
    dueAmount: '',
    items: [{ description: '', amount: '' }],
    dueDate: '',
    invoiceDate: '',
    email: '',
    terms: '1. Currency & Charges: Payments must be made in the currency mentioned. Any additional bank charges, conversion fees, or transaction fees are to be borne by the client.\n2. Scope of Work: The services covered under this invoice are as per the agreed discussion.\n3. Non-Refundable: Payments made are non-refundable unless otherwise agreed in writing.\n4. Confidentiality: Both parties agree to maintain the confidentiality of any business or project-related information shared during the engagement.\n5. Intellectual Property: All deliverables and work products remain the property of ScalePods LLP until full payment is received.\n6. Termination: Engagement can be terminated based on terms mentioned in the Service Level Agreement (SLA).\n7. Support: For any queries regarding this invoice, please contact info@scalepods.co',
    accHolder: 'SCALEPODS LLP',
    bankName: 'HDFC Bank Ltd',
    accNo: '50200119456950',
    ifsc: 'HDFC0000060',
    branch: 'FORT',
    accType: 'Current Account',
    myGstin: '27AALFS4567J1Z3',
    clientGstin: '',
    clientState: 'Maharashtra',
    amountInWords: '',
    originalDetails: null
  });

  React.useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onGenerate(formData);
    setIsSubmitting(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'amountPaid') {
      const total = Number(formData.amount) || 0;
      const paid = Number(value) || 0;
      setFormData(prev => ({ 
        ...prev, 
        amountPaid: value,
        dueAmount: (total - paid).toString()
      }));
    } else if (name === 'dueAmount') {
      const total = Number(formData.amount) || 0;
      const due = Number(value) || 0;
      setFormData(prev => ({ 
        ...prev, 
        dueAmount: value,
        amountPaid: (total - due).toString()
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', amount: '' }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  React.useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const paid = Number(formData.amountPaid) || 0;
    const due = total - paid;
    
    setFormData(prev => ({ 
      ...prev, 
      amount: total.toString(),
      dueAmount: due.toString()
    }));
  }, [formData.items]);

  React.useEffect(() => {
    // Only auto-update currency if it's currently a default one that doesn't match the region
    if (formData.region === 'UAE' && formData.currency === 'INR') {
      setFormData(prev => ({ ...prev, currency: 'AED' }));
    } else if (formData.region === 'India' && formData.currency === 'AED') {
      setFormData(prev => ({ ...prev, currency: 'INR' }));
    }
  }, [formData.region]);

  // Convert DD/MM/YYYY to YYYY-MM-DD for HTML date inputs
  const convertDate = (dateStr) => {
    if (!dateStr) return '';
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  // Handle client selection from BillingQueue
  const handleClientSelect = (clientData, queueType) => {
    const rawCurrency = (clientData['Currency'] || 'INR').toString().toUpperCase().trim();
    // Normalize currency to supported values
    let currency = 'INR';
    if (rawCurrency.includes('AED')) currency = 'AED';
    else if (rawCurrency.includes('USD')) currency = 'USD';
    else currency = 'INR';

    const region = currency === 'AED' ? 'UAE' : 'India';
    
    const incomeAmount = Number(clientData['Income Amount']) || 0;
    const receivables = Number(clientData['Receivables']) || 0;
    const realisedRevenue = Number(clientData['Realised Revenue']) || 0;
    const service = clientData['Service'] || '';

    setFormData(prev => ({
      ...prev,
      type: queueType === 'tax' ? 'Tax' : 'Proforma',
      region: region,
      name: clientData['Client Name'] || '',
      email: clientData['Client Email'] || '',
      currency: currency,
      items: [{ description: service, amount: incomeAmount.toString() }],
      amount: incomeAmount.toString(),
      amountPaid: realisedRevenue.toString(),
      dueAmount: receivables.toString(),
      invoiceDate: convertDate(clientData['Date'] || clientData['Realised Date']),
      dueDate: convertDate(clientData['Receivables Date']),
      clientGstin: '',
      clientState: region === 'India' ? (clientData['Client State'] || 'Maharashtra') : '',
      amountInWords: '',
      originalDetails: clientData
    }));

    setActiveTab('create');
  };

  return (
    <div className="invoice-form-container glass-panel">
      <div className="form-header-with-toggle">
        <div className="form-header">
          <h3>{activeTab === 'create' ? 'Create New Invoice' : 'Billing Queue'}</h3>
          <p>{activeTab === 'create' ? 'Enter details to generate document' : 'Manage your pending invoice requests'}</p>
        </div>
        
        <div className={`view-toggle-slider ${activeTab}`}>
          <button 
            type="button" 
            className={activeTab === 'create' ? 'active' : ''}
            onClick={() => setActiveTab('create')}
            title="Create Mode"
          >
            <Plus size={16} />
          </button>
          <button 
            type="button" 
            className={activeTab === 'queue' ? 'active' : ''}
            onClick={() => setActiveTab('queue')}
            title="Queue Mode"
          >
            <ListOrdered size={16} />
          </button>
          <div className="toggle-thumb"></div>
        </div>
      </div>

      {activeTab === 'create' ? (
        <form onSubmit={handleSubmit} className="invoice-form inline">
        <div className="form-section compact">
          <div className="section-title">
            <FileCheck size={18} />
            <span>Invoice Type</span>
          </div>
          <div className={`region-slider type-slider ${formData.type}`}>
            <button 
              type="button" 
              className={formData.type === 'Proforma' ? 'active' : ''}
              onClick={() => setFormData(prev => ({ ...prev, type: 'Proforma' }))}
            >
              Proforma
            </button>
            <button 
              type="button" 
              className={formData.type === 'Tax' ? 'active' : ''}
              onClick={() => setFormData(prev => ({ ...prev, type: 'Tax' }))}
            >
              Tax
            </button>
            <div className="slider-thumb"></div>
          </div>
        </div>

        <div className="form-section compact">
          <div className="section-title">
            <Globe size={18} />
            <span>Region</span>
          </div>
          <div className={`region-slider ${formData.region}`}>
            <button 
              type="button" 
              className={formData.region === 'India' ? 'active' : ''}
              onClick={() => setFormData(prev => ({ ...prev, region: 'India' }))}
            >
              India
            </button>
            <button 
              type="button" 
              className={formData.region === 'UAE' ? 'active' : ''}
              onClick={() => setFormData(prev => ({ ...prev, region: 'UAE' }))}
            >
              UAE
            </button>
            <div className="slider-thumb"></div>
          </div>
        </div>

        <div className="form-grid-vertical">
          <div className="form-row-flex">
            <div className="form-group flex-1">
              <label><Building2 size={16} /> Client Name</label>
              <input 
                type="text" 
                name="name" 
                placeholder="Acme Corp" 
                value={formData.name}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group flex-1">
              <label><Mail size={16} /> Client Email</label>
              <input 
                type="email" 
                name="email" 
                placeholder="billing@acme.com" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </div>
          </div>

          <div className="form-row-flex">
            <div className="form-group flex-1">
              <label><FileCheck size={16} /> Client {formData.region === 'India' ? 'GSTIN' : 'TRN'}</label>
              <input 
                type="text" 
                name="clientGstin" 
                placeholder={formData.region === 'India' ? "27XXXXXXXXXXXXZ" : "100XXXXXXXXXXXX"} 
                value={formData.clientGstin}
                onChange={handleChange}
              />
            </div>
            {formData.region === 'India' && (
              <div className="form-group flex-1">
                <label><Globe size={16} /> Client State</label>
                <input 
                  type="text" 
                  name="clientState" 
                  placeholder="Maharashtra" 
                  value={formData.clientState}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          <div className="form-section">
          <div className="section-title">
            <FileText size={18} />
            <span>Line Items</span>
          </div>
          <div className="form-grid-vertical">
            {formData.items.map((item, index) => (
              <div key={index} className="form-item-row">
                <div className="form-group flex-2">
                  <input 
                    type="text" 
                    placeholder="Description" 
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group flex-1">
                  <input 
                    type="number" 
                    placeholder="Cost" 
                    value={item.amount}
                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                    required 
                  />
                </div>
                {formData.items.length > 1 && (
                  <button type="button" className="icon-btn-danger" onClick={() => removeItem(index)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-add-item" onClick={addItem}>
              <Plus size={16} />
              <span>Add Item</span>
            </button>
          </div>
        </div>

          <div className="form-row-flex">
            <div className="form-group flex-1">
              <label>Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>
            <div className="form-group flex-1">
              <label>Total</label>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} readOnly />
            </div>
          </div>

          {formData.type !== 'Tax' && (
            <div className="form-row-flex">
              <div className="form-group flex-1">
                <label>Paid</label>
                <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} placeholder="0" />
              </div>
              <div className="form-group flex-1">
                <label>Due</label>
                <input type="number" name="dueAmount" value={formData.dueAmount} onChange={handleChange} />
              </div>
            </div>
          )}

          <div className="form-row-flex">
            <div className="form-group flex-1">
              <label><Calendar size={16} /> Date</label>
              <input 
                type="date" 
                name="invoiceDate" 
                value={formData.invoiceDate}
                onChange={handleChange}
                required 
              />
            </div>
            {formData.type !== 'Tax' && (
              <div className="form-group flex-1">
                <label><Calendar size={16} /> Due</label>
                <input 
                  type="date" 
                  name="dueDate" 
                  value={formData.dueDate}
                  onChange={handleChange}
                  required 
                />
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="section-title">
              <Building2 size={18} />
              <span>Bank Details</span>
            </div>
            <div className="form-grid-vertical">
              <div className="form-row-flex">
                <div className="form-group flex-1">
                  <label>Account Holder</label>
                  <input type="text" name="accHolder" value={formData.accHolder} onChange={handleChange} />
                </div>
                <div className="form-group flex-1">
                  <label>Account Number</label>
                  <input type="text" name="accNo" value={formData.accNo} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row-flex">
                <div className="form-group flex-1">
                  <label>Bank Name</label>
                  <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} />
                </div>
                <div className="form-group flex-1">
                  <label>Account Type</label>
                  <input type="text" name="accType" value={formData.accType} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row-flex">
                <div className="form-group flex-1">
                  <label>IFSC Code</label>
                  <input type="text" name="ifsc" value={formData.ifsc} onChange={handleChange} />
                </div>
                <div className="form-group flex-1">
                  <label>Branch</label>
                  <input type="text" name="branch" value={formData.branch} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label><FileCheck size={16} /> My {formData.region === 'India' ? 'GSTIN' : 'TRN'}</label>
                <input type="text" name="myGstin" value={formData.myGstin} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label><FileText size={16} /> Amount in Words</label>
            <input 
              type="text" 
              name="amountInWords" 
              placeholder={formData.region === 'India' ? "Rupees Five Thousand Only" : "Five Thousand Dirhams Only"} 
              value={formData.amountInWords}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>T&C</label>
            <textarea 
              name="terms" 
              rows="6" 
              placeholder="Terms..."
              value={formData.terms}
              onChange={handleChange}
            ></textarea>
          </div>
          
          <button type="submit" className="btn-submit full-width">
            <Send size={18} />
            <span>Generate {formData.type} Invoice</span>
          </button>
        </div>
      </form>
      ) : (
        <BillingQueue onSelectClient={handleClientSelect} />
      )}
    </div>
  );
};

export default InvoiceForm;
