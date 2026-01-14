import React from 'react';
import VinylLogo from './VinylLogo';
import { useTheme } from '../context/ThemeContext';

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const { isDark } = useTheme();
  
  const sizes = {
    sm: 24,
    md: 48,
    lg: 80,
  };

  return (
    <div className="flex flex-col items-center justify-center py-12" data-testid="loading-spinner">
      <VinylLogo size={sizes[size]} spinning={true} />
      {text && <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
