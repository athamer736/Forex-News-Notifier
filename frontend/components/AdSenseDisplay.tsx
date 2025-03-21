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
  position?: 'top' | 'bottom';
}

const AdSenseDisplay: React.FC<AdSenseDisplayProps> = ({
  slot = '3868550810',
  format = 'auto',
  responsive = true,
  position = 'bottom'
}) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Delay ad initialization to ensure the page has loaded
    const timer = setTimeout(() => {
      if (adRef.current && typeof window !== 'undefined') {
        try {
          adRef.current.innerHTML = '';
          
          const adElement = document.createElement('ins');
          adElement.className = 'adsbygoogle';
          adElement.style.display = 'block';
          adElement.style.width = '100%';
          adElement.style.height = '50px'; // Even smaller height
          adElement.setAttribute('data-ad-client', 'ca-pub-3681278136187746');
          adElement.setAttribute('data-ad-slot', slot);
          adElement.setAttribute('data-ad-format', format);
          if (responsive) {
            adElement.setAttribute('data-full-width-responsive', 'true');
          }
          
          adRef.current.appendChild(adElement);
          
          // Try to push the ad using a timeout to ensure script has loaded
          setTimeout(() => {
            try {
              if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
              }
            } catch (err) {
              // Silent error handling to avoid console warnings
            }
          }, 1000);
        } catch (err) {
          // Silent error handling
        }
      }
    }, 2000); // Longer delay before initializing

    return () => {
      clearTimeout(timer);
    };
  }, [slot, format, responsive]);

  // Container styles based on position
  const containerStyles = position === 'bottom' ? {
    mt: 8,                   // Large top margin
    mb: 0,                   // No bottom margin
    pb: 2,                   // Some padding at bottom
    position: 'relative',    // Relative positioning
  } : {
    mt: 1,
    mb: 1
  };

  return (
    <Container maxWidth="md" sx={containerStyles}>
      <Box sx={{ 
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: '2px',
        padding: '1px',
        background: 'rgba(255, 255, 255, 0.01)',
      }}>
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: '0.5rem'
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
            minHeight: '30px',
            maxHeight: '50px',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        />
      </Box>
    </Container>
  );
};

export default AdSenseDisplay; 