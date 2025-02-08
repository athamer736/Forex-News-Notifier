import MetaTrader5 as mt5
from datetime import datetime, timedelta
import pytz
import logging
import json
import os

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class MT5Calendar:
    def __init__(self):
        self.initialized = False
        self.calendar_file = None
        
    def initialize(self):
        """Initialize connection to MetaTrader 5"""
        if not mt5.initialize():
            logger.error(f"MetaTrader5 initialization failed: {mt5.last_error()}")
            return False
            
        logger.info("MetaTrader5 initialized successfully")
        
        # Get terminal info
        terminal_info = mt5.terminal_info()
        if terminal_info is not None:
            logger.info(f"Terminal info: {terminal_info._asdict()}")
            # Set path to the exported calendar file
            self.calendar_file = os.path.join(terminal_info.data_path, 'MQL5', 'Files', 'calendar_events.json')
            logger.info(f"Calendar file path: {self.calendar_file}")
            
        # Print MT5 version
        logger.info(f"MT5 version: {mt5.version()}")
        
        self.initialized = True
        return True
        
    def shutdown(self):
        """Shutdown MetaTrader 5 connection"""
        if self.initialized:
            mt5.shutdown()
            self.initialized = False
            logger.info("MetaTrader5 connection closed")
            
    def fetch_calendar_events(self, days_before=7, days_ahead=7):
        """
        Fetch economic calendar events from exported JSON file
        
        Args:
            days_before (int): Number of days to look back
            days_ahead (int): Number of days to look ahead
            
        Returns:
            list: List of calendar events
        """
        try:
            if not self.initialized and not self.initialize():
                return []
                
            if not self.calendar_file or not os.path.exists(self.calendar_file):
                logger.error(f"Calendar file not found at: {self.calendar_file}")
                logger.info("Please run the ExportCalendar.mq5 script in MT5 first")
                return []
                
            # Calculate time range
            current_time = datetime.now(pytz.UTC)
            from_date = current_time - timedelta(days=days_before)
            to_date = current_time + timedelta(days=days_ahead)
            
            logger.debug(f"Fetching calendar events from {from_date} to {to_date}")
            
            try:
                with open(self.calendar_file, 'r') as f:
                    events = json.load(f)
                    
                # Format and filter events
                formatted_events = []
                for event in events:
                    try:
                        # Parse event time
                        event_time = datetime.strptime(event['time'], '%Y.%m.%d %H:%M')
                        event_time = pytz.UTC.localize(event_time)
                        
                        # Check if event is within the specified time range
                        if from_date <= event_time <= to_date:
                            formatted_event = {
                                'time': event_time.isoformat(),
                                'currency': event['currency'],
                                'impact': self._get_impact_level(int(event['impact'])),
                                'event_title': event['event_title'],
                                'forecast': event['forecast'],
                                'previous': event['previous'],
                                'actual': event['actual'],
                                'source': 'mt5'
                            }
                            formatted_events.append(formatted_event)
                            logger.debug(f"Added MT5 event: {formatted_event['event_title']}")
                    except Exception as e:
                        logger.error(f"Error formatting event: {str(e)}")
                        continue
                
                logger.info(f"Successfully fetched {len(formatted_events)} events from MT5")
                return formatted_events
                
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding JSON file: {str(e)}")
                return []
            
        except Exception as e:
            logger.error(f"Error fetching MT5 calendar events: {str(e)}")
            return []
            
    def _get_impact_level(self, importance):
        """Convert MT5 importance level to impact level"""
        impact_map = {
            1: 'Low',
            2: 'Medium',
            3: 'High'
        }
        return impact_map.get(importance, 'Low')
        
    def __del__(self):
        """Ensure MT5 connection is closed when object is destroyed"""
        self.shutdown() 