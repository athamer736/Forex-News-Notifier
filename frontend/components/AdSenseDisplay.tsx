'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  
  useEffect(() => {
    // Skip on server
    if (typeof window === 'undefined' || !adRef.current) return;
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const initializeAd = () => {
      // Only proceed if we have the adRef and adsbygoogle is available
      if (!adRef.current) return;
      
      try {
        // Clear existing content
        adRef.current.innerHTML = '';
        
        // Create ad container
        const adContainer = document.createElement('ins');
        adContainer.className = 'adsbygoogle';
        adContainer.style.display = 'block';
        adContainer.style.width = '100%';
        adContainer.style.height = 'auto';
        adContainer.style.minHeight = '280px';
        adContainer.setAttribute('data-ad-client', 'ca-pub-3681278136187746');
        adContainer.setAttribute('data-ad-slot', adSlot);
        adContainer.setAttribute('data-ad-format', adFormat);
        adContainer.setAttribute('data-full-width-responsive', 'true');
        
        // Add to DOM
        adRef.current.appendChild(adContainer);
        
        // Check if AdSense script is loaded
        if (typeof window.adsbygoogle !== 'undefined') {
          try {
            // Initialize ad
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            console.log(`AdSense ad initialized for slot: ${adSlot}`);
            setAdLoaded(true);
          } catch (err) {
            console.error('Error pushing ad:', err);
            setAdError(true);
          }
        } else {
          // Script not loaded yet, retry after delay if under max retries
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`AdSense not available, retry ${retryCount} of ${maxRetries}...`);
            setTimeout(initializeAd, 1500);
          } else {
            console.error('AdSense not available after maximum retries');
            setAdError(true);
          }
        }
      } catch (err) {
        console.error('Error initializing ad:', err);
        setAdError(true);
      }
    };
    
    // Delay initialization to ensure script has time to load
    const timer = setTimeout(initializeAd, 1000);
    
    return () => {
      clearTimeout(timer);
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adSlot, adFormat]);
  
  return (
    <div 
      ref={adRef} 
      data-ad-slot={adSlot}
      style={{
        display: 'block',
        width: '100%',
        minHeight: '280px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        overflow: 'hidden',
        margin: '20px 0',
        ...style
      }}
      className={`ad-container ${className}`}
    >
      {adError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '280px',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '12px',
          textAlign: 'center',
          padding: '20px'
        }}>
          Advertisement
        </div>
      )}
    </div>
  );
} 