/**
 * SpotifyPlayer Component
 * 
 * A neumorphic-styled Spotify embed player for user profiles.
 * Displays a user's Spotify content (artist, track, album, or playlist)
 * with custom neumorphic styling to match MicLocker's design.
 */

import React, { useState, useMemo } from 'react';
import { Music, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Extracts Spotify URI/embed URL from various input formats
 * Supports: 
 * - Full URLs: https://open.spotify.com/artist/xxx
 * - Embed URLs: https://open.spotify.com/embed/artist/xxx
 * - Spotify URIs: spotify:artist:xxx
 */
const parseSpotifyUrl = (input) => {
  if (!input) return null;
  
  // Already an embed URL
  if (input.includes('/embed/')) {
    return input;
  }
  
  // Standard Spotify URL (open.spotify.com/artist/xxx)
  const urlMatch = input.match(/open\.spotify\.com\/(artist|track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return `https://open.spotify.com/embed/${urlMatch[1]}/${urlMatch[2]}?utm_source=generator&theme=0`;
  }
  
  // Spotify URI (spotify:artist:xxx)
  const uriMatch = input.match(/spotify:(artist|track|album|playlist):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}?utm_source=generator&theme=0`;
  }
  
  // If it's just an ID, assume it's an artist
  if (/^[a-zA-Z0-9]{22}$/.test(input)) {
    return `https://open.spotify.com/embed/artist/${input}?utm_source=generator&theme=0`;
  }
  
  return null;
};

const SpotifyPlayer = ({ spotifyUrl, username, compact = false }) => {
  const { isDark } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const embedUrl = useMemo(() => parseSpotifyUrl(spotifyUrl), [spotifyUrl]);
  
  if (!embedUrl) return null;
  
  // Extract the original Spotify link for external link
  const originalUrl = spotifyUrl?.includes('open.spotify.com') 
    ? spotifyUrl.replace('/embed/', '/') 
    : embedUrl.replace('/embed/', '/').split('?')[0];

  if (hasError) {
    return (
      <div className={`
        rounded-2xl p-6 text-center
        ${isDark 
          ? 'bg-dark-400 shadow-[8px_8px_16px_#0d0d0d,-8px_-8px_16px_#252525]' 
          : 'bg-gray-100 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff]'
        }
      `}>
        <Music className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          Unable to load Spotify content
        </p>
      </div>
    );
  }

  return (
    <div className={`
      relative rounded-2xl overflow-hidden transition-all duration-300
      ${isDark 
        ? 'bg-dark-400 shadow-[12px_12px_24px_#0a0a0a,-12px_-12px_24px_#2a2a2a]' 
        : 'bg-gray-100 shadow-[12px_12px_24px_#c5c5c5,-12px_-12px_24px_#ffffff]'
      }
    `}>
      {/* Neumorphic Header */}
      <div className={`
        flex items-center justify-between px-4 py-3
        ${isDark 
          ? 'bg-dark-500 border-b border-dark-300' 
          : 'bg-gray-50 border-b border-gray-200'
        }
      `}>
        <div className="flex items-center gap-3">
          {/* Neumorphic play indicator */}
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${isDark 
              ? 'bg-dark-400 shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#252525]' 
              : 'bg-gray-100 shadow-[inset_4px_4px_8px_#d1d1d1,inset_-4px_-4px_8px_#ffffff]'
            }
          `}>
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Music className="w-3 h-3 text-black" />
            </div>
          </div>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {username ? `${username}'s Music` : 'Now Playing'}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Powered by Spotify
            </p>
          </div>
        </div>
        
        {/* Neumorphic control buttons */}
        <div className="flex items-center gap-2">
          {/* Mute toggle button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`
              w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200
              ${isDark 
                ? `bg-dark-400 ${isMuted 
                    ? 'shadow-[inset_3px_3px_6px_#0d0d0d,inset_-3px_-3px_6px_#252525]' 
                    : 'shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#252525] hover:shadow-[2px_2px_4px_#0d0d0d,-2px_-2px_4px_#252525]'
                  }`
                : `bg-gray-100 ${isMuted 
                    ? 'shadow-[inset_3px_3px_6px_#d1d1d1,inset_-3px_-3px_6px_#ffffff]' 
                    : 'shadow-[4px_4px_8px_#d1d1d1,-4px_-4px_8px_#ffffff] hover:shadow-[2px_2px_4px_#d1d1d1,-2px_-2px_4px_#ffffff]'
                  }`
              }
            `}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`} />
            ) : (
              <Volume2 className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            )}
          </button>
          
          {/* Open in Spotify button */}
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200
              ${isDark 
                ? 'bg-dark-400 shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#252525] hover:shadow-[2px_2px_4px_#0d0d0d,-2px_-2px_4px_#252525]' 
                : 'bg-gray-100 shadow-[4px_4px_8px_#d1d1d1,-4px_-4px_8px_#ffffff] hover:shadow-[2px_2px_4px_#d1d1d1,-2px_-2px_4px_#ffffff]'
              }
            `}
            title="Open in Spotify"
          >
            <ExternalLink className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </a>
        </div>
      </div>
      
      {/* Spotify Embed iframe */}
      <div className={`
        relative
        ${isDark 
          ? 'bg-dark-500' 
          : 'bg-gray-50'
        }
      `}>
        {!isLoaded && (
          <div className={`
            absolute inset-0 flex items-center justify-center
            ${isDark ? 'bg-dark-500' : 'bg-gray-50'}
          `}>
            <div className="flex flex-col items-center gap-3">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center animate-pulse
                ${isDark 
                  ? 'bg-dark-400 shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#252525]' 
                  : 'bg-gray-100 shadow-[inset_4px_4px_8px_#d1d1d1,inset_-4px_-4px_8px_#ffffff]'
                }
              `}>
                <Music className={`w-5 h-5 ${isDark ? 'text-primary' : 'text-primary'}`} />
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Loading player...
              </p>
            </div>
          </div>
        )}
        
        <iframe
          src={embedUrl}
          width="100%"
          height={compact ? "152" : "352"}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`
            transition-opacity duration-500
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            borderRadius: '0 0 16px 16px',
            backgroundColor: isDark ? '#121212' : '#f3f4f6',
          }}
          title={`${username || 'User'}'s Spotify Player`}
        />
      </div>
      
      {/* Neumorphic bottom accent */}
      <div className={`
        h-1 w-full
        ${isDark 
          ? 'bg-gradient-to-r from-dark-400 via-primary/30 to-dark-400' 
          : 'bg-gradient-to-r from-gray-100 via-primary/30 to-gray-100'
        }
      `} />
    </div>
  );
};

export default SpotifyPlayer;
