'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export default function AdSenseScript() {
  useEffect(() => {
    // Log when the component mounts
    console.log('AdSense component mounted');
    
    // Error event listener for troubleshooting
    window.addEventListener('error', (e) => {
      if (e.filename?.includes('adsbygoogle') || e.message?.includes('adsbygoogle')) {
        console.error('AdSense script error:', e);
      }
    });

    // Check if adsbygoogle is loaded and try to initialize
    if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
      try {
        // Push an empty command to initialize ads
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        console.log('AdSense initialized manually');
      } catch (err) {
        console.error('AdSense manual initialization error:', err);
      }
    }
    
    return () => {
      // Clean up if needed
      window.removeEventListener('error', () => {});
    };
  }, []);
  
  const handleError = (e: Error) => {
    console.error('AdSense script failed to load:', e);
  };
  
  const handleLoad = () => {
    console.log('AdSense script loaded successfully');
    
    // Initialize AdSense after script loads
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      console.log('AdSense initialized after script load');
    } catch (err) {
      console.error('AdSense initialization error:', err);
    }
  };
  
  return (
    <>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746"
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onError={handleError}
        onLoad={handleLoad}
      />
      
      {/* This meta tag helps with AdSense approval */}
      <meta name="google-adsense-account" content="ca-pub-3681278136187746" />
    </>
  );
} 