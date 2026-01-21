import React from 'react';

/**
 * Gold Member Badge - Displayed next to usernames for first 300 users
 * Styled like Twitter/X verified checkmark - a circular gold badge with crown icon
 */
const GoldMemberBadge = ({ size = 'sm', showTooltip = true, className = '' }) => {
  const sizeConfig = {
    xs: { container: 'w-4 h-4', icon: 'text-[8px]' },
    sm: { container: 'w-5 h-5', icon: 'text-[10px]' },
    md: { container: 'w-6 h-6', icon: 'text-xs' },
    lg: { container: 'w-7 h-7', icon: 'text-sm' }
  };

  const config = sizeConfig[size] || sizeConfig.sm;

  return (
    <span 
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 ${config.container} ${className}`}
      title={showTooltip ? "Gold Member - One of the first 300 members" : undefined}
      data-testid="gold-member-badge"
    >
      <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={`text-white ${config.icon}`}
        style={{ width: '65%', height: '65%' }}
      >
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    </span>
  );
};

export default GoldMemberBadge;
