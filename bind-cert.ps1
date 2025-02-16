# Requires -RunAsAdministrator
Import-Module WebAdministration

# Check if running with admin privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges. Please run as administrator."
    exit 1
}

# Certificate paths and settings
$certPath = "C:\Certbot\live\fxalert.co.uk\fullchain.pem"
$keyPath = "C:\Certbot\live\fxalert.co.uk\privkey.pem"
$siteName = "ForexNewsNotifier"

# Verify certificate files exist
if (-not (Test-Path $certPath) -or -not (Test-Path $keyPath)) {
    Write-Host "Certificate files not found. Please ensure they exist at:"
    Write-Host "Certificate: $certPath"
    Write-Host "Private Key: $keyPath"
    exit 1
}

# Import certificate directly from PEM files
Write-Host "Importing certificate to store..."
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
$certContent = Get-Content -Path $certPath -Raw
$keyContent = Get-Content -Path $keyPath -Raw

try {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store "My", "LocalMachine"
    $store.Open("ReadWrite")
    
    # Remove existing certificates for the domain
    $existingCerts = $store.Certificates | Where-Object { $_.Subject -like "*fxalert.co.uk*" }
    foreach ($existingCert in $existingCerts) {
        $store.Remove($existingCert)
    }
    
    # Import new certificate
    $cert.Import($certPath)
    $store.Add($cert)
    $store.Close()
    
    $thumbprint = $cert.Thumbprint
    Write-Host "Certificate imported successfully with thumbprint: $thumbprint"
} catch {
    Write-Host "Failed to import certificate: $_"
    exit 1
}

Write-Host "Removing existing bindings..."
Get-WebBinding -Name $siteName | Remove-WebBinding

Write-Host "Adding new HTTP binding..."
New-WebBinding -Name $siteName -Protocol "http" -Port 80 -HostHeader "fxalert.co.uk"
New-WebBinding -Name $siteName -Protocol "http" -Port 80 -HostHeader "www.fxalert.co.uk"

Write-Host "Adding new HTTPS bindings..."
New-WebBinding -Name $siteName -Protocol "https" -Port 443 -HostHeader "fxalert.co.uk" -SslFlags 1
New-WebBinding -Name $siteName -Protocol "https" -Port 443 -HostHeader "www.fxalert.co.uk" -SslFlags 1
New-WebBinding -Name $siteName -Protocol "https" -Port 3000 -HostHeader "fxalert.co.uk" -SslFlags 1
New-WebBinding -Name $siteName -Protocol "https" -Port 5000 -HostHeader "fxalert.co.uk" -SslFlags 1

Write-Host "Setting physical path..."
Set-ItemProperty "IIS:\Sites\$siteName" -Name "physicalPath" -Value "C:\FlaskApps\forex_news_notifier\frontend"

Write-Host "Configuring SSL certificates..."
# Create a new GUID for the application
$appid = [System.Guid]::NewGuid().ToString("B")

# Remove any existing certificate bindings
$ports = @(443, 3000, 5000)
foreach ($port in $ports) {
    try {
        netsh http delete sslcert ipport=0.0.0.0:$port | Out-Null
    } catch {
        Write-Host "No existing binding for port $port"
    }
}

# Add the new certificate bindings
foreach ($port in $ports) {
    Write-Host "Binding certificate to port $port..."
    $bindCmd = "netsh http add sslcert ipport=0.0.0.0:$port certhash=$thumbprint appid=$appid"
    $bindResult = Invoke-Expression $bindCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully bound certificate to port $port"
    } else {
        Write-Host "Failed to bind certificate to port $port. Error: $bindResult"
    }
}

Write-Host "Restarting IIS..."
iisreset /restart

Write-Host "Configuration complete. Verifying bindings..."
Get-WebBinding -Name $siteName | Format-Table Protocol, bindingInformation

Write-Host "`nVerifying SSL certificate bindings..."
foreach ($port in $ports) {
    Write-Host "`nPort $port bindings:"
    netsh http show sslcert ipport=0.0.0.0:$port
} 