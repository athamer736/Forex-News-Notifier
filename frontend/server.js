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
const CERT_PATH = 'C:/Certbot/live/fxalert.co.uk';
console.log('Starting server with following configuration:');
console.log('Certificate path:', CERT_PATH);
console.log('Environment:', process.env.NODE_ENV);

try {
    // Read certificates synchronously
    console.log('Reading SSL certificates...');
    const privateKey = fs.readFileSync(path.join(CERT_PATH, 'privkey.pem'), 'utf8');
    console.log('Private key loaded');
    const certificate = fs.readFileSync(path.join(CERT_PATH, 'fullchain.pem'), 'utf8');
    console.log('Certificate loaded');

    const sslOptions = {
        key: privateKey,
        cert: certificate,
        secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1,
        ciphers: [
            "ECDHE-RSA-AES128-GCM-SHA256",
            "ECDHE-ECDSA-AES128-GCM-SHA256",
            "ECDHE-RSA-AES256-GCM-SHA384",
            "ECDHE-ECDSA-AES256-GCM-SHA384",
            "DHE-RSA-AES128-GCM-SHA256",
            "ECDHE-RSA-AES128-SHA256",
            "DHE-RSA-AES128-SHA256",
            "ECDHE-RSA-AES256-SHA384",
            "DHE-RSA-AES256-SHA384",
            "ECDHE-RSA-AES256-SHA256",
            "DHE-RSA-AES256-SHA256",
            "HIGH",
            "!aNULL",
            "!eNULL",
            "!EXPORT",
            "!DES",
            "!RC4",
            "!MD5",
            "!PSK",
            "!SRP",
            "!CAMELLIA"
        ].join(':'),
        honorCipherOrder: true,
        minVersion: 'TLSv1.2'
    };

    app.prepare().then(() => {
        // Create HTTPS server first
        console.log('Creating HTTPS server...');
        const httpsServer = createHttpsServer(sslOptions, (req, res) => {
            try {
                const parsedUrl = parse(req.url, true);
                handle(req, res, parsedUrl);
            } catch (err) {
                console.error('Error handling HTTPS request:', err);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });

        // Listen on HTTPS port
        const port = process.env.PORT || 3000;
        httpsServer.listen(port, (err) => {
            if (err) {
                console.error('Failed to start HTTPS server:', err);
                throw err;
            }
            console.log(`> HTTPS Server ready on https://fxalert.co.uk:${port}`);
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
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });

    }).catch(err => {
        console.error('Error during app preparation:', err);
        process.exit(1);
    });
} catch (err) {
    console.error('Critical error during server startup:', err);
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
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
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