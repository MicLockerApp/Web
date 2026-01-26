import React from 'react';

const VinylLogo = ({ size = 40, spinning = true, className = '' }) => {
  // 33.5 RPM = 1 revolution every 1.791 seconds
  const animationDuration = '1.791s';

  return (
    <img
      src="/miclocker-logo.png"
      alt="MicLocker Logo"
      width={size}
      height={size}
      className={className}
      style={{
        animation: spinning ? `vinyl-spin ${animationDuration} linear infinite` : 'none',
        objectFit: 'contain',
      }}
    />
  );
};

export default VinylLogo;
