/**
 * CreateGigModal Component
 * 
 * Multi-step modal for creating a new gig:
 * - Step 1: Type selection (Looking For / Services) + Category + Subcategories + Genres
 * - Step 2: Title, Description, Location, Budget
 * - Step 3: Media upload, Contact info, Social links
 * 
 * UI/UX: Unchanged from original implementation
 */

import React, { useState, useRef } from 'react';
import {
  X, ChevronDown, ChevronUp, MapPin, DollarSign, Mail, Phone,
  Image, Video, Search, Briefcase, Check, AlertCircle,
  Instagram, Facebook, Twitter, Youtube, Globe, Music
} from 'lucide-react';
import useS3Upload from '../../hooks/useS3Upload';
import { gigsAPI } from '../../services/api';

const CreateGigModal = ({ categories, onClose, onSuccess }) => {
  const { uploadFile, uploading } = useS3Upload();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    gig_type: 'looking_for',
    title: '',
    description: '',
    category: '',
    subcategories: [],
    genres: [],
    media: [],
    social_links: { website: '', instagram: '', facebook: '', twitter: '', youtube: '', tiktok: '', soundcloud: '', spotify: '', bandcamp: '', linkedin: '' },
    contact_email: '',
    contact_phone: '',
    location: '',
    budget_range: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [showSocialLinks, setShowSocialLinks] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const currentImages = formData.media.filter(m => m.media_type === 'image').length;
    const currentVideos = formData.media.filter(m => m.media_type === 'video').length;
    
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (isImage && currentImages >= 5) { setError('Maximum 5 photos allowed'); continue; }
      if (isVideo && currentVideos >= 5) { setError('Maximum 5 videos allowed'); continue; }
      
      try {
        const result = await uploadFile(file, 'gigs');
        if (result.url) {
          setFormData(prev => ({
            ...prev,
            media: [...prev.media, { url: result.url, media_type: isVideo ? 'video' : 'image' }]
          }));
        }
      } catch (err) { setError(`Failed to upload ${file.name}`); }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (index) => {
    setFormData(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
  };

  const toggleSubcategory = (subcat) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.includes(subcat) ? prev.subcategories.filter(s => s !== subcat) : [...prev.subcategories, subcat]
    }));
  };

  const toggleGenre = (genre) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre) ? prev.genres.filter(g => g !== genre) : [...prev.genres, genre]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const cleanSocialLinks = Object.fromEntries(Object.entries(formData.social_links).filter(([_, v]) => v.trim()));
      const submitData = { ...formData, social_links: Object.keys(cleanSocialLinks).length > 0 ? cleanSocialLinks : null };
      await gigsAPI.create(submitData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create gig');
    } finally { setLoading(false); }
  };

  // Categories that don't require music genre selection
  const genreOptionalCategories = ['comedian', 'actor'];
  const isGenreRequired = formData.category && !genreOptionalCategories.includes(formData.category);
  const hasRequiredGenres = !isGenreRequired || formData.genres.length > 0;

  // Media is required - at least one photo or video
  const hasRequiredMedia = formData.media.length > 0;

  const canProceedStep1 = formData.gig_type && formData.category && hasRequiredGenres;
  const canProceedStep2 = formData.title.length >= 5 && formData.description.length >= 20;
  const canSubmit = hasRequiredMedia;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-400 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
        <div className="sticky top-0 bg-dark-400 px-6 py-4 border-b border-dark-300 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">
            {step === 1 && 'Post a Gig - Type & Category'}
            {step === 2 && 'Post a Gig - Details'}
            {step === 3 && 'Post a Gig - Media & Contact'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 font-medium mb-3">What type of post is this?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setFormData({ ...formData, gig_type: 'looking_for' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${formData.gig_type === 'looking_for' ? 'border-primary bg-primary/10' : 'border-dark-300 bg-dark-500 hover:border-dark-200'}`}>
                    <Search className={`w-8 h-8 mb-2 ${formData.gig_type === 'looking_for' ? 'text-primary' : 'text-gray-400'}`} />
                    <h4 className={`font-semibold ${formData.gig_type === 'looking_for' ? 'text-primary' : 'text-white'}`}>Looking For</h4>
                    <p className="text-gray-400 text-sm mt-1">Post what you need</p>
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, gig_type: 'services' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${formData.gig_type === 'services' ? 'border-primary bg-primary/10' : 'border-dark-300 bg-dark-500 hover:border-dark-200'}`}>
                    <Briefcase className={`w-8 h-8 mb-2 ${formData.gig_type === 'services' ? 'text-primary' : 'text-gray-400'}`} />
                    <h4 className={`font-semibold ${formData.gig_type === 'services' ? 'text-primary' : 'text-white'}`}>Services</h4>
                    <p className="text-gray-400 text-sm mt-1">Share what you offer</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-3">Select a category</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories?.categories?.map(cat => (
                    <button key={cat.value} type="button" onClick={() => setFormData({ ...formData, category: cat.value, subcategories: [] })}
                      className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${formData.category === cat.value ? 'border-primary bg-primary/10' : 'border-dark-300 bg-dark-500 hover:border-dark-200'}`}>
                      <span className="text-2xl">{cat.icon}</span>
                      <span className={`font-medium ${formData.category === cat.value ? 'text-primary' : 'text-white'}`}>{cat.label}</span>
                      {formData.category === cat.value && <Check className="w-5 h-5 text-primary ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {formData.category && (
                <div>
                  <label className="block text-gray-300 font-medium mb-3">Select subcategories (optional)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-dark-500 rounded-xl">
                    {categories?.subcategories?.[formData.category]?.map(subcat => (
                      <button key={subcat} type="button" onClick={() => toggleSubcategory(subcat)}
                        className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${formData.subcategories.includes(subcat) ? 'bg-primary text-black font-medium' : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300'}`}>
                        {subcat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Genre selection */}
              <div>
                <label className="block text-gray-300 font-medium mb-3">
                  Select music genres {isGenreRequired ? <span className="text-red-400">*</span> : '(optional)'}
                  {isGenreRequired && formData.genres.length === 0 && (
                    <span className="text-red-400 text-sm font-normal ml-2">— At least one genre required</span>
                  )}
                </label>
                <p className="text-gray-500 text-sm mb-2">
                  {isGenreRequired 
                    ? 'Select all genres that apply to help others find your gig'
                    : 'Optional for Comedy and Acting categories'}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-dark-500 rounded-xl">
                  {categories?.genres?.map(genre => (
                    <button key={genre} type="button" onClick={() => toggleGenre(genre)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${formData.genres.includes(genre) ? 'bg-primary text-black font-medium' : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300'}`}>
                      {genre}
                    </button>
                  ))}
                </div>
                {formData.genres.length > 0 && (
                  <p className="text-primary text-sm mt-2">
                    Selected: {formData.genres.join(', ')}
                  </p>
                )}
              </div>

              <button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full btn btn-primary disabled:opacity-50">Continue</button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={formData.gig_type === 'looking_for' ? "e.g., Looking for a drummer for upcoming tour" : "e.g., Professional mixing and mastering services"}
                  className="w-full px-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" maxLength={200} />
                <p className="text-gray-500 text-xs mt-1">{formData.title.length}/200</p>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-2">Description *</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details..." rows={6} className="w-full px-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white resize-none" maxLength={5000} />
                <p className="text-gray-500 text-xs mt-1">{formData.description.length}/5000 (min 20)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Los Angeles, CA" className="w-full pl-10 pr-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Budget/Rate</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="text" value={formData.budget_range} onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                      placeholder="e.g., $500-1000" className="w-full pl-10 pr-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(3)} disabled={!canProceedStep2} className="btn btn-primary flex-1 disabled:opacity-50">Continue</button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Photos & Videos <span className="text-red-400">*</span>
                  {!hasRequiredMedia && (
                    <span className="text-red-400 text-sm font-normal ml-2">— At least one photo or video required</span>
                  )}
                </label>
                <p className="text-gray-500 text-sm mb-3">Upload at least 1 photo or video (up to 5 each)</p>
                
                {formData.media.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {formData.media.map((m, idx) => (
                      <div key={idx} className="relative aspect-square bg-dark-500 rounded-lg overflow-hidden">
                        {m.media_type === 'video' ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                        <button onClick={() => removeMedia(idx)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full"><X className="w-4 h-4 text-white" /></button>
                        {m.media_type === 'video' && <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/70 rounded text-xs text-white"><Video className="w-3 h-3 inline" /> Video</div>}
                      </div>
                    ))}
                  </div>
                )}
                
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" multiple className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-full py-3 border-2 border-dashed border-dark-300 rounded-xl text-gray-400 hover:text-white hover:border-primary transition-colors flex items-center justify-center gap-2">
                  {uploading ? 'Uploading...' : <><Image className="w-5 h-5" />Add Photos/Videos</>}
                </button>
                <p className="text-gray-500 text-xs mt-1">Photos: {formData.media.filter(m => m.media_type === 'image').length}/5 • Videos: {formData.media.filter(m => m.media_type === 'video').length}/5</p>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-3">Contact Information</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="Email address" className="w-full pl-10 pr-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="tel" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="Phone number" className="w-full pl-10 pr-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" />
                  </div>
                </div>
              </div>

              <div>
                <button type="button" onClick={() => setShowSocialLinks(!showSocialLinks)} className="flex items-center gap-2 text-gray-300 hover:text-white">
                  {showSocialLinks ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  <span className="font-medium">Social Media Links (optional)</span>
                </button>
                
                {showSocialLinks && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {[
                      { key: 'website', icon: Globe, placeholder: 'Website URL' },
                      { key: 'instagram', icon: Instagram, placeholder: 'Instagram URL' },
                      { key: 'facebook', icon: Facebook, placeholder: 'Facebook URL' },
                      { key: 'twitter', icon: Twitter, placeholder: 'Twitter/X URL' },
                      { key: 'youtube', icon: Youtube, placeholder: 'YouTube URL' },
                      { key: 'soundcloud', icon: Music, placeholder: 'SoundCloud URL' },
                      { key: 'spotify', icon: Music, placeholder: 'Spotify URL' },
                      { key: 'bandcamp', icon: Music, placeholder: 'Bandcamp URL' },
                    ].map(({ key, icon: Icon, placeholder }) => (
                      <div key={key} className="relative">
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input type="url" value={formData.social_links[key]} onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, [key]: e.target.value } })}
                          placeholder={placeholder} className="w-full pl-10 pr-4 py-2 bg-dark-500 border border-dark-300 rounded-lg text-white text-sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn btn-secondary flex-1">Back</button>
                <button onClick={handleSubmit} disabled={loading || !canSubmit} className="btn btn-primary flex-1 disabled:opacity-50">{loading ? 'Posting...' : 'Post Gig'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateGigModal;
