import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Gift, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

// Gift box component with opening animation
const GiftBox = ({ isOpening, onAnimationComplete }) => {
  const [phase, setPhase] = useState('closed'); // closed, opening, open, celebration
  const timersRef = useRef([]);

  useEffect(() => {
    // Clear previous timers
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    if (isOpening) {
      // Start opening sequence
      timersRef.current.push(setTimeout(() => setPhase('opening'), 100));
      timersRef.current.push(setTimeout(() => setPhase('open'), 800));
      timersRef.current.push(setTimeout(() => {
        setPhase('celebration');
        onAnimationComplete?.();
      }, 1200));
    } else {
      setPhase('closed');
    }
    
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, [isOpening, onAnimationComplete]);

  return (
    <div className="relative w-32 h-32 mx-auto mb-6">
      {/* Gift box base */}
      <div 
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-16 bg-gradient-to-b from-primary to-yellow-600 rounded-lg shadow-lg transition-transform duration-500 ${
          phase === 'celebration' ? 'scale-110' : ''
        }`}
      >
        {/* Ribbon vertical */}
        <div className="absolute left-1/2 -translate-x-1/2 w-4 h-full bg-red-500" />
        {/* Ribbon horizontal */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-4 bg-red-500" />
      </div>
      
      {/* Gift box lid */}
      <div 
        className={`absolute bottom-12 left-1/2 -translate-x-1/2 w-28 h-8 bg-gradient-to-b from-yellow-400 to-primary rounded-t-lg shadow-lg transition-all duration-700 origin-bottom ${
          phase === 'opening' ? '-rotate-45 -translate-y-4' : ''
        } ${
          phase === 'open' || phase === 'celebration' ? '-rotate-90 -translate-y-8 opacity-80' : ''
        }`}
      >
        {/* Ribbon bow */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex">
          <div className="w-4 h-4 bg-red-500 rounded-full -mr-1" />
          <div className="w-4 h-4 bg-red-500 rounded-full -ml-1" />
        </div>
        {/* Ribbon on lid */}
        <div className="absolute left-1/2 -translate-x-1/2 w-4 h-full bg-red-500" />
      </div>

      {/* Sparkles coming out when opened */}
      {(phase === 'open' || phase === 'celebration') && (
        <>
          <Sparkles className="absolute top-0 left-8 w-6 h-6 text-yellow-300 animate-bounce" style={{ animationDelay: '0ms' }} />
          <Sparkles className="absolute top-2 right-8 w-5 h-5 text-yellow-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <Sparkles className="absolute top-4 left-4 w-4 h-4 text-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          <Sparkles className="absolute top-1 right-4 w-5 h-5 text-yellow-300 animate-bounce" style={{ animationDelay: '200ms' }} />
        </>
      )}
    </div>
  );
};

const PromoModal = ({ isOpen, onClose, spotsRemaining = 100 }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState([]);
  const [giftOpening, setGiftOpening] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const timerRef = useRef(null);
  const prevOpenRef = useRef(false);

  // Generate confetti particles
  const generateConfetti = useCallback(() => {
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1', '#9370DB', '#FF69B4'];
    const particles = [];
    
    for (let i = 0; i < 50; i++) {
      particles.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        size: 8 + Math.random() * 8,
      });
    }
    
    setConfettiParticles(particles);
  }, []);

  // Handle modal open/close transitions
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      // Modal just opened - start animation after small delay
      timerRef.current = setTimeout(() => {
        setGiftOpening(true);
      }, 500);
    } else if (!isOpen && prevOpenRef.current) {
      // Modal just closed - reset state
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setGiftOpening(false);
      setShowConfetti(false);
      setShowContent(false);
      setConfettiParticles([]);
    }
    
    prevOpenRef.current = isOpen;
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOpen]);

  const handleGiftOpened = useCallback(() => {
    setShowConfetti(true);
    generateConfetti();
    setTimeout(() => setShowContent(true), 300);
  }, [generateConfetti]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Confetti Layer */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-confetti-fall"
              style={{
                left: `${particle.left}%`,
                top: '-20px',
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            >
              <div
                className="rounded-sm"
                style={{
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  backgroundColor: particle.color,
                  transform: `rotate(${particle.rotation}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Modal Content */}
      <div className="relative bg-gradient-to-b from-dark-500 to-dark-600 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-primary/30 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          data-testid="promo-modal-close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative text-center">
          {/* Gift Box Animation */}
          <GiftBox isOpening={giftOpening} onAnimationComplete={handleGiftOpened} />
          
          {/* Content that appears after gift opens */}
          <div className={`transition-all duration-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Headline */}
            <h2 className="text-3xl font-bold text-white mb-2">
              <span className="text-primary">0%</span> Platform Fees
            </h2>
            <h3 className="text-2xl font-bold text-white mb-4">
              FOR <span className="text-primary">LIFE!</span>
            </h3>
            
            {/* Subtext */}
            <p className="text-gray-300 mb-6">
              Be one of the first <span className="text-primary font-bold">100 users</span> to sign up and never pay platform fees!
            </p>
            
            {/* Spots remaining counter */}
            <div className="bg-dark-400/80 rounded-xl p-4 mb-6 border border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-primary" />
                <span className="text-gray-400">Spots Remaining</span>
              </div>
              <div className="text-4xl font-bold text-primary">
                {spotsRemaining}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                out of 100
              </div>
            </div>
            
            {/* CTA Button */}
            <Link
              to="/register"
              onClick={onClose}
              className="btn btn-primary w-full py-3 text-lg font-semibold animate-pulse hover:animate-none"
              data-testid="promo-modal-signup"
            >
              Claim Your Spot Now!
            </Link>
            
            {/* Fine print */}
            <p className="text-xs text-gray-500 mt-4">
              Limited time offer. 0% platform fees applies to all future transactions for qualifying accounts.
            </p>
          </div>
        </div>
      </div>
      
      {/* Confetti CSS Animation */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
};

export default PromoModal;
