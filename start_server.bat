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

:: Start Frontend Service Installation in a new window
start "Frontend Service Installation" cmd /c "color 0B && echo Installing Next.js Frontend Service... && powershell -ExecutionPolicy Bypass -NoExit -Command ""cd frontend; .\install-service.ps1; pause"""

:: Start Flask backend in a new window
start "Flask Backend" cmd /c "color 09 && echo Starting Flask Backend... && call venv\Scripts\activate && python app.py"

:: Start event scheduler in a new window
start "Event Scheduler" cmd /c "color 0A && echo Starting Event Scheduler... && call venv\Scripts\activate && python scripts\run_scheduler.py"

:: Start email scheduler in a new window
start "Email Scheduler" cmd /c "color 0E && echo Starting Email Scheduler... && call venv\Scripts\activate && python scripts\email_scheduler.py"

:: Start frontend in production mode
start "Frontend Server" cmd /c "color 0D && echo Starting Frontend in Production Mode... && cd frontend && npm run build && echo Build complete, starting server... && npm run start && pause"

echo.
echo %GREEN%All components started in separate windows!%RESET%
echo %BLUE%Backend running on https://localhost:5000%RESET%
echo %BLUE%Frontend running on https://localhost:3000%RESET%
echo.
echo %YELLOW%Close this window to stop all services...%RESET%
pause > nul

:: Kill all the processes when the user closes the window
taskkill /F /FI "WINDOWTITLE eq Frontend Service Installation*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Flask Backend*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Event Scheduler*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Email Scheduler*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" > nul 2>&1 