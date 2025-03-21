'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

const AdSenseClient = () => {
  useEffect(() => {
    // This will run only on the client side
    return () => {
      // Cleanup if needed when component unmounts
    };
  }, []);

  const handleError = () => {
    console.log('AdSense failed to load');
  };

  const handleLoad = () => {
    console.log('AdSense loaded successfully');
  };

  return (
    <>
      <Script
        id="adsense-script"
        strategy="lazyOnload"
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746"
        crossOrigin="anonymous"
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  );
};

export default AdSenseClient; 