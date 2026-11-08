// SCH-028 证据溯源包：把段落 ↔ 引用 ↔ 文献元数据 ↔ 摘录 连成可导出映射。
const CITE_RE = /\[@([A-Za-z0-9]+)\]/g;

export function buildProvenance({ body, literature }) {
  // body: [{index, text}]；literature: { key: {title, authors, year, excerpt} }
  const paraMap = [];
  const usedKeys = new Set();
  body.forEach((p, i) => {
    const cites = [...String(p.text || '').matchAll(CITE_RE)].map((m) => m[1]);
    cites.forEach((k) => usedKeys.add(k));
    if (cites.length) {
      paraMap.push({ paraIndex: i, text: p.text.slice(0, 120), cites });
    }
  });
  const litOut = [...usedKeys].map((k) => literature[k] ? { key: k, ...literature[k] } : { key: k, missing: true });
  return {
    generatedAt: new Date().toISOString(),
    paragraphCitationMap: paraMap,
    usedLiterature: litOut,
    missing: litOut.filter((l) => l.missing).map((l) => l.key)
  };
}

export function downloadProvenance(pack, filename) {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'secscholar-provenance.json';
  a.click();
  URL.revokeObjectURL(url);
  return a.download;
}
