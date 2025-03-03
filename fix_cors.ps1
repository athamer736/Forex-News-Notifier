# PowerShell script to diagnose and fix CORS issues
$ErrorActionPreference = "Stop"

# Function to check if port is in use
function Test-PortInUse {
    param($port)
    
    $connections = netstat -an | Select-String -Pattern ":$port "
    return $connections.Count -gt 0
}

# Function to test a URL and check CORS headers
function Test-URL {
    param($url, $method = "GET", $origin = "https://fxalert.co.uk:3000")
    
    Write-Host "Testing $method request to: $url with Origin: $origin"
    
    $headers = @{
        "Origin" = $origin
    }
    
    if ($method -eq "OPTIONS") {
        $headers["Access-Control-Request-Method"] = "GET"
        $headers["Access-Control-Request-Headers"] = "Content-Type, Authorization"
    }
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method $method -Headers $headers -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Host "  Status: $($response.StatusCode)"
        
        if ($response.Headers.ContainsKey("Access-Control-Allow-Origin")) {
            Write-Host "  Access-Control-Allow-Origin: $($response.Headers["Access-Control-Allow-Origin"])" -ForegroundColor Green
        } else {
            Write-Host "  No Access-Control-Allow-Origin header found!" -ForegroundColor Red
        }
        
        if ($response.Headers.ContainsKey("Access-Control-Allow-Methods")) {
            Write-Host "  Access-Control-Allow-Methods: $($response.Headers["Access-Control-Allow-Methods"])" -ForegroundColor Green
        }
        
        if ($response.Headers.ContainsKey("Access-Control-Allow-Headers")) {
            Write-Host "  Access-Control-Allow-Headers: $($response.Headers["Access-Control-Allow-Headers"])" -ForegroundColor Green
        }
        
        if ($response.Headers.ContainsKey("Access-Control-Allow-Credentials")) {
            Write-Host "  Access-Control-Allow-Credentials: $($response.Headers["Access-Control-Allow-Credentials"])" -ForegroundColor Green
        }
        
        return $true
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
        return $false
    }
}

# Check if backend server is running
Write-Host "`n=========== CHECKING SERVER STATUS ============"
$port5000InUse = Test-PortInUse -port 5000
if ($port5000InUse) {
    Write-Host "Backend server is running on port 5000" -ForegroundColor Green
} else {
    Write-Host "No server detected on port 5000!" -ForegroundColor Red
    Write-Host "Starting the backend server..."
    Start-Process -FilePath "python" -ArgumentList "backend/run_waitress.py" -NoNewWindow
    Start-Sleep -Seconds 5
}

# Test critical endpoints with OPTIONS (preflight) requests
Write-Host "`n=========== TESTING CORS PREFLIGHT REQUESTS ============"
$eventsEndpointOk = Test-URL -url "https://fxalert.co.uk:5000/events" -method "OPTIONS"
$timezoneEndpointOk = Test-URL -url "https://fxalert.co.uk:5000/api/timezone" -method "OPTIONS"

# Test actual GET requests
Write-Host "`n=========== TESTING ACTUAL REQUESTS ============"
$eventsGetOk = Test-URL -url "https://fxalert.co.uk:5000/events" -method "GET"

# Check frontend configuration
Write-Host "`n=========== FRONTEND CONFIGURATION ============"
$frontendConfigFile = "frontend/app/events/page.tsx"
if (Test-Path $frontendConfigFile) {
    $content = Get-Content $frontendConfigFile -Raw
    if ($content -match "baseUrl\s*=\s*'https://fxalert.co.uk:5000'") {
        Write-Host "Frontend is configured to use correct backend URL with port 5000" -ForegroundColor Green
    } else {
        Write-Host "Frontend might be using incorrect backend URL!" -ForegroundColor Red
        Write-Host "Please check $frontendConfigFile and ensure it uses https://fxalert.co.uk:5000"
    }
} else {
    Write-Host "Could not find frontend config file: $frontendConfigFile" -ForegroundColor Yellow
}

# Output summary and recommendations
Write-Host "`n=========== SUMMARY AND RECOMMENDATIONS ============"
if ($eventsEndpointOk -and $timezoneEndpointOk -and $eventsGetOk) {
    Write-Host "All endpoints appear to be configured correctly for CORS!" -ForegroundColor Green
    Write-Host "If you're still experiencing issues:"
    Write-Host "1. Clear your browser cache or use Incognito/InPrivate mode"
    Write-Host "2. Check your browser's developer console (F12) for specific errors"
    Write-Host "3. Verify that frontend is deployed with the latest changes"
} else {
    Write-Host "Some CORS issues were detected!" -ForegroundColor Red
    Write-Host "Recommended fixes:"
    Write-Host "1. Ensure your Flask app has proper CORS configuration in app.py"
    Write-Host "2. Check if there is a reverse proxy (like Nginx) that might need CORS headers"
    Write-Host "3. Consider applying the Nginx CORS configuration from nginx_cors_fix.conf"
    Write-Host "4. Restart your server after making any changes"
}

Write-Host "`nIf you're using Nginx or another reverse proxy, make sure it's not stripping CORS headers."
Write-Host "The nginx_cors_fix.conf file can be applied to add CORS headers at the Nginx level." 