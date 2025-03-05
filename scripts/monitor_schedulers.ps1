# PowerShell script to monitor and restart schedulers if they stop running
param(
    [int]$checkIntervalMinutes = 10,  # How often to check (in minutes)
    [switch]$verbose = $false  # Enable verbose logging
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Split-Path -Parent $scriptPath
$logPath = Join-Path -Path $rootPath -ChildPath "logs\scheduler_monitor.log"

# Create log directory if it doesn't exist
$logDir = Split-Path -Parent $logPath
if (!(Test-Path -Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log {
    param(
        [string]$message,
        [string]$level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - [$level] - $message"
    
    # Write to console
    if ($level -eq "ERROR") {
        Write-Host $logMessage -ForegroundColor Red
    } elseif ($level -eq "WARNING") {
        Write-Host $logMessage -ForegroundColor Yellow
    } elseif ($level -eq "SUCCESS") {
        Write-Host $logMessage -ForegroundColor Green
    } else {
        Write-Host $logMessage
    }
    
    # Write to log file
    Add-Content -Path $logPath -Value $logMessage
}

function Check-Process {
    param(
        [string]$scriptName,
        [string]$displayName
    )
    
    $isRunning = $false
    $pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
    
    foreach ($process in $pythonProcesses) {
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            if ($cmdLine -like "*$scriptName*") {
                if ($verbose) {
                    Write-Log "$displayName is running (PID: $($process.Id))" -level "INFO"
                }
                $isRunning = $true
                break
            }
        } catch {
            if ($verbose) {
                Write-Log "Error checking process $($process.Id): $($_.Exception.Message)" -level "ERROR"
            }
        }
    }
    
    return $isRunning
}

function Start-Scheduler {
    param(
        [string]$scriptPath,
        [string]$displayName
    )
    
    try {
        $fullScriptPath = Join-Path -Path $rootPath -ChildPath $scriptPath
        Write-Log "Starting $displayName ($fullScriptPath)" -level "INFO"
        
        # Start the process in a new window and don't wait
        Start-Process -FilePath "python" -ArgumentList $fullScriptPath -WindowStyle Minimized
        
        # Give it a moment to start
        Start-Sleep -Seconds 3
        
        # Check if it's running
        $scriptName = Split-Path -Leaf $scriptPath
        $isRunning = Check-Process -scriptName $scriptName -displayName $displayName
        
        if ($isRunning) {
            Write-Log "$displayName started successfully" -level "SUCCESS"
            return $true
        } else {
            Write-Log "Failed to start $displayName" -level "ERROR"
            return $false
        }
    } catch {
        Write-Log "Error starting $displayName: $_" -level "ERROR"
        return $false
    }
}

Write-Log "Scheduler monitor started. Checking every $checkIntervalMinutes minutes." -level "INFO"

while ($true) {
    try {
        # Check event scheduler
        $eventSchedulerRunning = Check-Process -scriptName "run_scheduler.py" -displayName "Event Scheduler"
        if (!$eventSchedulerRunning) {
            Write-Log "Event Scheduler is not running! Attempting to restart..." -level "WARNING"
            Start-Scheduler -scriptPath "scripts\run_scheduler.py" -displayName "Event Scheduler"
        }
        
        # Check email scheduler
        $emailSchedulerRunning = Check-Process -scriptName "email_scheduler.py" -displayName "Email Scheduler"
        if (!$emailSchedulerRunning) {
            Write-Log "Email Scheduler is not running! Attempting to restart..." -level "WARNING"
            Start-Scheduler -scriptPath "scripts\email_scheduler.py" -displayName "Email Scheduler"
        }
        
        # Check service restart scheduler
        $serviceRestartSchedulerRunning = Check-Process -scriptName "service_restart_scheduler.py" -displayName "Service Restart Scheduler"
        if (!$serviceRestartSchedulerRunning) {
            Write-Log "Service Restart Scheduler is not running! Attempting to restart..." -level "WARNING"
            Start-Scheduler -scriptPath "scripts\service_restart_scheduler.py" -displayName "Service Restart Scheduler"
        }
        
        if ($eventSchedulerRunning -and $emailSchedulerRunning -and $serviceRestartSchedulerRunning) {
            if ($verbose) {
                Write-Log "All schedulers are running correctly" -level "SUCCESS"
            }
        }
    } catch {
        Write-Log "Error in monitor loop: $_" -level "ERROR"
    }
    
    # Wait for the next check interval
    $checkIntervalSeconds = $checkIntervalMinutes * 60
    if ($verbose) {
        Write-Log "Sleeping for $checkIntervalMinutes minutes until next check" -level "INFO"
    }
    Start-Sleep -Seconds $checkIntervalSeconds
} 