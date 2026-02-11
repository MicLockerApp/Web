import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Star, Share2, Music, Play, Volume2, VolumeX, Search, ChevronDown, SlidersHorizontal, X, Facebook, Twitter, Link2, Copy, Smartphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useImmersive } from '../context/ImmersiveContext';
import { Link, useNavigate } from 'react-router-dom';
import api, { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Music genres for filtering
const MUSIC_GENRES = [
  "Rock", "Pop", "Hip Hop", "R&B", "Jazz", "Blues", "Country", "Electronic",
  "Classical", "Folk", "Reggae", "Metal", "Punk", "Soul", "Funk", "Latin",
  "World Music", "Gospel", "Indie", "Alternative", "Other"
];

// Audition category tabs with subcategories
const AUDITION_CATEGORIES = [
  { value: 'featured', label: 'Featured', subcategories: [] },
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
      "Mixing Engineers", "Podcast Editing & Mastering", "Pop Rock Arranger",
      "Post Editing", "Post Mixing", "Producers", "Production Sound Mixer",
      "Programmed Drums", "Remixing", "Restoration", "Session Conversion",
      "Songwriter Lyrics", "Songwriter Music", "Sound Design", "String Arranger",
      "Surround 5.1 Mixing", "Time Alignment Quantizing", "Top Line Writer",
      "Track Minus Top Line", "Vocal Comping", "Vocal Tuning", "YouTube Cover Recording"
    ]
  },
  { 
    value: 'recording_studio', 
    label: 'Studios',
    subcategories: [
      "Beat Makers", "Composer Orchestral", "Dolby Atmos & Immersive Audio",
      "Film Composers", "Full Instrumental Productions", "Game Audio",
      "Ghost Producers", "Live Drum Tracks", "Mastering Engineers", "Mixing Engineers",
      "Podcast Editing & Mastering", "Producers", "Recording Studios", "Rehearsal Rooms",
      "Remixing", "Restoration", "Sound Design", "String Arranger", "Vocal Tuning"
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
    value: 'merchant', 
    label: 'Merchants',
    subcategories: [
      "Shirts", "Pants", "Jackets", "Hoodies", "Hats", "Shoes",
      "Accessories", "Bags", "Vinyl Records", "CDs", "Posters", "Stickers",
      "Guitar Picks", "Drumsticks", "Cables", "Strings", "Other Merchandise"
    ]
  },
  { 
    value: 'comedian', 
    label: 'Comedians',
    subcategories: [
      "Stand-up", "Improv", "Sketch Comedy", "Musical Comedy", "Physical Comedy",
      "Observational", "Political", "Roast", "Clean/Family-Friendly",
      "Corporate Comedy", "Comedy Podcaster", "Comedy Actor"
    ]
  },
  { 
    value: 'actor', 
    label: 'Actors',
    subcategories: [
      "Film Actor", "TV Actor", "Theater Actor", "Voice Actor", "Commercial Actor",
      "Stunt Performer", "Motion Capture", "Musical Theater", "Dramatic Actor",
      "Comedy Actor", "Action Actor", "Voice Over Artist", "Narrator",
      "Character Actor", "Stage Actor"
    ]
  },
  { 
    value: 'show_pro', 
    label: 'Show Pro',
    subcategories: [
      "Lighting Designer", "Lighting Technician", "Sound Technician", "Stage Manager",
      "Production Manager", "Technical Director", "Rigging Specialist", "Pyrotechnician",
      "Set Designer", "Set Builder", "Props Master", "Costume Designer",
      "Backline Technician", "Monitor Engineer", "FOH Engineer", "Video Technician",
      "Stage Hand", "Tour Manager", "Production Coordinator"
    ]
  },
  { 
    value: 'photographer', 
    label: 'Photographers',
    subcategories: [
      "Concert Photographer", "Event Photographer", "Portrait Photographer", "Headshot Photographer",
      "Album Cover Photographer", "Press/PR Photographer", "Tour Photographer",
      "Festival Photographer", "Studio Photographer", "Product Photographer",
      "Documentary Photographer", "Red Carpet Photographer", "Drone Photographer"
    ]
  },
  { 
    value: 'videographer', 
    label: 'Videographers',
    subcategories: [
      "Music Video Director", "Music Video DP", "Concert Videographer", "Tour Videographer",
      "Documentary Filmmaker", "EPK Producer", "Live Stream Operator", "Multi-Camera Director",
      "Social Media Content Creator", "Event Videographer", "Video Editor",
      "Colorist", "Motion Graphics Artist", "Drone Videographer"
    ]
  },
  { 
    value: 'manager', 
    label: 'Managers',
    subcategories: [
      "Artist Manager", "Actor Manager", "Tour Manager", "Business Manager", "Personal Manager",
      "Talent Manager", "Music Manager", "Band Manager", "Booking Agent", "A&R Representative",
      "Publicist", "Marketing Manager", "Social Media Manager", "Road Manager",
      "Event Manager", "Talent Buyer", "Promoter", "Agent"
    ]
  },
  { 
    value: 'services', 
    label: 'Services',
    subcategories: [
      "Barber", "Hair Stylist", "Hair Colorist", "Wig Specialist", "Makeup Artist",
      "Special Effects Makeup", "Wardrobe Stylist", "Personal Stylist", "Costume Maker",
      "Tailor/Alterations", "Personal Trainer", "Massage Therapist", "Personal Chef",
      "Driver/Transportation", "Security Personnel", "Personal Assistant", "Catering Services"
    ]
  },
];

