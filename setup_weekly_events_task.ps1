# PowerShell script to create a scheduled task for refreshing weekly events

# Get the current directory where the script is located
$scriptPath = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$batchFilePath = Join-Path -Path $scriptPath -ChildPath "refresh_weekly_events.bat"

# Check if the batch file exists
if (-not (Test-Path $batchFilePath)) {
    Write-Error "Batch file not found at: $batchFilePath"
    exit 1
}

# Task name
$taskName = "ForexNewsRefreshWeeklyEvents"
$taskDescription = "Refresh Forex News Weekly Event Files from Database"

# Schedule the task to run daily at 1:00 AM
$trigger = New-ScheduledTaskTrigger -Daily -At "01:00"

# Create the action to run the batch file
$action = New-ScheduledTaskAction -Execute $batchFilePath

# Set the principal to run with highest privileges
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Create the task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -WakeToRun

# Check if the task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    # Update the existing task
    Write-Host "Updating existing task: $taskName"
    Set-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Principal $principal -Settings $settings -Description $taskDescription
} else {
    # Register a new task
    Write-Host "Creating new task: $taskName"
    Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Principal $principal -Settings $settings -Description $taskDescription
}

Write-Host "Task scheduled successfully!"
Write-Host "The weekly events will be refreshed daily at 1:00 AM." 