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
$binding = New-WebBinding -Name $siteName -Protocol "https" -Port 3000 -HostHeader "fxalert.co.uk" -SslFlags 1

Write-Host "Getting certificate from store..."
$cert = Get-Item -Path "Cert:\LocalMachine\My\$thumbprint"

Write-Host "Binding certificate to website..."
$binding = Get-WebBinding -Name $siteName -Protocol "https" -Port 3000
$binding.AddSslCertificate($thumbprint, "My")

Write-Host "Restarting IIS..."
iisreset /restart

Write-Host "Configuration complete. Verifying bindings..."
Get-WebBinding -Name $siteName | Format-Table Protocol, BindingInformation 