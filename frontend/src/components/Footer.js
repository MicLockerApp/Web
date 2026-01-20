import React from 'react';
import { Link } from 'react-router-dom';
import VinylLogo from './VinylLogo';
import { useTheme } from '../context/ThemeContext';

const Footer = () => {
  const { isDark } = useTheme();
  
  const categories = [
    'Guitars', 'Bass', 'Keyboards & Synths', 'Drums & Percussion',
    'Pro Audio', 'Microphones', 'DJ Equipment', 'Effects Pedals'
  ];

  return (
    <footer className={`border-t mt-16 transition-colors duration-300 ${
      isDark 
        ? 'bg-dark-600 border-dark-300' 
        : 'bg-gray-100 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <VinylLogo size={32} spinning={false} />
              <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>MicLocker</span>
            </Link>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              The marketplace for musicians, audio engineers, studios, and venues to buy, sell, and trade musical equipment.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Categories</h3>
            <ul className="space-y-2">
              {categories.slice(0, 5).map(cat => (
                <li key={cat}>
                  <Link
                    to={`/search?category=${encodeURIComponent(cat)}`}
                    className={`text-sm hover:text-primary ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Help</h3>
            <ul className="space-y-2">
              <li><Link to="/help" className={`text-sm hover:text-primary ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact Support</Link></li>
              <li><Link to="/returns" className={`text-sm hover:text-primary ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Returns</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>About</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className={`text-sm hover:text-primary ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>About MicLocker</Link></li>
              <li><Link to="/careers" className={`text-sm hover:text-primary ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Careers</Link></li>
              <li><Link to="/legal" className={`text-sm hover:text-primary ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Terms & Policies</Link></li>
            </ul>
          </div>
        </div>

        <div className={`border-t mt-8 pt-8 text-center text-sm ${
          isDark 
            ? 'border-dark-300 text-gray-500' 
            : 'border-gray-300 text-gray-500'
        }`}>
          <p>&copy; {new Date().getFullYear()} MicLocker. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
