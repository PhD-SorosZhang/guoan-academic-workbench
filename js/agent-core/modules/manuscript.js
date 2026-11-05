// ===== 大纲生成 / 英文摘要润色 / 段落辅助 =====
import { callModel } from '../model-bridge.js';

const OUTLINE_SYS = [
  '你是 CSSCI 顶刊写作教练，为国家安全学论文生成录用导向大纲。',
  '强制结构：导论、理论框架、实证分析、机制讨论、结论与政策启示。',
  '每个三级标题后标注：本节论证任务 / 所需证据 / 建议篇幅（字）。',
  '要求在导论给出研究缺口的准确落点，在理论框架给出可操作化的分析维度，',
  '在实证部分写明案例与证据如何对应论点，在结论写明理论贡献与政策启示的层次差别。',
  '不要输出空泛标题（如“研究现状”“问题分析”），每个标题都要能看出论证意图。'
].join('\n');

const ABSTRACT_SYS = [
  '你是 SSCI / 国内顶刊双语摘要专家。生成英文摘要并附严谨回译。',
  '摘要结构：研究缺口 → 研究设计 → 核心发现 → 理论贡献。150-220 词。',
  '术语采用领域通行译法（如 securitization、ratchet effect、exclusive governance），',
  '克制修辞，不使用 however/moreover 堆叠，不使用 "this paper aims to" 开头的套式。',
  '输出：',
  '【English Abstract】',
  '【中文回译】',
  '【关键词 Key words】',
  '【译名核对表】列出关键术语的中英对照'
].join('\n');

const PARAGRAPH_SYS = [
  '你是学术段落编辑。按用户指令对给定段落做扩写/压缩/补论证/改术语。',
  '保持作者原有论点与证据，不新增未提供的材料。',
  '每段首句为主题句；摆出证据后必须解释其含义；不使用排比堆砌。',
  '输出：改写后的段落 + 三行内说明改了什么。'
].join('\n');

export async function runManuscriptBuild(params, ctx) {
  const mode = params.mode || 'outline';

  if (mode === 'abstract') {
    const src = (params.text || '').trim();
    if (!src) throw new Error('请提供需要润色的中文摘要或正文');
    const out = await callModel(
      ABSTRACT_SYS,
      '目标期刊：' + (params.journal || '太平洋学报') + '\n\n原文：\n' + src.slice(0, 12000),
      { temperature: 0.2 }
    );
    return { mode, text: out };
  }

  if (mode === 'paragraph') {
    const src = (params.text || '').trim();
    if (!src) throw new Error('请提供待处理段落');
    const out = await callModel(
      PARAGRAPH_SYS,
      '操作指令：' + (params.instruction || '补强论证') + '\n目标期刊：' + (params.journal || '太平洋学报') + '\n\n段落：\n' + src.slice(0, 12000),
      { temperature: 0.22 }
    );
    return { mode, text: out };
  }

  // 默认：大纲
  const title = (params.title || '').trim();
  const rq = (params.rq || '').trim();
  if (!title || !rq) throw new Error('生成大纲需要论文题目与研究问题');

  const user = [
    '论文题目：' + title,
    '研究问题：' + rq,
    '拟依托理论：' + (params.theory || '自选，但须与议题匹配'),
    '目标期刊：' + (params.journal || '太平洋学报'),
    '篇幅：' + (params.lengthHint || '1.2-1.5 万字'),
    '已有积累：' + (ctx.researchFocus || '无'),
    (params.extraContext ? '补充材料（含检索或精读结果）：\n' + params.extraContext.slice(0, 8000) : '')
  ].join('\n');

  const out = await callModel(OUTLINE_SYS, user, { temperature: 0.24, maxTokens: 5000 });
  return { mode: 'outline', text: out };
}
