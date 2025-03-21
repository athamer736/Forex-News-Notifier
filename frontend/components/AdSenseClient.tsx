'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

const AdSenseClient = () => {
  useEffect(() => {
    // Manual initialization as fallback
    const initAdSense = () => {
      try {
        // Only proceed if the window object is available
        if (typeof window !== 'undefined') {
          // Check if the script already exists to avoid duplicates
          const existingScript = document.getElementById('adsbygoogle-script');
          if (!existingScript) {
            const script = document.createElement('script');
            script.id = 'adsbygoogle-script';
            script.async = true;
            script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746';
            script.crossOrigin = 'anonymous';
            script.onload = () => console.log('AdSense manually loaded');
            script.onerror = () => console.log('Failed to load AdSense manually');
            document.head.appendChild(script);
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    // Delay initialization to ensure page content is loaded
    const timer = setTimeout(initAdSense, 2000);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {/* Use Next.js Script component as primary method */}
      <Script
        id="adsense-script"
        strategy="lazyOnload"
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746"
        crossOrigin="anonymous"
        onError={() => {
          console.log('Next.js Script failed to load AdSense');
        }}
      />
    </>
  );
};

export default AdSenseClient; 