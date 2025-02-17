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
    
    # Clean and format the thumbprint
    $thumbprint = $cert.Thumbprint.Replace(" ", "").Replace("-", "").ToUpper()
    Write-Host "Certificate imported successfully with thumbprint: $thumbprint"
    
    # Verify the certificate exists in the store
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store "My", "LocalMachine"
    $store.Open("ReadOnly")
    $certInStore = $store.Certificates | Where-Object { $_.Thumbprint -eq $thumbprint }
    if (-not $certInStore) {
        throw "Certificate not found in store after import"
    }
    $store.Close()

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
$appid = [System.Guid]::NewGuid().ToString("D")  # Using "D" format for standard GUID format

# Function to bind SSL certificate
function Bind-SSLCert {
    param(
        [string]$port,
        [string]$thumbprint,
        [string]$appid
    )
    
    Write-Host "Binding certificate to port $port..."
    
    # Clean the thumbprint again just to be sure
    $thumbprint = $thumbprint.Replace(" ", "").Replace("-", "").ToUpper()
    
    try {
        # Remove existing binding if it exists
        Write-Host "Removing existing binding for port $port..."
        try {
            Get-Item -Path "IIS:\SslBindings\0.0.0.0!$port" -ErrorAction Stop | Remove-Item -Force
        } catch {
            Write-Host "No existing binding to remove"
        }
        
        # Get the certificate from the store
        Write-Host "Retrieving certificate from store..."
        $cert = Get-ChildItem -Path "Cert:\LocalMachine\My\$thumbprint" -ErrorAction Stop
        
        if (-not $cert) {
            throw "Certificate not found in store"
        }
        
        Write-Host "Creating new SSL binding..."
        # Create the SSL binding using native PowerShell commands
        $cert | New-Item -Path "IIS:\SslBindings\0.0.0.0!$port" -Force
        
        # Verify the binding was created
        Write-Host "Verifying binding..."
        $binding = Get-Item -Path "IIS:\SslBindings\0.0.0.0!$port" -ErrorAction SilentlyContinue
        
        if ($binding -and $binding.Thumbprint -eq $thumbprint) {
            Write-Host "Successfully created SSL binding for port $port"
            return $true
        }
        
        Write-Host "Failed to verify binding creation"
        return $false
        
    } catch {
        Write-Host "Error during SSL binding: $_"
        
        # Display current certificate store information for debugging
        Write-Host "Checking certificate store..."
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store "My", "LocalMachine"
        $store.Open("ReadOnly")
        $certInStore = $store.Certificates | Where-Object { $_.Thumbprint -eq $thumbprint }
        if ($certInStore) {
            Write-Host "Certificate found in store with correct thumbprint"
        } else {
            Write-Host "Certificate not found in store with thumbprint: $thumbprint"
        }
        $store.Close()
        
        return $false
    }
}

# Bind certificates to each port
$ports = @(443, 3000, 5000)
$bindingResults = @()

# Ensure WebAdministration module is loaded
if (-not (Get-Module -Name WebAdministration)) {
    Import-Module WebAdministration -Force
}

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

Write-Host "`nVerifying SSL bindings..."
foreach ($port in $ports) {
    Write-Host "`nPort $port binding:"
    Get-Item "IIS:\SslBindings\0.0.0.0!$port" -ErrorAction SilentlyContinue | 
        Select-Object Host, Port, Store, Thumbprint
}

# Report final status
Write-Host "`nBinding Results Summary:"
foreach ($result in $bindingResults) {
    $status = if ($result.Success) { "Success" } else { "Failed" }
    Write-Host "Port $($result.Port): $status"
} 