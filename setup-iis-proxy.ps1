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

    # Install IIS and required features
    Write-Host "Installing IIS and required features..." -ForegroundColor Cyan
    $features = @(
        "Web-Server",
        "Web-WebServer",
        "Web-Common-Http",
        "Web-Default-Doc",
        "Web-Dir-Browsing",
        "Web-Http-Errors",
        "Web-Static-Content",
        "Web-Http-Redirect",
        "Web-Health",
        "Web-Http-Logging",
        "Web-Custom-Logging",
        "Web-Log-Libraries",
        "Web-Request-Monitor",
        "Web-Http-Tracing",
        "Web-Performance",
        "Web-Stat-Compression",
        "Web-Dyn-Compression",
        "Web-Security",
        "Web-Filtering",
        "Web-Basic-Auth",
        "Web-Windows-Auth",
        "Web-App-Dev",
        "Web-Net-Ext45",
        "Web-ASP",
        "Web-Asp-Net45",
        "Web-ISAPI-Ext",
        "Web-ISAPI-Filter",
        "Web-Mgmt-Tools",
        "Web-Mgmt-Console",
        "Web-Scripting-Tools",
        "Web-Mgmt-Service"
    )

    foreach ($feature in $features) {
        Write-Host "Installing feature: $feature" -ForegroundColor Yellow
        try {
            $result = Enable-WindowsOptionalFeature -Online -FeatureName $feature -All -NoRestart
            if ($result.RestartNeeded) {
                Write-Host "Note: A system restart will be required after installation" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Warning: Could not install $feature. Continuing..." -ForegroundColor Yellow
        }
    }

    Write-Host "IIS features installation completed" -ForegroundColor Green

    # Install URL Rewrite Module if not present
    $urlRewriteDownloadUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
    $urlRewritePath = "$env:temp\rewrite_amd64_en-US.msi"

    Write-Host "Checking IIS Administration module..." -ForegroundColor Cyan
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

    # Download and install Application Request Routing
    Write-Host "Downloading Application Request Routing..." -ForegroundColor Cyan
    $arrDownloadUrl = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi"
    $arrPath = "$env:temp\requestRouter_amd64.msi"
    
    try {
        Invoke-WebRequest -Uri $arrDownloadUrl -OutFile $arrPath
        Write-Host "Installing Application Request Routing..." -ForegroundColor Yellow
        Start-Process msiexec.exe -ArgumentList "/i $arrPath /quiet /norestart" -Wait
    } catch {
        Write-Host "Warning: Could not install ARR automatically. Please install manually from:" -ForegroundColor Yellow
        Write-Host "https://www.microsoft.com/web/downloads/platform.aspx" -ForegroundColor Yellow
    }

    # Create the site directory if it doesn't exist
    $sitePath = "C:\inetpub\fxalert"
    Write-Host "Creating site directory at $sitePath..." -ForegroundColor Cyan
    if (!(Test-Path $sitePath)) {
        New-Item -ItemType Directory -Path $sitePath -Force
    }

    # Check for and remove existing bindings
    Write-Host "Checking for existing bindings..." -ForegroundColor Cyan
    $existingBindings = Get-WebBinding | Where-Object { 
        $_.bindingInformation -like "*:80:fxalert.co.uk" -or 
        $_.bindingInformation -like "*:443:fxalert.co.uk" -or
        $_.bindingInformation -like "*:3000:fxalert.co.uk" -or
        $_.bindingInformation -like "*:5000:fxalert.co.uk"
    }

    if ($existingBindings) {
        Write-Host "Found existing bindings. Removing..." -ForegroundColor Yellow
        foreach ($binding in $existingBindings) {
            try {
                $binding | Remove-WebBinding -Verbose
                Write-Host "Removed binding: $($binding.bindingInformation)" -ForegroundColor Green
            } catch {
                Write-Host "Warning: Could not remove binding: $($binding.bindingInformation)" -ForegroundColor Yellow
                Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }

    # Remove existing site if it exists
    Write-Host "Checking for existing site..." -ForegroundColor Cyan
    $site = Get-IISSite -Name "fxalert.co.uk" -ErrorAction SilentlyContinue
    if ($site) {
        Write-Host "Removing existing site..." -ForegroundColor Yellow
        try {
            Stop-IISSite -Name "fxalert.co.uk" -Confirm:$false -ErrorAction SilentlyContinue
            Remove-IISSite -Name "fxalert.co.uk" -Confirm:$false
            Write-Host "Existing site removed successfully" -ForegroundColor Green
        } catch {
            Write-Host "Warning: Could not remove existing site completely" -ForegroundColor Yellow
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    # Create new site with force parameter
    Write-Host "Creating new IIS site..." -ForegroundColor Cyan
    try {
        New-IISSite -Name "fxalert.co.uk" -PhysicalPath $sitePath -BindingInformation "*:80:fxalert.co.uk" -Force
        Write-Host "Site created successfully" -ForegroundColor Green
        
        Write-Host "Adding HTTPS bindings..." -ForegroundColor Cyan
        New-WebBinding -Name "fxalert.co.uk" -Protocol "https" -Port 443 -HostHeader "fxalert.co.uk" -SslFlags 1 -Force
        New-WebBinding -Name "fxalert.co.uk" -Protocol "https" -Port 3000 -HostHeader "fxalert.co.uk" -SslFlags 1 -Force
        New-WebBinding -Name "fxalert.co.uk" -Protocol "https" -Port 5000 -HostHeader "fxalert.co.uk" -SslFlags 1 -Force
        Write-Host "HTTPS bindings added successfully" -ForegroundColor Green
    } catch {
        Write-Host "Error creating site or bindings:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        throw
    }

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

    # Enable modules and configure proxy
    Write-Host "Configuring modules and proxy settings..." -ForegroundColor Cyan
    try {
        Enable-WebGlobalModule -Name "ApplicationRequestRouting"
        Enable-WebGlobalModule -Name "UrlRewrite"
        
        $adminConfig = Get-IISConfigSection -SectionPath "system.webServer/proxy"
        $adminConfig.SetAttributeValue("enabled", $true)
        Write-Host "Modules and proxy settings configured successfully" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not configure some settings. Please ensure ARR is installed." -ForegroundColor Yellow
    }

    Write-Host "`nIIS configuration complete!" -ForegroundColor Green
    Write-Host "Please ensure your applications are running on:" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "Backend: http://localhost:5000" -ForegroundColor White
    Write-Host "The site should now be accessible at: https://fxalert.co.uk" -ForegroundColor White
    Write-Host "`nCheck the log file at $logFile for details" -ForegroundColor Cyan

    Write-Host "`nNOTE: You may need to restart your computer to complete the installation." -ForegroundColor Yellow

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