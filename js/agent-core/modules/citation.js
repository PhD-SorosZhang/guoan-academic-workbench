// ===== 参考文献格式化 GB/T 7714-2015 =====
import { callModel } from '../model-bridge.js';

const SYS = [
  '你是参考文献格式化引擎，严格执行 GB/T 7714-2015 顺序编码制。',
  '输入可能是杂乱题录、网页摘录、Zotero 导出片段。',
  '任务：清洗 → 补全 → 按类型套用标准格式 → 中文在前英文在后 → 各自按拼音/字母排序 → 消重。',
  '',
  '格式模板：',
  '期刊：作者. 题名[J]. 刊名, 年, 卷(期): 起止页码.',
  '专著：作者. 书名[M]. 版次. 出版地: 出版社, 年: 页码.',
  '译著：原作者. 书名[M]. 译者, 译. 出版地: 出版社, 年.',
  '析出文献：作者. 题名[C]//编者. 论文集名. 出版地: 出版社, 年: 起止页码.',
  '学位论文：作者. 题名[D]. 保存地: 保存单位, 年.',
  '报告：机构. 报告题名[R/OL]. (发布日期). 链接.',
  '电子资源：作者. 题名[EB/OL]. (发布日期). 链接.',
  '',
  '规则：作者三人以内全列，超过三人列前三人后加“等”/“, et al.”；',
  '英文作者姓在前名缩写；标点统一半角；不得编造缺失的卷期页码，缺失则留空并标注“待补”。',
  '只输出参考文献列表，不加解释。'
].join('\n');

export async function runCitation(params) {
  const raw = (params.rawEntries || '').trim();
  if (!raw) throw new Error('请粘贴原始参考文献或题录');

  const out = await callModel(
    SYS,
    '目标格式：' + (params.style || 'GB/T 7714-2015 顺序编码制') + '\n\n原始题录：\n' + raw.slice(0, 20000),
    { temperature: 0.05 }
  );

  const count = (out.match(/^\s*\[?\d+\]?[\s.、]/gm) || []).length;
  return { text: out, count, style: params.style || 'GB/T 7714-2015' };
}
