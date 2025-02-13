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

Write-Host "Configuring SSL certificate..."
Push-Location IIS:\SslBindings
Get-Item "Cert:\LocalMachine\My\$thumbprint" | New-Item "0.0.0.0!3000"
Pop-Location

Write-Host "Setting physical path..."
Set-ItemProperty "IIS:\Sites\$siteName" -Name "physicalPath" -Value "C:\FlaskApps\forex_news_notifier\frontend"

Write-Host "Restarting IIS..."
iisreset /restart

Write-Host "Configuration complete. Verifying bindings..."
Get-WebBinding -Name $siteName | Format-Table Protocol, BindingInformation 