// Sample audition data - used as fallback when API returns empty
// No sample auditions - real data only from database
const SAMPLE_AUDITIONS = [];

// Single Video Display Component
const VideoDisplay = ({ 
  item, 
  isActive, 
  isMuted, 
  onToggleMute, 
  onFilterClick, 
  hasActiveGenre,
  horizontalIndex,
  totalHorizontalItems,
  onSwipeLeft,
  onSwipeRight,
  canSwipeRight,
  hasSwipedUp,
  hasSwipedHorizontal,
  onFirstSwipeUp,
  onFirstHorizontalSwipe,
  onNavigateToProfile,
  showCategoryBar,
  isImmersiveMode,
  onToggleImmersiveMode
}) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(item.likes_count || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(item.id);
  
  // Touch handling for horizontal swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  // Reset favorite state when item changes (horizontal swipe)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (currentItemId !== item.id) {
      setCurrentItemId(item.id);
      setFavoriteCount(item.likes_count || 0);
      setIsFavorited(false);
    }
  }, [item.id, item.likes_count, currentItemId]);

  // Check if video is in user's favorites on mount or when item changes
  useEffect(() => {
    let isMounted = true;
    if (currentUser && item.id) {
      usersAPI.checkVideoFavorite(item.id)
        .then(res => {
          if (isMounted) {
            setIsFavorited(res.data?.is_favorite || false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsFavorited(false);
          }
        });
    }
    return () => { isMounted = false; };
  }, [currentUser, item.id]);

  // Handle video play/pause based on active state - auto-play with sound when active
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isActive) {
      // Small delay to ensure video element is ready
      const playVideo = async () => {
        try {
          video.currentTime = 0;
          video.muted = isMuted; // Use current mute state (default: unmuted)
          await video.play();
          setIsPlaying(true);
        } catch (error) {
          // Autoplay with sound was prevented by browser
          // Still try to play - browser may have user interaction context
          console.log('Autoplay prevented, video will play when user interacts');
          // Don't force mute - let user control it
          // The video will start playing on first user interaction with the page
          setIsPlaying(false);
        }
      };
      
      // Small timeout to let the scroll settle
      const timer = setTimeout(playVideo, 100);
      return () => clearTimeout(timer);
    } else {
      // Stop completely when not active
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, isMuted]);

  // Sync playing state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Handle mute state - only apply if active
  useEffect(() => {
    if (videoRef.current && isActive) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, isActive]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleFavorite = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('Please log in to save favorites');
      return;
    }
    
    try {
      if (isFavorited) {
        await usersAPI.removeVideoFavorite(item.id);
        setIsFavorited(false);
        setFavoriteCount(prev => Math.max(0, prev - 1));
      } else {
        await usersAPI.addVideoFavorite(item.id);
        setIsFavorited(true);
        setFavoriteCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    setShowShareModal(true);
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(`${window.location.origin}/auditions?video=${item.id}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    setShowShareModal(false);
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`Check out this video by @${item.username}!`);
    const url = encodeURIComponent(`${window.location.origin}/auditions?video=${item.id}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    setShowShareModal(false);
  };

  const shareToReddit = () => {
    const title = encodeURIComponent(`Video by ${item.username}`);
    const url = encodeURIComponent(`${window.location.origin}/auditions?video=${item.id}`);
    window.open(`https://www.reddit.com/submit?title=${title}&url=${url}`, '_blank');
    setShowShareModal(false);
  };

  const shareToInstagram = async () => {
    const url = `${window.location.origin}/auditions?video=${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied! Open Instagram and paste in your story or message.');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
    setShowShareModal(false);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/auditions?video=${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
    setShowShareModal(false);
  };

  const formatCount = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const toggleImmersiveMode = (e) => {
    e.stopPropagation();
    onToggleImmersiveMode();
  };

  // Horizontal swipe handlers
  const handleTouchStart = (e) => {
    // Don't track touch if it starts on a button or interactive element
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    // Don't track touch if it started on a button
    if (touchStartX.current === 0 && touchStartY.current === 0) {
      return;
    }
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    // Don't process swipe if touch started on a button
    if (touchStartX.current === 0 && touchStartY.current === 0) {
      return;
    }
    
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = Math.abs(touchStartY.current - touchEndY.current);
    const threshold = 50;

    // Only trigger horizontal swipe if horizontal movement > vertical movement
    if (Math.abs(diffX) > threshold && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        // Swipe left - show more from this user or navigate to profile
        if (horizontalIndex >= totalHorizontalItems - 1) {
          // At the end - navigate to user profile
          onNavigateToProfile(item.user_id);
        } else {
          onSwipeLeft();
          if (!hasSwipedHorizontal) {
            onFirstHorizontalSwipe();
          }
        }
      } else if (diffX < 0 && canSwipeRight) {
        // Swipe right - go back to previous video
        onSwipeRight();
        if (!hasSwipedHorizontal) {
          onFirstHorizontalSwipe();
        }
      }
    }
    
    // Reset touch coordinates
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  };

  return (
    <div 
      className="relative w-full h-full bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video/Media */}
      <video
        ref={videoRef}
        src={item.media_url}
        poster={item.thumbnail_url}
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-10 h-10 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Horizontal Position Indicator (dots at top) - ALWAYS show for users with videos */}
      {totalHorizontalItems >= 1 && !isImmersiveMode && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 transition-all duration-300 ${showCategoryBar ? '' : '-translate-y-20 opacity-0'}`}>
          {Array.from({ length: totalHorizontalItems }).map((_, idx) => (
            <div 
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === horizontalIndex 
                  ? 'w-6 bg-white' 
                  : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* User Info & Description - Bottom Left */}
      <div 
        className={`absolute bottom-4 left-4 right-20 text-white transition-all duration-300 ${
          isImmersiveMode ? 'opacity-0 translate-x-[-100px]' : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Horizontal swipe hint - only show after vertical swipe */}
        {isActive && hasSwipedUp && !hasSwipedHorizontal && totalHorizontalItems > 1 && (
          <p className="text-white/70 text-sm mb-4 animate-pulse">
            ← → Swipe left or right to see more of this user's content
          </p>
        )}

        {/* Username */}
        <Link 
          to={`/profile/${item.user_id}`}
          className="flex items-center gap-2 mb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={item.user_avatar || 'https://via.placeholder.com/100'} 
            alt={item.username}
            className="w-10 h-10 rounded-full border-2 border-white object-cover"
          />
          <span className="font-semibold text-base">@{item.username}</span>
        </Link>

        {/* Video counter for user */}
        {totalHorizontalItems > 1 && (
          <p className="text-white/60 text-xs mb-1">
            Video {horizontalIndex + 1} of {totalHorizontalItems}
          </p>
        )}

        {/* Description */}
        <p className="text-sm mb-3 line-clamp-2">{item.description}</p>

        {/* Song */}
        <div className="flex items-center gap-2 text-sm">
          <Music className="w-4 h-4" />
          <div className="overflow-hidden">
            <span className="whitespace-nowrap animate-marquee inline-block">
              {item.song_name || `Original Sound - ${item.username}`}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Right Side, positioned above the spinning vinyl */}
      <div 
        className={`absolute right-3 bottom-20 flex flex-col items-center gap-4 transition-all duration-500 ease-out ${
          isImmersiveMode ? 'opacity-0 pointer-events-none translate-y-[200px]' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Filter/Genre Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onFilterClick();
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1"
          data-testid="audition-filter-btn"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasActiveGenre ? 'bg-primary' : 'bg-white/20 backdrop-blur-sm'}`}>
            <SlidersHorizontal className={`w-6 h-6 ${hasActiveGenre ? 'text-black' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-medium">Filter</span>
        </button>

        {/* Favorite (Star) */}
        <button 
          onClick={handleFavorite}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1"
          data-testid="audition-favorite-btn"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isFavorited ? 'bg-primary' : 'bg-white/20 backdrop-blur-sm'}`}>
            <Star 
              className={`w-6 h-6 ${isFavorited ? 'text-black fill-black' : 'text-white'}`} 
            />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(favoriteCount)}</span>
        </button>

        {/* Share */}
        <button 
          className="flex flex-col items-center gap-1"
          data-testid="audition-share-btn"
          onClick={handleShare}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(item.shares_count || 0)}</span>
        </button>

        {/* Mute/Unmute */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1"
          data-testid="audition-mute-btn"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </div>
        </button>
      </div>

      {/* Spinning Album Art - Below action stack, always visible, controls immersive mode */}
      <button
        onClick={toggleImmersiveMode}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="absolute right-3 bottom-4 w-12 h-12 rounded-full border-2 border-gray-800 overflow-hidden animate-spin-slow z-30"
        data-testid="immersive-mode-toggle"
      >
        <img 
          src={item.user_avatar || 'https://via.placeholder.com/100'} 
          alt="Album"
          className="w-full h-full object-cover"
        />
      </button>

      {/* Share Modal */}
      {showShareModal && (
        <div 
          className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-dark-400 rounded-2xl p-6 w-80 max-w-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">Share to</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-dark-300 rounded-full"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="grid grid-cols-5 gap-3">
              {/* Facebook */}
              <button 
                onClick={shareToFacebook}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-gray-300 text-[10px]">Facebook</span>
              </button>
              
              {/* Instagram */}
              <button 
                onClick={shareToInstagram}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <span className="text-gray-300 text-[10px]">Instagram</span>
              </button>
              
              {/* X (Twitter) */}
              <button 
                onClick={shareToTwitter}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-black border border-gray-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-gray-300 text-[10px]">X</span>
              </button>
              
              {/* Reddit */}
              <button 
                onClick={shareToReddit}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#FF4500] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                  </svg>
                </div>
                <span className="text-gray-300 text-[10px]">Reddit</span>
              </button>
              
              {/* Copy Link */}
              <button 
                onClick={copyLink}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                  <Copy className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-300 text-[10px]">Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Audition Item with Horizontal Carousel for User's Content
const AuditionItem = ({ 
  item, 
  isActive, 
  isMuted, 
  onToggleMute, 
  onFilterClick, 
  hasActiveGenre,
  hasSwipedUp,
  hasSwipedHorizontal,
  onFirstSwipeUp,
  onFirstHorizontalSwipe,
  showCategoryBar,
  isImmersiveMode,
  onToggleImmersiveMode
}) => {
  const navigate = useNavigate();
  const [userVideos, setUserVideos] = useState([item]);
  const [horizontalIndex, setHorizontalIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const maxVideosBeforeProfile = 5; // Show 5 videos max, then 6th swipe goes to profile

  // Reset state when item changes (vertical scroll to different user)
  useEffect(() => {
    setUserVideos([item]);
    setHorizontalIndex(0);
    setVideosLoaded(false);
  }, [item.id]);

  // Fetch more videos from this user
  const fetchUserVideos = useCallback(async () => {
    if (loadingMore || videosLoaded) return;
    
    setLoadingMore(true);
    try {
      const response = await api.get(`/auditions/user/${item.user_id}?limit=5`);
      if (response.data && response.data.length > 0) {
        // Only show actual videos - max 5
        setUserVideos(response.data.slice(0, maxVideosBeforeProfile));
      }
      // If API returns nothing, keep the single video we already have
      setVideosLoaded(true);
    } catch (error) {
      console.error('Failed to fetch user videos:', error);
      // On error, keep the single video - don't generate fake ones
      setVideosLoaded(true);
    } finally {
      setLoadingMore(false);
    }
  }, [item, loadingMore, videosLoaded, maxVideosBeforeProfile]);

  // Load more videos when component becomes active
  useEffect(() => {
    if (isActive && !videosLoaded && !loadingMore) {
      fetchUserVideos();
    }
  }, [isActive, videosLoaded, loadingMore, fetchUserVideos]);

  // Keyboard navigation for horizontal swipe (desktop)
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handleSwipeLeft();
      } else if (e.key === 'ArrowRight' && horizontalIndex > 0) {
        handleSwipeRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, horizontalIndex, userVideos.length]);

  // Navigate to user profile
  const handleNavigateToProfile = useCallback((userId) => {
    navigate(`/profile/${userId}`);
  }, [navigate]);

  // Handle swipe left - go to next video or profile
  const handleSwipeLeft = useCallback(() => {
    // If there are more videos to show
    if (horizontalIndex < userVideos.length - 1) {
      // Go to next video
      setHorizontalIndex(prev => prev + 1);
    } else if (userVideos.length >= maxVideosBeforeProfile && horizontalIndex === maxVideosBeforeProfile - 1) {
      // We've shown all 5 videos - 6th swipe goes to user's profile
      navigate(`/profile/${item.user_id}`);
    } else if (userVideos.length < maxVideosBeforeProfile && !loadingMore) {
      // Need to load more videos first
      fetchUserVideos();
    } else if (userVideos.length > 1 && horizontalIndex === userVideos.length - 1) {
      // We've shown all available videos (less than 5) - go to profile
      navigate(`/profile/${item.user_id}`);
    }
  }, [horizontalIndex, userVideos.length, maxVideosBeforeProfile, navigate, item.user_id, fetchUserVideos, loadingMore]);

  // Handle swipe right - go to previous video
  const handleSwipeRight = useCallback(() => {
    if (horizontalIndex > 0) {
      setHorizontalIndex(prev => prev - 1);
    }
  }, [horizontalIndex]);

  const currentVideo = userVideos[horizontalIndex] || item;

  return (
    <div className="relative w-full h-full overflow-hidden snap-start snap-always">
      <VideoDisplay
        item={currentVideo}
        isActive={isActive}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onFilterClick={onFilterClick}
        hasActiveGenre={hasActiveGenre}
        horizontalIndex={horizontalIndex}
        totalHorizontalItems={Math.min(userVideos.length, maxVideosBeforeProfile)}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        canSwipeRight={horizontalIndex > 0}
        hasSwipedUp={hasSwipedUp}
        hasSwipedHorizontal={hasSwipedHorizontal}
        onFirstSwipeUp={onFirstSwipeUp}
        onFirstHorizontalSwipe={onFirstHorizontalSwipe}
        onNavigateToProfile={handleNavigateToProfile}
        showCategoryBar={showCategoryBar}
        isImmersiveMode={isImmersiveMode}
        onToggleImmersiveMode={onToggleImmersiveMode}
      />
      
      {/* Loading indicator when fetching more */}
      {loadingMore && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full">
          <span className="text-white text-xs">Loading more...</span>
        </div>
      )}
    </div>
  );
};

// Main Auditions Page Component
const AuditionsPage = () => {
  const { isDark } = useTheme();
  const { isImmersiveMode, toggleImmersiveMode } = useImmersive();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const auditionsRef = useRef(null);
  const dropdownRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false); // Auto-play with sound by default
  const [auditions, setAuditions] = useState([]); // Start empty, load from API
  const [loading, setLoading] = useState(true); // Start loading
  const [activeCategory, setActiveCategory] = useState('featured');
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [activeGenre, setActiveGenre] = useState(null);
  const [genreFilterOpen, setGenreFilterOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownCategory, setDropdownCategory] = useState(null);
  const [hasSwipedUp, setHasSwipedUp] = useState(false);
  const [hasSwipedHorizontal, setHasSwipedHorizontal] = useState(false);
  const [showCategoryBar, setShowCategoryBar] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  // Enable audio playback after first user interaction (browser autoplay policy workaround)
  useEffect(() => {
    const enableAudioOnInteraction = () => {
      setUserInteracted(true);
      // Remove listeners after first interaction
      document.removeEventListener('click', enableAudioOnInteraction);
      document.removeEventListener('touchstart', enableAudioOnInteraction);
      document.removeEventListener('keydown', enableAudioOnInteraction);
    };

    document.addEventListener('click', enableAudioOnInteraction);
    document.addEventListener('touchstart', enableAudioOnInteraction);
    document.addEventListener('keydown', enableAudioOnInteraction);

    return () => {
      document.removeEventListener('click', enableAudioOnInteraction);
      document.removeEventListener('touchstart', enableAudioOnInteraction);
      document.removeEventListener('keydown', enableAudioOnInteraction);
    };
  }, []);

  // Check if user should see the welcome modal (first-time visitors only)
  useEffect(() => {
    if (currentUser) {
      const hasSeenWelcome = localStorage.getItem(`auditions_welcome_seen_${currentUser.id}`);
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true);
      }
    }
  }, [currentUser]);

  // Handle closing the welcome modal
  const handleCloseWelcomeModal = () => {
    if (currentUser) {
      localStorage.setItem(`auditions_welcome_seen_${currentUser.id}`, 'true');
    }
    setShowWelcomeModal(false);
  };

  // Track first vertical swipe
  const handleFirstSwipeUp = useCallback(() => {
    setHasSwipedUp(true);
  }, []);

  // Track first horizontal swipe
  const handleFirstHorizontalSwipe = useCallback(() => {
    setHasSwipedHorizontal(true);
  }, []);

  // Fetch auditions from API based on filters
  const fetchAuditions = useCallback(async (category, subcategory, genre) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (category === 'featured') {
        params.append('featured_only', 'true');
      } else if (category) {
        params.append('category', category);
        if (subcategory) {
          params.append('subcategory', subcategory);
        }
        if (genre) {
          params.append('genre', genre);
        }
      }
      
      const response = await api.get(`/auditions?${params.toString()}`);
      
      if (response.data && response.data.length > 0) {
        setAuditions(response.data);
      } else {
        // No videos available - show empty state
        setAuditions([]);
      }
      
      // Reset to first item when filter changes
      setCurrentIndex(0);
      
      // Scroll to top
      if (auditionsRef.current) {
        auditionsRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Failed to fetch auditions:', error);
      // Show empty state on error
      setAuditions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch auditions when category, subcategory, or genre changes
  useEffect(() => {
    fetchAuditions(activeCategory, activeSubcategory, activeGenre);
  }, [activeCategory, activeSubcategory, activeGenre, fetchAuditions]);

  // Handle genre selection
  const handleGenreSelect = (genre) => {
    setActiveGenre(genre);
    setGenreFilterOpen(false);
  };

  // Clear genre filter
  const clearGenreFilter = () => {
    setActiveGenre(null);
    setGenreFilterOpen(false);
  };

  // Handle category click
  const handleCategoryClick = (category) => {
    if (category.value === 'featured') {
      // Featured has no subcategories, just select it
      setActiveCategory('featured');
      setActiveSubcategory(null);
      setDropdownOpen(false);
      setDropdownCategory(null);
    } else if (category.subcategories && category.subcategories.length > 0) {
      // Category has subcategories
      if (dropdownOpen && dropdownCategory?.value === category.value) {
        // Clicking same category - close dropdown but KEEP this category selected
        setDropdownOpen(false);
        setDropdownCategory(null);
        // Category stays as activeCategory (already set or will be set)
        if (activeCategory !== category.value) {
          setActiveCategory(category.value);
          setActiveSubcategory(null);
        }
      } else {
        // Opening a new category's dropdown
        setDropdownOpen(true);
        setDropdownCategory(category);
        // Set this category as active immediately
        setActiveCategory(category.value);
        setActiveSubcategory(null);
      }
    }
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategory) => {
    setActiveCategory(dropdownCategory.value);
    setActiveSubcategory(subcategory);
    setDropdownOpen(false);
    setDropdownCategory(null);
  };

  // Handle click outside dropdown to close it
  const handleClickOutside = useCallback((e) => {
    if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      // Close dropdown but keep the current category selected
      setDropdownOpen(false);
      setDropdownCategory(null);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [dropdownOpen, handleClickOutside]);

  // Lock body scroll when on auditions page
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;
    const originalTouchAction = document.body.style.touchAction;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.touchAction = 'none';
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);

  // Track which video is in view using Intersection Observer
  useEffect(() => {
    const options = {
      root: auditionsRef.current,
      rootMargin: '0px',
      threshold: 0.6 // 60% visible triggers the callback
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.dataset.index, 10);
          setCurrentIndex(index);
          // Mark as swiped when user moves past first video
          if (index > 0) {
            setHasSwipedUp(true);
          }
        }
      });
    }, options);

    // Observe all audition items
    const items = auditionsRef.current?.querySelectorAll('[data-audition-item]');
    items?.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [auditions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' && currentIndex < auditions.length - 1) {
        const nextItem = auditionsRef.current?.querySelector(`[data-index="${currentIndex + 1}"]`);
        nextItem?.scrollIntoView({ behavior: 'smooth' });
        setHasSwipedUp(true);
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        const prevItem = auditionsRef.current?.querySelector(`[data-index="${currentIndex - 1}"]`);
        prevItem?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, auditions.length]);

  // Prevent scroll on outer container, allow only on feed
  const handleOuterTouch = (e) => {
    if (!auditionsRef.current?.contains(e.target)) {
      e.preventDefault();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSearchClick = () => {
    navigate('/search');
  };

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 ${isDark ? 'bg-dark-600' : 'bg-gray-900'} flex items-center justify-center pt-16`}
      style={{ touchAction: 'none' }}
      onTouchStart={handleOuterTouch}
      onTouchMove={handleOuterTouch}
    >
      {/* Mobile-width Feed Container */}
      <div className="relative w-full max-w-[430px] h-full bg-black">
        {/* Category Navigation Bar - Positioned below navbar */}
        <div 
          ref={dropdownRef}
          className={`absolute top-0 left-0 right-0 z-30 transition-all duration-500 ease-out ${
            isImmersiveMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`}
        >
          {/* Main category row */}
          <div className="bg-gradient-to-b from-black via-black/80 to-transparent pt-3 pb-2">
            <div className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-hide">
              {AUDITION_CATEGORIES.map((cat) => {
                // Determine if this category should be highlighted
                const isHighlighted = dropdownOpen 
                  ? dropdownCategory?.value === cat.value  // When dropdown open, only highlight the open dropdown's category
                  : activeCategory === cat.value;          // When dropdown closed, highlight active category
                
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleCategoryClick(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 text-sm font-semibold transition-all flex items-center gap-1 ${
                      isHighlighted
                        ? 'text-white border-b-2 border-white'
                        : 'text-white/70 hover:text-white'
                    }`}
                    data-testid={`audition-category-${cat.value}`}
                  >
                    {cat.label}
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <ChevronDown 
                        className={`w-3 h-3 transition-transform ${
                          dropdownOpen && dropdownCategory?.value === cat.value ? 'rotate-180' : ''
                        }`} 
                      />
                    )}
                  </button>
                );
              })}
              {/* Search Icon */}
              <button
                onClick={handleSearchClick}
                className="ml-auto pl-2 pr-1 flex-shrink-0"
                data-testid="audition-search-btn"
              >
                <Search className="w-5 h-5 text-white/80 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Subcategory Dropdown */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-out ${
              dropdownOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-black/95 backdrop-blur-sm border-t border-white/10 rounded-b-2xl mx-2 mb-2">
              <div className="max-h-56 overflow-y-auto py-2 px-3 scrollbar-hide">
                {dropdownCategory?.subcategories?.map((sub, index) => (
                  <button
                    key={index}
                    onClick={() => handleSubcategorySelect(sub)}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      activeSubcategory === sub
                        ? 'bg-white/20 text-white font-medium'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                    data-testid={`audition-subcategory-${sub.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Overlay to block auditions interaction when dropdown is open */}
        {dropdownOpen && (
          <div 
            className="absolute inset-0 z-20 bg-black/50"
            onClick={() => {
              setDropdownOpen(false);
              setDropdownCategory(null);
            }}
          />
        )}

        {/* Scrollable Feed */}
        <div 
          ref={auditionsRef}
          className={`h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide ${dropdownOpen ? 'pointer-events-none' : ''}`}
          style={{ 
            scrollSnapType: 'y mandatory',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
          data-testid="audition-container"
        >
          {/* Loading State */}
          {loading && (
            <div className="h-full w-full flex items-center justify-center bg-black">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-white/60 text-sm">Loading...</span>
              </div>
            </div>
          )}
          
          {/* No Results State */}
          {!loading && auditions.length === 0 && (
            <div className="h-full w-full flex items-center justify-center bg-black">
              <div className="flex flex-col items-center gap-6 text-center px-8 max-w-sm">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-10 h-10 text-white/40" />
                </div>
                <div>
                  <h3 className="text-white text-xl font-semibold mb-3">Uh oh!</h3>
                  <p className="text-white/70 text-base leading-relaxed">
                    Looks like there are no videos that are currently ready to show. Be the first to post a video today!
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (currentUser) {
                      navigate(`/profile/${currentUser.id}?scrollToMedia=true`);
                    } else {
                      navigate('/login');
                    }
                  }}
                  className="px-8 py-3 bg-primary text-black font-semibold rounded-full hover:bg-primary/90 transition-colors text-base"
                  data-testid="add-video-btn"
                >
                  Add a video!
                </button>
              </div>
            </div>
          )}
          
          {/* Audition Items */}
          {!loading && auditions.map((item, index) => (
            <div 
              key={item.id} 
              data-audition-item
              data-index={index}
              className="h-full w-full flex-shrink-0"
              style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
            >
              <AuditionItem 
                item={item} 
                isActive={index === currentIndex}
                isMuted={isMuted}
                onToggleMute={toggleMute}
                onFilterClick={() => setGenreFilterOpen(true)}
                hasActiveGenre={!!activeGenre}
                hasSwipedUp={hasSwipedUp}
                hasSwipedHorizontal={hasSwipedHorizontal}
                onFirstSwipeUp={handleFirstSwipeUp}
                onFirstHorizontalSwipe={handleFirstHorizontalSwipe}
                showCategoryBar={showCategoryBar}
                isImmersiveMode={isImmersiveMode}
                onToggleImmersiveMode={toggleImmersiveMode}
              />
            </div>
          ))}
        </div>

        {/* Genre Filter Modal */}
        {genreFilterOpen && (
          <div 
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/70"
            onClick={() => setGenreFilterOpen(false)}
          >
            <div 
              className="w-72 max-h-96 bg-gray-900/95 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/10">
                <h3 className="text-white font-semibold text-center">Filter by Genre</h3>
                {activeGenre && (
                  <p className="text-primary text-xs text-center mt-1">
                    Active: {activeGenre}
                  </p>
                )}
              </div>
              
              {/* Genre List */}
              <div className="max-h-72 overflow-y-auto py-2 px-2 scrollbar-hide">
                {/* Clear Filter Option */}
                {activeGenre && (
                  <button
                    onClick={clearGenreFilter}
                    className="w-full text-left px-4 py-3 text-sm rounded-xl mb-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    data-testid="audition-genre-clear"
                  >
                    Clear Filter
                  </button>
                )}
                
                {MUSIC_GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => handleGenreSelect(genre)}
                    className={`w-full text-left px-4 py-3 text-sm rounded-xl mb-1 transition-colors ${
                      activeGenre === genre
                        ? 'bg-primary text-black font-medium'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                    data-testid={`audition-genre-${genre.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {!loading && auditions.length > 0 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
          {auditions.map((_, index) => (
            <div 
              key={index}
              className={`w-1 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white h-6' 
                  : 'bg-white/30 h-4'
              }`}
            />
          ))}
        </div>
      )}

      {/* Removed duplicate swipe hint - now handled inside VideoDisplay component */}

      {/* First-Time Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl p-8 ${isDark ? 'bg-dark-200' : 'bg-white'} shadow-2xl`}>
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-primary" />
              </div>
            </div>
            
            {/* Title */}
            <h2 className={`text-2xl font-bold text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Hi there! 👋
            </h2>
            
            {/* Message */}
            <p className={`text-center mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              We know that the scroller for Auditions might be a tiny bit difficult to work with. We are currently developing native iOS and Android apps. So just bear with us as we get them up and running.
            </p>
            
            <p className={`text-center mb-8 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              In the meantime, enjoy MicLocker!
            </p>
            
            {/* Close Button */}
            <button
              onClick={handleCloseWelcomeModal}
              className="w-full py-3 px-6 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              data-testid="welcome-modal-close"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditionsPage;
