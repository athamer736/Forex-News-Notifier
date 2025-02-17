# Requires -RunAsAdministrator

# Install URL Rewrite Module if not present
$urlRewriteDownloadUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
$urlRewritePath = "$env:temp\rewrite_amd64_en-US.msi"

if (!(Get-Module -ListAvailable -Name IISAdministration)) {
    Write-Host "Installing IIS Administration module..."
    Install-WindowsFeature -Name Web-Scripting-Tools
}

Import-Module IISAdministration

# Check if URL Rewrite module is installed
if (!(Get-WebGlobalModule -Name "UrlRewrite")) {
    Write-Host "Downloading URL Rewrite Module..."
    Invoke-WebRequest -Uri $urlRewriteDownloadUrl -OutFile $urlRewritePath
    Write-Host "Installing URL Rewrite Module..."
    Start-Process msiexec.exe -ArgumentList "/i $urlRewritePath /quiet /norestart" -Wait
}

# Create the site directory if it doesn't exist
$sitePath = "C:\inetpub\fxalert"
if (!(Test-Path $sitePath)) {
    New-Item -ItemType Directory -Path $sitePath
}

# Remove existing site if it exists
$site = Get-IISSite -Name "fxalert.co.uk" -ErrorAction SilentlyContinue
if ($site) {
    Remove-IISSite -Name "fxalert.co.uk" -Confirm:$false
}

# Create new site
New-IISSite -Name "fxalert.co.uk" -PhysicalPath $sitePath -BindingInformation "*:80:fxalert.co.uk"
New-WebBinding -Name "fxalert.co.uk" -Protocol "https" -Port 443 -HostHeader "fxalert.co.uk" -SslFlags 1

# Configure SSL
$cert = Get-ChildItem -Path "Cert:\LocalMachine\My" | Where-Object {$_.Subject -like "*fxalert.co.uk*"}
if ($cert) {
    $hash = $cert.Thumbprint
    $binding = Get-WebBinding -Name "fxalert.co.uk" -Protocol "https"
    $binding.AddSslCertificate($hash, "my")
}

# Create and configure URL Rewrite rules
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

# Enable required modules
Enable-WebGlobalModule -Name "ApplicationRequestRouting"
Enable-WebGlobalModule -Name "UrlRewrite"

# Configure proxy settings
$adminConfig = Get-IISConfigSection -SectionPath "system.webServer/proxy"
$adminConfig.SetAttributeValue("enabled", $true)

Write-Host "IIS configuration complete. Please ensure your applications are running on:"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend: http://localhost:5000"
Write-Host "The site should now be accessible at: https://fxalert.co.uk" 