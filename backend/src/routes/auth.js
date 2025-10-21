const { parseJSON } = require('../lib/bodyParser');
const { ok, badRequest, unauthorized } = require('../lib/respond');
const { authenticateUser, createUser, findUser } = require('../services/userService');
const { signJWT, hashPassword } = require('../lib/security');
const { paths } = require('../config');
const { writeJSON, readJSON } = require('../lib/fileStore');

const SESSION_SECRET_FILE = `${paths.sessionsDir}/secret.json`;

async function getSecret() {
  try {
    const data = await readJSON(SESSION_SECRET_FILE);
    if (data.secret) return data.secret;
  } catch (error) {
    /* ignore */
  }
  const secret = require('node:crypto').randomBytes(32).toString('hex');
  await writeJSON(SESSION_SECRET_FILE, { secret });
  return secret;
}

async function registerRoutes(router) {
  router.register('POST', '/api/auth/login', async (req, res) => {
    try {
      const body = await parseJSON(req);
      if (!body.username || !body.password) {
        return badRequest(res, 'Missing credentials');
      }
      const user = await authenticateUser(body.username, body.password);
      if (!user) {
        return unauthorized(res, 'Invalid credentials');
      }
      const secret = await getSecret();
      const token = signJWT({ username: user.username, roles: user.roles }, secret, {
        expiresInSeconds: 60 * 60 * 6,
      });
      return ok(res, { token, user });
    } catch (error) {
      return badRequest(res, error.message);
    }
  });

  router.register('POST', '/api/auth/register', async (req, res) => {
    try {
      const body = await parseJSON(req);
      if (!body.username || !body.password) {
        return badRequest(res, 'Missing credentials');
      }
      const created = await createUser(body);
      return ok(res, { user: created });
    } catch (error) {
      return badRequest(res, error.message);
    }
  });

  router.register('POST', '/api/auth/change-password', async (req, res) => {
    try {
      const secret = await getSecret();
      const auth = require('../middleware/auth').authenticate(secret);
      const payload = await auth(req, res);
      if (!payload) return;
      const body = await parseJSON(req);
      if (!body.newPassword) {
        return badRequest(res, 'Missing new password');
      }
      const index = await require('../services/userService').getUserIndex();
      const user = index.users.find((entry) => entry.username === payload.username);
      if (!user) {
        return unauthorized(res, 'User missing');
      }
      user.passwordHash = hashPassword(body.newPassword);
      await require('../services/userService').saveUserIndex(index);
      return ok(res, { message: 'Password updated' });
    } catch (error) {
      return badRequest(res, error.message);
    }
  });

  router.register('GET', '/api/auth/me', async (req, res) => {
    const secret = await getSecret();
    const auth = require('../middleware/auth').authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    const user = await findUser(payload.username);
    if (!user) {
      return unauthorized(res, 'User not found');
    }
    delete user.passwordHash;
    ok(res, { user });
  });
}

module.exports = { registerRoutes, getSecret };
