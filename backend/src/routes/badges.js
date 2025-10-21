const { parseJSON } = require('../lib/bodyParser');
const { ok, badRequest, forbidden } = require('../lib/respond');
const { authenticate } = require('../middleware/auth');
const { getSecret } = require('./auth');
const { getBadges, addBadge, updateBadge, removeBadge } = require('../services/badgeService');

async function registerRoutes(router) {
  router.register('GET', '/api/badges', async (_req, res) => {
    const data = await getBadges();
    ok(res, data);
  });

  router.register('POST', '/api/badges', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (!payload.roles?.includes('admin')) {
      return forbidden(res, 'Admin only');
    }
    try {
      const body = await parseJSON(req);
      await addBadge(body);
      ok(res, { created: body });
    } catch (error) {
      badRequest(res, error.message);
    }
  });

  router.register('PATCH', '/api/badges/:id', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (!payload.roles?.includes('admin')) {
      return forbidden(res, 'Admin only');
    }
    try {
      const body = await parseJSON(req);
      const updated = await updateBadge(req.params.id, body);
      ok(res, { badge: updated });
    } catch (error) {
      badRequest(res, error.message);
    }
  });

  router.register('DELETE', '/api/badges/:id', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (!payload.roles?.includes('admin')) {
      return forbidden(res, 'Admin only');
    }
    try {
      await removeBadge(req.params.id);
      ok(res, { removed: true });
    } catch (error) {
      badRequest(res, error.message);
    }
  });
}

module.exports = { registerRoutes };
