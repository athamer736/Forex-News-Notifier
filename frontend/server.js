const { createServer: createHttpsServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// SSL certificate paths with absolute paths
const CERT_PATH = process.env.SSL_CRT_FILE || 'C:/Certbot/live/fxalert.co.uk/fullchain.pem';
const KEY_PATH = process.env.SSL_KEY_FILE || 'C:/Certbot/live/fxalert.co.uk/privkey.pem';
const PORT = process.env.PORT || 3000;

console.log('Starting server with following configuration:');
console.log('Environment:', process.env.NODE_ENV);
console.log('Certificate path:', CERT_PATH);
console.log('Key path:', KEY_PATH);
console.log('Port:', PORT);

// Function to verify certificate files
function verifyCertificates() {
    if (!fs.existsSync(CERT_PATH)) {
        throw new Error(`Certificate file not found at: ${CERT_PATH}`);
    }
    if (!fs.existsSync(KEY_PATH)) {
        throw new Error(`Private key file not found at: ${KEY_PATH}`);
    }
    console.log('Certificate files verified');
}

try {
    // Verify certificate files exist
    verifyCertificates();

    // Read certificates synchronously
    console.log('Reading SSL certificates...');
    const privateKey = fs.readFileSync(KEY_PATH, 'utf8');
    console.log('Private key loaded, length:', privateKey.length);
    const certificate = fs.readFileSync(CERT_PATH, 'utf8');
    console.log('Certificate loaded, length:', certificate.length);

    const sslOptions = {
        key: privateKey,
        cert: certificate,
        secureProtocol: 'TLSv1_2_method',
        secureOptions: require('constants').SSL_OP_NO_TLSv1 | 
                      require('constants').SSL_OP_NO_TLSv1_1,
        ciphers: [
            "ECDHE-RSA-AES128-GCM-SHA256",
            "ECDHE-ECDSA-AES128-GCM-SHA256",
            "ECDHE-RSA-AES256-GCM-SHA384",
            "ECDHE-ECDSA-AES256-GCM-SHA384",
            "DHE-RSA-AES128-GCM-SHA256"
        ].join(':'),
        honorCipherOrder: true,
        minVersion: 'TLSv1.2'
    };

    app.prepare().then(() => {
        console.log('Creating HTTPS server...');
        const httpsServer = createHttpsServer(sslOptions, (req, res) => {
            // Log incoming requests
            console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
            
            try {
                const parsedUrl = parse(req.url, true);
                handle(req, res, parsedUrl);
            } catch (err) {
                console.error('Error handling HTTPS request:', err);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });

        // Enhanced error handling for TLS handshake
        httpsServer.on('tlsClientError', (err, tlsSocket) => {
            console.error('TLS Client Error:', err);
            console.error('Client IP:', tlsSocket.remoteAddress);
            console.error('Client Port:', tlsSocket.remotePort);
        });

        // Listen on all interfaces
        httpsServer.listen(PORT, '0.0.0.0', (err) => {
            if (err) {
                console.error('Failed to start HTTPS server:', err);
                throw err;
            }
            console.log(`> HTTPS Server ready on port ${PORT}`);
            console.log('> Listening on all interfaces (0.0.0.0)');
        });

        // Set up error handlers
        httpsServer.on('error', (err) => {
            console.error('Server error:', err);
            if (err.code === 'EACCES') {
                console.error('Permission denied. Try running with administrator privileges.');
            }
            if (err.code === 'EADDRINUSE') {
                console.error('Address already in use. Check if another service is using the port.');
            }
            process.exit(1);
        });

        httpsServer.on('clientError', (err, socket) => {
            console.error('Client error:', err);
            console.error('Client IP:', socket.remoteAddress);
            console.error('Client Port:', socket.remotePort);
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });

    }).catch(err => {
        console.error('Error during app preparation:', err);
        process.exit(1);
    });
} catch (err) {
    console.error('Critical error during server startup:', err);
    console.error('Error details:', err.stack);
    if (err.code === 'EACCES') {
        console.error('Permission denied accessing certificate files');
        console.error('Please check file permissions');
    }
    if (err.code === 'ENOENT') {
        console.error('Certificate files not found');
        console.error('Please verify certificate paths');
    }
    process.exit(1);
}

// Add error handlers for the process
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.error('Stack trace:', err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    if (err instanceof Error) {
        console.error('Stack trace:', err.stack);
    }
    process.exit(1);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Performing graceful shutdown...');
    process.exit(0);
}); 