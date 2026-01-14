import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Music, Users, Globe, Heart } from 'lucide-react';
import VinylLogo from '../components/VinylLogo';

const AboutPage = () => {
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
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                MicLocker is the premier online marketplace dedicated to buying, selling, and trading new, used, and vintage musical instruments and equipment. Since launching in 2026, MicLocker has grown into a vibrant community of buyers and sellers all over the world.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                By focusing on inspiring content, price transparency, musician-focused eCommerce tools, a music-savvy customer service team, and more, MicLocker has created an online destination where the global music community can connect over the perfect piece of music gear.
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

      {/* Our Story */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Story</h2>
          
          <div className="bg-dark-400 rounded-2xl p-8 md:p-12">
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            </p>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-20 px-4 bg-dark-500">
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
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  Flexible payment options including payment plans
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

      {/* Stats */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '2026', label: 'Founded' },
              { number: '100K+', label: 'Community Members' },
              { number: '50K+', label: 'Items Listed' },
              { number: '180+', label: 'Countries' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.number}</p>
                <p className="text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-dark-500">
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
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Join MicLocker to Buy, Sell, and Connect
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Become part of the world's most musical marketplace.
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
