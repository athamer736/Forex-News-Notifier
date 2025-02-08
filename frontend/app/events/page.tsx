'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Container, CircularProgress, Chip, Alert, Select, MenuItem, FormControl } from '@mui/material';

interface ForexEvent {
    time: string;
    currency: string;
    impact: string;
    event_title: string;
    forecast: string;
    previous: string;
}

interface TimeRangeOption {
    value: string;
    label: string;
}

const timeRangeOptions: TimeRangeOption[] = [
    { value: '1h', label: 'Next Hour' },
    { value: '4h', label: 'Next 4 Hours' },
    { value: '8h', label: 'Next 8 Hours' },
    { value: '12h', label: 'Next 12 Hours' },
    { value: '24h', label: 'Next 24 Hours' },
    { value: 'today', label: 'Rest of Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'week', label: 'Next 7 Days' },
];

function EventsPage() {
    const [events, setEvents] = useState<ForexEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<string>('24h');
    const [retryTimer, setRetryTimer] = useState<number | null>(null);

    const fetchEvents = async () => {
        try {
            setError(null);
            setLoading(true);
            const userId = localStorage.getItem('userId') || 'default';
            const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                ? 'http://localhost:5000'
                : 'http://141.95.123.145:5000';
            
            console.log('Fetching events for user:', userId);
            const response = await fetch(`${baseUrl}/events?userId=${userId}&range=${timeRange}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || 'Failed to fetch events';
                
                // Check if it's a rate limit error with retry information
                if (errorMessage.includes('Rate limit exceeded') && errorMessage.includes('Retrying in')) {
                    const seconds = parseInt(errorMessage.match(/\d+/)[0]);
                    setRetryTimer(seconds);
                    throw new Error(`Rate limit exceeded. Retrying in ${seconds} seconds...`);
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('Received events:', data);
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch events');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (retryTimer !== null) {
            const timer = setTimeout(() => {
                setRetryTimer(null);
                setError(null);
                fetchEvents();  // Retry the fetch
            }, retryTimer * 1000);
            return () => clearTimeout(timer);
        }
    }, [retryTimer]);

    useEffect(() => {
        const setUserTimezone = async () => {
            try {
                const userId = localStorage.getItem('userId') || 'default';
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const offset = new Date().getTimezoneOffset();
                
                console.log('Current timezone:', timezone);
                console.log('Current offset:', offset);
                
                const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                    ? 'http://localhost:5000'
                    : 'http://141.95.123.145:5000';

                const response = await fetch(`${baseUrl}/timezone`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId,
                        timezone,
                        offset,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Timezone set response:', data);
                    localStorage.setItem('timezone', timezone);
                    localStorage.setItem('userId', userId);
                } else {
                    console.error('Failed to set timezone:', await response.text());
                }
            } catch (error) {
                console.error('Error setting timezone:', error);
            }
        };

        // Set timezone and fetch events
        setUserTimezone().then(fetchEvents);

        // Set up interval for fetching events
        const interval = setInterval(() => {
            setUserTimezone().then(fetchEvents);
        }, 5 * 60 * 1000);  // Refresh every 5 minutes
        
        return () => clearInterval(interval);
    }, [timeRange]);

    const getImpactColor = (impact: string) => {
        switch (impact.toLowerCase()) {
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'success';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {error && (
                <Box mb={4}>
                    <Alert 
                        severity={error.includes('Rate limit') ? "info" : "error"}
                        sx={{ mb: 2 }}
                    >
                        {error}
                        {retryTimer !== null && (
                            <Box component="span" sx={{ display: 'block', mt: 1 }}>
                                Retrying automatically...
                            </Box>
                        )}
                    </Alert>
                </Box>
            )}

            <Box mb={6} textAlign="center">
                <Typography 
                    variant="h3" 
                    component="h1" 
                    gutterBottom
                    sx={{
                        fontWeight: 'bold',
                        color: '#666666',
                        transition: 'color 0.3s ease'
                    }}
                >
                    Forex Economic Calendar
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Stay updated with the latest economic events
                </Typography>
                
                <Box mt={4} mb={4}>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            mb: 2,
                            fontWeight: 600,
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        Time Range
                    </Typography>
                    <FormControl sx={{ minWidth: 250 }}>
                        <Select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            sx={{
                                backgroundColor: '#fff',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.7)',
                                },
                            }}
                        >
                            {timeRangeOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {(!events || events.length === 0) && (
                <Box textAlign="center">
                    <Typography variant="h6" color="text.secondary">
                        No events available for the selected time range
                    </Typography>
                </Box>
            )}

            {events && events.length > 0 && (
                <Box display="flex" flexDirection="column" gap={3}>
                    {events.map((event, index) => (
                        <Card 
                            key={`${event.time}-${event.event_title}-${index}`}
                            sx={{ 
                                width: '100%',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 3,
                                }
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                                    <Box>
                                        <Typography 
                                            variant="h6" 
                                            component="div" 
                                            gutterBottom
                                            sx={{ fontWeight: 500 }}
                                        >
                                            {event.time}
                                        </Typography>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Chip 
                                                label={event.currency}
                                                size="small"
                                                sx={{ 
                                                    fontWeight: 'bold',
                                                    backgroundColor: '#e3f2fd',
                                                    color: '#1976d2'
                                                }}
                                            />
                                            <Typography variant="subtitle1">
                                                {event.event_title}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Chip 
                                        label={event.impact}
                                        color={getImpactColor(event.impact) as any}
                                        size="small"
                                        sx={{ 
                                            fontWeight: 'medium',
                                            minWidth: '80px'
                                        }}
                                    />
                                </Box>
                                <Box 
                                    display="flex" 
                                    gap={4} 
                                    sx={{
                                        '& > div': {
                                            flex: 1,
                                            textAlign: 'center',
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                        }
                                    }}
                                >
                                    <div>
                                        <Typography 
                                            variant="subtitle2" 
                                            color="text.secondary"
                                            sx={{ mb: 1 }}
                                        >
                                            Forecast
                                        </Typography>
                                        <Typography variant="body1" fontWeight="500">
                                            {event.forecast || 'N/A'}
                                        </Typography>
                                    </div>
                                    <div>
                                        <Typography 
                                            variant="subtitle2" 
                                            color="text.secondary"
                                            sx={{ mb: 1 }}
                                        >
                                            Previous
                                        </Typography>
                                        <Typography variant="body1" fontWeight="500">
                                            {event.previous || 'N/A'}
                                        </Typography>
                                    </div>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}
        </Container>
    );
}

export default dynamic(() => Promise.resolve(EventsPage), {
    ssr: false
});
