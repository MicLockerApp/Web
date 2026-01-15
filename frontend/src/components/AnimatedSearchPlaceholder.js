import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Keywords from around the MicLocker platform
const SEARCH_KEYWORDS = [
  'gear',
  'guitars',
  'synths',
  'drums',
  'mics',
  'pedals',
  'amps',
  'bass',
  'keys',
  'mixers',
  'audio',
  'vinyl',
  'studio',
  'cables',
  'stands',
  'effects',
  'monitors',
  'preamps',
];

// Helper to create initial letters array
const createInitialLetters = () => {
  const word = SEARCH_KEYWORDS[0];
  return word.split('').map((char, i) => ({
    char,
    state: 'visible',
    key: `0-${i}-${char}-init`,
  }));
};

const AnimatedSearchPlaceholder = ({ isDark = true }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayLetters, setDisplayLetters] = useState(createInitialLetters);
  const [phase, setPhase] = useState('idle'); // 'idle', 'flipping-out', 'flipping-in'
  const timeoutRefs = useRef([]);
  const intervalRef = useRef(null);
  const isAnimating = useRef(false);

  // Memoize current word
  const currentWord = useMemo(() => SEARCH_KEYWORDS[wordIndex], [wordIndex]);

  // Clear all timeouts helper
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(t => clearTimeout(t));
    timeoutRefs.current = [];
  }, []);

  // Start enter animation - flip in new letters from TOP (coming down)
  const startEnterAnimation = useCallback((fromIndex) => {
    setPhase('flipping-in');
    const nextIndex = (fromIndex + 1) % SEARCH_KEYWORDS.length;
    const nextWord = SEARCH_KEYWORDS[nextIndex];
    
    // Initialize new letters in hidden state (positioned above)
    const newLetters = nextWord.split('').map((char, i) => ({
      char,
      state: 'hidden',
      key: `${nextIndex}-${i}-${char}-${Date.now()}`,
    }));
    setDisplayLetters(newLetters);

    const letterDelay = 70;
    const flipDuration = 350;

    // Flip in each letter with staggered delay - coming DOWN from top
    nextWord.split('').forEach((_, index) => {
      const timeout = setTimeout(() => {
        setDisplayLetters(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = { ...updated[index], state: 'flipping-in' };
          }
          return updated;
        });
      }, index * letterDelay);
      timeoutRefs.current.push(timeout);
    });

    // After all letters have flipped in, set to visible and update word index
    const totalEnterTime = nextWord.length * letterDelay + flipDuration;
    const finishTimeout = setTimeout(() => {
      setDisplayLetters(prev => 
        prev.map(letter => ({ ...letter, state: 'visible' }))
      );
      setWordIndex(nextIndex);
      setPhase('idle');
      isAnimating.current = false;
    }, totalEnterTime);
    timeoutRefs.current.push(finishTimeout);
  }, []);

  // Start exit animation - flip out current letters DOWNWARD
  const startExitAnimation = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    
    setPhase('flipping-out');
    clearAllTimeouts();

    const word = SEARCH_KEYWORDS[wordIndex];
    const letterDelay = 70;
    const flipDuration = 350;

    // Flip out each letter with staggered delay - going DOWN
    word.split('').forEach((_, index) => {
      const timeout = setTimeout(() => {
        setDisplayLetters(prev => {
          const newLetters = [...prev];
          if (newLetters[index]) {
            newLetters[index] = { ...newLetters[index], state: 'flipping-out' };
          }
          return newLetters;
        });
      }, index * letterDelay);
      timeoutRefs.current.push(timeout);
    });

    // After all letters have flipped out, start flipping in the new word
    const totalExitTime = word.length * letterDelay + flipDuration;
    const startEnterTimeout = setTimeout(() => {
      startEnterAnimation(wordIndex);
    }, totalExitTime);
    timeoutRefs.current.push(startEnterTimeout);
  }, [wordIndex, clearAllTimeouts, startEnterAnimation]);

  // Main animation cycle
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (!isAnimating.current) {
        startExitAnimation();
      }
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearAllTimeouts();
    };
  }, [startExitAnimation, clearAllTimeouts]);

  // Get animation class based on letter state
  const getLetterClass = (state) => {
    switch (state) {
      case 'flipping-out':
        return 'animate-rolodex-out';
      case 'flipping-in':
        return 'animate-rolodex-in';
      case 'hidden':
        return 'opacity-0 -translate-y-full';
      default:
        return '';
    }
  };

  return (
    <span 
      className={`inline-flex items-center font-normal select-none ${
        isDark ? 'text-gray-500' : 'text-gray-400'
      }`}
      data-testid="animated-search-placeholder"
    >
      <span>Search for&nbsp;</span>
      <span 
        className="inline-flex overflow-hidden relative"
        style={{ 
          height: '1.5em',
          perspective: '300px',
          perspectiveOrigin: 'center center',
        }}
      >
        {displayLetters.map((letter) => (
          <span
            key={letter.key}
            className={`inline-block transform-gpu ${getLetterClass(letter.state)}`}
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'center top',
              backfaceVisibility: 'hidden',
            }}
          >
            {letter.char}
          </span>
        ))}
      </span>
      <span>&nbsp;</span>

      {/* CSS Keyframe Animations for Rolodex Effect - Letters flip DOWN */}
      <style>{`
        @keyframes rolodexFlipOut {
          0% {
            transform: rotateX(0deg) translateY(0);
            opacity: 1;
          }
          40% {
            opacity: 0.8;
          }
          100% {
            transform: rotateX(-90deg) translateY(50%);
            opacity: 0;
          }
        }
        
        @keyframes rolodexFlipIn {
          0% {
            transform: rotateX(90deg) translateY(-50%);
            opacity: 0;
          }
          60% {
            opacity: 0.8;
          }
          100% {
            transform: rotateX(0deg) translateY(0);
            opacity: 1;
          }
        }
        
        .animate-rolodex-out {
          animation: rolodexFlipOut 0.35s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }
        
        .animate-rolodex-in {
          animation: rolodexFlipIn 0.35s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }
      `}</style>
    </span>
  );
};

export default AnimatedSearchPlaceholder;
