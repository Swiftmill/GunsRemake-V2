#!/usr/bin/env node
const { paths } = require('../config');
const fs = require('node:fs');

if (!fs.existsSync(paths.rootDir)) {
  console.error(`Missing data directory at ${paths.rootDir}`);
  process.exit(1);
}

console.log('Data directory present:', paths.rootDir);
process.exit(0);
