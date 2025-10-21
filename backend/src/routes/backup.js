const path = require('node:path');
const fsp = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { ok, serverError, forbidden } = require('../lib/respond');
const { authenticate } = require('../middleware/auth');
const { getSecret } = require('./auth');
const { paths } = require('../config');

async function createArchive() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveName = `backup-${timestamp}.zip`;
  const archivePath = path.join(paths.backupsDir, archiveName);
  await fsp.mkdir(paths.backupsDir, { recursive: true });
  return new Promise((resolve, reject) => {
    const zip = spawn('zip', ['-r', archivePath, '.'], { cwd: paths.rootDir });
    zip.on('close', (code) => {
      if (code === 0) {
        resolve({ archivePath, archiveName });
      } else {
        reject(new Error(`zip exited with code ${code}`));
      }
    });
    zip.on('error', reject);
  });
}

async function registerRoutes(router) {
  router.register('POST', '/api/admin/backup', async (req, res) => {
    const secret = await getSecret();
    const auth = authenticate(secret);
    const payload = await auth(req, res);
    if (!payload) return;
    if (!payload.roles?.includes('admin')) {
      return forbidden(res, 'Admin only');
    }
    try {
      const backup = await createArchive();
      ok(res, backup);
    } catch (error) {
      serverError(res, error.message);
    }
  });
}

module.exports = { registerRoutes };
