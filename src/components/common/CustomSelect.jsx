import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import '../../styles/custom-select.css';

const CustomSelect = ({ label, value, onChange, options, placeholder = "Select...", minWidth = "160px" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Close on Escape key
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value) || { label: placeholder, value: '' };

  return (
    <div className={`premium-select-container ${isOpen ? 'active-dropdown' : ''}`} ref={dropdownRef} style={{ minWidth }}>
      <button 
        type="button"
        className={`premium-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="premium-select-trigger-content">
          {label && <span className="premium-select-label">{label}</span>}
          <span className="premium-select-value">{selectedOption.label}</span>
        </div>
        <ChevronDown size={14} className={`premium-select-chevron ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen && (
        <div className="premium-select-dropdown">
          <ul className="premium-select-list">
            {options.map((option) => (
              <li 
                key={option.value}
                className={`premium-select-item ${option.value === value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={14} className="check-icon" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
