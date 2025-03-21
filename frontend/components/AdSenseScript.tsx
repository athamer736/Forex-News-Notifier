'use client';

import { useEffect } from 'react';

export default function AdSenseScript() {
  useEffect(() => {
    // Clear any existing script to avoid conflicts
    const existingScript = document.querySelector('script[src*="adsbygoogle"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Manually add the script with correct attributes
    const script = document.createElement('script');
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute('crossorigin', 'anonymous'); // Ensure this attribute is set correctly
    
    // Create a no-cors fetch to preload the script domain
    try {
      fetch('https://pagead2.googlesyndication.com', { 
        mode: 'no-cors',
        credentials: 'omit'
      }).catch(() => {});
    } catch (e) {
      // Ignore fetch errors
    }
    
    // Append the script to head
    document.head.appendChild(script);

    // Error event listener for troubleshooting
    const handleAdError = (e: ErrorEvent) => {
      if (e.filename?.includes('adsbygoogle') || e.message?.includes('adsbygoogle')) {
        console.error('AdSense script error:', e);
      }
    };

    window.addEventListener('error', handleAdError);
    
    return () => {
      // Clean up
      window.removeEventListener('error', handleAdError);
      if (document.querySelector('script[src*="adsbygoogle"]')) {
        document.querySelector('script[src*="adsbygoogle"]')?.remove();
      }
    };
  }, []);
  
  return (
    <>
      {/* Meta tag for AdSense approval */}
      <meta name="google-adsense-account" content="ca-pub-3681278136187746" />
      
      {/* Preconnect hints to help browser establish connections early */}
      <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
      <link rel="preconnect" href="https://googleads.g.doubleclick.net" />
      <link rel="preconnect" href="https://adservice.google.com" />
      <link rel="preconnect" href="https://www.googletagservices.com" />
    </>
  );
} 