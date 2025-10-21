function json(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(payload));
}

function ok(res, payload) {
  json(res, 200, payload);
}

function badRequest(res, message) {
  json(res, 400, { error: message });
}

function unauthorized(res, message = 'Unauthorized') {
  json(res, 401, { error: message });
}

function forbidden(res, message = 'Forbidden') {
  json(res, 403, { error: message });
}

function serverError(res, message = 'Internal server error') {
  json(res, 500, { error: message });
}

module.exports = {
  json,
  ok,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
};
