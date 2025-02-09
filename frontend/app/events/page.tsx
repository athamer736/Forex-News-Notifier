'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Container, CircularProgress, Chip, Alert, Select, MenuItem, FormControl, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, SelectChangeEvent, TextField, Button, Menu, Popover } from '@mui/material';
import TableViewIcon from '@mui/icons-material/TableView';
import GridViewIcon from '@mui/icons-material/GridView';
import Image from 'next/image';
import { GB, US, FR, DE, JP, CN, SG, AU } from 'country-flag-icons/react/3x2';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface ForexEvent {
    time: string;
    currency: string;
    impact: string;
    event_title: string;
    forecast: string;
    previous: string;
    isNew: boolean;
}

interface TimeRangeOption {
    value: string;
    label: string;
}

interface CurrencyOption {
    value: string;
    label: string;
}

interface TimezoneOption {
    value: string;
    label: string;
    FlagComponent?: React.ComponentType<{ title?: string; className?: string }>;
}

const timeRangeOptions: TimeRangeOption[] = [
    { value: '24h', label: 'Next 24 Hours' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'previous_week', label: 'Previous Week' },
    { value: 'week', label: 'Current Week' },
    { value: 'next_week', label: 'Next Week' },
    { value: 'specific_date', label: 'Specific Date' }
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

const timezoneOptions: TimezoneOption[] = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'New York (EST/EDT)', FlagComponent: US },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)', FlagComponent: US },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)', FlagComponent: US },
    { value: 'Europe/London', label: 'London (GMT/BST)', FlagComponent: GB },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)', FlagComponent: FR },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', FlagComponent: DE },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)', FlagComponent: JP },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)', FlagComponent: CN },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)', FlagComponent: SG },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', FlagComponent: AU }
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
    const [selectedTimezone, setSelectedTimezone] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [dateError, setDateError] = useState<string>('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    // Initialize timezone on component mount
    useEffect(() => {
        const storedTimezone = localStorage.getItem('timezone');
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const defaultTimezone = storedTimezone || browserTimezone;
        
        // Check if the timezone is in our options list
        const isValidTimezone = timezoneOptions.some(option => option.value === defaultTimezone);
        setSelectedTimezone(isValidTimezone ? defaultTimezone : 'UTC');
    }, []);

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = event.target.value;
        
        // Clear error if the selected date is after or equal to Feb 2, 2025
        const selectedDateTime = new Date(newDate);
        const cutoffDate = new Date('2025-02-02');
        if (selectedDateTime >= cutoffDate) {
            setError(null);
        }
        
        setSelectedDate(newDate);
        setTimeRange('specific_date');
        handleClose();
    };

    const fetchEvents = async () => {
        try {
            setIsUpdating(true);
            setError(null);
            
            // Check date validity before making the request
            if (timeRange === 'specific_date' && selectedDate) {
                const selectedDateTime = new Date(selectedDate);
                const cutoffDate = new Date('2025-02-02');
                if (selectedDateTime < cutoffDate) {
                    setError('Sorry, we do not have data from before February 2, 2025');
                    setEvents([]);
                    setIsUpdating(false);
                    return;
                }
            }

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

            // Add selected date to query parameters if applicable
            const dateParam = timeRange === 'specific_date' ? `&date=${selectedDate}` : '';
            const currencyParam = selectedCurrencies.length > 0 ? `&currencies=${selectedCurrencies.join(',')}` : '';
            const impactParam = selectedImpacts.length > 0 ? `&impacts=${selectedImpacts.join(',')}` : '';
            
            const response = await fetch(`${baseUrl}/events?userId=${userId}&range=${timeRange}${dateParam}${currencyParam}${impactParam}`, {
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
            setEvents(prev => {
                // Fade out old events that are not in the new data
                const oldEventIds = new Set(prev.map((e: ForexEvent) => `${e.time}-${e.event_title}`));
                const newEventIds = new Set(data.map((e: ForexEvent) => `${e.time}-${e.event_title}`));
                
                return data.map((event: ForexEvent) => ({
                    ...event,
                    isNew: !oldEventIds.has(`${event.time}-${event.event_title}`),
                }));
            });
        } catch (error) {
            console.error('Error fetching events:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events';
            setError(errorMessage);
            if (!errorMessage.includes('before February 2, 2025')) {
                setEvents([]);
            }
        } finally {
            setLoading(false);
            setInitialLoad(false);
            // Add a small delay before removing the updating state for smooth transition
            setTimeout(() => {
                setIsUpdating(false);
            }, 300);
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
                const timezone = selectedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
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
                    if (!selectedTimezone) {
                        setSelectedTimezone(timezone);
                    }
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
    }, [timeRange, selectedCurrencies, selectedImpacts, selectedTimezone, selectedDate]);

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

    const handleCurrencyChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        setSelectedCurrencies(typeof value === 'string' ? value.split(',') : value);
        // Don't close the dropdown
        event.stopPropagation();
    };

    const handleRemoveCurrency = (currencyToRemove: string) => {
        setSelectedCurrencies(prev => prev.filter(currency => currency !== currencyToRemove));
    };

    const handleImpactChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        setSelectedImpacts(typeof value === 'string' ? value.split(',') : value);
        // Don't close the dropdown
        event.stopPropagation();
    };

    const handleRemoveImpact = (impactToRemove: string) => {
        setSelectedImpacts(prev => prev.filter(impact => impact !== impactToRemove));
    };

    // Add handler for opening/closing the menu
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    // Function to get display text for current time range
    const getTimeRangeDisplayText = () => {
        if (timeRange === 'specific_date' && selectedDate) {
            return `Date: ${selectedDate}`;
        }
        const option = timeRangeOptions.find(opt => opt.value === timeRange);
        return option ? option.label : 'Select Time Range';
    };

    const TableView = () => (
        <TableContainer 
            component={Paper} 
            sx={{ 
                maxWidth: '1600px', 
                margin: '0 auto', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                opacity: isUpdating ? 0.7 : 1,
                transition: 'opacity 0.3s ease-in-out',
                minHeight: '200px'
            }}
        >
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
                    {events.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} sx={{ border: 'none' }}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    minHeight: '200px',
                                    color: 'rgba(0, 0, 0, 0.6)',
                                    fontSize: '1.1rem',
                                    fontWeight: 500
                                }}>
                                    No news available to display
                                </Box>
                            </TableCell>
                        </TableRow>
                    ) : (
                        events.map((event, index) => (
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
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const GridView = () => (
        <Box 
            sx={{ 
                display: 'grid',
                opacity: isUpdating ? 0.7 : 1,
                transition: 'opacity 0.3s ease-in-out',
                gridTemplateColumns: events.length === 0 ? '1fr' : events.length === 1 
                    ? 'minmax(450px, 1fr)'
                    : events.length === 2 
                        ? 'repeat(2, minmax(450px, 1fr))'
                        : 'repeat(3, minmax(450px, 1fr))',
                gap: 3,
                maxWidth: events.length <= 1 
                    ? '600px' 
                    : events.length === 2 
                        ? '1200px' 
                        : '1600px',
                margin: '0 auto',
                padding: '0 16px',
                justifyContent: 'center',
                '@media (max-width: 1500px)': {
                    gridTemplateColumns: events.length > 1 ? 'repeat(2, minmax(450px, 1fr))' : '1fr',
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
                },
                minHeight: '200px'
            }}
        >
            {events.length === 0 ? (
                <Card sx={{ 
                    minHeight: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                }}>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            color: 'rgba(0, 0, 0, 0.6)',
                            fontWeight: 500
                        }}
                    >
                        No news available to display
                    </Typography>
                </Card>
            ) : (
                events.map((event, index) => (
                    <Card 
                        key={`${event.time}-${event.event_title}-${index}`}
                        sx={{ 
                            height: '100%',
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.3s ease-in-out',
                            transform: event.isNew ? 'scale(0.98)' : 'scale(1)',
                            opacity: event.isNew ? 0.7 : 1,
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
                ))
            )}
        </Box>
    );

    if (loading && initialLoad) {
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
                    gap={2} 
                    mb={6}
                    sx={{
                        flexWrap: 'wrap',
                        maxWidth: '900px',
                        margin: '0 auto',
                        position: 'relative'
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

                    {/* Timezone Selector */}
                    <Box sx={{ minWidth: '200px', pb: 3 }}>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                mb: 1,
                                fontWeight: 600,
                                color: '#fff',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontSize: '0.9rem'
                            }}
                        >
                            Timezone
                        </Typography>
                        <FormControl fullWidth>
                            <Select
                                value={selectedTimezone}
                                onChange={(e) => setSelectedTimezone(e.target.value)}
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
                                renderValue={(value) => {
                                    const option = timezoneOptions.find(opt => opt.value === value);
                                    return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {option?.FlagComponent && (
                                                <Box sx={{ width: 24, height: 16 }}>
                                                    <option.FlagComponent title={option.label} />
                                                </Box>
                                            )}
                                            {!option?.FlagComponent && (
                                                <Box 
                                                    sx={{ 
                                                        width: 24, 
                                                        height: 16, 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center' 
                                                    }}
                                                >
                                                    🌐
                                                </Box>
                                            )}
                                            <span>{option?.label}</span>
                                        </Box>
                                    );
                                }}
                            >
                                {timezoneOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {option.FlagComponent && (
                                                <Box sx={{ width: 24, height: 16 }}>
                                                    <option.FlagComponent title={option.label} />
                                                </Box>
                                            )}
                                            {!option.FlagComponent && (
                                                <Box 
                                                    sx={{ 
                                                        width: 24, 
                                                        height: 16, 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center' 
                                                    }}
                                                >
                                                    🌐
                                                </Box>
                                            )}
                                            <span>{option.label}</span>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Time Range Button and Menu */}
                    <Box sx={{ minWidth: '200px', pb: 3 }}>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                mb: 1,
                                fontWeight: 600,
                                color: '#fff',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontSize: '0.9rem'
                            }}
                        >
                            Time Range
                        </Typography>
                        <Button
                            id="time-range-button"
                            aria-controls={open ? 'time-range-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? 'true' : undefined}
                            onClick={handleClick}
                            startIcon={<CalendarTodayIcon />}
                            sx={{
                                width: '100%',
                                backgroundColor: '#fff',
                                color: '#000',
                                textTransform: 'none',
                                justifyContent: 'flex-start',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                },
                                padding: '8px 14px',
                                height: '56px', // Match height with other inputs
                            }}
                        >
                            {getTimeRangeDisplayText()}
                        </Button>
                        <Popover
                            id="time-range-menu"
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            PaperProps={{
                                sx: {
                                    mt: 1,
                                    width: '300px',
                                    p: 2,
                                }
                            }}
                        >
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Select Date
                                </Typography>
                                <TextField
                                    type="date"
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    fullWidth
                                    size="small"
                                    inputProps={{
                                        min: '2025-02-02'
                                    }}
                                    sx={{ 
                                        mb: 2,
                                        '& input::-webkit-calendar-picker-indicator': {
                                            opacity: 1
                                        },
                                        '& input[type="date"]::-webkit-datetime-edit-day-field:disabled, & input[type="date"]::-webkit-datetime-edit-month-field:disabled, & input[type="date"]::-webkit-datetime-edit-year-field:disabled': {
                                            color: 'rgba(0, 0, 0, 0.38)'
                                        }
                                    }}
                                />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Quick Ranges
                                </Typography>
                                {timeRangeOptions.map((option) => (
                                    <MenuItem 
                                        key={option.value} 
                                        value={option.value}
                                        onClick={() => {
                                            setTimeRange(option.value);
                                            if (option.value !== 'specific_date') {
                                                setSelectedDate('');
                                            }
                                            handleClose();
                                        }}
                                        selected={timeRange === option.value}
                                        sx={{
                                            borderRadius: '4px',
                                            mb: 0.5,
                                            '&.Mui-selected': {
                                                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                            },
                                            '&.Mui-selected:hover': {
                                                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                            },
                                        }}
                                    >
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Box>
                        </Popover>
                    </Box>

                    {/* Currency Filter */}
                    <Box sx={{ minWidth: '200px', pb: 3 }}>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                mb: 1,
                                fontWeight: 600,
                                color: '#fff',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontSize: '0.9rem'
                            }}
                        >
                            Currencies
                        </Typography>
                        <FormControl fullWidth>
                            <Select
                                multiple
                                value={selectedCurrencies}
                                onChange={handleCurrencyChange}
                                displayEmpty
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            '& .Mui-selected': {
                                                backgroundColor: 'rgba(25, 118, 210, 0.08) !important'
                                            }
                                        }
                                    }
                                }}
                                renderValue={(selected) => {
                                    if (selected.length === 0) {
                                        return <span style={{ color: 'rgba(0, 0, 0, 0.6)' }}>Select currencies...</span>;
                                    }
                                    if (selected.length === 1) {
                                        return (
                                            <Chip 
                                                label={selected[0]}
                                                sx={{
                                                    backgroundColor: '#1976d2',
                                                    color: '#fff',
                                                    height: '24px'
                                                }}
                                            />
                                        );
                                    }
                                    return (
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Chip 
                                                label={`${selected.length} currencies selected`}
                                                sx={{
                                                    backgroundColor: '#1976d2',
                                                    color: '#fff',
                                                    height: '24px'
                                                }}
                                            />
                                        </Box>
                                    );
                                }}
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
                                    <MenuItem 
                                        key={option.value} 
                                        value={option.value}
                                        sx={{
                                            position: 'relative',
                                            border: selectedCurrencies.includes(option.value) ? '1px solid #1976d2' : 'none',
                                            backgroundColor: selectedCurrencies.includes(option.value) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                                            borderRadius: '4px',
                                            my: 0.5,
                                            '&:hover': {
                                                backgroundColor: selectedCurrencies.includes(option.value) ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                            <span>{option.label}</span>
                                            {selectedCurrencies.includes(option.value) && (
                                                <Chip 
                                                    size="small"
                                                    label="×"
                                                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleRemoveCurrency(option.value);
                                                    }}
                                                    onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                    sx={{ 
                                                        ml: 1,
                                                        minWidth: '24px',
                                                        height: '24px',
                                                        backgroundColor: '#1976d2',
                                                        color: '#fff',
                                                        '&:hover': {
                                                            backgroundColor: '#d32f2f'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Impact Filter */}
                    <Box sx={{ minWidth: '200px', pb: 3 }}>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                mb: 1,
                                fontWeight: 600,
                                color: '#fff',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontSize: '0.9rem'
                            }}
                        >
                            Impact Levels
                        </Typography>
                        <FormControl fullWidth>
                            <Select
                                multiple
                                value={selectedImpacts}
                                onChange={handleImpactChange}
                                displayEmpty
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            '& .Mui-selected': {
                                                backgroundColor: 'rgba(0, 0, 0, 0.08) !important'
                                            }
                                        }
                                    }
                                }}
                                renderValue={(selected) => {
                                    if (selected.length === 0) {
                                        return <span style={{ color: 'rgba(0, 0, 0, 0.6)' }}>Select impact levels...</span>;
                                    }
                                    if (selected.length === 1) {
                                        const impact = selected[0] as string;
                                        return (
                                            <Chip 
                                                label={impact}
                                                sx={{
                                                    backgroundColor: getImpactColor(impact),
                                                    color: '#fff',
                                                    height: '24px'
                                                }}
                                            />
                                        );
                                    }
                                    return (
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Chip 
                                                label={`${selected.length} impacts selected`}
                                                sx={{
                                                    backgroundColor: '#424242',
                                                    color: '#fff',
                                                    height: '24px'
                                                }}
                                            />
                                        </Box>
                                    );
                                }}
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
                                    <MenuItem 
                                        key={option.value} 
                                        value={option.value}
                                        sx={{
                                            position: 'relative',
                                            border: selectedImpacts.includes(option.value) ? `1px solid ${option.color}` : 'none',
                                            backgroundColor: selectedImpacts.includes(option.value) ? `${option.color}15` : 'transparent',
                                            borderRadius: '4px',
                                            my: 0.5,
                                            '&:hover': {
                                                backgroundColor: selectedImpacts.includes(option.value) ? `${option.color}20` : 'rgba(0, 0, 0, 0.04)'
                                            }
                                        }}
                                    >
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
                                                    label="×"
                                                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleRemoveImpact(option.value);
                                                    }}
                                                    onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                    sx={{ 
                                                        ml: 1,
                                                        minWidth: '24px',
                                                        height: '24px',
                                                        backgroundColor: option.color,
                                                        color: '#fff',
                                                        '&:hover': {
                                                            backgroundColor: '#d32f2f'
                                                        }
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

            {viewMode === 'grid' ? <GridView /> : <TableView />}
        </Container>
    );
}

export default dynamic(() => Promise.resolve(EventsPage), {
    ssr: false
});
