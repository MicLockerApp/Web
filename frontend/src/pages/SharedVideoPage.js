import React from 'react';
import { useParams } from 'react-router-dom';
import VinylLogo from '../components/VinylLogo';

// https://miclockerapp.com/videos/{id} — shared from the app. With the app
// installed, iOS/Android open the link in the app before this page loads.
const SharedVideoPage = () => {
  const { id } = useParams();
  const appUrl = `miclocker://videos/${encodeURIComponent(id)}`;
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16" data-testid="shared-video-page">
      <div className="max-w-md w-full text-center bg-dark-400 rounded-xl p-8">
        <VinylLogo size={64} spinning className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Open in MicLocker</h1>
        <p className="text-gray-400 mb-6">This video lives in the MicLocker app. If you have the app installed, tap below to watch it.</p>
        <a href={appUrl} className="btn btn-primary">Open MicLocker</a>
      </div>
    </div>
  );
};

export default SharedVideoPage;
