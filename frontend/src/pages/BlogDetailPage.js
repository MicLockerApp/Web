import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, User, Eye, MessageCircle, Tag, ArrowLeft, Edit3, Trash2, Send, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SignUpModal from '../components/SignUpModal';

const BlogDetailPage = () => {
  const { slug } = useParams();
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  
  // Check permissions
  const canManageBlogs = user?.role === 'owner' || user?.is_blog_editor;
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/blogs/${slug}`);
      setPost(res.data);
      fetchComments(res.data.id);
    } catch (error) {
      console.error('Error fetching post:', error);
      if (error.response?.status === 404) {
        navigate('/blog');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (blogId) => {
    try {
      const res = await api.get(`/blogs/${blogId}/comments`);
      setComments(res.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/blogs/${post.id}/comments`, { content: newComment.trim() });
      setComments([res.data, ...comments]);
      setNewComment('');
      setPost(prev => ({ ...prev, comment_count: (prev.comment_count || 0) + 1 }));
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await api.delete(`/blogs/${post.id}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
      setPost(prev => ({ ...prev, comment_count: Math.max(0, (prev.comment_count || 1) - 1) }));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment.');
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this blog post? This cannot be undone.')) return;
    
    try {
      await api.delete(`/blogs/${post.id}`);
      navigate('/blog');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'} py-8 px-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`animate-pulse ${isDark ? 'bg-dark-400' : 'bg-white'} rounded-xl p-8`}>
            <div className={`h-8 w-3/4 rounded ${isDark ? 'bg-dark-300' : 'bg-gray-200'} mb-4`} />
            <div className={`h-4 w-1/2 rounded ${isDark ? 'bg-dark-300' : 'bg-gray-200'} mb-8`} />
            <div className={`h-64 rounded ${isDark ? 'bg-dark-300' : 'bg-gray-200'} mb-8`} />
            <div className={`h-4 w-full rounded ${isDark ? 'bg-dark-300' : 'bg-gray-200'} mb-2`} />
            <div className={`h-4 w-full rounded ${isDark ? 'bg-dark-300' : 'bg-gray-200'} mb-2`} />
            <div className={`h-4 w-2/3 rounded ${isDark ? 'bg-dark-300' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`} data-testid="blog-detail-page">
      {/* Header */}
      <div className={`${isDark ? 'bg-dark-600' : 'bg-white'} border-b ${isDark ? 'border-dark-400' : 'border-gray-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/blog"
              className={`flex items-center gap-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Blog
            </Link>
            
            {canManageBlogs && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/blog/editor/${post.id}`}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-100'}`}
                  title="Edit Post"
                  data-testid="edit-post-btn"
                >
                  <Edit3 className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </Link>
                {isOwner && (
                  <button
                    onClick={handleDeletePost}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                    title="Delete Post"
                    data-testid="delete-post-btn"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg`}>
          {/* Featured Image */}
          {post.featured_image && (
            <div className="relative h-64 md:h-96">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              {post.category && (
                <span className="absolute top-4 left-4 px-4 py-1.5 bg-primary text-black text-sm font-semibold rounded-full">
                  {post.category}
                </span>
              )}
            </div>
          )}

          <div className="p-6 md:p-10">
            {/* Category badge (if no featured image) */}
            {!post.featured_image && post.category && (
              <span className="inline-block px-3 py-1 bg-primary text-black text-xs font-semibold rounded-full mb-4">
                {post.category}
              </span>
            )}

            {/* Title */}
            <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {post.title}
            </h1>

            {/* Meta Info */}
            <div className={`flex flex-wrap items-center gap-4 mb-8 pb-8 border-b ${isDark ? 'border-dark-300 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
              <Link
                to={`/profile/${post.author_id}`}
                className="flex items-center gap-2 hover:text-primary"
              >
                {post.author_profile_image ? (
                  <img
                    src={post.author_profile_image}
                    alt={post.author_username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-300' : 'bg-gray-200'}`}>
                    <User className="w-4 h-4" />
                  </div>
                )}
                <span className="font-medium">@{post.author_username}</span>
              </Link>
              
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.published_at || post.created_at)}
              </span>
              
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.view_count} views
              </span>
              
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {post.comment_count} comments
              </span>
            </div>

            {/* Custom CSS for HTML content */}
            {post.content_type === 'html' && post.custom_css && (
              <style dangerouslySetInnerHTML={{ __html: post.custom_css }} />
            )}

            {/* Content */}
            <div 
              className={`prose prose-lg max-w-none ${
                isDark 
                  ? 'prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-primary prose-strong:text-white' 
                  : 'prose-gray'
              }`}
            >
              {post.content_type === 'html' ? (
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              ) : (
                <div className="whitespace-pre-wrap">{post.content}</div>
              )}
            </div>

            {/* Custom JavaScript for HTML content */}
            {post.content_type === 'html' && post.custom_js && (
              <script dangerouslySetInnerHTML={{ __html: post.custom_js }} />
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className={`mt-8 pt-8 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <Link
                      key={tag}
                      to={`/blog?tag=${encodeURIComponent(tag)}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        isDark 
                          ? 'bg-dark-500 text-gray-400 hover:bg-dark-300 hover:text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        {post.allow_comments && (
          <div className={`mt-8 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg p-6 md:p-8`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Comments ({post.comment_count || 0})
            </h2>

            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="mb-8">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={isAuthenticated ? "Share your thoughts..." : "Sign in to leave a comment..."}
                rows={3}
                className={`w-full p-4 rounded-lg resize-none ${
                  isDark 
                    ? 'bg-dark-500 border border-dark-300 text-white placeholder-gray-500' 
                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:border-primary`}
                data-testid="comment-input"
              />
              <div className="flex justify-end mt-3">
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                  data-testid="submit-comment-btn"
                >
                  <Send className="w-4 h-4" />
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-6">
              {comments.length === 0 ? (
                <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                comments.map(comment => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}
                    data-testid={`comment-${comment.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <Link
                        to={`/profile/${comment.user_id}`}
                        className="flex items-center gap-3"
                      >
                        {comment.profile_image ? (
                          <img
                            src={comment.profile_image}
                            alt={comment.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-400' : 'bg-gray-200'}`}>
                            <User className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          </div>
                        )}
                        <div>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            @{comment.username}
                          </span>
                          <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <Clock className="w-3 h-3" />
                            {formatDate(comment.created_at)} at {formatTime(comment.created_at)}
                          </div>
                        </div>
                      </Link>
                      
                      {(canManageBlogs || comment.user_id === user?.id) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className={`p-1 rounded ${isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-200'}`}
                          title="Delete comment"
                        >
                          <Trash2 className={`w-4 h-4 ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`} />
                        </button>
                      )}
                    </div>
                    
                    <p className={`mt-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </article>

      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        actionText="comment on blog posts"
      />
    </div>
  );
};

export default BlogDetailPage;
