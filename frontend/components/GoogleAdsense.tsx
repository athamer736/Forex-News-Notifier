'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

// Add type declaration for window.dataLayer
declare global {
  interface Window {
    dataLayer: any[];
    adsbygoogle: any[];
  }
}

export default function GoogleAdsense() {
  useEffect(() => {
    try {
      // Define dataLayer for Google Tag Manager
      window.dataLayer = window.dataLayer || [];
    } catch (e) {
      console.error('Error initializing dataLayer:', e);
    }
  }, []);

  return (
    <>
      <Script
        id="adsbygoogle-init"
        strategy="afterInteractive"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746"
        crossOrigin="anonymous"
        onError={(e) => {
          console.error('Error loading AdSense script:', e);
        }}
        onLoad={() => {
          console.log('AdSense script loaded successfully');
        }}
      />
      <Script id="adsense-init">
        {`
          (adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: "ca-pub-3681278136187746",
            enable_page_level_ads: true
          });
        `}
      </Script>
    </>
  );
} 