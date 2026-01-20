import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, Briefcase, MapPin, Clock, ArrowLeft } from 'lucide-react';

const JobSearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Seed data for filters
  const departments = [
    'Engineering',
    'Product',
    'Design',
    'Marketing',
    'Sales',
    'Customer Success',
    'Operations',
    'Finance',
    'People & Culture',
    'Legal',
    'Data & Analytics',
    'Trust & Safety'
  ];

  const jobTypes = [
    'Full-Time',
    'Part-Time',
    'Contract',
    'Internship',
    'Temporary'
  ];

  const locations = [
    'Remote - US',
    'Remote - Worldwide',
    'Chicago, IL',
    'Los Angeles, CA',
    'Nashville, TN',
    'New York, NY',
    'Austin, TX',
    'London, UK',
    'Berlin, Germany',
    'Toronto, Canada'
  ];

  // Sample jobs data (empty - no current openings)
  const jobs = [];

  // Filter logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = searchQuery === '' || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = selectedDepartment === '' || job.department === selectedDepartment;
      const matchesJobType = selectedJobType === '' || job.type === selectedJobType;
      const matchesLocation = selectedLocation === '' || job.location === selectedLocation;
      
      return matchesSearch && matchesDepartment && matchesJobType && matchesLocation;
    });
  }, [jobs, searchQuery, selectedDepartment, selectedJobType, selectedLocation]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('');
    setSelectedJobType('');
    setSelectedLocation('');
  };

  const hasActiveFilters = searchQuery || selectedDepartment || selectedJobType || selectedLocation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" data-testid="job-search-page">
      {/* Custom Header for Jobs Portal */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/careers" 
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Careers</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-amber-400 rounded-full" />
              </div>
            </div>
            <span className="text-white font-semibold">MicLocker Careers</span>
          </div>
          <Link 
            to="/" 
            className="text-sm text-slate-400 hover:text-amber-400 transition-colors"
          >
            Return to Marketplace
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Find Your Next <span className="text-amber-400">Opportunity</span>
          </h1>
          <p className="text-slate-400 text-lg mb-10">
            Search through our open positions and find the perfect role for your career
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by job title, department, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              data-testid="job-search-input"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {/* Department Filter */}
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="appearance-none bg-slate-800 border border-slate-700 text-white px-4 py-3 pr-10 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer min-w-[180px]"
                data-testid="department-filter"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Job Type Filter */}
            <div className="relative">
              <select
                value={selectedJobType}
                onChange={(e) => setSelectedJobType(e.target.value)}
                className="appearance-none bg-slate-800 border border-slate-700 text-white px-4 py-3 pr-10 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer min-w-[160px]"
                data-testid="job-type-filter"
              >
                <option value="">All Job Types</option>
                {jobTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Location Filter */}
            <div className="relative">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="appearance-none bg-slate-800 border border-slate-700 text-white px-4 py-3 pr-10 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer min-w-[180px]"
                data-testid="location-filter"
              >
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-amber-400 hover:text-amber-300 px-4 py-3 text-sm font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {filteredJobs.length} Open Position{filteredJobs.length !== 1 ? 's' : ''}
            </h2>
          </div>

          {/* Job Listings or Empty State */}
          {filteredJobs.length > 0 ? (
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <div 
                  key={job.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-amber-400/50 transition-all cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white group-hover:text-amber-400 transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-400 text-sm">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {job.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {job.type}
                        </span>
                      </div>
                    </div>
                    <button className="bg-amber-400 text-slate-900 px-6 py-2 rounded-lg font-semibold hover:bg-amber-300 transition-colors whitespace-nowrap">
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                No Open Positions Right Now
              </h3>
              <p className="text-slate-400 max-w-md mx-auto mb-8">
                We don't have any openings at the moment, but we're always looking for talented 
                people to join our team. Check back soon or join our talent community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-amber-400 text-slate-900 px-8 py-3 rounded-lg font-semibold hover:bg-amber-300 transition-colors">
                  Join Talent Community
                </button>
                <Link 
                  to="/careers"
                  className="bg-slate-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                >
                  Learn About MicLocker
                </Link>
              </div>
            </div>
          )}

          {/* Department Categories */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              Explore Our Teams
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => {
                    setSelectedDepartment(dept);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center hover:border-amber-400/50 hover:bg-slate-800 transition-all group"
                >
                  <span className="text-white group-hover:text-amber-400 font-medium transition-colors">
                    {dept}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Stay Connected Section */}
          <div className="mt-16 bg-gradient-to-r from-amber-400/10 to-amber-400/5 border border-amber-400/20 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">Stay Connected</h3>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
              Join our talent community to be the first to know about new opportunities 
              and company updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button className="bg-amber-400 text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-amber-300 transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-slate-700 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MicLocker, Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/legal/privacy-policy" className="hover:text-amber-400 transition-colors">Privacy</Link>
            <Link to="/legal/terms-of-use" className="hover:text-amber-400 transition-colors">Terms</Link>
            <Link to="/" className="hover:text-amber-400 transition-colors">Marketplace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default JobSearchPage;
