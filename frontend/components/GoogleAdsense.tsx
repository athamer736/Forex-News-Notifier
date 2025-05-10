'use client';

import React from 'react';
import Script from 'next/script';

export default function GoogleAdsense() {
  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746"
      crossOrigin="anonymous"
    />
  );
} 