import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Music, Users, Globe, Heart } from 'lucide-react';
import VinylLogo from '../components/VinylLogo';
import { listingsAPI } from '../services/api';

const AboutPage = () => {
  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    countries: 0,
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // The app backend only exposes the active-listing count publicly.
        const response = await listingsAPI.getCount();
        setStats({
          users: response.data.total_users || 0,
          listings: response.data.active_listings || 0,
          countries: 0,
          loading: false
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M+';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K+';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen" data-testid="about-page">
      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About MicLocker
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Where the music community connects over the perfect piece of music gear.
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 px-4 bg-dark-500">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">MicLocker</h2>
              <p className="text-gray-400 text-lg mb-1">/ˈmaɪk ˌlɑːkər/</p>
              <p className="text-gray-500 text-sm mb-6">Pronounced plainly as: Mike-Locker</p>
              
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                This is the last place that you will ever need to look for anything related to the music industry. We are just beginning. There is so much in store here. We are only in Phase 1. So just hold tight.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                MicLocker was born on January 16th, 2026, but it was conceptualized December 24th, 2016 by our Owner and Founder James McDougall. He was tired of there not being a way for music industry professionals to connect on a fair and honest platform.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                Because of this, our goal is to set the bar at such an exceptionally high level for buying, selling and trading equipment, that we become the first choice of users all across the globe. Rest assured, you're in good hands here. That is our promise.
              </p>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-8 text-center">
                <VinylLogo size={120} spinning={true} className="mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
                <p className="text-2xl font-semibold text-primary">
                  Make the World More Musical
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">What We Offer</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-dark-400 rounded-xl p-8">
              <h3 className="text-xl font-bold text-white mb-4">For Buyers</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Today, buyers all over the world turn to MicLocker for income, inspiration, and, of course, the perfect instrument. Our marketplace features a wide variety of listings ranging from electric, acoustic, and bass guitars to accessories, pro audio gear, synthesizers, drums, DJ equipment, orchestra instruments, music-making software, and more.
              </p>
              <ul className="text-gray-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  Price transparency and fair market values
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  Buyer protection on every purchase
                </li>
              </ul>
            </div>

            <div className="bg-dark-400 rounded-xl p-8">
              <h3 className="text-xl font-bold text-white mb-4">For Sellers</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                The marketplace makes it easy for anyone—from brick-and-mortar retailers, dealers of all sizes, and local music stores to individuals, collectors, and rock stars—to buy and sell musical instruments.
              </p>
              <ul className="text-gray-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  Low 3% selling fee
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  Powerful tools to manage your inventory
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  Connect with buyers worldwide
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Stats */}
      <section className="py-20 px-4 bg-dark-500">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-primary mb-2">2026</p>
              <p className="text-gray-400">Founded</p>
            </div>
            {(stats.loading || stats.users > 0) && (
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {stats.loading ? '...' : formatNumber(stats.users)}
              </p>
              <p className="text-gray-400">Community Members</p>
            </div>
            )}
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {stats.loading ? '...' : formatNumber(stats.listings)}
              </p>
              <p className="text-gray-400">Items Listed</p>
            </div>
            {(stats.loading || stats.countries > 0) && (
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {stats.loading ? '...' : stats.countries}
              </p>
              <p className="text-gray-400">Countries</p>
            </div>
            )}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Values</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: Music, 
                title: 'Music First', 
                desc: "Everything we do is in service of musicians and the music community." 
              },
              { 
                icon: Users, 
                title: 'Community Driven', 
                desc: 'Our platform is built by musicians, for musicians, with input from our community.' 
              },
              { 
                icon: Globe, 
                title: 'Global Reach', 
                desc: 'We connect gear lovers across the world, breaking down barriers to access.' 
              },
              { 
                icon: Heart, 
                title: 'Passion for Quality', 
                desc: 'We care deeply about the quality of gear and the experience on our platform.' 
              },
            ].map((value, index) => (
              <div key={index} className="bg-dark-400 rounded-xl p-6 text-center">
                <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{value.title}</h3>
                <p className="text-gray-400 text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-dark-500">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Join MicLocker to Buy, Sell, and Connect
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Become part of the world&apos;s most musical marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn btn-primary px-8 py-3 inline-flex items-center gap-2">
              Join Now <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/search" className="btn btn-secondary px-8 py-3">
              Browse Gear
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
