'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Container, Typography, Grid, IconButton, Divider, SvgIcon } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import EmailIcon from '@mui/icons-material/Email';
import FavoriteIcon from '@mui/icons-material/Favorite';

// Custom X (formerly Twitter) icon
const XIcon = (props: React.ComponentProps<typeof SvgIcon>) => (
  <SvgIcon {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </SvgIcon>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        px: 2,
        mt: 'auto',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2196F3' }}>
              FXALERT
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Real-time forex events tracker providing timely notifications for critical market movements.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <IconButton 
                aria-label="LinkedIn" 
                size="small"
                component="a"
                href="https://www.linkedin.com/in/ahmed-thamer-0bb494289/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'rgba(255, 255, 255, 0.7)', '&:hover': { color: '#2196F3' } }}
              >
                <LinkedInIcon />
              </IconButton>
              {/* X (Twitter) link temporarily commented out
              <IconButton 
                aria-label="X (formerly Twitter)" 
                size="small"
                component="a"
                href="https://x.com/th55mer"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'rgba(255, 255, 255, 0.7)', '&:hover': { color: '#2196F3' } }}
              >
                <XIcon />
              </IconButton>
              */}
              <IconButton 
                aria-label="GitHub" 
                size="small"
                component="a"
                href="https://github.com/athamer736"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'rgba(255, 255, 255, 0.7)', '&:hover': { color: '#2196F3' } }}
              >
                <GitHubIcon />
              </IconButton>
              <IconButton 
                aria-label="Email" 
                size="small"
                component="a"
                href="mailto:fxalert736@gmail.com"
                sx={{ color: 'rgba(255, 255, 255, 0.7)', '&:hover': { color: '#2196F3' } }}
              >
                <EmailIcon />
              </IconButton>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2196F3' }}>
              Links
            </Typography>
            <Typography variant="body2" component={Link} href="/" sx={{ 
              display: 'block', 
              mb: 1.5, 
              color: 'rgba(255, 255, 255, 0.7)',
              textDecoration: 'none',
              '&:hover': { color: '#2196F3' }
            }}>
              Home
            </Typography>
            <Typography variant="body2" component={Link} href="/events" sx={{ 
              display: 'block', 
              mb: 1.5, 
              color: 'rgba(255, 255, 255, 0.7)', 
              textDecoration: 'none',
              '&:hover': { color: '#2196F3' }
            }}>
              Events Calendar
            </Typography>
            <Typography variant="body2" component={Link} href="/donate" sx={{ 
              display: 'block', 
              mb: 1.5, 
              color: 'rgba(255, 255, 255, 0.7)', 
              textDecoration: 'none',
              '&:hover': { color: '#2196F3' }
            }}>
              Donate
            </Typography>
            <Typography variant="body2" component={Link} href="/about" sx={{ 
              display: 'block', 
              mb: 1.5, 
              color: 'rgba(255, 255, 255, 0.7)', 
              textDecoration: 'none',
              '&:hover': { color: '#2196F3' }
            }}>
              About Us
            </Typography>
            <Typography variant="body2" component={Link} href="/subscribe" sx={{ 
              display: 'block', 
              mb: 1.5, 
              color: 'rgba(255, 255, 255, 0.7)', 
              textDecoration: 'none',
              '&:hover': { color: '#2196F3' }
            }}>
              Subscribe
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2196F3' }}>
              Legal
            </Typography>
            <Typography variant="body2" component={Link} href="/contact" sx={{ 
              display: 'block', 
              mb: 1.5, 
              color: 'rgba(255, 255, 255, 0.7)', 
              textDecoration: 'none',
              '&:hover': { color: '#2196F3' }
            }}>
              Contact Us
            </Typography>
            <Typography variant="body2" component={Link} href="/privacy-policy" sx={{ 
              display: 'block', 
              mb: 1.5, 
              color: 'rgba(255, 255, 255, 0.7)', 
              textDecoration: 'none',
              '&:hover': { color: '#2196F3' }
            }}>
              Privacy Policy
            </Typography>
            <Typography variant="body2" component={Link} href="/terms-conditions" sx={{ 
              display: 'block', 
              mb: 1.5, 
              color: 'rgba(255, 255, 255, 0.7)', 
              textDecoration: 'none',
              '&:hover': { color: '#2196F3' }
            }}>
              Terms & Conditions
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            © {currentYear} FXALERT. All rights reserved.
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center" 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              ml: 1,
              color: 'rgba(255, 255, 255, 0.5)'
            }}
          >
            Any bugs or issues, please contact us at fxalert736@gmail.com.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 