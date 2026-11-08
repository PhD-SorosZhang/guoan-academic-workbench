// SCH-019 配额（单机版，localStorage；多租户/团队空间需第二步接后端）
const KEY = 'beta:quota:';
const DAY = 24 * 3600 * 1000;

function today() { return new Date().toISOString().slice(0, 10); }
function load(userId) {
  try { return JSON.parse(localStorage.getItem(KEY + userId) || '{}'); } catch { return {}; }
}
function save(userId, q) { try { localStorage.setItem(KEY + userId, JSON.stringify(q)); } catch {} }

export function checkQuota(userId, resource, limit) {
  const q = load(userId);
  const day = today();
  if (q.day !== day) { q.day = day; q.used = {}; }
  const used = q.used[resource] || 0;
  const left = Math.max(0, limit - used);
  return { resource, used, limit, left, ok: left > 0 };
}

export function consume(userId, resource, n = 1) {
  const q = load(userId);
  const day = today();
  if (q.day !== day) { q.day = day; q.used = {}; }
  q.used[resource] = (q.used[resource] || 0) + n;
  save(userId, q);
  return q.used[resource];
}

export function status(userId) {
  const q = load(userId);
  return { day: q.day, used: q.used || {} };
}
