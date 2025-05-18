'use client';

import { useEffect, useRef } from 'react';

interface AdUnitProps {
  adSlot: string;
  adFormat?: string;
  style?: React.CSSProperties;
}

export default function AdUnit({ adSlot, adFormat = 'auto', style = {} }: AdUnitProps) {
  const adRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    // Ensure we have a ref to work with
    if (!adRef.current) return;
    
    // Initialize adsbygoogle if not already defined
    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
    }
    
    try {
      // Clear any previous content
      adRef.current.innerHTML = '';
      
      // Create the ad container
      const adElement = document.createElement('ins');
      adElement.className = 'adsbygoogle';
      adElement.style.display = 'block';
      adElement.style.width = '100%';
      adElement.style.height = '100%';
      
      // Set minimum height from provided style
      adElement.style.minHeight = style.minHeight?.toString() || '280px';
      
      // Set ad attributes
      adElement.setAttribute('data-ad-client', 'ca-pub-3681278136187746');
      adElement.setAttribute('data-ad-slot', adSlot);
      adElement.setAttribute('data-ad-format', adFormat || 'auto');
      adElement.setAttribute('data-full-width-responsive', 'true');
      
      // Append to DOM
      adRef.current.appendChild(adElement);
      
      // Push the ad with a small delay to ensure DOM is ready
      setTimeout(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          console.error('Error pushing AdSense ad:', e);
        }
      }, 200);
    } catch (error) {
      console.error('Error setting up AdSense ad:', error);
    }
    
    // Cleanup function
    return () => {
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adSlot, adFormat, style.minHeight]);
  
  return (
    <div
      ref={adRef}
      style={{
        width: '100%',
        minHeight: style.minHeight || '280px',
        ...style
      }}
    />
  );
}

// Add TypeScript declarations for AdSense
declare global {
  interface Window {
    adsbygoogle: any[];
  }
} 