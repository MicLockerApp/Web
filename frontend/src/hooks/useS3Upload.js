import { useState, useCallback } from 'react';
import api from '../services/api';

/**
 * Hook for uploading files to S3 via presigned URLs
 */
const useS3Upload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);

  /**
   * Upload a single file to S3
   * @param {File} file - The file to upload
   * @param {string} listingId - Optional listing ID for organizing files
   * @returns {Object} - { key, url, success }
   */
  const uploadFile = useCallback(async (file, listingId = null) => {
    setError(null);
    
    try {
      // Get presigned URL from backend
      const presignedResponse = await api.post('/uploads/presigned-url', {
        filename: file.name,
        content_type: file.type,
        listing_id: listingId
      });

      const { upload_url, fields, key, public_url } = presignedResponse.data;

      // Create form data for S3 upload
      const formData = new FormData();
      
      // Add all fields from presigned URL (order matters!)
      Object.entries(fields).forEach(([fieldKey, value]) => {
        formData.append(fieldKey, value);
      });
      
      // Add file last
      formData.append('file', file);

      // Upload to S3
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setProgress(prev => ({ ...prev, [file.name]: percent }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 204) {
            resolve({ success: true, key, url: public_url });
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', upload_url);
        xhr.send(formData);
      });

      return await uploadPromise;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Upload failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  /**
   * Upload multiple files to S3
   * @param {File[]} files - Array of files to upload
   * @param {string} listingId - Optional listing ID
   * @returns {Array} - Array of upload results
   */
  const uploadFiles = useCallback(async (files, listingId = null) => {
    setUploading(true);
    setProgress({});
    setError(null);

    const results = [];

    for (const file of files) {
      const result = await uploadFile(file, listingId);
      results.push({ ...result, filename: file.name, type: file.type });
    }

    setUploading(false);
    return results;
  }, [uploadFile]);

  /**
   * Upload using PUT method (simpler, for larger files)
   */
  const uploadFilePut = useCallback(async (file, listingId = null) => {
    setError(null);
    
    try {
      // Get presigned PUT URL
      const presignedResponse = await api.post('/uploads/presigned-put-url', {
        filename: file.name,
        content_type: file.type,
        listing_id: listingId
      });

      const { upload_url, key, public_url, content_type } = presignedResponse.data;

      // Upload directly to S3 using PUT
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setProgress(prev => ({ ...prev, [file.name]: percent }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ success: true, key, url: public_url });
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', upload_url);
        xhr.setRequestHeader('Content-Type', content_type);
        xhr.send(file);
      });

      return await uploadPromise;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Upload failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  /**
   * Delete a file from S3
   * @param {string} key - The S3 object key
   */
  const deleteFile = useCallback(async (key) => {
    try {
      await api.delete(`/uploads/${key}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Delete failed' };
    }
  }, []);

  /**
   * Check if S3 storage is enabled
   */
  const checkStatus = useCallback(async () => {
    try {
      const response = await api.get('/uploads/status');
      return response.data;
    } catch (err) {
      return { s3_enabled: false, local_fallback: true };
    }
  }, []);

  return {
    uploadFile,
    uploadFiles,
    uploadFilePut,
    deleteFile,
    checkStatus,
    uploading,
    progress,
    error,
    setError
  };
};

export default useS3Upload;
