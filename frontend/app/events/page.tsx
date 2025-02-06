'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Container, CircularProgress, Chip } from '@mui/material';

interface ForexEvent {
    time: string;
    currency: string;
    impact: string;
    event_title: string;
    details: string;
    forecast: string;
    actual: string;
    previous: string;
}

export default function EventsPage() {
    const [events, setEvents] = useState<ForexEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // Use window.location to dynamically determine the API URL
                const apiUrl = window.location.hostname === 'localhost' 
                    ? 'http://localhost:5000/events'
                    : 'http://141.95.123.145:5000/events';
                
                const response = await fetch(apiUrl);
                const data = await response.json();
                setEvents(data);
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
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

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom>
                Upcoming Forex Events
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
                {events.map((event, index) => (
                    <Card key={index} sx={{ width: '100%' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" component="div">
                                    {event.time} - {event.currency}
                                </Typography>
                                <Chip 
                                    label={event.impact}
                                    color={getImpactColor(event.impact) as any}
                                    size="small"
                                />
                            </Box>
                            <Typography variant="body1" gutterBottom>
                                {event.event_title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {event.details}
                            </Typography>
                            <Box 
                                display="flex" 
                                gap={3} 
                                mt={2}
                                sx={{
                                    '& > div': {
                                        flex: 1,
                                        textAlign: 'center',
                                        p: 1,
                                        borderRadius: 1,
                                        bgcolor: 'background.paper'
                                    }
                                }}
                            >
                                <div>
                                    <Typography variant="caption" display="block">Forecast</Typography>
                                    <Typography variant="body2">{event.forecast || 'N/A'}</Typography>
                                </div>
                                <div>
                                    <Typography variant="caption" display="block">Actual</Typography>
                                    <Typography variant="body2">{event.actual || 'N/A'}</Typography>
                                </div>
                                <div>
                                    <Typography variant="caption" display="block">Previous</Typography>
                                    <Typography variant="body2">{event.previous || 'N/A'}</Typography>
                                </div>
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>
        </Container>
    );
}
