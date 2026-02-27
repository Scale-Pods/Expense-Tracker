import React from 'react';
import clsx from 'clsx';
import '../../styles/card.css';

const Card = ({ children, className, title, action }) => {
  return (
    <div className={clsx('card', className)}>
      {(title || action) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

export default Card;
