'use client';

import { useEffect, useRef } from 'react';

interface AdSenseAdProps {
  adSlot: string;
  adFormat?: string;
  style?: React.CSSProperties;
}

export default function AdSenseAd({ adSlot, adFormat = 'auto', style = {} }: AdSenseAdProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only execute on client side
    if (typeof window === 'undefined') return;
    
    // Make sure window.adsbygoogle is defined
    window.adsbygoogle = window.adsbygoogle || [];
    
    // Find the ad container
    if (!adContainerRef.current) return;
    
    // Clear previous ad if any
    adContainerRef.current.innerHTML = '';
    
    // Create ad element
    const adElement = document.createElement('ins');
    adElement.className = 'adsbygoogle';
    adElement.style.display = 'block';
    adElement.style.width = '100%';
    adElement.style.height = '100%';
    adElement.style.minHeight = style.minHeight?.toString() || '280px';
    adElement.setAttribute('data-ad-client', 'ca-pub-3681278136187746');
    adElement.setAttribute('data-ad-slot', adSlot);
    adElement.setAttribute('data-ad-format', adFormat);
    adElement.setAttribute('data-full-width-responsive', 'true');
    
    // Add to DOM
    adContainerRef.current.appendChild(adElement);
    
    try {
      // Push the ad
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      console.log('AdSense ad pushed for slot:', adSlot);
    } catch (e) {
      console.error('Error pushing AdSense ad:', e);
    }
    
    // Cleanup
    return () => {
      if (adContainerRef.current) {
        adContainerRef.current.innerHTML = '';
      }
    };
  }, [adSlot, adFormat, style.minHeight]);

  return (
    <div 
      ref={adContainerRef}
      style={{
        width: '100%',
        minHeight: '280px',
        background: 'transparent',
        ...style
      }}
    />
  );
} 