// ===== 引导层：注册任务、挂载 UI、暴露全局接口 =====
import { registerTask, TaskType, onTaskEvent, queueStatus } from './scheduler.js';
import { runScholarSearch, formatSearchResult } from './modules/scholar-search.js';
import { runZoteroFetch } from './modules/zotero-fetch.js';
import { runLitRead } from './modules/lit-reader.js';
import { runTopicScore } from './modules/topic-score.js';
import { runADWClean } from './modules/adw-cleaner.js';
import { runNSReview } from './modules/ns-review.js';
import { runManuscriptBuild } from './modules/manuscript.js';
import { runCitation } from './modules/citation.js';
import { runDeliverable } from './modules/deliverable.js';
import { runChapterWrite } from './modules/chapter-writer.js';
import { runAssemble } from './modules/assembler.js';
import { runRevision } from './modules/revision.js';
import { runFormatAudit } from './modules/format-audit.js';
import { buildTaskChain } from './planner.js';
import { ChainRunner } from './chain-runner.js';
import { getProjectContext, setProjectContext, getTaskHistory, clearProjectMemory } from './memory-store.js';
import { getConfig, setConfig, hasLLM } from './config.js';
import { probeSources } from './connectors/index.js';
import { probeZotero } from './connectors/zotero.js';
import { clearHttpCache } from './net/http.js';
import { openAgentModal, closeAgentModal, renderChainPanel, appendChainLog, markStep, openConfirmModal, notifyBridge } from './ui/panels.js';

let booted = false;

export function boot() {
  if (booted) return;
  booted = true;

  // ---- 注册全部任务 ----
  registerTask(TaskType.SCHOLAR_SEARCH, runScholarSearch);
  registerTask(TaskType.ZOTERO_FETCH, runZoteroFetch);
  registerTask(TaskType.LIT_READ, runLitRead);
  registerTask(TaskType.TOPIC_SCORE, runTopicScore);
  registerTask(TaskType.ADW_CLEAN, runADWClean);
  registerTask(TaskType.NS_REVIEW, runNSReview);
  registerTask(TaskType.BUILD_OUTLINE, runManuscriptBuild);
  registerTask(TaskType.ABSTRACT, (p, c) => runManuscriptBuild(Object.assign({}, p, { mode: 'abstract' }), c));
  registerTask(TaskType.DELIVERABLE, runDeliverable);
  registerTask(TaskType.CITATION, runCitation);
  registerTask(TaskType.CHAPTER_WRITE, runChapterWrite);
  registerTask(TaskType.ASSEMBLE, runAssemble);
  registerTask(TaskType.REVISION, runRevision);
  registerTask(TaskType.FORMAT_AUDIT, runFormatAudit);

  // ---- 编辑器钩子（对接 V8 主编辑区，若不存在则退化）----
  if (!window.GWEditor) {
    window.GWEditor = {
      getText() {
        const ed = document.querySelector('#mainContent textarea, .editor-area textarea, #paperEditor');
        return ed ? ed.value : '';
      },
      insert(text) {
        const ed = document.querySelector('#mainContent textarea, .editor-area textarea, #paperEditor');
        if (ed) { ed.value = (ed.value ? ed.value + '\n\n' : '') + text; return true; }
        if (window.V8Bridge) {
          window.V8Bridge.addNote('Agent 回填 ' + new Date().toLocaleString('zh-CN'), text);
          window.V8Bridge.toast('无编辑器，已存入笔记');
          return true;
        }
        return false;
      }
    };
  }

  bindSidebar();
  bindModal();
  bindChainEntry();
  bindSettings();

  console.log('[Agent] V1-C 就绪，任务类型：' + Object.keys(TaskType).length);
}

function pid() {
  try { return (window.V8Bridge && window.V8Bridge.projectId && window.V8Bridge.projectId()) || 'default'; }
  catch (e) { return 'default'; }
}

/* ---------- 侧边功能按钮 ---------- */
function bindSidebar() {
  const box = document.getElementById('gw-agent-buttons');
  if (!box) return;
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gw]');
    if (!btn) return;
    const key = btn.getAttribute('data-gw');
    if (key === 'settings') { renderSettingsPanel(); return; }
    openAgentModal(key, pid());
  });
}

