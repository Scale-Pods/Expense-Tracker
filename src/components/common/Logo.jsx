import React from 'react';
import { useTheme } from '../../hooks/ThemeContext';

const Logo = ({ className, forceColor }) => {
  const { theme } = useTheme();
  
  // The provided image is likely white text/graphics. 
  // If we are in light mode and NOT explicitly forcing a color (like on the login screen), 
  // we invert the image so it becomes black/dark and visible on the light sidebar.
  const shouldInvert = !forceColor && theme === 'light';

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src="https://framerusercontent.com/images/sTvMZBHEzwH4fTjPgKO2PS3htho.png?scale-down-to=2048&width=2363&height=2363" 
        alt="ScalePods"
        style={{ 
          height: '100%',
          width: '100%', 
          objectFit: 'contain',
          transform: 'scale(2.8)',
          filter: shouldInvert ? 'invert(1) hue-rotate(180deg) brightness(0.2)' : 'none',
          transition: 'filter 0.3s ease'
        }}
      />
    </div>
  );
};

export default Logo;
