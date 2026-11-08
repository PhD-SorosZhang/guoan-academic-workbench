// SCH-016 任务进度流：长任务拆子步骤，事件驱动 UI；支持取消与断点续跑。
const listeners = new Map(); // taskId -> Set(fn)
const state = new Map();     // taskId -> {total, done, label, cancelled, checkpoint}

export function initTask(taskId, total) {
  state.set(taskId, { total, done: 0, label: '排队中', cancelled: false, checkpoint: null });
  emit(taskId);
}

export function step(taskId, label, checkpoint) {
  const s = state.get(taskId);
  if (!s) return;
  s.done += 1;
  s.label = label;
  if (checkpoint) s.checkpoint = checkpoint; // 断点续跑锚点
  emit(taskId);
}

export function cancel(taskId) {
  const s = state.get(taskId);
  if (s) { s.cancelled = true; emit(taskId); }
}

export function isCancelled(taskId) {
  return !!(state.get(taskId) || {}).cancelled;
}

export function getState(taskId) { return state.get(taskId) || null; }

export function on(taskId, fn) {
  if (!listeners.has(taskId)) listeners.set(taskId, new Set());
  listeners.get(taskId).add(fn);
  return () => listeners.get(taskId)?.delete(fn);
}

function emit(taskId) {
  const s = state.get(taskId);
  listeners.get(taskId)?.forEach((fn) => fn({ ...s, taskId }));
}
