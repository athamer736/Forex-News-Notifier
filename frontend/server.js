const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Certificate paths
const certPath = 'C:\\Certbot\\live\\fxalert.co.uk\\fullchain.pem';
const keyPath = 'C:\\Certbot\\live\\fxalert.co.uk\\privkey.pem';

// Check if certificates exist
if (!fs.existsSync(certPath)) {
  console.error(`Certificate not found at: ${certPath}`);
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Private key not found at: ${keyPath}`);
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, (err) => {
    if (err) {
      console.error('Failed to start server:', err);
      throw err;
    }
    console.log('> Ready on https://fxalert.co.uk:3000');
  });
}).catch(err => {
  console.error('Error during app preparation:', err);
  process.exit(1);
}); 