// SCH-022 学术伦理门：使用协议、导出水印、致谢声明
// 纯前端实现，状态持久化在 localStorage。
const KEY = 'beta:ethics:agreed';
const VERSION = 'v1c-beta.0';

export const ETHICS_NOTICE = [
  '本工作台是学术辅助工具，不替代研究者独立判断。',
  '所有由模型生成的文本、大纲、参考文献都必须经人工核验，',
  '禁止将本工具产出直接作为独立学术成果提交。',
  '导出文档将自动附带辅助来源水印，请在正式投稿前移除并按期刊要求署名。'
].join('');

export function agreed() {
  try { return localStorage.getItem(KEY) === VERSION; } catch { return false; }
}

export function requireAgree() {
  if (!agreed()) {
    return { ok: false, msg: '请先在「V1-C Beta 内测台」阅读并勾选学术使用协议，再执行导出。' };
  }
  return { ok: true };
}

export function setAgreed(on) {
  try { localStorage.setItem(KEY, on ? VERSION : ''); } catch {}
  return agreed();
}

export function watermark(text) {
  const w = '\n\n—— 本文由 SecScholar 学术助手辅助生成，仅作研究草稿，非作者独立定稿。 ——';
  return /SecScholar 学术助手辅助生成/.test(text) ? text : text + w;
}

export function aiStatement() {
  return [
    '致谢与工具使用声明：',
    '在本文写作过程中，作者使用 SecScholar 学术工作台进行文献检索辅助、',
    '大纲梳理、语言润色与格式校对；所有论点、史料与判断均由作者本人核验并负责。'
  ].join('');
}

// 导出守卫：未同意协议则拒绝；同意则自动加水印
export function exportGuard(payload) {
  const g = requireAgree();
  if (!g.ok) return { ok: false, msg: g.msg };
  if (payload && typeof payload.body === 'string') payload.body = watermark(payload.body);
  return { ok: true, payload };
}
