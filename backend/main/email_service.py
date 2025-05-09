import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import List, Dict
import pytz
from dotenv import load_dotenv
import ssl

from ..database import db_session, get_filtered_events
from models.email_subscription import EmailSubscription
from backend.services.ai_summary_service import AISummaryService
from models.forex_event import ForexEvent
from .config import FRONTEND_URL

logger = logging.getLogger(__name__)

def get_smtp_settings():
    """Get SMTP settings from environment variables."""
    # Get the absolute path of the project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_path = os.path.join(project_root, '.env')
    
    # Force reload environment variables
    load_dotenv(env_path, override=True)
    
    # Get settings directly from environment
    settings = {
        'host': os.environ.get('SMTP_HOST', 'smtp.gmail.com'),
        'port': int(os.environ.get('SMTP_PORT', 587)),
        'username': os.environ.get('SMTP_USER'),
        'password': os.environ.get('SMTP_PASSWORD')
    }
    
    # Log settings (without exposing full password)
    logger.info("Loaded SMTP settings:")
    logger.info(f"Host: {settings['host']}")
    logger.info(f"Port: {settings['port']}")
    logger.info(f"Username: {settings['username']}")
    if settings['password']:
        logger.info(f"Password length: {len(settings['password'])}")
        logger.info(f"Password first/last char: {settings['password'][:1]}...{settings['password'][-1]}")
    else:
        logger.error("No password found in environment variables!")
    
    return settings

