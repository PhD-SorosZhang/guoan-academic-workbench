// SCH-021 版本化迁移 + 一键导出/导入整个研究空间。
// 纯前端：localStorage 全量导出为 JSON 文件；导入时按版本号跑迁移脚本。
const VERSION_KEY = 'beta:db:version';
const CURRENT_VERSION = 2;

// 迁移表：from -> to 的升级函数。新增版本就在这里加一条。
const MIGRATIONS = {
  1: (data) => {
    // v1 -> v2: 给所有 sandbox 数据补 task_id 前缀（本项目起步就是 v2，此条留作示例）
    return { ...data, migratedFrom: 1 };
  }
};

export function currentVersion() {
  return CURRENT_VERSION;
}

export function storedVersion() {
  const v = parseInt(localStorage.getItem(VERSION_KEY) || '1', 10);
  return isNaN(v) ? 1 : v;
}

// 启动时调用：如果存储版本落后，跑迁移
export function runMigrations() {
  let v = storedVersion();
  const applied = [];
  while (v < CURRENT_VERSION && MIGRATIONS[v]) {
    MIGRATIONS[v]({});
    applied.push(`${v} -> ${v + 1}`);
    v += 1;
  }
  localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
  return { from: storedVersion(), to: CURRENT_VERSION, applied };
}

// 一键导出整个研究空间（所有 beta: 开头的 key）
export function exportWorkspace() {
  const dump = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    keys: {}
  };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('beta:')) dump.keys[k] = localStorage.getItem(k);
  }
  return dump;
}

export function downloadWorkspace() {
  const dump = exportWorkspace();
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `secscholar-backup-v${dump.version}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return a.download;
}

// 导入备份；onConflict 决定怎么处理同名 key
export function importWorkspace(dump, onConflict = 'overwrite') {
  if (!dump || !dump.keys) return { ok: false, msg: '备份文件格式不对' };
  let overwritten = 0, skipped = 0;
  for (const [k, v] of Object.entries(dump.keys)) {
    const exists = localStorage.getItem(k) !== null;
    if (exists && onConflict === 'skip') { skipped++; continue; }
    localStorage.setItem(k, v);
    overwritten++;
  }
  localStorage.setItem(VERSION_KEY, String(dump.version || CURRENT_VERSION));
  return { ok: true, overwritten, skipped, version: dump.version };
}
