/**
 * LearnStudioPage - Creator Studio for teaching users
 * 
 * Features:
 * - Create/edit channel
 * - Upload intro video
 * - Create/manage playlists
 * - Upload videos with preview settings
 * - Manage subscription tiers
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Plus, Edit, Trash2, Eye, Upload, Settings, 
  DollarSign, Users, Star, Video, List, Lock, Unlock,
  ChevronDown, X, Check, Loader2, Save, Image
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

// Categories matching user signup
const CATEGORIES = [
  { value: 'musician', label: 'Musicians' },
  { value: 'audio_engineer', label: 'Audio Engineers' },
  { value: 'recording_studio', label: 'Recording Studios' },
  { value: 'venue', label: 'Venues' },
  { value: 'merchant', label: 'Merchants' },
  { value: 'comedian', label: 'Comedians' },
  { value: 'actor', label: 'Actors' },
  { value: 'show_pro', label: 'Show Pro' },
  { value: 'photographer', label: 'Photographers' },
  { value: 'videographer', label: 'Videographers' },
  { value: 'manager', label: 'Managers' },
  { value: 'services', label: 'Services' }
];

// Subcategories by main category
const SUBCATEGORIES = {
  musician: ["Guitar", "Piano", "Drums", "Bass", "Vocals", "Violin", "Saxophone", "Trumpet", "Keyboard", "Percussion"],
  audio_engineer: ["Mixing Engineers", "Mastering Engineers", "Live Sound", "Producers", "Sound Design", "Post Production", "Podcast", "Game Audio"],
  recording_studio: ["Recording Studios", "Rehearsal Rooms", "Equipment Rental", "Acoustics"],
  venue: ["Concert Hall", "Club", "Theater", "Festival Grounds", "Outdoor Venue"],
  merchant: ["Clothing", "Vinyl Records", "Instruments", "Accessories", "Equipment"],
  comedian: ["Stand-up", "Improv", "Sketch Comedy", "Musical Comedy", "Physical Comedy"],
  actor: ["Film Actor", "Theater Actor", "Voice Actor", "Commercial Actor", "Stunt Performer"],
  show_pro: ["Lighting Designer", "Stage Manager", "Sound Technician", "Technical Director", "Rigging"],
  photographer: ["Concert Photographer", "Portrait Photographer", "Event Photographer", "Product Photographer"],
  videographer: ["Music Video Director", "Live Stream Operator", "Documentary Filmmaker", "Video Editor"],
  manager: ["Artist Manager", "Tour Manager", "Business Manager", "Booking Agent"],
  services: ["Hair Stylist", "Makeup Artist", "Wardrobe Stylist", "Personal Trainer", "Catering"]
};

const LearnStudioPage = () => {
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channel, setChannel] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [videos, setVideos] = useState([]);
  const [tiers, setTiers] = useState([]);
  
  // Active section
  const [activeSection, setActiveSection] = useState('channel');
  
  // Channel form
  const [channelForm, setChannelForm] = useState({
    name: '',
    description: '',
    category: 'musician',
    subcategories: [],
    intro_video_url: '',
    intro_video_thumbnail: '',
    banner_image: ''
  });
  
  // Playlist form
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [playlistForm, setPlaylistForm] = useState({
    title: '',
    description: '',
    category: 'musician',
    subcategory: '',
    is_free: false,
    price_usd: 0,
    thumbnail_url: ''
  });
  
  // Video form
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration_seconds: 0,
    category: 'musician',
    subcategory: '',
    playlist_id: '',
    is_free: true,
    price_usd: 0,
    is_preview: false,
    preview_duration_seconds: null
  });
  
  // Tier form
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierForm, setTierForm] = useState({
    name: '',
    description: '',
    price_usd: 0,
    benefits: [],
    includes_all_content: false
  });
  const [newBenefit, setNewBenefit] = useState('');

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/learn/studio');
      return;
    }
    
    try {
      // Get user's channel
      const channelRes = await api.get('/learn/channels/my');
      if (channelRes.data) {
        setChannel(channelRes.data);
        setChannelForm({
          name: channelRes.data.name || '',
          description: channelRes.data.description || '',
          category: channelRes.data.category || 'musician',
          intro_video_url: channelRes.data.intro_video_url || '',
          intro_video_thumbnail: channelRes.data.intro_video_thumbnail || '',
          banner_image: channelRes.data.banner_image || ''
        });
        
        // Get channel content
        const contentRes = await api.get(`/learn/channels/${channelRes.data.id}/content`);
        setPlaylists(contentRes.data.playlists || []);
        setTiers(contentRes.data.subscription_tiers || []);
        
        // Get all videos for this channel
        const videosRes = await api.get(`/learn/videos?channel_id=${channelRes.data.id}&limit=100`);
        setVideos(videosRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create or update channel
  const handleSaveChannel = async () => {
    setSaving(true);
    try {
      if (channel) {
        // Update
        const res = await api.put(`/learn/channels/${channel.id}`, channelForm);
        setChannel(res.data);
      } else {
        // Create
        const res = await api.post('/learn/channels', channelForm);
        setChannel(res.data);
      }
      alert('Channel saved successfully!');
    } catch (error) {
      console.error('Error saving channel:', error);
      alert('Error saving channel');
    } finally {
      setSaving(false);
    }
  };

  // Create/update playlist
  const handleSavePlaylist = async () => {
    setSaving(true);
    try {
      if (editingPlaylist) {
        const res = await api.put(`/learn/playlists/${editingPlaylist.id}`, playlistForm);
        setPlaylists(prev => prev.map(p => p.id === editingPlaylist.id ? res.data : p));
      } else {
        const res = await api.post('/learn/playlists', playlistForm);
        setPlaylists(prev => [...prev, res.data]);
      }
      setShowPlaylistModal(false);
      setEditingPlaylist(null);
      resetPlaylistForm();
    } catch (error) {
      console.error('Error saving playlist:', error);
      alert('Error saving playlist');
    } finally {
      setSaving(false);
    }
  };

  // Delete playlist
  const handleDeletePlaylist = async (playlistId) => {
    if (!window.confirm('Are you sure? This will delete all videos in the playlist.')) return;
    
    try {
      await api.delete(`/learn/playlists/${playlistId}`);
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      setVideos(prev => prev.filter(v => v.playlist_id !== playlistId));
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  // Create/update video
  const handleSaveVideo = async () => {
    setSaving(true);
    try {
      const data = {
        ...videoForm,
        playlist_id: videoForm.playlist_id || null,
        preview_duration_seconds: videoForm.is_preview ? videoForm.preview_duration_seconds : null
      };
      
      if (editingVideo) {
        const res = await api.put(`/learn/videos/${editingVideo.id}`, data);
        setVideos(prev => prev.map(v => v.id === editingVideo.id ? res.data : v));
      } else {
        const res = await api.post('/learn/videos', data);
        setVideos(prev => [...prev, res.data]);
      }
      setShowVideoModal(false);
      setEditingVideo(null);
      resetVideoForm();
    } catch (error) {
      console.error('Error saving video:', error);
      alert('Error saving video');
    } finally {
      setSaving(false);
    }
  };

  // Delete video
  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    
    try {
      await api.delete(`/learn/videos/${videoId}`);
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  // Create/update tier
  const handleSaveTier = async () => {
    setSaving(true);
    try {
      const data = {
        ...tierForm,
        benefits: tierForm.benefits.map(b => ({ description: b, is_included: true }))
      };
      
      if (editingTier) {
        const res = await api.put(`/learn/channels/${channel.id}/tiers/${editingTier.id}`, data);
        setTiers(prev => prev.map(t => t.id === editingTier.id ? res.data : t));
      } else {
        const res = await api.post(`/learn/channels/${channel.id}/tiers`, data);
        setTiers(prev => [...prev, res.data]);
      }
      setShowTierModal(false);
      setEditingTier(null);
      resetTierForm();
    } catch (error) {
      console.error('Error saving tier:', error);
      alert('Error saving tier');
    } finally {
      setSaving(false);
    }
  };

  // Delete tier
  const handleDeleteTier = async (tierId) => {
    if (!window.confirm('Are you sure you want to delete this tier?')) return;
    
    try {
      await api.delete(`/learn/channels/${channel.id}/tiers/${tierId}`);
      setTiers(prev => prev.filter(t => t.id !== tierId));
    } catch (error) {
      console.error('Error deleting tier:', error);
    }
  };

  // Reset forms
  const resetPlaylistForm = () => {
    setPlaylistForm({
      title: '', description: '', category: 'musician', subcategory: '',
      is_free: false, price_usd: 0, thumbnail_url: ''
    });
  };

  const resetVideoForm = () => {
    setVideoForm({
      title: '', description: '', video_url: '', thumbnail_url: '',
      duration_seconds: 0, category: 'musician', subcategory: '',
      playlist_id: '', is_free: true, price_usd: 0, is_preview: false,
      preview_duration_seconds: null
    });
  };

  const resetTierForm = () => {
    setTierForm({
      name: '', description: '', price_usd: 0, benefits: [], includes_all_content: false
    });
    setNewBenefit('');
  };

  // Edit handlers
  const openEditPlaylist = (playlist) => {
    setEditingPlaylist(playlist);
    setPlaylistForm({
      title: playlist.title,
      description: playlist.description || '',
      category: playlist.category,
      subcategory: playlist.subcategory || '',
      is_free: playlist.is_free,
      price_usd: playlist.price_usd,
      thumbnail_url: playlist.thumbnail_url || ''
    });
    setShowPlaylistModal(true);
  };

  const openEditVideo = (video) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      duration_seconds: video.duration_seconds,
      category: video.category,
      subcategory: video.subcategory || '',
      playlist_id: video.playlist_id || '',
      is_free: video.is_free,
      price_usd: video.price_usd,
      is_preview: video.is_preview,
      preview_duration_seconds: video.preview_duration_seconds
    });
    setShowVideoModal(true);
  };

  const openEditTier = (tier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      description: tier.description || '',
      price_usd: tier.price_usd,
      benefits: tier.benefits?.map(b => b.description) || [],
      includes_all_content: tier.includes_all_content
    });
    setShowTierModal(true);
  };

  // Add benefit to tier
  const addBenefit = () => {
    if (newBenefit.trim()) {
      setTierForm(prev => ({ ...prev, benefits: [...prev.benefits, newBenefit.trim()] }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index) => {
    setTierForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Creator Studio
            </h1>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              Manage your channel, playlists, and videos
            </p>
          </div>
          {channel && (
            <a 
              href={`/learn/channel/${channel.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Channel
            </a>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'channel', label: 'Channel Settings', icon: Settings },
            { id: 'playlists', label: 'Playlists', icon: List },
            { id: 'videos', label: 'Videos', icon: Video },
            { id: 'tiers', label: 'Subscription Tiers', icon: DollarSign }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-primary text-black'
                  : isDark 
                    ? 'bg-dark-400 text-gray-300 hover:bg-dark-300' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Channel Settings Section */}
        {activeSection === 'channel' && (
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg`}>
            <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {channel ? 'Edit Channel' : 'Create Your Channel'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Channel Name *
                </label>
                <input
                  type="text"
                  value={channelForm.name}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${
                    isDark ? 'bg-dark-500 text-white border-dark-300' : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border focus:outline-none focus:ring-2 focus:ring-primary/50`}
                  placeholder="My Teaching Channel"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category *
                </label>
                <select
                  value={channelForm.category}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${
                    isDark ? 'bg-dark-500 text-white border-dark-300' : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border`}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={channelForm.description}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className={`w-full px-4 py-2 rounded-lg ${
                    isDark ? 'bg-dark-500 text-white border-dark-300' : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border focus:outline-none focus:ring-2 focus:ring-primary/50`}
                  placeholder="Tell viewers what they'll learn from your channel..."
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Intro Video URL
                </label>
                <input
                  type="url"
                  value={channelForm.intro_video_url}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, intro_video_url: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${
                    isDark ? 'bg-dark-500 text-white border-dark-300' : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border focus:outline-none focus:ring-2 focus:ring-primary/50`}
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Banner Image URL
                </label>
                <input
                  type="url"
                  value={channelForm.banner_image}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, banner_image: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${
                    isDark ? 'bg-dark-500 text-white border-dark-300' : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border focus:outline-none focus:ring-2 focus:ring-primary/50`}
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveChannel}
                disabled={saving || !channelForm.name}
                className="btn btn-primary flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {channel ? 'Save Changes' : 'Create Channel'}
              </button>
            </div>
          </div>
        )}

        {/* Playlists Section */}
        {activeSection === 'playlists' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Your Playlists
              </h2>
              <button
                onClick={() => { resetPlaylistForm(); setShowPlaylistModal(true); }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Playlist
              </button>
            </div>
            
            {playlists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map(playlist => (
                  <div key={playlist.id} className={`rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg`}>
                    <div className="aspect-video bg-dark-500 relative">
                      {playlist.thumbnail_url ? (
                        <img src={playlist.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                        {videos.filter(v => v.playlist_id === playlist.id).length} videos
                      </div>
                      {playlist.is_free ? (
                        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-green-500 text-white text-xs">
                          FREE
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-primary text-black text-xs">
                          ${playlist.price_usd}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {playlist.title}
                      </h3>
                      <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {playlist.description || 'No description'}
                      </p>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => openEditPlaylist(playlist)}
                          className="btn btn-secondary btn-sm flex-1"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePlaylist(playlist.id)}
                          className="btn btn-secondary btn-sm text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
                <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No playlists yet</p>
                <p className="text-sm">Create your first playlist to organize your content</p>
              </div>
            )}
          </div>
        )}

        {/* Videos Section */}
        {activeSection === 'videos' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Your Videos
              </h2>
              <button
                onClick={() => { resetVideoForm(); setShowVideoModal(true); }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Upload Video
              </button>
            </div>
            
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map(video => (
                  <div key={video.id} className={`rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg`}>
                    <div className="aspect-video bg-dark-500 relative">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-10 h-10 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                        {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
                      </div>
                      {video.is_preview && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-blue-500 text-white text-xs">
                          Preview
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className={`font-medium line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {video.title}
                      </h4>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {video.playlist_title || 'Standalone video'}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => openEditVideo(video)}
                          className="btn btn-secondary btn-sm flex-1"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="btn btn-secondary btn-sm text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
                <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No videos yet</p>
                <p className="text-sm">Upload your first video to start teaching</p>
              </div>
            )}
          </div>
        )}

        {/* Tiers Section */}
        {activeSection === 'tiers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Subscription Tiers
              </h2>
              <button
                onClick={() => { resetTierForm(); setShowTierModal(true); }}
                className="btn btn-primary flex items-center gap-2"
                disabled={!channel}
              >
                <Plus className="w-4 h-4" />
                New Tier
              </button>
            </div>
            
            {!channel ? (
              <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Create your channel first</p>
              </div>
            ) : tiers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tiers.map(tier => (
                  <div key={tier.id} className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg`}>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {tier.name}
                      </h3>
                      <div className="flex gap-1">
                        <button onClick={() => openEditTier(tier)} className="p-1 text-gray-400 hover:text-primary">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteTier(tier.id)} className="p-1 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-primary mb-3">
                      ${tier.price_usd}<span className="text-sm font-normal">/month</span>
                    </div>
                    <ul className="space-y-2">
                      {tier.benefits?.map((benefit, idx) => (
                        <li key={idx} className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <Check className="w-4 h-4 text-green-500" />
                          {benefit.description}
                        </li>
                      ))}
                      {tier.includes_all_content && (
                        <li className="flex items-center gap-2 text-sm text-primary font-medium">
                          <Unlock className="w-4 h-4" />
                          Access to ALL content
                        </li>
                      )}
                    </ul>
                    <div className="mt-4 text-sm text-gray-500">
                      {tier.subscriber_count || 0} subscribers
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No subscription tiers yet</p>
                <p className="text-sm">Create tiers to offer monthly subscriptions</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingPlaylist ? 'Edit Playlist' : 'New Playlist'}
              </h3>
              <button onClick={() => { setShowPlaylistModal(false); setEditingPlaylist(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={playlistForm.title}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category
                </label>
                <select
                  value={playlistForm.category}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Thumbnail URL
                </label>
                <input
                  type="url"
                  value={playlistForm.thumbnail_url}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                  placeholder="https://..."
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={playlistForm.is_free}
                    onChange={(e) => setPlaylistForm(prev => ({ ...prev, is_free: e.target.checked, price_usd: e.target.checked ? 0 : prev.price_usd }))}
                    className="w-4 h-4 text-primary"
                  />
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Free Playlist</span>
                </label>
              </div>
              
              {!playlistForm.is_free && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={playlistForm.price_usd}
                    onChange={(e) => setPlaylistForm(prev => ({ ...prev, price_usd: parseFloat(e.target.value) || 0 }))}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPlaylistModal(false); setEditingPlaylist(null); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlaylist}
                disabled={saving || !playlistForm.title}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingPlaylist ? 'Save Changes' : 'Create Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingVideo ? 'Edit Video' : 'Upload Video'}
              </h3>
              <button onClick={() => { setShowVideoModal(false); setEditingVideo(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Video URL *
                </label>
                <input
                  type="url"
                  value={videoForm.video_url}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, video_url: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={videoForm.description}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={videoForm.duration_seconds}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, duration_seconds: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Add to Playlist
                  </label>
                  <select
                    value={videoForm.playlist_id}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, playlist_id: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                  >
                    <option value="">None (Standalone)</option>
                    {playlists.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={videoForm.is_free}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, is_free: e.target.checked }))}
                    className="w-4 h-4 text-primary"
                  />
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Free Video</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={videoForm.is_preview}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, is_preview: e.target.checked }))}
                    className="w-4 h-4 text-primary"
                  />
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Is Preview</span>
                </label>
              </div>
              
              {videoForm.is_preview && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Preview Duration (seconds) - Leave empty for full video
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={videoForm.preview_duration_seconds || ''}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, preview_duration_seconds: e.target.value ? parseInt(e.target.value) : null }))}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                    placeholder="e.g., 30 for 30 seconds"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowVideoModal(false); setEditingVideo(null); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVideo}
                disabled={saving || !videoForm.title || !videoForm.video_url}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingVideo ? 'Save Changes' : 'Upload Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingTier ? 'Edit Tier' : 'New Subscription Tier'}
              </h3>
              <button onClick={() => { setShowTierModal(false); setEditingTier(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tier Name *
                </label>
                <input
                  type="text"
                  value={tierForm.name}
                  onChange={(e) => setTierForm(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                  placeholder="e.g., Pro, Premium, VIP"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={tierForm.description}
                  onChange={(e) => setTierForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Monthly Price (USD) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tierForm.price_usd}
                  onChange={(e) => setTierForm(prev => ({ ...prev, price_usd: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Benefits
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                    className={`flex-1 px-4 py-2 rounded-lg ${isDark ? 'bg-dark-500 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                    placeholder="Add a benefit..."
                  />
                  <button onClick={addBenefit} className="btn btn-secondary">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {tierForm.benefits.map((benefit, idx) => (
                    <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-100'}`}>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{benefit}</span>
                      <button onClick={() => removeBenefit(idx)} className="text-red-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tierForm.includes_all_content}
                  onChange={(e) => setTierForm(prev => ({ ...prev, includes_all_content: e.target.checked }))}
                  className="w-4 h-4 text-primary"
                />
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                  Includes access to ALL content
                </span>
              </label>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowTierModal(false); setEditingTier(null); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTier}
                disabled={saving || !tierForm.name || tierForm.price_usd <= 0}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingTier ? 'Save Changes' : 'Create Tier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnStudioPage;