def create_smtp_connection():
    """Create and return an SMTP connection."""
    try:
        settings = get_smtp_settings()
        
        # Log exact values being used (masking password)
        logger.info("Attempting SMTP connection with settings:")
        logger.info(f"Host: {settings['host']}")
        logger.info(f"Port: {settings['port']}")
        logger.info(f"Username: {settings['username']}")
        logger.info(f"Password first/last char: {settings['password'][:1]}...{settings['password'][-1]}")
        
        if not all([settings['host'], settings['username'], settings['password']]):
            raise ValueError("Missing SMTP configuration")
        
        # Create server with extended timeout
        server = smtplib.SMTP(settings['host'], settings['port'], timeout=30)
        
        # Enable debug output
        server.set_debuglevel(1)
        
        # Start TLS
        logger.info("Starting TLS...")
        server.starttls()
        
        # Attempt login
        logger.info("Attempting login...")
        server.login(settings['username'], settings['password'])
        logger.info("SMTP login successful")
        
        return server
        
    except Exception as e:
        logger.error(f"SMTP Connection Error: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        raise

def send_email(to_email: str, subject: str, html_content: str):
    """Send an email using SMTP."""
    try:
        settings = get_smtp_settings()
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = settings['username']
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with create_smtp_connection() as server:
            server.send_message(msg)
            
        logger.info(f"Email sent successfully to {to_email}")
        
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {str(e)}")
        raise

def send_verification_email(email: str, token: str):
    """Send a verification email."""
    # Use the frontend URL from configuration
    verification_url = f"{FRONTEND_URL}/verify/{token}"
    
    html_content = f"""
    <html>
        <head>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 0;
                    color: #e0e0e0;
                    background-color: #1a1a1a;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }}
                .header {{
                    text-align: center;
                    padding: 20px 0;
                }}
                h1, h2 {{
                    color: #2196F3;
                    text-align: center;
                }}
                p {{
                    line-height: 1.6;
                    margin: 12px 0;
                }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(45deg, #2196F3 30%, #21CBF3 90%);
                    color: white;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 4px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .footer {{
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }}
                a {{
                    color: #2196F3;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Forex News Notifier</h1>
                </div>
                <h2>Verify Your Email</h2>
                <p>Thank you for subscribing to Forex News Notifier!</p>
                <p>Please click the button below to verify your email address:</p>
                <div style="text-align: center;">
                    <a href="{verification_url}" class="button">Verify Email</a>
                </div>
                <p>If you didn't request this subscription, you can ignore this email.</p>
                <div class="footer">
                    <p>© Forex News Notifier. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    send_email(
        to_email=email,
        subject="Verify Your Forex News Notifier Subscription",
        html_content=html_content
    )

def format_event_summary(event: Dict) -> str:
    """Format a single event for email."""
    impact_colors = {
        'High': '#d32f2f',
        'Medium': '#ed6c02',
        'Low': '#2e7d32',
        'Non-Economic': '#424242'
    }
    
    # Get event title from event_title field (not title)
    event_title = event.get('event_title', 'No Title')
    event_time = event.get('time', '')
    timezone_abbr = event.get('timezone_abbr', '')
    formatted_time = event.get('formatted_time', '')
    
    if not formatted_time and isinstance(event_time, datetime):
        formatted_time = f"{event_time.strftime('%I:%M %p')} {timezone_abbr}".strip()
    
    # Format AI summary if available
    ai_summary = event.get('ai_summary')
    summary_section = ""
    if ai_summary:
        summary_section = f"""
        <div style="margin: 15px 0; padding: 20px; background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.2); border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="margin-bottom: 10px; font-weight: 600; color: #2196F3; font-size: 14px;">
                🤖 AI Market Analysis
            </div>
            <div style="font-size: 14px; color: #e0e0e0; line-height: 1.6; white-space: pre-line;">
                {ai_summary}
            </div>
        </div>
        """
    
    return f"""
    <div style="margin-bottom: 25px; padding: 20px; background: #2d2d2d; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
            <div>
                <span style="background-color: {impact_colors.get(event['impact'], '#424242')}; 
                           color: white; 
                           padding: 4px 12px; 
                           border-radius: 20px; 
                           font-size: 12px;
                           display: inline-block;
                           margin-right: 8px;">
                    {event.get('impact', 'Unknown')}
                </span>
                <span style="background-color: rgba(33, 150, 243, 0.2); 
                           color: #2196F3; 
                           padding: 4px 12px; 
                           border-radius: 20px; 
                           font-size: 12px;
                           display: inline-block;">
                    {event.get('currency', 'Unknown')}
                </span>
            </div>
            <div style="color: #e0e0e0; font-size: 14px;">
                {formatted_time or (event_time.strftime('%I:%M %p') if isinstance(event_time, datetime) else 'Time N/A')}
            </div>
        </div>
        
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px; color: #fff;">
            {event_title}
        </div>
        
        <div style="display: flex; gap: 20px; margin-bottom: 15px;">
            <div style="flex: 1; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                <div style="font-size: 12px; color: #aaa; margin-bottom: 4px;">Forecast</div>
                <div style="font-size: 14px; color: #e0e0e0;">{event.get('forecast', 'N/A')}</div>
            </div>
            <div style="flex: 1; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                <div style="font-size: 12px; color: #aaa; margin-bottom: 4px;">Previous</div>
                <div style="font-size: 14px; color: #e0e0e0;">{event.get('previous', 'N/A')}</div>
            </div>
        </div>
        
        {summary_section}
    </div>
    """

def send_daily_update(subscription: EmailSubscription):
    """Send a daily update email."""
    try:
        # Get today's events for the subscribed currencies and impact levels
        now = datetime.now(pytz.UTC)
        events = get_filtered_events(
            start_time=now.replace(hour=0, minute=0, second=0, microsecond=0),
            end_time=now.replace(hour=23, minute=59, second=59, microsecond=999999),
            currencies=subscription.currencies,
            impact_levels=subscription.impact_levels
        )
        
        if not events:
            logger.info(f"No events to send for {subscription.email}")
            return
        
        # Ensure AI summaries are generated for high-impact USD/GBP events
        ai_service = AISummaryService()
        
        for event in events:
            if (event['impact'] == 'High' and 
                event['currency'] in ['USD', 'GBP'] and 
                not event.get('ai_summary')):
                try:
                    summary = ai_service.generate_event_summary(event)
                    if summary:
                        event['ai_summary'] = summary
                        # Update the database
                        db_event = ForexEvent.query.get(event['id'])
                        if db_event:
                            db_event.ai_summary = summary
                            db_event.summary_generated_at = now
                            db_session.commit()
                except Exception as e:
                    logger.error(f"Error generating AI summary for event {event['event_title']}: {str(e)}")
        
        # Convert events to user's timezone
        user_tz = pytz.timezone(subscription.timezone)
        for event in events:
            event_time = datetime.fromisoformat(event['time'])
            if event_time.tzinfo is None:
                event_time = pytz.UTC.localize(event_time)
            local_time = event_time.astimezone(user_tz)
            # Get timezone abbreviation that properly reflects DST status
            tz_abbr = local_time.strftime('%Z')
            event['time'] = local_time
            event['timezone_abbr'] = tz_abbr  # Add timezone abbreviation
            event['formatted_time'] = f"{local_time.strftime('%I:%M %p')} {tz_abbr}"  # Format with abbreviation
        
        # Sort events by time
        events.sort(key=lambda x: x['time'])
        
        # Create email content
        html_content = f"""
        <html>
            <head>
                <style>
                    body {{
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 0;
                        color: #e0e0e0;
                        background-color: #1a1a1a;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }}
                    .header {{
                        text-align: center;
                        padding: 20px 0;
                    }}
                    h1, h2 {{
                        color: #2196F3;
                    }}
                    h1 {{
                        font-size: 28px;
                        text-align: center;
                    }}
                    h2 {{
                        font-size: 24px;
                        text-align: center;
                        margin-bottom: 20px;
                    }}
                    p {{
                        line-height: 1.6;
                        margin: 12px 0;
                    }}
                    .footer {{
                        margin-top: 30px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                    }}
                    a {{
                        color: #2196F3;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Forex News Notifier</h1>
                    </div>
                    <h2>Your Daily Forex News Update</h2>
                    <p>Here are today's important forex events for your selected currencies:</p>
                    {''.join(format_event_summary(event) for event in events)}
                    <div class="footer">
                        <p>
                            To unsubscribe from these updates, 
                            <a href="{FRONTEND_URL}/unsubscribe/{subscription.verification_token}">click here</a>
                        </p>
                        <p>© Forex News Notifier. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        send_email(
            to_email=subscription.email,
            subject=f"Forex News Daily Update - {now.strftime('%B %d, %Y')}",
            html_content=html_content
        )
        
        # Update last sent timestamp
        subscription.last_sent_at = now
        db_session.commit()
        
    except Exception as e:
        logger.error(f"Error sending daily update to {subscription.email}: {str(e)}")
        raise

def send_weekly_update(subscription: EmailSubscription):
    """Send a weekly update email."""
    try:
        # Get next week's events
        now = datetime.now(pytz.UTC)
        events = get_filtered_events(
            start_time=now,
            end_time=now + timedelta(days=7),
            currencies=subscription.currencies,
            impact_levels=subscription.impact_levels
        )
        
        if not events:
            logger.info(f"No events to send for {subscription.email}")
            return
        
        # Convert events to user's timezone and group by day
        user_tz = pytz.timezone(subscription.timezone)
        events_by_day = {}
        
        for event in events:
            event_time = datetime.fromisoformat(event['time'])
            if event_time.tzinfo is None:
                event_time = pytz.UTC.localize(event_time)
            local_time = event_time.astimezone(user_tz)
            
            # Get timezone abbreviation that properly reflects DST status
            tz_abbr = local_time.strftime('%Z')
            event['timezone_abbr'] = tz_abbr  # Add timezone abbreviation
            event['formatted_time'] = f"{local_time.strftime('%I:%M %p')} {tz_abbr}"  # Format with abbreviation
            
            day_key = local_time.strftime('%Y-%m-%d')
            if day_key not in events_by_day:
                events_by_day[day_key] = []
            
            event['time'] = local_time
            events_by_day[day_key].append(event)
        
        # Create email content
        html_content = """
        <html>
            <head>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 0;
                        color: #e0e0e0;
                        background-color: #1a1a1a;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .header {
                        text-align: center;
                        padding: 20px 0;
                    }
                    h1, h2, h3 {
                        color: #2196F3;
                    }
                    h1 {
                        font-size: 28px;
                        text-align: center;
                    }
                    h2 {
                        font-size: 24px;
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    h3 {
                        font-size: 20px;
                        margin-top: 30px;
                    }
                    p {
                        line-height: 1.6;
                        margin: 12px 0;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                    }
                    a {
                        color: #2196F3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Forex News Notifier</h1>
                    </div>
                    <h2>Your Weekly Forex News Summary</h2>
                    <p>Here are the important forex events for the upcoming week:</p>
        """
        
        for day_key in sorted(events_by_day.keys()):
            day_events = events_by_day[day_key]
            day_date = datetime.strptime(day_key, '%Y-%m-%d')
            
            html_content += f"""
                <h3>
                    {day_date.strftime('%A, %B %d')}
                </h3>
                {''.join(format_event_summary(event) for event in sorted(day_events, key=lambda x: x['time']))}
            """
        
        html_content += f"""
                    <div class="footer">
                        <p>
                            To unsubscribe from these updates, 
                            <a href="{FRONTEND_URL}/unsubscribe/{subscription.verification_token}">click here</a>
                        </p>
                        <p>© Forex News Notifier. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        send_email(
            to_email=subscription.email,
            subject=f"Forex News Weekly Summary - Week of {now.strftime('%B %d, %Y')}",
            html_content=html_content
        )
        
        # Update last sent timestamp
        subscription.last_sent_at = now
        db_session.commit()
        
    except Exception as e:
        logger.error(f"Error sending weekly update to {subscription.email}: {str(e)}")
        raise 