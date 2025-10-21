const http = require('node:http');
const path = require('node:path');
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const { Router } = require('./lib/router');
const { json } = require('./lib/respond');
const { rateLimiter } = require('./middleware/rateLimiter');
const { paths, ensureDir } = require('./config');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const limiter = rateLimiter({ windowMs: 60_000, max: 120 });

const router = new Router();

require('./routes/auth').registerRoutes(router);
require('./routes/users').registerRoutes(router);
require('./routes/assets').registerRoutes(router);
require('./routes/badges').registerRoutes(router);
require('./routes/templates').registerRoutes(router);
require('./routes/backup').registerRoutes(router);

async function serveStatic(req, res) {
  if (!req.pathname.startsWith('/assets/')) return false;
  const parts = req.pathname.split('/').filter(Boolean);
  if (parts.length < 3) return false;
  const [, username, ...rest] = parts;
  const assetPath = path.join(paths.assetsDir, username, ...rest);
  if (!assetPath.startsWith(paths.assetsDir)) {
    json(res, 403, { error: 'Invalid path' });
    return true;
  }
  try {
    const stream = fs.createReadStream(assetPath);
    stream.on('error', () => {
      json(res, 404, { error: 'Asset not found' });
    });
    stream.on('open', () => {
      res.writeHead(200);
      stream.pipe(res);
    });
    return true;
  } catch (error) {
    json(res, 404, { error: 'Asset not found' });
    return true;
  }
}

async function serveFrontend(req, res) {
  const filePath = path.join(__dirname, '..', 'public', req.pathname === '/' ? 'index.html' : req.pathname);
  if (!filePath.startsWith(path.join(__dirname, '..', 'public'))) {
    return false;
  }
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      return false;
    }
    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
      res.writeHead(200);
      stream.pipe(res);
    });
    stream.on('error', () => {
      res.writeHead(500);
      res.end('Failed to read file');
    });
    return true;
  } catch (error) {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  if (!limiter(req, res)) return;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  req.pathname = req.url.split('?')[0];

  if (await serveStatic(req, res)) return;
  if (await serveFrontend(req, res)) return;

  if (req.url === '/health') {
    json(res, 200, { ok: true });
    return;
  }

  try {
    await router.handle(req, res);
  } catch (error) {
    console.error('Unhandled error:', error);
    json(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, HOST, () => {
  ensureDir(paths.rootDir);
  console.log(`Server running at http://${HOST}:${PORT}`);
});
