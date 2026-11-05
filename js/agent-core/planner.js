// ===== 意图规划器：一句研究目标 → 有序任务链 =====
import { callModelJSON } from './model-bridge.js';
import { sanitizeChain } from './validator.js';

const AVAILABLE = [
  'SCHOLAR_SEARCH — 跨库检索文献（OpenAlex/Crossref/Semantic Scholar/Zotero），返回去重后的题录与摘要',
  'ZOTERO_FETCH — 从本地 Zotero 取用文献或解析导出 JSON',
  'LIT_READ — 单篇或批量文献精读，产出结构化笔记',
  'TOPIC_SCORE — 12 维选题评估',
  'ADW_CLEAN — 防御性写作清洗（去 AI 腔、去过度免责）',
  'NS_REVIEW — 国家安全学 120 维度审稿扫描',
  'BUILD_OUTLINE — 生成匹配目标期刊的论文大纲',
  'ABSTRACT — 英文摘要润色 + 回译',
  'DELIVERABLE — 投稿信 / 汇报稿 / 周报 / 返修回应',
  'CITATION — GB/T 7714 参考文献格式化'
];

const SYS = [
  '你是国家安全学学术 Agent 的任务规划器。只能调用下列已实现的原子任务，禁止虚构工具。',
  '',
  '可用任务：',
  AVAILABLE.join('\n'),
  '',
  '规划规则：',
  '1. 按依赖顺序生成链：需要材料先检索，需要判断先精读，需要成稿先大纲。',
  '2. 检索类任务放在最前，若目标已提供现成文本则跳过检索。',
  '3. 在关键学术选择处插入 pause-confirm：理论框架选定、案例范围、目标期刊切换、是否采纳某一版大纲。',
  '4. 存在两条并行学术路线时用 branch-select，options 给出具体方向而非“继续/放弃”。',
  '5. 每条 run-task 的 params 只能是该任务需要的字段，无法确定的留空字符串，由前序产出通过 inheritedContext 注入。',
  '6. 若目标超出能力边界（例如要求自动下载 PDF 全文、要求访问知网接口），第一步放 pause-confirm 说明边界与替代方案。',
  '7. 步骤总数控制在 3-8 步，不要堆砌。',
  '',
  '严格输出 JSON，无 markdown、无解释：',
  '{"chainId":"...","title":"...","steps":[{"kind":"run-task","taskType":"SCHOLAR_SEARCH","params":{},"note":"..."},{"kind":"pause-confirm","prompt":"...","options":["...","..."]}]}'
].join('\n');

const VALID_TYPES = ['SCHOLAR_SEARCH', 'ZOTERO_FETCH', 'LIT_READ', 'TOPIC_SCORE', 'ADW_CLEAN', 'NS_REVIEW', 'BUILD_OUTLINE', 'ABSTRACT', 'DELIVERABLE', 'CITATION'];

export async function buildTaskChain(pid, goal, projectCtx) {
  const user = [
    '当前项目上下文：' + JSON.stringify(projectCtx || {}),
    '用户目标：' + goal
  ].join('\n');

  const raw = await callModelJSON(SYS, user, { temperature: 0.16, maxTokens: 3000 });
  return sanitizeChain(raw, VALID_TYPES);
}

export { VALID_TYPES };
