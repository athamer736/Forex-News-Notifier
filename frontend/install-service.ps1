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
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
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
        
        $nssmFile = Get-ChildItem -Path $tempDir -Recurse -Filter "nssm.exe" | 
                    Where-Object { $_.FullName -like "*win64*" } | 
                    Select-Object -First 1

        if ($nssmFile) {
            Copy-Item -Path $nssmFile.FullName -Destination $nssmPath -Force
            Write-Host "NSSM installed successfully"
        } else {
            throw "Could not find nssm.exe in the downloaded package"
        }

        Remove-Item -Path $nssmZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Error "Failed to download/install NSSM: $_"
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

# Test NSSM by checking its version
try {
    $nssmVersion = & $nssm version 2>&1
    Write-Host "NSSM version check successful"
} catch {
    Write-Error "NSSM test failed - could not execute NSSM: $_"
    exit 1
}

Write-Host "Stopping and removing existing service if it exists..."
& $nssm stop $serviceName 2>$null
& $nssm remove $serviceName confirm 2>$null

Write-Host "Installing new service..."
& $nssm install $serviceName $nodeExe

Write-Host "Installing dependencies and building the application..."
Set-Location $appDirectory

# Copy .env.local from root directory if it exists
Write-Host "Copying environment file..."
$rootEnvFile = "C:\FlaskApps\forex_news_notifier\.env.local"
if (Test-Path $rootEnvFile) {
    Copy-Item $rootEnvFile -Destination ".env.local" -Force
    Write-Host "Environment file copied successfully"
} else {
    Write-Error "Could not find .env.local in root directory"
    exit 1
}

# Load environment variables from .env.local
$envContent = Get-Content ".env.local"
$envString = "NODE_ENV=production;"
$envString += "NODE_TLS_REJECT_UNAUTHORIZED=1;"

foreach ($line in $envContent) {
    if ($line -match '^\s*([^#][^=]+)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($key -ne "NODE_TLS_REJECT_UNAUTHORIZED") {
            $envString += "$key=$value;"
        }
    }
}

Write-Host "Setting environment variables for the service..."
& $nssm set $serviceName AppEnvironmentExtra $envString

Write-Host "Cleaning previous build..."
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
}
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
}

Write-Host "Installing dependencies..."
try {
    # First, clear npm cache
    npm cache clean --force
    
    # Install dependencies with legacy peer deps to avoid conflicts
    $env:NODE_ENV = "development"
    npm install --legacy-peer-deps --no-audit
    
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
} catch {
    Write-Error "Failed to install dependencies: $_"
    exit 1
}

Write-Host "Building application..."
try {
    $env:NODE_ENV = "production"
    # Use the full path to next
    $nextBin = Join-Path $appDirectory "node_modules\.bin\next"
    & $nextBin build

    if (-not (Test-Path ".next")) {
        throw "Build failed - .next directory not created"
    }
} catch {
    Write-Error "Build failed: $_"
    exit 1
}

Write-Host "Configuring service..."
& $nssm set $serviceName AppParameters ".\node_modules\next\dist\bin\next start -p 3000"
& $nssm set $serviceName AppDirectory $appDirectory
& $nssm set $serviceName DisplayName "Next.js Frontend Service"
& $nssm set $serviceName Description "Forex News Notifier Frontend Service"
& $nssm set $serviceName Start SERVICE_AUTO_START
& $nssm set $serviceName ObjectName LocalSystem
& $nssm set $serviceName AppStdout "$appDirectory\logs\service-output.log"
& $nssm set $serviceName AppStderr "$appDirectory\logs\service-error.log"

Write-Host "Creating log directory..."
New-Item -ItemType Directory -Force -Path "$appDirectory\logs" | Out-Null

Write-Host "Starting service..."
& $nssm stop $serviceName 2>$null
Start-Sleep -Seconds 2
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
Write-Host "Log files can be found at: $appDirectory\logs\" 