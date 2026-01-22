import React, { useState, useCallback, useEffect } from 'react';
import { Upload, X, Image, Video, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import useS3Upload from '../hooks/useS3Upload';
import { useTheme } from '../context/ThemeContext';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

const S3MediaUploader = ({ 
  listingId = null,
  maxFiles = 10,
  onChange,
  initialMedia = [],
  showProgress = true 
}) => {
  const { isDark } = useTheme();
  const { uploadFile, deleteFile, progress, uploading, error, setError } = useS3Upload();
  
  const [media, setMedia] = useState(initialMedia);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [localPreviews, setLocalPreviews] = useState({});

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange(media);
    }
  }, [media, onChange]);

  const validateFile = (file) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    
    if (!isImage && !isVideo) {
      return { valid: false, error: `Invalid file type: ${file.type}. Only images (JPEG, PNG, WebP, GIF) and videos (MP4, MOV, WebM) are allowed.` };
    }
    
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return { valid: false, error: `File "${file.name}" is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.` };
    }
    
    return { valid: true, type: isImage ? 'image' : 'video' };
  };

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check max files
    if (media.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setError(null);
    const filesToUpload = [];

    // Validate all files first
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
      
      // Create local preview
      const preview = URL.createObjectURL(file);
      setLocalPreviews(prev => ({ ...prev, [file.name]: preview }));
      
      filesToUpload.push({ file, type: validation.type, preview });
    }

    // Add to upload queue
    setUploadQueue(prev => [...prev, ...filesToUpload.map(f => f.file.name)]);

    // Upload files one by one
    for (const { file, type, preview } of filesToUpload) {
      const result = await uploadFile(file, listingId);
      
      // Remove from queue
      setUploadQueue(prev => prev.filter(name => name !== file.name));
      
      if (result.success) {
        const newMedia = {
          key: result.key,
          url: result.url,
          type,
          filename: file.name,
          size: file.size
        };
        
        setMedia(prev => [...prev, newMedia]);
        
        // Clean up local preview
        URL.revokeObjectURL(preview);
        setLocalPreviews(prev => {
          const updated = { ...prev };
          delete updated[file.name];
          return updated;
        });
      } else {
        console.error('Upload failed for', file.name, ':', result.error);
        setError(`Failed to upload ${file.name}: ${result.error || 'Unknown error'}`);
        // Clean up preview for failed upload
        URL.revokeObjectURL(preview);
        setLocalPreviews(prev => {
          const updated = { ...prev };
          delete updated[file.name];
          return updated;
        });
      }
    }
    
    // Clear input
    e.target.value = '';
  }, [media.length, maxFiles, uploadFile, listingId, setError]);

  const handleRemove = useCallback(async (index) => {
    const item = media[index];
    
    if (item.key) {
      // Delete from S3
      await deleteFile(item.key);
    }
    
    setMedia(prev => prev.filter((_, i) => i !== index));
  }, [media, deleteFile]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer?.files;
    if (files?.length) {
      // Create synthetic event
      const syntheticEvent = { target: { files }, preventDefault: () => {} };
      handleFileSelect(syntheticEvent);
    }
  }, [handleFileSelect]);

  const isUploading = uploadQueue.length > 0;

  return (
    <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Photos & Videos
        </h3>
        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {media.length}/{maxFiles} files
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-4">
        {/* Uploaded Media */}
        {media.map((item, index) => (
          <div 
            key={item.key || index} 
            className={`relative aspect-square rounded-lg overflow-hidden ${
              isDark ? 'bg-dark-300' : 'bg-gray-100'
            }`}
          >
            {item.type === 'image' ? (
              <img 
                src={item.url} 
                alt={item.filename} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <video 
                src={item.url} 
                className="w-full h-full object-cover"
                muted
              />
            )}
            
            {/* Type Badge */}
            <div className="absolute top-2 left-2">
              {item.type === 'image' ? (
                <Image className="w-4 h-4 text-white drop-shadow-lg" />
              ) : (
                <Video className="w-4 h-4 text-white drop-shadow-lg" />
              )}
            </div>
            
            {/* Primary Badge */}
            {index === 0 && (
              <span className="absolute bottom-2 left-2 bg-primary text-black text-xs font-medium px-2 py-0.5 rounded">
                Primary
              </span>
            )}
            
            {/* Remove Button */}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500 rounded-full transition-colors"
              disabled={isUploading}
            >
              <X className="w-4 h-4 text-white" />
            </button>
            
            {/* Success Indicator */}
            <div className="absolute bottom-2 right-2">
              <CheckCircle className="w-4 h-4 text-green-400 drop-shadow-lg" />
            </div>
          </div>
        ))}

        {/* Uploading Items */}
        {uploadQueue.map((filename) => (
          <div 
            key={filename} 
            className={`relative aspect-square rounded-lg overflow-hidden ${
              isDark ? 'bg-dark-300' : 'bg-gray-100'
            }`}
          >
            {localPreviews[filename] && (
              <img 
                src={localPreviews[filename]} 
                alt="Uploading..." 
                className="w-full h-full object-cover opacity-50"
              />
            )}
            
            {/* Progress Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              {showProgress && progress[filename] !== undefined && (
                <>
                  <div className="w-3/4 h-1.5 bg-dark-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress[filename]}%` }}
                    />
                  </div>
                  <span className="text-xs text-white mt-1">{progress[filename]}%</span>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Upload Button */}
        {media.length < maxFiles && (
          <label 
            className={`aspect-square rounded-lg border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center ${
              isDark 
                ? 'border-dark-200 bg-dark-300 hover:border-primary hover:bg-dark-200' 
                : 'border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
              data-testid="media-upload-input"
            />
            <Upload className={`w-8 h-8 mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {isUploading ? 'Uploading...' : 'Add Media'}
            </span>
          </label>
        )}
      </div>

      {/* Helper Text */}
      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} space-y-1`}>
        <p>• First image will be the primary photo</p>
        <p>• Images: JPEG, PNG, WebP, GIF (max 10MB each)</p>
        <p>• Videos: MP4, MOV, WebM (max 100MB each)</p>
        <p>• Drag and drop or click to upload</p>
        <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
          <p className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
            ⏱️ Upload Times
          </p>
          <p className={`mt-1 ${isDark ? 'text-blue-300/80' : 'text-blue-600'}`}>
            Large files may take 1-5 minutes to fully upload depending on your internet speed. 
            Wait for the green checkmark ✓ before saving your listing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default S3MediaUploader;
