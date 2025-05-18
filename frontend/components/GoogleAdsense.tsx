'use client';

import React, { useEffect } from 'react';

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
      
      // Initialize AdSense script manually
      const script = document.createElement('script');
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746";
      script.async = true;
      script.crossOrigin = "anonymous";
      
      script.onload = () => {
        console.log('AdSense script loaded successfully');
        
        // Initialize page-level ads
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: "ca-pub-3681278136187746",
            enable_page_level_ads: true
          });
        } catch (e) {
          console.error('Error initializing page-level ads:', e);
        }
      };
      
      script.onerror = (e) => {
        console.error('Error loading AdSense script:', e);
      };
      
      document.head.appendChild(script);
      
      return () => {
        // Cleanup
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    } catch (e) {
      console.error('Error in GoogleAdsense component:', e);
    }
  }, []);

  // Empty div for rendering
  return <div id="google-adsense-loader"></div>;
} 