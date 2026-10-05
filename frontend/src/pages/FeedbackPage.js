import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// WishKit feature-request board (web SDK: https://www.wishkit.io/docs/web).
// Same WishKit project as the iOS app's Settings → Feature Requests, so
// requests and votes are shared across iPhone, Android and the website.
// The Android app links here (Settings → Feature Requests) until WishKit
// ships an Android SDK.
//
// The project key comes from REACT_APP_WISHKIT_PROJECT_KEY (set on Render).
const WISHKIT_KEY = (process.env.REACT_APP_WISHKIT_PROJECT_KEY || '').trim();
const WISHKIT_SCRIPT_ID = 'wishkit-web-sdk';
const WISHKIT_SCRIPT_SRC = 'https://www.wishkit.io/sdk/wishkit-web.js';

const FeedbackPage = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Load the SDK once; it watches the page and mounts the board into the
  // anchor below, including when this route is opened client-side.
  useEffect(() => {
    if (!WISHKIT_KEY || document.getElementById(WISHKIT_SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = WISHKIT_SCRIPT_ID;
    script.src = WISHKIT_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Signed-in visitors post and vote as themselves -- same identity iOS
  // sends (customID = user id, email, display name).
  useEffect(() => {
    if (!user || !window.WishKit?.identify) return;
    window.WishKit.identify({
      email: user.email || undefined,
      name: user.display_name || undefined,
      customID: user.id,
    });
  }, [user]);

  return (
    <div className="min-h-screen py-12 px-4" data-testid="feedback-page">
      <div className="max-w-3xl mx-auto">
        <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Feature Requests
        </h1>
        <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Tell us what you'd like to see in MicLocker, and vote on ideas from the community.
        </p>

        {WISHKIT_KEY ? (
          // key remounts the board when the theme or signed-in user changes,
          // so the data-wk-* attributes below are re-read.
          <div
            key={`${isDark ? 'dark' : 'light'}-${user?.id || 'guest'}`}
            data-wk-anchor=""
            data-wk-project-key={WISHKIT_KEY}
            data-wk-badges="on"
            data-wk-comments="on"
            data-wk-theme={isDark ? 'dark' : 'light'}
            {...(user ? {
              'data-wk-user-id': user.id,
              ...(user.email ? { 'data-wk-user-email': user.email } : {}),
              ...(user.display_name ? { 'data-wk-user-name': user.display_name } : {}),
            } : {})}
          />
        ) : (
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Feature requests aren't available right now. Please check back soon.
          </p>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
