'use client';

import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

interface AdSenseDisplayProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  style?: React.CSSProperties;
  responsive?: boolean;
  title?: string;
}

const AdSenseDisplay: React.FC<AdSenseDisplayProps> = ({
  slot = '3868550810',
  format = 'auto',
  style = {},
  responsive = true,
  title = 'Advertisement'
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    // Wait for the component to mount and for AdSense script to be available
    const timeout = setTimeout(() => {
      if (iframeRef.current && typeof window !== 'undefined') {
        try {
          const iframeDoc = iframeRef.current.contentDocument || 
                           iframeRef.current.contentWindow?.document;
          
          if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746" crossorigin="anonymous"></script>
                  <style>
                    body {
                      margin: 0;
                      padding: 0;
                      overflow: hidden;
                      background: transparent;
                    }
                  </style>
                </head>
                <body>
                  <ins class="adsbygoogle"
                    style="display:block; width:100%; height:100%;"
                    data-ad-client="ca-pub-3681278136187746"
                    data-ad-slot="${slot}"
                    data-ad-format="${format}"
                    ${responsive ? 'data-full-width-responsive="true"' : ''}></ins>
                  <script>
                    try {
                      (adsbygoogle = window.adsbygoogle || []).push({});
                      window.parent.postMessage('adLoaded', '*');
                    } catch (e) {
                      window.parent.postMessage('adError: ' + e.message, '*');
                    }
                  </script>
                </body>
              </html>
            `);
            iframeDoc.close();
          }
        } catch (err) {
          console.error('Failed to initialize ad iframe:', err);
        }
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [slot, format, responsive]);

  return (
    <Box sx={{ 
      width: '100%',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      overflow: 'hidden',
      padding: '20px',
      background: 'rgba(255, 255, 255, 0.05)',
      my: 3
    }}>
      <Typography 
        variant="subtitle2" 
        sx={{ mb: 2, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}
      >
        {title}
      </Typography>
      
      <Box
        component="div"
        sx={{
          display: 'block',
          width: '100%',
          minHeight: '250px',
          overflow: 'hidden',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        <iframe
          ref={iframeRef}
          src="about:blank"
          style={{ 
            width: '100%',
            minHeight: '250px',
            border: 'none',
            overflow: 'hidden',
            ...style
          }}
          title="Advertisement"
        />
      </Box>
    </Box>
  );
};

export default AdSenseDisplay; 