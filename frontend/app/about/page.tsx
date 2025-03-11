'use client';

import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  Grid,
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
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

const buttonVariants = {
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95 }
};

export default function About() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        py: 8,
        px: 2
      }}
    >
      <Container maxWidth="md">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Box sx={{ mb: 4 }}>
            <Button
              component={Link}
              href="/"
              startIcon={<ArrowBackIcon />}
              sx={{
                color: '#fff',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Back to Home
            </Button>
          </Box>

          <motion.div variants={itemVariants}>
            <Typography 
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 700,
                mb: 2,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              About FXALERT
            </Typography>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Typography 
              variant="body1"
              sx={{
                mb: 4,
                color: 'rgba(255, 255, 255, 0.7)'
              }}
            >
              Our journey, mission, and vision
            </Typography>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Paper elevation={3} sx={{ 
              p: 4,
              mb: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2
            }}>
              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 2, mb: 2 }}>
                The Birth of FXALERT
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                FXALERT began as a simple idea: to create a tool that would help forex traders stay informed about market-moving events without having to constantly monitor multiple news sources. What started as a personal project to solve our own trading challenges quickly evolved into something much bigger.
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                As traders ourselves, we understood the frustration of missing important economic announcements and the impact they could have on trading decisions. We envisioned a solution that would deliver timely, relevant notifications about significant forex events directly to users.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                Overcoming Challenges
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Building FXALERT wasn't without its struggles. We faced numerous technical hurdles, from creating reliable data scraping systems to building a notification infrastructure that could deliver alerts instantly. We spent countless late nights debugging complex issues and refining our algorithms to ensure accuracy.
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                One of our biggest challenges was developing a system that could not only gather forex news but also intelligently filter and prioritize it based on potential market impact. This required developing sophisticated natural language processing capabilities and market correlation models.
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We also grappled with the challenge of scaling our infrastructure to support a growing user base while maintaining performance and reliability. Each obstacle pushed us to innovate and improve our technical skills.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                What FXALERT Means to Us
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                FXALERT represents more than just a notification service—it's a testament to our passion for both trading and technology. This project embodies our belief that the right information, delivered at the right time, can empower traders to make more informed decisions.
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Each feature we've built carries with it countless hours of research, testing, and refinement. The clean interface masks the complex systems working behind the scenes to monitor global economic news, process data, and deliver personalized alerts.
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We take immense pride in knowing that our work helps traders around the world stay ahead of market movements and potentially improve their trading outcomes.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                Looking to the Future
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                As we continue to develop FXALERT, we remain committed to our original mission: providing traders with timely, accurate information about market-moving events. We have ambitious plans for new features, enhanced analytics, and expanded coverage of global markets.
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Our roadmap includes advanced customization options, integration with popular trading platforms, and AI-powered insights to help users not just receive notifications, but understand their potential impact.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                Support Our Journey
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                FXALERT is a labor of love maintained by a small team of dedicated developers and traders. Your support helps us cover server costs, improve our services, and continue building features that make forex trading more accessible.
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                If you find value in our service, please consider supporting our work with a donation. Every contribution, no matter the size, makes a significant difference to our small team.
              </Typography>

              <Box textAlign="center" sx={{ mt: 4 }}>
                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" style={{ display: 'inline-block' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => router.push('/donate')}
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
                    Support FXALERT
                  </Button>
                </motion.div>
              </Box>
            </Paper>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
} 