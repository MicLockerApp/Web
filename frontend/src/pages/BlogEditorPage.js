import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, Eye, Image, Video, Code, Type, Tag, Upload, X, 
  ChevronDown, Loader2, Trash2, Globe, Lock, MessageCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BlogEditorPage = () => {
  const { id } = useParams();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const isEditing = !!id;
  const isOwner = user?.role === 'owner';
  const canPublish = isOwner;
  
  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('rich_text'); // 'rich_text' or 'html'
  const [customCss, setCustomCss] = useState('');
  const [customJs, setCustomJs] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState('draft');
  const [allowComments, setAllowComments] = useState(true);
  
  // UI state
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    fetchCategories();
    if (isEditing) {
      fetchPost();
    }
  }, [id]);

  useEffect(() => {
    // Auto-generate slug from title
    if (autoSlug && title && !isEditing) {
      const newSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(newSlug);
    }
  }, [title, autoSlug, isEditing]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/blogs/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPost = async () => {
    try {
      const res = await api.get(`/blogs/${id}`);
      const post = res.data;
      setTitle(post.title);
      setSlug(post.slug);
      setContent(post.content);
      setContentType(post.content_type || 'rich_text');
      setCustomCss(post.custom_css || '');
      setCustomJs(post.custom_js || '');
      setExcerpt(post.excerpt || '');
      setFeaturedImage(post.featured_image || '');
      setCategory(post.category || '');
      setTags(post.tags || []);
      setStatus(post.status);
      setAllowComments(post.allow_comments);
      setAutoSlug(false);
    } catch (error) {
      console.error('Error fetching post:', error);
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFeaturedImage(res.data.url);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = async (publishStatus = status) => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!content.trim()) {
      alert('Please enter content');
      return;
    }

    // Check publish permission
    if (publishStatus === 'published' && !canPublish) {
      alert('Only the owner can publish blog posts. Saving as draft.');
      publishStatus = 'draft';
    }

    setSaving(true);
    try {
      const postData = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        content: content.trim(),
        content_type: contentType,
        custom_css: contentType === 'html' ? (customCss.trim() || undefined) : undefined,
        custom_js: contentType === 'html' ? (customJs.trim() || undefined) : undefined,
        excerpt: excerpt.trim() || undefined,
        featured_image: featuredImage || undefined,
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
        status: publishStatus,
        allow_comments: allowComments
      };

      if (isEditing) {
        await api.put(`/blogs/${id}`, postData);
      } else {
        const res = await api.post('/blogs/', postData);
        navigate(`/blog/${res.data.slug}`);
        return;
      }

      setStatus(publishStatus);
      alert(publishStatus === 'published' ? 'Post published!' : 'Draft saved!');
    } catch (error) {
      console.error('Error saving post:', error);
      alert(error.response?.data?.detail || 'Failed to save post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`} data-testid="blog-editor-page">
      {/* Header */}
      <div className={`sticky top-0 z-10 ${isDark ? 'bg-dark-600 border-dark-400' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/blog"
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-100'}`}
              >
                <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </Link>
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isEditing ? 'Edit Post' : 'New Post'}
              </h1>
              {status === 'draft' && (
                <span className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                  Draft
                </span>
              )}
              {status === 'published' && (
                <span className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                  Published
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDark ? 'bg-dark-400 text-gray-300 hover:bg-dark-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDark ? 'bg-dark-400 text-gray-300 hover:bg-dark-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
                data-testid="save-draft-btn"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              
              {canPublish ? (
                <button
                  onClick={() => handleSave('published')}
                  disabled={saving}
                  className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                  data-testid="publish-btn"
                >
                  <Globe className="w-4 h-4" />
                  {saving ? 'Saving...' : (status === 'published' ? 'Update' : 'Publish')}
                </button>
              ) : (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? 'bg-dark-400 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                  <Lock className="w-4 h-4" />
                  Only owner can publish
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
                className={`w-full text-3xl font-bold p-4 rounded-lg ${
                  isDark 
                    ? 'bg-dark-400 border border-dark-300 text-white placeholder-gray-500' 
                    : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:border-primary`}
                data-testid="post-title-input"
              />
            </div>

            {/* Content Type Toggle */}
            <div className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <button
                onClick={() => setContentType('rich_text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  contentType === 'rich_text'
                    ? 'bg-primary text-black'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid="rich-text-mode-btn"
              >
                <Type className="w-4 h-4" />
                Rich Text
              </button>
              <button
                onClick={() => setContentType('html')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  contentType === 'html'
                    ? 'bg-primary text-black'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid="html-mode-btn"
              >
                <Code className="w-4 h-4" />
                HTML Code
              </button>
            </div>

            {/* Content Editor */}
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={contentType === 'html' ? 'Paste your HTML code here...' : 'Write your content here...'}
                rows={20}
                className={`w-full p-4 rounded-lg resize-y font-mono text-sm ${
                  isDark 
                    ? 'bg-dark-400 border border-dark-300 text-white placeholder-gray-500' 
                    : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:border-primary`}
                style={{ minHeight: '400px' }}
                data-testid="post-content-input"
              />
              <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {contentType === 'html' 
                  ? 'HTML mode: Paste formatted HTML code directly. It will be rendered as-is.'
                  : 'Rich Text mode: Write plain text. Line breaks will be preserved.'}
              </p>
            </div>

            {/* CSS and JavaScript Editors - Only shown in HTML mode */}
            {contentType === 'html' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Custom CSS */}
                <div className={`rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white'} border ${isDark ? 'border-dark-300' : 'border-gray-200'} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full bg-blue-500`}></div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Custom CSS
                    </h3>
                  </div>
                  <textarea
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    placeholder={`.my-class {\n  color: #fff;\n  background: #000;\n}`}
                    rows={10}
                    className={`w-full p-3 rounded-lg resize-y font-mono text-xs ${
                      isDark 
                        ? 'bg-dark-500 border border-dark-300 text-blue-300 placeholder-gray-600' 
                        : 'bg-gray-50 border border-gray-200 text-blue-600 placeholder-gray-400'
                    } focus:outline-none focus:border-blue-500`}
                    style={{ minHeight: '200px' }}
                    data-testid="post-css-input"
                  />
                  <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Add custom CSS styles. Wrapped in {'<style>'} tags automatically.
                  </p>
                </div>

                {/* Custom JavaScript */}
                <div className={`rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white'} border ${isDark ? 'border-dark-300' : 'border-gray-200'} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full bg-yellow-500`}></div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Custom JavaScript
                    </h3>
                  </div>
                  <textarea
                    value={customJs}
                    onChange={(e) => setCustomJs(e.target.value)}
                    placeholder={`// Your JavaScript code here\nconsole.log('Hello from blog post!');`}
                    rows={10}
                    className={`w-full p-3 rounded-lg resize-y font-mono text-xs ${
                      isDark 
                        ? 'bg-dark-500 border border-dark-300 text-yellow-300 placeholder-gray-600' 
                        : 'bg-gray-50 border border-gray-200 text-yellow-600 placeholder-gray-400'
                    } focus:outline-none focus:border-yellow-500`}
                    style={{ minHeight: '200px' }}
                    data-testid="post-js-input"
                  />
                  <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Add custom JavaScript. Wrapped in {'<script>'} tags automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Preview */}
            {showPreview && (
              <div className={`rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white'} border ${isDark ? 'border-dark-300' : 'border-gray-200'} p-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
                {contentType === 'html' && customCss && (
                  <style dangerouslySetInnerHTML={{ __html: customCss }} />
                )}
                <div className={`prose max-w-none ${isDark ? 'prose-invert' : 'prose-gray'}`}>
                  {contentType === 'html' ? (
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  ) : (
                    <div className="whitespace-pre-wrap">{content}</div>
                  )}
                </div>
                {contentType === 'html' && customJs && (
                  <p className={`mt-4 text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    ⚠️ JavaScript will execute when the post is viewed (not in preview for security).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Featured Image */}
            <div className={`rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white'} border ${isDark ? 'border-dark-300' : 'border-gray-200'} p-4`}>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Featured Image
              </h3>
              
              {featuredImage ? (
                <div className="relative">
                  <img
                    src={featuredImage}
                    alt="Featured"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => setFeaturedImage('')}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDark 
                      ? 'border-dark-300 hover:border-primary' 
                      : 'border-gray-200 hover:border-primary'
                  }`}
                >
                  {uploading ? (
                    <Loader2 className={`w-8 h-8 mx-auto mb-2 animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  ) : (
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  )}
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {uploading ? 'Uploading...' : 'Click to upload image'}
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Slug */}
            <div className={`rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white'} border ${isDark ? 'border-dark-300' : 'border-gray-200'} p-4`}>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                URL Slug
              </h3>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setAutoSlug(false);
                }}
                placeholder="post-url-slug"
                className={`w-full p-2 rounded-lg text-sm ${
                  isDark 
                    ? 'bg-dark-500 border border-dark-300 text-white placeholder-gray-500' 
                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:border-primary`}
                data-testid="post-slug-input"
              />
              <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                /blog/{slug || 'your-post-slug'}
              </p>
            </div>

            {/* Excerpt */}
            <div className={`rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white'} border ${isDark ? 'border-dark-300' : 'border-gray-200'} p-4`}>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Excerpt
              </h3>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief description for preview cards..."
                rows={3}
                maxLength={500}
                className={`w-full p-2 rounded-lg text-sm resize-none ${
                  isDark 
                    ? 'bg-dark-500 border border-dark-300 text-white placeholder-gray-500' 
                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:border-primary`}
                data-testid="post-excerpt-input"
              />
              <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {excerpt.length}/500 characters
              </p>
            </div>

            {/* Category */}
            <div className={`rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white'} border ${isDark ? 'border-dark-300' : 'border-gray-200'} p-4`}>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Category
              </h3>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full p-2 rounded-lg ${
                  isDark 
                    ? 'bg-dark-500 border border-dark-300 text-white' 
                    : 'bg-gray-50 border border-gray-200 text-gray-900'
                } focus:outline-none focus:border-primary`}
                data-testid="post-category-select"
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className={`rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white'} border ${isDark ? 'border-dark-300' : 'border-gray-200'} p-4`}>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Tags
              </h3>
              
              <form onSubmit={handleAddTag} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tag..."
                  className={`flex-1 p-2 rounded-lg text-sm ${
                    isDark 
                      ? 'bg-dark-500 border border-dark-300 text-white placeholder-gray-500' 
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:border-primary`}
                  data-testid="tag-input"
                />
                <button
                  type="submit"
                  className={`px-3 py-2 rounded-lg ${isDark ? 'bg-dark-500 hover:bg-dark-300' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <Tag className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
              </form>
              
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                      isDark ? 'bg-dark-500 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className={`ml-1 ${isDark ? 'hover:text-red-400' : 'hover:text-red-500'}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className={`rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white'} border ${isDark ? 'border-dark-300' : 'border-gray-200'} p-4`}>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Settings
              </h3>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <MessageCircle className="w-4 h-4" />
                  Allow comments
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditorPage;
