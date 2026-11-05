// ===== Anti-Defensive Writing 防御性写作清洗 =====
import { callModel } from '../model-bridge.js';
import { getConfig } from '../config.js';

const SYS = [
  '你是公共管理 / 国家安全学 CSSCI 资深审稿人与文字编辑，执行 Anti-Defensive Writing 清洗。',
  '',
  '要清掉的防御性表达（过度免责、自我贬低、无证据的软化）：',
  '· “在某种程度上可以说”“或许可以认为”“可能存在争议”',
  '· “由于能力有限，本文仅做初步探讨”“希望本文能起到抛砖引玉的作用”',
  '· 每句都挂“可能/或许/一定程度上”，导致论点虚弱',
  '',
  '改写原则：',
  '1. 有证据的判断直接陈述，不加软化词；',
  '2. 推测性判断改“本文认为”“有理由判断”，不用“或许大概”；',
  '3. 研究局限统一收进结论，不在每段自我怀疑；',
  '4. 保留全部论证链条、理论锚点、文献引用、核心主张，不得改动实质论点；',
  '5. 输出人文社科研究者的自然书面语，不要模板腔；',
  '6. 控制 AI 痕迹，目标 AI 率不超过给定阈值。',
  '',
  '输出结构：',
  '【修订全文】',
  '【修改说明】逐条列出删改的防御性表达及替换理由',
  '【残留风险句】仍需作者自行确认的句子'
].join('\n');

export async function runADWClean(params) {
  const text = (params.text || '').trim();
  if (!text) throw new Error('没有可清洗的文本');

  const cfg = getConfig();
  const targetRatio = params.targetRatio || cfg.adw.targetAiRatio || 10;

  const user = [
    '目标期刊：' + (params.journal || cfg.journalDefault),
    '目标 AI 率上限：' + targetRatio + '%',
    '清洗力度：' + (params.aggressive === false ? '保守' : '彻底'),
    '',
    '待清洗文本：',
    text.slice(0, 26000)
  ].join('\n');

  const out = await callModel(SYS, user, { temperature: 0.18 });

  return {
    text: out,
    targetRatio,
    originalLength: text.length
  };
}
