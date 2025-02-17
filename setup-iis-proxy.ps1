# Requires -RunAsAdministrator

# Error handling and logging setup
$ErrorActionPreference = "Stop"
$logFile = "C:\iis-setup-log.txt"
Start-Transcript -Path $logFile -Append

try {
    Write-Host "Starting IIS setup script..." -ForegroundColor Cyan

    # Check if running as administrator
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        throw "This script must be run as Administrator. Please right-click and select 'Run as Administrator'."
    }

    # Check if IIS is installed
    Write-Host "Checking IIS installation..." -ForegroundColor Cyan
    $iisInstalled = Get-WindowsFeature -Name Web-Server
    if (-not $iisInstalled.Installed) {
        Write-Host "Installing IIS..." -ForegroundColor Yellow
        Install-WindowsFeature -Name Web-Server -IncludeManagementTools
    }

    # Install URL Rewrite Module if not present
    $urlRewriteDownloadUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
    $urlRewritePath = "$env:temp\rewrite_amd64_en-US.msi"

    Write-Host "Checking IIS Administration module..." -ForegroundColor Cyan
    if (!(Get-Module -ListAvailable -Name IISAdministration)) {
        Write-Host "Installing IIS Administration module..." -ForegroundColor Yellow
        Install-WindowsFeature -Name Web-Scripting-Tools
    }

    Import-Module IISAdministration -ErrorAction Stop
    Write-Host "IIS Administration module loaded successfully" -ForegroundColor Green

    # Check if URL Rewrite module is installed
    Write-Host "Checking URL Rewrite module..." -ForegroundColor Cyan
    if (!(Get-WebGlobalModule -Name "UrlRewrite" -ErrorAction SilentlyContinue)) {
        Write-Host "Downloading URL Rewrite Module..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $urlRewriteDownloadUrl -OutFile $urlRewritePath
        Write-Host "Installing URL Rewrite Module..." -ForegroundColor Yellow
        Start-Process msiexec.exe -ArgumentList "/i $urlRewritePath /quiet /norestart" -Wait
    }

    # Create the site directory if it doesn't exist
    $sitePath = "C:\inetpub\fxalert"
    Write-Host "Creating site directory at $sitePath..." -ForegroundColor Cyan
    if (!(Test-Path $sitePath)) {
        New-Item -ItemType Directory -Path $sitePath -Force
    }

    # Remove existing site if it exists
    Write-Host "Checking for existing site..." -ForegroundColor Cyan
    $site = Get-IISSite -Name "fxalert.co.uk" -ErrorAction SilentlyContinue
    if ($site) {
        Write-Host "Removing existing site..." -ForegroundColor Yellow
        Remove-IISSite -Name "fxalert.co.uk" -Confirm:$false
    }

    # Create new site
    Write-Host "Creating new IIS site..." -ForegroundColor Cyan
    New-IISSite -Name "fxalert.co.uk" -PhysicalPath $sitePath -BindingInformation "*:80:fxalert.co.uk"
    New-WebBinding -Name "fxalert.co.uk" -Protocol "https" -Port 443 -HostHeader "fxalert.co.uk" -SslFlags 1

    # Configure SSL
    Write-Host "Configuring SSL..." -ForegroundColor Cyan
    $cert = Get-ChildItem -Path "Cert:\LocalMachine\My" | Where-Object {$_.Subject -like "*fxalert.co.uk*"}
    if ($cert) {
        $hash = $cert.Thumbprint
        $binding = Get-WebBinding -Name "fxalert.co.uk" -Protocol "https"
        $binding.AddSslCertificate($hash, "my")
        Write-Host "SSL certificate configured successfully" -ForegroundColor Green
    } else {
        Write-Host "Warning: SSL certificate not found" -ForegroundColor Yellow
    }

    # Create and configure URL Rewrite rules
    Write-Host "Configuring URL Rewrite rules..." -ForegroundColor Cyan
    $config = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyToNextJS" stopProcessing="true">
                    <match url="(.*)" />
                    <conditions>
                        <add input="{HTTP_HOST}" pattern="^fxalert\.co\.uk$" />
                        <add input="{PATH_INFO}" pattern="^/api" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="http://localhost:3000/{R:1}" />
                </rule>
                <rule name="ReverseProxyToFlask" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:5000/{R:1}" />
                </rule>
            </rules>
        </rewrite>
        <security>
            <requestFiltering allowDoubleEscaping="true" />
        </security>
    </system.webServer>
</configuration>
"@

    Set-Content -Path "$sitePath\web.config" -Value $config
    Write-Host "URL Rewrite rules configured" -ForegroundColor Green

    # Install Application Request Routing
    Write-Host "Installing Application Request Routing..." -ForegroundColor Cyan
    try {
        Enable-WebGlobalModule -Name "ApplicationRequestRouting"
        Enable-WebGlobalModule -Name "UrlRewrite"
        Write-Host "Modules enabled successfully" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not enable some modules. You may need to install Application Request Routing manually." -ForegroundColor Yellow
        Write-Host "Download ARR from: https://www.microsoft.com/web/downloads/platform.aspx" -ForegroundColor Yellow
    }

    # Configure proxy settings
    Write-Host "Configuring proxy settings..." -ForegroundColor Cyan
    try {
        $adminConfig = Get-IISConfigSection -SectionPath "system.webServer/proxy"
        $adminConfig.SetAttributeValue("enabled", $true)
        Write-Host "Proxy settings configured successfully" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not configure proxy settings. You may need to install ARR first." -ForegroundColor Yellow
    }

    Write-Host "`nIIS configuration complete!" -ForegroundColor Green
    Write-Host "Please ensure your applications are running on:" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "Backend: http://localhost:5000" -ForegroundColor White
    Write-Host "The site should now be accessible at: https://fxalert.co.uk" -ForegroundColor White
    Write-Host "`nCheck the log file at $logFile for details" -ForegroundColor Cyan

} catch {
    Write-Host "`nAn error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nStack Trace:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    Write-Host "`nCheck the log file at $logFile for details" -ForegroundColor Yellow
} finally {
    Stop-Transcript
    Write-Host "`nPress any key to exit..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} 