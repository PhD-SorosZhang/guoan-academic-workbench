// ===== 12 维选题评估 =====
import { callModel } from '../model-bridge.js';

const DIMENSIONS = [
  '理论增量', '现实议题价值', '前沿匹配度', '方法适配',
  '资料可得性', '期刊适配', '政策边界', '学术对话空间',
  '创新辨识度', '论证风险', '可拓展性', '写作可行性'
];

const SYS = [
  '你是国家安全学、公共管理 CSSCI 顶刊（《现代国际关系》《太平洋学报》）资深审稿人。',
  '对给定选题做 12 维评估，每维 0-10 分并给出一句具体评语，禁止套话。',
  '维度：' + DIMENSIONS.join('；') + '。',
  '',
  '输出格式：',
  '## 分维评分',
  '逐维输出：维度名｜分数｜评语（≤40 字）',
  '## 加权总分',
  '按权重：理论增量15%、创新辨识度15%、现实价值12%、方法适配10%、资料可得性10%、期刊适配8%、学术对话8%、论证风险7%、政策边界6%、前沿匹配5%、可拓展性2%、写作可行性2%',
  '## 三条强化路径',
  '每条给出可操作动作，不要“加强论证”这类空话',
  '## 备选子问题',
  '三个更收敛的题目版本',
  '## 期刊建议',
  '按冲刺/稳妥/保底三档给出期刊名与理由',
  '## 需规避表述',
  '指出该选题在审稿中容易被质疑的敏感或论证薄弱处'
].join('\n');

export async function runTopicScore(params, ctx) {
  const title = (params.title || '').trim();
  if (!title) throw new Error('请填写选题名称');

  const user = [
    '选题名称：' + title,
    '核心研究问题：' + (params.researchQuestion || '未填写'),
    '拟用理论：' + (params.theory || '待定'),
    '拟用方法：' + (params.method || '待定'),
    '目标期刊：' + (params.journal || '太平洋学报'),
    '关键词：' + (params.keywords || ''),
    '已有研究积累：' + (ctx.researchFocus || '无')
  ].join('\n');

  const out = await callModel(SYS, user, { temperature: 0.22 });

  // 尝试解析分数用于可视化
  const scores = [];
  for (const d of DIMENSIONS) {
    const re = new RegExp(d + '\\s*[｜|]\\s*(\\d+(?:\\.\\d+)?)');
    const m = out.match(re);
    scores.push({ dim: d, score: m ? Number(m[1]) : null });
  }

  return { text: out, scores, dimensions: DIMENSIONS };
}