/* ---------- 弹窗关闭 ---------- */
function bindModal() {
  const modal = document.getElementById('gw-modal');
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-gw-close]')) closeAgentModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAgentModal();
      const c = document.getElementById('gw-confirm');
      if (c) c.style.display = 'none';
    }
  });
}

/* ---------- 自主目标入口 ---------- */
function bindChainEntry() {
  const btn = document.getElementById('gw-chain-start');
  const input = document.getElementById('gw-goal');
  const container = document.getElementById('gw-chain-container');
  if (!btn || !input || !container) return;

  let runner = null;

  btn.addEventListener('click', async () => {
    const goal = input.value.trim();
    if (!goal) { notifyBridge('请先输入研究目标'); return; }

    if (!hasLLM()) {
      notifyBridge('未配置模型 Key，无法规划任务链。请先在 Agent 设置中填写。');
      renderSettingsPanel();
      return;
    }

    container.innerHTML = '<div class="gw-loading">正在根据目标规划任务链…</div>';
    btn.disabled = true;

    try {
      const ctx = await getProjectContext(pid());
      const chain = await buildTaskChain(pid(), goal, ctx);
      await setProjectContext(pid(), { researchFocus: ctx.researchFocus || goal.slice(0, 80) });

      container.innerHTML = '';
      const panel = renderChainPanel(chain);
      container.appendChild(panel);

      runner = new ChainRunner(pid(), chain, {
        onLog: (t) => appendChainLog(panel, t),
        onConfirm: (step, resolve) => {
          appendChainLog(panel, '需要人工确认', 'warn');
          openConfirmModal(step, resolve);
        },
        onStepDone: (step, out) => {
          const idx = chain.steps.indexOf(step);
          markStep(panel, idx, 'done');
          appendChainLog(panel, '已完成：' + (step.note || step.taskType), 'ok');
          if (window.V8Bridge && out) {
            const t = typeof out === 'string' ? out : (out.text || JSON.stringify(out, null, 2));
            window.V8Bridge.addNote('流水线｜' + (step.note || step.taskType), String(t).slice(0, 8000));
          }
        },
        onFinish: () => {
          appendChainLog(panel, '整条流水线执行完毕', 'ok');
          btn.disabled = false;
        },
        onError: (msg) => {
          appendChainLog(panel, msg, 'err');
          btn.disabled = false;
        }
      });
      await runner.start(false);
    } catch (e) {
      container.innerHTML = '<div class="gw-error">规划失败：' + escapeHtml(e.message || String(e)) + '</div>';
      btn.disabled = false;
    }
  });

  const resumeBtn = document.getElementById('gw-chain-resume');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', async () => {
      const goal = input.value.trim();
      if (!goal) { notifyBridge('续跑需要重新填写同一目标，或从历史记录选择'); return; }
      // 简化处理：重新规划后从断点恢复
      btn.click();
    });
  }

  const presetBtn = document.getElementById('gw-chain-preset');
  if (presetBtn) {
    presetBtn.addEventListener('click', () => {
      const cur = input.value.trim();
      const topic = cur || '（先在此填论文题目，再点启动）';
      input.value = '按论文全流程推进：' + topic
        + '。依次执行 12 维选题评估 → 生成期刊大纲 → 按大纲分章撰写正文 → 全文合稿 → 120 维审稿扫描 → 返修改稿 → 全文格式体检 → 参考文献格式化；在理论框架与案例范围处停下来让我确认。';
      input.focus();
      notifyBridge('已填入全流程指令，补全题目后点“启动流水线”');
    });
  }
}

