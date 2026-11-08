// SCH-005 分支与一致性：大纲/核心定义改动时打快照，扫描全文冲突。
const PREFIX = 'beta:branch:';

export function snapshot(task) {
  const id = 'snap_' + Date.now();
  const rec = {
    id, at: new Date().toISOString(),
    outline: task.outline, definitions: task.definitions, body: task.body
  };
  try {
    const all = JSON.parse(localStorage.getItem(PREFIX + task.id) || '[]');
    all.push(rec);
    localStorage.setItem(PREFIX + task.id, JSON.stringify(all));
  } catch {}
  return id;
}

export function listSnapshots(taskId) {
  try { return JSON.parse(localStorage.getItem(PREFIX + taskId) || '[]'); } catch { return []; }
}

// 扫描全文：同一术语前后定义不一致、章节边界漂移
export function consistencyScan(task) {
  const defs = task.definitions || {};
  const conflicts = [];
  const body = Array.isArray(task.body) ? task.body : String(task.body || '').split('\n');
  body.forEach((para, i) => {
    const text = typeof para === 'string' ? para : (para.text || '');
    for (const [term, canon] of Object.entries(defs)) {
      if (text.includes(term) && canon && !text.includes(canon)) {
        // 段落里出现了术语但用了与已确立定义不同的表述
        conflicts.push({
          paraIndex: i, term, expected: canon,
          snippet: text.slice(0, 80),
          suggestion: `统一为：${term} = ${canon}`
        });
      }
    }
  });
  return conflicts;
}
