// ===== 项目级记忆（隔离存储，供链式任务继承上下文）=====
import { createStore } from './store/idb.js';
import { getConfig } from './config.js';

const store = createStore('AgentMemoryDB', 1, (db) => {
  if (!db.objectStoreNames.contains('context')) db.createObjectStore('context', { keyPath: 'pid' });
  if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
});

function keyOf(pid) {
  return getConfig().memory.projectIsolate ? (pid || 'default') : 'global';
}

export async function getProjectContext(pid) {
  if (!getConfig().memory.enable) return {};
  try {
    const rec = await store.get('context', keyOf(pid));
    return rec ? rec.data : {};
  } catch (e) { return {}; }
}

export async function setProjectContext(pid, patch) {
  if (!getConfig().memory.enable) return;
  const cur = await getProjectContext(pid);
  const next = Object.assign({}, cur, patch, { updatedAt: Date.now() });
  await store.put('context', { pid: keyOf(pid), data: next });
  return next;
}

/** 追加一条研究要点（用于链式任务逐步沉淀） */
export async function appendContext(pid, slot, text) {
  const cur = await getProjectContext(pid);
  const arr = Array.isArray(cur[slot]) ? cur[slot] : [];
  arr.push({ text, ts: Date.now() });
  return setProjectContext(pid, { [slot]: arr });
}

export async function logTask(pid, taskName, input, output, meta = {}) {
  try {
    await store.add('tasks', {
      pid: keyOf(pid),
      taskName,
      input: typeof input === 'string' ? input.slice(0, 20000) : JSON.stringify(input || {}).slice(0, 20000),
      output: typeof output === 'string' ? output.slice(0, 40000) : JSON.stringify(output || {}).slice(0, 40000),
      meta,
      ts: Date.now()
    });
  } catch (e) {}
}

export async function getTaskHistory(pid, limit = 30) {
  try {
    const all = await store.all('tasks');
    return all
      .filter((t) => t.pid === keyOf(pid))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit);
  } catch (e) { return []; }
}

export async function clearProjectMemory(pid) {
  try { await store.del('context', keyOf(pid)); } catch (e) {}
}
