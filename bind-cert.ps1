# Requires -RunAsAdministrator
Import-Module WebAdministration

# Certificate thumbprint
$thumbprint = "AA79E98B5F0900A7B04586CF87126EE5F8695F0B"
$siteName = "ForexNewsNotifier"

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
netsh http delete sslcert ipport=0.0.0.0:443 | Out-Null
netsh http delete sslcert ipport=0.0.0.0:3000 | Out-Null
netsh http delete sslcert ipport=0.0.0.0:5000 | Out-Null

# Add the new certificate bindings
$ports = @(443, 3000, 5000)
foreach ($port in $ports) {
    Write-Host "Binding certificate to port $port..."
    $result = netsh http add sslcert ipport=0.0.0.0:$port certhash=$thumbprint appid=$appid
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Standard binding failed for port $port, trying alternative method..."
        $result = netsh http add sslcert ipport=0.0.0.0:$port certhash=$thumbprint appid=$appid certstorename=MY sslctlstorename=MY
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully bound certificate to port $port using alternative method"
        } else {
            Write-Host "Failed to bind certificate to port $port: $result"
        }
    } else {
        Write-Host "Successfully bound certificate to port $port"
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