// SCH-014 CSSCI 灰度矢量图生成器
// 输出黑白灰 SVG，0.5pt 线条，可直接贴进 Word/Quarto，导出后无损。
// 所有图按顶刊版式：无配色、无阴影、无渐变。

const GRAY = { bg: '#ffffff', line: '#000000', fill1: '#f0f0f0', fill2: '#d0d0d0', fill3: '#9e9e9e', text: '#000000' };

function wrap(svgBody, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="SimSun, serif" font-size="12">${svgBody}</svg>`;
}

// 流程图：nodes=[{label}], edges=[[i,j]]
export function flowChart(nodes, edges, opts = {}) {
  const w = opts.width || 720, h = opts.height || 120;
  const n = nodes.length;
  const gap = (w - 80) / n;
  const boxW = gap - 16, boxH = 50;
  const y = (h - boxH) / 2;
  let body = '';
  nodes.forEach((nd, i) => {
    const x = 40 + i * gap;
    body += `<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" fill="${GRAY.fill1}" stroke="${GRAY.line}" stroke-width="0.5"/>`;
    body += `<text x="${x + boxW / 2}" y="${y + boxH / 2 + 4}" text-anchor="middle">${escapeXml(nd.label)}</text>`;
  });
  edges.forEach(([a, b]) => {
    if (b !== a + 1) return; // 只画顺序箭头
    const x1 = 40 + a * gap + boxW;
    const x2 = 40 + b * gap;
    body += `<line x1="${x1}" y1="${y + boxH / 2}" x2="${x2 - 2}" y2="${y + boxH / 2}" stroke="${GRAY.line}" stroke-width="0.5" marker-end="url(#arr)"/>`;
  });
  body = `<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${GRAY.line}"/></marker></defs>` + body;
  return wrap(body, w, h);
}

// 同心圆：三层，每层一个标签
export function concentric(rings) {
  const w = 400, cx = w / 2, cy = w / 2;
  let body = '';
  rings.forEach((r, i) => {
    const rad = 160 - i * 50;
    const fills = [GRAY.fill1, GRAY.fill2, GRAY.fill3];
    body += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fills[i]}" stroke="${GRAY.line}" stroke-width="0.5"/>`;
    body += `<text x="${cx}" y="${cy - rad + 16}" text-anchor="middle" font-size="11">${escapeXml(r.label)}</text>`;
  });
  return wrap(body, w, w);
}

// 雷达图：dims=[labels], values=[0..1]
export function radarChart(dims, values) {
  const w = 400, cx = w / 2, cy = w / 2, R = 140;
  const n = dims.length;
  let body = '';
  // 网格
  for (let ring = 1; ring <= 4; ring++) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = (R * ring) / 4;
      pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    }
    body += `<polygon points="${pts.join(' ')}" fill="none" stroke="${GRAY.line}" stroke-width="0.25" stroke-dasharray="2,2"/>`;
  }
  // 轴
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    body += `<line x1="${cx}" y1="${cy}" x2="${cx + R * Math.cos(a)}" y2="${cy + R * Math.sin(a)}" stroke="${GRAY.line}" stroke-width="0.25"/>`;
    body += `<text x="${cx + (R + 16) * Math.cos(a)}" y="${cy + (R + 16) * Math.sin(a) + 4}" text-anchor="middle" font-size="10">${escapeXml(dims[i])}</text>`;
  }
  // 数据
  const pts = values.map((v, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return `${cx + R * v * Math.cos(a)},${cy + R * v * Math.sin(a)}`;
  }).join(' ');
  body += `<polygon points="${pts}" fill="${GRAY.fill2}" fill-opacity="0.6" stroke="${GRAY.line}" stroke-width="0.5"/>`;
  return wrap(body, w, w);
}

export function downloadSVG(svg, filename) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'secscholar-figure.svg';
  a.click();
  URL.revokeObjectURL(url);
  return a.download;
}

function escapeXml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
