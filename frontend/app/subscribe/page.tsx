'use client';

import { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    TextField,
    FormControl,
    FormControlLabel,
    FormGroup,
    Checkbox,
    Select,
    MenuItem,
    Button,
    Alert,
    Chip,
    SelectChangeEvent,
    FormHelperText
} from '@mui/material';

interface SubscriptionForm {
    email: string;
    frequency: 'daily' | 'weekly' | 'both';
    currencies: string[];
    impactLevels: string[];
    dailyTime?: string;
    weeklyDay?: string;
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

export default function SubscribePage() {
    const [form, setForm] = useState<SubscriptionForm>({
        email: '',
        frequency: 'daily',
        currencies: [],
        impactLevels: [],
        dailyTime: '07:00',
        weeklyDay: 'sunday'
    });
    
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Determine the base URL based on hostname
            let baseUrl;
            if (typeof window !== 'undefined') {
                if (window.location.hostname === 'localhost') {
                    baseUrl = 'http://localhost:5000';
                } else if (window.location.hostname === '192.168.0.144') {
                    baseUrl = 'http://192.168.0.144:5000';
                } else {
                    baseUrl = 'http://141.95.123.145:5000';
                }
            } else {
                baseUrl = 'http://141.95.123.145:5000';
            }

            const response = await fetch(`${baseUrl}/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to subscribe');
            }

            setSuccess('Successfully subscribed! Please check your email to confirm your subscription.');
            setForm({
                email: '',
                frequency: 'daily',
                currencies: [],
                impactLevels: [],
                dailyTime: '07:00',
                weeklyDay: 'sunday'
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Typography 
                variant="h3" 
                component="h1" 
                gutterBottom 
                sx={{ 
                    textAlign: 'center',
                    color: '#fff',
                    mb: 6
                }}
            >
                Email Notifications
            </Typography>

            <Paper 
                elevation={3} 
                sx={{ 
                    p: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                }}
            >
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}
                
                {success && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                        {success}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Email Address
                        </Typography>
                        <TextField
                            fullWidth
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                            required
                            placeholder="Enter your email address"
                        />
                    </Box>

                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Notification Frequency
                        </Typography>
                        <FormControl component="fieldset">
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={form.frequency === 'daily' || form.frequency === 'both'}
                                            onChange={(e) => {
                                                if (e.target.checked && form.frequency === 'weekly') {
                                                    setForm(prev => ({ ...prev, frequency: 'both' }));
                                                } else if (e.target.checked) {
                                                    setForm(prev => ({ ...prev, frequency: 'daily' }));
                                                } else if (form.frequency === 'both') {
                                                    setForm(prev => ({ ...prev, frequency: 'weekly' }));
                                                } else {
                                                    setForm(prev => ({ ...prev, frequency: 'weekly' }));
                                                }
                                            }}
                                        />
                                    }
                                    label="Daily Morning Updates"
                                />
                                {(form.frequency === 'daily' || form.frequency === 'both') && (
                                    <Box sx={{ ml: 4, mt: 1 }}>
                                        <TextField
                                            type="time"
                                            value={form.dailyTime}
                                            onChange={(e) => setForm(prev => ({ ...prev, dailyTime: e.target.value }))}
                                            size="small"
                                        />
                                        <FormHelperText>Select time for daily updates (Your local time)</FormHelperText>
                                    </Box>
                                )}
                                
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={form.frequency === 'weekly' || form.frequency === 'both'}
                                            onChange={(e) => {
                                                if (e.target.checked && form.frequency === 'daily') {
                                                    setForm(prev => ({ ...prev, frequency: 'both' }));
                                                } else if (e.target.checked) {
                                                    setForm(prev => ({ ...prev, frequency: 'weekly' }));
                                                } else if (form.frequency === 'both') {
                                                    setForm(prev => ({ ...prev, frequency: 'daily' }));
                                                } else {
                                                    setForm(prev => ({ ...prev, frequency: 'daily' }));
                                                }
                                            }}
                                        />
                                    }
                                    label="Weekly Summary"
                                />
                                {(form.frequency === 'weekly' || form.frequency === 'both') && (
                                    <Box sx={{ ml: 4, mt: 1 }}>
                                        <FormControl size="small">
                                            <Select
                                                value={form.weeklyDay}
                                                onChange={(e) => setForm(prev => ({ ...prev, weeklyDay: e.target.value }))}
                                            >
                                                {weekDays.map(day => (
                                                    <MenuItem key={day.value} value={day.value}>
                                                        {day.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <FormHelperText>Select day for weekly summary</FormHelperText>
                                        </FormControl>
                                    </Box>
                                )}
                            </FormGroup>
                        </FormControl>
                    </Box>

                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Currencies of Interest
                        </Typography>
                        <FormControl fullWidth>
                            <Select
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
                                                    backgroundColor: '#1976d2',
                                                    color: '#fff'
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}
                            >
                                {currencyOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Select currencies you want to receive updates about</FormHelperText>
                        </FormControl>
                    </Box>

                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Impact Levels
                        </Typography>
                        <FormControl fullWidth>
                            <Select
                                multiple
                                value={form.impactLevels}
                                onChange={handleImpactChange}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => {
                                            const impact = impactOptions.find(opt => opt.value === value);
                                            return (
                                                <Chip 
                                                    key={value} 
                                                    label={value}
                                                    sx={{
                                                        backgroundColor: impact?.color,
                                                        color: '#fff'
                                                    }}
                                                />
                                            );
                                        })}
                                    </Box>
                                )}
                            >
                                {impactOptions.map((option) => (
                                    <MenuItem 
                                        key={option.value} 
                                        value={option.value}
                                        sx={{
                                            '&.Mui-selected': {
                                                backgroundColor: `${option.color}15`
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box
                                                sx={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    backgroundColor: option.color,
                                                    mr: 1
                                                }}
                                            />
                                            {option.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Select which impact levels you want to be notified about</FormHelperText>
                        </FormControl>
                    </Box>

                    <Box sx={{ textAlign: 'center' }}>
                        <Button 
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading || !form.email || (!form.currencies.length || !form.impactLevels.length)}
                            sx={{ minWidth: 200 }}
                        >
                            {loading ? 'Subscribing...' : 'Subscribe'}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
} 