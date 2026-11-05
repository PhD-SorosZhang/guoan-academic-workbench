// ===== 带缓存 / 重试 / 限流的 HTTP 层 =====
import { getConfig } from '../config.js';
import { acquire, withConcurrency } from './limiter.js';
import { createStore } from '../store/idb.js';

const cache = createStore('AgentCacheDB', 1, (db) => {
  if (!db.objectStoreNames.contains('http')) db.createObjectStore('http', { keyPath: 'k' });
});

function cacheKey(url) { return 'h:' + url; }
function ttlMs() { return Number(getConfig().scholar.cacheTTLHours || 72) * 3600 * 1000; }

export async function getJSON(url, opts = {}) {
  const { useCache = true, force = false } = opts;

  if (useCache && !force) {
    try {
      const hit = await cache.get('http', cacheKey(url));
      if (hit && Date.now() - hit.t < ttlMs()) return hit.v;
    } catch (e) {}
  }

  const resp = await withConcurrency(() => rawFetch(url, opts));
  const json = await resp.json();

  if (useCache) {
    try { await cache.put('http', { k: cacheKey(url), t: Date.now(), v: json }); } catch (e) {}
  }
  return json;
}

async function rawFetch(url, opts) {
  const cfg = getConfig().net;
  const host = new URL(url, location.href).host;
  let attempt = 0;
  let lastErr = null;

  while (attempt <= cfg.retries) {
    await acquire(host);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
    try {
      const resp = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'Accept': 'application/json', ...(opts.headers || {}) }
      });
      clearTimeout(timer);

      if (resp.status === 429 || resp.status >= 500) {
        lastErr = new Error('HTTP ' + resp.status + ' @ ' + host);
        attempt += 1;
        await sleep(Math.min(1000 * Math.pow(2, attempt), 8000));
        continue;
      }
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' @ ' + host);
      return resp;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      attempt += 1;
      if (attempt > cfg.retries) break;
      await sleep(Math.min(800 * Math.pow(2, attempt), 5000));
    }
  }
  throw lastErr || new Error('request failed: ' + url);
}

export async function text(url, opts = {}) {
  const resp = await withConcurrency(() => rawFetch(url, opts));
  return resp.text();
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export async function clearHttpCache() {
  try { await cache.clear('http'); } catch (e) {}
}

export function withMailto(url) {
  const m = getConfig().scholar.mailto;
  if (!m) return url;
  return url + (url.includes('?') ? '&' : '?') + 'mailto=' + encodeURIComponent(m);
}
