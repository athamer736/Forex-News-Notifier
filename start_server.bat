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
echo %GREEN%[✓]%RESET% PowerShell 7 detected
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
call venv\Scripts\activate && pip install -r requirements.txt

:: Start Backend Service Configuration in a new PowerShell 7 window
echo %YELLOW%Configuring and starting backend service...%RESET%
start "Backend Service Configuration" pwsh -NoExit -Command "^
    $host.ui.RawUI.WindowTitle = 'Backend Service Configuration';^
    Write-Host 'Configuring Flask Backend Service...' -ForegroundColor Cyan;^
    Stop-Service FlaskBackend -Force;^
    Start-Sleep -Seconds 2;^
    C:\nssm\win64\nssm.exe set FlaskBackend AppParameters 'C:\FlaskApps\forex_news_notifier\backend\run_waitress.py';^
    Start-Sleep -Seconds 2;^
    Start-Service FlaskBackend;^
    Start-Sleep -Seconds 5;^
    Get-Service FlaskBackend | Format-List Name, Status;^
    Write-Host 'Backend service configured and started' -ForegroundColor Green;^
    while ($true) {^
        Get-Service FlaskBackend | Format-List Name, Status;^
        Start-Sleep -Seconds 30^
    }"

:: Wait for backend to start
echo %YELLOW%Waiting for backend service to initialize...%RESET%
timeout /t 10 /nobreak > nul

:: Start Frontend Build and Server in a new PowerShell 7 window
echo %YELLOW%Building and starting frontend...%RESET%
start "Frontend Server" pwsh -NoExit -Command "^
    $host.ui.RawUI.WindowTitle = 'Frontend Server';^
    Set-Location -Path frontend;^
    Write-Host 'Building frontend...' -ForegroundColor Cyan;^
    npm run build;^
    Write-Host 'Starting frontend server...' -ForegroundColor Cyan;^
    npm run start"

:: Start Event Scheduler in a new PowerShell 7 window
echo %YELLOW%Starting event scheduler...%RESET%
start "Event Scheduler" pwsh -NoExit -Command "^
    $host.ui.RawUI.WindowTitle = 'Event Scheduler';^
    Write-Host 'Starting Event Scheduler...' -ForegroundColor Yellow;^
    Set-Location -Path '%~dp0';^
    .\venv\Scripts\activate;^
    python scripts\run_scheduler.py;^
    while ($true) {^
        if ($LASTEXITCODE -ne 0) {^
            Write-Host 'Event Scheduler crashed, restarting...' -ForegroundColor Red;^
            Start-Sleep -Seconds 5;^
            python scripts\run_scheduler.py;^
        }^
    }"

:: Start AI Summary Generator in a new PowerShell 7 window
echo %YELLOW%Starting AI summary generator...%RESET%
start "AI Summary Generator" pwsh -NoExit -Command "^
    $host.ui.RawUI.WindowTitle = 'AI Summary Generator';^
    Write-Host 'Starting AI Summary Generator...' -ForegroundColor Magenta;^
    Set-Location -Path '%~dp0';^
    .\venv\Scripts\activate;^
    while ($true) {^
        Write-Host (Get-Date) 'Running AI summary generation...' -ForegroundColor Cyan;^
        python scripts\generate_summaries.py;^
        Write-Host 'Waiting for next run cycle (1 hour)...' -ForegroundColor Yellow;^
        Start-Sleep -Seconds 3600;^
    }"

:: Start Email Scheduler in a new PowerShell 7 window
echo %YELLOW%Starting email scheduler...%RESET%
start "Email Scheduler" pwsh -NoExit -Command "^
    $host.ui.RawUI.WindowTitle = 'Email Scheduler';^
    Write-Host 'Starting Email Scheduler...' -ForegroundColor Blue;^
    Set-Location -Path '%~dp0';^
    .\venv\Scripts\activate;^
    python scripts\email_scheduler.py;^
    while ($true) {^
        if ($LASTEXITCODE -ne 0) {^
            Write-Host 'Email Scheduler crashed, restarting...' -ForegroundColor Red;^
            Start-Sleep -Seconds 5;^
            python scripts\email_scheduler.py;^
        }^
    }"

:: Test backend connectivity in a new PowerShell 7 window
echo %YELLOW%Testing backend connectivity...%RESET%
start "Backend Test" pwsh -NoExit -Command "^
    $host.ui.RawUI.WindowTitle = 'Backend Connectivity Test';^
    Write-Host 'Testing backend connectivity...' -ForegroundColor Cyan;^
    while ($true) {^
        try {^
            $ProgressPreference = 'SilentlyContinue';^
            $response = Invoke-WebRequest -Uri 'https://fxalert.co.uk:5000/cache/status' -Method GET -UseBasicParsing;^
            Write-Host (Get-Date) 'Backend is accessible. Status:' $response.StatusCode -ForegroundColor Green;^
        } catch {^
            Write-Host (Get-Date) 'Backend is not accessible:' $_.Exception.Message -ForegroundColor Red;^
        }^
        Start-Sleep -Seconds 30^
    }"

echo.
echo %GREEN%All components started in separate windows!%RESET%
echo %BLUE%Backend running on https://fxalert.co.uk:5000%RESET%
echo %BLUE%Frontend running on https://fxalert.co.uk:3000%RESET%
echo.
echo %YELLOW%Services Status:%RESET%
pwsh -Command "Get-Service FlaskBackend | Format-List Name, Status, StartType"
echo.
echo %YELLOW%Close this window to stop all services...%RESET%
pause > nul

:: Kill all the processes when the user closes the window
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend Service Configuration*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend Connectivity Test*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Event Scheduler*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq AI Summary Generator*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Email Scheduler*" > nul 2>&1 