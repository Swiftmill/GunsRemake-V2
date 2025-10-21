const path = require('node:path');
const fsp = require('node:fs/promises');
const { paths, ensureDir } = require('../config');
const { updateUsage, findUser } = require('./userService');

const MAX_FILE_BYTES = 100 * 1024 * 1024;

const allowedMimeGroups = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
};

function resolveUserAssetDir(username) {
  const dir = path.join(paths.assetsDir, username);
  ensureDir(dir);
  return dir;
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function validateMime(type, mimeType) {
  const allowed = allowedMimeGroups[type];
  if (!allowed) return false;
  return allowed.includes(mimeType);
}

async function existingSize(username, safeFilename) {
  const assetDir = resolveUserAssetDir(username);
  const assetPath = path.join(assetDir, safeFilename);
  try {
    const stats = await fsp.stat(assetPath);
    return stats.size;
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }
}

async function saveAsset({ username, type, filename, mimeType, base64Content }) {
  if (!validateMime(type, mimeType)) {
    throw new Error('Unsupported MIME type');
  }
  const buffer = Buffer.from(base64Content, 'base64');
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error('File exceeds 100MB limit');
  }
  const user = await findUser(username);
  if (!user) throw new Error('User not found');
  const safeFilename = sanitizeFilename(filename);
  const previousSize = await existingSize(username, safeFilename);
  const remainingBytes = (user.quotaMb * 1024 * 1024) - (user.usedBytes ?? 0);
  if (buffer.length - previousSize > remainingBytes) {
    throw new Error('User quota exceeded');
  }

  const assetDir = resolveUserAssetDir(username);
  const assetPath = path.join(assetDir, safeFilename);
  await fsp.writeFile(assetPath, buffer);
  await updateUsage(username, buffer.length - previousSize);

  const thumbPath = path.join(assetDir, `${safeFilename}.thumb`);
  const webPath = path.join(assetDir, `${safeFilename}.web`);
  await fsp.writeFile(thumbPath, buffer.slice(0, Math.min(buffer.length, 32 * 1024)));
  await fsp.writeFile(webPath, buffer);

  return {
    path: `/assets/${username}/${safeFilename}`,
    thumbnail: `/assets/${username}/${path.basename(thumbPath)}`,
    web: `/assets/${username}/${path.basename(webPath)}`,
    size: buffer.length,
    mimeType,
  };
}

async function deleteAsset(username, filename) {
  const assetDir = resolveUserAssetDir(username);
  const safeFilename = sanitizeFilename(filename);
  const assetPath = path.join(assetDir, safeFilename);
  try {
    const stats = await fsp.stat(assetPath);
    await fsp.unlink(assetPath);
    await fsp.unlink(`${assetPath}.thumb`).catch(() => {});
    await fsp.unlink(`${assetPath}.web`).catch(() => {});
    await updateUsage(username, -stats.size);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
}

module.exports = {
  saveAsset,
  deleteAsset,
};
