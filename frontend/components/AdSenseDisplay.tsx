'use client';

import { useEffect, useRef } from 'react';

interface AdSenseDisplayProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  style?: React.CSSProperties;
  className?: string;
}

export default function AdSenseDisplay({ 
  adSlot, 
  adFormat = 'auto', 
  style = {},
  className = ''
}: AdSenseDisplayProps) {
  const adRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (adRef.current && typeof window !== 'undefined') {
      try {
        // Clean up any existing ad
        if (adRef.current.firstChild) {
          adRef.current.innerHTML = '';
        }
        
        // Create the ad
        const adElement = document.createElement('ins');
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        
        // Set format based on prop
        if (adFormat === 'rectangle') {
          adElement.setAttribute('data-ad-format', 'rectangle');
        } else if (adFormat === 'horizontal') {
          adElement.setAttribute('data-ad-format', 'horizontal');
        } else if (adFormat === 'vertical') {
          adElement.setAttribute('data-ad-format', 'vertical');
        } else {
          adElement.setAttribute('data-ad-format', 'auto');
        }
        
        adElement.setAttribute('data-ad-client', 'ca-pub-3681278136187746');
        adElement.setAttribute('data-ad-slot', adSlot);
        adElement.setAttribute('data-full-width-responsive', 'true');
        
        // Add the ad to the DOM
        adRef.current.appendChild(adElement);
        
        // Initialize the ad
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          console.log(`AdSense ad initialized for slot: ${adSlot}`);
        } catch (err) {
          console.error(`Error initializing AdSense for slot ${adSlot}:`, err);
        }
      } catch (err) {
        console.error(`Error setting up AdSense ad for slot ${adSlot}:`, err);
      }
    }
    
    return () => {
      // Clean up on unmount
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adSlot, adFormat]);
  
  return (
    <div 
      ref={adRef} 
      style={{
        minHeight: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '20px 0',
        overflow: 'hidden',
        ...style
      }}
      className={className}
    >
      {/* Ad will be inserted here */}
    </div>
  );
} 