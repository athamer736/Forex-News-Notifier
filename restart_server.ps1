# PowerShell script to restart the Waitress server
Write-Host "Stopping any running Python servers..."

# Find and stop any running Python processes that match the pattern
$processes = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*run_waitress.py*" }
if ($processes) {
    Write-Host "Found running server processes. Stopping them..."
    $processes | ForEach-Object { $_.Kill() }
    Write-Host "Server processes stopped."
    # Give processes time to fully terminate
    Start-Sleep -Seconds 2
} else {
    Write-Host "No running server processes found."
}

# Clear browser cache by opening a new InPrivate/Incognito window
Write-Host "Starting server with updated configuration..."
cd $PSScriptRoot
python backend/run_waitress.py

Write-Host "Server started. Open a new InPrivate/Incognito browser window to avoid cache issues." 