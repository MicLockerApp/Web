import React from 'react';

const VinylLogo = ({ size = 40, spinning = true, className = '' }) => {
  // 33.5 RPM = 1 revolution every 1.791 seconds
  const animationDuration = '1.791s';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{
        animation: spinning ? `vinyl-spin ${animationDuration} linear infinite` : 'none',
      }}
    >
      {/* Outer ring */}
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="#0A0A0A"
        stroke="#FACC15"
        strokeWidth="2"
      />
      
      {/* Grooves - multiple rings */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="#1A1A1A" strokeWidth="1" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#222" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#1A1A1A" strokeWidth="1" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="#222" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#1A1A1A" strokeWidth="1" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="#222" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="#1A1A1A" strokeWidth="1" />
      
      {/* Label area */}
      <circle cx="50" cy="50" r="16" fill="#FACC15" />
      
      {/* Center hole */}
      <circle cx="50" cy="50" r="4" fill="#0A0A0A" />
      
      {/* Label text */}
      <text
        x="50"
        y="47"
        textAnchor="middle"
        fontSize="6"
        fontWeight="bold"
        fill="#0A0A0A"
      >
        MIC
      </text>
      <text
        x="50"
        y="55"
        textAnchor="middle"
        fontSize="5"
        fontWeight="bold"
        fill="#0A0A0A"
      >
        LOCKER
      </text>
      
      {/* Shine effect */}
      <ellipse
        cx="35"
        cy="35"
        rx="15"
        ry="8"
        fill="white"
        opacity="0.1"
        transform="rotate(-45, 35, 35)"
      />
    </svg>
  );
};

export default VinylLogo;
