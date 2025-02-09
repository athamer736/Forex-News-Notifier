import os
from config.smtp_config import get_smtp_config
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def test_smtp_connection(to_email=None):
    try:
        # Get SMTP configuration
        smtp_config = get_smtp_config()
        
        # If no target email specified, use sender's email
        if not to_email:
            print("No target email specified. Enter the email address to send the test to:")
            to_email = input("Email: ").strip()
        
        # Create test email
        msg = MIMEMultipart()
        msg['From'] = smtp_config['user']
        msg['To'] = to_email
        msg['Subject'] = 'Forex News Notifier - SMTP Test'
        
        body = f"""
        This is a test email from your Forex News Notifier application.
        If you receive this, your SMTP configuration is working correctly!
        
        Sent from: {smtp_config['user']}
        Sent to: {to_email}
        """
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to SMTP server
        print("Connecting to SMTP server...")
        with smtplib.SMTP(smtp_config['host'], smtp_config['port']) as server:
            server.starttls()
            print("Logging in...")
            server.login(smtp_config['user'], smtp_config['password'])
            print(f"Sending test email to {to_email}...")
            server.send_message(msg)
            print("Test email sent successfully!")
            return True
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    test_smtp_connection() 