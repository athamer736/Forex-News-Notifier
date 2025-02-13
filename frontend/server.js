const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    }).listen(process.env.PORT || 3001, (err) => {
        if (err) {
            console.error('Failed to start server:', err);
            throw err;
        }
        console.log('> Ready on http://localhost:' + (process.env.PORT || 3001));
    });
}).catch(err => {
    console.error('Error during app preparation:', err);
    process.exit(1);
}); 