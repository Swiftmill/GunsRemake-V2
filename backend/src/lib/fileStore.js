const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { ensureDir } = require('../config');

const lockCache = new Map();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquireLock(targetPath, { retries = 20, wait = 25 } = {}) {
  const lockFile = `${targetPath}.lock`;
  ensureDir(path.dirname(lockFile));
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const handle = await fsp.open(lockFile, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR, 0o600);
      await handle.write(`${process.pid}:${Date.now()}`);
      lockCache.set(lockFile, handle);
      return lockFile;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      await delay(wait);
    }
  }
  throw new Error(`Failed to acquire lock for ${targetPath}`);
}

async function releaseLock(lockFile) {
  const handle = lockCache.get(lockFile);
  if (handle) {
    await handle.close();
    lockCache.delete(lockFile);
  }
  await fsp.unlink(lockFile).catch(() => {});
}

async function atomicWrite(targetPath, data) {
  ensureDir(path.dirname(targetPath));
  const lockFile = await acquireLock(targetPath);
  const tempName = `${path.basename(targetPath)}.${crypto.randomUUID()}.tmp`;
  const tempPath = path.join(path.dirname(targetPath), tempName);
  try {
    await fsp.writeFile(tempPath, data);
    await fsp.rename(tempPath, targetPath);
  } finally {
    await fsp.unlink(tempPath).catch(() => {});
    await releaseLock(lockFile);
  }
}

async function readJSON(filePath, defaultValue) {
  try {
    const content = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (typeof defaultValue !== 'undefined') {
        return defaultValue;
      }
      throw error;
    }
    throw error;
  }
}

async function writeJSON(filePath, value) {
  const data = `${JSON.stringify(value, null, 2)}\n`;
  await atomicWrite(filePath, data);
}

module.exports = {
  acquireLock,
  releaseLock,
  atomicWrite,
  readJSON,
  writeJSON,
};
