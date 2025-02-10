@echo off
setlocal enabledelayedexpansion

:: Set title
title Forex News Notifier Server Manager

:: Set colors for status messages
set "BLUE=[94m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "RESET=[0m"

echo %BLUE%=======================================
echo    Forex News Notifier Server Manager
echo =======================================%RESET%
echo.

:: Check if Python is installed
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%Error: Python is not installed or not in PATH%RESET%
    echo Please install Python 3.10 or higher and try again
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%Error: Node.js is not installed or not in PATH%RESET%
    echo Please install Node.js and try again
    pause
    exit /b 1
)

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Check if we're in the right directory
if not exist "scripts\start_server.py" (
    echo %RED%Error: Could not find start_server.py%RESET%
    echo Please run this batch file from the project root directory
    pause
    exit /b 1
)

:: Display startup message
echo %YELLOW%Starting Forex News Notifier Server...%RESET%
echo.
echo %GREEN%[✓]%RESET% Python detected
echo %GREEN%[✓]%RESET% Node.js detected
echo %GREEN%[✓]%RESET% Project files found
echo.

:: Create and activate virtual environment if it doesn't exist
if not exist "venv" (
    echo %YELLOW%Creating virtual environment...%RESET%
    python -m venv venv
    if %errorlevel% neq 0 (
        echo %RED%Error creating virtual environment%RESET%
        pause
        exit /b 1
    )
)

:: Activate virtual environment
call venv\Scripts\activate
if %errorlevel% neq 0 (
    echo %RED%Error activating virtual environment%RESET%
    pause
    exit /b 1
)

:: Install or upgrade pip
echo %YELLOW%Upgrading pip...%RESET%
python -m pip install --upgrade pip > logs\pip_upgrade.log 2>&1
if %errorlevel% neq 0 (
    echo %RED%Error upgrading pip. Check logs\pip_upgrade.log for details%RESET%
    pause
    exit /b 1
)

:: Install requirements
echo %YELLOW%Installing Python requirements...%RESET%
pip install -r requirements.txt > logs\pip_install.log 2>&1
if %errorlevel% neq 0 (
    echo %RED%Error installing requirements. Check logs\pip_install.log for details%RESET%
    pause
    exit /b 1
)

:: Install frontend dependencies
echo %YELLOW%Installing frontend dependencies...%RESET%
cd frontend
call npm install > ..\logs\npm_install.log 2>&1
if %errorlevel% neq 0 (
    echo %RED%Error installing frontend dependencies. Check logs\npm_install.log for details%RESET%
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo %GREEN%All dependencies installed successfully!%RESET%
echo.

:: Create individual batch files for each component
echo %YELLOW%Creating component runners...%RESET%

:: Create Flask server runner
echo @echo off > run_flask.bat
echo title Forex News Notifier - Flask Server >> run_flask.bat
echo color 0B >> run_flask.bat
echo set PYTHONPATH=%cd% >> run_flask.bat
echo call venv\Scripts\activate >> run_flask.bat
echo python app.py >> run_flask.bat
echo pause >> run_flask.bat

:: Create event scheduler runner
echo @echo off > run_event_scheduler.bat
echo title Forex News Notifier - Event Scheduler >> run_event_scheduler.bat
echo color 0A >> run_event_scheduler.bat
echo set PYTHONPATH=%cd% >> run_event_scheduler.bat
echo call venv\Scripts\activate >> run_event_scheduler.bat
echo python scripts\run_scheduler.py >> run_event_scheduler.bat
echo pause >> run_event_scheduler.bat

:: Create email scheduler runner
echo @echo off > run_email_scheduler.bat
echo title Forex News Notifier - Email Scheduler >> run_email_scheduler.bat
echo color 0E >> run_email_scheduler.bat
echo set PYTHONPATH=%cd% >> run_email_scheduler.bat
echo call venv\Scripts\activate >> run_email_scheduler.bat
echo python scripts\email_scheduler.py >> run_email_scheduler.bat
echo pause >> run_email_scheduler.bat

:: Create frontend runner
echo @echo off > run_frontend.bat
echo title Forex News Notifier - Frontend >> run_frontend.bat
echo color 0D >> run_frontend.bat
echo cd frontend >> run_frontend.bat
echo npm run dev >> run_frontend.bat
echo pause >> run_frontend.bat

:: Start all components in separate windows
echo %YELLOW%Starting all components...%RESET%
echo %BLUE%Each component will open in its own window%RESET%
echo.

start "Flask Server" run_flask.bat
timeout /t 2 > nul
start "Event Scheduler" run_event_scheduler.bat
timeout /t 2 > nul
start "Email Scheduler" run_email_scheduler.bat
timeout /t 2 > nul
start "Frontend" run_frontend.bat

echo %GREEN%All components started!%RESET%
echo.
echo %BLUE%Component Status:%RESET%
echo - Flask Server: Running in separate window
echo - Event Scheduler: Running in separate window
echo - Email Scheduler: Running in separate window
echo - Frontend: Running in separate window
echo.
echo %YELLOW%To stop all components, close their respective windows%RESET%
echo %YELLOW%You can also close this window - the other processes will continue running%RESET%
echo.
echo %BLUE%Press any key to exit this window...%RESET%
pause > nul 