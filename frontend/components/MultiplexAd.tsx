'use client';

import React, { useEffect, useRef } from 'react';
import Script from 'next/script';

interface MultiplexAdProps {
  adSlot?: string;
  style?: React.CSSProperties;
}

export default function MultiplexAd({ adSlot = "3528778902", style = {} }: MultiplexAdProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);

  // This will run after the component mounts to push the ad
  useEffect(() => {
    // Safety check for window object
    if (typeof window === 'undefined') return;
    
    // Initialize adsbygoogle if not defined
    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
    }
    
    // Push the ad with a delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        console.log('Multiplex ad push attempted');
      } catch (e) {
        console.error('Error pushing multiplex ad:', e);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={adContainerRef} style={{ minHeight: '600px', width: '100%', ...style }}>
      {/* AdSense script is loaded in layout.tsx, so we don't need to include it here */}
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          minHeight: '600px'
        }}
        data-ad-format="autorelaxed"
        data-ad-client="ca-pub-3681278136187746"
        data-ad-slot={adSlot}
      />
    </div>
  );
}

// Add TypeScript declarations for AdSense
declare global {
  interface Window {
    adsbygoogle: any[];
  }
} 