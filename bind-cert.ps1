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
$tempDir = [System.IO.Path]::GetTempPath()
$opensslDir = "C:\OpenSSL"
$opensslZip = Join-Path $tempDir "openssl.zip"
$opensslExe = Join-Path $opensslDir "openssl.exe"
$tempPfxPath = Join-Path $tempDir "certificate.pfx"
$pfxPassword = [System.Guid]::NewGuid().ToString("N")
$siteName = "ForexNewsNotifier"

# Verify certificate files exist
if (-not (Test-Path $certPath)) {
    Write-Host "Certificate file not found at: $certPath"
    exit 1
}
if (-not (Test-Path $keyPath)) {
    Write-Host "Private key file not found at: $keyPath"
    exit 1
}

# Download and setup OpenSSL if not present
if (-not (Test-Path $opensslExe)) {
    Write-Host "OpenSSL not found. Downloading and setting up..."
    try {
        # Create OpenSSL directory
        New-Item -ItemType Directory -Force -Path $opensslDir | Out-Null
        
        # Download OpenSSL
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "PowerShell Script")
        $opensslUrl = "https://download.firedaemon.com/FireDaemon-OpenSSL/openssl-3.1.3.zip"
        $webClient.DownloadFile($opensslUrl, $opensslZip)
        
        # Extract OpenSSL
        Write-Host "Extracting OpenSSL..."
        Expand-Archive -Path $opensslZip -DestinationPath $opensslDir -Force
        
        # Clean up zip file
        Remove-Item $opensslZip -Force
        
        Write-Host "OpenSSL setup complete"
    } catch {
        Write-Host "Failed to setup OpenSSL: $_"
        exit 1
    }
}

# Import certificate to store
Write-Host "Importing certificate to store..."
try {
    # Create secure string for password
    $securePfxPass = ConvertTo-SecureString -String $pfxPassword -Force -AsPlainText
    
    # Remove existing certificates for the domain from store
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store "My", "LocalMachine"
    $store.Open("ReadWrite")
    $existingCerts = $store.Certificates | Where-Object { $_.Subject -like "*fxalert.co.uk*" }
    foreach ($existingCert in $existingCerts) {
        $store.Remove($existingCert)
    }
    $store.Close()

    # Convert PEM to PFX using OpenSSL
    Write-Host "Converting to PFX format using OpenSSL..."
    $opensslCmd = "& '$opensslExe' pkcs12 -export -out '$tempPfxPath' -inkey '$keyPath' -in '$certPath' -password pass:$pfxPassword"
    $result = Invoke-Expression $opensslCmd
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create PFX file using OpenSSL: $result"
    }

    # Verify PFX file was created
    if (-not (Test-Path $tempPfxPath)) {
        throw "PFX file was not created"
    }

    # Import the PFX
    Write-Host "Importing PFX certificate..."
    $cert = Import-PfxCertificate -FilePath $tempPfxPath -CertStoreLocation Cert:\LocalMachine\My -Password $securePfxPass
    $thumbprint = $cert.Thumbprint
    Write-Host "Certificate imported successfully with thumbprint: $thumbprint"

} catch {
    Write-Host "Failed to import certificate: $_"
    exit 1
} finally {
    # Clean up temporary files
    if (Test-Path $tempPfxPath) {
        Remove-Item -Path $tempPfxPath -Force
    }
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