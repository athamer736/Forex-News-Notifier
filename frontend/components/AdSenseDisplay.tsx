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
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simple non-iframe implementation
    if (adRef.current && typeof window !== 'undefined') {
      try {
        // Clear any existing content
        adRef.current.innerHTML = '';
        
        // Create the ad element directly
        const adElement = document.createElement('ins');
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        adElement.style.width = '100%';
        adElement.style.height = '60px';  // Smaller height
        adElement.setAttribute('data-ad-client', 'ca-pub-3681278136187746');
        adElement.setAttribute('data-ad-slot', slot);
        adElement.setAttribute('data-ad-format', format);
        if (responsive) {
          adElement.setAttribute('data-full-width-responsive', 'true');
        }
        
        // Add to DOM
        adRef.current.appendChild(adElement);
        
        // Push to adsbygoogle
        try {
          // Check if AdSense is loaded
          if (window.adsbygoogle) {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } else {
            console.log('AdSense not loaded yet');
          }
        } catch (err) {
          console.error('Failed to push ad', err);
        }
      } catch (err) {
        console.error('Failed to initialize ad', err);
      }
    }
  }, [slot, format, responsive]);

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 2 }}>
      <Box sx={{ 
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        padding: '5px',
        background: 'rgba(255, 255, 255, 0.05)',
      }}>
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            mb: 0.5, 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.6rem'
          }}
        >
          {title}
        </Typography>
        
        <Box
          ref={adRef}
          component="div"
          sx={{
            display: 'block',
            width: '100%',
            minHeight: '60px',  // Smaller height
            maxHeight: '90px',  // Add max height
            overflow: 'hidden',
            textAlign: 'center',
            position: 'relative',
            ...style
          }}
        />
      </Box>
    </Container>
  );
};

export default AdSenseDisplay; 