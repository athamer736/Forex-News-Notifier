# PowerShell script to check CORS configuration
Write-Host "Checking CORS headers on the API endpoints..."

# Test the /events endpoint
Write-Host "`nTesting /events endpoint with OPTIONS request:"
$headers = @{
    "Origin" = "https://fxalert.co.uk:3000"
    "Access-Control-Request-Method" = "GET"
    "Access-Control-Request-Headers" = "Content-Type"
}
try {
    $response = Invoke-WebRequest -Uri "https://fxalert.co.uk:5000/events" -Method OPTIONS -Headers $headers -ErrorAction Stop
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Access-Control-Allow-Origin: $($response.Headers['Access-Control-Allow-Origin'])"
    Write-Host "Access-Control-Allow-Methods: $($response.Headers['Access-Control-Allow-Methods'])"
    Write-Host "Access-Control-Allow-Headers: $($response.Headers['Access-Control-Allow-Headers'])"
} catch {
    Write-Host "Error: $_"
}

# Test the /api/timezone endpoint
Write-Host "`nTesting /api/timezone endpoint with OPTIONS request:"
$headers = @{
    "Origin" = "https://fxalert.co.uk:3000"
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "Content-Type"
}
try {
    $response = Invoke-WebRequest -Uri "https://fxalert.co.uk:5000/api/timezone" -Method OPTIONS -Headers $headers -ErrorAction Stop
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Access-Control-Allow-Origin: $($response.Headers['Access-Control-Allow-Origin'])"
    Write-Host "Access-Control-Allow-Methods: $($response.Headers['Access-Control-Allow-Methods'])"
    Write-Host "Access-Control-Allow-Headers: $($response.Headers['Access-Control-Allow-Headers'])"
} catch {
    Write-Host "Error: $_"
}

Write-Host "`nCORS check complete. If you see proper Access-Control-Allow-* headers above, CORS should be configured correctly."
Write-Host "Remember to restart your server for these changes to take effect, and clear your browser cache." 