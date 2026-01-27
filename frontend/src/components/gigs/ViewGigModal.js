/**
 * ViewGigModal Component
 * 
 * Full-screen modal for viewing gig details with:
 * - Image/video gallery with navigation
 * - Full description
 * - Contact information
 * - Music platform links (Apple Music, Spotify, SoundCloud)
 * - Owner actions (delete)
 * 
 * UI/UX: Unchanged from original implementation
 */

import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  X, ChevronLeft, ChevronRight, MapPin, DollarSign, Eye,
  Mail, Phone, Trash2, User, Play, Globe, ExternalLink,
  Music, Maximize
} from 'lucide-react';
import { CATEGORY_ICONS, CATEGORY_LABELS } from './constants';

const ViewGigModal = ({ gig, isOwner, onClose, onDelete }) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const videoRef = useRef(null);
  const allMedia = gig.media?.length > 0 ? gig.media : [];
  const socialLinks = gig.social_links ? Object.entries(gig.social_links).filter(([_, v]) => v) : [];

  const nextMedia = () => {
    setActiveMediaIndex(prev => (prev + 1) % allMedia.length);
  };

  const prevMedia = () => {
    setActiveMediaIndex(prev => (prev - 1 + allMedia.length) % allMedia.length);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      // iOS Safari
      video.webkitEnterFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-400 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
        <div className="sticky top-0 bg-dark-400 px-6 py-4 border-b border-dark-300 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {gig.user_profile_image ? (
              <img src={gig.user_profile_image} alt={gig.username} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-dark-300 flex items-center justify-center"><User className="w-5 h-5 text-gray-500" /></div>
            )}
            <span className="text-2xl">{CATEGORY_ICONS[gig.category]}</span>
            <span className={`badge ${gig.gig_type === 'looking_for' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
              {gig.gig_type === 'looking_for' ? 'Looking For' : 'Services'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && <button onClick={onDelete} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 text-red-400"><Trash2 className="w-5 h-5" /></button>}
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="p-6">
          {/* Media Gallery - Full width with navigation */}
          {allMedia.length > 0 && (
            <div className="mb-6">
              {/* Main image/video display */}
              <div className="relative h-96 bg-dark-500 rounded-xl mb-3">
                {allMedia[activeMediaIndex]?.media_type === 'video' ? (
                  <>
                    <video 
                      ref={videoRef}
                      src={allMedia[activeMediaIndex].url} 
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-black rounded-xl"
                      style={{ display: 'block' }}
                    />
                    {/* Custom fullscreen button */}
                    <button 
                      onClick={handleFullscreen}
                      className="absolute top-3 left-3 p-2 bg-black/70 rounded-lg text-white hover:bg-primary hover:text-black transition-colors z-10"
                      title="Fullscreen"
                    >
                      <Maximize className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <img 
                    src={allMedia[activeMediaIndex]?.url} 
                    alt={gig.title} 
                    className="w-full h-full object-cover rounded-xl"
                    style={{ objectPosition: 'center' }}
                  />
                )}
                
                {/* Navigation arrows */}
                {allMedia.length > 1 && (
                  <>
                    <button 
                      onClick={prevMedia}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={nextMedia}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    
                    {/* Image counter */}
                    <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 rounded-lg text-white text-sm">
                      {activeMediaIndex + 1} / {allMedia.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Thumbnail strip */}
              {allMedia.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allMedia.map((m, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        activeMediaIndex === idx ? 'border-primary scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      {m.media_type === 'video' ? (
                        <div className="w-full h-full bg-dark-600 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <h2 className="text-2xl font-bold text-white mb-2">{gig.title}</h2>
          <p className="text-primary mb-4">{CATEGORY_LABELS[gig.category]}</p>
          
          {/* Genres */}
          {gig.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {gig.genres.map(genre => <span key={genre} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">{genre}</span>)}
            </div>
          )}
          
          {/* Subcategories */}
          {gig.subcategories?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {gig.subcategories.map(sub => <span key={sub} className="px-3 py-1 bg-dark-500 rounded-full text-sm text-gray-300">{sub}</span>)}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <Link to={`/profile/${gig.user_id}`} className="flex items-center gap-2 text-primary hover:underline">
              {gig.user_profile_image ? <img src={gig.user_profile_image} alt="" className="w-6 h-6 rounded-full" /> : <User className="w-6 h-6" />}
              @{gig.username}
            </Link>
            {gig.location && <span className="text-gray-400 flex items-center gap-1"><MapPin className="w-4 h-4" /> {gig.location}</span>}
            {gig.budget_range && <span className="text-gray-400 flex items-center gap-1"><DollarSign className="w-4 h-4" /> {gig.budget_range}</span>}
            <span className="text-gray-500 flex items-center gap-1"><Eye className="w-4 h-4" /> {gig.view_count} views</span>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{gig.description}</p>
          </div>

          {(gig.contact_email || gig.contact_phone) && (
            <div className="mb-6 p-4 bg-dark-500 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-3">Contact</h3>
              <div className="flex flex-wrap gap-4">
                {gig.contact_email && <a href={`mailto:${gig.contact_email}`} className="flex items-center gap-2 text-primary hover:underline"><Mail className="w-5 h-5" />{gig.contact_email}</a>}
                {gig.contact_phone && <a href={`tel:${gig.contact_phone}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="w-5 h-5" />{gig.contact_phone}</a>}
              </div>
            </div>
          )}

          {socialLinks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Music Platforms</h3>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map(([key, url]) => {
                  const icons = { website: Globe, apple_music: Music, spotify: Music, soundcloud: Music };
                  const labels = { website: 'Website', apple_music: 'Apple Music', spotify: 'Spotify', soundcloud: 'SoundCloud' };
                  const Icon = icons[key] || Globe;
                  const label = labels[key] || key;
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-dark-500 rounded-lg text-gray-300 hover:text-primary hover:bg-dark-400 transition-colors">
                      <Icon className="w-5 h-5" /><span>{label}</span><ExternalLink className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-gray-500 text-sm">Posted {new Date(gig.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
};

export default ViewGigModal;
