'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Container, Typography, Button, Grid, useTheme } from '@mui/material';
import { useRouter } from 'next/navigation';
import TimelineIcon from '@mui/icons-material/Timeline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import FavoriteIcon from '@mui/icons-material/Favorite';

const HomePage = () => {
  const theme = useTheme();
  const router = useRouter();

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
    </Box>
  );
};

export default HomePage;
