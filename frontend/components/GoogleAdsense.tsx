'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

export default function GoogleAdsense() {
  // Client component can use event handlers
  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746"
      crossOrigin="anonymous"
      onError={(e) => {
        console.error('AdSense script failed to load', e);
      }}
      onLoad={() => {
        console.log('AdSense script loaded successfully');
      }}
    />
  );
} 