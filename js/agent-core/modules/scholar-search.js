// ===== 检索任务：主题扩展 → 多源并行检索 → 去重排序 → 可选入库 =====
import { callModelJSON } from '../model-bridge.js';
import { hasLLM } from '../config.js';
import { multiSearch } from '../connectors/index.js';
import { buildChineseSourceLinks, buildCnkiExpression } from '../connectors/cnki.js';
import { dedupe, buildLocalIndex, compactTitle } from '../dedup/dedup.js';

/**
 * 用模型把中文主题拆成中英双语概念组，提升英文库命中率
 * 返回 { concepts: [[..],[..]], enQuery, cnQuery }
 */
async function expandQuery(topic, manualEn) {
  // 用户手填英文检索词时直接用，省掉一次模型调用
  if (manualEn && String(manualEn).trim()) {
    return { concepts: [], enQuery: String(manualEn).trim(), cnQuery: topic };
  }
  if (!hasLLM()) {
    // 未配模型时无法生成英文检索式；中文主题直接丢给国际库只会拿回噪声结果，故跳过
    const isCJK = /[\u4e00-\u9fa5]/.test(topic);
    return { concepts: [], enQuery: isCJK ? '' : topic, cnQuery: topic };
  }
  const sys = [
    '你是国家安全学、国际关系领域的文献检索专家。',
    '任务：把用户给出的中文研究主题，拆解成 2-4 组核心概念，并为每组给出英文同义词扩展。',
    '要求：',
    '1. 英文术语必须使用该领域学术共同体的通行译法，不要生造；',
    '2. 每组 3-5 个词，含上位词与近义词；',
    '3. enQuery 用 AND 连接各组，组内用 OR，长度控制在 60 词以内；',
    '4. cnQuery 保留中文核心词，供中文库使用；',
    '5. 严格输出 JSON：{"concepts":[["词1","词2"]],"enQuery":"...","cnQuery":"..."}'
  ].join('\n');

  try {
    const r = await callModelJSON(sys, '研究主题：' + topic, { temperature: 0.15 });
    return {
      concepts: r.concepts || [],
      enQuery: r.enQuery || topic,
      cnQuery: r.cnQuery || topic
    };
  } catch (e) {
    const fallbackCJK = /[\u4e00-\u9fa5]/.test(topic);
    return { concepts: [], enQuery: fallbackCJK ? '' : topic, cnQuery: topic, error: e.message };
  }
}

export async function runScholarSearch(params, ctx) {
  const topic = (params.topic || '').trim();
  if (!topic) throw new Error('请填写检索主题');

  const libIndex = params.existing || buildLocalIndex((window.V8Bridge && window.V8Bridge.data.refs) || []);

  let expansion;
  const manualEn = (params.enKeywords || '').trim();
  if (params.expand === false) {
    const isCJK = /[\u4e00-\u9fa5]/.test(topic);
    expansion = { concepts: [], enQuery: isCJK ? manualEn : (manualEn || topic), cnQuery: topic };
  } else {
    expansion = await expandQuery(topic, manualEn);
  }

  // 中文来源用简化的中文查询，英文来源用扩展后的英文查询
  const queryBySource = {};
  const sources = params.sources || undefined;

  const { items, report } = await multiSearchWithRouting(expansion, sources, params, libIndex);

  const topN = params.topN || 15;
  const picked = items.slice(0, topN);
  picked.forEach((p) => { p.score = p.score || 0; });

  const result = {
    topic,
    expansion,
    count: picked.length,
    items: picked,
    report,
    chineseLinks: buildChineseSourceLinks(expansion.cnQuery || topic),
    cnkiExpression: buildCnkiExpression(
      // 知网检索式只用中文词，英文同义词留给国际库
      (expansion.concepts || [])
        .map((g) => g.filter((t) => /[\u4e00-\u9fa5]/.test(t)))
        .filter((g) => g.length)
        .concat((expansion.concepts || []).length ? [] : [[topic]])
    ),
    imported: 0
  };

  if (params.autoImport && window.V8Bridge) {
    result.imported = importRefs(picked);
  }

  result.text = formatSearchResult(result);
  return result;
}

