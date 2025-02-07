'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Container, CircularProgress, Chip, Alert } from '@mui/material';

interface ForexEvent {
    time: string;
    currency: string;
    impact: string;
    event_title: string;
    forecast: string;
    previous: string;
}

export default function EventsPage() {
    const [events, setEvents] = useState<ForexEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const fetchEvents = async () => {
            try {
                setError(null);
                const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                    ? 'http://localhost:5000/events'
                    : 'http://141.95.123.145:5000/events';
                
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch events');
                }
                const data = await response.json();
                setEvents(data);
            } catch (error) {
                console.error('Error fetching events:', error);
                setError(error instanceof Error ? error.message : 'Failed to fetch events');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

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

    // Don't render anything until client-side hydration is complete
    if (!mounted) return null;

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box mb={6} textAlign="center">
                <Typography 
                    variant="h3" 
                    component="h1" 
                    gutterBottom
                    sx={{
                        fontWeight: 'bold',
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Forex Economic Calendar
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Stay updated with the latest economic events
                </Typography>
            </Box>

            {error && (
                <Box mb={4}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                </Box>
            )}

            {!error && events.length === 0 && (
                <Box textAlign="center">
                    <Typography variant="h6" color="text.secondary">
                        No events available at the moment
                    </Typography>
                </Box>
            )}

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
                                        bgcolor: (theme) => theme.palette.mode === 'dark' 
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(0, 0, 0, 0.02)',
                                        border: '1px solid',
                                        borderColor: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.1)'
                                            : 'rgba(0, 0, 0, 0.1)',
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
        </Container>
    );
}
