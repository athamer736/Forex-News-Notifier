const { createServer: createHttpsServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const tls = require('tls');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// SSL certificate paths with absolute paths
const CERT_PATH = process.env.SSL_CRT_FILE || 'C:/Certbot/live/fxalert.co.uk/fullchain.pem';
const KEY_PATH = process.env.SSL_KEY_FILE || 'C:/Certbot/live/fxalert.co.uk/privkey.pem';
const PORT = process.env.PORT || 3000;

// Enhanced logging function
function log(message, error = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}`;
    console.log(logMessage);
    if (error) {
        console.error(`${timestamp} - Error Details:`, error);
        console.error(`${timestamp} - Stack:`, error.stack);
    }
}

// Function to verify certificate files
function verifyCertificates() {
    log('Verifying certificate files...');
    
    if (!fs.existsSync(CERT_PATH)) {
        throw new Error(`Certificate file not found at: ${CERT_PATH}`);
    }
    if (!fs.existsSync(KEY_PATH)) {
        throw new Error(`Private key file not found at: ${KEY_PATH}`);
    }
    
    // Get file stats for additional verification
    const certStats = fs.statSync(CERT_PATH);
    const keyStats = fs.statSync(KEY_PATH);
    
    log(`Certificate file (${CERT_PATH}):
    Size: ${certStats.size} bytes
    Permissions: ${certStats.mode}
    Last modified: ${certStats.mtime}`);
    
    log(`Key file (${KEY_PATH}):
    Size: ${keyStats.size} bytes
    Permissions: ${keyStats.mode}
    Last modified: ${keyStats.mtime}`);
    
    log('Certificate files verified successfully');
}

try {
    // Log startup configuration
    log('Starting server with following configuration:');
    log(`Environment: ${process.env.NODE_ENV}`);
    log(`Process ID: ${process.pid}`);
    log(`Working Directory: ${process.cwd()}`);
    log(`Memory Usage: ${JSON.stringify(process.memoryUsage())}`);
    
    // Verify certificate files
    verifyCertificates();

    // Read certificates
    log('Reading SSL certificates...');
    const privateKey = fs.readFileSync(KEY_PATH, 'utf8');
    log(`Private key loaded successfully, length: ${privateKey.length}`);
    const certificate = fs.readFileSync(CERT_PATH, 'utf8');
    log(`Certificate loaded successfully, length: ${certificate.length}`);

    const sslOptions = {
        key: privateKey,
        cert: certificate,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        ciphers: [
            'ECDHE-ECDSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES128-GCM-SHA256',
            'ECDHE-ECDSA-AES256-GCM-SHA384',
            'ECDHE-RSA-AES256-GCM-SHA384'
        ].join(':'),
        honorCipherOrder: true,
        handshakeTimeout: 120000
    };

    log('SSL options configured successfully');

    app.prepare().then(() => {
        log('Creating HTTPS server...');
        const httpsServer = createHttpsServer(sslOptions, async (req, res) => {
            try {
                const parsedUrl = parse(req.url, true);
                log(`Incoming request: ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
                await handle(req, res, parsedUrl);
            } catch (err) {
                log('Error handling request:', err);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });

        // Enhanced error handling for TLS handshake
        httpsServer.on('tlsClientError', (err, tlsSocket) => {
            log('TLS Client Error:', err);
            log(`Client Info - IP: ${tlsSocket.remoteAddress}, Port: ${tlsSocket.remotePort}`);
        });

        // Listen on all interfaces
        httpsServer.listen(PORT, '0.0.0.0', (err) => {
            if (err) {
                log('Failed to start HTTPS server:', err);
                throw err;
            }
            log(`> Server ready on port ${PORT}`);
            log('> Process running as:', process.getuid?.() || 'N/A');
        });

        // Log successful TLS connections
        httpsServer.on('secureConnection', (tlsSocket) => {
            log('New TLS connection established');
            log(`Protocol: ${tlsSocket.getProtocol()}`);
            log(`Cipher: ${tlsSocket.getCipher().name}`);
            log(`Client: ${tlsSocket.remoteAddress}:${tlsSocket.remotePort}`);
        });

        // Monitor server events
        httpsServer.on('error', (err) => {
            log('Server error:', err);
        });

        httpsServer.on('close', () => {
            log('Server is shutting down');
        });

    }).catch(err => {
        log('Error during app preparation:', err);
        process.exit(1);
    });

} catch (err) {
    log('Critical error during server startup:', err);
    process.exit(1);
}

// Process event handlers
process.on('uncaughtException', (err) => {
    log('Uncaught Exception:', err);
    // Give time for logs to be written before exiting
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (err) => {
    log('Unhandled Rejection:', err);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
    log('Received SIGTERM signal');
    process.exit(0);
});

process.on('SIGINT', () => {
    log('Received SIGINT signal');
    process.exit(0);
});

// Monitor memory usage
setInterval(() => {
    const used = process.memoryUsage();
    log(`Memory usage - heapTotal: ${Math.round(used.heapTotal / 1024 / 1024)}MB, heapUsed: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
}, 300000); // Every 5 minutes 