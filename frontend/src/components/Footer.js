import React from 'react';
import { Link } from 'react-router-dom';
import VinylLogo from './VinylLogo';

const Footer = () => {
  const categories = [
    'Guitars', 'Bass', 'Keyboards & Synths', 'Drums & Percussion',
    'Pro Audio', 'Microphones', 'DJ Equipment', 'Effects Pedals'
  ];

  return (
    <footer className="bg-dark-600 border-t border-dark-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <VinylLogo size={32} spinning={false} />
              <span className="text-xl font-bold text-white">MicLocker</span>
            </Link>
            <p className="text-gray-400 text-sm">
              The marketplace for musicians, audio engineers, studios, and venues to buy, sell, and trade musical equipment.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-4">Categories</h3>
            <ul className="space-y-2">
              {categories.slice(0, 5).map(cat => (
                <li key={cat}>
                  <Link
                    to={`/search?category=${encodeURIComponent(cat)}`}
                    className="text-gray-400 hover:text-primary text-sm"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-white font-semibold mb-4">Help</h3>
            <ul className="space-y-2">
              <li><Link to="/help" className="text-gray-400 hover:text-primary text-sm">Help Center</Link></li>
              <li><Link to="/shipping" className="text-gray-400 hover:text-primary text-sm">Shipping</Link></li>
              <li><Link to="/returns" className="text-gray-400 hover:text-primary text-sm">Returns</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-primary text-sm">Contact Us</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-white font-semibold mb-4">About</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-400 hover:text-primary text-sm">About MicLocker</Link></li>
              <li><Link to="/careers" className="text-gray-400 hover:text-primary text-sm">Careers</Link></li>
              <li><Link to="/press" className="text-gray-400 hover:text-primary text-sm">Press</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-primary text-sm">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-gray-400 hover:text-primary text-sm">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-dark-300 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MicLocker. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
