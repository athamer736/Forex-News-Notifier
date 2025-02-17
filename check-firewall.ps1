# Function to check and create firewall rule if it doesn't exist
function Ensure-FirewallRule {
    param(
        [string]$port,
        [string]$name
    )
    
    Write-Host "`nChecking firewall rule for port $port..."
    
    # Check if rule exists
    $existingRule = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
    
    if ($existingRule) {
        Write-Host "Rule already exists: $name" -ForegroundColor Green
        Get-NetFirewallRule -DisplayName $name | Format-List DisplayName, Enabled, Direction, Action
    } else {
        Write-Host "Creating new firewall rule: $name" -ForegroundColor Yellow
        try {
            # Create new inbound rule
            New-NetFirewallRule -DisplayName $name `
                -Direction Inbound `
                -Action Allow `
                -Protocol TCP `
                -LocalPort $port `
                -Description "Allow inbound HTTPS traffic on port $port" | Out-Null
                
            Write-Host "Rule created successfully" -ForegroundColor Green
        } catch {
            Write-Host "Failed to create rule: $_" -ForegroundColor Red
        }
    }
}

# Ports to check
$ports = @(
    @{Port = "443"; Name = "HTTPS - Port 443"},
    @{Port = "3000"; Name = "HTTPS - Port 3000"},
    @{Port = "5000"; Name = "HTTPS - Port 5000"}
)

Write-Host "Checking Windows Firewall Rules..."
Write-Host "================================="

foreach ($p in $ports) {
    Ensure-FirewallRule -port $p.Port -name $p.Name
}

Write-Host "`nChecking IIS Application Pools..."
Write-Host "================================="

# Check IIS Application Pools
Import-Module WebAdministration
$siteName = "ForexNewsNotifier"

Write-Host "`nSite Status:"
Get-Website -Name $siteName | Format-Table Name, State, PhysicalPath

Write-Host "`nApplication Pool Status:"
$pool = Get-IISAppPool -Name $siteName
if ($pool) {
    $pool | Format-Table Name, State, ManagedRuntimeVersion, ManagedPipelineMode
} else {
    Write-Host "Application pool not found" -ForegroundColor Yellow
    
    Write-Host "Creating application pool..." -ForegroundColor Yellow
    New-WebAppPool -Name $siteName
    Set-ItemProperty IIS:\AppPools\$siteName -name "managedRuntimeVersion" -value "v4.0"
    Set-ItemProperty IIS:\AppPools\$siteName -name "managedPipelineMode" -value "Integrated"
    Start-WebAppPool -Name $siteName
    
    Write-Host "Application pool created and started" -ForegroundColor Green
}

Write-Host "`nVerifying site bindings..."
Get-WebBinding -Name $siteName | Format-Table Protocol, bindingInformation

Write-Host "`nChecking SSL certificates..."
Get-ChildItem -Path IIS:\SslBindings | Format-Table Host, Port, Store, Thumbprint 