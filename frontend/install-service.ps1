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
Start-Sleep -Seconds 2
& $nssm remove $serviceName confirm 2>$null
Start-Sleep -Seconds 2

Write-Host "Installing dependencies and building the application..."
Set-Location $appDirectory

# Check for environment files
Write-Host "Checking environment files..."
$frontendEnvFile = Join-Path $appDirectory ".env"
$rootEnvFile = "C:\FlaskApps\forex_news_notifier\.env"

# Prioritize frontend .env file
if (Test-Path $frontendEnvFile) {
    Write-Host "Using existing frontend environment file"
} elseif (Test-Path $rootEnvFile) {
    Write-Host "Copying root environment file..."
    Copy-Item $rootEnvFile -Destination $frontendEnvFile -Force
    Write-Host "Environment file copied successfully"
} else {
    Write-Error "Could not find any .env file"
    exit 1
}

# Load environment variables from .env
$envContent = Get-Content $frontendEnvFile
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
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed with exit code $LASTEXITCODE"
    }

    if (-not (Test-Path ".next")) {
        throw "Build failed - .next directory not created"
    }
    
    Write-Host "Build completed successfully"
} catch {
    Write-Error "Build failed: $_"
    exit 1
}

Write-Host "Creating log directory..."
New-Item -ItemType Directory -Force -Path "$appDirectory\logs" | Out-Null

Write-Host "Installing service..."
& $nssm install $serviceName $nodeExe
& $nssm set $serviceName AppDirectory $appDirectory
& $nssm set $serviceName AppParameters ".\node_modules\next\dist\bin\next start -p 3000"
& $nssm set $serviceName DisplayName "Next.js Frontend Service"
& $nssm set $serviceName Description "Forex News Notifier Frontend Service"
& $nssm set $serviceName Start SERVICE_AUTO_START
& $nssm set $serviceName AppEnvironmentExtra $envString
& $nssm set $serviceName AppStdout "$appDirectory\logs\service-output.log"
& $nssm set $serviceName AppStderr "$appDirectory\logs\service-error.log"
& $nssm set $serviceName AppRotateFiles 1
& $nssm set $serviceName AppRotateOnline 1
& $nssm set $serviceName AppRotateSeconds 86400
& $nssm set $serviceName AppRotateBytes 10485760
& $nssm set $serviceName AppThrottle 0
& $nssm set $serviceName DependOnService "FlaskBackend"

Write-Host "Starting service..."
& $nssm start $serviceName

# Wait for service to start and verify its status
$maxAttempts = 5
$attempt = 0
$serviceStarted = $false

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 5
    $service = Get-Service $serviceName
    Write-Host "Service Status: $($service.Status)"
    
    if ($service.Status -eq 'Running') {
        $serviceStarted = $true
        break
    }
    
    if ($service.Status -eq 'Paused') {
        Write-Host "Service is paused, attempting to resume..."
        Resume-Service $serviceName
    } elseif ($service.Status -ne 'Running') {
        Write-Host "Attempting to start service again..."
        & $nssm restart $serviceName
    }
    
    $attempt++
}

if (-not $serviceStarted) {
    Write-Host "Service failed to start after $maxAttempts attempts. Checking error logs..."
    if (Test-Path "$appDirectory\logs\service-error.log") {
        Write-Host "Error log contents:"
        Get-Content "$appDirectory\logs\service-error.log" -Tail 20
    }
    Write-Error "Service failed to start properly"
    exit 1
}

Write-Host "Service installation complete. Check Windows Services to verify the service is running."
Write-Host "Log files can be found at: $appDirectory\logs\" 