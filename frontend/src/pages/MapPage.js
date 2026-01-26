/**
 * MapPage Component
 * 
 * Interactive map view showing all users on Google Maps.
 * Features:
 * - Filter by profession category
 * - Distance radius filter from current location or chosen location
 * - Click on markers to see user details in bottom modal
 * - Clustered markers for users at approximate (city) locations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, Filter, X, ChevronLeft, ChevronRight, Star, 
  Navigation, Search, Loader2, Users, Sliders
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import GoldMemberBadge from '../components/GoldMemberBadge';
import api from '../services/api';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Category options for filtering
const CATEGORIES = [
  { value: '', label: 'All Professions', icon: '👥' },
  { value: 'musician', label: 'Musician', icon: '🎵' },
  { value: 'audio_engineer', label: 'Audio Engineer', icon: '🎛️' },
  { value: 'producer', label: 'Producer', icon: '🎹' },
  { value: 'venue', label: 'Venue', icon: '🏟️' },
  { value: 'studio', label: 'Studio', icon: '🎙️' },
  { value: 'merchant', label: 'Merchant', icon: '🛍️' },
  { value: 'comedian', label: 'Comedian', icon: '🎭' },
  { value: 'actor', label: 'Actor', icon: '🎬' },
];

// Distance radius options
const RADIUS_OPTIONS = [
  { value: null, label: 'No limit' },
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
  { value: 100, label: '100 miles' },
  { value: 250, label: '250 miles' },
];

const MapPage = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  
  // State
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [clusteredUsers, setClusteredUsers] = useState([]);
  const [clusterIndex, setClusterIndex] = useState(0);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState('');
  const [radius, setRadius] = useState(null);
  const [centerLocation, setCenterLocation] = useState(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    // Already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Wait for existing script to load
      existingScript.addEventListener('load', () => setMapLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => console.error('Failed to load Google Maps');
    document.head.appendChild(script);

    return () => {
      // Cleanup not needed for script tags
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const mapOptions = {
      center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
      zoom: 4,
      styles: isDark ? darkMapStyle : [],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
    infoWindowRef.current = new window.google.maps.InfoWindow();

    // Close modal when clicking on map (not marker)
    mapInstanceRef.current.addListener('click', () => {
      setSelectedUser(null);
      setClusteredUsers([]);
    });

  }, [mapLoaded, isDark]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (category) params.category = category;
      if (centerLocation && radius) {
        params.lat = centerLocation.lat;
        params.lng = centerLocation.lng;
        params.radius_miles = radius;
      }

      const response = await api.get('/map/users', { params });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching map users:', error);
    } finally {
      setLoading(false);
    }
  }, [category, centerLocation, radius]);

  useEffect(() => {
    if (mapLoaded) {
      fetchUsers();
    }
  }, [mapLoaded, fetchUsers]);

  // Update markers when users change
  useEffect(() => {
    // Ensure map and Google Maps API are fully ready
    if (!mapInstanceRef.current || !users.length) return;
    if (!window.google || !window.google.maps) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker && typeof marker.setMap === 'function') {
        marker.setMap(null);
      }
    });
    markersRef.current = [];

    // Group users by approximate location (for city-level clustering)
    const locationGroups = {};
    users.forEach(user => {
      if (!user.coordinates) return;
      
      // Round coordinates to group nearby approximate locations
      const key = user.is_approximate 
        ? `${user.coordinates.lat.toFixed(2)}_${user.coordinates.lng.toFixed(2)}`
        : `${user.coordinates.lat}_${user.coordinates.lng}`;
      
      if (!locationGroups[key]) {
        locationGroups[key] = [];
      }
      locationGroups[key].push(user);
    });

    // Create markers
    Object.entries(locationGroups).forEach(([key, groupUsers]) => {
      const firstUser = groupUsers[0];
      const isCluster = groupUsers.length > 1 && firstUser.is_approximate;

      const marker = new window.google.maps.Marker({
        position: { lat: firstUser.coordinates.lat, lng: firstUser.coordinates.lng },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isCluster ? 12 : 8,
          fillColor: getCategoryColor(firstUser.category),
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: isCluster ? `${groupUsers.length} users` : firstUser.username,
      });

      // Add cluster count label
      if (isCluster) {
        const label = new window.google.maps.Marker({
          position: { lat: firstUser.coordinates.lat, lng: firstUser.coordinates.lng },
          map: mapInstanceRef.current,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
          label: {
            text: String(groupUsers.length),
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 'bold',
          },
        });
        markersRef.current.push(label);
      }

      marker.addListener('click', () => {
        if (isCluster) {
          setClusteredUsers(groupUsers);
          setClusterIndex(0);
          setSelectedUser(groupUsers[0]);
        } else {
          setClusteredUsers([]);
          setSelectedUser(firstUser);
        }

        // Center map on marker
        mapInstanceRef.current.panTo(marker.getPosition());
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have users
    if (users.length > 0 && !centerLocation) {
      const bounds = new window.google.maps.LatLngBounds();
      users.forEach(user => {
        if (user.coordinates) {
          bounds.extend({ lat: user.coordinates.lat, lng: user.coordinates.lng });
        }
      });
      mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
    }

  }, [users, centerLocation]);

  // Get user's current location
  const getMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCenterLocation(loc);
        setUseMyLocation(true);
        setGettingLocation(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(loc);
          mapInstanceRef.current.setZoom(10);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please try searching for a location instead.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search for a location
  const searchForLocation = async () => {
    if (!searchLocation.trim()) return;

    try {
      const response = await api.post('/map/geocode', null, {
        params: { address: searchLocation }
      });
      
      const loc = response.data;
      setCenterLocation(loc);
      setUseMyLocation(false);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(loc);
        mapInstanceRef.current.setZoom(10);
      }
    } catch (error) {
      alert('Could not find that location. Please try a different search.');
    }
  };

  // Clear location filter
  const clearLocationFilter = () => {
    setCenterLocation(null);
    setRadius(null);
    setUseMyLocation(false);
    setSearchLocation('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: 39.8283, lng: -98.5795 });
      mapInstanceRef.current.setZoom(4);
    }
  };

  // Navigate clustered users
  const navigateCluster = (direction) => {
    if (clusteredUsers.length === 0) return;
    
    let newIndex = clusterIndex + direction;
    if (newIndex < 0) newIndex = clusteredUsers.length - 1;
    if (newIndex >= clusteredUsers.length) newIndex = 0;
    
    setClusterIndex(newIndex);
    setSelectedUser(clusteredUsers[newIndex]);
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      musician: '#FFD700',      // Gold
      audio_engineer: '#4CAF50', // Green
      producer: '#2196F3',      // Blue
      venue: '#9C27B0',         // Purple
      studio: '#FF5722',        // Deep Orange
      merchant: '#00BCD4',      // Cyan
      comedian: '#E91E63',      // Pink
      actor: '#FF9800',         // Orange
    };
    return colors[category] || '#757575';
  };

  // Get category label
  const getCategoryLabel = (category) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  return (
    <div className="h-screen flex flex-col" data-testid="map-page">
      {/* Header */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${isDark ? 'bg-dark-500 border-dark-300' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-primary" />
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Discover Pros
            </h1>
            {users.length > 0 && (
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {users.length} {users.length === 1 ? 'user' : 'users'} found
              </span>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${showFilters 
                ? 'bg-primary text-black' 
                : isDark ? 'bg-dark-400 text-white hover:bg-dark-300' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }
            `}
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {(category || radius) && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className={`flex-shrink-0 px-4 py-4 border-b ${isDark ? 'bg-dark-400 border-dark-300' : 'bg-gray-50 border-gray-200'}`}>
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Category Filter */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Profession
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1
                      ${category === cat.value
                        ? 'bg-primary text-black font-medium'
                        : isDark ? 'bg-dark-300 text-gray-300 hover:bg-dark-200' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }
                    `}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location & Distance Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* My Location */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Your Location
                </label>
                <button
                  onClick={getMyLocation}
                  disabled={gettingLocation}
                  className={`
                    w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors
                    ${useMyLocation
                      ? 'bg-primary text-black'
                      : isDark ? 'bg-dark-300 text-white hover:bg-dark-200' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  {gettingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  <span>{useMyLocation ? 'Using My Location' : 'Use My Location'}</span>
                </button>
              </div>

              {/* Search Location */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Or Search Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchForLocation()}
                    placeholder="City, State or ZIP"
                    className={`
                      flex-1 px-3 py-2 rounded-lg text-sm
                      ${isDark ? 'bg-dark-300 text-white border-dark-200' : 'bg-white text-gray-900 border-gray-200'}
                      border focus:ring-2 focus:ring-primary focus:border-transparent
                    `}
                  />
                  <button
                    onClick={searchForLocation}
                    className="px-3 py-2 bg-primary text-black rounded-lg hover:bg-primary/90"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Radius */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Distance Radius
                </label>
                <select
                  value={radius || ''}
                  onChange={(e) => setRadius(e.target.value ? Number(e.target.value) : null)}
                  disabled={!centerLocation}
                  className={`
                    w-full px-3 py-2 rounded-lg text-sm
                    ${isDark ? 'bg-dark-300 text-white border-dark-200' : 'bg-white text-gray-900 border-gray-200'}
                    border focus:ring-2 focus:ring-primary focus:border-transparent
                    ${!centerLocation ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {RADIUS_OPTIONS.map((opt) => (
                    <option key={opt.value || 'none'} value={opt.value || ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(category || centerLocation || radius) && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setCategory('');
                    clearLocationFilter();
                  }}
                  className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-white">Loading map...</span>
            </div>
          </div>
        )}

        <div ref={mapRef} className="w-full h-full" />

        {/* Legend */}
        <div className={`
          absolute top-4 right-4 p-3 rounded-lg shadow-lg z-10
          ${isDark ? 'bg-dark-400' : 'bg-white'}
        `}>
          <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Legend</p>
          <div className="space-y-1">
            {CATEGORIES.slice(1).map((cat) => (
              <div key={cat.value} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getCategoryColor(cat.value) }}
                />
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {cat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Info Modal (Bottom Sheet) */}
      {selectedUser && (
        <div className={`
          absolute bottom-0 left-0 right-0 z-20
          ${isDark ? 'bg-dark-400' : 'bg-white'}
          rounded-t-2xl shadow-2xl
          transform transition-transform duration-300
        `}>
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-dark-200' : 'bg-gray-300'}`} />
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setSelectedUser(null);
              setClusteredUsers([]);
            }}
            className={`
              absolute top-3 right-3 p-1 rounded-full
              ${isDark ? 'bg-dark-300 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}
            `}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Cluster navigation */}
          {clusteredUsers.length > 1 && (
            <div className="flex items-center justify-center gap-4 pb-2">
              <button
                onClick={() => navigateCluster(-1)}
                className={`p-2 rounded-full ${isDark ? 'bg-dark-300 hover:bg-dark-200' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
              </button>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {clusterIndex + 1} of {clusteredUsers.length} users at this location
              </span>
              <button
                onClick={() => navigateCluster(1)}
                className={`p-2 rounded-full ${isDark ? 'bg-dark-300 hover:bg-dark-200' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <ChevronRight className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
              </button>
            </div>
          )}

          {/* User Info */}
          <div className="px-4 pb-6">
            <div className="flex items-start gap-4">
              {/* Profile Image */}
              <Link to={`/profile/${selectedUser.id}`}>
                {selectedUser.profile_image ? (
                  <img
                    src={selectedUser.profile_image}
                    alt={selectedUser.username}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className={`
                    w-16 h-16 rounded-xl flex items-center justify-center
                    ${isDark ? 'bg-dark-300' : 'bg-gray-200'}
                  `}>
                    <span className="text-2xl font-bold text-primary">
                      {selectedUser.username?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>

              {/* User Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link 
                    to={`/profile/${selectedUser.id}`}
                    className={`font-semibold truncate hover:underline ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {selectedUser.username}
                  </Link>
                  {(selectedUser.is_gold_member || selectedUser.is_founder) && (
                    <GoldMemberBadge isFounder={selectedUser.is_founder} size="sm" />
                  )}
                </div>

                {/* Category & Rating */}
                <div className="flex items-center gap-3 mt-1">
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: getCategoryColor(selectedUser.category) }}
                  >
                    {getCategoryLabel(selectedUser.category)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-primary fill-primary" />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {selectedUser.rating?.toFixed(1) || '0.0'}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      ({selectedUser.review_count || 0})
                    </span>
                  </div>
                </div>

                {/* Genres */}
                {selectedUser.genres?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedUser.genres.slice(0, 3).map((genre, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {genre}
                      </span>
                    ))}
                    {selectedUser.genres.length > 3 && (
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        +{selectedUser.genres.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Location & Distance */}
                <div className={`flex items-center gap-1 mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <MapPin className="w-3 h-3" />
                  <span>{selectedUser.display_location}</span>
                  {selectedUser.distance_miles !== undefined && (
                    <span className="ml-2">({selectedUser.distance_miles} mi away)</span>
                  )}
                  {selectedUser.is_approximate && (
                    <span className={`text-xs italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      (approximate)
                    </span>
                  )}
                </div>

                {/* Bio excerpt */}
                {selectedUser.bio && (
                  <p className={`text-sm mt-2 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedUser.bio}
                  </p>
                )}
              </div>
            </div>

            {/* View Profile Button */}
            <Link
              to={`/profile/${selectedUser.id}`}
              className="block w-full mt-4 py-2.5 bg-primary text-black text-center font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              View Full Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// Dark mode map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

export default MapPage;
