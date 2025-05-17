'use client';

import Script from 'next/script';

// Add TypeScript declarations for AdSense
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function AdSenseScript() {
  return (
    <Script
      id="adsbygoogle-script"
      strategy="lazyOnload"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746"
      crossOrigin="anonymous"
      onError={(e) => {
        console.error('AdSense script failed to load:', e);
      }}
      onLoad={() => {
        console.log('AdSense script loaded successfully');
      }}
    />
  );
} 