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

export default function TermsConditions() {
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
              Terms and Conditions
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
                Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the FXALERT website ("Service") operated by FXALERT ("us", "we", or "our").
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
              </Typography>

              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                1. Accounts
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                2. Content
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Our Service allows you to view forex event information, news, and analysis. The content displayed on our Service is for informational purposes only.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                The financial information provided by FXALERT is not intended to be and does not constitute financial advice, investment advice, trading advice, or any other type of advice. You should not make any financial, investment, or trading decisions based solely on the information presented on our Service.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We do not guarantee the accuracy, completeness, or timeliness of the information on our Service. The information may change without notice, and we are not responsible for any errors, omissions, or delays.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                3. Intellectual Property
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                The Service and its original content, features, and functionality are and will remain the exclusive property of FXALERT and its licensors. The Service is protected by copyright, trademark, and other laws.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of FXALERT.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                4. Subscription and Payments
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Some parts of the Service are offered on a subscription basis. You will be billed in advance on a recurring and periodic basis (such as monthly or annually), depending on the type of subscription plan you select.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                At the end of each period, your subscription will automatically renew under the same conditions unless you cancel it or FXALERT cancels it. You may cancel your subscription by contacting us.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                All payments are processed securely through payment processors. FXALERT does not store your complete payment information on our servers.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                5. Disclaimer and Limitation of Liability
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                You expressly understand and agree that your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                To the maximum extent permitted by law, FXALERT shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses resulting from the use of or inability to use the Service.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                FXALERT does not warrant that the Service will be uninterrupted, timely, secure, or error-free; nor does it warrant that the results that may be obtained from the use of the Service will be accurate or reliable.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                6. Governing Law
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                These Terms shall be governed and construed in accordance with the laws of the United Kingdom, without regard to its conflict of law provisions.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                7. Changes to Terms
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect.
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
              </Typography>

              <Divider sx={{ my: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Typography variant="h5" gutterBottom sx={{ color: '#2196F3', mt: 4, mb: 2 }}>
                8. Contact Us
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                If you have any questions about these Terms, please contact us at:
              </Typography>
              <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Email: <a href="mailto:fxalert736@gmail.com" style={{ color: '#2196F3' }}>fxalert736@gmail.com</a>
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                You can also visit our <Link href="/contact" style={{ color: '#2196F3', textDecoration: 'none' }}>Contact Page</Link> to send us a message directly.
              </Typography>
            </Paper>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
} 