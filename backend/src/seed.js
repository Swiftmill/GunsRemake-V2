const { paths } = require('./config');
const { createUser, ensureUserFiles } = require('./services/userService');
const { savePage } = require('./services/pageService');
const { addBadge } = require('./services/badgeService');

async function seed() {
  const users = [
    { username: 'swift', password: 'swiftpass', displayName: 'Swift', roles: ['user'], quotaMb: 200 },
    { username: 'moh', password: 'mohpass', displayName: 'Moh', roles: ['user'], quotaMb: 200 },
    { username: 'hris', password: 'hrispass', displayName: 'Hris', roles: ['user'], quotaMb: 200 },
    { username: 'admin', password: 'adminpass', displayName: 'Administrator', roles: ['admin'], quotaMb: 500 },
  ];

  const createdUsers = [];
  for (const user of users) {
    try {
      const created = await createUser(user);
      createdUsers.push(created);
    } catch (error) {
      if (!error.message.includes('exists')) {
        console.error(error);
      }
      createdUsers.push({ username: user.username });
    }
    await ensureUserFiles(user.username);
  }

  const pages = {
    swift: {
      bio: 'full-stack dev • synthwave enjoyer',
      background: null,
      audio: null,
      avatar: null,
      theme: 'neon-night',
      links: [
        { label: 'Twitter', url: 'https://twitter.com/swift' },
        { label: 'Soundcloud', url: 'https://soundcloud.com/swift' },
      ],
      badges: ['founder', 'verified'],
      gallery: [],
      sections: [
        { title: 'About', content: 'Building blazing fast bio pages.' },
      ],
    },
    moh: {
      bio: 'music curator',
      background: null,
      audio: null,
      avatar: null,
      theme: 'dawn',
      links: [
        { label: 'Discord', url: 'https://discord.gg/guns' },
      ],
      badges: ['mod'],
      gallery: [],
      sections: [],
    },
    hris: {
      bio: 'guns.lol legend',
      background: null,
      audio: null,
      avatar: null,
      theme: 'royal',
      links: [
        { label: 'guns.lol', url: 'https://guns.lol' },
      ],
      badges: ['vip'],
      gallery: [],
      sections: [],
    },
  };

  for (const [username, config] of Object.entries(pages)) {
    await savePage(username, config);
  }

  const badges = [
    { id: 'founder', label: 'Founder', icon: '★' },
    { id: 'verified', label: 'Verified', icon: '✔' },
    { id: 'mod', label: 'Moderator', icon: '🛡' },
    { id: 'vip', label: 'VIP', icon: '💎' },
  ];
  for (const badge of badges) {
    try {
      await addBadge(badge);
    } catch (error) {
      if (!error.message.includes('exists')) {
        console.error(error);
      }
    }
  }

  console.log('Seed complete for users:', createdUsers.map((u) => u.username).join(', '));
  console.log(`Data directory: ${paths.rootDir}`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
