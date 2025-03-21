'use client';

import React, { useEffect, useRef } from 'react';
import { Box, Typography, Container } from '@mui/material';

// Add AdSense type definition to the window object
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseDisplayProps {
  slot?: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
}

const AdSenseDisplay: React.FC<AdSenseDisplayProps> = ({
  slot = '3868550810',
  format = 'auto',
  responsive = true
}) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adRef.current && typeof window !== 'undefined') {
      try {
        adRef.current.innerHTML = '';
        
        const adElement = document.createElement('ins');
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        adElement.style.width = '100%';
        adElement.style.height = '60px';
        adElement.setAttribute('data-ad-client', 'ca-pub-3681278136187746');
        adElement.setAttribute('data-ad-slot', slot);
        adElement.setAttribute('data-ad-format', format);
        if (responsive) {
          adElement.setAttribute('data-full-width-responsive', 'true');
        }
        
        adRef.current.appendChild(adElement);
        
        try {
          if (window.adsbygoogle) {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          }
        } catch (err) {
          console.error('AdSense push failed');
        }
      } catch (err) {
        console.error('AdSense init failed');
      }
    }
  }, [slot, format, responsive]);

  return (
    <Container maxWidth="md" sx={{ mt: 1, mb: 1 }}>
      <Box sx={{ 
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '2px',
        padding: '2px',
        background: 'rgba(255, 255, 255, 0.02)',
      }}>
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '0.6rem'
          }}
        >
          Ad
        </Typography>
        
        <Box
          ref={adRef}
          component="div"
          sx={{
            display: 'block',
            width: '100%',
            minHeight: '40px',
            maxHeight: '60px',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        />
      </Box>
    </Container>
  );
};

export default AdSenseDisplay; 