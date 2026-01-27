import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

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

const ProfileMap = ({ address, height = 352 }) => {
  const { isDark } = useTheme();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(!GOOGLE_MAPS_API_KEY ? 'Map unavailable' : null);

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;

    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapLoaded(true));
      if (window.google && window.google.maps) {
        setMapLoaded(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setError('Failed to load map');
    document.head.appendChild(script);
  }, []);

  // Initialize map and geocode address
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !address) return;
    if (!window.google || !window.google.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: location,
            zoom: 15,
            styles: isDark ? darkMapStyle : [],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
          });

          markerRef.current = new window.google.maps.Marker({
            position: location,
            map: mapInstanceRef.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#D4AF37',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
        } else {
          mapInstanceRef.current.setCenter(location);
          if (markerRef.current) {
            markerRef.current.setPosition(location);
          }
        }
      } else {
        setError('Location not found');
      }
    });
  }, [mapLoaded, address, isDark]);

  // Update map style when theme changes
  useEffect(() => {
    if (mapInstanceRef.current && window.google && window.google.maps) {
      mapInstanceRef.current.setOptions({
        styles: isDark ? darkMapStyle : []
      });
    }
  }, [isDark]);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center rounded-lg ${isDark ? 'bg-dark-400 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
        style={{ height }}
      >
        {error}
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className="w-full rounded-lg"
      style={{ height }}
    />
  );
};

export default ProfileMap;
