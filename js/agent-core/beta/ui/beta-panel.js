// V1-C Beta 内测台：把 SCH-001~031 里纯前端可运行的能力做成一个可点面板。
import { agreed, setAgreed, exportGuard, aiStatement, ETHICS_NOTICE } from '../compliance/ethics-gate.js';
import { auditReferences } from '../compliance/doi-verifier.js';
import { gate as riskGate } from '../compliance/domain-risk-gate.js';
import { encryptToFile } from '../crypto/task-crypto.js';
import { runBenchmark } from '../eval/benchmark.js';
import { runStaticReview } from '../core/reviewer-120.js';
import { evidenceCheck } from '../core/evidence.js';
import { buildSanitizePrompt, PROFILES } from '../core/sanitize-engine.js';
import { record as auditRecord, verifyChain } from '../infra/audit-logger.js';
import { status as quotaStatus } from '../infra/quota-broker.js';
import { PRESET_THEMES, themeContextBlock } from '../themes/preset-themes.js';
import { renderPaperPreview } from './paper-preview.js';
import { flowChart, concentric, radarChart, downloadSVG } from './svg-builder.js';
import { downloadWorkspace, importWorkspace, runMigrations } from '../core/migration.js';
import { checkInvite, whitelist } from '../auth/invite-gate.js';

const PANEL_ID = 'gw-beta-panel';
const VIEW_KEY = 'beta:view:dev';       // SCH-011
const GUIDE_KEY = 'beta:guide:done';    // SCH-012
const FEEDBACK_KEY = 'beta:feedback';   // SCH-015

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function isDevView() {
  try { return localStorage.getItem(VIEW_KEY) === '1'; } catch { return false; }
}

export function mountBetaDock() {
  if (document.getElementById(PANEL_ID)) return;
  try { runMigrations(); } catch {}

  const dock = el(`
    <div id="${PANEL_ID}" style="position:fixed;right:16px;bottom:16px;z-index:99999;font-family:system-ui,sans-serif">
      <button id="gw-beta-open" style="background:#1f3a5f;color:#fff;border:0;border-radius:20px;padding:10px 16px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2)">
        V1-C Beta 内测台
      </button>
      <div id="gw-beta-body" style="display:none;position:absolute;right:0;bottom:52px;width:440px;max-height:80vh;overflow:auto;background:#fff;color:#222;border:1px solid #ddd;border-radius:10px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.25)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b>V1-C Beta 能力台</b>
          <button id="gw-beta-close" style="border:0;background:none;cursor:pointer;font-size:16px">×</button>
        </div>
        <div id="gw-beta-content"></div>
      </div>
    </div>
  `);
  document.body.appendChild(dock);

  document.getElementById('gw-beta-open').addEventListener('click', () => {
    document.getElementById('gw-beta-body').style.display = 'block';
    renderContent();
    maybeShowGuide(); // SCH-012
  });
  document.getElementById('gw-beta-close').addEventListener('click', () => {
    document.getElementById('gw-beta-body').style.display = 'none';
  });
}

function out(s) {
  const o = document.getElementById('gw-beta-out');
  if (o) o.innerHTML = typeof s === 'string' ? s : JSON.stringify(s, null, 2);
}

