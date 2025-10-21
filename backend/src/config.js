const path = require('node:path');
const fs = require('node:fs');

const rootDir = process.env.GUNS_DATA_DIR
  ? path.resolve(process.env.GUNS_DATA_DIR)
  : path.resolve(__dirname, '..', '..', 'data', 'guns');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const paths = {
  rootDir,
  usersDir: path.join(rootDir, 'users'),
  userIndexFile: path.join(rootDir, 'users.json'),
  pagesDir: path.join(rootDir, 'pages'),
  badgesFile: path.join(rootDir, 'badges.json'),
  templatesDir: path.join(rootDir, 'templates'),
  assetsDir: path.join(rootDir, 'assets'),
  tempDir: path.join(rootDir, '.tmp'),
  sessionsDir: path.join(rootDir, '.sessions'),
  backupsDir: path.join(rootDir, 'backups'),
};

Object.values(paths).forEach((dir) => {
  if (dir.endsWith('.json')) {
    const parent = path.dirname(dir);
    ensureDir(parent);
  } else {
    ensureDir(dir);
  }
});

module.exports = { paths, ensureDir };
