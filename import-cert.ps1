# Set certificate paths
$certPath = "C:\Certbot\live\fxalert.co.uk"
$fullchainPath = Join-Path $certPath "fullchain.pem"
$privkeyPath = Join-Path $certPath "privkey.pem"

# Read certificate files
$cert = Get-Content -Path $fullchainPath -Raw
$key = Get-Content -Path $privkeyPath -Raw

# Create temporary files
$tempCertPath = Join-Path $env:TEMP "temp_cert.cer"
$cert | Out-File -FilePath $tempCertPath -Encoding ASCII

# Import certificate to LocalMachine\My store
$certObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
$certObj.Import($tempCertPath)
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
$store.Open("ReadWrite")
$store.Add($certObj)
$store.Close()

# Clean up
Remove-Item $tempCertPath -Force

Write-Host "Certificate imported successfully. Thumbprint: $($certObj.Thumbprint)" 