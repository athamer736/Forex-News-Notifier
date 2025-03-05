# PowerShell script to restart the Flask Backend service
Write-Host "Restarting Flask Backend service..." -ForegroundColor Cyan

try {
    # Stop the service
    Write-Host "Stopping FlaskBackend service..." -ForegroundColor Yellow
    Stop-Service FlaskBackend -Force
    Start-Sleep -Seconds 2
    
    # Update service parameters
    Write-Host "Updating service parameters..." -ForegroundColor Yellow
    & "C:\nssm\win64\nssm.exe" set FlaskBackend AppParameters "C:\FlaskApps\forex_news_notifier\backend\run_waitress.py"
    Start-Sleep -Seconds 2
    
    # Start the service
    Write-Host "Starting FlaskBackend service..." -ForegroundColor Yellow
    Start-Service FlaskBackend
    Start-Sleep -Seconds 5
    
    # Check service status
    Write-Host "Service status:" -ForegroundColor Cyan
    Get-Service FlaskBackend | Format-List Name, Status, StartType
    
    Write-Host "Service restart completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error restarting service: $_" -ForegroundColor Red
    exit 1
} 