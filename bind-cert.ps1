# Requires -RunAsAdministrator

# Certificate thumbprint
$thumbprint = "71F1F7C0984196C468404F281CE0FE617E5EFA3B"

# Remove existing bindings for port 3000
$existingBindings = & netsh http show sslcert
if ($existingBindings -match "0.0.0.0:3000") {
    & netsh http delete sslcert ipport=0.0.0.0:3000
}

# Generate new GUID for the application ID
$appGuid = [System.Guid]::NewGuid().ToString("B")

# Add new SSL certificate binding
Write-Host "Adding SSL certificate binding..."
$result = & netsh http add sslcert ipport=0.0.0.0:3000 certhash=$thumbprint appid=$appGuid

if ($LASTEXITCODE -eq 0) {
    Write-Host "SSL certificate binding successful!"
} else {
    Write-Host "SSL certificate binding failed with error code: $LASTEXITCODE"
    Write-Host $result
}

# Verify the binding
Write-Host "`nVerifying SSL bindings:"
& netsh http show sslcert ipport=0.0.0.0:3000

# Update IIS bindings
Import-Module WebAdministration
Set-ItemProperty "IIS:\Sites\ForexNewsNotifier" -Name "bindings" -Value @{
    protocol="https";
    bindingInformation="*:3000:fxalert.co.uk";
    certificateHash=$thumbprint;
    sslFlags=1
}

# Restart IIS
Write-Host "`nRestarting IIS..."
iisreset /restart 