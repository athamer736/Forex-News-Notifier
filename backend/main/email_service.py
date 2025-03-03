import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import List, Dict
import pytz
from dotenv import load_dotenv

from ..database import db_session, get_filtered_events
from models.email_subscription import EmailSubscription
from backend.services.ai_summary_service import AISummaryService
from models.forex_event import ForexEvent

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
    # Use the frontend URL without specifying port
    verification_url = f"https://fxalert.co.uk/verify/{token}"
    
    html_content = f"""
    <html>
        <body>
            <h2>Verify Your Email</h2>
            <p>Thank you for subscribing to Forex News Notifier!</p>
            <p>Please click the link below to verify your email address:</p>
            <p><a href="{verification_url}">Verify Email</a></p>
            <p>If you didn't request this subscription, you can ignore this email.</p>
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
    if isinstance(event_time, str):
        try:
            event_time = datetime.fromisoformat(event_time)
        except ValueError:
            event_time = datetime.now()
    
    # Format AI summary if available
    ai_summary = event.get('ai_summary')
    summary_section = ""
    if ai_summary:
        summary_section = f"""
        <div style="margin: 15px 0; padding: 20px; background: linear-gradient(145deg, #1a237e05 0%, #0d47a110 100%); border: 1px solid #1a237e20; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="margin-bottom: 10px; font-weight: 600; color: #1a237e; font-size: 14px;">
                🤖 AI Market Analysis
            </div>
            <div style="font-size: 14px; color: #333; line-height: 1.6; white-space: pre-line;">
                {ai_summary}
            </div>
        </div>
        """
    
    return f"""
    <div style="margin-bottom: 25px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
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
                <span style="background-color: #e3f2fd; 
                           color: #1976d2; 
                           padding: 4px 12px; 
                           border-radius: 20px; 
                           font-size: 12px;
                           display: inline-block;">
                    {event.get('currency', 'Unknown')}
                </span>
            </div>
            <div style="color: #666; font-size: 14px;">
                {event_time.strftime('%I:%M %p') if isinstance(event_time, datetime) else 'Time N/A'}
            </div>
        </div>
        
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px; color: #333;">
            {event_title}
        </div>
        
        <div style="display: flex; gap: 20px; margin-bottom: 15px;">
            <div style="flex: 1; padding: 8px; background: #f5f5f5; border-radius: 8px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Forecast</div>
                <div style="font-size: 14px; color: #333;">{event.get('forecast', 'N/A')}</div>
            </div>
            <div style="flex: 1; padding: 8px; background: #f5f5f5; border-radius: 8px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Previous</div>
                <div style="font-size: 14px; color: #333;">{event.get('previous', 'N/A')}</div>
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
            event['time'] = event_time.astimezone(user_tz)
        
        # Sort events by time
        events.sort(key=lambda x: x['time'])
        
        # Create email content
        html_content = f"""
        <html>
            <body>
                <h2>Your Daily Forex News Update</h2>
                <p>Here are today's important forex events for your selected currencies:</p>
                {''.join(format_event_summary(event) for event in events)}
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                    To unsubscribe from these updates, 
                    <a href="https://fxalert.co.uk/unsubscribe/{subscription.verification_token}">click here</a>
                </p>
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
            
            day_key = local_time.strftime('%Y-%m-%d')
            if day_key not in events_by_day:
                events_by_day[day_key] = []
            
            event['time'] = local_time
            events_by_day[day_key].append(event)
        
        # Create email content
        html_content = """
        <html>
            <body>
                <h2>Your Weekly Forex News Summary</h2>
                <p>Here are the important forex events for the upcoming week:</p>
        """
        
        for day_key in sorted(events_by_day.keys()):
            day_events = events_by_day[day_key]
            day_date = datetime.strptime(day_key, '%Y-%m-%d')
            
            html_content += f"""
                <h3 style="margin-top: 30px; color: #1976d2;">
                    {day_date.strftime('%A, %B %d')}
                </h3>
                {''.join(format_event_summary(event) for event in sorted(day_events, key=lambda x: x['time']))}
            """
        
        html_content += f"""
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                    To unsubscribe from these updates, 
                    <a href="https://fxalert.co.uk/unsubscribe/{subscription.verification_token}">click here</a>
                </p>
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