import React from 'react';

const Logo = ({ className = "" }) => {
  const logoUrl = "https://framerusercontent.com/images/sTvMZBHEzwH4fTjPgKO2PS3htho.png?scale-down-to=2048&width=2363&height=2363";
  
  return (
    <div className={`logo-container ${className}`}>
      <img 
        src={logoUrl} 
        alt="ScalePods" 
        style={{ 
          height: '120px', /* Further increased size */
          width: 'auto',
          display: 'block'
        }} 
      />
    </div>
  );
};

export default Logo;
