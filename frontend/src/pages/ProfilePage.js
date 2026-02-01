import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, MessageSquare, Calendar, Music, Mic2, Building2, Package, Mail, Phone, Globe, ShoppingBag, Image, Video, Plus, X, Play, Trash2, Check, Eye, Upload, ChevronDown, Flag, AlertTriangle } from 'lucide-react';
import { usersAPI, listingsAPI, ticketsAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ListingCard from '../components/ListingCard';
import StarRating from '../components/StarRating';
import GoldMemberBadge from '../components/GoldMemberBadge';
import VinylLogo from '../components/VinylLogo';
import SpotifyPlayer from '../components/SpotifyPlayer';
import Top8Fans from '../components/Top8Fans';
import ProfileMap from '../components/ProfileMap';
import useProfileVisitTracker from '../hooks/useProfileVisitTracker';

// Categories and subcategories for video uploads
const VIDEO_CATEGORIES = [
  { 
    value: 'musician', 
    label: 'Musicians',
    subcategories: [
      "Accordion", "Acoustic Guitar", "Bagpipe", "Banjo", "Bass Electric", "Bass Fretless",
      "Bass Upright", "Bassoon", "Beat Makers", "Cello", "Clarinet", "Classical Guitar",
      "Composer Orchestral", "Dobro", "Drums", "Electric Guitar", "Fiddle", "Flutes", "French Horn",
      "Harmonica", "Harp", "Horns", "Keyboards Synths", "Mandolin", "Oboe", "Pedal Steel",
      "Percussion", "Piano", "Rapper", "Saxophone", "Singer Female", "Singer Male",
      "Timpani", "Trombone", "Trumpet", "Tuba", "Ukulele", "Viola", "Violin"
    ]
  },
  { 
    value: 'audio_engineer', 
    label: 'Audio Engineers',
    subcategories: [
      "Boom Operator", "Dialogue Editing", "Dolby Atmos & Immersive Audio",
      "Editing", "Film Composers", "Full Instrumental Productions", "Game Audio",
      "Ghost Producers", "Live Drum Tracks", "Live Sound", "Mastering Engineers",
      "Mixing Engineers", "Podcast Editing & Mastering", "Producers", "Remixing",
      "Sound Design", "Vocal Tuning"
    ]
  },
  { 
    value: 'recording_studio', 
    label: 'Studios',
    subcategories: [
      "Recording Studios", "Rehearsal Rooms", "Podcast Studios", "Mixing Studios",
      "Mastering Studios", "Production Facilities"
    ]
  },
  { 
    value: 'venue', 
    label: 'Venues',
    subcategories: [
      "Concert Hall", "Club", "Bar", "Restaurant", "Theater", "Arena",
      "Outdoor Venue", "Private Event Space", "Lounge", "Festival Grounds"
    ]
  },
  { 
    value: 'comedian', 
    label: 'Comedians',
    subcategories: [
      "Stand-up", "Improv", "Sketch Comedy", "Musical Comedy", "Physical Comedy",
      "Observational", "Political", "Roast", "Clean/Family-Friendly"
    ]
  },
  { 
    value: 'actor', 
    label: 'Actors',
    subcategories: [
      "Film Actor", "TV Actor", "Theater Actor", "Voice Actor", "Commercial Actor",
      "Stunt Performer", "Motion Capture", "Musical Theater"
    ]
  },
  { 
    value: 'show_pro', 
    label: 'Show Pro',
    subcategories: [
      "Lighting Designer", "Sound Technician", "Stage Manager", "Production Manager",
      "Technical Director", "Set Designer", "Props Master", "Costume Designer",
      "Backline Technician", "FOH Engineer", "Video Technician", "Stage Hand"
    ]
  },
  { 
    value: 'photographer', 
    label: 'Photographers',
    subcategories: [
      "Concert Photographer", "Event Photographer", "Portrait Photographer",
      "Album Cover Photographer", "Press/PR Photographer", "Tour Photographer",
      "Studio Photographer", "Documentary Photographer"
    ]
  },
  { 
    value: 'videographer', 
    label: 'Videographers',
    subcategories: [
      "Music Video Director", "Concert Videographer", "Documentary Filmmaker",
      "Live Stream Operator", "Social Media Content Creator", "Video Editor",
      "Motion Graphics Artist", "Drone Videographer"
    ]
  },
  { 
    value: 'manager', 
    label: 'Managers',
    subcategories: [
      "Artist Manager", "Actor Manager", "Tour Manager", "Business Manager",
      "Talent Manager", "Band Manager", "Booking Agent", "Publicist",
      "Marketing Manager", "Event Manager", "Promoter", "Agent"
    ]
  },
  { 
    value: 'services', 
    label: 'Services',
    subcategories: [
      "Barber", "Hair Stylist", "Makeup Artist", "Wardrobe Stylist",
      "Personal Trainer", "Massage Therapist", "Personal Chef",
      "Driver/Transportation", "Security Personnel", "Catering Services"
    ]
  },
];

const MUSIC_GENRES = [
  "Rock", "Pop", "Hip Hop", "R&B", "Jazz", "Blues", "Country", "Electronic",
  "Classical", "Folk", "Reggae", "Metal", "Punk", "Soul", "Funk", "Latin",
  "World Music", "Gospel", "Indie", "Alternative", "Other"
];

// Music platform icons component
const SocialIcon = ({ platform }) => {
  const icons = {
    apple_music: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
      </svg>
    ),
    soundcloud: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899 1.465c-.053 0-.09.037-.094.094L0 14.48l.182.69c.008.058.042.095.094.095.05 0 .085-.04.094-.094l.205-.69-.205-.696c-.009-.057-.044-.094-.094-.094zm1.83-1.203c-.059 0-.105.051-.111.109l-.219 1.888.219 1.827c.006.06.052.108.111.108.061 0 .105-.048.113-.108l.248-1.827-.248-1.888c-.008-.06-.052-.109-.113-.109zm.924-.456c-.066 0-.117.06-.123.121l-.206 2.343.206 2.246c.006.067.057.12.123.12.064 0 .115-.053.123-.12l.234-2.246-.234-2.343c-.008-.064-.059-.121-.123-.121zm1.111.543c-.073 0-.128.063-.136.136l-.165 1.664.165 2.173c.008.073.063.133.136.133.07 0 .127-.06.134-.133l.188-2.173-.188-1.664c-.007-.073-.064-.136-.134-.136zm.887-.583c-.078 0-.143.072-.148.15l-.157 2.248.157 2.194c.005.08.07.15.148.15.08 0 .145-.072.15-.15l.177-2.194-.177-2.248c-.005-.078-.07-.15-.15-.15zm.967-.085c-.085 0-.156.079-.16.16l-.145 2.332.145 2.196c.004.085.075.16.16.16.085 0 .156-.075.16-.16l.166-2.196-.166-2.332c-.004-.084-.075-.16-.16-.16zm.974-.2c-.091 0-.166.084-.17.177l-.134 2.532.134 2.187c.004.093.08.177.17.177.09 0 .166-.084.171-.177l.152-2.187-.152-2.532c-.005-.093-.081-.177-.171-.177zm.993.116c-.098 0-.18.09-.183.188l-.124 2.227.124 2.192c.003.098.085.19.183.19.098 0 .18-.09.186-.19l.14-2.192-.14-2.227c-.006-.098-.088-.188-.186-.188zm1.018-.412c-.105 0-.193.096-.199.203l-.112 2.637.112 2.188c.006.107.094.2.2.2.103 0 .191-.093.197-.2l.127-2.188-.127-2.637c-.006-.107-.094-.203-.198-.203zm.986-.046c-.112 0-.203.102-.208.215l-.103 2.683.103 2.184c.005.112.096.215.208.215.11 0 .2-.103.208-.215l.116-2.184-.116-2.683c-.008-.113-.098-.215-.208-.215zm1.003-.119c-.117 0-.214.11-.217.228l-.093 2.802.093 2.178c.003.12.1.228.217.228.118 0 .214-.108.22-.228l.104-2.178-.104-2.802c-.006-.12-.102-.228-.22-.228zm2.078-.51c-.133 0-.242.116-.248.25l-.068 3.313.068 2.165c.006.135.115.249.248.249.134 0 .243-.114.25-.249l.078-2.165-.078-3.312c-.007-.135-.116-.251-.25-.251zm1.03.185c-.14 0-.255.12-.26.261l-.056 3.126.056 2.159c.005.143.12.262.26.262.139 0 .254-.12.26-.262l.063-2.159-.063-3.126c-.006-.14-.121-.261-.26-.261zm.982-.174c-.144 0-.264.126-.27.272l-.046 3.3.046 2.154c.006.147.126.27.27.27.146 0 .265-.123.272-.27l.052-2.154-.052-3.3c-.007-.146-.126-.272-.272-.272zm3.113-.93c-.093 0-.18.02-.262.051-.173-2.003-1.869-3.575-3.94-3.575-.494 0-.976.09-1.418.254-.162.06-.218.126-.218.249v7.026c0 .13.097.24.224.248.006 0 5.622.005 5.622.005 1.13 0 2.046-.914 2.046-2.042 0-1.128-.915-2.042-2.046-2.042l-.008-.174z"/>
      </svg>
    ),
    spotify: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  };
  return icons[platform] || null;
};

