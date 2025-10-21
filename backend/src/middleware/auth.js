const { verifyJWT } = require('../lib/security');
const { json } = require('../lib/respond');

function authenticate(secret) {
  return async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      json(res, 401, { error: 'Missing authorization header' });
      return null;
    }
    const token = authHeader.slice(7);
    try {
      const payload = verifyJWT(token, secret);
      req.user = payload;
      return payload;
    } catch (error) {
      json(res, 401, { error: 'Invalid token' });
      return null;
    }
  };
}

function requireRole(role) {
  return (req, res) => {
    if (!req.user || (role && !req.user.roles?.includes(role))) {
      json(res, 403, { error: 'Forbidden' });
      return false;
    }
    return true;
  };
}

module.exports = { authenticate, requireRole };
