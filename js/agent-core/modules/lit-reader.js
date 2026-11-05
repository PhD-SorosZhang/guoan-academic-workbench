// ===== 文献精读：结构化提炼，可作用于单篇或检索结果批量 =====
import { callModel } from '../model-bridge.js';

const SYS = [
  '你是国家安全学、国际关系领域资深研究者，按博士生导师的严谨标准做文献精读。',
  '输出结构固定为六节，不得缺项：',
  '一、核心信息卡（研究问题、核心论点、理论视角、研究方法、实证案例）',
  '二、论证链条拆解（前提假设 → 中间推导 → 关键证据 → 结论落地）',
  '三、贡献判断（推进了哪场学术对话、修正了什么既有认知，禁止空话）',
  '四、缺陷与可商榷（概念偷换/循环论证/案例选择偏差/证据不足/竞争性解释遗漏）',
  '五、对我的研究价值（可引用位置、可对话方式、其不足能否成为我的切口）',
  '六、可化用句摘录（3-5 句，标注所属论证环节）',
  '要求：第四、五节必须具体到本文档的句子或判断，不许给通用模板话。'
].join('\n');

export async function runLitRead(params) {
  const text = (params.text || '').trim();
  if (!text) throw new Error('没有可精读的文本');

  const sourceType = params.sourceType || 'auto';
  const extra = params.extraRequest || '';

  const user = [
    '文献类型：' + sourceType,
    '附加要求：' + (extra || '无'),
    '',
    '文献内容：',
    text.slice(0, 28000)
  ].join('\n');

  const out = await callModel(SYS, user, { temperature: 0.2 });

  return {
    text: out,
    sourceLength: text.length,
    sourceType
  };
}

/** 批量精读（用于检索结果池，逐篇给精简卡） */
export async function runBatchLitRead(items, params = {}) {
  const results = [];
  for (const it of items.slice(0, params.max || 5)) {
    const body = [
      '标题：' + it.title,
      '作者：' + ((it.authors || []).join('; ') || '—'),
      '年份：' + (it.year || '—'),
      '期刊：' + (it.venue || '—'),
      '摘要：' + (it.abstract || '（无摘要）')
    ].join('\n');

    const sys = [
      '你是文献速读助理。仅基于给出的标题与摘要，输出五条：',
      '1) 研究问题；2) 核心论点；3) 理论工具；4) 证据类型；5) 与我研究的潜在接口。',
      '若摘要缺失，明确标注“信息不足”，不得臆测。每条不超过 40 字。'
    ].join('\n');

    try {
      const t = await callModel(sys, body, { temperature: 0.15, maxTokens: 800 });
      results.push({ title: it.title, card: t });
    } catch (e) {
      results.push({ title: it.title, card: '精读失败：' + e.message });
    }
  }
  return results;
}
