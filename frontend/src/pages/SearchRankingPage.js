import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Search, TrendingUp, Eye, Megaphone } from 'lucide-react';

const SearchRankingPage = () => {
  const { isDark } = useTheme();
  const currentDate = 'January 15, 2026';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link 
          to="/legal" 
          className={`inline-flex items-center gap-2 mb-8 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Terms & Policies
        </Link>

        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Search & Ranking Disclosures
            </h1>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            How search results and listings are ranked on MicLocker
          </p>
        </div>

        <div className={`space-y-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          
          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Search className="w-6 h-6 text-primary" />
              How Does Search Work?
            </h2>
            <p className="mb-4">
              When you search for an item on MicLocker, our search algorithm works to identify 
              items matching your query and rank them to show the most relevant results.
            </p>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              What We Search
            </h3>
            <p className="mb-4">
              Search terms are matched against multiple fields in our catalog, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Item title</li>
              <li>Brand name</li>
              <li>Model name</li>
              <li>Item category</li>
              <li>Year</li>
              <li>Finish/color</li>
              <li>Description keywords</li>
              <li>Tags</li>
            </ul>
            <p className="mt-4">
              Items are also filtered based on any filters you've selected, such as price range, 
              category, condition, or location.
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <TrendingUp className="w-6 h-6 text-green-500" />
              Ranking Factors
            </h2>
            <p className="mb-4">
              By default, MicLocker aims to show the most relevant items first. Our ranking 
              algorithm considers many factors, including:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Relevancy</h4>
                <p className="text-sm">How well the item's category, brand, and model match your search</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Seller Location</h4>
                <p className="text-sm">Proximity to your location for shipping efficiency</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Seller Reputation</h4>
                <p className="text-sm">Customer experience indicators like buyer reviews and ratings</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Engagement</h4>
                <p className="text-sm">Historical buyer interest in the item or similar items</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Freshness</h4>
                <p className="text-sm">How recently the item was listed</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Listing Quality</h4>
                <p className="text-sm">Completeness of description, photos, and accurate categorization</p>
              </div>
            </div>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              User-Selected Sorting
            </h3>
            <p>
              You can also choose to sort search results by:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Price (low to high or high to low)</li>
              <li>Most recently listed</li>
              <li>Best match (default relevancy)</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Eye className="w-6 h-6 text-blue-500" />
              Organic vs. Promoted Results
            </h2>
            <p className="mb-4">
              MicLocker distinguishes between organic search results and any promoted content:
            </p>
            
            <div className={`p-4 rounded-lg border-l-4 border-primary ${isDark ? 'bg-primary/10' : 'bg-yellow-50'}`}>
              <p className="font-semibold mb-2">Important:</p>
              <p>
                MicLocker does not offer sellers higher ranking placement in organic search results 
                in exchange for compensation or fees. Organic rankings are determined solely by 
                the relevancy factors described above.
              </p>
            </div>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Megaphone className="w-6 h-6 text-purple-500" />
              Promoted Listings (Future Feature)
            </h2>
            <p className="mb-4">
              MicLocker may offer promotional advertising options in the future. If and when 
              such features are introduced:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Promoted listings will be clearly distinguished from organic results</li>
              <li>They will be marked as "Sponsored," "Promoted," or similar language</li>
              <li>Promotional options and pricing will be disclosed to sellers</li>
              <li>This policy will be updated to reflect any new features</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Tips for Sellers
            </h2>
            <p className="mb-4">
              To improve your listing's visibility in search results:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use accurate, descriptive titles with brand and model names</li>
              <li>Select the correct category for your item</li>
              <li>Add relevant tags</li>
              <li>Write detailed descriptions</li>
              <li>Upload high-quality photos</li>
              <li>Maintain good customer service for positive reviews</li>
              <li>Price competitively</li>
              <li>Ship promptly to maintain seller ratings</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Questions?
            </h2>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className="mb-2">
                <strong>Support:</strong>{' '}
                <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
              </p>
              <p className="mb-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline">info@miclockerapp.com</a>
              </p>
              <p>
                <strong>Phone:</strong>{' '}
                <a href="tel:+13146480249" className="text-primary hover:underline">+1 314-648-0249</a>
              </p>
            </div>
          </section>

          <div className={`mt-12 pt-8 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Last Updated: {currentDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchRankingPage;