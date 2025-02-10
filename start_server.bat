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

:: Start the server
echo %YELLOW%Starting server...%RESET%
echo %BLUE%Press Ctrl+C to stop the server%RESET%
echo.

:: Start the server with error handling
:start_server
python scripts\start_server.py
if %errorlevel% neq 0 (
    echo %RED%Server crashed or stopped unexpectedly%RESET%
    echo %YELLOW%Restarting in 5 seconds...%RESET%
    timeout /t 5 /nobreak > nul
    goto start_server
)

:: Deactivate virtual environment before exit
call venv\Scripts\deactivate.bat

pause 