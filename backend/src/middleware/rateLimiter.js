const buckets = new Map();

function rateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  return (req, res) => {
    const key = req.ip;
    const now = Date.now();
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    const timestamps = buckets.get(key);
    while (timestamps.length && now - timestamps[0] > windowMs) {
      timestamps.shift();
    }
    if (timestamps.length >= max) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many requests' }));
      return false;
    }
    timestamps.push(now);
    return true;
  };
}

module.exports = { rateLimiter };
