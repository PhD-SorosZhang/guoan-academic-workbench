// SCH-006 三档防御性写作清洗：light / journal / high_sanitize
// 这里只产出结构化提示词与约束，真正改写仍走模型；返回值可直接拼进 prompt。
export const PROFILES = {
  light: {
    label: '轻度润色',
    rewriteRatio: 0.2,
    rules: [
      '只删除明显的 AI 套话（"值得注意的是""综上所述""在当今时代"）。',
      '保持作者原有论证与术语不变。',
      '不改变句子长度与句式节奏。'
    ]
  },
  journal: {
    label: '期刊安全档',
    rewriteRatio: 0.5,
    rules: [
      '压缩空泛修饰，替换为具体判断。',
      '把"本文认为/本文将"改为更克制的学术表述。',
      '删除排比式堆砌，保留论点强度。',
      '不新增任何未提供证据的论断。'
    ]
  },
  high_sanitize: {
    label: '高痕迹脱敏档',
    rewriteRatio: 0.8,
    rules: [
      '全面重写句式，打破"首先/其次/最后"模板。',
      '长短句交错，避免均匀节奏。',
      '替换高频 AI 连接词。',
      '保留所有事实、引用与数据，只改表达。'
    ]
  }
};

export function buildSanitizePrompt(text, profileKey, opts = {}) {
  const p = PROFILES[profileKey] || PROFILES.journal;
  return {
    profile: profileKey,
    system: [
      '你是中文政治学/国际关系期刊的资深编辑。按以下规则改写，',
      '只输出改写后的正文，不要解释、不要列修改清单。',
      ...p.rules
    ].join('\n'),
    user: opts.selectionOnly
      ? `请改写下面这一段（段内自行决定句序）：\n\n${text}`
      : `请改写全文，保持章节结构与引用占位不变：\n\n${text}`,
    expectedReport: {
      rewriteRatio: p.rewriteRatio,
      trackChanges: true,
      rollbackAvailable: true,
      note: '前端会保留原文快照，可一键回滚。'
    }
  };
}
