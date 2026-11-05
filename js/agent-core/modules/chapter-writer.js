// ===== 正文分章撰写：大纲 → 章节正文（逐节展开，论点—论据—分析—小结） =====
import { callModel } from '../model-bridge.js';

const SYS = [
  '你是 CSSCI 顶刊论文的分章撰写者，按给定大纲把某一章展开为正式学术正文。',
  '',
  '写作要求：',
  '1. 严格贴合大纲该章的节次与论证任务，不擅自新增节次，不改变论证顺序。',
  '2. 每一节 2-4 段；每段遵循“论点句—经验或文本证据—对证据的解释—与本节的关联”四步，段末不写空话小结。',
  '3. 论证要落到具体机制与时序：谁在什么条件下做了什么，改变了什么成本或预期，因而产生什么后果。',
  '4. 概念首次出现给出界定并注明所属理论脉络；同一概念全文只用一种译名与一种表述。',
  '5. 引用一律写成占位符 [@作者年份]，只标注“此处需要文献支撑”，不得虚构具体文献条目、卷期页码。',
  '6. 需要数据、案例细节而用户未提供时，写成 [待补证据：所需数据类型]，禁止编造统计数字、条约条款、事件日期。',
  '7. 语言为规范学术中文：不用“首先/其次/最后”串段，不用排比堆砌，不用“值得注意的是”“综上所述”这类填充语，不用第一人称口语。',
  '8. 不写摘要、关键词、参考文献列表——这些属于其他环节。',
  '',
  '输出格式：',
  '【第X章 标题】',
  '（一）节标题',
  '正文段落……',
  '（二）节标题',
  '正文段落……',
  '【本章字数】约 N 字'
].join('\n');

/** 从大纲文本中识别章标题，供“全文模式”逐章生成 */
export function detectChapters(outlineText) {
  const src = String(outlineText || '');
  const out = [];
  const re = /第([一二三四五六七八九十]+)章[\s　]*([^\n（(]{2,40})/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({ no: m[1], title: m[2].trim() });
  }
  return out;
}

function sliceChapter(outlineText, chapterSpec) {
  const src = String(outlineText || '');
  if (!chapterSpec) return src.slice(0, 8000);
  const key = chapterSpec.replace(/\s+/g, '');
  const idx = src.replace(/\s+/g, '').indexOf(key);
  if (idx < 0) return src.slice(0, 8000);
  // 粗略截取该章到下一章之前
  const start = Math.max(0, idx - 40);
  const rest = src.slice(start);
  const next = rest.slice(60).search(/第[一二三四五六七八九十]+章/);
  return next > 0 ? rest.slice(0, next + 60) : rest.slice(0, 9000);
}

function ctxBlock(params) {
  const parts = [];
  if (params.title) parts.push('论文题目：' + params.title);
  if (params.rq) parts.push('研究问题：' + params.rq);
  if (params.theory) parts.push('理论锚点：' + params.theory);
  parts.push('目标期刊：' + (params.journal || '太平洋学报'));
  if (params.material) parts.push('可用材料（案例、数据、文献要点，只能使用这里出现的事实）：\n' + String(params.material).slice(0, 6000));
  if (params.inheritedContext) parts.push('前序环节产出（含选题评估、大纲、检索或精读结果）：\n' + String(params.inheritedContext).slice(-12000));
  return parts.join('\n');
}

export async function runChapterWrite(params, ctx) {
  const outline = (params.outlineText || '').trim() || (params.inheritedContext || '').trim();
  if (!outline) throw new Error('需要大纲：可粘贴大纲，或先跑“生成期刊大纲”让流水线自动传入');

  const spec = (params.chapterSpec || '').trim();
  const chars = Number(params.targetChars) || 2500;

  // 全文模式：按大纲识别章节逐章生成
  if (spec === '全部' || spec === '全文') {
    const chapters = detectChapters(outline);
    if (!chapters.length) throw new Error('未在大纲中识别到“第X章”标题，请改为指定单章，或先重跑大纲');
    const limit = Math.min(chapters.length, 6);
    const outs = [];
    for (let i = 0; i < limit; i++) {
      const c = chapters[i];
      const chapKey = '第' + c.no + '章 ' + c.title;
      const user = [
        ctxBlock(params),
        '本处只需写：' + chapKey,
        '该章可用大纲片段：\n' + sliceChapter(outline, chapKey),
        '本章目标字数：约 ' + chars + ' 字'
      ].join('\n\n');
      const txt = await callModel(SYS, user, { temperature: 0.28, maxTokens: 4000 });
      outs.push(txt.trim());
    }
    const joined = outs.join('\n\n');
    return {
      mode: 'full',
      text: joined,
      meta: { chapters: limit, totalChapters: chapters.length, chars: joined.replace(/\s/g, '').length }
    };
  }

  const chapKey = spec || '导论';
  const user = [
    ctxBlock(params),
    '本处只需写：' + chapKey,
    '该章可用大纲片段：\n' + sliceChapter(outline, spec || outline.slice(0, 200)),
    '本章目标字数：约 ' + chars + ' 字',
    params.extraRequest ? '附加要求：' + params.extraRequest : ''
  ].filter(Boolean).join('\n\n');

  const out = await callModel(SYS, user, { temperature: 0.28, maxTokens: 4000 });
  return { mode: 'chapter', chapter: chapKey, text: out, meta: { chars: out.replace(/\s/g, '').length } };
}