function renderContent() {
  const box = document.getElementById('gw-beta-content');
  const a = agreed();
  const dev = isDevView();

  // 普通视图按钮（业务相关）
  const normalBtns = [
    ['bench', '跑评测'], ['risk', '领域风控'], ['review', '120维扫描'],
    ['evidence', '证据缺口'], ['sanitize', '三档清洗'], ['theme', '加载专题'],
    ['preview', '期刊预览'], ['svg', 'SVG 矢量图']
  ];
  // 开发者视图按钮（底层）
  const devBtns = [
    ['doi', 'DOI 校验'], ['audit', '审计链'], ['quota', '配额'],
    ['backup', '备份导出'], ['invite', '邀请码校验'], ['encrypt', '加密导出']
  ];

  const grid = (btns) =>
    `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px">` +
    btns.map(([k, label]) => `<button data-act="${k}" style="padding:6px;font-size:12px">${label}</button>`).join('') +
    `</div>`;

  box.innerHTML = `
    <div style="background:#fff8e1;border-left:3px solid #f57c00;padding:8px;margin:8px 0;font-size:12px">
      ${ETHICS_NOTICE}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
      <label><input type="checkbox" id="gw-beta-agree" ${a ? 'checked' : ''}> 同意学术使用协议</label>
      <label style="color:#888"><input type="checkbox" id="gw-beta-dev" ${dev ? 'checked' : ''}> 开发者视图</label>
    </div>
    ${grid(normalBtns)}
    ${dev ? `<div style="margin-top:10px;font-size:11px;color:#888;border-top:1px dashed #ccc;padding-top:6px">开发者区</div>${grid(devBtns)}` : ''}
    <div id="gw-beta-out" style="margin-top:10px;font-size:12px;white-space:pre-wrap;background:#f6f6f6;padding:8px;border-radius:6px;max-height:260px;overflow:auto"></div>
    <div style="margin-top:8px;display:flex;gap:6px">
      <button id="gw-beta-feedback" style="flex:1;padding:6px;font-size:12px;background:#c62828;color:#fff;border:0;border-radius:4px;cursor:pointer">标记问题（假文献/错论点/输出差）</button>
      <a href="docs.html" target="_blank" style="flex:1;padding:6px;font-size:12px;text-align:center;background:#eee;border-radius:4px;text-decoration:none;color:#222">打开文档站</a>
    </div>
  `;

  document.getElementById('gw-beta-agree').addEventListener('change', (e) => {
    setAgreed(e.target.checked);
    out(`协议已${e.target.checked ? '同意' : '撤销'}`);
  });
  document.getElementById('gw-beta-dev').addEventListener('change', (e) => {
    try { localStorage.setItem(VIEW_KEY, e.target.checked ? '1' : ''); } catch {}
    renderContent();
  });
  document.getElementById('gw-beta-feedback').addEventListener('click', feedbackDialog);
  box.querySelectorAll('button[data-act]').forEach((b) => {
    b.addEventListener('click', () => runAction(b.dataset.act));
  });
}

// SCH-012 首次引导
function maybeShowGuide() {
  let done = false;
  try { done = localStorage.getItem(GUIDE_KEY) === '1'; } catch {}
  if (done) return;
  const steps = [
    '👋 欢迎使用 SecScholar 内测台。\n\n① 先勾选上方「同意学术使用协议」。',
    '② 依次点普通视图里的按钮：\n跑评测 → 领域风控 → 120维扫描 → 期刊预览 → SVG 矢量图。',
    '③ 有问题点红色「标记问题」按钮。\n\n开发者视图里是底层调试，平时不用开。\n\n开始吧！'
  ];
  let i = 0;
  const next = () => {
    out(steps[i++]);
    if (i >= steps.length) {
      try { localStorage.setItem(GUIDE_KEY, '1'); } catch {}
    }
  };
  next();
}

// SCH-015 反馈收集
function feedbackDialog() {
  const type = prompt('问题类型（假文献/错论点/输出差/其他）：');
  if (!type) return;
  const detail = prompt('具体描述（哪一段、哪条文献、期望结果）：');
  if (!detail) return;
  try {
    const list = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
    list.push({ at: new Date().toISOString(), type, detail });
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list));
    out(`✅ 已记录反馈（共 ${list.length} 条），不会自动改论文，作者看到后会修。`);
  } catch { out('记录失败'); }
}

