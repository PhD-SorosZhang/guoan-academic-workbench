// ===== 配套材料：投稿信 / 汇报稿 / 周报 / 返修回应 =====
import { callModel } from '../model-bridge.js';
import { getTaskHistory } from '../memory-store.js';

const SYS_MAP = {
  cover: [
    '你是学术投稿咨询专家，为期刊编辑撰写投稿信。',
    '结构：投稿说明 → 文章做了什么（问题/方法/结论，一段话说清）→ 为何契合本刊（具体到栏目与议题偏好，不许空喊“贵刊权威”）→ 原创性与一稿一投声明 → 克制收尾。',
    '语气：不卑不亢，半页以内，不自我吹捧，不写成摘要扩写。'
  ].join('\n'),

  talk: [
    '你是学术汇报教练，为投稿宣讲或答辩撰写演讲稿。',
    '要求：口语化但不失严谨；开头 30 秒给出核心问题，中间按“问题—框架—证据—贡献”推进，结尾留出政策启示与研究局限。',
    '每段标注建议时长与停顿点，总时长按用户给定值分配；不使用书面论文腔的长句。'
  ].join('\n'),

  weekly: [
    '你是研究助理，生成国安研究周报。',
    '结构：本周新增文献（按主题归类）｜论证推进（哪些段落实质推进）｜待办与卡点｜下周计划｜需要导师确认的问题。',
    '基于给定材料如实汇总，没有进展就写“无实质推进”，不许编造工作量。'
  ].join('\n'),

  response: [
    '你是学术返修专家，撰写审稿意见回应。',
    '逐条处理：引用意见 → 致谢 → 具体修改说明（改了哪里、怎么改、修改后位置）→ 若不同意则委婉说明理由并给出替代处理。',
    '原则：不争论、每条可核验、大段修改摘录关键段落给审稿人看。',
    '输出：返修信正文 + 逐条回应表。'
  ].join('\n')
};

export async function runDeliverable(params, ctx, pid) {
  const packType = params.packType || 'cover';
  const sys = SYS_MAP[packType];
  if (!sys) throw new Error('未知产出类型：' + packType);

  let material = (params.text || '').trim();

  if (packType === 'weekly' && !material) {
    const hist = await getTaskHistory(pid, 20);
    material = hist.map((h) => {
      const d = new Date(h.ts).toLocaleString('zh-CN');
      return '[' + d + '] ' + h.taskName + '：' + String(h.output || '').slice(0, 200);
    }).join('\n');
  }

  if (!material) throw new Error('请提供基础文稿或材料');

  const user = [
    '目标期刊：' + (params.journal || '太平洋学报'),
    '产出类型：' + packType,
    packType === 'talk' ? '汇报时长：' + (params.duration || '15 分钟') : '',
    '研究议题：' + (ctx.researchFocus || '未标注'),
    '',
    '基础材料：',
    material.slice(0, 20000)
  ].filter(Boolean).join('\n');

  const out = await callModel(sys, user, { temperature: 0.21, maxTokens: 5000 });
  return { text: out, packType };
}
