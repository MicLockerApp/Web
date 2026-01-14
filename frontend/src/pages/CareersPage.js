import React from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, Heart, Sparkles, Music, Users, Globe, 
  ArrowRight, CheckCircle, Headphones, Building2, Zap
} from 'lucide-react';
import VinylLogo from '../components/VinylLogo';

const CareersPage = () => {
  const benefits = [
    {
      icon: DollarSign,
      title: 'Competitive Compensation',
      items: [
        '401K matching with immediate vesting',
        'Competitive salary & equity packages',
        'Annual performance bonuses',
        'Referral bonuses'
      ],
      color: 'text-green-400'
    },
    {
      icon: Heart,
      title: 'Family & Wellness',
      items: [
        '16-weeks paid parental leave',
        'Fertility & adoption benefits',
        'Comprehensive health, dental & vision',
        'Mental health support & counseling'
      ],
      color: 'text-pink-400'
    },
    {
      icon: Sparkles,
      title: 'Work-Life Balance',
      items: [
        'Unlimited PTO policy',
        'Sabbatical program after 5 years',
        'Flexible remote work options',
        '$1,500 home office stipend'
      ],
      color: 'text-purple-400'
    },
    {
      icon: Music,
      title: 'Music Industry Perks',
      items: [
        'Deep discounts on music gear',
        'No seller fees on MicLocker',
        'Studio access for employees',
        'Concert & festival tickets'
      ],
      color: 'text-primary'
    }
  ];

  const values = [
    {
      icon: Users,
      title: 'Community First',
      description: 'We exist to serve music professionals. Every decision we make centers on empowering our community of musicians, engineers, and creators.'
    },
    {
      icon: Zap,
      title: 'Move Fast, Stay Sharp',
      description: 'We embrace agility and make decisions quickly. We\'d rather learn from trying than wait for perfect conditions.'
    },
    {
      icon: Headphones,
      title: 'Passion for Sound',
      description: 'We\'re musicians, producers, and gear enthusiasts ourselves. Our love for music drives everything we build.'
    },
    {
      icon: Globe,
      title: 'Think Global',
      description: 'Music is universal. We\'re building a platform that connects the worldwide community of music industry professionals.'
    }
  ];

  return (
    <div className="min-h-screen bg-dark-600" data-testid="careers-page">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1600)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-600/80 via-dark-600/90 to-dark-600" />
        
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <VinylLogo size={80} spinning={true} />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Shape the Future of <span className="text-primary">Music</span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Join a team of passionate music lovers, tech innovators, and creative minds building 
            the gold standard marketplace for music industry professionals.
          </p>
          <Link 
            to="/careers/jobs" 
            className="btn btn-primary px-10 py-4 text-lg inline-flex items-center gap-2"
          >
            View Open Positions <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Why MicLocker Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Work at MicLocker?</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              We're not just building a marketplace—we're empowering the global music community. 
              And we take care of the people who make it happen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-dark-400 rounded-2xl p-8 hover:bg-dark-300 transition-colors">
                <div className={`w-14 h-14 rounded-xl bg-dark-300 flex items-center justify-center mb-6`}>
                  <benefit.icon className={`w-7 h-7 ${benefit.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{benefit.title}</h3>
                <ul className="space-y-3">
                  {benefit.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Culture Image Section */}
      <section className="py-16 px-4 bg-dark-500">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 relative rounded-2xl overflow-hidden h-80">
              <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800" 
                alt="Team collaboration"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-600/90 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-2xl font-bold text-white mb-2">Collaborative by Nature</h3>
                <p className="text-gray-300">Our best ideas come from working together across teams</p>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden h-80">
              <img 
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600" 
                alt="Recording studio"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-600/90 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-xl font-bold text-white mb-1">Music in Our DNA</h3>
                <p className="text-gray-300 text-sm">Built by music lovers, for music lovers</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="relative rounded-2xl overflow-hidden h-64">
              <img 
                src="https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=600" 
                alt="Remote work"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-600/90 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-xl font-bold text-white mb-1">Work Your Way</h3>
                <p className="text-gray-300 text-sm">Remote-first with flexibility</p>
              </div>
            </div>
            <div className="md:col-span-2 relative rounded-2xl overflow-hidden h-64">
              <img 
                src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800" 
                alt="Community event"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-600/90 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-2xl font-bold text-white mb-2">Giving Back</h3>
                <p className="text-gray-300">Supporting music education through MicLocker Gives</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Our Values</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              These principles guide how we work, make decisions, and treat each other.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="bg-dark-400 rounded-xl p-6 text-center hover:transform hover:-translate-y-1 transition-all">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diversity & Inclusion */}
      <section className="py-20 px-4 bg-dark-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Diversity, Equity & Inclusion</h2>
          <p className="text-gray-300 text-lg mb-8 leading-relaxed">
            Music brings people together regardless of background, and so does MicLocker. 
            We believe diverse teams build better products and create more inclusive experiences 
            for our global community. We're committed to:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              'Equitable hiring practices & pay transparency',
              'Employee Resource Groups & mentorship',
              'Continuous learning & bias training',
              'Accessible workplace & products',
              'Community partnerships with underrepresented groups'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-dark-500">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Make Music History?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Join a team that's revolutionizing how music professionals buy, sell, and trade gear. 
            Your next great opportunity is waiting.
          </p>
          <Link 
            to="/careers/jobs" 
            className="btn btn-primary px-12 py-4 text-lg inline-flex items-center gap-2"
          >
            Explore Open Positions <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CareersPage;
