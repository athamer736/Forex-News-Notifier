'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function AdSenseLoader() {
  useEffect(() => {
    // Initialize AdSense script manually
    const script = document.createElement('script');
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746";
    script.async = true;
    script.crossOrigin = "anonymous";
    
    script.onload = () => {
      console.log('AdSense script loaded successfully');
      window.adsbygoogle = window.adsbygoogle || [];
    };
    
    script.onerror = (e) => {
      console.error('AdSense script failed to load', e);
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);
  
  // Empty div to satisfy rendering requirements, actual script is added in useEffect
  return <div id="adsense-loader"></div>;
}

// Add TypeScript declarations for AdSense
declare global {
  interface Window {
    adsbygoogle: any[];
  }
} 