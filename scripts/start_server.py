import os
import sys
import subprocess
import time
import signal
import logging
import venv
from logging.handlers import RotatingFileHandler
from datetime import datetime

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'server.log')
logger = logging.getLogger('ServerManager')
handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Store process handles
processes = []

def setup_virtual_environment():
    """Set up and configure virtual environment"""
    try:
        venv_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'venv')
        
        # Create virtual environment if it doesn't exist
        if not os.path.exists(venv_dir):
            logger.info("Creating virtual environment...")
            venv.create(venv_dir, with_pip=True)
        
        # Get the path to the virtual environment Python executable
        if sys.platform == 'win32':
            python_path = os.path.join(venv_dir, 'Scripts', 'python.exe')
            pip_path = os.path.join(venv_dir, 'Scripts', 'pip.exe')
        else:
            python_path = os.path.join(venv_dir, 'bin', 'python')
            pip_path = os.path.join(venv_dir, 'bin', 'pip')
        
        if not os.path.exists(python_path):
            raise Exception("Virtual environment Python executable not found")
        
        # Install or upgrade pip
        logger.info("Upgrading pip...")
        subprocess.run([python_path, '-m', 'pip', 'install', '--upgrade', 'pip'], 
                      check=True, capture_output=True)
        
        # Install requirements
        logger.info("Installing requirements...")
        requirements_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'requirements.txt')
        subprocess.run([pip_path, 'install', '-r', requirements_path], 
                      check=True, capture_output=True)
        
        logger.info("Virtual environment setup completed successfully")
        return python_path
        
    except Exception as e:
        logger.error(f"Error setting up virtual environment: {str(e)}")
        return None

def setup_frontend():
    """Set up and start the Next.js frontend"""
    try:
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
        if not os.path.exists(frontend_dir):
            raise Exception("Frontend directory not found")

        logger.info("Installing frontend dependencies...")
        subprocess.run(['npm', 'install'], 
                      check=True, 
                      capture_output=True,
                      cwd=frontend_dir)

        logger.info("Starting frontend development server...")
        frontend_process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            cwd=frontend_dir
        )
        processes.append(frontend_process)
        logger.info(f"Frontend server started with PID {frontend_process.pid}")
        return frontend_process

    except Exception as e:
        logger.error(f"Error setting up frontend: {str(e)}")
        return None

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info("Received shutdown signal. Stopping all processes...")
    stop_all_processes()
    sys.exit(0)

def stop_all_processes():
    """Stop all running processes"""
    for process in processes:
        try:
            if process.poll() is None:  # If process is still running
                logger.info(f"Stopping process {process.pid}")
                process.terminate()
                process.wait(timeout=5)  # Wait up to 5 seconds for graceful shutdown
        except Exception as e:
            logger.error(f"Error stopping process: {str(e)}")
            try:
                process.kill()  # Force kill if terminate doesn't work
            except:
                pass

