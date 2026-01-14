import React, { useState, useEffect, useCallback, useRef } from 'react';

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
];

const AnimatedSearchPlaceholder = ({ isDark }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [letters, setLetters] = useState([]);
  const [phase, setPhase] = useState('visible'); // 'visible', 'exiting', 'entering'
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const currentWord = SEARCH_KEYWORDS[currentIndex];

  // Initialize letters on mount and word change
  useEffect(() => {
    if (phase === 'visible') {
      setLetters(currentWord.split('').map((char, i) => ({
        char,
        id: `${currentIndex}-${i}`,
      })));
    }
  }, [currentWord, currentIndex, phase]);

  // Animation cycle
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // Start exit animation
      setPhase('exiting');
      
      // After exit animation completes, switch to entering
      timeoutRef.current = setTimeout(() => {
        const nextIndex = (currentIndex + 1) % SEARCH_KEYWORDS.length;
        const nextWord = SEARCH_KEYWORDS[nextIndex];
        
        setLetters(nextWord.split('').map((char, i) => ({
          char,
          id: `${nextIndex}-${i}`,
        })));
        setCurrentIndex(nextIndex);
        setPhase('entering');
        
        // After enter animation completes, set to visible
        timeoutRef.current = setTimeout(() => {
          setPhase('visible');
        }, nextWord.length * 80 + 400);
        
      }, currentWord.length * 80 + 400);
      
    }, 3500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, currentWord.length]);

  return (
    <span className={`inline-flex items-center font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
      <span>Search for </span>
      <span 
        className="inline-flex overflow-hidden relative ml-1"
        style={{ perspective: '200px', height: '1.5em' }}
      >
        {letters.map((letter, index) => (
          <span
            key={letter.id}
            className="inline-block"
            style={{
              animation: phase === 'exiting' 
                ? `rolodexFlipOut 0.35s cubic-bezier(0.4, 0, 0.6, 1) forwards`
                : phase === 'entering'
                ? `rolodexFlipIn 0.35s cubic-bezier(0.4, 0, 0.6, 1) forwards`
                : 'none',
              animationDelay: `${index * 0.07}s`,
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
            }}
          >
            {letter.char}
          </span>
        ))}
      </span>
      <span>...</span>
      
      <style>{`
        @keyframes rolodexFlipOut {
          0% {
            transform: rotateX(0deg);
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: rotateX(90deg) translateY(50%);
            opacity: 0;
          }
        }
        
        @keyframes rolodexFlipIn {
          0% {
            transform: rotateX(-90deg) translateY(-50%);
            opacity: 0;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: rotateX(0deg);
            opacity: 1;
          }
        }
      `}</style>
    </span>
  );
};

export default AnimatedSearchPlaceholder;
