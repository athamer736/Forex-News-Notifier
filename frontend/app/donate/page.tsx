'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  CircularProgress,
  IconButton
} from '@mui/material';
import CoffeeIcon from '@mui/icons-material/Coffee';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { PaymentService } from '@/services/PaymentService';
import { useRouter } from 'next/navigation';

const DonationPage = () => {
  const router = useRouter();
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
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

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    },
    hover: {
      scale: 1.02,
      boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.2)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: 0.98
    }
  };

  const donationAmounts = [
    { amount: 5, icon: <CoffeeIcon />, text: "Buy us a coffee" },
    { amount: 10, icon: <FavoriteIcon />, text: "Show some love" },
    { amount: 25, icon: <StarIcon />, text: "Be a star" }
  ];

  const handleDonation = async (amount: number) => {
    try {
      setLoading(true);
      setError(null);
      
      if (paymentMethod === 'stripe') {
        await PaymentService.createStripeSession(amount);
      }
      // PayPal is handled by the PayPal button component
      
      setSelectedAmount(amount);
    } catch (error) {
      console.error('Payment error:', error);
      setError('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDonation = () => {
    const amount = parseFloat(customAmount);
    if (!isNaN(amount) && amount > 0) {
      handleDonation(amount);
    }
  };

  const handlePaymentMethodChange = (_event: React.SyntheticEvent, newValue: 'stripe' | 'paypal') => {
    setPaymentMethod(newValue);
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
      <Container maxWidth="md">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <IconButton
                onClick={() => router.push('/')}
                sx={{
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            </Box>
          </motion.div>

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
              Support Our Project
            </Typography>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.2rem', md: '1.5rem' },
                textAlign: 'center',
                mb: 6,
                color: 'rgba(255, 255, 255, 0.8)'
              }}
            >
              Help us maintain and improve our services by making a donation
            </Typography>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
              <Tabs
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
                sx={{
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#2196F3'
                  }
                }}
              >
                <Tab
                  value="stripe"
                  label="Credit Card"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-selected': {
                      color: '#2196F3'
                    }
                  }}
                />
                <Tab
                  value="paypal"
                  label="PayPal"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-selected': {
                      color: '#2196F3'
                    }
                  }}
                />
              </Tabs>
            </Box>
          </motion.div>

          <Grid container spacing={3} sx={{ mb: 6 }}>
            {donationAmounts.map((option) => (
              <Grid item xs={12} md={4} key={option.amount}>
                <motion.div
                  variants={cardVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Card
                    onClick={() => handleDonation(option.amount)}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      height: '100%'
                    }}
                  >
                    <CardContent
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 4
                      }}
                    >
                      <Box sx={{ color: '#2196F3', fontSize: '3rem', mb: 2 }}>
                        {option.icon}
                      </Box>
                      <Typography
                        variant="h4"
                        sx={{
                          mb: 2,
                          color: '#fff',
                          fontSize: { xs: '1.5rem', md: '2rem' }
                        }}
                      >
                        ${option.amount}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        {option.text}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          <motion.div variants={itemVariants}>
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                p: 4
              }}
            >
              {paymentMethod === 'stripe' ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <TextField
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                    type="number"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                      sx: {
                        color: '#fff',
                        '& input': {
                          color: '#fff'
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#2196F3'
                        }
                      }
                    }}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleCustomDonation}
                    disabled={!customAmount || parseFloat(customAmount) <= 0 || loading}
                    sx={{
                      px: 4,
                      py: 2,
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
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Donate'}
                  </Button>
                </Box>
              ) : (
                <PayPalScriptProvider options={{
                  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
                  components: 'buttons',
                  currency: 'USD'
                }}>
                  <Box sx={{ 
                    width: '100%', 
                    minHeight: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    '& .paypal-buttons': {
                      width: '100% !important',
                      maxWidth: '500px !important',
                      minWidth: '250px !important'
                    }
                  }}>
                    <PayPalButtons
                      style={{ 
                        layout: 'vertical',
                        shape: 'rect',
                        label: 'donate'
                      }}
                      createOrder={async () => {
                        try {
                          const amount = selectedAmount || parseFloat(customAmount) || 5;
                          const response = await fetch('/api/create-paypal-order', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              amount: amount,
                            }),
                          });

                          const orderData = await response.json();
                          if (!response.ok) {
                            throw new Error(orderData.error || 'Failed to create PayPal order');
                          }
                          return orderData.id;
                        } catch (error) {
                          console.error('PayPal order creation error:', error);
                          setError('Failed to create PayPal order. Please try again.');
                          throw error;
                        }
                      }}
                      onApprove={async (data) => {
                        try {
                          setLoading(true);
                          const response = await fetch('/api/capture-paypal-order', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              orderId: data.orderID,
                            }),
                          });

                          const orderData = await response.json();
                          if (!response.ok) {
                            throw new Error(orderData.error || 'Failed to capture PayPal payment');
                          }
                          
                          setShowThankYou(true);
                          return orderData;
                        } catch (error) {
                          console.error('PayPal capture error:', error);
                          setError('Failed to complete payment. Please try again.');
                          throw error;
                        } finally {
                          setLoading(false);
                        }
                      }}
                      onError={(err) => {
                        console.error('PayPal error:', err);
                        setError('PayPal encountered an error. Please try again.');
                      }}
                    />
                  </Box>
                </PayPalScriptProvider>
              )}
            </Box>
          </motion.div>
        </motion.div>
      </Container>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showThankYou}
        autoHideDuration={6000}
        onClose={() => setShowThankYou(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowThankYou(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Thank you for your donation! We really appreciate your support.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DonationPage; 