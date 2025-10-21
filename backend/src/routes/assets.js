const { parseJSON } = require('../lib/bodyParser');
const { ok, badRequest, forbidden } = require('../lib/respond');
const { authenticate } = require('../middleware/auth');
const { getSecret } = require('./auth');
const { saveAsset, deleteAsset } = require('../services/assetService');

async function registerRoutes(router) {
  router.register('POST', '/api/users/:username/assets', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (payload.username !== req.params.username && !payload.roles?.includes('admin')) {
      return forbidden(res, 'Insufficient permissions');
    }
    try {
      const body = await parseJSON(req);
      const result = await saveAsset({ username: req.params.username, ...body });
      ok(res, { asset: result });
    } catch (error) {
      badRequest(res, error.message);
    }
  });

  router.register('DELETE', '/api/users/:username/assets/:filename', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (payload.username !== req.params.username && !payload.roles?.includes('admin')) {
      return forbidden(res, 'Insufficient permissions');
    }
    try {
      await deleteAsset(req.params.username, req.params.filename);
      ok(res, { removed: true });
    } catch (error) {
      badRequest(res, error.message);
    }
  });
}

module.exports = { registerRoutes };
