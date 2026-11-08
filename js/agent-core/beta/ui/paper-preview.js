// SCH-013 实时期刊排版预览（纯前端）
// 把论文文本渲染成 A4 纸样，并按目标期刊模板高亮格式违规点。
// 不是真 Quarto，但视觉上达到"边写边预览"效果。

export const JOURNAL_PRESETS = {
  xiandai: {
    name: '《现代国际关系》',
    font: 'SimSun, serif',
    fontSize: '12pt',
    lineHeight: '1.75',
    abstractMax: 300,
    bodyIndent: '2em',
    rules: ['摘要不超过 300 字', '正文宋体小四', '1.5 倍行距', '参考文献 GB/T 7714-2015']
  },
  taiping: {
    name: '《太平洋学报》',
    font: 'SimSun, serif',
    fontSize: '10.5pt',
    lineHeight: '1.5',
    abstractMax: 200,
    bodyIndent: '2em',
    rules: ['摘要不超过 200 字', '正文宋体五号', '1.25 倍行距']
  }
};

function extractAbstract(text) {
  const m = text.match(/摘要[:：]\s*([\s\S]*?)(关键词|关键字)/);
  return m ? m[1].trim() : '';
}

export function auditFormat(text, journalKey) {
  const j = JOURNAL_PRESETS[journalKey] || JOURNAL_PRESETS.xiandai;
  const warnings = [];
  const abs = extractAbstract(text);
  if (abs && abs.length > j.abstractMax) {
    warnings.push({ level: 'error', msg: `摘要 ${abs.length} 字，超过 ${j.abstractMax} 字上限` });
  }
  const authorYear = (text.match(/\[@[A-Za-z0-9]+\]/g) || []).length;
  if (authorYear > 0) {
    warnings.push({ level: 'warn', msg: `仍有 ${authorYear} 处 [@作者年] 占位引用，定稿前需转 GB/T 7714` });
  }
  const weak = (text.match(/(众所周知|不言而喻|显而易见|值得注意的是)/g) || []).length;
  if (weak > 0) warnings.push({ level: 'warn', msg: `发现 ${weak} 处口语化套话` });
  if (!/参考文献|References/.test(text)) warnings.push({ level: 'error', msg: '缺少"参考文献"小节' });
  return { journal: j.name, warnings };
}

export function renderPaperPreview(text, journalKey) {
  const j = JOURNAL_PRESETS[journalKey] || JOURNAL_PRESETS.xiandai;
  const lines = String(text || '').split(/\n+/).filter((l) => l.trim());
  const paras = lines.map((l) => {
    const s = l.trim();
    if (/^(摘要|关键词|关键字|Abstract)/.test(s)) return `<p style="font-weight:600;margin:6px 0">${escapeHtml(s)}</p>`;
    if (/^(一|二|三|四|五|（[一二三四五六]）|\d+\.)/.test(s) && s.length < 30) return `<h3 style="margin:10px 0 4px">${escapeHtml(s)}</h3>`;
    if (/参考文献|References/.test(s)) return `<h3 style="margin:12px 0 4px">${escapeHtml(s)}</h3>`;
    return `<p style="text-indent:${j.bodyIndent};margin:4px 0">${escapeHtml(s)}</p>`;
  }).join('');
  const audit = auditFormat(text, journalKey);
  const warnHtml = audit.warnings.map((w) =>
    `<div style="padding:4px 8px;margin:2px 0;border-left:3px solid ${w.level === 'error' ? '#c62828' : '#f9a825'};background:#fff8e1;font-size:11px">${w.msg}</div>`
  ).join('');
  return {
    warnings: audit.warnings,
    html: `
      <div style="font-family:${j.font};font-size:${j.fontSize};line-height:${j.lineHeight};color:#000;background:#fff;padding:28px;max-width:620px;margin:0 auto;box-shadow:0 2px 10px rgba(0,0,0,.15)">
        <div style="text-align:center;font-size:14pt;font-weight:700;margin-bottom:14px">论文样稿</div>
        ${paras || '<p style="color:#999">（正文为空）</p>'}
      </div>
      <div style="max-width:620px;margin:8px auto">
        <div style="font-size:11px;color:#666;margin:6px 0">${audit.journal} 格式检查：</div>
        ${warnHtml || '<div style="color:#2e7d32;font-size:11px">✅ 未发现格式问题</div>'}
      </div>
    `
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
