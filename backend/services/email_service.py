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
                grouped_events[impact].append(event)

        return template.render(
            grouped_events=grouped_events,
            date=datetime.now(local_tz).strftime('%A, %B %d, %Y')
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
            grouped_events[day_key]['events'].append(event)

        return template.render(
            grouped_events=grouped_events,
            week_start=datetime.now(local_tz).strftime('%B %d, %Y')
        )

    def send_daily_notification(self, user_email: str, events: List[Dict], user_timezone: str):
        html_content = self.format_daily_notification(events, user_timezone)
        subject = f"Forex News Update - {datetime.now().strftime('%B %d, %Y')}"
        return self.send_email(user_email, subject, html_content)

    def send_weekly_notification(self, user_email: str, events: List[Dict], user_timezone: str):
        html_content = self.format_weekly_notification(events, user_timezone)
        subject = f"Weekly Forex News Preview - Week of {datetime.now().strftime('%B %d, %Y')}"
        return self.send_email(user_email, subject, html_content) 