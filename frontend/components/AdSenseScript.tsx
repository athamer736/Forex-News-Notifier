'use client';

import { useEffect } from 'react';

// Add TypeScript declarations for AdSense
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function AdSenseScript() {
  useEffect(() => {
    try {
      // Insert the exact script tag provided by Google AdSense
      const script = document.createElement('script');
      script.async = true;
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
      
      // Initialize adsbygoogle
      window.adsbygoogle = window.adsbygoogle || [];
      
      script.onload = () => console.log('AdSense script loaded successfully');
      script.onerror = (e) => console.error('AdSense script failed to load:', e);
    } catch (error) {
      console.error('Error setting up AdSense:', error);
    }
  }, []);
  
  return null;
} 