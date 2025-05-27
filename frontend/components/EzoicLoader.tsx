'use client';

import { useEffect } from 'react';

export default function EzoicLoader() {
  useEffect(() => {
    // Set your Ezoic ID
    const ezoicId = 1; // Replace with your actual Ezoic ID
    
    // Initialize Ezoic script manually
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `//g.ezoic.net/ezoic/ezoiclitedata.go?did=${ezoicId}`;
    
    script.onload = () => {
      console.log('Ezoic script loaded successfully');
    };
    
    script.onerror = (e) => {
      console.error('Ezoic script failed to load', e);
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);
  
  // Empty div to satisfy rendering requirements, actual script is added in useEffect
  return <div id="ezoic-loader"></div>;
} 