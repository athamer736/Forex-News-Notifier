# Function to test HTTPS endpoint
function Test-HTTPSEndpoint {
    param(
        [string]$hostname,
        [int]$port
    )
    
    Write-Host "`nTesting https://$hostname`:$port"
    Write-Host "----------------------------------------"
    
    try {
        # Create web request with TLS 1.2
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $request = [System.Net.HttpWebRequest]::Create("https://$hostname`:$port")
        $request.Timeout = 10000  # 10 seconds
        
        # Get response
        Write-Host "Connecting..."
        $response = $request.GetResponse()
        
        # Get certificate information
        $cert = $request.ServicePoint.Certificate
        
        Write-Host "Connection successful!" -ForegroundColor Green
        Write-Host "Server Response: $($response.StatusCode) - $($response.StatusDescription)" -ForegroundColor Green
        
        # Display certificate details
        Write-Host "`nCertificate Information:"
        Write-Host "Subject: $($cert.Subject)"
        Write-Host "Issuer: $($cert.Issuer)"
        Write-Host "Valid From: $($cert.GetEffectiveDateString())"
        Write-Host "Valid To: $($cert.GetExpirationDateString())"
        Write-Host "Thumbprint: $($cert.GetCertHashString())"
        
        $response.Close()
        
    } catch [System.Net.WebException] {
        Write-Host "Connection failed!" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Status -eq [System.Net.WebExceptionStatus]::TrustFailure) {
            Write-Host "SSL/TLS certificate validation failed" -ForegroundColor Yellow
        }
        
        # Try to get certificate info even if connection fails
        try {
            $cert = $_.Exception.Response.GetType().GetField("m_HttpResponseMessage", "NonPublic,Instance").GetValue($_.Exception.Response).RequestMessage.RequestUri.Host
            Write-Host "`nAttempted to connect to: $cert"
        } catch {
            # Ignore if we can't get additional info
        }
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test each endpoint
$hostname = "fxalert.co.uk"
$ports = @(443, 3000, 5000)

Write-Host "Starting SSL endpoint tests..."
Write-Host "==============================`n"

foreach ($port in $ports) {
    Test-HTTPSEndpoint -hostname $hostname -port $port
}

Write-Host "`nTesting complete!" 