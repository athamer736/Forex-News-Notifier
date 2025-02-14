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

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%Please run this script as Administrator%RESET%
    pause
    exit /b 1
)

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
if not exist "frontend" (
    echo %RED%Error: Could not find frontend directory%RESET%
    echo Please run this batch file from the project root directory
    pause
    exit /b 1
)

:: Check for SSL certificates
if not exist "C:\Certbot\live\fxalert.co.uk\fullchain.pem" (
    echo %RED%Error: SSL certificates not found%RESET%
    echo Please ensure SSL certificates are installed at C:\Certbot\live\fxalert.co.uk\
    pause
    exit /b 1
)

:: Display startup message
echo %YELLOW%Starting Forex News Notifier Server...%RESET%
echo.
echo %GREEN%[✓]%RESET% Python detected
echo %GREEN%[✓]%RESET% Node.js detected
echo %GREEN%[✓]%RESET% Project files found
echo %GREEN%[✓]%RESET% SSL certificates found
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

:: Install required Python packages
echo %YELLOW%Installing/Updating Python packages...%RESET%
call venv\Scripts\activate && pip install waitress paste

:: Start Frontend Service Installation in a new window
start "Frontend Service Installation" cmd /c "color 0B && echo Installing Next.js Frontend Service... && powershell -ExecutionPolicy Bypass -NoExit -Command ""cd frontend; .\install-service.ps1; pause"""

:: Start Backend Service Installation in a new window
start "Backend Service Installation" cmd /c "color 0C && echo Installing Flask Backend Service... && powershell -ExecutionPolicy Bypass -NoExit -Command ""cd backend; .\install-service.ps1; pause"""

:: Start event scheduler in a new window
start "Event Scheduler" cmd /c "color 0A && echo Starting Event Scheduler... && call venv\Scripts\activate && python scripts\run_scheduler.py"

:: Start email scheduler in a new window
start "Email Scheduler" cmd /c "color 0E && echo Starting Email Scheduler... && call venv\Scripts\activate && python scripts\email_scheduler.py"

echo.
echo %GREEN%All components started in separate windows!%RESET%
echo %BLUE%Backend running on https://fxalert.co.uk:5000%RESET%
echo %BLUE%Frontend running on https://fxalert.co.uk:3000%RESET%
echo.
echo %YELLOW%Close this window to stop all services...%RESET%
pause > nul

:: Kill all the processes when the user closes the window
taskkill /F /FI "WINDOWTITLE eq Frontend Service Installation*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend Service Installation*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Event Scheduler*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Email Scheduler*" > nul 2>&1 