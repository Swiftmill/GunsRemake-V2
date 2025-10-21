const fsp = require('node:fs/promises');
const path = require('node:path');
const { paths } = require('../config');
const { readJSON, writeJSON } = require('../lib/fileStore');
const { hashPassword, verifyPassword } = require('../lib/security');

async function getUserIndex() {
  return readJSON(paths.userIndexFile, { users: [] });
}

async function saveUserIndex(index) {
  await writeJSON(paths.userIndexFile, index);
}

async function findUserRecord(username) {
  const index = await getUserIndex();
  return { index, user: index.users.find((entry) => entry.username === username) || null };
}

async function findUser(username) {
  const { user } = await findUserRecord(username);
  return user ? { ...user, passwordHash: undefined } : null;
}

async function authenticateUser(username, password) {
  const { user } = await findUserRecord(username);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

async function createUser(payload) {
  const index = await getUserIndex();
  if (index.users.some((user) => user.username === payload.username)) {
    throw new Error('User already exists');
  }
  const passwordHash = hashPassword(payload.password);
  const user = {
    username: payload.username,
    displayName: payload.displayName ?? payload.username,
    passwordHash,
    roles: payload.roles ?? ['user'],
    quotaMb: payload.quotaMb ?? 500,
    usedBytes: 0,
    createdAt: new Date().toISOString(),
  };
  index.users.push(user);
  await saveUserIndex(index);
  await ensureUserFiles(user.username);
  const { passwordHash: _, ...safe } = user;
  return safe;
}

async function ensureUserFiles(username) {
  const pagePath = path.join(paths.usersDir, `${username}.json`);
  const exists = await fsp.access(pagePath).then(() => true).catch(() => false);
  if (!exists) {
    const defaultPage = {
      username,
      sections: [],
      badges: [],
      links: [],
      gallery: [],
      theme: 'default',
      background: null,
      audio: null,
      avatar: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeJSON(pagePath, defaultPage);
  }
}

async function updateUser(username, updates) {
  const index = await getUserIndex();
  const user = index.users.find((entry) => entry.username === username);
  if (!user) {
    throw new Error('User not found');
  }
  if (updates.password) {
    user.passwordHash = hashPassword(updates.password);
  }
  if (typeof updates.displayName === 'string') {
    user.displayName = updates.displayName;
  }
  if (typeof updates.quotaMb === 'number') {
    user.quotaMb = updates.quotaMb;
  }
  if (Array.isArray(updates.roles)) {
    user.roles = updates.roles;
  }
  await saveUserIndex(index);
  const { passwordHash: _, ...safe } = user;
  return safe;
}

async function listUsers() {
  const index = await getUserIndex();
  return index.users.map(({ passwordHash, ...rest }) => rest);
}

async function updateUsage(username, deltaBytes) {
  const index = await getUserIndex();
  const user = index.users.find((entry) => entry.username === username);
  if (!user) throw new Error('User not found');
  user.usedBytes = Math.max(0, (user.usedBytes ?? 0) + deltaBytes);
  await saveUserIndex(index);
  return user.usedBytes;
}

module.exports = {
  getUserIndex,
  saveUserIndex,
  findUser,
  authenticateUser,
  createUser,
  updateUser,
  listUsers,
  updateUsage,
  ensureUserFiles,
};
