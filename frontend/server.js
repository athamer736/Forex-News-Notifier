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
const sslOptions = {
    key: fs.readFileSync('C:/Certbot/live/fxalert.co.uk/privkey.pem'),
    cert: fs.readFileSync('C:/Certbot/live/fxalert.co.uk/fullchain.pem')
};

app.prepare().then(() => {
    // Create HTTPS server
    createHttpsServer(sslOptions, (req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    }).listen(3000, (err) => {
        if (err) {
            console.error('Failed to start HTTPS server:', err);
            throw err;
        }
        console.log('> Ready on https://fxalert.co.uk:3000');
    });

    // Also create HTTP server to redirect to HTTPS
    createHttpServer((req, res) => {
        res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
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