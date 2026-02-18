import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, User, Eye, MessageCircle, Tag, Search, Filter, ChevronRight, Newspaper, Edit3 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BlogsPage = () => {
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  
  // Check if user can manage blogs (owner or blog_editor)
  const canManageBlogs = user?.role === 'owner' || user?.is_blog_editor;

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/blogs/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('status', 'published');
      
      const res = await api.get(`/blogs?${params.toString()}`);
      setPosts(res.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    if (category) {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
  };

  const filteredPosts = posts.filter(post => 
    searchQuery === '' || 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`} data-testid="blogs-page">
      {/* Hero Section */}
      <div className={`${isDark ? 'bg-dark-600' : 'bg-gradient-to-r from-primary/10 to-primary/5'} py-12 px-4`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                MicLocker Blog
              </h1>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Industry insights, gear reviews, and stories from the music community
              </p>
            </div>
            {canManageBlogs && (
              <Link
                to="/blog/editor"
                className="btn btn-primary flex items-center gap-2"
                data-testid="create-post-btn"
              >
                <Edit3 className="w-5 h-5" />
                New Post
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg ${
                isDark 
                  ? 'bg-dark-400 border border-dark-300 text-white placeholder-gray-500' 
                  : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:border-primary`}
              data-testid="blog-search-input"
            />
          </div>
          
          {/* Category Filter */}
          <div className="relative">
            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={`pl-10 pr-8 py-3 rounded-lg appearance-none cursor-pointer min-w-[200px] ${
                isDark 
                  ? 'bg-dark-400 border border-dark-300 text-white' 
                  : 'bg-white border border-gray-200 text-gray-900'
              } focus:outline-none focus:border-primary`}
              data-testid="blog-category-filter"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Blog Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white'} animate-pulse`}>
                <div className={`h-48 ${isDark ? 'bg-dark-300' : 'bg-gray-200'}`} />
                <div className="p-5">
                  <div className={`h-4 w-24 rounded ${isDark ? 'bg-dark-300' : 'bg-gray-200'} mb-3`} />
                  <div className={`h-6 w-full rounded ${isDark ? 'bg-dark-300' : 'bg-gray-200'} mb-2`} />
                  <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-dark-300' : 'bg-gray-200'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className={`text-center py-16 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
            <Newspaper className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              No articles found
            </h3>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              {searchQuery || selectedCategory 
                ? 'Try adjusting your search or filter' 
                : 'Check back soon for new content!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map(post => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className={`group rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  isDark ? 'bg-dark-400 hover:bg-dark-300' : 'bg-white hover:shadow-lg'
                }`}
                data-testid={`blog-post-${post.id}`}
              >
                {/* Featured Image */}
                <div className="relative h-48 overflow-hidden">
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      isDark ? 'bg-dark-300' : 'bg-gradient-to-br from-primary/20 to-primary/10'
                    }`}>
                      <Newspaper className={`w-12 h-12 ${isDark ? 'text-gray-600' : 'text-primary/40'}`} />
                    </div>
                  )}
                  {post.category && (
                    <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-black text-xs font-semibold rounded-full">
                      {post.category}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h2 className={`text-lg font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {post.title}
                  </h2>
                  
                  {post.excerpt && (
                    <p className={`text-sm mb-4 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {post.excerpt}
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.published_at || post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.view_count}
                      </span>
                    </div>
                    {post.comment_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comment_count}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {post.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
                            isDark ? 'bg-dark-500 text-gray-400' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogsPage;
