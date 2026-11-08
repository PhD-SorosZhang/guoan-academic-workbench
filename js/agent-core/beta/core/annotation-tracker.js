// SCH-010 审稿意见锚定与状态追踪
const KEY = 'beta:annotations:';

export const Status = { PENDING: 'pending', DOING: 'doing', RESOLVED: 'resolved', REJECTED: 'rejected' };

function all(taskId) {
  try { return JSON.parse(localStorage.getItem(KEY + taskId) || '[]'); } catch { return []; }
}
function save(taskId, list) {
  try { localStorage.setItem(KEY + taskId, JSON.stringify(list)); } catch {}
}

export function addAnnotation(taskId, { text, paraIndex }) {
  const list = all(taskId);
  const a = {
    id: 'ann_' + Date.now() + '_' + Math.floor(Math.random() * 1e4),
    text, paraIndex: paraIndex ?? null,
    status: Status.PENDING, reply: '', createdAt: new Date().toISOString()
  };
  list.push(a); save(taskId, list);
  return a;
}

export function setStatus(taskId, annId, status) {
  const list = all(taskId);
  const a = list.find((x) => x.id === annId);
  if (a) { a.status = status; save(taskId, list); }
  return a;
}

export function setReply(taskId, annId, reply) {
  const list = all(taskId);
  const a = list.find((x) => x.id === annId);
  if (a) { a.reply = reply; save(taskId, list); }
  return a;
}

export function pending(taskId) { return all(taskId).filter((a) => a.status === Status.PENDING); }
export function listAll(taskId) { return all(taskId); }

// 返修完成后生成点对点响应对照表
export function responseTable(taskId) {
  return all(taskId).map((a) => ({
    意见: a.text,
    段落: a.paraIndex,
    状态: a.status,
    回应: a.reply || '（未回应）'
  }));
}
