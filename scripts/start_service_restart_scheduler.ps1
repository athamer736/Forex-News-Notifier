# Start the service restart scheduler
Write-Host "Starting the Flask Service Restart scheduler..." -ForegroundColor Cyan

# Get current script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Split-Path -Parent $scriptPath

# Python executable path
$pythonPath = "python"

# Full path to scheduler script
$schedulerScript = Join-Path -Path $scriptPath -ChildPath "service_restart_scheduler.py"

# Check if the script exists
if (-not (Test-Path -Path $schedulerScript)) {
    Write-Host "Error: Service restart scheduler script not found at $schedulerScript" -ForegroundColor Red
    exit 1
}

# Start the scheduler in a new window
try {
    Start-Process -FilePath $pythonPath -ArgumentList $schedulerScript -WindowStyle Normal
    Write-Host "Service restart scheduler started successfully!" -ForegroundColor Green
    Write-Host "The scheduler will automatically restart the Flask backend service every 12 hours."
    Write-Host "Logs will be available in logs/service_restart_scheduler.log"
} catch {
    Write-Host "Error starting service restart scheduler: $_" -ForegroundColor Red
    exit 1
} 