const crypto = require('node:crypto');

const JWT_HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, derived);
}

function base64url(input) {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function signJWT(payload, secret, { expiresInSeconds = 60 * 60 * 8 } = {}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: issuedAt, exp: issuedAt + expiresInSeconds };
  const encodedPayload = base64url(tokenPayload);
  const data = `${JWT_HEADER}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyJWT(token, secret) {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) {
    throw new Error('Invalid token');
  }
  const data = `${header}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid signature');
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now) {
    throw new Error('Token expired');
  }
  return decoded;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signJWT,
  verifyJWT,
};
