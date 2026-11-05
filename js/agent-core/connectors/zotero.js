// ===== Zotero 连接器 =====
// 走 Zotero 7 本地 API（需在 Zotero 设置中勾选允许本机应用通信）
// 若本地 API 不可用，提供「粘贴 Zotero 导出」兜底，不中断流程
import { getJSON } from '../net/http.js';
import { getConfig } from '../config.js';

function mapZoteroItem(it) {
  const d = it.data || it;
  const creators = (d.creators || []).map((c) =>
    c.lastName ? (c.lastName + (c.firstName ? ', ' + c.firstName : '')) : (c.name || '')
  ).filter(Boolean);

  const year = (d.date || '').match(/\d{4}/);
  const itemType = d.itemType || '';

  return {
    title: d.title || '',
    authors: creators,
    year: year ? year[0] : '',
    doi: d.DOI || '',
    venue: d.publicationTitle || d.bookTitle || d.publisher || '',
    type: itemType,
    citedBy: 0,
    abstract: (d.abstractNote || '').slice(0, 1600),
    url: d.url || (d.DOI ? 'https://doi.org/' + d.DOI : ''),
    pdfUrl: '',
    relevance: 0.6,
    source: 'zotero',
    tags: (d.tags || []).map((t) => t.tag).filter(Boolean),
    zoteroKey: d.key || it.key || ''
  };
}

export async function probeZotero() {
  const base = getConfig().zotero.apiBase;
  try {
    const json = await getJSON(base + '/items?limit=1&format=json', { useCache: false });
    return { ok: true, count: Array.isArray(json) ? json.length : 0 };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function searchZotero(query, opts = {}) {
  const base = getConfig().zotero.apiBase;
  const limit = opts.perPage || 50;
  const params = new URLSearchParams({ limit: String(limit), format: 'json' });
  if (query) params.set('q', query);
  if (opts.tag) params.set('tag', opts.tag);

  const url = base + '/items?' + params.toString();
  const json = await getJSON(url, { useCache: false, force: true });
  const items = Array.isArray(json) ? json : [];
  return items
    .filter((it) => {
      const d = it.data || it;
      return !['attachment', 'note', 'annotation'].includes(d.itemType);
    })
    .map(mapZoteroItem)
    .filter((x) => x.title);
}

// 兜底：用户从 Zotero「导出 → JSON」粘贴进来
export function parseZoteroExport(jsonText) {
  let parsed;
  try { parsed = JSON.parse(jsonText); } catch (e) {
    throw new Error('Zotero 导出内容不是合法 JSON');
  }
  const arr = Array.isArray(parsed) ? parsed : (parsed.items || []);
  return arr.map(mapZoteroItem).filter((x) => x.title);
}
