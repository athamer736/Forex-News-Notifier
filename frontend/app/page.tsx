'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Container, Typography, Button, Grid, useTheme, IconButton } from '@mui/material';
import { useRouter } from 'next/navigation';
import TimelineIcon from '@mui/icons-material/Timeline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CloseIcon from '@mui/icons-material/Close';
import dynamic from 'next/dynamic';
import Script from 'next/script';

// Import AdSenseDisplay with dynamic to avoid SSR issues
const AdSenseDisplay = dynamic(() => import('../components/AdSenseDisplay'), { ssr: false });
const AdSenseAd = dynamic(() => import('../components/AdSenseAd'), { ssr: false });

const HomePage = () => {
  const theme = useTheme();
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(true);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const cardVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: 0.95
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: '#fff',
        pt: 8,
        pb: 12
      }}
    >
      {/* System Alert Notification Banner */}
      {showAlert && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            backgroundColor: '#ed6c02', // Amber color
            color: 'white',
            padding: '12px',
            zIndex: 9999,
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
            SYSTEM ALERT: We understand we have slight issues with the custom date range filter. Our team is working to fix it. Thank you for your patience.
          </Typography>
          <IconButton 
            aria-label="close alert" 
            onClick={() => setShowAlert(false)}
            sx={{ 
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}

      <Container maxWidth="lg">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 700,
                textAlign: 'center',
                mb: 2,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Forex News Notifier
            </Typography>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.5rem', md: '2rem' },
                textAlign: 'center',
                mb: 6,
                color: 'rgba(255, 255, 255, 0.8)'
              }}
            >
              Stay ahead with real-time forex market updates
            </Typography>
          </motion.div>

          {/* Feature Cards */}
          <Grid container spacing={4} sx={{ mb: 8 }}>
            <Grid item xs={12} md={4}>
              <motion.div variants={cardVariants}>
                <Box
                  sx={{
                    p: 4,
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-10px)',
                      background: 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <TimelineIcon sx={{ fontSize: 48, color: '#2196F3', mb: 2 }} />
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    Live Events
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Track real-time forex events and market updates with our intuitive calendar interface.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={4}>
              <motion.div variants={cardVariants}>
                <Box
                  sx={{
                    p: 4,
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-10px)',
                      background: 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <NotificationsActiveIcon sx={{ fontSize: 48, color: '#2196F3', mb: 2 }} />
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    Smart Notifications
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Get instant alerts for important market events and currency pair updates.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={4}>
              <motion.div variants={cardVariants}>
                <Box
                  sx={{
                    p: 4,
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-10px)',
                      background: 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <FavoriteIcon sx={{ fontSize: 48, color: '#2196F3', mb: 2 }} />
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    Support Us
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Help us maintain and improve our services by contributing to our project.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}
          >
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/events')}
                sx={{
                  px: 4,
                  py: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  color: 'white',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)'
                  }
                }}
              >
                View Events
              </Button>
            </motion.div>

            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push('/subscribe')}
                sx={{
                  px: 4,
                  py: 2,
                  borderRadius: 2,
                  borderColor: '#2196F3',
                  color: '#2196F3',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  '&:hover': {
                    borderColor: '#1976D2',
                    background: 'rgba(33, 150, 243, 0.1)'
                  }
                }}
              >
                Subscribe
              </Button>
            </motion.div>

            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push('/donate')}
                sx={{
                  px: 4,
                  py: 2,
                  borderRadius: 2,
                  borderColor: '#2196F3',
                  color: '#2196F3',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  '&:hover': {
                    borderColor: '#1976D2',
                    background: 'rgba(33, 150, 243, 0.1)'
                  }
                }}
              >
                Donate
              </Button>
            </motion.div>

            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push('/about')}
                sx={{
                  px: 4,
                  py: 2,
                  borderRadius: 2,
                  borderColor: '#2196F3',
                  color: '#2196F3',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  '&:hover': {
                    borderColor: '#1976D2',
                    background: 'rgba(33, 150, 243, 0.1)'
                  }
                }}
              >
                About Us
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </Container>

      {/* AdSense Display Section */}
      <Container maxWidth="md" sx={{ mt: 6, mb: 4 }}>
        <Box sx={{
          width: '100%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          overflow: 'hidden',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.1)',
        }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 2, textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Advertisement
          </Typography>

          <Box
            component="div"
            sx={{
              position: 'relative',
              minHeight: '600px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              padding: '10px'
            }}
          >
            {/* Direct AdSense implementation */}
            <div style={{ minHeight: '600px', width: '100%' }}>
              <script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746"
                crossOrigin="anonymous"
              />
              <ins
                className="adsbygoogle"
                style={{ display: 'block', minHeight: '600px', width: '100%' }}
                data-ad-client="ca-pub-3681278136187746"
                data-ad-slot="3528778902"
                data-ad-format="autorelaxed"
                data-full-width-responsive="true"
              />
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    (adsbygoogle = window.adsbygoogle || []).push({});
                  `
                }}
              />
            </div>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
