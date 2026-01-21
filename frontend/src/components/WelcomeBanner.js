import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const WelcomeBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    const dismissed = localStorage.getItem('miclocker_welcome_banner_dismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('miclocker_welcome_banner_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div 
      className="w-full py-3 px-4 bg-yellow-500/10 border-b border-yellow-500/20"
      data-testid="welcome-banner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-yellow-400 text-sm md:text-base flex-1 text-center">
          <span className="font-semibold">Hey there!</span> We are a new company that just got up and running. 
          There might be a few bugs that we missed, but we are committed to fixing everything and giving you 
          the best experience possible! If you see something that is out of place or something that doesn&apos;t 
          work properly, please do not hesitate to let us know. Thanks! 
          <span className="font-semibold"> - The MicLocker Team!</span>
        </p>
        <button
          onClick={handleDismiss}
          className="text-yellow-400 hover:text-yellow-300 transition-colors p-1 flex-shrink-0"
          aria-label="Dismiss banner"
          data-testid="dismiss-banner-btn"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default WelcomeBanner;
