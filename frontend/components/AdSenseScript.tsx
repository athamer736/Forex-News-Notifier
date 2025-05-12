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
    // Only run on client
    if (typeof window === 'undefined') return;

    try {
      // Clear any existing script to avoid conflicts
      const existingScript = document.querySelector('script[src*="adsbygoogle"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Wait a moment before adding the script
      setTimeout(() => {
        // Manually add the script with correct attributes
        const script = document.createElement('script');
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746";
        script.async = true;
        script.setAttribute('crossorigin', 'anonymous');
        
        // Add load and error handlers
        script.onload = () => console.log('AdSense script loaded successfully');
        script.onerror = (e) => console.error('AdSense script failed to load', e);
        
        // Append to document head
        document.head.appendChild(script);
        
        // Initialize AdSense
        window.adsbygoogle = window.adsbygoogle || [];
      }, 500);
    } catch (e) {
      console.error('Error setting up AdSense:', e);
    }
    
    return () => {
      // Clean up on unmount
      const script = document.querySelector('script[src*="adsbygoogle"]');
      if (script) script.remove();
    };
  }, []);
  
  return (
    <>
      {/* Meta tag for AdSense approval */}
      <meta name="google-adsense-account" content="ca-pub-3681278136187746" />
      
      {/* Preconnect hints to help browser establish connections early */}
      <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://googleads.g.doubleclick.net" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://adservice.google.com" crossOrigin="anonymous" />
    </>
  );
} 