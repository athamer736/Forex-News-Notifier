'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Typography, Box, Container, CircularProgress, Chip, Alert, Select, MenuItem, FormControl, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, SelectChangeEvent, TextField, Button, Menu, Popover } from '@mui/material';
import TableViewIcon from '@mui/icons-material/TableView';
import GridViewIcon from '@mui/icons-material/GridView';
import Image from 'next/image';
import { GB, US, FR, DE, JP, CN, SG, AU, BR, AE, NZ } from 'country-flag-icons/react/3x2';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InfoIcon from '@mui/icons-material/Info';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Grid } from '@mui/material';
import { Collapse } from '@mui/material';
import { CardActions } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

interface ForexEvent {
    time: string;
    currency: string;
    impact: string;
    event_title: string;
    forecast: string;
    previous: string;
    actual: string;
    ai_summary?: string;
    isNew: boolean;
}

interface GroupedEvents {
    displayDate: string;
    events: ForexEvent[];
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

interface DateError {
    message: string;
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
    { value: 'auto', label: 'Local Time (System Timezone)' },
    { value: 'UTC', label: 'UTC - Coordinated Universal Time' },
    { value: 'Europe/London', label: 'London/Dublin/Edinburgh (GMT/BST)', FlagComponent: GB },
    { value: 'Europe/Paris', label: 'Paris/Berlin/Rome/Madrid (CET)', FlagComponent: FR },
    { value: 'Europe/Moscow', label: 'Moscow/Kiev/Bucharest (EET)', FlagComponent: GB },
    { value: 'America/New_York', label: 'New York/Toronto/Miami (EST)', FlagComponent: US },
    { value: 'America/Chicago', label: 'Chicago/Dallas/Mexico City (CST)', FlagComponent: US },
    { value: 'America/Denver', label: 'Denver/Phoenix/Salt Lake City (MST)', FlagComponent: US },
    { value: 'America/Los_Angeles', label: 'Los Angeles/Seattle/Vancouver (PST)', FlagComponent: US },
    { value: 'America/Sao_Paulo', label: 'São Paulo/Buenos Aires/Santiago (BRT)', FlagComponent: BR },
    { value: 'Asia/Dubai', label: 'Dubai/Abu Dhabi/Muscat (GST)', FlagComponent: AE },
    { value: 'Asia/Singapore', label: 'Singapore/Kuala Lumpur/Manila (SGT)', FlagComponent: SG },
    { value: 'Asia/Shanghai', label: 'Shanghai/Beijing/Hong Kong (CST)', FlagComponent: CN },
    { value: 'Asia/Tokyo', label: 'Tokyo/Seoul/Osaka (JST)', FlagComponent: JP },
    { value: 'Australia/Sydney', label: 'Sydney/Melbourne/Brisbane (AEST)', FlagComponent: AU },
    { value: 'Pacific/Auckland', label: 'Auckland/Wellington (NZST)', FlagComponent: NZ }
];

const impactOptions = [
    { value: 'High', label: 'High Impact', color: '#d32f2f' },
    { value: 'Medium', label: 'Medium Impact', color: '#ed6c02' },
    { value: 'Low', label: 'Low Impact', color: '#2e7d32' },
    { value: 'Non-Economic', label: 'Non-Economic', color: '#424242' }
];

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
    hidden: { y: -20, opacity: 0 },
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

const infoVariants = {
    hidden: { 
        height: 0,
        opacity: 0,
        scale: 0.95,
        transition: {
            height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 }
        }
    },
    visible: {
        height: 'auto',
        opacity: 1,
        scale: 1,
        transition: {
            height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.3, delay: 0.1 },
            scale: { duration: 0.3, delay: 0.1 }
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

function EventsPage() {
    const [events, setEvents] = useState<ForexEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<string>('24h');
    const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('selectedCurrencies');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading saved currencies:', error);
            return [];
        }
    });
    const [selectedImpacts, setSelectedImpacts] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('selectedImpacts');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading saved impacts:', error);
            return [];
        }
    });
    const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
        try {
            return (localStorage.getItem('viewMode') as 'grid' | 'table') || 'table';
        } catch (error) {
            console.error('Error loading saved view mode:', error);
            return 'table';
        }
    });
    const [retryTimer, setRetryTimer] = useState<number | null>(null);
    const [selectedTimezone, setSelectedTimezone] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [dateError, setDateError] = useState<string>('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const router = useRouter();

    const handleExpandClick = (eventId: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setExpanded(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    const handleInfoButtonClick = (e: React.MouseEvent<HTMLButtonElement>, eventId: string) => {
        handleExpandClick(eventId, e);
    };

    // Remove the loading of saved filters from this useEffect since we're now doing it in the initial state
    useEffect(() => {
        try {
            // Load saved view mode if not already set
            if (!viewMode) {
                const savedViewMode = localStorage.getItem('viewMode') as 'grid' | 'table';
                if (savedViewMode) {
                    setViewMode(savedViewMode);
                    console.log('Loaded saved view mode:', savedViewMode);
                }
            }
        } catch (error) {
            console.error('Error loading saved filters:', error);
        }
    }, []); // Empty dependency array to run only once on mount

    // Initialize timezone on component mount
    useEffect(() => {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('Browser timezone:', browserTimezone);
        
        // Get the current stored timezone for reference
        const storedTimezone = localStorage.getItem('timezone');
        console.log('Current stored timezone:', storedTimezone);

        // First try exact match
        const exactMatch = timezoneOptions.find(opt => opt.value === browserTimezone);
        if (exactMatch) {
            console.log('Found exact timezone match:', exactMatch.value);
            // Update stored timezone and selected timezone with exact match
            localStorage.setItem('timezone', exactMatch.value);
            setSelectedTimezone(exactMatch.value);
            console.log('Updated stored timezone to:', exactMatch.value);
            console.log('Updated selected timezone to:', exactMatch.value);
            return;
        }
        
        // If no exact match, try to match by region
        const browserRegion = browserTimezone.split('/')[0];
        const regionMatch = timezoneOptions.find(opt => 
            opt.value !== 'auto' && 
            opt.value !== 'UTC' && 
            opt.value.startsWith(browserRegion + '/')
        );
        
        if (regionMatch) {
            console.log('Found region timezone match:', regionMatch.value);
            // Update stored timezone and selected timezone with region match
            localStorage.setItem('timezone', regionMatch.value);
            setSelectedTimezone(regionMatch.value);
            console.log('Updated stored timezone to:', regionMatch.value);
            console.log('Updated selected timezone to:', regionMatch.value);
            return;
        }
        
        // If no match found at all, default to auto
        console.log('No timezone match found, defaulting to auto');
        localStorage.setItem('timezone', 'auto');
        setSelectedTimezone('auto');
        console.log('Updated stored timezone to: auto');
        console.log('Updated selected timezone to: auto');
    }, []); // Empty dependency array to run only once on mount

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
            
            // Use the domain name directly when in production
            let baseUrl;
            if (typeof window !== 'undefined') {
                if (window.location.hostname === 'localhost') {
                    baseUrl = 'http://localhost:5000';
                } else if (window.location.hostname === '192.168.0.144') {
                    baseUrl = 'http://192.168.0.144:5000';
                } else {
                    baseUrl = 'https://fxalert.co.uk';  // Use the domain directly
                }
            } else {
                baseUrl = 'https://fxalert.co.uk';  // Default to domain in SSR
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
                
                // Handle specific error cases
                if (errorMessage.includes('database')) {
                    throw new Error('Database connection error. Please try again later.');
                } else if (errorMessage.includes('Rate limit exceeded')) {
                    const seconds = parseInt(errorMessage.match(/\d+/)[0]);
                    setRetryTimer(seconds);
                    throw new Error(`Rate limit exceeded. Retrying in ${seconds} seconds...`);
                } else if (errorMessage.includes('before February 2, 2025')) {
                    throw new Error('Sorry, we do not have data from before February 2, 2025');
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
                const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                let timezone;
                let displayTimezone;
                
                // Get the actual timezone to use
                if (!selectedTimezone || selectedTimezone === 'auto') {
                    // If auto is selected, use browser timezone directly
                    timezone = browserTimezone;
                    displayTimezone = selectedTimezone || 'auto';
                } else {
                    // Use the selected timezone
                    timezone = selectedTimezone;
                    displayTimezone = selectedTimezone;
                }
                
                console.log('Selected timezone:', selectedTimezone);
                console.log('Display timezone:', displayTimezone);
                console.log('Actual timezone to use:', timezone);
                
                const offset = new Date().getTimezoneOffset();
                console.log('Current offset:', offset);
                
                // Determine the base URL based on hostname
                let baseUrl;
                if (typeof window !== 'undefined') {
                    if (window.location.hostname === 'localhost') {
                        baseUrl = 'http://localhost:5000';
                    } else if (window.location.hostname === '192.168.0.144') {
                        baseUrl = 'http://192.168.0.144:5000';
                    } else {
                        baseUrl = 'https://fxalert.co.uk';
                    }
                } else {
                    baseUrl = 'https://fxalert.co.uk';
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

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to set timezone: ${errorText}`);
                }

                const data = await response.json();
                console.log('Timezone set response:', data);
                
                try {
                    localStorage.setItem('timezone', displayTimezone);
                    localStorage.setItem('userId', userId);
                } catch (storageError) {
                    console.error('Error storing in localStorage:', storageError);
                }
            } catch (error) {
                console.error('Error in setUserTimezone:', error);
                const defaultTimezone = 'Europe/London';
                setSelectedTimezone(defaultTimezone);
            }
        };

        // Set timezone and fetch events
        setUserTimezone().then(() => {
            try {
                fetchEvents();
            } catch (error) {
                console.error('Error fetching events:', error);
            }
        });

        // Set up interval for fetching events
        const interval = setInterval(() => {
            setUserTimezone().then(() => {
                try {
                    fetchEvents();
                } catch (error) {
                    console.error('Error in interval fetch:', error);
                }
            });
        }, 5 * 60 * 1000);  // Refresh every 5 minutes
        
        return () => clearInterval(interval);
    }, [timeRange, selectedCurrencies, selectedImpacts, selectedTimezone, selectedDate]);

    const getImpactColor = (impact: string): string => {
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
        const newCurrencies = typeof value === 'string' ? value.split(',') : value;
        setSelectedCurrencies(newCurrencies);
        try {
            localStorage.setItem('selectedCurrencies', JSON.stringify(newCurrencies));
            console.log('Saved currencies:', newCurrencies);
        } catch (error) {
            console.error('Error saving currencies:', error);
        }
        event.stopPropagation();
    };

    const handleRemoveCurrency = (currencyToRemove: string) => {
        const newCurrencies = selectedCurrencies.filter(currency => currency !== currencyToRemove);
        setSelectedCurrencies(newCurrencies);
        try {
            localStorage.setItem('selectedCurrencies', JSON.stringify(newCurrencies));
            console.log('Saved currencies after removal:', newCurrencies);
        } catch (error) {
            console.error('Error saving currencies:', error);
        }
    };

    const handleImpactChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        const newImpacts = typeof value === 'string' ? value.split(',') : value;
        setSelectedImpacts(newImpacts);
        try {
            localStorage.setItem('selectedImpacts', JSON.stringify(newImpacts));
            console.log('Saved impact levels:', newImpacts);
        } catch (error) {
            console.error('Error saving impact levels:', error);
        }
        event.stopPropagation();
    };

    const handleRemoveImpact = (impactToRemove: string) => {
        const newImpacts = selectedImpacts.filter(impact => impact !== impactToRemove);
        setSelectedImpacts(newImpacts);
        try {
            localStorage.setItem('selectedImpacts', JSON.stringify(newImpacts));
            console.log('Saved impact levels after removal:', newImpacts);
        } catch (error) {
            console.error('Error saving impact levels:', error);
        }
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

    // Add this utility function to group events by date
    const groupEventsByDate = (events: ForexEvent[]): Record<string, GroupedEvents> => {
        return events.reduce((acc: Record<string, GroupedEvents>, event) => {
            const date = new Date(event.time);
            const displayDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (!acc[displayDate]) {
                acc[displayDate] = {
                    displayDate,
                    events: []
                };
            }
            acc[displayDate].events.push(event);
            return acc;
        }, {});
    };

    const TableView = () => {
        const groupedEvents = groupEventsByDate(events);
        
        return (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Time</TableCell>
                            <TableCell>Currency</TableCell>
                            <TableCell>Impact</TableCell>
                            <TableCell>Event</TableCell>
                            <TableCell>Forecast</TableCell>
                            <TableCell>Previous</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.values(groupedEvents).map((group) => (
                            <React.Fragment key={group.displayDate}>
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        sx={{
                                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {group.displayDate}
                                    </TableCell>
                                </TableRow>
                                {group.events.map((event, eventIndex) => {
                                    const eventId = `${group.displayDate}-${event.time}-${eventIndex}`;
                                    return (
                                        <React.Fragment key={eventId}>
                                            <TableRow
                                                sx={{
                                                    backgroundColor: event.isNew ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                    }
                                                }}
                                            >
                                                <TableCell>
                                                    {new Date(event.time).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={event.currency}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: '#1976d2',
                                                            color: '#fff'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={event.impact}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: getImpactColor(event.impact),
                                                            color: '#fff'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>{event.event_title}</TableCell>
                                                <TableCell>{event.forecast || 'N/A'}</TableCell>
                                                <TableCell>{event.previous || 'N/A'}</TableCell>
                                                <TableCell>
                                                    {event.ai_summary && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => handleInfoButtonClick(e, eventId)}
                                                            aria-expanded={expanded.has(eventId)}
                                                            aria-label="show more"
                                                        >
                                                            {expanded.has(eventId) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ padding: 0, border: 0 }}>
                                                    <AnimatePresence mode="sync" initial={false}>
                                                        {expanded.has(eventId) && (
                                                            <motion.div
                                                                key={`info-${eventId}`}
                                                                initial="hidden"
                                                                animate="visible"
                                                                exit="hidden"
                                                                variants={infoVariants}
                                                                style={{ 
                                                                    overflow: 'hidden',
                                                                    transformOrigin: 'top',
                                                                    position: 'relative',
                                                                    width: '100%'
                                                                }}
                                                            >
                                                                <Box sx={{ 
                                                                    p: 3, 
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                                                                }}>
                                                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
                                                                        AI Analysis
                                                                    </Typography>
                                                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                                                        {event.ai_summary}
                                                                    </Typography>
                                                                </Box>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const GridView = () => {
        const groupedEvents = groupEventsByDate(events);

        if (events.length === 0) {
            return (
                <Card sx={{ 
                    minHeight: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    maxWidth: '600px',
                    margin: '0 auto'
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
            );
        }

        return (
            <Grid container spacing={3}>
                {Object.entries(groupedEvents).map(([date, group]) => (
                    <React.Fragment key={date}>
                        <Grid item xs={12}>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: '#fff',
                                    py: 1,
                                    px: 2,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: 1
                                }}
                            >
                                {group.displayDate}
                            </Typography>
                        </Grid>
                        {group.events.map((event, eventIndex) => {
                            const eventId = `${group.displayDate}-${event.time}-${eventIndex}`;
                            return (
                                <Grid item xs={12} sm={6} md={4} key={eventId}>
                                    <motion.div
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="visible"
                                        transition={{ delay: eventIndex * 0.1 }}
                                    >
                                        <Card
                                            sx={{
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                background: '#fff',
                                                position: 'relative',
                                                overflow: 'visible'
                                            }}
                                        >
                                            <CardContent>
                                                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <Typography variant="h6" component="div">
                                                        {new Date(event.time).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                        <Chip
                                                            label={event.currency}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                                                color: '#1976d2',
                                                                fontWeight: 'medium'
                                                            }}
                                                        />
                                                        <Chip
                                                            label={event.impact}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: getImpactColor(event.impact),
                                                                color: '#fff',
                                                                fontWeight: 'medium'
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                                <Typography variant="body1" sx={{ mb: 2 }}>
                                                    {event.event_title}
                                                </Typography>
                                                <Grid container spacing={1}>
                                                    <Grid item xs={4}>
                                                        <Typography variant="caption" color="textSecondary">
                                                            Forecast
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {event.forecast || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={4}>
                                                        <Typography variant="caption" color="textSecondary">
                                                            Previous
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {event.previous || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={4}>
                                                        <Typography variant="caption" color="textSecondary">
                                                            Actual
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {event.actual || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                            <CardActions sx={{ mt: 'auto', justifyContent: 'flex-end' }}>
                                                <IconButton
                                                    onClick={(e) => handleInfoButtonClick(e, eventId)}
                                                    aria-expanded={expanded.has(eventId)}
                                                    aria-label="show more"
                                                    sx={{
                                                        transform: expanded.has(eventId) ? 'rotate(180deg)' : 'rotate(0)',
                                                        transition: 'transform 0.3s'
                                                    }}
                                                >
                                                    <InfoIcon />
                                                </IconButton>
                                            </CardActions>
                                            <Box sx={{ position: 'relative', width: '100%' }}>
                                                <AnimatePresence mode="sync" initial={false}>
                                                    {expanded.has(eventId) && (
                                                        <motion.div
                                                            key={`info-${eventId}`}
                                                            initial="hidden"
                                                            animate="visible"
                                                            exit="hidden"
                                                            variants={infoVariants}
                                                            style={{ 
                                                                overflow: 'hidden',
                                                                transformOrigin: 'top',
                                                                position: 'relative',
                                                                width: '100%'
                                                            }}
                                                        >
                                                            <CardContent>
                                                                <Typography paragraph>
                                                                    {event.ai_summary || 'No additional information available.'}
                                                                </Typography>
                                                            </CardContent>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </Box>
                                        </Card>
                                    </motion.div>
                                </Grid>
                            );
                        })}
                    </React.Fragment>
                ))}
            </Grid>
        );
    };

    if (loading && initialLoad) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

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
            <Container maxWidth="lg">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                            <Button
                                onClick={() => router.push('/')}
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
                            Forex Events Calendar
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
                            Track real-time forex events and market updates
                        </Typography>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Box
                            sx={{
                                background: '#fff',
                                borderRadius: 2,
                                p: 4,
                                mb: 4,
                                color: '#000'
                            }}
                        >
                            {/* Filters Section */}
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth sx={{ minWidth: '100%' }}>
                                        <Select
                                            value={timeRange}
                                            onChange={(e) => setTimeRange(e.target.value)}
                                            sx={{
                                                backgroundColor: '#fff',
                                                height: '56px',
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(0, 0, 0, 0.23)'
                                                },
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(0, 0, 0, 0.87)'
                                                },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#2196F3'
                                                }
                                            }}
                                        >
                                            {timeRangeOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <Select
                                            multiple
                                            value={selectedCurrencies}
                                            onChange={handleCurrencyChange}
                                            renderValue={(selected) => (
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    flexWrap: 'wrap', 
                                                    gap: 0.5,
                                                    maxWidth: '100%',
                                                    overflow: 'hidden'
                                                }}>
                                                    {selected.map((value) => (
                                                        <Chip 
                                                            key={value} 
                                                            label={value}
                                                            size="small"
                                                            sx={{
                                                                maxWidth: '90px',
                                                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                                                color: '#2196F3',
                                                                '& .MuiChip-label': {
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    fontSize: '0.8125rem',
                                                                    padding: '0 6px'
                                                                }
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                            sx={{
                                                backgroundColor: '#fff',
                                                height: '56px',
                                                '& .MuiSelect-select': {
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '4px',
                                                    alignItems: 'center',
                                                    padding: '8px 14px',
                                                    minHeight: '56px !important',
                                                    maxHeight: '56px !important',
                                                    overflow: 'hidden !important'
                                                },
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(0, 0, 0, 0.23)'
                                                },
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(0, 0, 0, 0.87)'
                                                },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#2196F3'
                                                }
                                            }}
                                            MenuProps={{
                                                PaperProps: {
                                                    style: {
                                                        maxHeight: '300px'
                                                    }
                                                }
                                            }}
                                        >
                                            {currencyOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <Select
                                            multiple
                                            value={selectedImpacts}
                                            onChange={handleImpactChange}
                                            renderValue={(selected) => (
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    flexWrap: 'wrap', 
                                                    gap: 0.5,
                                                    maxWidth: '100%',
                                                    overflow: 'hidden'
                                                }}>
                                                    {selected.map((value) => (
                                                        <Chip 
                                                            key={value} 
                                                            label={value}
                                                            size="small"
                                                            sx={{
                                                                maxWidth: '90px',
                                                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                                                color: '#2196F3',
                                                                '& .MuiChip-label': {
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    fontSize: '0.8125rem',
                                                                    padding: '0 6px'
                                                                }
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                            sx={{
                                                backgroundColor: '#fff',
                                                height: '56px',
                                                '& .MuiSelect-select': {
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '4px',
                                                    alignItems: 'center',
                                                    padding: '8px 14px',
                                                    minHeight: '56px !important',
                                                    maxHeight: '56px !important',
                                                    overflow: 'hidden !important'
                                                },
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(0, 0, 0, 0.23)'
                                                },
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(0, 0, 0, 0.87)'
                                                },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#2196F3'
                                                }
                                            }}
                                            MenuProps={{
                                                PaperProps: {
                                                    style: {
                                                        maxHeight: '300px'
                                                    }
                                                }
                                            }}
                                        >
                                            {impactOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            {/* View Toggle */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                <IconButton
                                    onClick={() => setViewMode('table')}
                                    sx={{
                                        color: viewMode === 'table' ? '#2196F3' : 'rgba(0, 0, 0, 0.54)',
                                        mr: 1
                                    }}
                                >
                                    <TableViewIcon />
                                </IconButton>
                                <IconButton
                                    onClick={() => setViewMode('grid')}
                                    sx={{
                                        color: viewMode === 'grid' ? '#2196F3' : 'rgba(0, 0, 0, 0.54)'
                                    }}
                                >
                                    <GridViewIcon />
                                </IconButton>
                            </Box>

                            {/* Events Display */}
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <CircularProgress sx={{ color: '#2196F3' }} />
                                </Box>
                            ) : error ? (
                                <Alert severity="error" sx={{ mb: 3 }}>
                                    {error}
                                </Alert>
                            ) : (
                                viewMode === 'table' ? (
                                    <motion.div variants={itemVariants}>
                                        <TableView />
                                    </motion.div>
                                ) : (
                                    <motion.div variants={itemVariants}>
                                        <GridView />
                                    </motion.div>
                                )
                            )}
                        </Box>
                    </motion.div>
                </motion.div>
            </Container>
        </Box>
    );
}

export default dynamic(() => Promise.resolve(EventsPage), {
    ssr: false
});
