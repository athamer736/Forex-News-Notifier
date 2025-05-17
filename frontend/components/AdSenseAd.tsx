'use client';

import { useEffect, useRef } from 'react';

interface AdSenseAdProps {
  adSlot: string;
  adFormat?: string;
  style?: React.CSSProperties;
}

export default function AdSenseAd({ adSlot, adFormat = 'auto', style = {} }: AdSenseAdProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !iframeRef.current) return;

    // Give AdSense time to initialize
    const timer = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      // Set sandbox attributes that allow scripts but preserve security
      iframe.setAttribute('sandbox', 'allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation');
      
      // Create the ad content with the proper credentials setting
      const adContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { margin: 0; padding: 0; overflow: hidden; }
            .ad-container { width: 100%; height: 100%; }
          </style>
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746" crossorigin="anonymous"></script>
        </head>
        <body>
          <div class="ad-container">
            <ins class="adsbygoogle"
                 style="display:block; width:100%; height:100%;"
                 data-ad-client="ca-pub-3681278136187746"
                 data-ad-slot="${adSlot}"
                 data-ad-format="${adFormat}"
                 data-full-width-responsive="true"></ins>
            <script>
              (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
          </div>
        </body>
        </html>
      `;
      
      // Set the content
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(adContent);
          doc.close();
          console.log('AdSense content written to iframe');
        }
      } catch (err) {
        console.error('Error writing AdSense content to iframe:', err);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [adSlot, adFormat]);

  return (
    <iframe
      ref={iframeRef}
      title={`AdSense Ad ${adSlot}`}
      style={{
        width: '100%',
        minHeight: '280px',
        border: 'none',
        overflow: 'hidden',
        ...style
      }}
    />
  );
} 