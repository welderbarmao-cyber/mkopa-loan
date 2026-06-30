'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Only show splash on initial entry to root path or when explicitly requested
    // Don't show on admin/API routes
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/api')) {
      setVisible(false);
      return;
    }

    // Check if splash was already shown in this session
    const splashShown = sessionStorage.getItem('mkopa-splash-shown');
    if (splashShown === 'true') {
      setVisible(false);
      return;
    }

    // Mark as shown
    sessionStorage.setItem('mkopa-splash-shown', 'true');

    // Progress animation (3 seconds total = 3000ms)
    const startTime = Date.now();
    const duration = 3200; // 3.2s to ensure at least 3s

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(progressInterval);
    }, 30);

    // Start fade out at 2.8s, hide at 3.2s
    const fadeTimer = setTimeout(() => setFadeOut(true), 2800);
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 3200);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-mkopa-dark via-mkopa-green to-mkopa-dark transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Decorative background circles */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-16 w-48 h-48 bg-mkopa-orange/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Main logo + brand */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated logo container */}
        <div className="relative mb-8 animate-[logoEntry_0.8s_ease-out]">
          {/* Pulsing ring around logo */}
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-[spin_8s_linear_infinite]" style={{ borderTopColor: 'rgba(232,119,34,0.8)' }} />

          {/* Logo image */}
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="M-Kopa Loans Logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Brand name */}
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2 animate-[slideUp_0.8s_ease-out_0.3s_both]">
          <span className="text-white">M-Kopa</span>{' '}
          <span className="text-mkopa-orange">Loans</span>
        </h1>

        {/* Tagline */}
        <p className="text-white/80 text-sm md:text-base tracking-wide mb-10 animate-[slideUp_0.8s_ease-out_0.6s_both]">
          Affordable Digital Lending for Africa
        </p>

        {/* Progress bar */}
        <div className="w-56 md:w-72 h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-mkopa-orange to-white rounded-full transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading text */}
        <p className="text-white/70 text-xs tracking-wider uppercase animate-pulse">
          {progress < 30 ? 'Initializing...' : progress < 60 ? 'Loading security...' : progress < 90 ? 'Preparing dashboard...' : 'Almost there...'}
        </p>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/50 text-xs">
          © {new Date().getFullYear()} M-Kopa Loans · Secure · Trusted
        </p>
      </div>

      <style jsx>{`
        @keyframes logoEntry {
          0% {
            opacity: 0;
            transform: scale(0.5) rotate(-180deg);
          }
          60% {
            transform: scale(1.1) rotate(10deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes slideUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
