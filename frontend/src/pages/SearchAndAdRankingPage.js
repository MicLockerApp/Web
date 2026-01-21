import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Search, Filter, HelpCircle, BarChart3, Eye } from 'lucide-react';

const SearchAndAdRankingPage = () => {
  const { isDark } = useTheme();

  const organicFactors = [
    {
      factor: 'Relevance',
      weight: 'High',
      description: 'How well your listing matches the search query, including title, description, brand, model, and category.'
    },
    {
      factor: 'Listing Quality',
      weight: 'High',
      description: 'Complete listings with detailed descriptions, multiple high-quality photos, and accurate specifications rank higher.'
    },
    {
      factor: 'Seller Rating',
      weight: 'Medium',
      description: 'Sellers with higher ratings and more positive reviews appear more prominently in search results.'
    },
    {
      factor: 'Price Competitiveness',
      weight: 'Medium',
      description: 'Items priced competitively relative to similar listings may receive a slight boost.'
    },
    {
      factor: 'Recency',
      weight: 'Medium',
      description: 'Newly listed items may receive a temporary boost to help them gain initial visibility.'
    },
    {
      factor: 'Shipping Speed',
      weight: 'Low',
      description: 'Listings with faster stated handling times may rank slightly higher.'
    },
    {
      factor: 'Location',
      weight: 'Low',
      description: 'When relevant, items located closer to the searcher may be prioritized for faster delivery.'
    }
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Link */}
        <Link
          to="/legal"
          className={`inline-flex items-center gap-2 mb-8 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Terms & Policies
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Search className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Search & Ad Ranking Disclosures
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Last updated: January 15, 2026
              </p>
            </div>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            We believe in transparency. This page explains how search results are ranked on MicLocker and how promoted content is displayed.
          </p>
        </div>

        {/* Transparency Statement */}
        <section className="mb-12">
          <div className={`rounded-xl p-6 ${isDark ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Eye className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <h2 className={`text-xl font-semibold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                Our Commitment to Transparency
              </h2>
            </div>
            <p className={isDark ? 'text-cyan-300/80' : 'text-cyan-800'}>
              MicLocker is committed to fair and transparent ranking of search results. We do not accept payment for higher organic ranking. Promoted listings are always clearly labeled so you know when content is paid for.
            </p>
          </div>
        </section>

        {/* Organic Search Ranking */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <BarChart3 className="w-6 h-6 text-primary" />
            Organic Search Ranking
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            When you search for gear on MicLocker, our algorithm considers multiple factors to show you the most relevant results. Here is how organic search results are ranked:
          </p>
          <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <table className="w-full">
              <thead className={isDark ? 'bg-dark-500' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Factor</th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Weight</th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</th>
                </tr>
              </thead>
              <tbody>
                {organicFactors.map((item, index) => (
                  <tr key={index} className={`border-t ${isDark ? 'border-dark-300' : 'border-gray-100'}`}>
                    <td className={`px-6 py-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.factor}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.weight === 'High' 
                          ? 'bg-green-500/20 text-green-400' 
                          : item.weight === 'Medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.weight}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sort Options */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Filter className="w-6 h-6 text-primary" />
            Sort & Filter Options
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              You have full control over how search results are displayed. Available sort options include:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Best Match (Default)</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Our algorithm balances relevance, quality, and user preferences</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Price: Low to High</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sort by lowest price first</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Price: High to Low</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sort by highest price first</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Newest First</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Most recently listed items first</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ending Soon</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Listings closest to ending (for auctions or timed sales)</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Distance</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Closest items first (when location is shared)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tips for Sellers */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <HelpCircle className="w-6 h-6 text-primary" />
            Tips for Better Visibility
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
            <p className={`mb-4 ${isDark ? 'text-green-300/90' : 'text-green-800'}`}>
              Improve your organic ranking with these free best practices:
            </p>
            <ul className="space-y-3">
              <li className={`flex items-start gap-2 ${isDark ? 'text-green-300/90' : 'text-green-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                <span><strong>Use descriptive titles</strong> including brand, model, condition, and key features</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-green-300/90' : 'text-green-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                <span><strong>Add multiple high-quality photos</strong> from different angles with good lighting</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-green-300/90' : 'text-green-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                <span><strong>Write detailed descriptions</strong> covering specs, condition, history, and what is included</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-green-300/90' : 'text-green-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                <span><strong>Price competitively</strong> by researching similar sold items</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-green-300/90' : 'text-green-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                <span><strong>Maintain excellent seller ratings</strong> through great customer service</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-green-300/90' : 'text-green-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                <span><strong>Respond quickly</strong> to messages and offer inquiries</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <div className={`mt-12 pt-8 border-t text-center ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Questions about search ranking? <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SearchAndAdRankingPage;
