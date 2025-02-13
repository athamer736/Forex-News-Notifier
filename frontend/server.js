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
        cert: certificate
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
        httpsServer.listen(3000, (err) => {
            if (err) {
                console.error('Failed to start HTTPS server:', err);
                throw err;
            }
            console.log('> HTTPS Server ready on https://fxalert.co.uk:3000');
        });

        // Create HTTP redirect server
        console.log('Creating HTTP redirect server...');
        const httpServer = createHttpServer((req, res) => {
            const host = req.headers.host || 'fxalert.co.uk';
            const httpsUrl = `https://${host.split(':')[0]}:3000${req.url}`;
            console.log(`Redirecting ${req.url} to ${httpsUrl}`);
            res.writeHead(301, { Location: httpsUrl });
            res.end();
        });

        // Listen on HTTP port
        httpServer.listen(80, (err) => {
            if (err) {
                console.error('Failed to start HTTP redirect server:', err);
                // Don't throw, just log the error
                console.log('HTTP redirect server failed, but HTTPS server should still work');
            } else {
                console.log('> HTTP redirect server ready');
            }
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