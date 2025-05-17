'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Typography, Box, Container, CircularProgress, Chip, Alert, Select, MenuItem, FormControl, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, SelectChangeEvent, TextField, Button, Menu, Popover, InputLabel } from '@mui/material';
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
    timezone_abbr?: string;
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
    { value: 'specific_date', label: 'Specific Date' },
    { value: 'date_range', label: 'Date Range' }
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
    
    // Function to detect if the device is mobile
    const isMobileDevice = () => {
        if (typeof window !== 'undefined') {
            return window.innerWidth <= 768 || 
                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
        return false;
    };
    
    // Set the initial view mode based on device type or saved preference
    const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
        try {
            // For mobile devices, default to grid view
            if (isMobileDevice()) {
                console.log('Mobile device detected, using grid view');
                return 'grid';
            }
            
            // Otherwise, use saved preference or default to table
            const savedViewMode = localStorage.getItem('viewMode') as 'grid' | 'table';
            return savedViewMode || 'table';
        } catch (error) {
            console.error('Error setting view mode:', error);
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
    const [memoryUsage, setMemoryUsage] = useState<number | null>(null);
    const [isRangeSelectionActive, setIsRangeSelectionActive] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const handleExpandClick = useCallback((eventId: string, e?: React.MouseEvent) => {
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
    }, []);

    const handleInfoButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>, eventId: string) => {
        handleExpandClick(eventId, e);
    }, [handleExpandClick]);

    useEffect(() => {
        try {
            // Save the current view mode to localStorage
            if (viewMode) {
                localStorage.setItem('viewMode', viewMode);
                console.log('Saved view mode:', viewMode);
            }
            
            // For initial load, check if we need to override based on mobile
            if (initialLoad && isMobileDevice() && viewMode !== 'grid') {
                setViewMode('grid');
                console.log('Setting grid view for mobile device');
            }
        } catch (error) {
            console.error('Error handling view mode:', error);
        }
    }, [viewMode, initialLoad]);

    useEffect(() => {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('Browser timezone:', browserTimezone);
        
        const storedTimezone = localStorage.getItem('timezone');
        console.log('Current stored timezone:', storedTimezone);

        const exactMatch = timezoneOptions.find(opt => opt.value === browserTimezone);
        if (exactMatch) {
            console.log('Found exact timezone match:', exactMatch.value);
            localStorage.setItem('timezone', exactMatch.value);
            setSelectedTimezone(exactMatch.value);
            console.log('Updated stored timezone to:', exactMatch.value);
            console.log('Updated selected timezone to:', exactMatch.value);
            return;
        }
        
        const browserRegion = browserTimezone.split('/')[0];
        const regionMatch = timezoneOptions.find(opt => 
            opt.value !== 'auto' && 
            opt.value !== 'UTC' && 
            opt.value.startsWith(browserRegion + '/')
        );
        
        if (regionMatch) {
            console.log('Found region timezone match:', regionMatch.value);
            localStorage.setItem('timezone', regionMatch.value);
            setSelectedTimezone(regionMatch.value);
            console.log('Updated stored timezone to:', regionMatch.value);
            console.log('Updated selected timezone to:', regionMatch.value);
            return;
        }
        
        console.log('No timezone match found, defaulting to auto');
        localStorage.setItem('timezone', 'auto');
        setSelectedTimezone('auto');
        console.log('Updated stored timezone to: auto');
        console.log('Updated selected timezone to: auto');
    }, []);

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = event.target.value;
        const selectedDateTime = new Date(newDate);
        const cutoffDate = new Date('2025-02-02');
        
        if (selectedDateTime < cutoffDate) {
            setError('Sorry, we do not have data from before February 2, 2025');
            return;
        }
        
        setError(null);
        
        if (!isRangeSelectionActive) {
            setStartDate(newDate);
            setEndDate('');
            setSelectedDate(newDate);
            setIsRangeSelectionActive(true);
            setTimeRange('specific_date');
        } else {
            if (newDate === startDate) {
                setIsRangeSelectionActive(false);
                setEndDate('');
            } else {
                const start = new Date(startDate);
                const end = new Date(newDate);
                
                if (start > end) {
                    setEndDate(startDate);
                    setStartDate(newDate);
                } else {
                    setEndDate(newDate);
                }
                
                setIsRangeSelectionActive(false);
                setTimeRange('date_range');
            }
        }
        
        setTimeout(() => {
            fetchEvents();
        }, 100);
    };

    const fetchEvents = useCallback(async () => {
        try {
            setIsUpdating(true);
            setError(null);
            
            if (timeRange === 'specific_date') {
                if (!selectedDate || selectedDate.trim() === '') {
                    setError('Please select a date to view events');
                    setEvents([]);
                    setIsUpdating(false);
                    return;
                }
                // Date validation removed to allow past events
            } else if (timeRange === 'date_range') {
                if (!startDate || !endDate) {
                    setError('Please select both start and end dates');
                    setEvents([]);
                    setIsUpdating(false);
                    return;
                }
                // Date validation removed to allow past events
            }

            const userId = localStorage.getItem('userId') || 'default';
            
            let baseUrl;
            if (typeof window !== 'undefined') {
                if (window.location.hostname === 'localhost') {
                    baseUrl = 'https://localhost:5000';
                } else if (window.location.hostname === '192.168.0.144') {
                    baseUrl = 'https://192.168.0.144:5000';
                } else {
                    baseUrl = 'https://fxalert.co.uk:5000';
                }
            } else {
                baseUrl = 'https://fxalert.co.uk:5000';
            }

            console.log('Using base URL for events:', baseUrl);

            let dateParam = '';
            if (timeRange === 'specific_date') {
                dateParam = `&date=${selectedDate}`;
            } else if (timeRange === 'date_range') {
                dateParam = `&start_date=${startDate}&end_date=${endDate}`;
            }
            
            const currencyParam = selectedCurrencies.length > 0 ? `&currencies=${selectedCurrencies.join(',')}` : '';
            const impactParam = selectedImpacts.length > 0 ? `&impacts=${selectedImpacts.join(',')}` : '';
            
            const url = `${baseUrl}/events?userId=${userId}&time_range=${timeRange}${dateParam}${currencyParam}${impactParam}`;
            console.log('Fetching events from:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Origin': typeof window !== 'undefined' ? window.location.origin : '',
                }
            });
            
            if (!response.ok) {
                if (response.status === 0 || response.type === 'opaque') {
                    throw new Error('CORS error: Could not access the API. Please ensure the backend server is running and accessible.');
                }
                
                try {
                    const errorData = await response.json();
                    const errorMessage = errorData.error || 'Failed to fetch events';
                    
                    if (errorMessage.includes('database')) {
                        throw new Error('Database connection error. Please try again later.');
                    } else if (errorMessage.includes('Rate limit exceeded')) {
                        const seconds = parseInt(errorMessage.match(/\d+/)[0]);
                        setRetryTimer(seconds);
                        throw new Error(`Rate limit exceeded. Retrying in ${seconds} seconds...`);
                    }
                    
                    throw new Error(errorMessage);
                } catch (jsonError) {
                    throw new Error(`Server error (${response.status}): ${response.statusText}`);
                }
            }
            
            const data = await response.json();
            
            setEvents(prev => {
                const oldEventIds = new Set(prev.map((e: ForexEvent) => `${e.time}-${e.event_title}`));
                
                return data.map((event: ForexEvent) => ({
                    ...event,
                    isNew: !oldEventIds.has(`${event.time}-${event.event_title}`),
                }));
            });
        } catch (error) {
            console.error('Error fetching events:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events';
            setError(errorMessage);
            setEvents([]);
        } finally {
            setLoading(false);
            setInitialLoad(false);
            setTimeout(() => {
                setIsUpdating(false);
            }, 300);
        }
    }, [timeRange, selectedDate, selectedCurrencies, selectedImpacts, startDate, endDate]);

    useEffect(() => {
        let timerRef: NodeJS.Timeout | null = null;
        
        if (retryTimer !== null) {
            console.log(`Setting retry timer for ${retryTimer} seconds`);
            timerRef = setTimeout(() => {
                console.log('Retry timer completed, fetching events again');
                setRetryTimer(null);
                setError(null);
                fetchEvents();
            }, retryTimer * 1000);
        }
        
        return () => {
            if (timerRef !== null) {
                console.log('Clearing retry timer');
                clearTimeout(timerRef);
            }
        };
    }, [retryTimer, fetchEvents]);

    useEffect(() => {
        let isMounted = true;
        let fetchInterval: NodeJS.Timeout | null = null;
        
        const setUserTimezone = async () => {
            if (!isMounted) return;
            
            try {
                const userId = localStorage.getItem('userId') || 'default';
                const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                let timezone;
                let displayTimezone;
                
                if (!selectedTimezone || selectedTimezone === 'auto') {
                    timezone = browserTimezone;
                    displayTimezone = selectedTimezone || 'auto';
                } else {
                    timezone = selectedTimezone;
                    displayTimezone = selectedTimezone;
                }
                
                console.log('Selected timezone:', selectedTimezone);
                console.log('Display timezone:', displayTimezone);
                console.log('Actual timezone to use:', timezone);
                
                const offset = new Date().getTimezoneOffset();
                console.log('Current offset:', offset);
                
                let baseUrl;
                if (typeof window !== 'undefined') {
                    if (window.location.hostname === 'localhost') {
                        baseUrl = 'https://localhost:5000';
                    } else if (window.location.hostname === '192.168.0.144') {
                        baseUrl = 'https://192.168.0.144:5000';
                    } else {
                        baseUrl = 'https://fxalert.co.uk:5000';
                    }
                } else {
                    baseUrl = 'https://fxalert.co.uk:5000';
                }
                
                console.log('Using base URL:', baseUrl);

                const timezoneUrl = `${baseUrl}/api/timezone`;
                console.log('Setting timezone with URL:', timezoneUrl);

                const response = await fetch(timezoneUrl, {
                    method: 'POST',
                    mode: 'cors',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': typeof window !== 'undefined' ? window.location.origin : '',
                    },
                    body: JSON.stringify({
                        userId,
                        timezone,
                        offset,
                    }),
                });

                if (!isMounted) return;

                if (!response.ok) {
                    if (response.status === 0 || response.type === 'opaque') {
                        throw new Error('CORS error: Could not access the timezone API.');
                    }
                    
                    try {
                        const errorData = await response.json();
                        throw new Error(`Failed to set timezone: ${errorData.error || 'Unknown error'}`);
                    } catch (jsonError) {
                        const errorText = await response.text();
                        throw new Error(`Failed to set timezone: ${errorText || response.statusText}`);
                    }
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
                if (isMounted) {
                    setSelectedTimezone(defaultTimezone);
                }
            }
        };

        const initializeEventsAndTimezone = async () => {
            await setUserTimezone();
            
            if (isMounted) {
                await fetchEvents();
                
                fetchInterval = setInterval(() => {
                    console.log('Running scheduled refresh');
                    if (isMounted) {
                        setUserTimezone().then(() => {
                            if (isMounted) {
                                fetchEvents().catch(err => {
                                    console.error('Error in scheduled fetch:', err);
                                });
                            }
                        });
                    }
                }, 5 * 60 * 1000);
            }
        };
        
        initializeEventsAndTimezone().catch(err => {
            console.error('Error during initialization:', err);
        });
        
        return () => {
            console.log('Cleaning up fetch and timezone effect');
            isMounted = false;
            
            if (fetchInterval !== null) {
                clearInterval(fetchInterval);
            }
        };
    }, [timeRange, selectedCurrencies, selectedImpacts, selectedTimezone, startDate, endDate, fetchEvents]);

    const getImpactColor = useCallback((impact: string): string => {
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
    }, []);

    const handleCurrencyChange = useCallback((event: SelectChangeEvent<string[]>) => {
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
    }, []);

    const handleRemoveCurrency = useCallback((currencyToRemove: string) => {
        setSelectedCurrencies(prev => {
            const newCurrencies = prev.filter(currency => currency !== currencyToRemove);
            try {
                localStorage.setItem('selectedCurrencies', JSON.stringify(newCurrencies));
                console.log('Saved currencies after removal:', newCurrencies);
            } catch (error) {
                console.error('Error saving currencies:', error);
            }
            return newCurrencies;
        });
    }, []);

    const handleImpactChange = useCallback((event: SelectChangeEvent<string[]>) => {
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
    }, []);

    const handleTimezoneChange = useCallback((event: SelectChangeEvent<string>) => {
        const value = event.target.value;
        setSelectedTimezone(value);
        try {
            localStorage.setItem('timezone', value);
            console.log('Saved timezone:', value);
        } catch (error) {
            console.error('Error saving timezone:', error);
        }
    }, []);

    const handleRemoveImpact = useCallback((impactToRemove: string) => {
        setSelectedImpacts(prev => {
            const newImpacts = prev.filter(impact => impact !== impactToRemove);
            try {
                localStorage.setItem('selectedImpacts', JSON.stringify(newImpacts));
                console.log('Saved impact levels after removal:', newImpacts);
            } catch (error) {
                console.error('Error saving impact levels:', error);
            }
            return newImpacts;
        });
    }, []);

    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    }, []);

    const handleClose = useCallback(() => {
        setAnchorEl(null);
    }, []);

    const getTimeRangeDisplayText = useCallback(() => {
        if (timeRange === 'specific_date' && selectedDate) {
            return `Date: ${selectedDate}`;
        } else if (timeRange === 'date_range' && startDate && endDate) {
            return `Date Range: ${startDate} to ${endDate}`;
        }
        const option = timeRangeOptions.find(opt => opt.value === timeRange);
        return option ? option.label : 'Select Time Range';
    }, [timeRange, selectedDate, startDate, endDate]);

    const groupEventsByDate = useCallback((events: ForexEvent[]): Record<string, GroupedEvents> => {
        return events.reduce((acc: Record<string, GroupedEvents>, event) => {
            // Parse the event time
            const date = new Date(event.time);
            
            // Format date according to selected timezone
            let displayDate;
            
            try {
                if (!selectedTimezone || selectedTimezone === 'auto') {
                    // Use browser's timezone
                    displayDate = date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                } else {
                    // Use selected timezone
                    displayDate = date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: selectedTimezone
                    });
                }
            } catch (error) {
                console.error('Error formatting date with timezone:', error);
                // Fallback to default formatting
                displayDate = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            
            if (!acc[displayDate]) {
                acc[displayDate] = {
                    displayDate,
                    events: []
                };
            }
            acc[displayDate].events.push(event);
            return acc;
        }, {});
    }, [selectedTimezone]);

    const groupedEventsByDate = useMemo(() => {
        return groupEventsByDate(events);
    }, [events, groupEventsByDate, selectedTimezone]);

    // Helper function to format event time in the selected timezone
    const formatEventTime = useCallback((timeString: string, timezone_abbr?: string) => {
        // If no timeString provided or invalid, return N/A
        if (!timeString || !timeString.trim()) {
            return 'N/A';
        }

        try {
            // Parse the event time string to a Date object
            const eventDate = new Date(timeString);
            
            // If the date is invalid, return N/A
            if (isNaN(eventDate.getTime())) {
                return 'N/A';
            }

            // If using 'auto', use the browser's default timezone
            let formattedTime = '';
            if (!selectedTimezone || selectedTimezone === 'auto') {
                formattedTime = eventDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                // For specific timezones, use the Intl API with timezone option
                formattedTime = eventDate.toLocaleString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: selectedTimezone
                });
            }

            // Append the timezone abbreviation if available
            if (timezone_abbr) {
                return `${formattedTime} ${timezone_abbr}`;
            }
            
            return formattedTime;
        } catch (error) {
            console.error('Error formatting event time:', error);
            return 'N/A';
        }
    }, [selectedTimezone]);

    const TableView = useCallback(() => {
        if (events.length === 0) {
            return (
                <Paper sx={{ 
                    mt: 2,
                    minHeight: '250px',
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
                </Paper>
            );
        }

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
                        {Object.values(groupedEventsByDate).map((group) => (
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
                                                    {formatEventTime(event.time, event.timezone_abbr)}
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
    }, [events, groupedEventsByDate, expanded, getImpactColor, handleInfoButtonClick, formatEventTime]);

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
                                                        {formatEventTime(event.time, event.timezone_abbr)}
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

    // Add memory usage monitoring
    useEffect(() => {
        const logMemoryUsage = () => {
            if (window.performance && (window.performance as any).memory) {
                const memoryInfo = (window.performance as any).memory;
                const usedJSHeapSize = Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024));
                console.log(`Memory usage: ${usedJSHeapSize} MB / ${Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024))} MB`);
                setMemoryUsage(usedJSHeapSize);
                
                if (usedJSHeapSize > 100 && window.gc) {
                    console.log('High memory usage detected, suggesting garbage collection');
                }
            }
        };
        
        logMemoryUsage();
        
        const memoryInterval = setInterval(logMemoryUsage, 30000);
        
        return () => {
            console.log('Cleaning up memory monitoring');
            clearInterval(memoryInterval);
        };
    }, []);

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
            {/* System Alert Notification Banner */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    backgroundColor: '#ed6c02', // Amber color
                    color: 'white',
                    padding: '12px',
                    zIndex: 9999,
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
            >
                <Typography variant="subtitle1" fontWeight="bold">
                    SYSTEM ALERT: We understand we have slight issues with the custom date range filter. Our team is working to fix it. Thank you for your patience.
                </Typography>
            </Box>

            {/* Development memory indicator - only shows in development */}
            {process.env.NODE_ENV === 'development' && memoryUsage !== null && (
                <Box 
                    sx={{ 
                        position: 'fixed', 
                        bottom: 10, 
                        right: 10, 
                        zIndex: 9999,
                        backgroundColor: memoryUsage > 100 ? 'rgba(255,0,0,0.8)' : 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}
                >
                    Memory: {memoryUsage} MB
                </Box>
            )}
            
            <Container maxWidth="xl">
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
                                p: { xs: 2, sm: 4 },
                                mb: 4,
                                color: '#000',
                                maxWidth: '100%',
                                overflowX: 'auto'
                            }}
                        >
                            <Grid 
                                container 
                                spacing={2} 
                                sx={{ 
                                    mb: 4, 
                                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                                    width: '100%'
                                }}
                            >
                                <Grid item xs={12} md={3} sx={{ width: '100%' }}>
                                    <FormControl fullWidth sx={{ width: '100%', mt: 1 }}>
                                        <InputLabel 
                                            id="time-range-filter-label"
                                            sx={{ 
                                                '&.Mui-focused, &.MuiFormLabel-filled': {
                                                    transform: 'translate(14px, -16px) scale(0.75)'
                                                }
                                            }}
                                        >
                                            Time Range
                                        </InputLabel>
                                        <Select
                                            labelId="time-range-filter-label"
                                            label="Time Range"
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
                                            renderValue={(selected) => {
                                                if (selected === 'specific_date' && selectedDate) {
                                                    return `Specific Date: ${selectedDate}`;
                                                } else if (selected === 'date_range' && startDate && endDate) {
                                                    return `Date Range: ${startDate} to ${endDate}`;
                                                }
                                                const option = timeRangeOptions.find(opt => opt.value === selected);
                                                return option ? option.label : 'Select Time Range';
                                            }}
                                        >
                                            {timeRangeOptions.filter(option => option.value !== 'specific_date' && option.value !== 'date_range').map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                            <MenuItem 
                                                value="specific_date"
                                                sx={{ 
                                                    flexDirection: 'column', 
                                                    alignItems: 'flex-start',
                                                    paddingBottom: '8px'
                                                }}
                                            >
                                                <Typography sx={{ mb: 1, fontWeight: 'medium' }}>
                                                    {isRangeSelectionActive 
                                                        ? "Select end date (or same date for single day)" 
                                                        : "Select a date"}
                                                </Typography>
                                                <TextField
                                                    id="embedded-date-picker"
                                                    type="date"
                                                    value={isRangeSelectionActive ? '' : selectedDate}
                                                    fullWidth
                                                    size="small"
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                        e.stopPropagation();
                                                        handleDateChange(e);
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                    sx={{ minWidth: '200px' }}
                                                    InputLabelProps={{
                                                        shrink: true,
                                                    }}
                                                />
                                                {(startDate || endDate) && (
                                                    <Box sx={{ mt: 1, width: '100%' }}>
                                                        {startDate && (
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    color: 'primary.main',
                                                                    fontWeight: 'bold',
                                                                    padding: '4px 8px',
                                                                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                                                    borderRadius: '4px',
                                                                    display: 'inline-block',
                                                                    marginBottom: '4px'
                                                                }}
                                                            >
                                                                Start: {startDate}
                                                            </Typography>
                                                        )}
                                                        {endDate && (
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    color: 'primary.main',
                                                                    fontWeight: 'bold',
                                                                    padding: '4px 8px',
                                                                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                                                    borderRadius: '4px',
                                                                    display: 'inline-block'
                                                                }}
                                                            >
                                                                End: {endDate}
                                                            </Typography>
                                                        )}
                                                        {isRangeSelectionActive && (
                                                            <>
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    display: 'block', 
                                                                    mt: 1, 
                                                                    color: '#1976d2',
                                                                    fontWeight: 'medium',
                                                                    backgroundColor: 'rgba(25, 118, 210, 0.05)',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px',
                                                                    border: '1px dashed rgba(25, 118, 210, 0.5)'
                                                                }}
                                                            >
                                                                Currently selecting: {startDate} to ?
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                                                                Select a different date to complete the range, or select {startDate} again for a single day view.
                                                            </Typography>
                                                            </>
                                                        )}
                                                    </Box>
                                                )}
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={3} sx={{ width: '100%' }}>
                                    <FormControl fullWidth sx={{ width: '100%', mt: 1 }}>
                                        <InputLabel 
                                            id="currency-filter-label"
                                            sx={{ 
                                                '&.Mui-focused, &.MuiFormLabel-filled': {
                                                    transform: 'translate(14px, -16px) scale(0.75)'
                                                }
                                            }}
                                        >
                                            Currency Filter
                                        </InputLabel>
                                        <Select
                                            labelId="currency-filter-label"
                                            label="Currency Filter"
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
                                                    {selected.length === 0 ? (
                                                        <Typography sx={{ color: 'text.secondary' }}>Select currencies</Typography>
                                                    ) : (
                                                        selected.map((value) => (
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
                                                        ))
                                                    )}
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

                                <Grid item xs={12} md={3} sx={{ width: '100%' }}>
                                    <FormControl fullWidth sx={{ width: '100%', mt: 1 }}>
                                        <InputLabel 
                                            id="impact-filter-label"
                                            sx={{ 
                                                '&.Mui-focused, &.MuiFormLabel-filled': {
                                                    transform: 'translate(14px, -16px) scale(0.75)'
                                                }
                                            }}
                                        >
                                            Impact Filter
                                        </InputLabel>
                                        <Select
                                            labelId="impact-filter-label"
                                            label="Impact Filter"
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
                                                    {selected.length === 0 ? (
                                                        <Typography sx={{ color: 'text.secondary' }}>Select impact levels</Typography>
                                                    ) : (
                                                        selected.map((value) => (
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
                                                        ))
                                                    )}
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

                                <Grid item xs={12} md={3} sx={{ width: '100%' }}>
                                    <FormControl fullWidth sx={{ width: '100%', mt: 1 }}>
                                        <InputLabel 
                                            id="timezone-filter-label"
                                            sx={{ 
                                                '&.Mui-focused, &.MuiFormLabel-filled': {
                                                    transform: 'translate(14px, -16px) scale(0.75)'
                                                }
                                            }}
                                        >
                                            Timezone
                                        </InputLabel>
                                        <Select
                                            labelId="timezone-filter-label"
                                            label="Timezone"
                                            value={selectedTimezone}
                                            onChange={handleTimezoneChange}
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
                                            MenuProps={{
                                                PaperProps: {
                                                    style: {
                                                        maxHeight: '300px'
                                                    }
                                                }
                                            }}
                                        >
                                            {timezoneOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {option.FlagComponent && (
                                                            <Box sx={{ width: '16px', height: '12px', display: 'flex', alignItems: 'center' }}>
                                                                <option.FlagComponent 
                                                                    title={option.label} 
                                                                    className="flag" 
                                                                />
                                                            </Box>
                                                        )}
                                                        {option.label}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, mt: 3 }}>
                                <IconButton
                                    onClick={() => setViewMode('table')}
                                    color={viewMode === 'table' ? 'primary' : 'default'}
                                    aria-label="table view"
                                    sx={{ mr: 1 }}
                                >
                                    <TableViewIcon />
                                </IconButton>
                                <IconButton
                                    onClick={() => setViewMode('grid')}
                                    color={viewMode === 'grid' ? 'primary' : 'default'}
                                    aria-label="grid view"
                                >
                                    <GridViewIcon />
                                </IconButton>
                            </Box>

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
