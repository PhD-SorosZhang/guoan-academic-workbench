// ===== 多源检索聚合：并行扇出 + 部分失败降级 + 去重排序 =====
import { getConfig } from '../config.js';
import { searchOpenAlex } from './openalex.js';
import { searchCrossref } from './crossref.js';
import { searchSemanticScholar } from './semanticscholar.js';
import { searchZotero } from './zotero.js';
import { dedupe } from '../dedup/dedup.js';

const REGISTRY = {
  openalex: searchOpenAlex,
  crossref: searchCrossref,
  semanticscholar: searchSemanticScholar,
  zotero: searchZotero
};

/**
 * @param {string} query
 * @param {Object} opts {sources, perPage, fromYear, existing, force}
 * @returns {Promise<{items:Array, report:Array}>}
 */
export async function multiSearch(query, opts = {}) {
  const cfg = getConfig().scholar;
  const sources = opts.sources && opts.sources.length ? opts.sources : cfg.sources;
  const perPage = opts.perPage || cfg.pageSize;

  const fromYear = opts.fromYear !== undefined
    ? opts.fromYear
    : (cfg.years ? String(new Date().getFullYear() - Number(cfg.years)) : null);

  const report = [];

  const tasks = sources.map((name) => {
    const fn = REGISTRY[name];
    if (!fn) {
      report.push({ source: name, ok: false, count: 0, error: '未知来源' });
      return Promise.resolve([]);
    }
    return fn(query, { perPage, fromYear, force: opts.force })
      .then((items) => {
        report.push({ source: name, ok: true, count: items.length, error: null });
        return items;
      })
      .catch((e) => {
        report.push({ source: name, ok: false, count: 0, error: e.message || String(e) });
        return [];
      });
  });

  const settled = await Promise.all(tasks);
  const merged = dedupe(settled.flat(), opts.existing || []);

  return { items: merged, report };
}

/** 单源探测，用于设置页显示连通状态 */
export async function probeSources() {
  const out = [];
  for (const name of Object.keys(REGISTRY)) {
    try {
      const r = await REGISTRY[name]('national security', { perPage: 2 });
      out.push({ source: name, ok: true, sample: r.length });
    } catch (e) {
      out.push({ source: name, ok: false, error: e.message });
    }
  }
  return out;
}
