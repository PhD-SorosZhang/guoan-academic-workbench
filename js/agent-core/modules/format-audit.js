// ===== 全文格式体检：结构、摘要、编号、引用对应、标点、字数（本地计算，不调模型） =====

const CJK = '\\u4e00-\\u9fa5';

function charLen(s) { return String(s || '').replace(/\s/g, '').length; }

function lines(s) { return String(s || '').split('\n'); }

function snippet(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

function extractSection(text, startPat, endPats) {
  const src = String(text || '');
  const m = src.match(startPat);
  if (!m) return '';
  const from = m.index + m[0].length;
  let to = src.length;
  endPats.forEach((re) => {
    const mm = src.slice(from).match(re);
    if (mm && from + mm.index < to) to = from + mm.index;
  });
  return src.slice(from, to);
}

/** 章标题序号连续性 */
function checkChapterSeq(text) {
  const nums = [];
  lines(text).forEach((l) => {
    const m = l.trim().match(/^第([一二三四五六七八九十]+)章/);
    if (m) nums.push(m[1]);
  });
  const expect = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const bad = [];
  nums.forEach((n, i) => { if (n !== expect[i]) bad.push('第 ' + (i + 1) + ' 个章标题写作“第' + n + '章”，应为“第' + (expect[i] || '?') + '章”'); });
  return { count: nums.length, bad };
}

/** 节标题：（一）（二）在各章内是否从（一）起连续 */
function checkSectionSeq(text) {
  const bad = [];
  let chap = '';
  const seen = {};
  lines(text).forEach((l) => {
    const t = l.trim();
    const cm = t.match(/^第[一二三四五六七八九十]+章([^\n]{0,30})/);
    if (cm) { chap = cm[1] || '本章'; seen[chap] = 0; return; }
    const sm = t.match(/^（([一二三四五六七八九十]+)）/);
    if (sm) {
      seen[chap] = (seen[chap] || 0) + 1;
      const expect = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][seen[chap] - 1];
      if (sm[1] !== expect) bad.push('「' + snippet(chap, 18) + '」内第 ' + seen[chap] + ' 个节标题为“（' + sm[1] + '）”，应为“（' + expect + '）”');
    }
  });
  return bad;
}

/** 正文 [n] 引用与参考文献条目数是否对应 */
function checkRefs(text) {
  const refBody = extractSection(text, /参考文献/, [/\n附\s*录/, /\n致\s*谢/]);
  const entries = lines(refBody).filter((l) => /^[\[（(]?\s*\d+\s*[\]）).、]/.test(l.trim())).length;
  const inTextNums = new Set();
  const re = /\[(\d{1,3}(?:\s*[-,，]\s*\d{1,3})*)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    m[1].split(/[-,，]/).forEach((x) => {
      const n = Number(x.trim());
      if (n > 0) inTextNums.add(n);
    });
  }
  const maxInText = inTextNums.size ? Math.max.apply(null, Array.from(inTextNums)) : 0;
  return { entries, inText: inTextNums.size, maxInText, refFound: Boolean(refBody.trim()) };
}

function checkFigures(text) {
  const bad = [];
  ['图', '表'].forEach((k) => {
    const nums = [];
    const re = new RegExp('^[ \\t　]*' + k + '\\s*(\\d{1,2})', 'gm');
    let m;
    while ((m = re.exec(text)) !== null) nums.push(Number(m[1]));
    nums.forEach((n, i) => { if (n !== i + 1) bad.push(k + '编号跳号：第 ' + (i + 1) + ' 个为' + k + n + '，应为' + k + (i + 1)); });
  });
  return bad;
}

