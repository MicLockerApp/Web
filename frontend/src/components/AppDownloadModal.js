import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/us/app/miclocker/id6768870077';
const STORAGE_KEY = 'miclocker_app_modal_seen';
const SHOW_DELAY_MS = 800;

// localStorage can throw (private mode, blocked site data), so every access is guarded.
const hasSeenModal = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const markModalSeen = () => {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* storage unavailable: the modal simply won't be remembered across reloads */
  }
};

// One-time "Download the iOS app" prompt for first-time visitors.
const AppDownloadModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ctaRef = useRef(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Open once for visitors who have never seen it. Counts as "seen" the moment it shows.
  useEffect(() => {
    if (hasSeenModal()) return undefined;
    const timer = setTimeout(() => {
      setIsOpen(true);
      markModalSeen();
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // While open: Escape closes, page behind doesn't scroll, focus lands on the CTA.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ctaRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    // z-[110] sits above PromoModal (z-[100]) so both can never fight for the top layer.
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" data-testid="app-download-modal">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-download-modal-title"
        className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 text-gray-500 transition-colors hover:text-gray-900"
          data-testid="app-download-modal-close"
        >
          <X className="w-6 h-6" />
        </button>

        <img
          src={`${process.env.PUBLIC_URL}/apple-logo.png`}
          alt="Apple logo"
          className="mx-auto mb-6 h-20 w-auto"
        />

        <h2 id="app-download-modal-title" className="mb-6 text-xl font-bold text-gray-900">
          MicLocker is available on iOS.
        </h2>

        <a
          ref={ctaRef}
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className="btn btn-primary w-full justify-center py-3 text-lg"
          data-testid="app-download-modal-cta"
        >
          Download the app
        </a>
      </div>
    </div>
  );
};

export default AppDownloadModal;
