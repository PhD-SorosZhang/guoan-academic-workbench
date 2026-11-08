// SCH-023 虚假引用 / 假 DOI 检测
// 第一步：本地正则筛 DOI；第二步：在线 HEAD doi.org 校验（带超时与缓存）。
// 离线或被 CORS 拦时，在线校验自动降级为"未核验"，不假装已通过。
const DOI_RE = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi;
const CACHE = 'beta:doi:cache';

function cache() {
  try { return JSON.parse(localStorage.getItem(CACHE) || '{}'); } catch { return {}; }
}
function saveCache(c) {
  try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch {}
}

export function parseDOIs(text) {
  const m = String(text || '').match(DOI_RE) || [];
  return [...new Set(m.map((s) => s.trim().replace(/[.,;)\]]+$/, '')))];
}

export function looksReal(doi) {
  DOI_RE.lastIndex = 0;
  return DOI_RE.test(doi);
}

// 在线校验单个 DOI；返回 {doi, status: 'ok'|'dead'|'unknown'}
export async function verifyDOI(doi) {
  const c = cache();
  if (c[doi]) return c[doi];
  let out = { doi, status: 'unknown' };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://doi.org/' + encodeURIComponent(doi), {
      method: 'HEAD', redirect: 'follow', signal: ctrl.signal
    });
    clearTimeout(timer);
    out.status = (res.status >= 200 && res.status < 400) ? 'ok' : 'dead';
  } catch {
    out.status = 'unknown'; // 网络/CORS：不判定为假，仅标记未核验
  }
  c[doi] = out; saveCache(c);
  return out;
}

// 批量审计参考文献文本；返回 {verified, suspect, unchecked}
export async function auditReferences(text) {
  const dois = parseDOIs(text);
  const verified = [], suspect = [], unchecked = [];
  for (const d of dois) {
    const r = await verifyDOI(d);
    if (r.status === 'ok') verified.push(d);
    else if (r.status === 'dead') suspect.push(d);
    else unchecked.push(d);
  }
  // 无 DOI 的条目不判假，只提醒人工核对
  return {
    total: dois.length, verified, suspect, unchecked,
    note: suspect.length
      ? '以下 DOI 解析失败，疑似虚构，请逐条人工核对：' + suspect.join('; ')
      : (unchecked.length
        ? '在线校验不可达，' + unchecked.length + ' 条 DOI 尚未核验，导出前请人工确认。'
        : '全部 DOI 在线解析通过。')
  };
}
