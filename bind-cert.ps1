# Requires -RunAsAdministrator
Import-Module WebAdministration

# Check if running with admin privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges. Please run as administrator."
    exit 1
}

# Certificate thumbprint and paths
$thumbprint = "AA79E98B5F0900A7B04586CF87126EE5F8695F0B"
$siteName = "ForexNewsNotifier"
$certPath = "C:\Certbot\live\fxalert.co.uk\fullchain.pem"
$keyPath = "C:\Certbot\live\fxalert.co.uk\privkey.pem"

# Verify certificate files exist
if (-not (Test-Path $certPath) -or -not (Test-Path $keyPath)) {
    Write-Host "Certificate files not found. Please ensure they exist at:"
    Write-Host "Certificate: $certPath"
    Write-Host "Private Key: $keyPath"
    exit 1
}

# Verify certificate in store
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Thumbprint -eq $thumbprint }
if (-not $cert) {
    Write-Host "Certificate not found in store. Re-importing..."
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $cert.Import($certPath, $keyPath, "Exportable,PersistKeySet")
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
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
    
    # Try with different methods
    $methods = @(
        @{
            Command = "netsh http add sslcert ipport=0.0.0.0:$port certhash=$thumbprint appid=$appid"
            Description = "Standard method"
        },
        @{
            Command = "netsh http add sslcert ipport=0.0.0.0:$port certhash=$thumbprint appid=$appid certstorename=MY sslctlstorename=MY"
            Description = "Store-specific method"
        },
        @{
            Command = "netsh http add sslcert ipport=0.0.0.0:$port certhash=$thumbprint appid=$appid clientcertnegotiation=enable"
            Description = "Client negotiation method"
        }
    )
    
    $success = $false
    foreach ($method in $methods) {
        Write-Host "Trying $($method.Description)..."
        $result = Invoke-Expression $method.Command 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully bound certificate to port $port using $($method.Description)"
            $success = $true
            break
        } else {
            Write-Host "Failed with $($method.Description): $result"
        }
    }
    
    if (-not $success) {
        Write-Host "Failed to bind certificate to port $port after trying all methods"
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