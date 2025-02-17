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

:: Store the current directory
set "PROJECT_ROOT=%~dp0"
set "VENV_PATH=%PROJECT_ROOT%venv"
set "SCRIPTS_PATH=%PROJECT_ROOT%scripts"

echo %BLUE%=======================================
echo    Forex News Notifier Server Manager
echo =======================================%RESET%
echo.

:: Pause to show initial status
pause

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%Please run this script as Administrator%RESET%
    pause
    exit /b 1
)

:: Check if PowerShell 7 is installed
pwsh -Version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%Error: PowerShell 7 is not installed%RESET%
    echo Please install PowerShell 7 from: https://github.com/PowerShell/PowerShell/releases
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
if not exist "%PROJECT_ROOT%logs" mkdir "%PROJECT_ROOT%logs"

:: Check if we're in the right directory
if not exist "%PROJECT_ROOT%frontend" (
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
echo %GREEN%[✓]%RESET% PowerShell 7 detected
echo %GREEN%[✓]%RESET% Python detected
echo %GREEN%[✓]%RESET% Node.js detected
echo %GREEN%[✓]%RESET% Project files found
echo %GREEN%[✓]%RESET% SSL certificates found
echo.

:: Create and activate virtual environment if it doesn't exist
if not exist "%VENV_PATH%" (
    echo %YELLOW%Creating virtual environment...%RESET%
    python -m venv "%VENV_PATH%"
    if %errorlevel% neq 0 (
        echo %RED%Error creating virtual environment%RESET%
        pause
        exit /b 1
    )
)

:: Install required Python packages with better error handling
echo %YELLOW%Installing/Updating Python packages...%RESET%
call "%VENV_PATH%\Scripts\activate.bat"
if %errorlevel% neq 0 (
    echo %RED%Error activating virtual environment%RESET%
    echo Current directory: %CD%
    echo Virtual environment path: %VENV_PATH%
    pause
    exit /b 1
)

:: First, ensure pip is up to date
python -m pip install --upgrade pip
if %errorlevel% neq 0 (
    echo %RED%Error upgrading pip%RESET%
    pause
    exit /b 1
)

:: Install packages that don't require compilation first
echo Installing core packages...
pip install --no-deps ^
    flask==3.0.2 ^
    flask-cors==5.0.0 ^
    waitress==2.1.2 ^
    requests==2.31.0 ^
    httpx==0.27.0 ^
    pywin32==308 ^
    pyOpenSSL==24.0.0 ^
    certifi==2024.2.2
if %errorlevel% neq 0 (
    echo %RED%Error installing core packages%RESET%
    pause
    exit /b 1
)

:: Then install remaining requirements without dependencies
echo Installing remaining requirements...
pip install -r requirements.txt --no-deps --no-build-isolation
if %errorlevel% neq 0 (
    echo %YELLOW%Some packages failed to install, but we can continue%RESET%
    echo Please check the error messages above
    pause
)

:: Verify critical packages individually
echo Verifying critical packages...
set "VERIFIED=true"

python -c "import flask" 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: Flask is not properly installed%RESET%
    set "VERIFIED=false"
)

python -c "import waitress" 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: Waitress is not properly installed%RESET%
    set "VERIFIED=false"
)

python -c "import win32api" 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: pywin32 is not properly installed%RESET%
    set "VERIFIED=false"
)

if "%VERIFIED%"=="false" (
    echo %RED%One or more critical packages failed verification%RESET%
    echo Please check the error messages above
    pause
    exit /b 1
)

echo %GREEN%Python packages installed and verified successfully%RESET%
echo.

:: Start Backend Service Configuration in a new PowerShell 7 window
echo %YELLOW%Configuring and starting backend service...%RESET%
start "Backend Service Configuration" pwsh -NoExit -Command "^
    $ErrorActionPreference = 'Stop';^
    try {^
        $host.ui.RawUI.WindowTitle = 'Backend Service Configuration';^
        Write-Host 'Configuring Flask Backend Service...' -ForegroundColor Cyan;^
        Set-Location -Path '%PROJECT_ROOT%';^
        & '%VENV_PATH%\Scripts\activate.ps1';^
        python app.py;^
    } catch {^
        Write-Host 'Error: ' $_.Exception.Message -ForegroundColor Red;^
        Read-Host 'Press Enter to exit';^
        exit 1;^
    }"

:: Wait for backend to start
echo %YELLOW%Waiting for backend service to initialize...%RESET%
timeout /t 10 /nobreak > nul

:: Start Frontend Build and Server in a new PowerShell 7 window
echo %YELLOW%Building and starting frontend...%RESET%
start "Frontend Server" pwsh -NoExit -Command "^
    $ErrorActionPreference = 'Stop';^
    try {^
        $host.ui.RawUI.WindowTitle = 'Frontend Server';^
        Set-Location -Path '%PROJECT_ROOT%frontend';^
        Write-Host 'Building frontend...' -ForegroundColor Cyan;^
        npm run build;^
        Write-Host 'Starting frontend server...' -ForegroundColor Cyan;^
        npm run start;^
    } catch {^
        Write-Host 'Error: ' $_.Exception.Message -ForegroundColor Red;^
        Read-Host 'Press Enter to exit';^
        exit 1;^
    }"

:: Start Event Scheduler in a new CMD window
echo %YELLOW%Starting event scheduler...%RESET%
start "Event Scheduler" cmd /k "cd /d %PROJECT_ROOT% && call %VENV_PATH%\Scripts\activate.bat && python %SCRIPTS_PATH%\run_scheduler.py"

:: Start AI Summary Generator in a new CMD window
echo %YELLOW%Starting AI summary generator...%RESET%
start "AI Summary Generator" cmd /k "cd /d %PROJECT_ROOT% && call %VENV_PATH%\Scripts\activate.bat && python %SCRIPTS_PATH%\generate_summaries.py && timeout /t 3600 /nobreak && exit"

:: Start Email Scheduler in a new CMD window
echo %YELLOW%Starting email scheduler...%RESET%
start "Email Scheduler" cmd /k "cd /d %PROJECT_ROOT% && call %VENV_PATH%\Scripts\activate.bat && python %SCRIPTS_PATH%\email_scheduler.py"

echo.
echo %GREEN%All components started in separate windows!%RESET%
echo %BLUE%Backend running on https://fxalert.co.uk:5000%RESET%
echo %BLUE%Frontend running on https://fxalert.co.uk:3000%RESET%
echo.

:: Final pause to keep the window open
echo %YELLOW%Press any key to stop all services...%RESET%
pause > nul

:: Kill all the processes when the user closes the window
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend Service Configuration*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend Connectivity Test*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Event Scheduler*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq AI Summary Generator*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Email Scheduler*" > nul 2>&1

:: Final pause to show any cleanup messages
pause 