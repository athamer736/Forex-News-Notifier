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
    console.log('Private key loaded successfully, length:', privateKey.length);
    const certificate = fs.readFileSync(CERT_PATH, 'utf8');
    console.log('Certificate loaded successfully, length:', certificate.length);

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
        handshakeTimeout: 120000,
        requestCert: false,
        rejectUnauthorized: false
    };

    console.log('SSL options configured:', {
        minVersion: sslOptions.minVersion,
        maxVersion: sslOptions.maxVersion,
        ciphers: sslOptions.ciphers,
        handshakeTimeout: sslOptions.handshakeTimeout
    });

    app.prepare().then(() => {
        console.log('Creating HTTPS server...');
        const httpsServer = createHttpsServer(sslOptions, (req, res) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.socket.getPeerCertificate().subject || 'No client cert'}`);
            
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
            console.error('TLS Client Error:', err.message);
            console.error('Error code:', err.code);
            console.error('Error stack:', err.stack);
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
            console.log('> TLS version:', sslOptions.minVersion);
            console.log('> Process running as:', process.getuid?.() || 'N/A');
        });

        // Set up error handlers
        httpsServer.on('error', (err) => {
            console.error('Server error:', err.message);
            console.error('Error code:', err.code);
            console.error('Error stack:', err.stack);
            if (err.code === 'EACCES') {
                console.error('Permission denied. Try running with administrator privileges.');
                console.error('Current user:', process.getuid?.() || 'N/A');
            }
            if (err.code === 'EADDRINUSE') {
                console.error('Address already in use. Check if another service is using the port.');
            }
            process.exit(1);
        });

        // Log successful TLS connections
        httpsServer.on('secureConnection', (tlsSocket) => {
            console.log('New TLS connection established');
            console.log('TLS Protocol Version:', tlsSocket.getProtocol());
            console.log('Cipher:', tlsSocket.getCipher().name);
            console.log('Client IP:', tlsSocket.remoteAddress);
            console.log('Client Port:', tlsSocket.remotePort);
        });

    }).catch(err => {
        console.error('Error during app preparation:', err.message);
        console.error('Stack trace:', err.stack);
        process.exit(1);
    });
} catch (err) {
    console.error('Critical error during server startup:', err.message);
    console.error('Error code:', err.code);
    console.error('Error stack:', err.stack);
    if (err.code === 'EACCES') {
        console.error('Permission denied accessing certificate files');
        console.error('Current user:', process.getuid?.() || 'N/A');
        console.error('File permissions:');
        try {
            console.error('Cert file:', fs.statSync(CERT_PATH));
            console.error('Key file:', fs.statSync(KEY_PATH));
        } catch (e) {
            console.error('Could not read file stats:', e.message);
        }
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