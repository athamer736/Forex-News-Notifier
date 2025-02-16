# Import required module
Import-Module WebAdministration

$siteName = "ForexNewsNotifier"

Write-Host "Configuring and starting website: $siteName"
Write-Host "======================================"

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

# Start the application pool if it's not running
$pool = Get-IISAppPool -Name $siteName
if ($pool.State -ne "Started") {
    Write-Host "Starting application pool..." -ForegroundColor Yellow
    Start-WebAppPool -Name $siteName
}

# Verify the website exists
Write-Host "`nChecking website configuration..."
$site = Get-Website -Name $siteName
if (-not $site) {
    Write-Host "Website not found. Creating new website..." -ForegroundColor Yellow
    New-Website -Name $siteName -PhysicalPath "C:\FlaskApps\forex_news_notifier\frontend" -ApplicationPool $siteName
}

# Configure website settings
Write-Host "Configuring website settings..."
Set-ItemProperty "IIS:\Sites\$siteName" -name "applicationPool" -value $siteName
Set-ItemProperty "IIS:\Sites\$siteName" -name "serverAutoStart" -value $true

# Verify physical path exists
$physicalPath = "C:\FlaskApps\forex_news_notifier\frontend"
if (-not (Test-Path $physicalPath)) {
    Write-Host "Creating physical path directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $physicalPath -Force | Out-Null
}

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

# Start the website
Write-Host "`nStarting website..."
try {
    Start-Website -Name $siteName
    Write-Host "Website started successfully" -ForegroundColor Green
} catch {
    Write-Host "Error starting website: $_" -ForegroundColor Red
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