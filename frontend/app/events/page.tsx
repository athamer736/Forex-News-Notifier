'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
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
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const handleExpandClick = (index: number) => {
        setExpanded(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleInfoButtonClick = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        handleExpandClick(index);
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
                        baseUrl = 'http://141.95.123.145:5000';
                    }
                } else {
                    baseUrl = 'http://141.95.123.145:5000';
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
        const grouped = events.reduce((acc: Record<string, GroupedEvents>, event) => {
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
        return grouped;
    };

    const TableView = () => {
        const groupedEvents: Record<string, GroupedEvents> = groupEventsByDate(events);
        const sortedDates = Object.keys(groupedEvents).sort();

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
                        {Object.values(groupedEvents).map((group: GroupedEvents) => (
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
                                {group.events.map((event: ForexEvent, index: number) => (
                                    <React.Fragment key={`${group.displayDate}-${index}`}>
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
                                                        onClick={(e) => handleInfoButtonClick(e, index)}
                                                        aria-expanded={expanded.has(index)}
                                                        aria-label="show more"
                                                    >
                                                        <InfoIcon />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        {event.ai_summary && (
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ p: 0 }}>
                                                    <Collapse 
                                                        in={expanded.has(index)} 
                                                        timeout={500}
                                                        unmountOnExit
                                                        sx={{
                                                            '& .MuiCollapse-wrapper': {
                                                                willChange: 'height, transform',
                                                                transition: 'height 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                                                            },
                                                            '& .MuiCollapse-wrapperInner': {
                                                                willChange: 'transform, opacity',
                                                                transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)'
                                                            }
                                                        }}
                                                    >
                                                        <Box 
                                                            sx={{
                                                                p: 3,
                                                                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                                transform: expanded.has(index) ? 'translateY(0)' : 'translateY(-20px)',
                                                                opacity: expanded.has(index) ? 1 : 0,
                                                                transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                                                                borderRadius: 1,
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                                margin: 1,
                                                                willChange: 'transform, opacity'
                                                            }}
                                                        >
                                                            <Typography 
                                                                variant="subtitle1" 
                                                                gutterBottom
                                                                sx={{ 
                                                                    fontWeight: 500,
                                                                    transform: expanded.has(index) ? 'translateY(0)' : 'translateY(-16px)',
                                                                    opacity: expanded.has(index) ? 1 : 0,
                                                                    transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1) 100ms, opacity 500ms cubic-bezier(0.4, 0, 0.2, 1) 100ms',
                                                                    willChange: 'transform, opacity'
                                                                }}
                                                            >
                                                                AI Analysis
                                                            </Typography>
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    whiteSpace: 'pre-line',
                                                                    transform: expanded.has(index) ? 'translateY(0)' : 'translateY(-16px)',
                                                                    opacity: expanded.has(index) ? 1 : 0,
                                                                    transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1) 150ms, opacity 500ms cubic-bezier(0.4, 0, 0.2, 1) 150ms',
                                                                    willChange: 'transform, opacity'
                                                                }}
                                                            >
                                                                {event.ai_summary}
                                                            </Typography>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const GridView = () => {
        const groupedEvents = groupEventsByDate(events);
        const sortedDates = Object.keys(groupedEvents).sort();

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
            <Grid container spacing={2} sx={{ mt: 2 }}>
                {Object.values(groupedEvents).map(group => (
                    <Grid item xs={12} key={group.displayDate}>
                        <Typography
                            variant="h6"
                            sx={{
                                mb: 2,
                                pb: 1,
                                borderBottom: '2px solid #1976d2'
                            }}
                        >
                            {group.displayDate}
                        </Typography>
                        <Grid container spacing={2}>
                            {group.events.map((event, index) => (
                                <Grid item xs={12} sm={6} md={4} key={`${group.displayDate}-${index}`}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            backgroundColor: event.isNew ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
                                        }}
                                    >
                                        <CardContent sx={{ flexGrow: 1 }}>
                                            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                                                <Chip
                                                    label={event.currency}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: '#1976d2',
                                                        color: '#fff'
                                                    }}
                                                />
                                                <Chip
                                                    label={event.impact}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: getImpactColor(event.impact),
                                                        color: '#fff'
                                                    }}
                                                />
                                            </Box>
                                            <Typography variant="subtitle1" gutterBottom>
                                                {new Date(event.time).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Typography>
                                            <Typography variant="body1" gutterBottom>
                                                {event.event_title}
                                            </Typography>
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Forecast: {event.forecast || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Previous: {event.previous || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                        {event.ai_summary && (
                                            <CardActions>
                                                <Button
                                                    size="small"
                                                    onClick={(e) => handleInfoButtonClick(e, index)}
                                                    endIcon={expanded.has(index) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                >
                                                    {expanded.has(index) ? 'Hide Analysis' : 'Show Analysis'}
                                                </Button>
                                            </CardActions>
                                        )}
                                        <Collapse 
                                            in={expanded.has(index)} 
                                            timeout={500}
                                            unmountOnExit
                                            sx={{
                                                '& .MuiCollapse-wrapper': {
                                                    willChange: 'height, transform',
                                                    transition: 'height 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                                                },
                                                '& .MuiCollapse-wrapperInner': {
                                                    willChange: 'transform, opacity',
                                                    transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)'
                                                }
                                            }}
                                        >
                                            <Box 
                                                sx={{
                                                    p: 3,
                                                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                    transform: expanded.has(index) ? 'translateY(0)' : 'translateY(-20px)',
                                                    opacity: expanded.has(index) ? 1 : 0,
                                                    transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                                                    borderRadius: 1,
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                    margin: 1,
                                                    willChange: 'transform, opacity'
                                                }}
                                            >
                                                <Typography 
                                                    variant="subtitle1" 
                                                    gutterBottom
                                                    sx={{ 
                                                        fontWeight: 500,
                                                        transform: expanded.has(index) ? 'translateY(0)' : 'translateY(-16px)',
                                                        opacity: expanded.has(index) ? 1 : 0,
                                                        transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1) 100ms, opacity 500ms cubic-bezier(0.4, 0, 0.2, 1) 100ms',
                                                        willChange: 'transform, opacity'
                                                    }}
                                                >
                                                    AI Analysis
                                                </Typography>
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        whiteSpace: 'pre-line',
                                                        transform: expanded.has(index) ? 'translateY(0)' : 'translateY(-16px)',
                                                        opacity: expanded.has(index) ? 1 : 0,
                                                        transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1) 150ms, opacity 500ms cubic-bezier(0.4, 0, 0.2, 1) 150ms',
                                                        willChange: 'transform, opacity'
                                                    }}
                                                >
                                                    {event.ai_summary}
                                                </Typography>
                                            </Box>
                                        </Collapse>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Grid>
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
                                            {option?.FlagComponent ? (
                                                <Box sx={{ width: 24, height: 16 }}>
                                                    <option.FlagComponent title={option.label} />
                                                </Box>
                                            ) : (
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
                                                    onClick={(e) => {
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
                                                    onClick={(e) => {
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
