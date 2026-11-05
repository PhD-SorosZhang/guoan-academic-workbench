// ===== 按域名的令牌桶限流 + 并发闸门 =====
import { getConfig } from '../config.js';

const buckets = new Map();

function bucketFor(host) {
  if (!buckets.has(host)) {
    const cfg = getConfig().net.rateLimit || {};
    const rate = Number(cfg[host] || cfg.default || 3);
    buckets.set(host, { rate, tokens: rate, last: Date.now() });
  }
  return buckets.get(host);
}

export async function acquire(host) {
  const b = bucketFor(host);
  while (true) {
    const now = Date.now();
    const elapsed = (now - b.last) / 1000;
    b.last = now;
    b.tokens = Math.min(b.rate, b.tokens + elapsed * b.rate);
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil(((1 - b.tokens) / b.rate) * 1000);
    await new Promise((r) => setTimeout(r, Math.max(waitMs, 20)));
  }
}

// 全局并发闸门
let active = 0;
const waiting = [];

export async function withConcurrency(fn) {
  const limit = Number(getConfig().net.concurrency || 3);
  if (active >= limit) {
    await new Promise((r) => waiting.push(r));
  }
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    const next = waiting.shift();
    if (next) next();
  }
}
