# Import required module
Import-Module WebAdministration

$siteName = "ForexNewsNotifier"

Write-Host "Configuring and starting website: $siteName"
Write-Host "======================================"

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

# Reset IIS
Write-Host "Resetting IIS..."
try {
    iisreset /stop
    Start-Sleep -Seconds 5
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

# Verify the website exists
Write-Host "`nChecking website configuration..."
$site = Get-Website -Name $siteName
if (-not $site) {
    Write-Host "Website not found. Creating new website..." -ForegroundColor Yellow
    New-Website -Name $siteName -PhysicalPath "C:\FlaskApps\forex_news_notifier\frontend" -ApplicationPool $siteName -Force
}

# Configure website settings
Write-Host "Configuring website settings..."
Set-ItemProperty "IIS:\Sites\$siteName" -name "applicationPool" -value $siteName
Set-ItemProperty "IIS:\Sites\$siteName" -name "serverAutoStart" -value $true

# Verify physical path exists and set permissions
$physicalPath = "C:\FlaskApps\forex_news_notifier\frontend"
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