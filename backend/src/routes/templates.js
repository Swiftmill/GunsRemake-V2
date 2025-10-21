const path = require('node:path');
const fsp = require('node:fs/promises');
const { ok, badRequest, forbidden } = require('../lib/respond');
const { parseJSON } = require('../lib/bodyParser');
const { paths, ensureDir } = require('../config');
const { authenticate } = require('../middleware/auth');
const { getSecret } = require('./auth');

async function listTemplates() {
  ensureDir(paths.templatesDir);
  const entries = await fsp.readdir(paths.templatesDir, { withFileTypes: true });
  const templates = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const content = await fsp.readFile(path.join(paths.templatesDir, entry.name), 'utf-8');
      templates.push(JSON.parse(content));
    }
  }
  return templates;
}

async function registerRoutes(router) {
  router.register('GET', '/api/templates', async (_req, res) => {
    const templates = await listTemplates();
    ok(res, { templates });
  });

  router.register('POST', '/api/templates', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (!payload.roles?.includes('admin')) {
      return forbidden(res, 'Admin only');
    }
    try {
      const body = await parseJSON(req);
      if (!body.id) {
        return badRequest(res, 'Template id required');
      }
      const filePath = path.join(paths.templatesDir, `${body.id}.json`);
      await fsp.writeFile(filePath, `${JSON.stringify(body, null, 2)}\n`);
      ok(res, { template: body });
    } catch (error) {
      badRequest(res, error.message);
    }
  });
}

module.exports = { registerRoutes };
