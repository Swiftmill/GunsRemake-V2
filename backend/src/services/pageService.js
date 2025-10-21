const path = require('node:path');
const fsp = require('node:fs/promises');
const { writeJSON, readJSON } = require('../lib/fileStore');
const { paths } = require('../config');

function pagePath(username) {
  return path.join(paths.usersDir, `${username}.json`);
}

async function getPage(username) {
  return readJSON(pagePath(username), null);
}

async function savePage(username, payload) {
  const existing = await getPage(username);
  if (!existing) {
    throw new Error('Page not found');
  }
  const updated = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  await writeJSON(pagePath(username), updated);
  return updated;
}

async function listPages() {
  const entries = await fsp.readdir(paths.usersDir);
  const pages = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const username = entry.replace('.json', '');
    const data = await getPage(username);
    if (data) pages.push(data);
  }
  return pages;
}

module.exports = {
  getPage,
  savePage,
  listPages,
};
