// ===== 行级 diff（LCS），用于原文与修订对比 =====
function lcsMatrix(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

export function diffLines(oldText, newText) {
  const a = String(oldText || '').split('\n');
  const b = String(newText || '').split('\n');
  const dp = lcsMatrix(a, b);
  const ops = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { ops.push({ t: 'same', s: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: 'del', s: a[i] }); i++; }
    else { ops.push({ t: 'ins', s: b[j] }); j++; }
  }
  while (i < a.length) { ops.push({ t: 'del', s: a[i] }); i++; }
  while (j < b.length) { ops.push({ t: 'ins', s: b[j] }); j++; }
  return ops;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderDiffHTML(oldText, newText) {
  const ops = diffLines(oldText, newText);
  let ins = 0, del = 0;
  const html = ops.map((o) => {
    if (o.t === 'ins') { ins++; return '<div class="gw-diff gw-diff-ins">+ ' + esc(o.s) + '</div>'; }
    if (o.t === 'del') { del++; return '<div class="gw-diff gw-diff-del">− ' + esc(o.s) + '</div>'; }
    return '<div class="gw-diff gw-diff-same">&nbsp; ' + esc(o.s) + '</div>';
  }).join('');
  const summary = '<div class="gw-diff-sum">新增 ' + ins + ' 行 · 删除 ' + del + ' 行</div>';
  return summary + '<div class="gw-diff-wrap">' + html + '</div>';
}

export function diffStats(oldText, newText) {
  const ops = diffLines(oldText, newText);
  return {
    ins: ops.filter((o) => o.t === 'ins').length,
    del: ops.filter((o) => o.t === 'del').length,
    same: ops.filter((o) => o.t === 'same').length
  };
}