function checkPunct(text) {
  const issues = [];
  const halfComma = (text.match(new RegExp('[' + CJK + '],', 'g')) || []).length;
  const halfPeriod = (text.match(new RegExp('[' + CJK + ']\\s*\\.\\s*[' + CJK + ']', 'g')) || []).length;
  const halfParen = (text.match(new RegExp('[' + CJK + ']\\(', 'g')) || []).length;
  const straightQuote = (text.match(/"[^"\n]{1,120}"/g) || []).length;
  const doubleSpace = (text.match(/[ \t]{2,}/g) || []).length;
  if (halfComma) {
    const at = text.search(new RegExp('[' + CJK + '],'));
    issues.push(snippet(text.slice(at, at + 30), 40) + ' —— 中文后用半角逗号，共 ' + halfComma + ' 处，应改全角“，”');
  }
  if (halfPeriod) issues.push('中文句末使用半角句点，共 ' + halfPeriod + ' 处，应改“。”');
  if (halfParen) issues.push('中文后用半角括号，共 ' + halfParen + ' 处，应改“（）”');
  if (straightQuote) issues.push('使用直引号 "…"，共 ' + straightQuote + ' 处，应改中文引号“…”');
  if (doubleSpace) issues.push('存在连续空格，共 ' + doubleSpace + ' 处');
  return issues;
}

function checkLongParagraphs(text) {
  const bad = [];
  lines(text).forEach((l, i) => {
    const t = l.trim();
    if (t && !/^第[一二三四五六七八九十]+章/.test(t) && !/^（[一二三四五六七八九十]+）/.test(t) && charLen(t) > 600) {
      bad.push('第 ' + (i + 1) + ' 行段落 ' + charLen(t) + ' 字未分段：' + snippet(t, 30));
    }
  });
  return bad;
}

function checkDuplicateSentences(text) {
  const sents = String(text).split(/(?<=。)/).map((s) => s.trim()).filter((s) => charLen(s) >= 25);
  const map = new Map();
  sents.forEach((s) => map.set(s, (map.get(s) || 0) + 1));
  const dups = Array.from(map.entries()).filter(([, c]) => c > 1);
  return dups.slice(0, 8).map(([s, c]) => '重复句（' + c + ' 次）：' + snippet(s, 34));
}

export async function runFormatAudit(params) {
  const text = (params.text || '').trim() || (params.inheritedContext || '').trim();
  if (!text) throw new Error('需要全文：可粘贴，或先跑“全文合稿”让流水线自动传入');

  const journal = params.journal || '太平洋学报';
  const targetChars = Number(params.targetChars) || 0;

  const issues = [];
  let score = 100;

  function add(level, msg, weight) {
    issues.push({ level, msg });
    score -= weight;
  }

  // 1 摘要
  const abstract = extractSection(text, /摘\s*要/, [/关\s*键\s*词/, /\nAbstract/i, /\n【关键词】/]);
  const absLen = charLen(abstract);
  if (!abstract.trim()) add('严重', '未识别到“摘要”段落', 10);
  else if (absLen < 180) add('中', '中文摘要约 ' + absLen + ' 字，偏短（顶刊通常 220-320 字）', 4);
  else if (absLen > 400) add('中', '中文摘要约 ' + absLen + ' 字，偏长，需压缩到 320 字内', 4);
  else issues.push({ level: '通过', msg: '中文摘要 ' + absLen + ' 字，篇幅合规' });

  // 2 关键词：只取同一行，避免把后文正文误当关键词
  const kwMatch = String(text).match(/关\s*键\s*词\s*[：:]?\s*([^\n]{0,200})/);
  const kwLine = kwMatch ? kwMatch[1] : '';
  const kws = kwLine.split(/[；;，,、]/).map((x) => x.trim()).filter((x) => x.length > 1);
  if (!kwLine.trim()) add('严重', '未识别到关键词', 8);
  else if (kws.length < 3) add('中', '关键词仅 ' + kws.length + ' 个，顶刊一般 3-5 个', 4);
  else if (kws.length > 6) add('轻', '关键词 ' + kws.length + ' 个，偏多，建议压到 3-5 个', 2);
  else issues.push({ level: '通过', msg: '关键词 ' + kws.length + ' 个' });

  // 3 英文摘要
  if (!/abstract/i.test(text)) add('中', '未见英文摘要（Abstract），投稿前需补', 5);
  else issues.push({ level: '通过', msg: '存在英文摘要' });

  // 4 章标题序号
  const cs = checkChapterSeq(text);
  if (cs.count === 0) add('中', '未识别到“第X章”级标题，请确认是否符合目标期刊体例', 3);
  cs.bad.slice(0, 5).forEach((b) => add('中', b, 3));

  // 5 节标题序号
  checkSectionSeq(text).slice(0, 6).forEach((b) => add('轻', b, 2));

  // 6 引用与参考文献对应
  const rf = checkRefs(text);
  if (!rf.refFound) add('严重', '未识别到“参考文献”部分', 10);
  else {
    if (rf.entries === 0) add('严重', '参考文献部分无编号条目', 8);
    if (rf.entries && rf.maxInText > rf.entries) add('严重', '正文引用编号最大为 [' + rf.maxInText + ']，但参考文献仅 ' + rf.entries + ' 条，存在悬挂引用', 8);
    if (rf.entries && rf.inText < rf.entries) add('中', '参考文献 ' + rf.entries + ' 条，正文只引用了 ' + rf.inText + ' 条，存在列而未引的条目', 4);
    if (rf.entries && rf.inText >= rf.entries && rf.maxInText <= rf.entries) issues.push({ level: '通过', msg: '正文引用（' + rf.inText + ' 条）与参考文献（' + rf.entries + ' 条）数目匹配' });
  }

  // 7 图表编号
  checkFigures(text).slice(0, 5).forEach((b) => add('轻', b, 2));

  // 8 标点
  checkPunct(text).slice(0, 6).forEach((b) => add('轻', b, 2));

  // 9 超长段落
  const longs = checkLongParagraphs(text);
  if (longs.length) add('中', '有 ' + longs.length + ' 个段落超过 600 字未分段（示例：' + longs[0] + '）', 3);

  // 10 重复句
  checkDuplicateSentences(text).forEach((b) => add('轻', b, 2));

  // 11 字数
  const total = charLen(text);
  if (targetChars && total < targetChars * 0.85) add('中', '全文 ' + total + ' 字，低于目标 ' + targetChars + ' 字约 ' + Math.round((1 - total / targetChars) * 100) + '%', 4);
  else if (targetChars && total > targetChars * 1.15) add('轻', '全文 ' + total + ' 字，超出目标 ' + targetChars + ' 字', 2);

  score = Math.max(0, Math.min(100, score));

  const byLevel = { '严重': [], '中': [], '轻': [], '通过': [] };
  issues.forEach((it) => { (byLevel[it.level] || byLevel['轻']).push(it.msg); });

  const plan = [];
  if (byLevel['严重'].length) {
    plan.push('一、先修硬伤（不修则无法进入外审）');
    byLevel['严重'].forEach((m, i) => plan.push('  ' + (i + 1) + '. ' + m));
  }
  if (byLevel['中'].length) {
    plan.push('二、再修结构性问题');
    byLevel['中'].forEach((m, i) => plan.push('  ' + (i + 1) + '. ' + m));
  }
  if (byLevel['轻'].length) {
    plan.push('三、最后统一技术规范');
    byLevel['轻'].forEach((m, i) => plan.push('  ' + (i + 1) + '. ' + m));
  }
  if (byLevel['通过'].length) {
    plan.push('四、已合规项');
    byLevel['通过'].forEach((m) => plan.push('  · ' + m));
  }

  const text2 = [
    '【格式体检】目标期刊：' + journal + '　总字数：' + total,
    '【体检得分】' + score + ' / 100　（严重 ' + byLevel['严重'].length + ' 项，中 ' + byLevel['中'].length + ' 项，轻 ' + byLevel['轻'].length + ' 项）',
    '',
    plan.join('\n'),
    '',
    '【下一步】',
    '· 标点与引号类问题可用“全文合稿”重跑一次自动统一；',
    '· 悬挂引用、列而未引需回到“参考文献格式化”补齐题录；',
    '· 摘要偏短/偏长、段落超长属于写作判断，建议用“防御性写作清洗”或人工改写处理。'
  ].join('\n');

  return {
    text: text2,
    meta: { score, total, severe: byLevel['严重'].length, medium: byLevel['中'].length, light: byLevel['轻'].length }
  };
}
