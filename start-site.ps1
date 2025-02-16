# Import required module
Import-Module WebAdministration

$siteName = "ForexNewsNotifier"

Write-Host "Configuring and starting website: $siteName"
Write-Host "======================================"

# Function to check if a port is in use
function Test-PortInUse {
    param($port)
    
    $connections = netstat -ano | findstr ":$port "
    return $connections -ne $null
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

# Check and release ports
$ports = @(80, 443, 3000, 5000)
Write-Host "`nChecking port usage..."
foreach ($port in $ports) {
    if (Test-PortInUse $port) {
        Write-Host "Port $port is in use. Attempting to release..." -ForegroundColor Yellow
        Stop-ProcessUsingPort $port
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Port $port is available" -ForegroundColor Green
    }
}

# Stop the site first if it exists
Write-Host "`nStopping website if it exists..."
Stop-Website -Name $siteName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Stop the application pool if it exists
Write-Host "Stopping application pool if it exists..."
if (Test-Path "IIS:\AppPools\$siteName") {
    Stop-WebAppPool -Name $siteName -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

# Stop any Node.js processes that might be running
Write-Host "Stopping any Node.js processes..."
Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Reset IIS with cleanup
Write-Host "Resetting IIS with cleanup..."
try {
    # Stop IIS
    iisreset /stop
    Start-Sleep -Seconds 5
    
    # Clean up IIS worker processes
    Get-Process | Where-Object { $_.ProcessName -like "w3wp*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Delete temporary IIS files
    Remove-Item -Path "C:\inetpub\temp\IIS Temporary Compressed Files\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\Temporary ASP.NET Files\*" -Recurse -Force -ErrorAction SilentlyContinue
    
    # Start IIS
    iisreset /start
    Start-Sleep -Seconds 5
    Write-Host "IIS reset completed" -ForegroundColor Green
} catch {
    Write-Host "Error resetting IIS: $_" -ForegroundColor Red
}

# Ensure the application pool exists and is configured correctly
Write-Host "`nChecking application pool..."
$pool = Get-IISAppPool -Name $siteName -ErrorAction SilentlyContinue
if (-not $pool) {
    Write-Host "Creating application pool..." -ForegroundColor Yellow
    New-WebAppPool -Name $siteName
    $pool = Get-IISAppPool -Name $siteName
}

# Configure application pool settings
Write-Host "Configuring application pool..."
Set-ItemProperty IIS:\AppPools\$siteName -name "managedRuntimeVersion" -value "v4.0"
Set-ItemProperty IIS:\AppPools\$siteName -name "managedPipelineMode" -value "Integrated"
Set-ItemProperty IIS:\AppPools\$siteName -name "startMode" -value "AlwaysRunning"
Set-ItemProperty IIS:\AppPools\$siteName -name "autoStart" -value $true
Set-ItemProperty IIS:\AppPools\$siteName -name "processModel.identityType" -value "LocalSystem"

# Start the application pool
Write-Host "Starting application pool..."
Start-WebAppPool -Name $siteName
Start-Sleep -Seconds 2

# Remove and recreate the website
Write-Host "`nRemoving existing website configuration..."
Remove-Website -Name $siteName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Creating new website..."
$physicalPath = "C:\FlaskApps\forex_news_notifier\frontend"
New-Website -Name $siteName -PhysicalPath $physicalPath -ApplicationPool $siteName -Force

# Configure website settings
Write-Host "Configuring website settings..."
Set-ItemProperty "IIS:\Sites\$siteName" -name "applicationPool" -value $siteName
Set-ItemProperty "IIS:\Sites\$siteName" -name "serverAutoStart" -value $true

# Verify physical path exists and set permissions
if (-not (Test-Path $physicalPath)) {
    Write-Host "Creating physical path directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $physicalPath -Force | Out-Null
}

# Set directory permissions
Write-Host "Setting directory permissions..."
$acl = Get-Acl $physicalPath
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($accessRule)
$acl | Set-Acl $physicalPath

# Also grant permissions to NETWORK SERVICE
$networkServiceRule = New-Object System.Security.AccessControl.FileSystemAccessRule("NETWORK SERVICE", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($networkServiceRule)
$acl | Set-Acl $physicalPath

# Create a test index.html if it doesn't exist
$indexPath = Join-Path $physicalPath "index.html"
if (-not (Test-Path $indexPath)) {
    Write-Host "Creating test index.html..." -ForegroundColor Yellow
    @"
<!DOCTYPE html>
<html>
<head>
    <title>ForexNewsNotifier Test Page</title>
</head>
<body>
    <h1>ForexNewsNotifier</h1>
    <p>If you can see this page, the web server is running correctly.</p>
    <p>Server Time: <script>document.write(new Date().toLocaleString())</script></p>
</body>
</html>
"@ | Out-File -FilePath $indexPath -Encoding UTF8
}

# Add bindings
Write-Host "`nConfiguring bindings..."
New-WebBinding -Name $siteName -Protocol "http" -Port 80 -HostHeader "fxalert.co.uk"
New-WebBinding -Name $siteName -Protocol "http" -Port 80 -HostHeader "www.fxalert.co.uk"
New-WebBinding -Name $siteName -Protocol "https" -Port 443 -HostHeader "fxalert.co.uk" -SslFlags 1
New-WebBinding -Name $siteName -Protocol "https" -Port 443 -HostHeader "www.fxalert.co.uk" -SslFlags 1
New-WebBinding -Name $siteName -Protocol "https" -Port 3000 -HostHeader "fxalert.co.uk" -SslFlags 1
New-WebBinding -Name $siteName -Protocol "https" -Port 5000 -HostHeader "fxalert.co.uk" -SslFlags 1

# Start the website with retry logic
Write-Host "`nStarting website..."
$maxRetries = 3
$retryCount = 0
$started = $false

while (-not $started -and $retryCount -lt $maxRetries) {
    try {
        $retryCount++
        Write-Host "Attempt $retryCount of $maxRetries..."
        Start-Website -Name $siteName
        Start-Sleep -Seconds 5  # Give it time to fully start
        $site = Get-Website -Name $siteName
        if ($site.State -eq "Started") {
            $started = $true
            Write-Host "Website started successfully" -ForegroundColor Green
        } else {
            throw "Website is in $($site.State) state"
        }
    } catch {
        Write-Host "Error starting website: $_" -ForegroundColor Red
        if ($retryCount -lt $maxRetries) {
            Write-Host "Waiting 5 seconds before retry..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
}

# Display current status
Write-Host "`nCurrent Status:"
Write-Host "---------------"
Write-Host "Application Pool Status:"
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