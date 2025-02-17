const { createServer: createHttpsServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const tls = require('tls');

// Set development environment if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev });
const handle = app.getRequestHandler();

// Normalize paths for Windows
const normalizePath = (p) => path.normalize(p.replace(/\//g, '\\'));

// SSL certificate paths with normalized Windows paths
const CERT_PATH = normalizePath(process.env.SSL_CRT_FILE || 'C:\\Certbot\\live\\fxalert.co.uk\\fullchain.pem');
const KEY_PATH = normalizePath(process.env.SSL_KEY_FILE || 'C:\\Certbot\\live\\fxalert.co.uk\\privkey.pem');
const PORT = process.env.PORT || 3000;

// Enhanced logging function
function log(message, error = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}`;
    console.log(logMessage);
    if (error) {
        console.error(`${timestamp} - Error Details:`, error.message);
        if (error.code) console.error(`${timestamp} - Error Code:`, error.code);
        if (error.errno) console.error(`${timestamp} - Error Number:`, error.errno);
        if (error.syscall) console.error(`${timestamp} - System Call:`, error.syscall);
        if (error.path) console.error(`${timestamp} - Path:`, error.path);
        console.error(`${timestamp} - Stack:`, error.stack);
    }
}

// Function to verify certificate files
function verifyCertificates() {
    log('Verifying certificate files...');
    
    try {
        // Check certificate file
        if (!fs.existsSync(CERT_PATH)) {
            const err = new Error(`Certificate file not found at: ${CERT_PATH}`);
            err.code = 'ENOENT';
            err.path = CERT_PATH;
            throw err;
        }
        log(`Certificate file exists at: ${CERT_PATH}`);
        
        // Check key file
        if (!fs.existsSync(KEY_PATH)) {
            const err = new Error(`Private key file not found at: ${KEY_PATH}`);
            err.code = 'ENOENT';
            err.path = KEY_PATH;
            throw err;
        }
        log(`Key file exists at: ${KEY_PATH}`);
        
        // Get file stats and check permissions
        let certStats, keyStats;
        try {
            certStats = fs.statSync(CERT_PATH);
            log(`Certificate stats: Size=${certStats.size}, Mode=${certStats.mode.toString(8)}, UID=${certStats.uid}, GID=${certStats.gid}`);
            if (certStats.size === 0) {
                throw new Error(`Certificate file is empty: ${CERT_PATH}`);
            }
        } catch (statErr) {
            log('Error getting certificate stats:', statErr);
            throw statErr;
        }
        
        try {
            keyStats = fs.statSync(KEY_PATH);
            log(`Key stats: Size=${keyStats.size}, Mode=${keyStats.mode.toString(8)}, UID=${keyStats.uid}, GID=${keyStats.gid}`);
            if (keyStats.size === 0) {
                throw new Error(`Private key file is empty: ${KEY_PATH}`);
            }
        } catch (statErr) {
            log('Error getting key stats:', statErr);
            throw statErr;
        }
        
        // Check if files are readable
        try {
            fs.accessSync(CERT_PATH, fs.constants.R_OK);
            fs.accessSync(KEY_PATH, fs.constants.R_OK);
            log('Both certificate files are readable');
        } catch (accessErr) {
            log('Permission denied accessing certificate files:', accessErr);
            throw accessErr;
        }
        
        // Try to read the first few bytes of each file
        let certTest, keyTest;
        try {
            certTest = fs.readFileSync(CERT_PATH, { encoding: 'utf8', flag: 'r' });
            log(`Successfully read certificate file (${certTest.length} bytes)`);
            log('Certificate file starts with:', certTest.slice(0, 100));
        } catch (readErr) {
            log('Error reading certificate file:', readErr);
            throw readErr;
        }
        
        try {
            keyTest = fs.readFileSync(KEY_PATH, { encoding: 'utf8', flag: 'r' });
            log(`Successfully read key file (${keyTest.length} bytes)`);
            log('Key file starts with:', keyTest.slice(0, 100));
        } catch (readErr) {
            log('Error reading key file:', readErr);
            throw readErr;
        }
        
        if (!certTest.includes('-----BEGIN CERTIFICATE-----')) {
            const err = new Error('Invalid certificate file format');
            err.code = 'EINVAL';
            err.path = CERT_PATH;
            throw err;
        }
        log('Certificate file has valid format');
        
        if (!keyTest.includes('-----BEGIN PRIVATE KEY-----')) {
            const err = new Error('Invalid private key file format');
            err.code = 'EINVAL';
            err.path = KEY_PATH;
            throw err;
        }
        log('Private key file has valid format');
        
        log('Certificate files verified successfully');
        return true;
    } catch (err) {
        log('Certificate verification failed', err);
        throw err;
    }
}

try {
    // Log startup configuration
    log('Starting server with following configuration:');
    log(`Environment: ${process.env.NODE_ENV}`);
    log(`Process ID: ${process.pid}`);
    log(`Working Directory: ${process.cwd()}`);
    log(`Certificate Path: ${CERT_PATH}`);
    log(`Key Path: ${KEY_PATH}`);
    log(`Memory Usage: ${JSON.stringify(process.memoryUsage())}`);
    
    // Verify certificate files
    verifyCertificates();

    // Read certificates with explicit error handling
    log('Reading SSL certificates...');
    let privateKey, certificate;
    
    try {
        privateKey = fs.readFileSync(KEY_PATH, 'utf8');
        log(`Private key loaded successfully, length: ${privateKey.length}`);
    } catch (keyErr) {
        throw new Error(`Failed to read private key: ${keyErr.message}`);
    }
    
    try {
        certificate = fs.readFileSync(CERT_PATH, 'utf8');
        log(`Certificate loaded successfully, length: ${certificate.length}`);
    } catch (certErr) {
        throw new Error(`Failed to read certificate: ${certErr.message}`);
    }

    const sslOptions = {
        key: privateKey,
        cert: certificate,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        secureOptions: tls.SSL_OP_NO_SSLv2 | tls.SSL_OP_NO_SSLv3 | tls.SSL_OP_NO_TLSv1 | tls.SSL_OP_NO_TLSv1_1,
        ciphers: [
            'ECDHE-ECDSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES128-GCM-SHA256',
            'ECDHE-ECDSA-AES256-GCM-SHA384',
            'ECDHE-RSA-AES256-GCM-SHA384',
            'ECDHE-ECDSA-CHACHA20-POLY1305',
            'ECDHE-RSA-CHACHA20-POLY1305',
            'DHE-RSA-AES128-GCM-SHA256',
            'DHE-RSA-AES256-GCM-SHA384'
        ].join(':'),
        honorCipherOrder: true,
        handshakeTimeout: 120000,
        rejectUnauthorized: true,
        requestCert: false,
        sessionTimeout: 600
    };

    log('SSL options configured successfully');

    app.prepare().then(() => {
        log('Creating HTTPS server...');
        const httpsServer = createHttpsServer(sslOptions, async (req, res) => {
            try {
                // Set secure headers
                res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('X-Frame-Options', 'DENY');
                res.setHeader('X-XSS-Protection', '1; mode=block');
                
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
            log(`> Server ready on https://localhost:${PORT}`);
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