// SCH-004 证据缺口校验 + SCH-008 长上下文状态锚
// 在选题/大纲/每章初稿三个锚点统计文献结构；不足则返回缺口清单。
export const DEFAULT_THRESHOLDS = {
  minTheory: 2,    // 理论支撑条目
  minCase: 1,      // 实证案例
  minForeign: 3,   // 外文文献
  minTotal: 6
};

export function evidenceCheck(hits, thresholds = DEFAULT_THRESHOLDS) {
  const h = hits || [];
  const c = {
    theory: h.filter((x) => x.tag === 'theory').length,
    case: h.filter((x) => x.tag === 'case').length,
    foreign: h.filter((x) => x.lang === 'en').length,
    total: h.length
  };
  const gaps = [];
  if (c.total < thresholds.minTotal) gaps.push(`文献总量 ${c.total} < 要求 ${thresholds.minTotal}`);
  if (c.theory < thresholds.minTheory) gaps.push(`理论文献 ${c.theory} < ${thresholds.minTheory}`);
  if (c.case < thresholds.minCase) gaps.push(`实证案例 ${c.case} < ${thresholds.minCase}`);
  if (c.foreign < thresholds.minForeign) gaps.push(`外文文献 ${c.foreign} < ${thresholds.minForeign}`);
  return {
    pass: gaps.length === 0,
    counts: c,
    gaps,
    riskLabel: gaps.length ? 'evidence_weak' : null
  };
}

// SCH-008：动态论文状态锚。每轮生成前注入，防止长稿遗忘核心约束。
export function buildStateAnchor(task) {
  return [
    '【论文状态锚】（生成时必须遵守，不得违背）',
    `研究问题：${task.researchQuestion || '（未设定）'}`,
    `核心假设：${(task.assumptions || []).join('；') || '（未设定）'}`,
    `研究边界：${task.boundary || '（未设定）'}`,
    `已确立定义：${Object.entries(task.definitions || {}).map(([k, v]) => k + '=' + v).join('；') || '（无）'}`,
    `待论证命题：${(task.propositions || []).join('；') || '（无）'}`
  ].join('\n');
}

// 检测新段落是否与既有状态锚冲突：出现与核心假设相反的断言
export function conflictWithAnchor(newPara, task) {
  const conflicts = [];
  for (const as of (task.assumptions || [])) {
    // 简单启发：假设里说"存在/强化"，段落里却出现"不存在/无关"
    if (/存在|强化|上升|加剧/.test(as) && /不存在|无关|没有影响|未上升/.test(newPara)) {
      conflicts.push({ assumption: as, para: newPara.slice(0, 60) });
    }
  }
  return conflicts;
}
