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
    // Function to initialize ads - will retry multiple times
    const initializeAd = () => {
      if (!adRef.current) return;
      
      try {
        // Clear previous content
        adRef.current.innerHTML = '';
        
        // Create the ad container
        const adElement = document.createElement('ins');
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        adElement.style.width = '100%';
        adElement.style.height = 'auto';
        adElement.style.minHeight = '250px';
        
        // Set ad attributes
        adElement.setAttribute('data-ad-client', 'ca-pub-3681278136187746');
        adElement.setAttribute('data-ad-slot', adSlot || '1234567890');
        adElement.setAttribute('data-ad-format', adFormat);
        adElement.setAttribute('data-full-width-responsive', 'true');
        
        // Add to DOM
        adRef.current.appendChild(adElement);
        
        // Check if adsbygoogle is loaded before attempting to initialize
        if (window && (window as any).adsbygoogle) {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          console.log('Ad initialized successfully');
        } else {
          // If AdSense isn't available yet, retry in 1 second
          console.log('AdSense not available yet, retrying soon...');
          setTimeout(initializeAd, 1000);
        }
      } catch (error) {
        console.error('Error initializing AdSense:', error);
      }
    };

    // Use a timeout to allow the AdSense script to load first
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
      style={{
        display: 'block',
        width: '100%',
        minHeight: '250px',
        background: 'rgba(0, 0, 0, 0.05)',
        borderRadius: '8px',
        overflow: 'hidden',
        margin: '20px 0',
        ...style
      }}
      className={className}
    />
  );
} 