// SCH-020 审计日志：链式 hash，单条被篡改会断链，便于发现。
// 单机版存在 localStorage；线上版需把同结构写到服务端 append-only 表。
const KEY = 'beta:audit:chain';

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function record({ taskId, action, detail }) {
  const chain = load();
  const prev = chain.length ? chain[chain.length - 1].hash : 'GENESIS';
  const entry = {
    ts: new Date().toISOString(),
    taskId: taskId || '-',
    action,
    detail: detail ? String(detail).slice(0, 200) : '',
    prev
  };
  entry.hash = await sha256(JSON.stringify(entry));
  chain.push(entry);
  try { localStorage.setItem(KEY, JSON.stringify(chain)); } catch {}
  return entry;
}

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

// 校验链是否完整：任何一条被改过，hash 或 prev 就对不上
export async function verifyChain() {
  const chain = load();
  let prev = 'GENESIS';
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.prev !== prev) return { ok: false, brokenAtIndex: i, reason: 'prev 链断裂' };
    const { hash, ...rest } = e;
    const recomputed = await sha256(JSON.stringify(rest));
    if (hash !== recomputed) return { ok: false, brokenAtIndex: i, reason: 'hash 不匹配，日志被改' };
    prev = hash;
  }
  return { ok: true, entries: chain.length };
}

export function recent(n = 20) { return load().slice(-n).reverse(); }
