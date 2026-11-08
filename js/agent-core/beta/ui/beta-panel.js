// V1-C Beta 内测台：把 SCH-001~031 里纯前端可运行的能力做成一个可点面板。
import { agreed, setAgreed, exportGuard, aiStatement, ETHICS_NOTICE } from '../compliance/ethics-gate.js';
import { auditReferences } from '../compliance/doi-verifier.js';
import { gate as riskGate } from '../compliance/domain-risk-gate.js';
import { encryptToFile } from '../crypto/task-crypto.js';
import { runBenchmark } from '../eval/benchmark.js';
import { runStaticReview } from '../core/reviewer-120.js';
import { evidenceCheck } from '../core/evidence.js';
import { buildSanitizePrompt, PROFILES } from '../core/sanitize-engine.js';
import { addAnnotation, listAll, setStatus, responseTable } from '../core/annotation-tracker.js';
import { record as auditRecord, verifyChain, recent as auditRecent } from '../infra/audit-logger.js';
import { status as quotaStatus } from '../infra/quota-broker.js';
import { PRESET_THEMES, themeContextBlock } from '../themes/preset-themes.js';

const PANEL_ID = 'gw-beta-panel';

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function row(label, controlHtml) {
  return `<div style="margin:8px 0"><div style="font-size:12px;color:#888;margin-bottom:4px">${label}</div>${controlHtml}</div>`;
}

export function mountBetaDock() {
  if (document.getElementById(PANEL_ID)) return;

  const dock = el(`
    <div id="${PANEL_ID}" style="position:fixed;right:16px;bottom:16px;z-index:99999;font-family:system-ui,sans-serif">
      <button id="gw-beta-open" style="background:#1f3a5f;color:#fff;border:0;border-radius:20px;padding:10px 16px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2)">
        V1-C Beta 内测台
      </button>
      <div id="gw-beta-body" style="display:none;position:absolute;right:0;bottom:52px;width:420px;max-height:80vh;overflow:auto;background:#fff;color:#22c;border:1px solid #ddd;border-radius:10px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.25)">
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
  });
  document.getElementById('gw-beta-close').addEventListener('click', () => {
    document.getElementById('gw-beta-body').style.display = 'none';
  });
}

function renderContent() {
  const box = document.getElementById('gw-beta-content');
  const a = agreed();
  box.innerHTML = `
    <div style="background:#fff8e1;border-left:3px solid #f57c00;padding:8px;margin:8px 0;font-size:12px">
      ${ETHICS_NOTICE}
    </div>
    ${row('① 学术使用协议（未勾选不能导出）', `
      <label><input type="checkbox" id="gw-beta-agree" ${a ? 'checked' : ''}> 我已阅读并同意仅作学术辅助</label>
    `)}
    <div id="gw-beta-out" style="margin-top:10px;font-size:12px;white-space:pre-wrap;background:#f6f6f6;padding:8px;border-radius:6px;max-height:260px;overflow:auto"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px">
      <button data-act="bench" style="padding:6px">跑内置评测</button>
      <button data-act="risk" style="padding:6px">领域风控自检</button>
      <button data-act="doi" style="padding:6px">DOI 校验</button>
      <button data-act="review" style="padding:6px">120维静态扫描</button>
      <button data-act="evidence" style="padding:6px">证据缺口</button>
      <button data-act="sanitize" style="padding:6px">三档清洗样例</button>
      <button data-act="audit" style="padding:6px">审计链校验</button>
      <button data-act="quota" style="padding:6px">配额状态</button>
      <button data-act="theme" style="padding:6px">加载专题</button>
      <button data-act="export" style="padding:6px">加密导出</button>
    </div>
  `;

  document.getElementById('gw-beta-agree').addEventListener('change', (e) => {
    setAgreed(e.target.checked);
    out(`协议已${e.target.checked ? '同意' : '撤销'}。`);
  });

  box.querySelectorAll('button[data-act]').forEach((b) => {
    b.addEventListener('click', () => runAction(b.dataset.act));
  });
}

function out(s) {
  const o = document.getElementById('gw-beta-out');
  if (o) o.textContent = typeof s === 'string' ? s : JSON.stringify(s, null, 2);
}

async function runAction(act) {
  try {
    if (act === 'bench') {
      const r = runBenchmark();
      const pass = r.assertions.filter((x) => x.pass).length;
      out(`内置评测：${pass}/${r.assertions.length} 项断言通过\n` +
        r.assertions.map((x) => (x.pass ? '✅' : '❌') + ' ' + x.name).join('\n'));
      await auditRecord({ action: 'beta.benchmark', detail: pass + '/' + r.assertions.length });
    }
    if (act === 'risk') {
      const t = '本文涉及分裂国家与武装政变的具体方法。';
      const r = riskGate(t, 'input');
      out(`输入样例：${t}\n判定：${r.action}\n${r.msg}`);
    }
    if (act === 'doi') {
      out('正在校验示例 DOI（在线可达才判真，否则标未核验）…');
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
      out(`审计链校验：${v.ok ? '✅ 完整' : '❌ 断裂 @' + v.brokenAtIndex}\n最近 ${auditRecent(3).length} 条记录。`);
    }
    if (act === 'quota') {
      out('当前配额（单机 localStorage）：\n' + JSON.stringify(quotaStatus('local-user'), null, 2));
    }
    if (act === 'theme') {
      out('可选专题：\n' + PRESET_THEMES.map((t) => '- ' + t.name).join('\n') +
        '\n\n示例上下文块（前 300 字）：\n' + themeContextBlock('chokepoint').slice(0, 300));
    }
    if (act === 'export') {
      const g = exportGuard({ body: '示例正文。' });
      if (!g.ok) { out('❌ ' + g.msg); return; }
      const pw = prompt('设置导出包密码：');
      if (!pw) return;
      const name = await encryptToFile({ body: g.payload.body, aiStatement: aiStatement() }, pw);
      out('已下载加密包：' + name + '\n（无密码无法解密，服务端看不到明文）');
    }
  } catch (e) {
    out('出错：' + (e && e.message ? e.message : String(e)));
  }
}
