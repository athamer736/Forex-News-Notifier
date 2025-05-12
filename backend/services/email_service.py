import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import pytz
from jinja2 import Environment, FileSystemLoader
from typing import List, Dict

class EmailService:
    def __init__(self, smtp_host: str, smtp_port: int, smtp_user: str, smtp_password: str):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.jinja_env = Environment(loader=FileSystemLoader('backend/templates/email'))

    def send_email(self, to_email: str, subject: str, html_content: str):
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = self.smtp_user
        msg['To'] = to_email

        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
                return True
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False

    def format_daily_notification(self, events: List[Dict], user_timezone: str) -> str:
        template = self.jinja_env.get_template('daily_notification.html')
        local_tz = pytz.timezone(user_timezone)
        
        # Group events by impact level
        grouped_events = {
            'High': [],
            'Medium': [],
            'Low': []
        }
        
        for event in events:
            impact = event.get('impact', 'Low')
            if impact in grouped_events:
                # Convert event time to user's timezone
                event_time = datetime.strptime(event['time'], '%Y-%m-%d %H:%M:%S')
                event_time = pytz.utc.localize(event_time).astimezone(local_tz)
                event['formatted_time'] = event_time.strftime('%I:%M %p')
                event['timezone_abbr'] = event_time.strftime('%Z')
                grouped_events[impact].append(event)

        today = datetime.now(pytz.timezone(user_timezone)).strftime('%B %d, %Y')
        
        # Get timezone abbreviation
        tz = pytz.timezone(user_timezone)
        current_time = datetime.now(pytz.UTC).astimezone(tz)
        timezone_abbr = current_time.strftime('%Z')
        
        return template.render(
            grouped_events=grouped_events,
            date=today,
            timezone_abbr=timezone_abbr
        )

    def format_weekly_notification(self, events: List[Dict], user_timezone: str) -> str:
        template = self.jinja_env.get_template('weekly_notification.html')
        local_tz = pytz.timezone(user_timezone)
        
        # Group events by day
        grouped_events = {}
        for event in events:
            event_time = datetime.strptime(event['time'], '%Y-%m-%d %H:%M:%S')
            event_time = pytz.utc.localize(event_time).astimezone(local_tz)
            day_key = event_time.strftime('%Y-%m-%d')
            
            if day_key not in grouped_events:
                grouped_events[day_key] = {
                    'date': event_time.strftime('%A, %B %d'),
                    'events': []
                }
            
            event['formatted_time'] = event_time.strftime('%I:%M %p')
            event['timezone_abbr'] = event_time.strftime('%Z')
            grouped_events[day_key]['events'].append(event)

        # Get timezone abbreviation
        tz = pytz.timezone(user_timezone)
        now = datetime.now(pytz.UTC).astimezone(tz)
        week_start = now.strftime('%B %d, %Y')
        timezone_abbr = now.strftime('%Z')
        
        return template.render(
            grouped_events=grouped_events,
            week_start=week_start,
            timezone_abbr=timezone_abbr
        )

    def send_daily_notification(self, email, events, timezone):
        """Send daily notification with events."""
        today = datetime.now(pytz.timezone(timezone)).strftime('%B %d, %Y')
        
        # Get timezone abbreviation
        tz = pytz.timezone(timezone)
        current_time = datetime.now(pytz.UTC).astimezone(tz)
        timezone_abbr = current_time.strftime('%Z')
        
        # Group events by impact
        grouped_events = {
            'High': [],
            'Medium': [],
            'Low': []
        }
        
        for event in events:
            impact = event.get('impact', 'Low')
            if impact not in grouped_events:
                grouped_events[impact] = []
            
            # Add formatting for time display including timezone abbreviation
            event_time = event.get('time')
            if isinstance(event_time, str):
                try:
                    dt = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
                    local_time = dt.astimezone(tz)
                    event['formatted_time'] = local_time.strftime('%I:%M %p')
                    event['timezone_abbr'] = local_time.strftime('%Z')
                except:
                    event['formatted_time'] = event_time
            
            grouped_events[impact].append(event)
        
        html = self.format_daily_notification(grouped_events, timezone)
        
        self.send_email(
            email,
            f"Forex Economic Calendar - {today}",
            html
        )

    def send_weekly_notification(self, email, events, timezone):
        """Send weekly notification with events."""
        # Group events by day
        tz = pytz.timezone(timezone)
        now = datetime.now(pytz.UTC).astimezone(tz)
        week_start = now.strftime('%B %d, %Y')
        timezone_abbr = now.strftime('%Z')
        
        grouped_events = {}
        
        for event in events:
            event_time = event.get('time')
            if isinstance(event_time, str):
                try:
                    dt = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
                    local_time = dt.astimezone(tz)
                    day_key = local_time.strftime('%Y-%m-%d')
                    
                    if day_key not in grouped_events:
                        grouped_events[day_key] = {
                            'date': local_time.strftime('%A, %B %d'),
                            'events': []
                        }
                    
                    event['formatted_time'] = local_time.strftime('%I:%M %p')
                    event['timezone_abbr'] = local_time.strftime('%Z')
                    grouped_events[day_key]['events'].append(event)
                except:
                    print(f"Error parsing event time: {event_time}")
        
        html = self.format_weekly_notification(grouped_events, timezone)
        
        self.send_email(
            email,
            f"Weekly Forex Calendar - Week of {week_start}",
            html
        ) 