import { useState, useCallback } from 'react';
import api from '../services/api';

/**
 * Uploads files through the app backend's signed-URL pipeline (Google Cloud
 * Storage, same as the iOS/Android apps):
 *   1. ask the API for a signed upload URL
 *   2. PUT the file straight to storage
 *   3. confirm (media only)
 *
 * uploadFile(file, context)
 *   context = 'marketplace' | 'profile' | 'message'  → media upload; result.key is the media_id
 *   context = 'support-tickets/...' (any string starting with "support-tickets")
 *             → support-ticket attachment; result.url is its public URL
 *   context = null → 'marketplace'
 *
 * Returns { success, key, media_id, url } or { success: false, error }.
 */
const putWithProgress = (url, file, onProgress) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
  });
  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) resolve();
    else reject(new Error(`Upload failed with status ${xhr.status}`));
  });
  xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
  xhr.open('PUT', url);
  xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
  xhr.send(file);
});

const useS3Upload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);

  const uploadFile = useCallback(async (file, context = null) => {
    setError(null);
    setUploading(true);
    const onProgress = (pct) => setProgress(prev => ({ ...prev, [file.name]: pct }));
    try {
      if (typeof context === 'string' && context.startsWith('support-tickets')) {
        const { data } = await api.post('/tickets/upload-url', {
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
        });
        await putWithProgress(data.upload_url, file, onProgress);
        return { success: true, key: data.object_key, url: data.public_url, object_key: data.object_key };
      }

      const source = ['marketplace', 'profile', 'message'].includes(context) ? context : 'marketplace';
      const { data: slot } = await api.post('/media/upload-url', {
        content_type: file.type || 'image/jpeg',
        size_bytes: file.size,
        source,
      });
      await putWithProgress(slot.upload_url, file, onProgress);
      const { data: media } = await api.post(`/media/${slot.media_id}/confirm`, {});
      return { success: true, key: slot.media_id, media_id: slot.media_id, url: media.url || URL.createObjectURL(file) };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Upload failed';
      setError(typeof errorMsg === 'string' ? errorMsg : 'Upload failed');
      return { success: false, error: errorMsg };
    } finally {
      setUploading(false);
      setProgress(prev => {
        const updated = { ...prev };
        delete updated[file.name];
        return updated;
      });
    }
  }, []);

  const uploadFiles = useCallback(async (files, context = null) => {
    const results = [];
    for (const file of files) {
      results.push(await uploadFile(file, context));
    }
    return results;
  }, [uploadFile]);

  // Removing a photo from a form just drops it from the list; the listing
  // update (image_media_ids) is what decides which photos stay attached.
  const deleteFile = useCallback(async () => ({ success: true }), []);

  return { uploadFile, uploadFiles, uploadFilePut: uploadFile, deleteFile, progress, uploading, error, setError };
};

export default useS3Upload;
