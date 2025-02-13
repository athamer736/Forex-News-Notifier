const { createServer: createHttpsServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// SSL certificate paths
const certPath = 'C:/Certbot/live/fxalert.co.uk';
console.log('Checking SSL certificates...');
try {
    const sslOptions = {
        key: fs.readFileSync(path.join(certPath, 'privkey.pem')),
        cert: fs.readFileSync(path.join(certPath, 'fullchain.pem'))
    };
    console.log('SSL certificates loaded successfully');

    app.prepare().then(() => {
        console.log('Starting HTTPS server...');
        // Create HTTPS server
        createHttpsServer(sslOptions, (req, res) => {
            try {
                const parsedUrl = parse(req.url, true);
                handle(req, res, parsedUrl);
            } catch (err) {
                console.error('Error handling request:', err);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        }).listen(3000, (err) => {
            if (err) {
                console.error('Failed to start HTTPS server:', err);
                throw err;
            }
            console.log('> Ready on https://fxalert.co.uk:3000');
        });

        console.log('Starting HTTP redirect server...');
        // Create HTTP server to redirect to HTTPS
        createHttpServer((req, res) => {
            const httpsUrl = `https://${req.headers.host}${req.url}`;
            console.log(`Redirecting ${req.url} to ${httpsUrl}`);
            res.writeHead(301, { Location: httpsUrl });
            res.end();
        }).listen(80, (err) => {
            if (err) {
                console.error('Failed to start HTTP redirect server:', err);
                throw err;
            }
            console.log('> HTTP redirect server ready on port 80');
        });
    }).catch(err => {
        console.error('Error during app preparation:', err);
        process.exit(1);
    });
} catch (err) {
    console.error('Error loading SSL certificates:', err);
    console.error('Certificate path:', certPath);
    console.error('Files in directory:', fs.readdirSync(certPath));
    process.exit(1);
} 