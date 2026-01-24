/**
 * GigCard Component
 * 
 * Displays a single gig in a card format with:
 * - Slideable image gallery with thumbnails
 * - User profile photo
 * - Category icon and type badge
 * - Description, location, budget info
 * - Genres and subcategories tags
 * 
 * UI/UX: Unchanged from original implementation
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, MapPin, DollarSign, Eye,
  Image, Video, User, Play
} from 'lucide-react';
import { CATEGORY_ICONS, PLACEHOLDER_IMAGES } from './constants';

const GigCard = ({ gig, onClick, placeholderIndex }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Get media from gig (should now have multiple images from database)
  const allMedia = gig.media?.length > 0 
    ? gig.media 
    : [{ url: PLACEHOLDER_IMAGES[placeholderIndex % PLACEHOLDER_IMAGES.length], media_type: 'image' }];
  
  const nextSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide(prev => (prev + 1) % allMedia.length);
  };
  
  const prevSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide(prev => (prev - 1 + allMedia.length) % allMedia.length);
  };

  const goToSlide = (e, idx) => {
    e.stopPropagation();
    setCurrentSlide(idx);
  };

  return (
    <div onClick={onClick} className="bg-dark-400 rounded-xl overflow-hidden cursor-pointer hover:bg-dark-300 transition-colors" data-testid={`gig-card-${gig.id}`}>
      {/* Thumbnail Slider - increased height to 72 (288px) from 48 (192px) = +96px */}
      <div className="relative h-72 bg-dark-500">
        {allMedia[currentSlide]?.media_type === 'video' ? (
          <div className="w-full h-full flex items-center justify-center bg-dark-600">
            <Play className="w-16 h-16 text-primary" />
          </div>
        ) : (
          <img 
            src={allMedia[currentSlide]?.url} 
            alt={gig.title} 
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center' }}
          />
        )}
        
        {/* Slide navigation arrows */}
        {allMedia.length > 1 && (
          <>
            <button 
              onClick={prevSlide} 
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={nextSlide} 
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            {/* Thumbnail strip at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex gap-2 justify-center overflow-x-auto">
                {allMedia.map((media, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => goToSlide(e, idx)}
                    className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      idx === currentSlide ? 'border-primary scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {media.media_type === 'video' ? (
                      <div className="w-full h-full bg-dark-600 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        
        {/* Media count badge */}
        {allMedia.length > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 rounded-lg text-xs text-white flex items-center gap-1">
            <Image className="w-3 h-3" />
            {allMedia.filter(m => m.media_type === 'image').length}
            {allMedia.filter(m => m.media_type === 'video').length > 0 && (
              <>
                <Video className="w-3 h-3 ml-1" />
                {allMedia.filter(m => m.media_type === 'video').length}
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-5">
        {/* Header row: User photo, Category icon, Type badge */}
        <div className="flex items-center gap-2 mb-3">
          {/* User profile photo */}
          <Link to={`/profile/${gig.user_id}`} onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
            {gig.user_profile_image ? (
              <img src={gig.user_profile_image} alt={gig.username} className="w-8 h-8 rounded-full object-cover border-2 border-dark-300" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-dark-300 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </Link>
          
          {/* Category icon */}
          <span className="text-xl">{CATEGORY_ICONS[gig.category]}</span>
          
          {/* Type badge */}
          <span className={`badge ${gig.gig_type === 'looking_for' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
            {gig.gig_type === 'looking_for' ? 'Looking For' : 'Services'}
          </span>
          
          {/* View count */}
          <span className="ml-auto text-gray-500 text-sm flex items-center gap-1">
            <Eye className="w-4 h-4" /> {gig.view_count}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-1">{gig.title}</h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{gig.description}</p>
        
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to={`/profile/${gig.user_id}`} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
            @{gig.username}
          </Link>
          
          {gig.location && (
            <span className="text-gray-500 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {gig.location}
            </span>
          )}
          
          {gig.budget_range && (
            <span className="text-gray-500 flex items-center gap-1">
              <DollarSign className="w-4 h-4" /> {gig.budget_range}
            </span>
          )}
        </div>
        
        {/* Genres */}
        {gig.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {gig.genres.slice(0, 4).map(genre => (
              <span key={genre} className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">{genre}</span>
            ))}
            {gig.genres.length > 4 && (
              <span className="px-2 py-1 bg-dark-500 rounded text-xs text-gray-400">+{gig.genres.length - 4}</span>
            )}
          </div>
        )}
        
        {/* Subcategories */}
        {gig.subcategories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {gig.subcategories.slice(0, 4).map(sub => (
              <span key={sub} className="px-2 py-1 bg-dark-500 rounded text-xs text-gray-400">{sub}</span>
            ))}
            {gig.subcategories.length > 4 && (
              <span className="px-2 py-1 bg-dark-500 rounded text-xs text-gray-400">+{gig.subcategories.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GigCard;
