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

:: Ask for mode
echo Choose startup mode:
echo 1) Development Mode (separate windows)
echo 2) Production Mode (Windows Services)
set /p mode="Enter choice (1 or 2): "

if "%mode%"=="2" (
    echo %YELLOW%Starting Production Mode (Windows Services)...%RESET%
    
    :: Start the Flask Backend Service
    echo %YELLOW%Starting Flask Backend Service...%RESET%
    net start FlaskBackend
    if %errorLevel% neq 0 (
        echo %RED%Failed to start Flask Backend Service%RESET%
        pause
        exit /b 1
    )

    :: Start the Next.js Frontend Service
    echo %YELLOW%Starting Next.js Frontend Service...%RESET%
    net start NextJSFrontend
    if %errorLevel% neq 0 (
        echo %RED%Failed to start Next.js Frontend Service%RESET%
        pause
        exit /b 1
    )

    echo.
    echo %GREEN%Services started successfully!%RESET%
    echo %BLUE%Backend running on https://localhost:5000%RESET%
    echo %BLUE%Frontend running on https://localhost:3000%RESET%
    echo.
    echo %YELLOW%Press any key to exit...%RESET%
    pause > nul
    exit /b 0
)

:: Development Mode - Keep existing functionality

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

:: Start the Flask Backend Service
echo %YELLOW%Starting Flask Backend Service...%RESET%
net start FlaskBackend
if %errorLevel% neq 0 (
    echo %RED%Failed to start Flask Backend Service%RESET%
    pause
    exit /b 1
)

:: Start the Next.js Frontend Service
echo %YELLOW%Starting Next.js Frontend Service...%RESET%
net start NextJSFrontend
if %errorLevel% neq 0 (
    echo %RED%Failed to start Next.js Frontend Service%RESET%
    pause
    exit /b 1
)

echo.
echo %GREEN%Services started successfully!%RESET%
echo %BLUE%Backend running on https://localhost:5000%RESET%
echo %BLUE%Frontend running on https://localhost:3000%RESET%
echo.
echo %YELLOW%Press any key to exit...%RESET%
pause > nul 