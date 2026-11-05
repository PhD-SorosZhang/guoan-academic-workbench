// ===== Zotero 取用任务：本地 API 优先，导出粘贴兜底 =====
import { searchZotero, parseZoteroExport, probeZotero } from '../connectors/zotero.js';
import { importRefs } from './scholar-search.js';

export async function runZoteroFetch(params) {
  const mode = params.mode || 'api';
  let items = [];
  let note = '';

  if (mode === 'export') {
    if (!params.exportJson) throw new Error('请粘贴 Zotero 导出的 JSON 内容');
    items = parseZoteroExport(params.exportJson);
    note = '来自导出文件解析';
  } else {
    const probe = await probeZotero();
    if (!probe.ok) {
      throw new Error(
        'Zotero 本地 API 不可用（' + probe.error + '）。' +
        '请在 Zotero 7「设置 → 高级」勾选「允许本机其他应用与 Zotero 通信」，' +
        '或改用「粘贴 Zotero 导出 JSON」模式。'
      );
    }
    items = await searchZotero(params.query || '', { perPage: params.perPage || 50 });
    note = '来自 Zotero 本地库';
  }

  const imported = params.autoImport ? importRefs(items) : 0;

  const lines = [];
  lines.push('【Zotero 取用】' + note + '，共 ' + items.length + ' 条');
  lines.push('');
  items.forEach((it, i) => {
    lines.push((i + 1) + '. ' + it.title);
    lines.push('   ' + (it.year || '—') + '｜' + (it.venue || '—') + '｜' + ((it.authors || []).slice(0, 3).join('; ') || '—'));
    if (it.tags && it.tags.length) lines.push('   标签：' + it.tags.join('、'));
    if (it.abstract) lines.push('   摘要：' + it.abstract.slice(0, 200).replace(/\s+/g, ' ') + '…');
  });
  if (imported) lines.push('');
  if (imported) lines.push('【已入库】' + imported + ' 条');

  return {
    items,
    count: items.length,
    imported,
    note,
    text: lines.join('\n')
  };
}
