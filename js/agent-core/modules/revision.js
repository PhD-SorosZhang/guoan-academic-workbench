// ===== 返修与提升：审稿意见（或自查问题）→ 修订稿 + 改动溯源 + 点对点回应 =====
import { callModel } from '../model-bridge.js';

const SYS = [
  '你是 CSSCI 顶刊的返修执行者：拿到审稿意见（或自查问题清单）后，真正改写文稿，并给出可核查的改动记录。',
  '',
  '改写原则：',
  '1. 只改被意见击中的地方，未被批评的段落保持原样，不得顺手重写全文。',
  '2. 优先补论证、补机制、补边界条件，其次才是调语言；不得用增加形容词的方式假装修改。',
  '3. 删除无依据的断言、过度免责、自我贬低式表述（例如“本文难免存在不足”“由于能力有限”）。',
  '4. 审稿意见与文稿事实冲突时，不迎合审稿人编造证据；改为在回应中说明为何不采纳，并给出替代论证。',
  '5. 需要新证据而用户未提供时，写成 [待补证据：所需数据类型]，禁止编造数据、条款、案例细节。',
  '6. 引用仍用 [@作者年份] 占位，不虚构文献。',
  '',
  '输出格式（严格遵守，四个区块都要有）：',
  '【修订稿】',
  '（完整可替换原文的正文；每处实质改动后紧跟标记〔改1〕〔改2〕…；未改动处不加标记）',
  '【改动溯源表】',
  '| 编号 | 位置 | 原表述（摘句） | 改为 | 依据 |',
  '【点对点回应】',
  '1. 审稿意见：… → 回应：… → 改动位置：…（或：不采纳，理由……）',
  '【仍需人工处理】',
  '（列出必须由作者补数据、补文献、补案例的地方）'
].join('\n');

function charLen(s) {
  return String(s || '').replace(/\s/g, '').length;
}

function splitChapters(text) {
  const parts = String(text).split(/(?=^[ \t　]*第[一二三四五六七八九十]+章)/m).filter((x) => x.trim());
  return parts.length ? parts : [String(text)];
}

export async function runRevision(params) {
  const text = (params.manuscript || '').trim() || (params.inheritedContext || '').trim();
  if (!text) throw new Error('需要待修订文稿：可粘贴，或先跑“全文合稿 / 审稿扫描”让流水线自动传入');

  const comments = (params.reviewComments || '').trim();
  const journal = params.journal || '太平洋学报';
  const mode = params.mode || 'both';

  const head = [
    '目标期刊：' + journal,
    comments ? '审稿意见 / 自查问题：\n' + comments.slice(0, 6000)
      : '审稿意见：未提供。请先按 120 维国安学审稿标准自查，列出最致命的 6-8 个问题（按危害排序），再据此改写。',
    '修订产出要求：' + (mode === 'revise' ? '只输出修订稿与改动溯源表，不写点对点回应。' : '四个区块全部输出。')
  ].join('\n\n');

  // 短稿：一次改写
  if (charLen(text) <= 9000) {
    const out = await callModel(SYS, head + '\n\n【待修订文稿】\n' + text.slice(0, 12000), { temperature: 0.26, maxTokens: 6000 });
    return { mode: 'single', text: out, meta: { chars: charLen(text) } };
  }

  // 长稿：按章分批改写，避免单次输出被截断
  const chapters = splitChapters(text).slice(0, 6);
  if (chapters.length <= 1) {
    throw new Error('文稿 ' + charLen(text) + ' 字过长且未识别到章标题，单次修订会截断。请先按“第X章”分段，或改用“全文合稿”整理结构。');
  }

  const outlineBrief = chapters.map((c, i) => {
    const t = c.split('\n')[0].trim().slice(0, 40);
    return (i + 1) + '. ' + t;
  }).join('\n');

  const outs = [];
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const user = [
      head,
      '全文结构（用于判断本章在整体论证中的位置，不要改写其他章）：\n' + outlineBrief,
      '本处只修订：' + (c.split('\n')[0].trim().slice(0, 40) || '本章'),
      '【本章待修订文本】\n' + c.slice(0, 8000)
    ].join('\n\n');
    const txt = await callModel(SYS, user, { temperature: 0.26, maxTokens: 4500 });
    outs.push(txt.trim());
  }

  return {
    mode: 'chaptered',
    text: '（长稿按章分批修订，共 ' + chapters.length + ' 章。请逐章替换原稿对应部分，改动编号跨章延续时需人工顺延。）\n\n' + outs.join('\n\n———\n\n'),
    meta: { chars: charLen(text), batches: chapters.length }
  };
}