/* ---------- 设置面板 ---------- */
function renderSettingsPanel() {
  const host = document.getElementById('gw-settings');
  if (!host) return;
  const cfg = getConfig();

  host.innerHTML = ''
    + '<div class="gw-set-row"><label>模型提供方</label><select id="gw-cfg-provider">'
    + ['deepseek', 'glm', 'qwen', 'custom'].map((p) => '<option value="' + p + '"' + (cfg.model.provider === p ? ' selected' : '') + '>' + p + '</option>').join('')
    + '</select></div>'
    + '<div class="gw-set-row"><label>Base URL</label><input id="gw-cfg-base" value="' + escapeAttr(cfg.model.baseUrl) + '"></div>'
    + '<div class="gw-set-row"><label>模型名</label><input id="gw-cfg-model" value="' + escapeAttr(cfg.model.modelName) + '"></div>'
    + '<div class="gw-set-row"><label>API Key</label><input id="gw-cfg-key" type="password" value="' + escapeAttr(cfg.model.apiKey) + '" placeholder="sk-..."></div>'
    + '<div class="gw-set-row"><label>礼貌池邮箱（OpenAlex/Crossref）</label><input id="gw-cfg-mail" value="' + escapeAttr(cfg.scholar.mailto) + '"></div>'
    + '<div class="gw-set-row"><label>检索年限</label><input id="gw-cfg-years" type="number" value="' + cfg.scholar.years + '"></div>'
    + '<div class="gw-set-row"><label>Semantic Scholar Key（可选）</label><input id="gw-cfg-s2" value="' + escapeAttr(cfg.scholar.s2Key) + '"></div>'
    + '<div class="gw-set-row"><label>Zotero 本地 API</label><input id="gw-cfg-zot" value="' + escapeAttr(cfg.zotero.apiBase) + '"></div>'
    + '<div class="gw-set-row"><label>启用本地 Ollama</label><label class="gw-chk"><input type="checkbox" id="gw-cfg-ollama"' + (cfg.model.ollama.enable ? ' checked' : '') + '><span>离线运行</span></label></div>'
    + '<div class="gw-set-actions">'
    + '<button class="gw-btn gw-btn-primary" id="gw-cfg-save">保存</button>'
    + '<button class="gw-btn" id="gw-cfg-probe">测试连通</button>'
    + '<button class="gw-btn" id="gw-cfg-clear">清空缓存</button>'
    + '</div>'
    + '<div id="gw-probe-out" class="gw-probe"></div>';

  document.getElementById('gw-cfg-save').addEventListener('click', () => {
    setConfig({
      model: {
        provider: document.getElementById('gw-cfg-provider').value,
        baseUrl: document.getElementById('gw-cfg-base').value.trim(),
        modelName: document.getElementById('gw-cfg-model').value.trim(),
        apiKey: document.getElementById('gw-cfg-key').value.trim(),
        ollama: { enable: document.getElementById('gw-cfg-ollama').checked }
      },
      scholar: {
        mailto: document.getElementById('gw-cfg-mail').value.trim(),
        years: Number(document.getElementById('gw-cfg-years').value) || 5,
        s2Key: document.getElementById('gw-cfg-s2').value.trim()
      },
      zotero: { apiBase: document.getElementById('gw-cfg-zot').value.trim() }
    });
    notifyBridge('配置已保存');
  });

  document.getElementById('gw-cfg-probe').addEventListener('click', async () => {
    const out = document.getElementById('gw-probe-out');
    out.textContent = '正在测试…';
    const rows = [];
    const z = await probeZotero();
    rows.push('Zotero：' + (z.ok ? '已连通' : '未连通（' + z.error + '）'));
    try {
      const ps = await probeSources();
      ps.forEach((p) => rows.push(p.source + '：' + (p.ok ? '正常（样本 ' + p.sample + '）' : '失败（' + p.error + '）')));
    } catch (e) {
      rows.push('聚合探测失败：' + e.message);
    }
    out.innerHTML = rows.map((r) => '<div>' + escapeHtml(r) + '</div>').join('');
  });

  document.getElementById('gw-cfg-clear').addEventListener('click', async () => {
    await clearHttpCache();
    notifyBridge('HTTP 缓存已清空');
  });

  host.style.display = 'block';
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function bindSettings() { /* 设置面板按需渲染，无全局绑定 */ }

/* ---------- 对外接口 ---------- */
boot();

window.AgentCore = {
  TaskType,
  boot,
  openAgentModal,
  closeAgentModal,
  renderSettingsPanel,
  buildTaskChain,
  getConfig,
  setConfig,
  hasLLM,
  probeSources,
  probeZotero,
  getProjectContext,
  setProjectContext,
  getTaskHistory,
  clearProjectMemory,
  queueStatus,
  onTaskEvent,
  formatSearchResult
};
