'use client';

import React from 'react';
import { Container, Typography, Box, Paper, Divider, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
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

export default function PrivacyPolicy() {
  const lastUpdated = 'March 11, 2025';

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
              Privacy Policy
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
              Last updated: {lastUpdated}
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
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                FXALERT ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website fxalert.co.uk and use our services.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Please read this Privacy Policy carefully. By accessing or using our Service, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy.
              </Typography>

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                1. Information We Collect
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ color: 'white', mt: 3, mb: 1 }}>
                Personal Information
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We may collect personal information that you voluntarily provide to us when you:
              </Typography>
              <ul style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px' }}>
                <li>Register for an account</li>
                <li>Subscribe to our email notifications</li>
                <li>Contact us through our website</li>
                <li>Make a donation</li>
              </ul>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                This information may include your name, email address, and payment information when making donations.
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ color: 'white', mt: 3, mb: 1 }}>
                Automatically Collected Information
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                When you access our website, we may automatically collect certain information from your device, including:
              </Typography>
              <ul style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px' }}>
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Time zone setting and location</li>
                <li>Pages visited and how you interact with our content</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                2. How We Use Your Information
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We use the information we collect for various purposes, including to:
              </Typography>
              <ul style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px' }}>
                <li>Provide, maintain, and improve our services</li>
                <li>Send you notifications about forex events based on your preferences</li>
                <li>Process payments and donations</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Protect against unauthorized access and legal liability</li>
              </ul>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                3. Cookies and Tracking Technologies
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We use cookies and similar tracking technologies to track activity on our website and store certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                4. Data Sharing and Disclosure
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We may share your information in the following situations:
              </Typography>
              <ul style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px' }}>
                <li><strong>Third-Party Service Providers:</strong> We may share your information with third-party vendors, service providers, and payment processors who perform services on our behalf.</li>
                <li><strong>Legal Obligations:</strong> We may disclose your information where required by law or in response to valid requests by public authorities.</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another company.</li>
                <li><strong>With Your Consent:</strong> We may share your information for any other purpose with your consent.</li>
              </ul>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                5. Your Rights and Choices
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Depending on your location, you may have certain rights regarding your personal information:
              </Typography>
              <ul style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px' }}>
                <li>Access and update your personal information</li>
                <li>Request deletion of your personal information</li>
                <li>Object to processing of your personal information</li>
                <li>Data portability</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                To exercise these rights, please contact us at <a href="mailto:fxalert736@gmail.com" style={{ color: '#2196F3' }}>fxalert736@gmail.com</a>.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                6. Data Security
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We implement appropriate technical and organizational measures to protect the security of your personal information. However, please note that no method of transmission over the Internet or method of electronic storage is 100% secure.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                7. Changes to This Privacy Policy
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                You are advised to review this Privacy Policy periodically for any changes.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                8. Contact Us
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                If you have any questions about this Privacy Policy, please contact us at:
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Email: <a href="mailto:fxalert736@gmail.com" style={{ color: '#2196F3' }}>fxalert736@gmail.com</a>
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                You can also reach us through our <Link href="/contact" style={{ color: '#2196F3', textDecoration: 'none' }}>Contact Page</Link> for any inquiries or concerns.
              </Typography>
            </Paper>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
} 