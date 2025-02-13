# Requires -RunAsAdministrator
Import-Module WebAdministration

# Certificate thumbprint
$thumbprint = "71F1F7C0984196C468404F281CE0FE617E5EFA3B"
$siteName = "ForexNewsNotifier"

Write-Host "Removing existing bindings..."
Get-WebBinding -Name $siteName | Remove-WebBinding

Write-Host "Adding new HTTP binding..."
New-WebBinding -Name $siteName -Protocol "http" -Port 80 -HostHeader "fxalert.co.uk"

Write-Host "Adding new HTTPS binding..."
New-WebBinding -Name $siteName -Protocol "https" -Port 3000 -HostHeader "fxalert.co.uk" -SslFlags 1

Write-Host "Setting physical path..."
Set-ItemProperty "IIS:\Sites\$siteName" -Name "physicalPath" -Value "C:\FlaskApps\forex_news_notifier\frontend"

Write-Host "Configuring SSL certificate..."
# Create a new GUID for the application
$appid = [System.Guid]::NewGuid().ToString("B")

# Remove any existing certificate bindings for port 3000
netsh http delete sslcert ipport=0.0.0.0:3000 | Out-Null

# Add the new certificate binding
$result = netsh http add sslcert ipport=0.0.0.0:3000 certhash=$thumbprint appid=$appid

if ($LASTEXITCODE -eq 0) {
    Write-Host "SSL certificate binding successful!"
} else {
    Write-Host "SSL certificate binding failed. Trying alternative method..."
    # Try alternative binding method
    $result = netsh http add sslcert ipport=0.0.0.0:3000 certhash=$thumbprint appid=$appid certstorename=MY sslctlstorename=MY
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SSL certificate binding successful with alternative method!"
    } else {
        Write-Host "SSL certificate binding failed with error: $result"
    }
}

Write-Host "Restarting IIS..."
iisreset /restart

Write-Host "Configuration complete. Verifying bindings..."
Get-WebBinding -Name $siteName | Format-Table Protocol, BindingInformation
Write-Host "`nVerifying SSL certificate bindings..."
netsh http show sslcert ipport=0.0.0.0:3000 