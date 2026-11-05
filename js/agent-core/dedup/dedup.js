// ===== 检索结果去重与合并 =====
// 判重优先级：DOI > 规范化标题完全相同 > 标题高相似 + 同年 + 作者重叠

export function normTitle(s) {
  return String(s || '')
    .toLowerCase()
    // 先把缩写点去掉，避免 "E.U." 与 "EU" 被判成两个词
    .replace(/\./g, '')
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 压缩形式：去掉全部非字母数字与汉字，用于判同 */
export function compactTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function normDoi(d) {
  if (!d) return '';
  return String(d).toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:/, '').trim();
}

function tokens(s) {
  return normTitle(s).split(' ').filter((x) => x.length > 1);
}

// Jaccard 相似度
export function titleSim(a, b) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((x) => { if (tb.has(x)) inter += 1; });
  return inter / (ta.size + tb.size - inter);
}

function firstAuthor(authors) {
  if (!authors || !authors.length) return '';
  const a = authors[0];
  const name = String(typeof a === 'string' ? a : (a.name || a.family || '')).trim();
  if (!name) return '';
  // "Mearsheimer, John" 取逗号前；"John Mearsheimer" 取最后一段
  if (name.includes(',')) return name.split(',')[0].toLowerCase().trim();
  return name.toLowerCase().split(' ').pop();
}

function yearOf(item) {
  const y = item.year || item.published || '';
  const m = String(y).match(/\d{4}/);
  return m ? m[0] : '';
}

/**
 * 合并多源结果，按质量排序。
 * @param {Array} incoming 新结果
 * @param {Array} existing 已存在（可来自本地库）
 * @param {Object} opts {threshold}
 */
export function dedupe(incoming, existing = [], opts = {}) {
  const threshold = opts.threshold ?? 0.86;
  const out = [];
  const byDoi = new Map();
  const kept = [];

  // 先把已有条目建立索引
  for (const e of existing) {
    if (e && e.doi) byDoi.set(normDoi(e.doi), e);
    kept.push(e);
  }

  for (const item of incoming) {
    const doi = normDoi(item.doi);
    if (doi && byDoi.has(doi)) {
      mergeInto(byDoi.get(doi), item);
      continue;
    }

    const nt = normTitle(item.title);
    const ct = compactTitle(item.title);
    let dup = null;
    for (const k of kept) {
      if (!k) continue;
      const kt = normTitle(k.title);
      if (kt && (kt === nt || (ct && compactTitle(k.title) === ct))) { dup = k; break; }
      const y1 = yearOf(item), y2 = yearOf(k);
      if (y1 && y2 && y1 === y2 && titleSim(item.title, k.title) >= threshold) {
        const a1 = firstAuthor(item.authors), a2 = firstAuthor(k.authors);
        if (!a1 || !a2 || a1 === a2) { dup = k; break; }
      }
    }

    if (dup) { mergeInto(dup, item); continue; }

    const copy = { ...item };
    copy.sources = item.sources ? item.sources.slice() : (item.source ? [item.source] : []);
    if (doi) byDoi.set(doi, copy);
    kept.push(copy);
    out.push(copy);
  }

  // 合并后重新算分并排序（只返回本次新增/合并进来的条目，不把已有库条目混进结果）
  const merged = out.filter(Boolean);
  merged.forEach(score);
  merged.sort((a, b) => (b.score || 0) - (a.score || 0));
  return merged;
}

function mergeInto(target, item) {
  if (!target.sources) target.sources = [];
  const src = item.source || (item.sources && item.sources[0]);
  if (src && !target.sources.includes(src)) target.sources.push(src);

  // 摘要取更长的那份
  if ((item.abstract || '').length > (target.abstract || '').length) target.abstract = item.abstract;
  // 引用数取大
  if ((item.citedBy || 0) > (target.citedBy || 0)) target.citedBy = item.citedBy;
  // 补缺失字段
  if (!target.doi && item.doi) target.doi = item.doi;
  if (!target.venue && item.venue) target.venue = item.venue;
  if (!target.year && item.year) target.year = item.year;
  if (!target.authors || !target.authors.length) target.authors = item.authors;
  if (!target.url && item.url) target.url = item.url;
  if (!target.pdfUrl && item.pdfUrl) target.pdfUrl = item.pdfUrl;
}

/**
 * 综合打分：主题相关 + 引文影响 + 时效性
 * relevance 由连接器给出（0~1），没有则按 0.5 处理
 */
export function score(item) {
  const relevance = item.relevance ?? 0.5;
  const cites = Math.log10((item.citedBy || 0) + 1) / 3; // 规范化 ~0-1.3
  const y = Number(item.year) || 0;
  const now = new Date().getFullYear();
  const freshness = y ? Math.max(0, 1 - (now - y) / 20) : 0.3;
  const hasAbstract = item.abstract ? 0.05 : 0;
  item.score = Number((relevance * 0.6 + Math.min(cites, 1) * 0.25 + freshness * 0.15 + hasAbstract).toFixed(4));
  return item.score;
}

export function buildLocalIndex(refs) {
  return (refs || []).map((r) => ({
    title: r.title,
    authors: r.author ? String(r.author).split(/[,，;；]/).map((s) => s.trim()) : [],
    year: r.year,
    doi: r.doi,
    venue: r.source,
    url: r.url,
    source: 'local',
    abstract: r.note || '',
    citedBy: 0,
    relevance: 0.5
  }));
}
