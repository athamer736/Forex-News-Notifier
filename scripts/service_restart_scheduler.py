import sys
from pathlib import Path
import time
import logging
import os
import subprocess
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

# Configure logging
log_dir = os.path.join(project_root, 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'service_restart_scheduler.log')
logger = logging.getLogger('ServiceRestartScheduler')

# Create file handler
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.INFO)

# Create console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                             datefmt='%Y-%m-%d %H:%M:%S')

# Add formatter to handlers
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers to logger
logger.addHandler(file_handler)
logger.addHandler(console_handler)
logger.setLevel(logging.INFO)

def restart_flask_service():
    """Restart the Flask backend service."""
    try:
        logger.info("Starting scheduled Flask service restart")
        
        # The PowerShell command to execute
        powershell_cmd = """
        Stop-Service FlaskBackend -Force; 
        Start-Sleep -Seconds 2; 
        C:\\nssm\\win64\\nssm.exe set FlaskBackend AppParameters "C:\\FlaskApps\\forex_news_notifier\\backend\\run_waitress.py"; 
        Start-Sleep -Seconds 2; 
        Start-Service FlaskBackend; 
        Start-Sleep -Seconds 5; 
        Get-Service FlaskBackend | Format-List Name, Status, StartType
        """
        
        # Execute the PowerShell command
        logger.info("Stopping FlaskBackend service...")
        result = subprocess.run(
            ["powershell", "-Command", powershell_cmd],
            capture_output=True,
            text=True
        )
        
        # Log the command output
        if result.stdout:
            logger.info(f"Command output: {result.stdout}")
        if result.stderr:
            logger.error(f"Command error: {result.stderr}")
            
        if result.returncode == 0:
            logger.info("Flask service restart completed successfully")
        else:
            logger.error(f"Flask service restart failed with exit code: {result.returncode}")
        
    except Exception as e:
        logger.error(f"Error during Flask service restart: {str(e)}")

def main():
    try:
        logger.info("Starting the Flask service restart scheduler")
        
        # Create and configure the scheduler
        scheduler = BackgroundScheduler()
        
        # Schedule the job to run every 12 hours
        scheduler.add_job(
            restart_flask_service,
            IntervalTrigger(hours=12),  # Run every 12 hours
            id='flask_service_restart',
            name='Flask Backend Service Restart',
            max_instances=1,
            coalesce=True,  # If multiple instances are about to run, only run once
            next_run_time=datetime.now()  # Run immediately on startup
        )
        
        # Start the scheduler
        scheduler.start()
        logger.info("Scheduler started successfully")
        
        # Keep the script running
        try:
            while True:
                # Sleep for a minute between checks - keeps the process alive
                # without consuming too much CPU
                time.sleep(60)
                logger.debug("Service restart scheduler heartbeat - still running")
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down scheduler...")
            scheduler.shutdown()
            
    except Exception as e:
        logger.error(f"Error in scheduler: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 