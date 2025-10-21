const url = require('node:url');
const querystring = require('node:querystring');

function matchPath(routePath, requestPath) {
  const routeSegments = routePath.split('/').filter(Boolean);
  const requestSegments = requestPath.split('/').filter(Boolean);
  if (routeSegments.length !== requestSegments.length) {
    return null;
  }
  const params = {};
  for (let i = 0; i < routeSegments.length; i += 1) {
    const routeSegment = routeSegments[i];
    const requestSegment = requestSegments[i];
    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
    } else if (routeSegment !== requestSegment) {
      return null;
    }
  }
  return params;
}

class Router {
  constructor() {
    this.routes = [];
  }

  register(method, path, handler) {
    this.routes.push({ method: method.toUpperCase(), path, handler });
  }

  async handle(req, res) {
    const parsed = url.parse(req.url);
    req.pathname = parsed.pathname;
    req.query = querystring.parse(parsed.query);
    req.ip = req.socket.remoteAddress;
    const method = req.method.toUpperCase();

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = matchPath(route.path, req.pathname);
      if (params) {
        req.params = params;
        await route.handler(req, res);
        return;
      }
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

module.exports = { Router };
