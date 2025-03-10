'use client';

import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, CircularProgress, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function UnsubscribePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    const unsubscribe = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://fxalert.co.uk';
        const response = await fetch(`${baseUrl}/unsubscribe/${token}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Origin': typeof window !== 'undefined' ? window.location.origin : '',
          },
          credentials: 'include',
        });

        if (response.ok) {
          setStatus('success');
          setMessage('You have been successfully unsubscribed from forex news updates.');
        } else {
          const data = await response.json();
          setStatus('error');
          setMessage((data.error || 'Failed to unsubscribe. Please try again.') + 
            ' If you continue to experience issues, please contact us at fxalerts736@gmail.com');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while processing your request. Please try again. ' +
          'If the problem persists, please contact us at fxalerts736@gmail.com');
      }
    };

    unsubscribe();
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            }}
          >
            {status === 'loading' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: status === 'success' ? '#4caf50' : '#f44336',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    mb: 3,
                  }}
                >
                  {status === 'success' ? (
                    <Typography sx={{ color: 'white', fontSize: '40px' }}>✓</Typography>
                  ) : (
                    <Typography sx={{ color: 'white', fontSize: '40px' }}>✕</Typography>
                  )}
                </Box>

                <Typography
                  variant="h4"
                  sx={{
                    mb: 2,
                    color: status === 'success' ? '#4caf50' : '#f44336',
                    fontWeight: 'bold',
                  }}
                >
                  {status === 'success' ? 'Unsubscribed' : 'Error'}
                </Typography>

                <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
                  {message}
                </Typography>

                <Button
                  variant="contained"
                  onClick={() => router.push('/')}
                  sx={{
                    backgroundColor: status === 'success' ? '#4caf50' : '#f44336',
                    '&:hover': {
                      backgroundColor: status === 'success' ? '#45a049' : '#d32f2f',
                    },
                  }}
                >
                  {status === 'success' ? 'Return Home' : 'Try Again'}
                </Button>
              </>
            )}
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
} 