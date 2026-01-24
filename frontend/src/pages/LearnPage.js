import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Home } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LearnPage = () => {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center px-4" data-testid="learn-page">
      <div className="text-center max-w-md">
        <div className={`w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
          <GraduationCap className="w-12 h-12 text-primary" />
        </div>
        
        <h1 className="text-4xl font-bold text-primary mb-4">
          Coming Soon!
        </h1>
        
        <p className={`text-lg mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Shhh, we are working on some big things! Come back later and check it out when we are done!
        </p>
        
        <p className={`text-sm italic mb-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          - The MicLocker Team
        </p>
        
        <Link 
          to="/" 
          className="btn btn-primary inline-flex items-center gap-2"
          data-testid="back-home-button"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default LearnPage;
