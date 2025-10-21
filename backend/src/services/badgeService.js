const { paths } = require('../config');
const { readJSON, writeJSON } = require('../lib/fileStore');

async function getBadges() {
  return readJSON(paths.badgesFile, { badges: [] });
}

async function saveBadges(data) {
  await writeJSON(paths.badgesFile, data);
}

async function addBadge(badge) {
  const data = await getBadges();
  if (data.badges.some((entry) => entry.id === badge.id)) {
    throw new Error('Badge already exists');
  }
  data.badges.push({ ...badge, createdAt: new Date().toISOString() });
  await saveBadges(data);
  return badge;
}

async function updateBadge(id, updates) {
  const data = await getBadges();
  const badge = data.badges.find((entry) => entry.id === id);
  if (!badge) throw new Error('Badge not found');
  Object.assign(badge, updates, { updatedAt: new Date().toISOString() });
  await saveBadges(data);
  return badge;
}

async function removeBadge(id) {
  const data = await getBadges();
  data.badges = data.badges.filter((badge) => badge.id !== id);
  await saveBadges(data);
}

module.exports = {
  getBadges,
  addBadge,
  updateBadge,
  removeBadge,
};
