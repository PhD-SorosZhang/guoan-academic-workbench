// SCH-024 国家安全领域专属风控（三级：高阻断 / 中复核 / 低提示）
// 规则外置在词库里，可由后续版本扩充；不硬编码进大模型 prompt。
export const RISK_LEXICON = {
  high: [
    /台独/, /藏独/, /港独/, /疆独/,
    /分裂国家/, /颠覆.*政权/, /武装.*政变/,
    /煽动.*暴力/, /恐怖袭击.*(方法|教程|制作)/
  ],
  medium: [
    /南海.*(仲裁|非法)/, /台湾.*(国家|地位)/, /(中印|边境).*(开战|军事冲突)/,
    /涉密/, /内部文件/, /未公开.*情报/, /武器.*(参数|性能).*泄露/
  ],
  low: [
    /国防白皮书/, /军事演习/, /航母/, /反舰弹道导弹/, /核潜艇/
  ]
};

export function scan(text) {
  const t = String(text || '');
  const hits = [];
  for (const re of RISK_LEXICON.high) {
    if (re.test(t)) hits.push({ level: 'high', pattern: re.source });
  }
  for (const re of RISK_LEXICON.medium) {
    if (re.test(t)) hits.push({ level: 'medium', pattern: re.source });
  }
  for (const re of RISK_LEXICON.low) {
    if (re.test(t)) hits.push({ level: 'low', pattern: re.source });
  }
  return hits;
}

// phase: 'input' | 'output' | 'export'
export function gate(text, phase) {
  const hits = scan(text);
  const high = hits.filter((h) => h.level === 'high');
  const medium = hits.filter((h) => h.level === 'medium');
  let action = 'allow';
  if (high.length) action = 'block';
  else if (medium.length) action = 'review';
  else if (hits.length) action = 'flag';
  return {
    phase, action,
    blocked: action === 'block',
    needReview: action === 'review',
    hits,
    msg: action === 'block'
      ? '命中高风险领域表述，已阻断。请改写为学术化、非行动性表述后重试。'
      : action === 'review'
        ? '命中中风险表述，必须人工复核后才能继续：' + medium.map((h) => h.pattern).join('; ')
        : action === 'flag'
          ? '命中低风险话题词，记录在案，不阻断。'
          : '通过。'
  };
}
