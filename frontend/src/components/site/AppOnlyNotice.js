import React from 'react';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';

// Shown on pages whose feature isn't on the website yet (it lives in the app).
const AppOnlyNotice = ({ feature = 'This feature' }) => (
  <div className="min-h-[60vh] flex items-center justify-center px-4 py-16" data-testid="app-only-notice">
    <div className="max-w-md w-full text-center bg-dark-400 rounded-xl p-8">
      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
        <Smartphone className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Coming to the website soon</h1>
      <p className="text-gray-400 mb-6">{feature} is available in the MicLocker app for now.</p>
      <Link to="/" className="btn btn-primary">Back to Home</Link>
    </div>
  </div>
);

export default AppOnlyNotice;