async function multiSearchWithRouting(expansion, sources, params, libIndex) {
  // 英文库用扩展后的英文检索式，Zotero 用中文原词
  const all = [];
  const report = [];

  const wantZotero = !sources || sources.includes('zotero');
  const askedEn = !sources || sources.some((s) => s !== 'zotero');
  const wantEn = askedEn && Boolean(expansion.enQuery);

  if (askedEn && !expansion.enQuery) {
    report.push({
      source: '国际库',
      ok: false,
      count: 0,
      error: '未生成英文检索式，已跳过；可在参数里填英文关键词，或在设置里配置模型'
    });
  }

  if (wantEn) {
    const enSources = (sources || ['openalex', 'crossref', 'semanticscholar']).filter((s) => s !== 'zotero');
    const r = await multiSearch(expansion.enQuery, {
      sources: enSources,
      perPage: params.perPage || 20,
      fromYear: params.fromYear,
      force: params.force
    });
    all.push(...r.items);
    report.push(...r.report);
  }

  if (wantZotero) {
    try {
      const { searchZotero } = await import('../connectors/zotero.js');
      const z = await searchZotero(expansion.cnQuery || expansion.enQuery, { perPage: 50 });
      all.push(...z);
      report.push({ source: 'zotero', ok: true, count: z.length, error: null });
    } catch (e) {
      report.push({ source: 'zotero', ok: false, count: 0, error: e.message });
    }
  }

  const merged = dedupe(all, []);

  // 标记哪些已经在本地文献库里，避免重复入库，但仍展示给用户
  const libDois = new Set((libIndex || []).map((x) => String(x.doi || '').toLowerCase()).filter(Boolean));
  const libTitles = new Set((libIndex || []).map((x) => compactTitle(x.title)));
  merged.forEach((it) => {
    const d = String(it.doi || '').toLowerCase();
    it.inLibrary = (d && libDois.has(d)) || libTitles.has(compactTitle(it.title));
  });

  return { items: merged, report };
}

export function importRefs(items) {
  if (!window.V8Bridge) return 0;
  let n = 0;
  for (const it of items) {
    if (it.inLibrary) continue;
    const ref = {
      title: it.title,
      author: (it.authors || []).join('; '),
      source: it.venue || (it.sources && it.sources.join('/')) || '',
      year: String(it.year || ''),
      tags: [it.source || 'agent', (it.doi ? 'DOI' : '')].filter(Boolean).join(','),
      note: [
        it.doi ? 'DOI: ' + it.doi : '',
        it.url ? 'URL: ' + it.url : '',
        it.abstract ? '摘要: ' + it.abstract.slice(0, 500) : '',
        '来源库: ' + ((it.sources && it.sources.join('+')) || it.source || '')
      ].filter(Boolean).join('\n'),
      doi: it.doi || '',
      url: it.url || '',
      citedBy: it.citedBy || 0,
      agentScore: it.score || 0
    };
    try {
      window.V8Bridge.insertRef(ref);
      n += 1;
    } catch (e) {}
  }
  return n;
}

/** 渲染成可读文本，供链式任务传给下游精读/综述 */
export function formatSearchResult(result) {
  const lines = [];
  lines.push('【检索主题】' + result.topic);
  lines.push('【英文检索式】' + (result.expansion.enQuery || '未生成（未配置模型且未填英文关键词，国际库已跳过）'));
  if (result.cnkiExpression) lines.push('【知网高级检索式】' + result.cnkiExpression);
  lines.push('【命中结果】共 ' + result.count + ' 条（已跨库去重）');
  lines.push('');

  result.items.forEach((it, i) => {
    lines.push((i + 1) + '. ' + it.title);
    lines.push('   作者：' + ((it.authors || []).slice(0, 3).join('; ') || '未标注'));
    lines.push('   年份：' + (it.year || '—') + '｜期刊：' + (it.venue || '—') + '｜被引：' + (it.citedBy || 0));
    lines.push('   来源库：' + ((it.sources && it.sources.join(' + ')) || it.source || '—') + '｜综合分：' + (it.score || 0));
    if (it.doi) lines.push('   DOI：' + it.doi);
    if (it.abstract) lines.push('   摘要：' + it.abstract.slice(0, 220).replace(/\s+/g, ' ') + '…');
    lines.push('');
  });

  const failed = result.report.filter((r) => !r.ok);
  if (failed.length) {
    lines.push('【未连通来源】' + failed.map((f) => f.source + '(' + f.error + ')').join('；'));
  }
  if (result.imported) lines.push('【已入库】' + result.imported + ' 条写入工作台文献库');

  return lines.join('\n');
}
