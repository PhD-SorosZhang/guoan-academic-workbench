// SCH-002 + SCH-003：文献分级（A/B/C/D）+ 同 DOI 多源元数据融合
const TIER_ORDER = { A: 0, B: 1, C: 2, D: 3 };

// 来源 → 等级。A=目标顶刊；B=核心/SSCI/CSSCI；C=预印本/学位论文；D=网页/自媒体。
const TIER_MAP = {
  target_journal: 'A', cssci: 'B', ssci: 'B', core: 'B',
  preprint: 'C', phdthesis: 'C', masterthesis: 'C',
  webpage: 'D', blog: 'D', news: 'D'
};

export function tierOf(item) {
  if (item && item.isTargetJournal) return 'A';
  return TIER_MAP[(item && item.sourceType) || ''] || 'D';
}

// SCH-002：打等级；写作阶段默认剔除 D；按等级排序
export function attachTier(hits, phase = 'search') {
  const tagged = (hits || []).map((h) => ({ ...h, sourceTier: tierOf(h) }));
  const kept = phase === 'writing' ? tagged.filter((h) => h.sourceTier !== 'D') : tagged;
  return kept.sort((a, b) => TIER_ORDER[a.sourceTier] - TIER_ORDER[b.sourceTier]);
}

// SCH-003：同 DOI 记录融合。优先保留带页码/卷期/年的；冲突字段记 ambiguous。
export function normalizeByDOI(records) {
  const byDOI = new Map();
  for (const r of records || []) {
    const key = (r.doi || '').trim().toLowerCase();
    if (!key) continue;
    if (!byDOI.has(key)) {
      byDOI.set(key, { ...r, ambiguous: {} });
    } else {
      const cur = byDOI.get(key);
      for (const f of ['pages', 'volume', 'issue', 'year']) {
        if (r[f] && cur[f] && String(r[f]) !== String(cur[f])) {
          cur.ambiguous[f] = [...new Set([cur[f], r[f]])];
        } else if (r[f] && !cur[f]) {
          cur[f] = r[f]; // 补缺
        }
      }
    }
  }
  const merged = [...byDOI.values()];
  const conflicts = merged.filter((m) => Object.keys(m.ambiguous).length > 0);
  return {
    merged,
    conflictReport: conflicts.map((c) => ({
      doi: c.doi, title: c.title, ambiguous: c.ambiguous
    }))
  };
}