// Report reasons for reporting users
const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'spam', label: 'Spam or Scam' },
  { value: 'impersonation', label: 'Impersonation or Fake Account' },
  { value: 'inappropriate_content', label: 'Inappropriate or Offensive Content' },
  { value: 'fraud', label: 'Fraud or Suspicious Activity' },
  { value: 'intellectual_property', label: 'Intellectual Property Violation' },
  { value: 'safety_threat', label: 'Threats or Safety Concerns' },
  { value: 'underage', label: 'Underage User' },
  { value: 'other', label: 'Other Violation' },
];

const ProfilePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  
  // Video upload modal state
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoCategory, setVideoCategory] = useState('');
  const [videoSubcategory, setVideoSubcategory] = useState('');
  const [videoGenre, setVideoGenre] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoSongName, setVideoSongName] = useState('');
  
  // Auditions selection state
  const [showAuditionsSelector, setShowAuditionsSelector] = useState(false);
  const [selectedAuditionVideos, setSelectedAuditionVideos] = useState([]);
  const [savingAuditions, setSavingAuditions] = useState(false);
  
  // Video favorites state
  const [videoFavorites, setVideoFavorites] = useState([]);
  const [expandedFavoriteCategories, setExpandedFavoriteCategories] = useState({});
  
  // Report User modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  
  // Delete Account modal state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteCredentialsModal, setShowDeleteCredentialsModal] = useState(false);
  const [deleteUsername, setDeleteUsername] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  const navigate = useNavigate();
  
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const isOwnProfile = currentUser?.id === id;
  const auditionVideosCount = videos.filter(v => v.show_in_auditions).length;
  
  // Refs
  const mediaSectionRef = useRef(null);

  // Handle scrollToMedia query parameter
  useEffect(() => {
    if (searchParams.get('scrollToMedia') === 'true' && !loading) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        mediaSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        setActiveTab('videos');
      }, 500);
    }
  }, [searchParams, loading]);

  // Track profile visits for Top 8 Fans feature
  useProfileVisitTracker(id);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const promises = [
          usersAPI.getProfile(id),
          usersAPI.getUserListings(id, { limit: 12 }),
          usersAPI.getUserReviews(id, { limit: 10 }),
          usersAPI.getProfileMedia(id),
        ];
        
        const [profileRes, listingsRes, reviewsRes, mediaRes] = await Promise.all(promises);
        setProfile(profileRes.data);
        setListings(listingsRes.data.listings || []);
        setReviews(reviewsRes.data.reviews || []);
        setPhotos(mediaRes.data.photos || []);
        setVideos(mediaRes.data.videos || []);
        
        // Fetch video favorites if viewing own profile
        if (currentUser?.id === id) {
          try {
            const favoritesRes = await usersAPI.getVideoFavorites();
            setVideoFavorites(favoritesRes.data || []);
          } catch (err) {
            // Favorites may not be available, ignore
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, currentUser?.id]);

  // Initialize auditions selection when videos change
  useEffect(() => {
    setSelectedAuditionVideos(videos.filter(v => v.show_in_auditions).map(v => v.id));
  }, [videos]);

  const scrollToMedia = () => {
    mediaSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      const response = await usersAPI.uploadPhoto(file);
      if (response.data.success) {
        setPhotos(prev => [response.data.item, ...prev]);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleVideoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setShowVideoUploadModal(true);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleVideoUploadSubmit = async () => {
    if (!videoFile || !videoCategory) {
      alert('Please select a category for your video');
      return;
    }
    
    setUploadingVideo(true);
    try {
      const response = await usersAPI.uploadVideo(videoFile, {
        category: videoCategory,
        subcategory: videoSubcategory || null,
        genre: videoGenre || null,
        description: videoDescription || null,
        songName: videoSongName || null,
      });
      if (response.data.success) {
        setVideos(prev => [response.data.item, ...prev]);
        // Reset form
        setShowVideoUploadModal(false);
        setVideoFile(null);
        setVideoCategory('');
        setVideoSubcategory('');
        setVideoGenre('');
        setVideoDescription('');
        setVideoSongName('');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert(error.response?.data?.detail || 'Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleAuditionToggle = (videoId) => {
    setSelectedAuditionVideos(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      } else if (prev.length < 5) {
        return [...prev, videoId];
      }
      return prev; // Already at max
    });
  };

  const handleSaveAuditions = async () => {
    setSavingAuditions(true);
    try {
      await usersAPI.selectAuditionVideos(selectedAuditionVideos);
      // Update local state
      setVideos(prev => prev.map(v => ({
        ...v,
        show_in_auditions: selectedAuditionVideos.includes(v.id)
      })));
      setShowAuditionsSelector(false);
    } catch (error) {
      console.error('Error saving auditions:', error);
      alert(error.response?.data?.detail || 'Failed to save auditions selection');
    } finally {
      setSavingAuditions(false);
    }
  };

  const handleDeleteMedia = async (mediaId, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    setDeletingId(mediaId);
    try {
      await usersAPI.deleteMedia(mediaId);
      if (type === 'photo') {
        setPhotos(prev => prev.filter(p => p.id !== mediaId));
      } else {
        setVideos(prev => prev.filter(v => v.id !== mediaId));
      }
      if (lightboxMedia?.id === mediaId) {
        setLightboxMedia(null);
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      alert(error.response?.data?.detail || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  // Report User handlers
  const handleReportSubmit = async () => {
    if (!reportReason) {
      alert('Please select a reason for reporting');
      return;
    }
    
    setSubmittingReport(true);
    try {
      const reportReasonLabel = REPORT_REASONS.find(r => r.value === reportReason)?.label || reportReason;
      
      await ticketsAPI.create({
        category: 'Report a User',
        subject: `User Report: ${profile.username} - ${reportReasonLabel}`,
        message: `Reported User: @${profile.username} (ID: ${profile.id})\n\nReason: ${reportReasonLabel}\n\nAdditional Details:\n${reportDetails || 'No additional details provided.'}`
      });
      
      alert('Report submitted successfully. Our team will review this report and take appropriate action.');
      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert(error.response?.data?.detail || 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Delete Account handlers
  const handleDeleteConfirm = () => {
    setShowDeleteConfirmModal(false);
    setShowDeleteCredentialsModal(true);
  };

  const handleDeleteAccount = async () => {
    if (!deleteUsername || !deletePassword) {
      alert('Please enter both username and password');
      return;
    }
    
    setDeletingAccount(true);
    try {
      await authAPI.deleteAccount(deleteUsername, deletePassword);
      alert('Your account has been permanently deleted.');
      // Log out and redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(error.response?.data?.detail || 'Failed to delete account. Please check your credentials.');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!profile) return <div className="text-center py-16 text-gray-400">Profile not found</div>;

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'musician': return Music;
      case 'audio_engineer': return Mic2;
      case 'recording_studio': return Building2;
      case 'venue': return MapPin;
      case 'merchant': return ShoppingBag;
      default: return Music;
    }
  };

  const getCategoryLabel = (cat) => {
    return cat?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
  };

  const CategoryIcon = getCategoryIcon(profile.category);

  // Check if user has any contact info that they've opted to show
  const hasContactInfo = (profile.show_email && profile.email) || 
    (profile.show_phone && profile.phone) || 
    profile.website || 
    (profile.show_social && (profile.apple_music || profile.soundcloud || profile.spotify));

  // Check if user has any music platforms they've opted to show
  const hasSocialMedia = profile.show_social && (profile.apple_music || profile.soundcloud || profile.spotify);

  // Build formatted address from shipping_address
  const formattedAddress = profile.show_address && profile.shipping_address ? (() => {
    const addr = profile.shipping_address;
    const parts = [];
    if (addr.address_line1) parts.push(addr.address_line1);
    if (addr.address_line2) parts.push(addr.address_line2);
    if (addr.city || addr.state || addr.postal_code) {
      const cityStateParts = [];
      if (addr.city) cityStateParts.push(addr.city);
      if (addr.state) cityStateParts.push(addr.state);
      if (addr.postal_code) cityStateParts.push(addr.postal_code);
      parts.push(cityStateParts.join(', '));
    }
    if (addr.country) parts.push(addr.country);
    return parts.join(' • ');
  })() : null;

  // Build formatted physical address
  const formattedPhysicalAddress = profile.show_physical_address && profile.physical_address ? (() => {
    const addr = profile.physical_address;
    const parts = [];
    if (addr.address_line1) parts.push(addr.address_line1);
    if (addr.address_line2) parts.push(addr.address_line2);
    if (addr.city || addr.state || addr.postal_code) {
      const cityStateParts = [];
      if (addr.city) cityStateParts.push(addr.city);
      if (addr.state) cityStateParts.push(addr.state);
      if (addr.postal_code) cityStateParts.push(addr.postal_code);
      parts.push(cityStateParts.join(', '));
    }
    if (addr.country) parts.push(addr.country);
    return parts.join(', ');
  })() : null;

  // Build Google Maps query for physical address
  const googleMapsQuery = profile.show_physical_address && profile.physical_address ? (() => {
    const addr = profile.physical_address;
    const parts = [];
    if (addr.address_line1) parts.push(addr.address_line1);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.postal_code) parts.push(addr.postal_code);
    if (addr.country) parts.push(addr.country);
    return encodeURIComponent(parts.join(', '));
  })() : null;

  return (
    <div className="min-h-screen" data-testid="profile-page">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className={`rounded-xl p-6 md:p-8 mb-8 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt={profile.username}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover"
                />
              ) : (
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-300' : 'bg-gray-200'}`}>
                  <span className="text-4xl md:text-5xl font-bold text-primary">
                    {profile.username?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className={`text-2xl md:text-3xl font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {profile.username}
                  {/* Founder badge - only for the founder */}
                  {profile.is_founder && (
                    <span title="MicLocker Founder" className="inline-flex">
                      <VinylLogo size={24} spinning={true} />
                    </span>
                  )}
                  {profile.is_gold_member && <GoldMemberBadge size="md" />}
                </h1>
                {profile.category && (
                  <span className="badge badge-primary flex items-center gap-1">
                    <CategoryIcon className="w-3 h-3" />
                    {getCategoryLabel(profile.category)}
                  </span>
                )}
              </div>

              {/* Sub-categories */}
              {profile.sub_categories && profile.sub_categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.sub_categories.map(subCat => {
                    const SubCatIcon = getCategoryIcon(subCat);
                    return (
                      <span key={subCat} className={`badge flex items-center gap-1 ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        <SubCatIcon className="w-3 h-3" />
                        {getCategoryLabel(subCat)}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <StarRating rating={profile.rating || 0} showValue totalReviews={profile.review_count} />
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>· {profile.total_sales} sales</span>
                {/* Lifetime Free Fees Badge - only visible on own profile */}
                {isOwnProfile && currentUser?.has_lifetime_free_fees && (
                  <span className="badge bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    0% Platform Fees For Life
                  </span>
                )}
              </div>

              {/* Location & Member Since */}
              <div className={`flex flex-wrap gap-4 text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{profile.bio}</p>
              )}

              {/* Category Specific Info */}
              {profile.category === 'musician' && profile.instruments?.length > 0 && (
                <div className="mb-4">
                  <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {profile.genre && <span className="text-primary">{profile.genre}</span>}
                    {profile.genre && ' · '}
                    Instruments:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.instruments.map(inst => (
                      <span key={inst} className={`badge ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>{inst}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.category === 'audio_engineer' && profile.specializations?.length > 0 && (
                <div className="mb-4">
                  <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Specializations:</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.specializations.slice(0, 5).map(spec => (
                      <span key={spec} className={`badge ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>{spec}</span>
                    ))}
                    {profile.specializations.length > 5 && (
                      <span className={`badge ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>+{profile.specializations.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}

              {profile.category === 'merchant' && profile.business_name && (
                <div className="mb-4">
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Business: <span className={isDark ? 'text-white' : 'text-gray-900'}>{profile.business_name}</span></p>
                </div>
              )}

              {/* Venue Specific Info */}
              {profile.category === 'venue' && (
                <div className="mb-4">
                  {profile.venue_name && (
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Venue: <span className={isDark ? 'text-white' : 'text-gray-900'}>{profile.venue_name}</span>
                    </p>
                  )}
                  {profile.venue_capacity && (
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Capacity: <span className={isDark ? 'text-white' : 'text-gray-900'}>{profile.venue_capacity}</span>
                    </p>
                  )}
                  {profile.venue_website && (
                    <a 
                      href={profile.venue_website.startsWith('http') ? profile.venue_website : `https://${profile.venue_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm mt-1 flex items-center gap-1 text-primary hover:underline`}
                    >
                      <Globe className="w-4 h-4" />
                      Visit Venue Website
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {/* Calendar Button for Bookable Categories (Venues, Audio Engineers, Recording Studios) */}
              {['venue', 'audio_engineer', 'recording_studio'].includes(profile.category?.toLowerCase()) && (
                <Link
                  to={`/venue/${profile.id}/calendar`}
                  className="btn btn-primary flex items-center justify-center gap-2"
                  data-testid="provider-calendar-button"
                >
                  <Calendar className="w-4 h-4" />
                  {profile.category === 'venue' ? 'View Calendar' : 'Book Session'}
                </Link>
              )}
              
              {!isOwnProfile && (
                <Link
                  to={`/messages?to=${profile.id}`}
                  className={`btn ${['venue', 'audio_engineer', 'recording_studio'].includes(profile.category?.toLowerCase()) ? 'btn-secondary' : 'btn-primary'}`}
                  data-testid="message-seller-button"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </Link>
              )}
              {/* Report User Button - for viewing other users' profiles */}
              {!isOwnProfile && currentUser && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="btn btn-secondary flex items-center justify-center gap-2 text-red-500 hover:text-red-400 hover:border-red-500/50"
                  data-testid="report-user-button"
                >
                  <Flag className="w-4 h-4" />
                  Report User
                </button>
              )}
              {isOwnProfile && (
                <Link to="/settings" className="btn btn-secondary">
                  Edit Profile
                </Link>
              )}
              {isOwnProfile && (
                <button
                  onClick={scrollToMedia}
                  className="btn bg-primary text-black hover:bg-primary/90 font-medium"
                  data-testid="upload-media-button"
                >
                  <Upload className="w-4 h-4" />
                  Upload Media
                </button>
              )}
              {/* Delete Account Button - only on own profile */}
              {isOwnProfile && (
                <button
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="btn btn-secondary flex items-center justify-center gap-2 text-red-500 hover:text-red-400 hover:border-red-500/50 mt-2"
                  data-testid="delete-account-button"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              )}
            </div>
          </div>

          {/* Contact Information Section */}
          {(hasContactInfo || formattedAddress) && (
            <div className={`mt-6 pt-6 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.show_email && profile.email && (
                  <a href={`mailto:${profile.email}`} className={`flex items-center gap-3 hover:text-primary transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Mail className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span>{profile.email}</span>
                  </a>
                )}
                {profile.show_phone && profile.phone && (
                  <a href={`tel:${profile.phone}`} className={`flex items-center gap-3 hover:text-primary transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Phone className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span>{profile.phone}</span>
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 hover:text-primary transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Globe className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span>{profile.website}</span>
                  </a>
                )}
              </div>

              {/* Show formatted address if enabled */}
              {formattedAddress && (
                <div className="mt-4">
                  <div className={`flex items-center gap-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <MapPin className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span>{formattedAddress}</span>
                  </div>
                </div>
              )}

              {/* Social Media Links */}
              {hasSocialMedia && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {profile.apple_music && (
                    <a href={profile.apple_music.startsWith('http') ? profile.apple_music : `https://music.apple.com/artist/${profile.apple_music}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:text-pink-500 ${isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} title="Apple Music">
                      <SocialIcon platform="apple_music" />
                    </a>
                  )}
                  {profile.spotify && (
                    <a href={profile.spotify.startsWith('http') ? profile.spotify : `https://open.spotify.com/artist/${profile.spotify}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:text-green-500 ${isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} title="Spotify">
                      <SocialIcon platform="spotify" />
                    </a>
                  )}
                  {profile.soundcloud && (
                    <a href={`https://soundcloud.com/${profile.soundcloud}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:text-orange-500 ${isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} title="SoundCloud">
                      <SocialIcon platform="soundcloud" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Spotify Player Embed */}
          {profile.show_social && profile.spotify_embed_url && (
            <div className={`mt-6 pt-6 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
              <SpotifyPlayer 
                spotifyUrl={profile.spotify_embed_url} 
                username={profile.username}
              />
            </div>
          )}

          {/* Top 8 Fans Section */}
          <div className={`mt-6 pt-6 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
            <Top8Fans profileId={id} isOwner={isOwnProfile} />
          </div>

          {/* Physical Address Section with Google Map */}
          {formattedPhysicalAddress && googleMapsQuery && (
            <div className={`mt-6 pt-6 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <MapPin className="w-5 h-5 text-primary" />
                Physical Location
              </h3>
              <div className={`flex items-center gap-3 mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <span>{formattedPhysicalAddress}</span>
              </div>
              <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
                <ProfileMap address={googleMapsQuery} height={352} />
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${googleMapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline mt-2 inline-block"
              >
                View on Google Maps →
              </a>
            </div>
          )}
        </div>

        {/* Tabs - with ref for scrolling */}
        <div ref={mediaSectionRef} className={`flex gap-4 border-b mb-8 overflow-x-auto ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('photos')}
            className={`pb-4 px-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'photos'
                ? 'text-primary border-b-2 border-primary'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
            data-testid="photos-tab"
          >
            <Image className="w-4 h-4 inline mr-2" />
            Photos ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`pb-4 px-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'videos'
                ? 'text-primary border-b-2 border-primary'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
            data-testid="videos-tab"
          >
            <Video className="w-4 h-4 inline mr-2" />
            Videos ({videos.length})
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-4 px-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'listings'
                ? 'text-primary border-b-2 border-primary'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
            data-testid="listings-tab"
          >
            <Package className="w-4 h-4 inline mr-2" />
            Listings ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 px-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'text-primary border-b-2 border-primary'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
            data-testid="reviews-tab"
          >
            <Star className="w-4 h-4 inline mr-2" />
            Reviews ({reviews.length})
          </button>
          {/* Favorites tab - only visible on own profile */}
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('favorites')}
              className={`pb-4 px-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'favorites'
                  ? 'text-primary border-b-2 border-primary'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
              data-testid="favorites-tab"
            >
              <Star className="w-4 h-4 inline mr-2 fill-current" />
              Favorites ({videoFavorites.length})
            </button>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={photoInputRef}
          onChange={handlePhotoUpload}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={handleVideoFileSelect}
          accept="video/mp4,video/quicktime,video/webm,video/mpeg"
          className="hidden"
        />

        {/* Tab Content */}
        {activeTab === 'photos' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Upload placeholder - matching listing card style */}
              {isOwnProfile && (
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className={`rounded-xl overflow-hidden cursor-pointer ${
                    isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'
                  } ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* Image area - square */}
                  <div className={`aspect-square border-2 border-dashed flex flex-col items-center justify-center ${
                    isDark ? 'border-dark-300 bg-dark-400/50' : 'border-gray-300 bg-gray-50'
                  }`}>
                    {uploadingPhoto ? (
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Plus className={`w-8 h-8 mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add Photo</span>
                      </>
                    )}
                  </div>
                  {/* Info area - matches listing card height */}
                  <div className="p-4">
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Upload Photo
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      JPEG, PNG, WebP, GIF
                    </p>
                  </div>
                </div>
              )}
              
              {/* Photo grid - card style matching listings */}
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className={`rounded-xl overflow-hidden group cursor-pointer ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}
                  onClick={() => setLightboxMedia({ ...photo, type: 'photo' })}
                  data-testid={`photo-card-${photo.id}`}
                >
                  {/* Image area */}
                  <div className="relative aspect-square">
                    <img
                      src={photo.url}
                      alt={photo.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isOwnProfile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMedia(photo.id, 'photo');
                        }}
                        disabled={deletingId === photo.id}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        data-testid={`delete-photo-${photo.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Info area */}
                  <div className="p-4">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {photo.filename || 'Photo'}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(photo.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {photos.length === 0 && !isOwnProfile && (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No photos yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'videos' && (
          <div>
            {/* Auditions Selection Bar - Show only when user has 6+ videos */}
            {isOwnProfile && videos.length >= 6 && (
              <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <Eye className="w-4 h-4 inline mr-2" />
                      Auditions Feed Selection
                    </h4>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {auditionVideosCount}/5 videos visible in the Auditions feed
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAuditionsSelector(!showAuditionsSelector)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    data-testid="manage-auditions-btn"
                  >
                    {showAuditionsSelector ? 'Done Selecting' : 'Select Videos for Auditions'}
                  </button>
                </div>
                
                {showAuditionsSelector && (
                  <div className="mt-4 pt-4 border-t border-dark-300">
                    <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Click videos below to select/deselect. Selected: {selectedAuditionVideos.length}/5
                    </p>
                    <button
                      onClick={handleSaveAuditions}
                      disabled={savingAuditions}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {savingAuditions ? 'Saving...' : 'Save Selection'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video Grid - card style matching listings */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Upload placeholder - matching listing card style */}
              {isOwnProfile && (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className={`rounded-xl overflow-hidden cursor-pointer ${
                    isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'
                  } ${uploadingVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid="upload-video-button"
                >
                  {/* Video area - square */}
                  <div className={`aspect-square border-2 border-dashed flex flex-col items-center justify-center ${
                    isDark ? 'border-dark-300 bg-dark-400/50' : 'border-gray-300 bg-gray-50'
                  }`}>
                    {uploadingVideo ? (
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Plus className={`w-8 h-8 mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add Video</span>
                      </>
                    )}
                  </div>
                  {/* Info area - matches listing card height */}
                  <div className="p-4">
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Upload Video
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      MP4, MOV, WebM
                    </p>
                  </div>
                </div>
              )}
              
              {/* Video grid - card style matching listings */}
              {videos.map(video => (
                <div
                  key={video.id}
                  className={`rounded-xl overflow-hidden group cursor-pointer ${
                    isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'
                  } ${
                    showAuditionsSelector && selectedAuditionVideos.includes(video.id) 
                      ? 'ring-4 ring-primary' 
                      : ''
                  }`}
                  onClick={() => {
                    if (showAuditionsSelector && isOwnProfile) {
                      handleAuditionToggle(video.id);
                    } else {
                      setLightboxMedia({ ...video, type: 'video' });
                    }
                  }}
                  data-testid={`video-card-${video.id}`}
                >
                  {/* Video thumbnail area - square like listings */}
                  <div className="relative aspect-square bg-black">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.description || 'Video thumbnail'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={`${video.url}#t=0.5`}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        playsInline
                      />
                    )}
                    
                    {/* Play icon overlay - always show for videos */}
                    {!showAuditionsSelector && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                          <Play className="w-7 h-7 text-white fill-white ml-1" />
                        </div>
                      </div>
                    )}
                    
                    {/* Selection overlay - only show when in selection mode */}
                    {showAuditionsSelector && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedAuditionVideos.includes(video.id) 
                            ? 'bg-primary text-white' 
                            : 'bg-white/20 text-white border-2 border-white'
                        }`}>
                          {selectedAuditionVideos.includes(video.id) && <Check className="w-6 h-6" />}
                        </div>
                      </div>
                    )}
                    
                    {/* Auditions badge */}
                    {video.show_in_auditions && !showAuditionsSelector && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-black text-xs rounded-full flex items-center gap-1 font-medium">
                        <Eye className="w-3 h-3" />
                        Auditions
                      </div>
                    )}
                    
                    {/* Delete button */}
                    {isOwnProfile && !showAuditionsSelector && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMedia(video.id, 'video');
                        }}
                        disabled={deletingId === video.id}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        data-testid={`delete-video-${video.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Info area - matches listing card style */}
                  <div className="p-4">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {video.song_name || video.description || video.filename || 'Video'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        {VIDEO_CATEGORIES.find(c => c.value === video.category)?.label || video.category || 'Video'}
                      </span>
                      {video.subcategory && (
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {video.subcategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {videos.length === 0 && !isOwnProfile && (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No videos yet</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'listings' && (
          <div>
            {listings.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No listings yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {/* Review Stats Summary */}
            <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {profile.rating?.toFixed(1) || '0.0'}
                  </p>
                  <div className="flex justify-center my-1">
                    <StarRating rating={profile.rating || 0} size={16} />
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Overall ({profile.review_count || 0} reviews)
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold text-green-500`}>
                    {profile.seller_rating?.toFixed(1) || 'N/A'}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    As Seller ({profile.seller_review_count || 0})
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold text-blue-500`}>
                    {profile.buyer_rating?.toFixed(1) || 'N/A'}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    As Buyer ({profile.buyer_review_count || 0})
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <div className="flex items-start gap-4">
                      <Link 
                        to={`/profile/${review.reviewer_id}`}
                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-dark-300 hover:bg-dark-200' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                      >
                        <span className="font-bold text-lg text-primary">
                          {review.reviewer_username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </Link>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Link 
                            to={`/profile/${review.reviewer_id}`}
                            className={`font-medium hover:text-primary ${isDark ? 'text-white' : 'text-gray-900'}`}
                          >
                            {review.reviewer_username || 'Unknown'}
                          </Link>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            review.reviewer_role === 'buyer' 
                              ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                              : isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                          }`}>
                            {review.reviewer_role === 'buyer' ? 'Buyer' : 'Seller'}
                          </span>
                          <StarRating rating={review.rating} size={14} />
                        </div>
                        <p className={`text-sm mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Transaction: {review.listing_title}
                        </p>
                        {review.comment && (
                          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            &ldquo;{review.comment}&rdquo;
                          </p>
                        )}
                        <p className={`text-sm mt-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                          {new Date(review.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No reviews yet</p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Reviews appear here after completed transactions
                </p>
              </div>
            )}
          </div>
        )}

        {/* Favorites Tab - Only visible on own profile */}
        {activeTab === 'favorites' && isOwnProfile && (
          <div>
            {videoFavorites.length > 0 ? (
              <div className="space-y-6">
                {/* Group favorites by category */}
                {Object.entries(
                  videoFavorites.reduce((acc, fav) => {
                    const cat = fav.user_category || 'Other';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(fav);
                    return acc;
                  }, {})
                ).map(([category, favs]) => (
                  <div key={category}>
                    <button
                      onClick={() => setExpandedFavoriteCategories(prev => ({
                        ...prev,
                        [category]: !prev[category]
                      }))}
                      className={`flex items-center gap-2 w-full mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform ${
                        expandedFavoriteCategories[category] !== false ? 'rotate-0' : '-rotate-90'
                      }`} />
                      <span className="font-semibold capitalize">
                        {VIDEO_CATEGORIES.find(c => c.value === category)?.label || category}
                      </span>
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        ({favs.length})
                      </span>
                    </button>
                    
                    {expandedFavoriteCategories[category] !== false && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {favs.map(fav => (
                          <div
                            key={fav.id}
                            className={`rounded-xl overflow-hidden cursor-pointer group ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}
                            onClick={() => setLightboxMedia({ ...fav, type: 'video' })}
                          >
                            {/* Video thumbnail - with play overlay */}
                            <div className="relative aspect-square bg-black">
                              {fav.thumbnail_url ? (
                                <img
                                  src={fav.thumbnail_url}
                                  alt={fav.description || 'Video thumbnail'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <video
                                  src={`${fav.media_url}#t=0.5`}
                                  className="w-full h-full object-cover"
                                  muted
                                  preload="metadata"
                                  playsInline
                                />
                              )}
                              {/* Play icon overlay */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                                </div>
                              </div>
                              {/* Subcategory badge */}
                              {fav.user_subcategories?.[0] && (
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary/90 text-black text-xs rounded-full font-medium">
                                  {fav.user_subcategories[0]}
                                </div>
                              )}
                            </div>
                            {/* Info */}
                            <div className="p-3">
                              <Link
                                to={`/profile/${fav.user_id}`}
                                className={`text-sm font-medium hover:text-primary ${isDark ? 'text-white' : 'text-gray-900'}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                @{fav.username}
                              </Link>
                              {fav.description && (
                                <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {fav.description}
                                </p>
                              )}
                              {fav.user_genres?.[0] && (
                                <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                  {fav.user_genres[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50 fill-current" />
                <p>No favorites yet</p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Star videos in the Auditions feed to save them here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxMedia && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <button
            onClick={() => setLightboxMedia(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div 
            className="max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.type === 'photo' ? (
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.filename}
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
            
            {/* Delete button in lightbox */}
            {isOwnProfile && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => handleDeleteMedia(lightboxMedia.id, lightboxMedia.type)}
                  disabled={deletingId === lightboxMedia.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete {lightboxMedia.type === 'photo' ? 'Photo' : 'Video'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Upload Modal */}
      {showVideoUploadModal && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowVideoUploadModal(false);
            setVideoFile(null);
          }}
        >
          <div 
            className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Upload Video
              </h3>
              <button
                onClick={() => {
                  setShowVideoUploadModal(false);
                  setVideoFile(null);
                }}
                className={`p-2 rounded-full ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File preview */}
            {videoFile && (
              <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
                <p className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <Video className="w-4 h-4 inline mr-2" />
                  {videoFile.name}
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            )}

            {/* Category selector - Required */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={videoCategory}
                onChange={(e) => {
                  setVideoCategory(e.target.value);
                  setVideoSubcategory(''); // Reset subcategory when category changes
                }}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark 
                    ? 'bg-dark-300 border-dark-200 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-primary focus:border-transparent`}
                data-testid="video-category-select"
              >
                <option value="">Select a category...</option>
                {VIDEO_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Subcategory selector - Optional */}
            {videoCategory && VIDEO_CATEGORIES.find(c => c.value === videoCategory)?.subcategories?.length > 0 && (
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Subcategory
                </label>
                <select
                  value={videoSubcategory}
                  onChange={(e) => setVideoSubcategory(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-dark-300 border-dark-200 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-primary focus:border-transparent`}
                  data-testid="video-subcategory-select"
                >
                  <option value="">Select a subcategory (optional)...</option>
                  {VIDEO_CATEGORIES.find(c => c.value === videoCategory)?.subcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Genre selector - Optional */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Genre
              </label>
              <select
                value={videoGenre}
                onChange={(e) => setVideoGenre(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark 
                    ? 'bg-dark-300 border-dark-200 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-primary focus:border-transparent`}
                data-testid="video-genre-select"
              >
                <option value="">Select a genre (optional)...</option>
                {MUSIC_GENRES.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Description
              </label>
              <textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="Describe your video..."
                maxLength={500}
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border resize-none ${
                  isDark 
                    ? 'bg-dark-300 border-dark-200 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:ring-2 focus:ring-primary focus:border-transparent`}
                data-testid="video-description-input"
              />
            </div>

            {/* Song Name */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Song Name
              </label>
              <input
                type="text"
                value={videoSongName}
                onChange={(e) => setVideoSongName(e.target.value)}
                placeholder="Enter song name (if applicable)"
                maxLength={200}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark 
                    ? 'bg-dark-300 border-dark-200 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:ring-2 focus:ring-primary focus:border-transparent`}
                data-testid="video-song-name-input"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowVideoUploadModal(false);
                  setVideoFile(null);
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-medium ${
                  isDark 
                    ? 'bg-dark-300 text-gray-300 hover:bg-dark-200' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleVideoUploadSubmit}
                disabled={!videoCategory || uploadingVideo}
                className={`flex-1 px-4 py-3 rounded-lg font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                data-testid="video-upload-submit"
              >
                {uploadingVideo ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Uploading...
                  </span>
                ) : (
                  'Upload Video'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
