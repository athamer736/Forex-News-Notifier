import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def test_smtp_connection():
    # Load environment variables
    load_dotenv(override=True)
    
    # Get settings
    host = os.environ.get('SMTP_HOST')
    port = int(os.environ.get('SMTP_PORT', 587))
    username = os.environ.get('SMTP_USER')
    password = os.environ.get('SMTP_PASSWORD')
    
    print(f"Testing SMTP connection with:")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Username: {username}")
    print(f"Password first/last char: {password[:1]}...{password[-1]}")
    
    try:
        # Create server
        server = smtplib.SMTP(host, port, timeout=30)
        server.set_debuglevel(1)
        
        # Start TLS
        print("\nStarting TLS...")
        server.starttls()
        
        # Login
        print("\nAttempting login...")
        server.login(username, password)
        print("Login successful!")
        
        # Try sending a test email
        print("\nSending test email...")
        msg = MIMEMultipart()
        msg['Subject'] = 'SMTP Test'
        msg['From'] = username
        msg['To'] = username  # Send to self
        
        text = "This is a test email to verify SMTP settings."
        msg.attach(MIMEText(text))
        
        server.send_message(msg)
        print("Test email sent successfully!")
        
        server.quit()
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        raise

if __name__ == "__main__":
    test_smtp_connection() 