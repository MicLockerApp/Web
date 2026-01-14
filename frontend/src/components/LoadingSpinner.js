import React from 'react';
import VinylLogo from './VinylLogo';

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizes = {
    sm: 24,
    md: 48,
    lg: 80,
  };

  return (
    <div className="flex flex-col items-center justify-center py-12" data-testid="loading-spinner">
      <VinylLogo size={sizes[size]} spinning={true} />
      {text && <p className="text-gray-400 mt-4">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
