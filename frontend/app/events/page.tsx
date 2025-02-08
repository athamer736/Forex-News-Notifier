'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Container, CircularProgress, Chip, Alert, Select, MenuItem, FormControl, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import TableViewIcon from '@mui/icons-material/TableView';
import GridViewIcon from '@mui/icons-material/GridView';

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

interface CurrencyOption {
    value: string;
    label: string;
}

const timeRangeOptions: TimeRangeOption[] = [
    { value: '24h', label: 'Next 24 Hours' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'week', label: 'Current Week' },
    { value: 'remaining_week', label: 'Remaining Week' }
];

const currencyOptions: CurrencyOption[] = [
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

function EventsPage() {
    const [events, setEvents] = useState<ForexEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<string>('24h');
    const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
    const [selectedImpacts, setSelectedImpacts] = useState<string[]>([]);
    const [retryTimer, setRetryTimer] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    const fetchEvents = async () => {
        try {
            setError(null);
            setLoading(true);
            const userId = localStorage.getItem('userId') || 'default';
            
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
                baseUrl = 'http://141.95.123.145:5000'; // Default to server
            }
            
            console.log('Using base URL:', baseUrl);
            console.log('Fetching events for user:', userId);

            // Add currencies and impacts to the query parameters if any are selected
            const currencyParam = selectedCurrencies.length > 0 ? `&currencies=${selectedCurrencies.join(',')}` : '';
            const impactParam = selectedImpacts.length > 0 ? `&impacts=${selectedImpacts.join(',')}` : '';
            
            const response = await fetch(`${baseUrl}/events?userId=${userId}&range=${timeRange}${currencyParam}${impactParam}`, {
                mode: 'cors',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Origin': typeof window !== 'undefined' ? window.location.origin : '',
                }
            });
            
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
                    baseUrl = 'http://141.95.123.145:5000'; // Default to server
                }
                
                console.log('Using base URL:', baseUrl);

                const response = await fetch(`${baseUrl}/timezone`, {
                    method: 'POST',
                    mode: 'cors',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Origin': typeof window !== 'undefined' ? window.location.origin : '',
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
    }, [timeRange, selectedCurrencies, selectedImpacts]);

    const getImpactColor = (impact: string) => {
        switch (impact.toLowerCase()) {
            case 'high':
                return '#d32f2f';
            case 'medium':
                return '#ed6c02';
            case 'low':
                return '#2e7d32';
            case 'non-economic':
                return '#424242';
            default:
                return '#424242';
        }
    };

    const handleCurrencyChange = (event: any) => {
        const value = event.target.value;
        setSelectedCurrencies(typeof value === 'string' ? value.split(',') : value);
    };

    const handleRemoveCurrency = (currencyToRemove: string) => {
        setSelectedCurrencies(prev => prev.filter(currency => currency !== currencyToRemove));
    };

    const handleImpactChange = (event: any) => {
        const value = event.target.value;
        setSelectedImpacts(typeof value === 'string' ? value.split(',') : value);
    };

    const handleRemoveImpact = (impactToRemove: string) => {
        setSelectedImpacts(prev => prev.filter(impact => impact !== impactToRemove));
    };

    const TableView = () => (
        <TableContainer component={Paper} sx={{ maxWidth: '1600px', margin: '0 auto', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
            <Table sx={{ minWidth: 650 }}>
                <TableHead>
                    <TableRow sx={{ 
                        '& th': { 
                            color: '#000', 
                            fontWeight: 600,
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                        } 
                    }}>
                        <TableCell>Time</TableCell>
                        <TableCell>Currency</TableCell>
                        <TableCell>Impact</TableCell>
                        <TableCell>Event</TableCell>
                        <TableCell align="right">Forecast</TableCell>
                        <TableCell align="right">Previous</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {events.map((event, index) => (
                        <TableRow
                            key={`${event.time}-${event.event_title}-${index}`}
                            sx={{ 
                                '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' },
                                '&:nth-of-type(even)': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                                '& td': { 
                                    color: '#000',
                                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                                }
                            }}
                        >
                            <TableCell>{event.time}</TableCell>
                            <TableCell>
                                <Chip 
                                    label={event.currency}
                                    size="small"
                                    sx={{ 
                                        fontWeight: 'bold',
                                        backgroundColor: '#e3f2fd',
                                        color: '#1976d2'
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={event.impact}
                                    size="small"
                                    sx={{ 
                                        fontWeight: 'medium',
                                        minWidth: '80px',
                                        backgroundColor: getImpactColor(event.impact),
                                        color: '#fff'
                                    }}
                                />
                            </TableCell>
                            <TableCell>{event.event_title}</TableCell>
                            <TableCell align="right">{event.forecast || 'N/A'}</TableCell>
                            <TableCell align="right">{event.previous || 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const GridView = () => (
        <Box 
            sx={{ 
                display: 'grid',
                gridTemplateColumns: events.length === 1 
                    ? 'minmax(450px, 1fr)'
                    : events.length === 2 
                        ? 'repeat(2, minmax(450px, 1fr))'
                        : 'repeat(3, minmax(450px, 1fr))',
                gap: 3,
                maxWidth: events.length === 1 
                    ? '600px' 
                    : events.length === 2 
                        ? '1200px' 
                        : '1600px',
                margin: '0 auto',
                padding: '0 16px',
                justifyContent: 'center',
                '@media (max-width: 1500px)': {
                    gridTemplateColumns: 'repeat(2, minmax(450px, 1fr))',
                    maxWidth: '1200px'
                },
                '@media (max-width: 1000px)': {
                    gridTemplateColumns: '1fr',
                    maxWidth: '600px'
                },
                '& > *': {
                    justifySelf: 'center',
                    width: '100%',
                    maxWidth: '500px'
                }
            }}
        >
            {events.map((event, index) => (
                <Card 
                    key={`${event.time}-${event.event_title}-${index}`}
                    sx={{ 
                        height: '100%',
                        minHeight: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 3,
                        }
                    }}
                >
                    <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Typography 
                                variant="subtitle1" 
                                component="div" 
                                sx={{ fontWeight: 500 }}
                            >
                                {event.time}
                            </Typography>
                            <Chip 
                                label={event.impact}
                                size="small"
                                sx={{ 
                                    fontWeight: 'medium',
                                    minWidth: '80px',
                                    backgroundColor: getImpactColor(event.impact),
                                    color: '#fff'
                                }}
                            />
                        </Box>
                        
                        <Box mb={2}>
                            <Chip 
                                label={event.currency}
                                size="small"
                                sx={{ 
                                    mb: 1,
                                    fontWeight: 'bold',
                                    backgroundColor: '#e3f2fd',
                                    color: '#1976d2'
                                }}
                            />
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {event.event_title}
                            </Typography>
                        </Box>
                        
                        <Box 
                            display="flex" 
                            gap={2} 
                            mt="auto"
                            sx={{
                                '& > div': {
                                    flex: 1,
                                    textAlign: 'center',
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid',
                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                }
                            }}
                        >
                            <div>
                                <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    display="block"
                                >
                                    Forecast
                                </Typography>
                                <Typography variant="body2" fontWeight="500">
                                    {event.forecast || 'N/A'}
                                </Typography>
                            </div>
                            <div>
                                <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    display="block"
                                >
                                    Previous
                                </Typography>
                                <Typography variant="body2" fontWeight="500">
                                    {event.previous || 'N/A'}
                                </Typography>
                            </div>
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );

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
                        color: '#cccccc',
                        transition: 'color 0.3s ease',
                        mb: 4
                    }}
                >
                    Forex Economic Calendar
                </Typography>
                
                <Box 
                    display="flex" 
                    flexDirection="row" 
                    justifyContent="center" 
                    alignItems="flex-start" 
                    gap={4} 
                    mb={6}
                    sx={{
                        flexWrap: 'wrap',
                        maxWidth: '1200px',
                        margin: '0 auto',
                        position: 'relative'  // Added for view toggle positioning
                    }}
                >
                    {/* View Toggle Button */}
                    <Box 
                        sx={{ 
                            position: 'absolute',
                            right: 0,
                            top: -50,
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            padding: '4px'
                        }}
                    >
                        <IconButton 
                            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                            sx={{ 
                                color: '#000',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                }
                            }}
                        >
                            {viewMode === 'grid' ? <TableViewIcon /> : <GridViewIcon />}
                        </IconButton>
                    </Box>

                    {/* Time Range Filter */}
                    <Box sx={{ minWidth: '250px' }}>
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
                        <FormControl fullWidth>
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

                    {/* Currency Filter */}
                    <Box sx={{ minWidth: '250px' }}>
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
                            Currencies
                        </Typography>
                        <FormControl fullWidth>
                            <Select
                                multiple
                                value={selectedCurrencies}
                                onChange={handleCurrencyChange}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {(selected as string[]).map((value) => (
                                            <Chip 
                                                key={value} 
                                                label={value}
                                                onDelete={() => handleRemoveCurrency(value)}
                                                onMouseDown={(event) => {
                                                    event.stopPropagation();
                                                }}
                                                sx={{
                                                    backgroundColor: '#1976d2',
                                                    color: '#fff',
                                                    '& .MuiChip-deleteIcon': {
                                                        color: '#fff',
                                                        '&:hover': {
                                                            color: '#ff4444'
                                                        }
                                                    }
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}
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
                                {currencyOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Impact Filter */}
                    <Box sx={{ minWidth: '250px' }}>
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
                            Impact Levels
                        </Typography>
                        <FormControl fullWidth>
                            <Select
                                multiple
                                value={selectedImpacts}
                                onChange={handleImpactChange}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {(selected as string[]).map((value) => (
                                            <Chip 
                                                key={value} 
                                                label={value}
                                                onDelete={() => handleRemoveImpact(value)}
                                                onMouseDown={(event) => {
                                                    event.stopPropagation();
                                                }}
                                                sx={{
                                                    backgroundColor: getImpactColor(value),
                                                    color: '#fff',
                                                    '& .MuiChip-deleteIcon': {
                                                        color: '#fff',
                                                        '&:hover': {
                                                            color: '#ff4444'
                                                        }
                                                    }
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}
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
                                {impactOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
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
                                                <span>{option.label}</span>
                                            </Box>
                                            {selectedImpacts.includes(option.value) && (
                                                <Chip 
                                                    size="small" 
                                                    label="Selected" 
                                                    sx={{ 
                                                        ml: 1,
                                                        backgroundColor: option.color,
                                                        color: '#fff'
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
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
                viewMode === 'grid' ? <GridView /> : <TableView />
            )}
        </Container>
    );
}

export default dynamic(() => Promise.resolve(EventsPage), {
    ssr: false
});
