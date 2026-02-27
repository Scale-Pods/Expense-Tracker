import React from 'react';
import clsx from 'clsx';
import '../../styles/badge.css';

const Badge = ({ children, variant = 'default', className }) => {
  return (
    <span className={clsx('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  );
};

export default Badge;
