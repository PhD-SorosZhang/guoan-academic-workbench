// ===== 全文合稿：章节拼装 + 层级重编号 + 标点统一 + 引用占位收集（本地计算，不调模型） =====

const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function cnNum(n) {
  if (n <= 10) return CN_NUM[n - 1] || String(n);
  if (n < 20) return '十' + (CN_NUM[n - 11] || '');
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (CN_NUM[tens - 1] || String(tens)) + '十' + (ones ? CN_NUM[ones - 1] : '');
}

/** 统一标点：只在与中文相邻处替换，避免破坏数字、DOI、URL、占位符 */
function normalizePunct(s) {
  let t = String(s);
  t = t.replace(/【\s*(第[一二三四五六七八九十]+章[^】]*)\s*】/g, '$1');
  t = t.replace(/([\u4e00-\u9fa5])\s*,\s*/g, '$1，');
  t = t.replace(/([\u4e00-\u9fa5])\s*;\s*/g, '$1；');
  t = t.replace(/([\u4e00-\u9fa5])\s*:\s*/g, '$1：');
  t = t.replace(/([\u4e00-\u9fa5])\s*\.\s*(?=[\u4e00-\u9fa5])/g, '$1。');
  t = t.replace(/([\u4e00-\u9fa5])\s*\(\s*/g, '$1（');
  t = t.replace(/\s*\)\s*(?=[\u4e00-\u9fa5])/g, '）');
  t = t.replace(/([\u4e00-\u9fa5])\s*\?"/g, '$1：');
  // 直引号转全角引号（成对替换，用奇数/偶数计数无法保证，按出现顺序交替）
  t = t.replace(/"([^"\n]{1,200})"/g, '“$1”');
  t = t.replace(/'([^'\n]{1,60})'/g, '‘$1’');
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

function splitChapters(raw) {
  const text = normalizePunct(raw).trim();
  if (!text) return [];
  const norm = text.replace(/【\s*(第[一二三四五六七八九十]+章)/g, '$1');
  const parts = norm.split(/(?=^[ \t　]*第[一二三四五六七八九十]+章)/m).filter((x) => x.trim());
  if (parts.length === 1 && !/^[ \t　]*第[一二三四五六七八九十]+章/.test(parts[0])) {
    // 无章标题：整体作为一章，按“导论”处理
    return [{ head: '导论', body: parts[0].trim() }];
  }
  return parts.map((p) => {
    const lines = p.split('\n');
    const head = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    return { head, body };
  });
}

function renumberChapters(list) {
  return list.map((c, i) => {
    const title = c.head.replace(/^第[一二三四五六七八九十]+章[\s　]*/, '').trim() || '未命名';
    return { head: '第' + cnNum(i + 1) + '章　' + title, body: c.body, title };
  });
}

function renumberSections(body) {
  let secIdx = 0;
  let subIdx = 0;
  const lines = body.split('\n');
  const out = lines.map((line) => {
    const t = line.trim();
    if (/^（[一二三四五六七八九十]+）/.test(t)) {
      secIdx += 1;
      subIdx = 0;
      return line.replace(/^(\s*)（[一二三四五六七八九十]+）/, '$1（' + cnNum(secIdx) + '）');
    }
    if (/^[0-9]{1,2}[.、．](?=[^\d])/.test(t)) {
      subIdx += 1;
      return line.replace(/^(\s*)[0-9]{1,2}[.、．]/, '$1' + subIdx + '.');
    }
    return line;
  });
  return out.join('\n');
}

function collectCitations(text) {
  const map = new Map();
  const re = /\[@([^\]]{1,60})\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const k = m[1].trim();
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function countChars(s) {
  return String(s).replace(/\s/g, '').length;
}

export async function runAssemble(params) {
  const raw = (params.chapterTexts || '').trim() || (params.inheritedContext || '').trim();
  if (!raw) throw new Error('没有可合稿的章节正文：请粘贴分章稿，或先跑“正文分章撰写”');

  const title = (params.title || '').trim() || '未命名稿件';
  const journal = params.journal || '太平洋学报';

  const chapters = renumberChapters(splitChapters(raw)).map((c) => ({
    head: c.head,
    body: renumberSections(c.body),
    title: c.title
  }));

  // 目录
  const toc = [];
  chapters.forEach((c, ci) => {
    toc.push(c.head);
    const secs = c.body.split('\n').filter((l) => /^（[一二三四五六七八九十]+）/.test(l.trim()));
    secs.forEach((s) => toc.push('　　' + s.trim()));
    if (!secs.length && ci === 0) toc.push('　　（本章未识别到（一）（二）节标题，请检查分章稿格式）');
  });

  // 正文
  const bodyText = chapters.map((c) => c.head + '\n\n' + c.body).join('\n\n');

  const cites = collectCitations(bodyText);
  const totalChars = countChars(bodyText);
  const chapterStats = chapters.map((c) => ({ head: c.head, chars: countChars(c.body) }));

  const issues = [];
  chapters.forEach((c) => {
    if (!/小结|结论|本章认为/.test(c.body)) issues.push(c.head + '：未见明确小结段，建议在节末给出一句归纳');
    if (countChars(c.body) < 800) issues.push(c.head + '：正文仅 ' + countChars(c.body) + ' 字，可能未展开');
  });
  if (cites.length === 0) issues.push('全文未出现 [@作者年份] 引用占位，论证可能缺少文献支撑');
  if (!/摘要/.test(params.abstract || '')) issues.push('合稿未包含摘要：可用“英文摘要润色”生成后置于正文前');

  const report = [
    '【合稿统计】',
    '题目：' + title,
    '目标期刊：' + journal,
    '章节数：' + chapters.length,
    '总字数：' + totalChars,
    '',
    '各章字数：',
    chapterStats.map((s) => '· ' + s.head + '：' + s.chars + ' 字').join('\n'),
    '',
    '【引用占位清单】共 ' + cites.length + ' 个（需人工补全题录后交由“参考文献格式化”处理）',
    cites.length ? cites.map((c, i) => (i + 1) + '. [@' + c.key + '] 出现 ' + c.count + ' 次').join('\n') : '（无）',
    '',
    '【合稿后待办】',
    issues.length ? issues.map((x, i) => (i + 1) + '. ' + x).join('\n') : '· 未发现结构性问题'
  ].join('\n');

  const text = [
    '【题目】' + title,
    '',
    '【目录】',
    toc.join('\n'),
    '',
    '【正文】',
    bodyText,
    '',
    '————————',
    report
  ].join('\n');

  return {
    text,
    meta: { chapters: chapters.length, chars: totalChars, citations: cites.length },
    citations: cites
  };
}
