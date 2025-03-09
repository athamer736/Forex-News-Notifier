# Script to install the scheduler monitoring task in Windows Task Scheduler
# Must be run as administrator

param(
    [switch]$Uninstall = $false
)

$ErrorActionPreference = "Stop"
$taskName = "ForexNewsNotifier-SchedulerMonitor"
$taskPath = "\ForexNewsNotifier\"
$fullTaskName = "$taskPath$taskName"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Split-Path -Parent $scriptPath
$xmlPath = Join-Path -Path $scriptPath -ChildPath "schedulers_task.xml"
$monitorScriptPath = Join-Path -Path $scriptPath -ChildPath "monitor_schedulers.ps1"

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script must be run as Administrator. Please restart PowerShell as Administrator and try again." -ForegroundColor Red
    exit 1
}

# Check if the task XML file exists
if (-not (Test-Path -Path $xmlPath) -and -not $Uninstall) {
    Write-Host "Task XML file not found at: $xmlPath" -ForegroundColor Red
    exit 1
}

# Check if the monitor script exists
if (-not (Test-Path -Path $monitorScriptPath) -and -not $Uninstall) {
    Write-Host "Monitor script not found at: $monitorScriptPath" -ForegroundColor Red
    exit 1
}

try {
    # Uninstall existing task if it exists or if uninstall is requested
    $existingTask = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction SilentlyContinue
    
    if ($existingTask) {
        Write-Host "Removing existing task: $fullTaskName" -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $taskName -TaskPath $taskPath -Confirm:$false
        Write-Host "Existing task removed successfully" -ForegroundColor Green
    }
    
    if ($Uninstall) {
        Write-Host "Task uninstallation completed" -ForegroundColor Green
        exit 0
    }
    
    # Create the task folder if it doesn't exist
    $taskFolder = Get-ScheduledTaskFolder -TaskPath $taskPath -ErrorAction SilentlyContinue
    
    if (-not $taskFolder) {
        Write-Host "Creating task folder: $taskPath" -ForegroundColor Yellow
        # There's no direct cmdlet to create task folders, so we need to create a temporary task
        $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c exit"
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddYears(100)
        $settings = New-ScheduledTaskSettingsSet
        $task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings
        Register-ScheduledTask -TaskName "TempTask" -TaskPath $taskPath -InputObject $task
        Unregister-ScheduledTask -TaskName "TempTask" -TaskPath $taskPath -Confirm:$false
    }
    
    # Load the XML and update paths if needed
    $xml = Get-Content -Path $xmlPath -Raw
    $systemPwsh = "C:\Program Files\PowerShell\7\pwsh.exe"
    $windowsPwsh = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
    
    # Use Windows PowerShell if PowerShell 7 is not available
    if (-not (Test-Path -Path $systemPwsh)) {
        $xml = $xml -replace [regex]::Escape($systemPwsh), $windowsPwsh
    }
    
    # Update the working directory and script path in the XML
    $xml = $xml -replace "C:\\FlaskApps\\forex_news_notifier", $rootPath.Replace("\", "\\")
    
    # Save the modified XML
    $tempXmlPath = Join-Path -Path $env:TEMP -ChildPath "schedulers_task_modified.xml"
    $xml | Out-File -FilePath $tempXmlPath -Encoding unicode
    
    # Register the task
    Write-Host "Registering task: $fullTaskName" -ForegroundColor Yellow
    Register-ScheduledTask -TaskName $taskName -TaskPath $taskPath -Xml (Get-Content -Path $tempXmlPath -Raw) -Force
    
    # Clean up
    Remove-Item -Path $tempXmlPath -Force
    
    # Verify the task was created
    $newTask = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction SilentlyContinue
    
    if ($newTask) {
        Write-Host "Task registered successfully: $fullTaskName" -ForegroundColor Green
        
        # Start the task immediately
        Write-Host "Starting the task..." -ForegroundColor Yellow
        Start-ScheduledTask -TaskName $taskName -TaskPath $taskPath
        Write-Host "Task started" -ForegroundColor Green
    } else {
        Write-Host "Failed to register task" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 