async function runAction(act) {
  try {
    if (act === 'bench') {
      const r = runBenchmark();
      const pass = r.assertions.filter((x) => x.pass).length;
      out(`内置评测：${pass}/${r.assertions.length} 项通过\n` +
        r.assertions.map((x) => (x.pass ? '✅' : '❌') + ' ' + x.name).join('\n'));
      await auditRecord({ action: 'beta.benchmark', detail: pass + '/' + r.assertions.length });
    }
    if (act === 'risk') {
      const t = '本文涉及分裂国家与武装政变的具体方法。';
      const r = riskGate(t, 'input');
      out(`样例：${t}\n判定：${r.action}\n${r.msg}`);
    }
    if (act === 'doi') {
      out('正在校验示例 DOI…');
      const r = await auditReferences('参考 [1] 张三. 示例. 10.1234/not-real-doi-xyz');
      out(JSON.stringify(r, null, 2));
    }
    if (act === 'review') {
      const t = prompt('粘贴一段正文做静态扫描：') || '综上所述，这表明国际秩序显著变化。本文认为这将彻底解决问题。[@Mearsheimer2014]';
      const r = runStaticReview(t);
      out(`命中 ${r.totalFindings} 处：\n` + r.findings.map((f) => `- [${f.dim}] ${f.msg}`).join('\n'));
    }
    if (act === 'evidence') {
      const r = evidenceCheck([{ tag: 'theory' }, { tag: 'case' }, { lang: 'en' }]);
      out(`证据统计：${JSON.stringify(r.counts)}\n通过：${r.pass}\n缺口：${r.gaps.join('; ') || '无'}`);
    }
    if (act === 'sanitize') {
      const p = buildSanitizePrompt('这是一段示例正文。', 'journal');
      out(`档位：${PROFILES.journal.label}\n系统提示：\n${p.system}`);
    }
    if (act === 'audit') {
      await auditRecord({ action: 'beta.manual-test' });
      const v = await verifyChain();
      out(`审计链校验：${v.ok ? '✅ 完整' : '❌ 断裂 @' + v.brokenAtIndex}`);
    }
    if (act === 'quota') {
      out('当前配额：\n' + JSON.stringify(quotaStatus('local-user'), null, 2));
    }
    if (act === 'theme') {
      out('可选专题：\n' + PRESET_THEMES.map((t) => '- ' + t.name).join('\n') +
        '\n\n示例（前 300 字）：\n' + themeContextBlock('chokepoint').slice(0, 300));
    }
    if (act === 'preview') {
      const t = prompt('粘贴论文正文（含"摘要："和"关键词"）：') ||
        '摘要：本文研究海上通道排他性治理的棘轮效应。\n关键词：海上通道；棘轮效应；安全化\n一、引言\n近年来国际秩序显著变化[@Mearsheimer2014]。\n二、案例\n本文认为这将彻底解决治理困境。\n参考文献';
      const r = renderPaperPreview(t, 'xiandai');
      out(r.html);
    }
    if (act === 'svg') {
      const kind = prompt('图类型：flow / concentric / radar', 'flow');
      let svg;
      if (kind === 'flow') {
        svg = flowChart([{ label: '威胁识别' }, { label: '安全化言说' }, { label: '制度锁定' }, { label: '棘轮效应' }], [[0,1],[1,2],[2,3]]);
      } else if (kind === 'concentric') {
        svg = concentric([{ label: '核心概念' }, { label: '中层机制' }, { label: '经验案例' }]);
      } else {
        svg = radarChart(['理论', '案例', '数据', '对话', '方法'], [0.8, 0.6, 0.3, 0.5, 0.7]);
      }
      const name = downloadSVG(svg, `secscholar-${kind}.svg`);
      out(`已下载：${name}\n（黑白灰 SVG，可直接插入 Word，矢量无损）`);
    }
    if (act === 'backup') {
      const name = downloadWorkspace();
      out(`已备份整个研究空间：${name}\n（换浏览器时用 importWorkspace 还原）`);
    }
    if (act === 'invite') {
      const code = prompt('输入邀请码（或留空看白名单）：');
      if (!code) { out('当前白名单：\n' + whitelist().join('\n')); return; }
      const email = prompt('邮箱（机构后缀自动识别，可留空）：') || '';
      out(JSON.stringify(checkInvite(code, email), null, 2));
    }
    if (act === 'encrypt') {
      const g = exportGuard({ body: '示例正文。' });
      if (!g.ok) { out('❌ ' + g.msg); return; }
      const pw = prompt('设置导出包密码：');
      if (!pw) return;
      const name = await encryptToFile({ body: g.payload.body, aiStatement: aiStatement() }, pw);
      out('已下载加密包：' + name);
    }
  } catch (e) {
    out('出错：' + (e && e.message ? e.message : String(e)));
  }
}
