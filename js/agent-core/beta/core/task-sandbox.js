// SCH-007 任务沙盒：所有研究素材按 task_id 命名空间隔离，跨任务默认不可见。
const NS = 'beta:sandbox:';

export function taskNS(taskId) { return NS + taskId + ':'; }

export function put(taskId, key, value) {
  try {
    localStorage.setItem(taskNS(taskId) + key, JSON.stringify(value));
  } catch {}
}

export function get(taskId, key) {
  try {
    const raw = localStorage.getItem(taskNS(taskId) + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// 列出本任务内所有键；不会返回其他任务的任何数据
export function listKeys(taskId) {
  const prefix = taskNS(taskId);
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
  }
  return out;
}

// 跨任务导入：显式确认后才把另一个任务的某条数据拷过来
export function importFromTask(fromTaskId, toTaskId, key, confirmToken) {
  if (confirmToken !== 'yes') {
    return { ok: false, msg: '跨任务导入需要用户显式确认（confirmToken="yes"）。' };
  }
  const data = get(fromTaskId, key);
  if (data == null) return { ok: false, msg: `源任务里没有 ${key}` };
  put(toTaskId, key, data);
  return { ok: true, key, copied: true };
}
