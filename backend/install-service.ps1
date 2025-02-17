# First, ensure NSSM directory exists and download if necessary
if (-not (Test-Path "C:\nssm\win64\nssm.exe")) {
    Write-Host "NSSM not found. Downloading and installing NSSM..."
    
    # Create NSSM directory
    New-Item -ItemType Directory -Path "C:\nssm\win64" -Force | Out-Null

    # Download pre-compiled NSSM executable
    $nssmUrl = "https://archive.org/download/nssm-2.24/nssm-2.24.zip"
    $nssmZip = "$env:TEMP\nssm.zip"
    $nssmPath = "C:\nssm\win64\nssm.exe"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "PowerShell Script")
        $webClient.DownloadFile($nssmUrl, $nssmZip)
        
        Write-Host "Extracting NSSM..."
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $tempDir = "$env:TEMP\nssm-extract"
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }
        [System.IO.Compression.ZipFile]::ExtractToDirectory($nssmZip, $tempDir)
        
        $nssmFile = Get-ChildItem -Path $tempDir -Recurse -Filter "nssm.exe" | 
                    Where-Object { $_.FullName -like "*win64*" } | 
                    Select-Object -First 1

        Copy-Item -Path $nssmFile.FullName -Destination $nssmPath -Force
        Write-Host "NSSM installed successfully"

        Remove-Item -Path $nssmZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Error "Failed to download/install NSSM: $_"
        exit 1
    }
}

$serviceName = "FlaskBackend"
$nssm = "C:\nssm\win64\nssm.exe"
$pythonExe = "C:\FlaskApps\forex_news_notifier\venv\Scripts\python.exe"
$appDirectory = "C:\FlaskApps\forex_news_notifier"
$appScript = Join-Path $appDirectory "app.py"

# Ensure logs directory exists
$logsDir = Join-Path $appDirectory "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

Write-Host "Installing required Python packages..."
$pipCmd = Join-Path (Split-Path $pythonExe) "pip.exe"
& $pipCmd install -r requirements.txt

Write-Host "NSSM found at $nssm"

# Test NSSM
try {
    $nssmVersion = & $nssm version 2>&1
    Write-Host "NSSM version check successful"
} catch {
    Write-Error "NSSM test failed: $_"
    exit 1
}

Write-Host "Stopping and removing existing service if it exists..."
& $nssm stop $serviceName 2>$null
Start-Sleep -Seconds 2
& $nssm remove $serviceName confirm 2>$null
Start-Sleep -Seconds 2

Write-Host "Installing new service..."
& $nssm install $serviceName $pythonExe

Write-Host "Configuring service..."
& $nssm set $serviceName AppDirectory $appDirectory
& $nssm set $serviceName AppParameters "$appScript"
& $nssm set $serviceName DisplayName "Flask Backend Service"
& $nssm set $serviceName Description "Forex News Notifier Backend Service"
& $nssm set $serviceName Start SERVICE_AUTO_START
& $nssm set $serviceName ObjectName "LocalSystem"
& $nssm set $serviceName AppStdout "$logsDir\flask-service-output.log"
& $nssm set $serviceName AppStderr "$logsDir\flask-service-error.log"
& $nssm set $serviceName AppThrottle 0
& $nssm set $serviceName AppRotateFiles 1
& $nssm set $serviceName AppRotateOnline 1
& $nssm set $serviceName AppRotateSeconds 86400
& $nssm set $serviceName AppRotateBytes 10485760

# Set environment variables
$envString = "PATH=$env:PATH;$appDirectory\venv\Scripts;"
$envString += "PYTHONPATH=$appDirectory;"
$envString += "FLASK_ENV=production;"
$envString += "FLASK_APP=app.py;"
$envString += "SSL_CERT_FILE=C:/Certbot/live/fxalert.co.uk/fullchain.pem;"
$envString += "SSL_KEY_FILE=C:/Certbot/live/fxalert.co.uk/privkey.pem;"
$envString += "PYTHONUNBUFFERED=1;"
$envString += "FLASK_DEBUG=0;"
$envString += "PORT=5000"

& $nssm set $serviceName AppEnvironmentExtra $envString

Write-Host "Starting service..."
& $nssm start $serviceName

Start-Sleep -Seconds 5
$service = Get-Service $serviceName
Write-Host "Service Status: $($service.Status)"

if ($service.Status -ne 'Running') {
    Write-Warning "Service is not running. Checking error logs..."
    if (Test-Path "$logsDir\flask-service-error.log") {
        Write-Host "Error log contents:"
        Get-Content "$logsDir\flask-service-error.log" -Tail 20
    }
    
    Write-Warning "Attempting to start again with more delay..."
    Stop-Service $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
    Start-Service $serviceName
    Start-Sleep -Seconds 10
    $service = Get-Service $serviceName
    Write-Host "Final Service Status: $($service.Status)"
    
    if ($service.Status -ne 'Running') {
        Write-Error "Failed to start service. Please check the logs in the logs directory."
    }
}

Write-Host "`nService installation complete. Check logs at:"
Write-Host "Output Log: $logsDir\flask-service-output.log"
Write-Host "Error Log: $logsDir\flask-service-error.log" 