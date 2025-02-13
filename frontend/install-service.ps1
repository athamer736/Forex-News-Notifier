# First, ensure NSSM directory exists and download if necessary
if (-not (Test-Path "C:\nssm\win64\nssm.exe")) {
    Write-Host "NSSM not found. Downloading and installing NSSM..."
    
    # Create NSSM directory
    New-Item -ItemType Directory -Path "C:\nssm\win64" -Force | Out-Null

    # Download pre-compiled NSSM executable directly
    $nssmUrl = "https://archive.org/download/nssm-2.24/nssm-2.24.zip"
    $nssmZip = "$env:TEMP\nssm.zip"
    $nssmPath = "C:\nssm\win64\nssm.exe"

    Write-Host "Downloading NSSM from archive.org..."
    try {
        # Configure TLS and timeout
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        
        # Use System.Net.WebClient with increased timeout
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "PowerShell Script")
        $webClient.DownloadFile($nssmUrl, $nssmZip)
        
        if (-not (Test-Path $nssmZip)) {
            throw "Download failed - ZIP file not created"
        }
        
        Write-Host "Extracting NSSM..."
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $tempDir = "$env:TEMP\nssm-extract"
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        
        [System.IO.Compression.ZipFile]::ExtractToDirectory($nssmZip, $tempDir)
        
        # Find nssm.exe in the extracted files
        $nssmFile = Get-ChildItem -Path $tempDir -Recurse -Filter "nssm.exe" | 
                    Where-Object { $_.FullName -like "*win64*" } | 
                    Select-Object -First 1

        if ($nssmFile) {
            Copy-Item -Path $nssmFile.FullName -Destination $nssmPath -Force
            Write-Host "NSSM installed successfully"
        } else {
            throw "Could not find nssm.exe in the downloaded package"
        }

        # Clean up
        Remove-Item -Path $nssmZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Error "Failed to download/install NSSM: $_"
        Write-Host "`nPlease try manual installation:`n"
        Write-Host "1. Download NSSM from: https://nssm.cc/download"
        Write-Host "2. Extract the ZIP file"
        Write-Host "3. Copy the win64\nssm.exe file to: C:\nssm\win64\nssm.exe"
        Write-Host "4. Run this script again"
        exit 1
    }
}

$serviceName = "NextJSFrontend"
$nssm = "C:\nssm\win64\nssm.exe"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$appDirectory = "C:\FlaskApps\forex_news_notifier\frontend"

# Verify NSSM exists
if (-not (Test-Path $nssm)) {
    Write-Error "NSSM not found at $nssm. Installation failed."
    exit 1
}

Write-Host "NSSM found at $nssm"

# Test NSSM by checking its version - this is more reliable than help
try {
    $nssmVersion = & $nssm version 2>&1
    Write-Host "NSSM version check successful"
} catch {
    Write-Error "NSSM test failed - could not execute NSSM: $_"
    exit 1
}

Write-Host "Stopping and removing existing service if it exists..."
# Remove existing service if it exists (ignore errors if service doesn't exist)
& $nssm stop $serviceName 2>$null
& $nssm remove $serviceName confirm 2>$null

Write-Host "Installing new service..."
# Install new service
& $nssm install $serviceName $nodeExe

Write-Host "Installing dependencies and building the application..."
Set-Location $appDirectory
npm install
npm run build

Write-Host "Configuring service..."
& $nssm set $serviceName AppParameters ".\node_modules\next\dist\bin\next start -p 3000"
& $nssm set $serviceName AppDirectory $appDirectory
& $nssm set $serviceName DisplayName "Next.js Frontend Service"
& $nssm set $serviceName Description "Forex News Notifier Frontend Service"
& $nssm set $serviceName AppEnvironmentExtra "NODE_ENV=production"
& $nssm set $serviceName Start SERVICE_AUTO_START
& $nssm set $serviceName ObjectName LocalSystem  # Run as LocalSystem account
& $nssm set $serviceName AppStdout "$appDirectory\logs\service-output.log"
& $nssm set $serviceName AppStderr "$appDirectory\logs\service-error.log"

Write-Host "Creating log directory..."
New-Item -ItemType Directory -Force -Path "$appDirectory\logs" | Out-Null

Write-Host "Starting service..."
# Stop the service if it's running or paused
& $nssm stop $serviceName 2>$null
Start-Sleep -Seconds 2

# Start the service
& $nssm start $serviceName

# Wait a moment and verify the service status
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
Write-Host "Log files can be found at: $appDirectory\logs\" 