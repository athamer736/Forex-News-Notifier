'use client';

import React, { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip, 
  Alert, 
  CircularProgress, 
  FormHelperText, 
  Grid,
  SelectChangeEvent,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Paper,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

interface SubscriptionForm {
  email: string;
  currencies: string[];
  impactLevels: string[];
  frequency: 'daily' | 'weekly' | 'both';
  dailyTime: string;
  weeklyDay: string;
}

interface ApiResponse {
  message: string;
  data?: unknown;
}

const currencyOptions = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
    { value: 'NZD', label: 'NZD - New Zealand Dollar' }
];

const impactOptions = [
    { value: 'High', label: 'High Impact', color: '#d32f2f' },
    { value: 'Medium', label: 'Medium Impact', color: '#ed6c02' },
    { value: 'Low', label: 'Low Impact', color: '#2e7d32' },
    { value: 'Non-Economic', label: 'Non-Economic', color: '#424242' }
];

const weekDays = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
];

const motionVariants = {
    container: {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    } as Variants,

    item: {
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
    } as Variants,

    form: {
        hidden: { scale: 0.95, opacity: 0 },
        visible: {
            scale: 1,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 12
            }
        }
    } as Variants
};

function SubscribePage() {
    const router = useRouter();
    const [form, setForm] = useState<SubscriptionForm>({
        email: '',
        currencies: [],
        impactLevels: [],
        frequency: 'daily',
        dailyTime: '09:00',
        weeklyDay: 'monday'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleCurrencyChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        setForm(prev => ({
            ...prev,
            currencies: typeof value === 'string' ? value.split(',') : value
        }));
    };

    const handleImpactChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        setForm(prev => ({
            ...prev,
            impactLevels: typeof value === 'string' ? value.split(',') : value
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': typeof window !== 'undefined' ? window.location.origin : '',
                } as HeadersInit,
                credentials: 'include',
                body: JSON.stringify(form),
            });

            const data = await response.json() as ApiResponse;

            if (!response.ok) {
                throw new Error(data.message || 'Failed to subscribe');
            }

            setSuccess('Successfully subscribed! Please check your email for confirmation.');
            setForm(prev => ({
                ...prev,
                email: '',
                currencies: [],
                impactLevels: []
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
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
            <Container maxWidth="md">
                <motion.div
                    variants={motionVariants.container}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={motionVariants.item}>
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

                    <motion.div variants={motionVariants.item}>
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
                            Subscribe to Forex Updates
                        </Typography>
                    </motion.div>

                    <motion.div variants={motionVariants.item}>
                        <Typography
                            variant="h2"
                            sx={{
                                fontSize: { xs: '1.2rem', md: '1.5rem' },
                                textAlign: 'center',
                                mb: 6,
                                color: 'rgba(255, 255, 255, 0.8)'
                            }}
                        >
                            Get real-time notifications for your selected currency pairs and impact levels
                        </Typography>
                    </motion.div>

                    <motion.div variants={motionVariants.form}>
                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            sx={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 2,
                                p: 4,
                                mb: 4
                            }}
                        >
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                        error={!!error}
                                        helperText={error}
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                color: '#fff',
                                                '& fieldset': {
                                                    borderColor: 'rgba(255, 255, 255, 0.3)'
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: 'rgba(255, 255, 255, 0.5)'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#2196F3'
                                                }
                                            },
                                            '& .MuiInputLabel-root': {
                                                color: 'rgba(255, 255, 255, 0.7)'
                                            },
                                            '& .MuiFormHelperText-root': {
                                                color: '#f44336'
                                            }
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControl 
                                        fullWidth 
                                        error={!!error}
                                    >
                                        <InputLabel 
                                            id="currency-label"
                                            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                        >
                                            Currencies
                                        </InputLabel>
                                        <Select
                                            labelId="currency-label"
                                            multiple
                                            value={form.currencies}
                                            onChange={handleCurrencyChange}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((value) => (
                                                        <Chip 
                                                            key={value} 
                                                            label={value}
                                                            sx={{
                                                                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                                                color: '#fff'
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                            sx={{
                                                color: '#fff',
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(255, 255, 255, 0.3)'
                                                },
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(255, 255, 255, 0.5)'
                                                },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#2196F3'
                                                }
                                            }}
                                        >
                                            {currencyOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {error && (
                                            <FormHelperText>{error}</FormHelperText>
                                        )}
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControl 
                                        fullWidth
                                        error={!!error}
                                    >
                                        <InputLabel 
                                            id="impact-label"
                                            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                        >
                                            Impact Levels
                                        </InputLabel>
                                        <Select
                                            labelId="impact-label"
                                            multiple
                                            value={form.impactLevels}
                                            onChange={handleImpactChange}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((value) => (
                                                        <Chip 
                                                            key={value} 
                                                            label={value}
                                                            sx={{
                                                                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                                                color: '#fff'
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                            sx={{
                                                color: '#fff',
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(255, 255, 255, 0.3)'
                                                },
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(255, 255, 255, 0.5)'
                                                },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#2196F3'
                                                }
                                            }}
                                        >
                                            {impactOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {error && (
                                            <FormHelperText>{error}</FormHelperText>
                                        )}
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        fullWidth
                                        disabled={loading}
                                        sx={{
                                            height: 56,
                                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                            color: '#fff',
                                            fontWeight: 600,
                                            '&:hover': {
                                                background: 'linear-gradient(45deg, #1976D2 30%, #00B4E5 90%)'
                                            }
                                        }}
                                    >
                                        {loading ? (
                                            <CircularProgress size={24} sx={{ color: '#fff' }} />
                                        ) : (
                                            'Subscribe'
                                        )}
                                    </Button>
                                </Grid>
                            </Grid>

                            {error && (
                                <Alert 
                                    severity="error" 
                                    sx={{ 
                                        mt: 2,
                                        backgroundColor: 'rgba(211, 47, 47, 0.1)',
                                        color: '#ff1744',
                                        border: '1px solid rgba(211, 47, 47, 0.3)',
                                        '& .MuiAlert-icon': {
                                            color: '#ff1744'
                                        }
                                    }}
                                >
                                    {error}
                                </Alert>
                            )}

                            {success && (
                                <Alert 
                                    severity="success"
                                    sx={{ 
                                        mt: 2,
                                        backgroundColor: 'rgba(46, 125, 50, 0.1)',
                                        color: '#00e676',
                                        border: '1px solid rgba(46, 125, 50, 0.3)',
                                        '& .MuiAlert-icon': {
                                            color: '#00e676'
                                        }
                                    }}
                                >
                                    {success}
                                </Alert>
                            )}
                        </Box>
                    </motion.div>
                </motion.div>
            </Container>
        </Box>
    );
}

export default SubscribePage; 