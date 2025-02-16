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
$tempPfxPath = Join-Path $tempDir "certificate.pfx"
$pfxPassword = [System.Guid]::NewGuid().ToString("N")
$siteName = "ForexNewsNotifier"

# Find OpenSSL from Git installation
$gitOpenSSL = "C:\Program Files\Git\usr\bin\openssl.exe"
if (-not (Test-Path $gitOpenSSL)) {
    Write-Host "OpenSSL not found in Git installation. Please ensure Git is installed."
    Write-Host "Expected path: $gitOpenSSL"
    exit 1
}

# Verify certificate files exist
if (-not (Test-Path $certPath)) {
    Write-Host "Certificate file not found at: $certPath"
    exit 1
}
if (-not (Test-Path $keyPath)) {
    Write-Host "Private key file not found at: $keyPath"
    exit 1
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

    # Convert PEM to PFX using OpenSSL from Git
    Write-Host "Converting to PFX format using OpenSSL..."
    $opensslCmd = "& '$gitOpenSSL' pkcs12 -export -out '$tempPfxPath' -inkey '$keyPath' -in '$certPath' -password pass:$pfxPassword"
    $result = Invoke-Expression $opensslCmd 2>&1
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

# Function to bind SSL certificate
function Bind-SSLCert {
    param(
        [string]$port,
        [string]$thumbprint,
        [string]$appid
    )
    
    Write-Host "Binding certificate to port $port..."
    
    # Remove existing binding if it exists
    Write-Host "Removing existing binding for port $port..."
    $deleteCmd = "netsh http delete sslcert ipport=0.0.0.0:$port"
    $deleteResult = Invoke-Expression $deleteCmd 2>&1
    Start-Sleep -Seconds 2  # Add delay after deletion
    
    # Simple binding command with minimal parameters
    Write-Host "Adding new SSL binding for port $port..."
    $bindCmd = "netsh http add sslcert ipport=0.0.0.0:$port certhash=$thumbprint appid={$appid}"
    $result = Invoke-Expression $bindCmd 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Initial binding successful, verifying..."
        Start-Sleep -Seconds 2  # Add delay before verification
        
        # Verify the binding
        $verifyCmd = "netsh http show sslcert ipport=0.0.0.0:$port"
        $verifyResult = Invoke-Expression $verifyCmd 2>&1
        
        if ($verifyResult -match $thumbprint) {
            Write-Host "Successfully verified SSL binding for port $port"
            return $true
        }
    }
    
    Write-Host "Standard binding failed, trying with additional parameters..."
    
    # Try with additional parameters
    $extendedBindCmd = @"
    netsh http add sslcert `
    ipport=0.0.0.0:$port `
    certhash=$thumbprint `
    appid={$appid} `
    certstorename=MY `
    sslctlstorename=MY
"@
    
    $extResult = Invoke-Expression $extendedBindCmd 2>&1
    Start-Sleep -Seconds 2  # Add delay after binding
    
    # Final verification
    $finalVerifyResult = Invoke-Expression $verifyCmd 2>&1
    if ($finalVerifyResult -match $thumbprint) {
        Write-Host "Successfully verified SSL binding for port $port using extended parameters"
        return $true
    }
    
    Write-Host "Failed to create SSL binding for port $port"
    Write-Host "Command output: $extResult"
    return $false
}

# Bind certificates to each port
$ports = @(443, 3000, 5000)
$bindingResults = @()

foreach ($port in $ports) {
    $success = Bind-SSLCert -port $port -thumbprint $thumbprint -appid $appid
    $bindingResults += @{
        Port = $port
        Success = $success
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

# Report final status
Write-Host "`nBinding Results Summary:"
foreach ($result in $bindingResults) {
    $status = if ($result.Success) { "Success" } else { "Failed" }
    Write-Host "Port $($result.Port): $status"
} 