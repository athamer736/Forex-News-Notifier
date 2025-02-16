# Import required modules
Import-Module WebAdministration

$siteName = "ForexNewsNotifier"
$physicalPath = "C:\FlaskApps\forex_news_notifier\frontend"
$backendPath = "C:\FlaskApps\forex_news_notifier"

Write-Host "Starting Forex News Notifier Services"
Write-Host "===================================="

# Function to check if a port is in use
function Test-PortInUse {
    param($port)
    $connections = netstat -ano | findstr ":$port "
    return $connections -ne $null
}

# Function to aggressively kill processes
function Stop-ProcessesAggressively {
    param($processNames)
    
    foreach ($procName in $processNames) {
        Write-Host "Stopping $procName processes..."
        Get-Process | Where-Object { $_.ProcessName -like $procName } | ForEach-Object {
            try {
                $_ | Stop-Process -Force -ErrorAction SilentlyContinue
                Write-Host "Stopped process $($_.Id)"
            } catch {
                Write-Host "Could not stop process $($_.Id): $_" -ForegroundColor Yellow
            }
        }
    }
}

# Function to kill process using a port
function Stop-ProcessUsingPort {
    param($port)
    
    $connections = netstat -ano | findstr ":$port "
    if ($connections) {
        $connections | ForEach-Object {
            $parts = $_ -split '\s+'
            $processId = $parts[-1]
            Write-Host "Stopping process $processId using port $port..."
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

# Stop all related processes
Write-Host "`nStopping all related processes..."
Stop-ProcessesAggressively @("w3wp", "node", "python", "flask", "waitress")
Start-Sleep -Seconds 5

# Check and release ports
$ports = @(80, 443, 3000, 5000)
Write-Host "`nChecking port usage..."
foreach ($port in $ports) {
    if (Test-PortInUse $port) {
        Write-Host "Port $port is in use. Attempting to release..." -ForegroundColor Yellow
        Stop-ProcessUsingPort $port
        Start-Sleep -Seconds 2
        
        # Double-check if port is still in use
        if (Test-PortInUse $port) {
            Write-Host "Port $port is still in use. Attempting forceful release..." -ForegroundColor Red
            # Use netsh to force release the port
            $null = netsh http delete urlacl url=http://+:$port/
            $null = netsh http delete urlacl url=https://+:$port/
            Start-Sleep -Seconds 2
        }
    } else {
        Write-Host "Port $port is available" -ForegroundColor Green
    }
}

# Start Backend Service
Write-Host "`nStarting Flask Backend Service..."
$backendService = Get-Service -Name "FlaskBackend" -ErrorAction SilentlyContinue
if ($backendService) {
    Write-Host "Stopping existing Flask Backend service..."
    Stop-Service -Name "FlaskBackend" -Force
    Start-Sleep -Seconds 2
}

Write-Host "Installing Flask Backend service..."
Set-Location $backendPath
& "$backendPath\backend\install-service.ps1"
Start-Sleep -Seconds 5

# Start Frontend Service
Write-Host "`nStarting Next.js Frontend Service..."
$frontendService = Get-Service -Name "NextJSFrontend" -ErrorAction SilentlyContinue
if ($frontendService) {
    Write-Host "Stopping existing Next.js Frontend service..."
    Stop-Service -Name "NextJSFrontend" -Force
    Start-Sleep -Seconds 2
}

Write-Host "Installing Next.js Frontend service..."
Set-Location $physicalPath
& "$physicalPath\install-service.ps1"
Start-Sleep -Seconds 5

# Stop IIS completely
Write-Host "`nStopping IIS completely..."
try {
    Stop-Service -Name W3SVC -Force
    Stop-Service -Name WAS -Force
    Start-Sleep -Seconds 5
    
    # Kill any remaining IIS-related processes
    Stop-ProcessesAggressively @("w3wp", "WAS", "WWAHost")
    Start-Sleep -Seconds 5
    
    # Clean up IIS temporary files
    Write-Host "Cleaning up IIS temporary files..."
    Remove-Item -Path "C:\inetpub\temp\IIS Temporary Compressed Files\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\Temporary ASP.NET Files\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "C:\Windows\Microsoft.NET\Framework\v4.0.30319\Temporary ASP.NET Files\*" -Recurse -Force -ErrorAction SilentlyContinue
    
    # Start IIS services
    Start-Service -Name WAS
    Start-Service -Name W3SVC
    Start-Sleep -Seconds 5
    
    Write-Host "IIS services restarted successfully" -ForegroundColor Green
} catch {
    Write-Host "Error managing IIS services: $_" -ForegroundColor Red
}

# Remove and recreate application pool
Write-Host "`nRecreating application pool..."
Remove-WebAppPool -Name $siteName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

New-WebAppPool -Name $siteName
Set-ItemProperty IIS:\AppPools\$siteName -name "managedRuntimeVersion" -value "v4.0"
Set-ItemProperty IIS:\AppPools\$siteName -name "managedPipelineMode" -value "Integrated"
Set-ItemProperty IIS:\AppPools\$siteName -name "startMode" -value "AlwaysRunning"
Set-ItemProperty IIS:\AppPools\$siteName -name "autoStart" -value $true
Set-ItemProperty IIS:\AppPools\$siteName -name "processModel.identityType" -value "LocalSystem"

# Start the application pool
Start-WebAppPool -Name $siteName
Start-Sleep -Seconds 5

# Remove and recreate website
Write-Host "`nRecreating website..."
Remove-Website -Name $siteName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Ensure physical path exists and set permissions
if (-not (Test-Path $physicalPath)) {
    New-Item -ItemType Directory -Path $physicalPath -Force | Out-Null
}

# Set directory permissions
Write-Host "Setting directory permissions..."
$acl = Get-Acl $physicalPath
$acl.SetAccessRuleProtection($true, $false)

$permissions = @(
    @{Identity = "SYSTEM"; Rights = "FullControl"},
    @{Identity = "Administrators"; Rights = "FullControl"},
    @{Identity = "IIS_IUSRS"; Rights = "FullControl"},
    @{Identity = "NETWORK SERVICE"; Rights = "FullControl"},
    @{Identity = "LOCAL SERVICE"; Rights = "FullControl"}
)

foreach ($perm in $permissions) {
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $perm.Identity,
        $perm.Rights,
        "ContainerInherit,ObjectInherit",
        "None",
        "Allow"
    )
    $acl.AddAccessRule($accessRule)
}

$acl | Set-Acl $physicalPath

# Create the website using appcmd
Write-Host "Creating website using appcmd..."
$appCmd = "$env:windir\system32\inetsrv\appcmd.exe"

& $appCmd add site /name:$siteName /physicalPath:$physicalPath /bindings:"http/*:80:fxalert.co.uk,http/*:80:www.fxalert.co.uk,https/*:443:fxalert.co.uk,https/*:443:www.fxalert.co.uk,https/*:3000:fxalert.co.uk,https/*:5000:fxalert.co.uk"
& $appCmd set site /site.name:$siteName /[path='/'].applicationPool:$siteName

# Configure SSL bindings
Write-Host "Configuring SSL bindings..."
$thumbprint = "AA79E98B5F0900A7B04586CF87126EE5F8695F0B"
$ports = @(443, 3000, 5000)

foreach ($port in $ports) {
    & "netsh" http delete sslcert ipport=0.0.0.0:$port
    & "netsh" http add sslcert ipport=0.0.0.0:$port certhash=$thumbprint appid="{$([Guid]::NewGuid().ToString())}" certstorename=MY
}

# Start the website
Write-Host "`nStarting website..."
Start-Website -Name $siteName

# Display current status
Write-Host "`nCurrent Status:"
Write-Host "---------------"

Write-Host "`nService Status:"
Get-Service -Name "FlaskBackend", "NextJSFrontend" | Format-Table Name, Status, StartType

Write-Host "`nApplication Pool Status:"
Get-IISAppPool -Name $siteName | Format-Table Name, State, ManagedRuntimeVersion, ManagedPipelineMode

Write-Host "`nWebsite Status:"
Get-Website -Name $siteName | Format-Table Name, State, PhysicalPath

Write-Host "`nBindings:"
Get-WebBinding -Name $siteName | Format-Table Protocol, bindingInformation

Write-Host "`nSSL Certificates:"
Get-ChildItem -Path IIS:\SslBindings | Format-Table Host, Port, Store, Thumbprint

# Test website accessibility
Write-Host "`nTesting website accessibility..."
$testUrls = @(
    "https://fxalert.co.uk",
    "https://fxalert.co.uk:3000",
    "https://fxalert.co.uk:5000"
)

foreach ($url in $testUrls) {
    try {
        $request = [System.Net.WebRequest]::Create($url)
        $request.Timeout = 10000
        $response = $request.GetResponse()
        Write-Host "$url is accessible" -ForegroundColor Green
        $response.Close()
    } catch {
        Write-Host "$url is not accessible: $_" -ForegroundColor Red
    }
}

Write-Host "`nSetup complete. Please check the services are running correctly." 