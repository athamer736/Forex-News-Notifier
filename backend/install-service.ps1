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
$gunicornScript = Join-Path $appDirectory "backend\run_gunicorn.py"

# Create Gunicorn script
$gunicornContent = @"
import os
import sys
from gunicorn.app.base import BaseApplication
from app import app

class GunicornApp(BaseApplication):
    def __init__(self, app, options=None):
        self.options = options or {}
        self.application = app
        super().__init__()

    def load_config(self):
        for key, value in self.options.items():
            self.cfg.set(key, value)

    def load(self):
        return self.application

if __name__ == '__main__':
    options = {
        'bind': '0.0.0.0:5000',
        'workers': 4,
        'certfile': 'C:/Certbot/live/fxalert.co.uk/fullchain.pem',
        'keyfile': 'C:/Certbot/live/fxalert.co.uk/privkey.pem',
        'accesslog': 'logs/gunicorn-access.log',
        'errorlog': 'logs/gunicorn-error.log',
        'capture_output': True,
        'ssl_version': 5,  # TLS
        'do_handshake_on_connect': False,
        'worker_class': 'sync'
    }
    GunicornApp(app, options).run()
"@

# Create the Gunicorn script file
New-Item -Path $gunicornScript -ItemType File -Force
Set-Content -Path $gunicornScript -Value $gunicornContent

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
& $nssm remove $serviceName confirm 2>$null

Write-Host "Installing new service..."
& $nssm install $serviceName $pythonExe

Write-Host "Configuring service..."
& $nssm set $serviceName AppDirectory $appDirectory
& $nssm set $serviceName AppParameters "$gunicornScript"
& $nssm set $serviceName DisplayName "Flask Backend Service"
& $nssm set $serviceName Description "Forex News Notifier Backend Service"
& $nssm set $serviceName Start SERVICE_AUTO_START
& $nssm set $serviceName ObjectName LocalSystem
& $nssm set $serviceName AppStdout "logs\flask-service-output.log"
& $nssm set $serviceName AppStderr "logs\flask-service-error.log"

# Set environment variables
$envString = "PATH=$env:PATH;$appDirectory\venv\Scripts;"
$envString += "PYTHONPATH=$appDirectory;"
$envString += "FLASK_ENV=production;"
$envString += "FLASK_APP=app.py;"
$envString += "SSL_CERT_FILE=C:/Certbot/live/fxalert.co.uk/fullchain.pem;"
$envString += "SSL_KEY_FILE=C:/Certbot/live/fxalert.co.uk/privkey.pem"

& $nssm set $serviceName AppEnvironmentExtra $envString

Write-Host "Starting service..."
& $nssm start $serviceName

Start-Sleep -Seconds 5
$service = Get-Service $serviceName
Write-Host "Service Status: $($service.Status)"

if ($service.Status -ne 'Running') {
    Write-Warning "Service is not running. Attempting to start again..."
    Stop-Service $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-Service $serviceName
    Start-Sleep -Seconds 5
    $service = Get-Service $serviceName
    Write-Host "Final Service Status: $($service.Status)"
}

Write-Host "Service installation complete. Check Windows Services to verify the service is running." 