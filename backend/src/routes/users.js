const { parseJSON } = require('../lib/bodyParser');
const { ok, badRequest, forbidden, json } = require('../lib/respond');
const { getPage, savePage } = require('../services/pageService');
const { findUser, listUsers, updateUser, createUser } = require('../services/userService');
const { authenticate } = require('../middleware/auth');
const { getSecret } = require('./auth');

async function registerRoutes(router) {
  router.register('GET', '/api/users/:username', async (req, res) => {
    const page = await getPage(req.params.username);
    if (!page) {
      return json(res, 404, { error: 'User page not found' });
    }
    const user = await findUser(req.params.username);
    if (user) {
      delete user.passwordHash;
    }
    ok(res, { page, user });
  });

  router.register('PUT', '/api/users/:username', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (payload.username !== req.params.username && !payload.roles?.includes('admin')) {
      return forbidden(res, 'Insufficient permissions');
    }
    try {
      const body = await parseJSON(req);
      const updated = await savePage(req.params.username, body);
      ok(res, { page: updated });
    } catch (error) {
      badRequest(res, error.message);
    }
  });

  router.register('GET', '/api/admin/users', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (!payload.roles?.includes('admin')) {
      return forbidden(res, 'Admin only');
    }
    const users = await listUsers();
    ok(res, { users });
  });

  router.register('PATCH', '/api/admin/users/:username', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (!payload.roles?.includes('admin')) {
      return forbidden(res, 'Admin only');
    }
    try {
      const body = await parseJSON(req);
      const updated = await updateUser(req.params.username, body);
      ok(res, { user: updated });
    } catch (error) {
      badRequest(res, error.message);
    }
  });

  router.register('POST', '/api/admin/users', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (!payload.roles?.includes('admin')) {
      return forbidden(res, 'Admin only');
    }
    try {
      const body = await parseJSON(req);
      const created = await createUser(body);
      ok(res, { user: created });
    } catch (error) {
      badRequest(res, error.message);
    }
  });
}

module.exports = { registerRoutes };
