# Run as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Stop IIS
iisreset /stop

# Delete existing URL reservation if any
netsh http delete urlacl url=http://+:3000/

# Reserve the URL for the application pool identity
netsh http add urlacl url=http://+:3000/ user="NT AUTHORITY\NETWORK SERVICE"

# Add firewall rule
New-NetFirewallRule -DisplayName "Allow Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# Start the Next.js server
Set-Location -Path $PSScriptRoot
$env:PORT = "3000"
npm run start 