def start_flask_server(python_path):
    """Start the Flask server"""
    try:
        logger.info("Starting Flask server...")
        flask_process = subprocess.Popen(
            [python_path, 'app.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            cwd=os.path.dirname(os.path.dirname(__file__))  # Set working directory to project root
        )
        processes.append(flask_process)
        logger.info(f"Flask server started with PID {flask_process.pid}")
        return flask_process
    except Exception as e:
        logger.error(f"Error starting Flask server: {str(e)}")
        return None

def start_scheduler(python_path):
    """Start the event scheduler"""
    try:
        logger.info("Starting event scheduler...")
        scheduler_process = subprocess.Popen(
            [python_path, 'scripts/run_scheduler.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            cwd=os.path.dirname(os.path.dirname(__file__))  # Set working directory to project root
        )
        processes.append(scheduler_process)
        logger.info(f"Event scheduler started with PID {scheduler_process.pid}")
        return scheduler_process
    except Exception as e:
        logger.error(f"Error starting scheduler: {str(e)}")
        return None

def start_email_scheduler(python_path):
    """Start the email scheduler"""
    try:
        logger.info("Starting email scheduler...")
        email_scheduler_process = subprocess.Popen(
            [python_path, 'scripts/email_scheduler.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            cwd=os.path.dirname(os.path.dirname(__file__))
        )
        processes.append(email_scheduler_process)
        logger.info(f"Email scheduler started with PID {email_scheduler_process.pid}")
        return email_scheduler_process
    except Exception as e:
        logger.error(f"Error starting email scheduler: {str(e)}")
        return None

def monitor_processes(python_path):
    """Monitor running processes and restart if needed"""
    while True:
        try:
            for i, process in enumerate(processes):
                if process.poll() is not None:  # Process has terminated
                    logger.warning(f"Process {process.pid} has terminated. Restarting...")
                    
                    # Get process output
                    out, err = process.communicate()
                    if out:
                        logger.info(f"Process output: {out}")
                    if err:
                        logger.error(f"Process error: {err}")
                    
                    # Restart the appropriate process
                    if i == 0:  # Flask server
                        processes[i] = start_flask_server(python_path)
                    elif i == 1:  # Event scheduler
                        processes[i] = start_scheduler(python_path)
                    elif i == 2:  # Frontend
                        processes[i] = setup_frontend()
                    else:  # Email scheduler
                        processes[i] = start_email_scheduler(python_path)
            
            time.sleep(5)  # Check every 5 seconds
            
        except Exception as e:
            logger.error(f"Error in process monitor: {str(e)}")
            time.sleep(5)  # Wait before retrying

def main():
    """Main function to start all services"""
    try:
        # Set up signal handlers
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        logger.info("Starting server manager...")
        
        # Setup virtual environment
        python_path = setup_virtual_environment()
        if not python_path:
            logger.error("Failed to set up virtual environment, will retry in 30 seconds...")
            time.sleep(30)
            python_path = setup_virtual_environment()
            if not python_path:
                logger.error("Virtual environment setup failed twice, continuing with limited functionality")
        
        # Start Flask server
        flask_process = start_flask_server(python_path)
        if not flask_process:
            logger.error("Failed to start Flask server, will retry in 30 seconds...")
            time.sleep(30)
            flask_process = start_flask_server(python_path)
            if not flask_process:
                logger.error("Flask server failed to start twice, continuing with limited functionality")
        
        # Start scheduler
        scheduler_process = start_scheduler(python_path)
        if not scheduler_process:
            logger.error("Failed to start scheduler, will retry in 30 seconds...")
            time.sleep(30)
            scheduler_process = start_scheduler(python_path)
            if not scheduler_process:
                logger.error("Scheduler failed to start twice, continuing with limited functionality")
        
        # Start frontend
        frontend_process = setup_frontend()
        if not frontend_process:
            logger.error("Failed to start frontend, will retry in 30 seconds...")
            time.sleep(30)
            frontend_process = setup_frontend()
            if not frontend_process:
                logger.error("Frontend failed to start twice, continuing with limited functionality")
        
        # Start email scheduler
        email_scheduler_process = start_email_scheduler(python_path)
        if not email_scheduler_process:
            logger.error("Failed to start email scheduler, will retry in 30 seconds...")
            time.sleep(30)
            email_scheduler_process = start_email_scheduler(python_path)
            if not email_scheduler_process:
                logger.error("Email scheduler failed to start twice, continuing with limited functionality")
        
        logger.info("Server manager initialization complete. Starting process monitor...")
        
        # Monitor processes
        while True:
            try:
                for i, process in enumerate(processes):
                    if process and process.poll() is not None:  # Process has terminated
                        # Get process output
                        out, err = process.communicate()
                        if out:
                            logger.info(f"Process output: {out}")
                        if err:
                            logger.error(f"Process error: {err}")
                        
                        logger.warning(f"Process {process.pid} has terminated. Attempting restart...")
                        
                        # Restart the appropriate process
                        if i == 0:  # Flask server
                            new_process = start_flask_server(python_path)
                            if new_process:
                                processes[i] = new_process
                                logger.info("Flask server restarted successfully")
                            else:
                                logger.error("Failed to restart Flask server")
                        elif i == 1:  # Event scheduler
                            new_process = start_scheduler(python_path)
                            if new_process:
                                processes[i] = new_process
                                logger.info("Event scheduler restarted successfully")
                            else:
                                logger.error("Failed to restart event scheduler")
                        elif i == 2:  # Frontend
                            new_process = setup_frontend()
                            if new_process:
                                processes[i] = new_process
                                logger.info("Frontend restarted successfully")
                            else:
                                logger.error("Failed to restart frontend")
                        else:  # Email scheduler
                            new_process = start_email_scheduler(python_path)
                            if new_process:
                                processes[i] = new_process
                                logger.info("Email scheduler restarted successfully")
                            else:
                                logger.error("Failed to restart email scheduler")
                
                time.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in process monitor: {str(e)}")
                time.sleep(5)  # Wait before retrying
        
    except Exception as e:
        logger.error(f"Critical error in main: {str(e)}")
        logger.error("Attempting to continue running...")
        time.sleep(30)  # Wait before retrying
        main()  # Recursive call to restart the main function
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt. Shutting down gracefully...")
        stop_all_processes()
        sys.exit(0)

if __name__ == "__main__":
    main() 