'use client';

import { useEffect, useRef } from 'react';

interface MultiplexAdProps {
  adSlot?: string;
  style?: React.CSSProperties;
}

export default function MultiplexAd({ adSlot = "3528778902", style = {} }: MultiplexAdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || !adRef.current) return;
    
    // Clear previous content
    adRef.current.innerHTML = '';
    
    // Create ins element
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-format', 'autorelaxed');
    ins.setAttribute('data-ad-client', 'ca-pub-3681278136187746');
    ins.setAttribute('data-ad-slot', adSlot);
    
    // Create script element for pushing the ad
    const script = document.createElement('script');
    script.innerHTML = '(adsbygoogle = window.adsbygoogle || []).push({});';
    
    // Add elements to the DOM
    adRef.current.appendChild(ins);
    adRef.current.appendChild(script);
    
    return () => {
      // Cleanup
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adSlot]);
  
  return (
    <div 
      ref={adRef}
      style={{
        width: '100%',
        minHeight: '600px',
        background: 'transparent',
        ...style
      }}
    />
  );
} 