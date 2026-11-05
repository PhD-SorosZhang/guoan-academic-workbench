// ===== 面板层：结果卡 / 参数弹窗 / 流水线看板 / 确认框 =====
import { submitTask, TaskType, TASK_LABEL, onTaskEvent } from '../scheduler.js';
import { renderDiffHTML } from './diff-render.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* ---------------- 结果卡 ---------------- */

export function renderResultBlock(content, original, pid, opts = {}) {
  const text = typeof content === 'string' ? content : (content.text || JSON.stringify(content, null, 2));
  const wrap = el('<div class="gw-result">'
    + '<div class="gw-result-head"><span class="gw-result-title">Agent 产出</span><span class="gw-result-meta"></span></div>'
    + '<pre class="gw-output"></pre>'
    + '<div class="gw-actions">'
    + '<button class="gw-btn gw-btn-primary" data-act="insert">回填编辑器</button>'
    + '<button class="gw-btn" data-act="note">存入项目笔记</button>'
    + '<button class="gw-btn" data-act="ref">入库为文献</button>'
    + '<button class="gw-btn" data-act="diff">对比原文</button>'
    + '<button class="gw-btn" data-act="copy">复制</button>'
    + '</div>'
    + '<div class="gw-diff-box" style="display:none"></div>'
    + '</div>');

  wrap.querySelector('.gw-output').textContent = text;
  wrap.querySelector('.gw-result-title').textContent = opts.title || 'Agent 产出';
  wrap.querySelector('.gw-result-meta').textContent = text.length + ' 字';

  wrap.querySelector('[data-act="insert"]').addEventListener('click', () => {
    if (window.GWEditor && window.GWEditor.insert) window.GWEditor.insert(text);
    else alert('未找到编辑器钩子');
  });

  wrap.querySelector('[data-act="note"]').addEventListener('click', () => {
    if (window.V8Bridge) {
      window.V8Bridge.addNote((opts.title || 'Agent 产出') + ' ' + new Date().toLocaleString('zh-CN'), text);
      notify('已存入项目笔记');
    } else notify('V8 桥接未就绪');
  });

  const refBtn = wrap.querySelector('[data-act="ref"]');
  refBtn.addEventListener('click', () => {
    if (!window.V8Bridge) return notify('V8 桥接未就绪');
    const q = String(content && content.topic || original || '').slice(0, 40);
    window.V8Bridge.insertRef({
      title: (opts.title || 'Agent 产出') + (q ? '｜' + q : ''),
      author: '',
      source: 'Agent 生成',
      year: String(new Date().getFullYear()),
      tags: 'agent',
      note: text.slice(0, 2000),
      doi: '', url: '', citedBy: 0, agentScore: 0
    });
    notify('已入库到文献管理');
  });

  const diffBox = wrap.querySelector('.gw-diff-box');
  wrap.querySelector('[data-act="diff"]').addEventListener('click', () => {
    if (!original) { notify('没有可比对的原文'); return; }
    if (diffBox.style.display === 'none') {
      diffBox.innerHTML = renderDiffHTML(original, text);
      diffBox.style.display = 'block';
    } else {
      diffBox.style.display = 'none';
    }
  });

  wrap.querySelector('[data-act="copy"]').addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => notify('已复制')).catch(() => notify('复制失败'));
  });

  return wrap;
}

export function notifyBridge(msg) {
  if (window.V8Bridge && window.V8Bridge.toast) window.V8Bridge.toast(msg);
  else console.log(msg);
}

const notify = notifyBridge;

/* ---------------- 表单元数据 ---------------- */

const JOURNAL_OPTS = ['太平洋学报', '现代国际关系', '国际安全研究', '世界经济与政治'];

const FORMS = {
  'scholar-search': {
    title: '跨库文献检索',
    task: TaskType.SCHOLAR_SEARCH,
    fields: [
      { n: 'topic', l: '研究主题', t: 'textarea', d: '', ph: '例如：海上通道排他性治理的棘轮效应' },
      { n: 'enKeywords', l: '英文检索词（可留空，留空则靠模型自动翻译；未配模型时留空会跳过国际库）', t: 'text', d: '' },
      { n: 'sources', l: '数据源', t: 'checks', opts: [
        ['openalex', 'OpenAlex'], ['crossref', 'Crossref'],
        ['semanticscholar', 'Semantic Scholar'], ['zotero', 'Zotero 本地库']
      ], d: ['openalex', 'crossref'] },
      { n: 'fromYear', l: '起始年份', t: 'text', d: String(new Date().getFullYear() - 5) },
      { n: 'topN', l: '返回条数', t: 'number', d: 15 },
      { n: 'autoImport', l: '自动写入文献库', t: 'check', d: false }
    ]
  },
  'zotero-fetch': {
    title: 'Zotero 取用',
    task: TaskType.ZOTERO_FETCH,
    fields: [
      { n: 'mode', l: '取用方式', t: 'select', opts: ['api', 'export'], d: 'api' },
      { n: 'query', l: '检索词（留空取全部）', t: 'text', d: '' },
      { n: 'perPage', l: '最多条数', t: 'number', d: 50 },
      { n: 'exportJson', l: 'Zotero 导出 JSON（选 export 模式时填写）', t: 'textarea', d: '' },
      { n: 'autoImport', l: '自动写入文献库', t: 'check', d: false }
    ]
  },
  'lit-read': {
    title: '文献精读',
    task: TaskType.LIT_READ,
    fields: [
      { n: 'text', l: '文献正文（可粘贴摘要或全文）', t: 'textarea', d: '', fromEditor: true },
      { n: 'sourceType', l: '文献类型', t: 'select', opts: ['auto', '中文期刊论文', '英文期刊论文', '学位论文', '政策文本', '专著章节'], d: 'auto' },
      { n: 'extraRequest', l: '附加要求', t: 'text', d: '' }
    ]
  },
  'topic-score': {
    title: '12 维选题评估',
    task: TaskType.TOPIC_SCORE,
    fields: [
      { n: 'title', l: '选题名称', t: 'text', d: '' },
      { n: 'researchQuestion', l: '核心研究问题', t: 'textarea', d: '' },
      { n: 'theory', l: '拟用理论', t: 'text', d: '' },
      { n: 'method', l: '拟用方法', t: 'text', d: '' },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' },
      { n: 'keywords', l: '关键词', t: 'text', d: '' }
    ]
  },
  'adw-clean': {
    title: '防御性写作清洗',
    task: TaskType.ADW_CLEAN,
    fields: [
      { n: 'text', l: '待清洗文本', t: 'textarea', d: '', fromEditor: true },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' },
      { n: 'targetRatio', l: '目标 AI 率上限(%)', t: 'number', d: 10 }
    ]
  },
  'ns-review': {
    title: '国安学 120 维审稿扫描',
    task: TaskType.NS_REVIEW,
    fields: [
      { n: 'text', l: '待审文稿', t: 'textarea', d: '', fromEditor: true },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' },
      { n: 'depth', l: '深度逐段审查', t: 'check', d: true }
    ]
  },
  'build-outline': {
    title: '生成期刊大纲',
    task: TaskType.BUILD_OUTLINE,
    fields: [
      { n: 'title', l: '论文题目', t: 'text', d: '' },
      { n: 'rq', l: '研究问题', t: 'textarea', d: '' },
      { n: 'theory', l: '理论锚点', t: 'text', d: '' },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' },
      { n: 'lengthHint', l: '篇幅', t: 'text', d: '1.2-1.5 万字' }
    ],
    extra: { mode: 'outline' }
  },
  'abstract': {
    title: '英文摘要润色',
    task: TaskType.ABSTRACT,
    fields: [
      { n: 'text', l: '中文摘要 / 正文', t: 'textarea', d: '', fromEditor: true },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' }
    ],
    extra: { mode: 'abstract' }
  },
  'deliverable': {
    title: '配套材料生成',
    task: TaskType.DELIVERABLE,
    fields: [
      { n: 'packType', l: '产出类型', t: 'select', opts: [
        ['cover', '投稿信'],
        ['talk', '投稿汇报演讲稿'],
        ['weekly', '研究周报'],
        ['response', '返修回应']
      ], d: 'cover' },
      { n: 'text', l: '基础文稿 / 材料', t: 'textarea', d: '', fromEditor: true },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' },
      { n: 'duration', l: '汇报时长', t: 'text', d: '15 分钟' }
    ]
  },
  'citation': {
    title: '参考文献格式化',
    task: TaskType.CITATION,
    fields: [
      { n: 'rawEntries', l: '原始题录', t: 'textarea', d: '', fromEditor: true },
      { n: 'style', l: '格式标准', t: 'text', d: 'GB/T 7714-2015 顺序编码制' }
    ]
  },
  'chapter-write': {
    title: '正文分章撰写',
    task: TaskType.CHAPTER_WRITE,
    fields: [
      { n: 'outlineText', l: '大纲（留空则用前序流水线产出的大纲）', t: 'textarea', d: '' },
      { n: 'chapterSpec', l: '本次撰写章节', t: 'text', d: '', ph: '例如：第二章 理论框架；填“全部”则逐章生成（最多 6 章，耗时较长）' },
      { n: 'title', l: '论文题目', t: 'text', d: '' },
      { n: 'rq', l: '研究问题', t: 'textarea', d: '' },
      { n: 'theory', l: '理论锚点', t: 'text', d: '' },
      { n: 'material', l: '可用材料（案例、数据、文献要点；不填则只用前序产出）', t: 'textarea', d: '' },
      { n: 'targetChars', l: '本章目标字数', t: 'number', d: 2500 },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' }
    ]
  },
  'assemble': {
    title: '全文合稿',
    task: TaskType.ASSEMBLE,
    fields: [
      { n: 'chapterTexts', l: '各章正文（按“第X章”开头依次粘贴；留空则用前序流水线产出）', t: 'textarea', d: '' },
      { n: 'title', l: '论文题目', t: 'text', d: '' },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' },
      { n: 'abstract', l: '摘要（可选，用于完整性检查）', t: 'textarea', d: '' }
    ]
  },
  'revision': {
    title: '返修改稿与提升',
    task: TaskType.REVISION,
    fields: [
      { n: 'manuscript', l: '待修订全文（留空则用前序产出）', t: 'textarea', d: '', fromEditor: true },
      { n: 'reviewComments', l: '审稿意见 / 自查问题（留空则由 Agent 按 120 维标准自查）', t: 'textarea', d: '' },
      { n: 'mode', l: '产出范围', t: 'select', opts: [['both', '修订稿 + 溯源表 + 点对点回应'], ['revise', '只要修订稿与溯源表']], d: 'both' },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' }
    ]
  },
  'format-audit': {
    title: '全文格式体检',
    task: TaskType.FORMAT_AUDIT,
    fields: [
      { n: 'text', l: '全文（含摘要、正文、参考文献；留空则用前序产出）', t: 'textarea', d: '', fromEditor: true },
      { n: 'journal', l: '目标期刊', t: 'select', opts: JOURNAL_OPTS, d: '太平洋学报' },
      { n: 'targetChars', l: '目标字数（可选，用于篇幅核对）', t: 'number', d: 13000 }
    ]
  }
};

/* ---------------- 弹窗 ---------------- */

function buildField(f) {
  const id = 'gwf_' + f.n + '_' + Math.random().toString(36).slice(2, 7);
  let html = '<div class="gw-row"><label class="gw-label" for="' + id + '">' + esc(f.l) + '</label>';

  if (f.t === 'textarea') {
    const dv = f.fromEditor && window.GWEditor ? window.GWEditor.getText() : (f.d || '');
    html += '<textarea class="gw-input" id="' + id + '" data-name="' + f.n + '" data-type="textarea" rows="6" placeholder="' + esc(f.ph || '') + '">' + esc(dv) + '</textarea>';
  } else if (f.t === 'select') {
    const opts = (f.opts || []).map((o) => {
      const v = Array.isArray(o) ? o[0] : o;
      const t = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (v === f.d ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');
    html += '<select class="gw-input" id="' + id + '" data-name="' + f.n + '" data-type="select">' + opts + '</select>';
  } else if (f.t === 'checks') {
    const chosen = f.d || [];
    html += '<div class="gw-checks" data-name="' + f.n + '" data-type="checks">';
    (f.opts || []).forEach((o) => {
      const v = Array.isArray(o) ? o[0] : o;
      const t = Array.isArray(o) ? o[1] : o;
      const on = chosen.includes(v);
      html += '<label class="gw-chk"><input type="checkbox" value="' + esc(v) + '"' + (on ? ' checked' : '') + '><span>' + esc(t) + '</span></label>';
    });
    html += '</div>';
  } else if (f.t === 'check') {
    html += '<label class="gw-chk"><input type="checkbox" id="' + id + '" data-name="' + f.n + '" data-type="check"' + (f.d ? ' checked' : '') + '><span>启用</span></label>';
  } else {
    html += '<input class="gw-input" id="' + id + '" data-name="' + f.n + '" data-type="' + f.t + '" value="' + esc(f.d == null ? '' : f.d) + '" placeholder="' + esc(f.ph || '') + '">';
  }

  html += '</div>';
  return html;
}

export function openAgentModal(key, pid, presetText) {
  const spec = FORMS[key];
  if (!spec) { notify('未知功能：' + key); return; }

  const body = document.getElementById('gw-modal-body');
  const result = document.getElementById('gw-modal-result');
  const modal = document.getElementById('gw-modal');
  const titleEl = document.getElementById('gw-modal-title');
  if (!body || !modal) return;

  titleEl.textContent = spec.title;
  body.innerHTML = spec.fields.map(buildField).join('');
  result.innerHTML = '';
  modal.style.display = 'flex';

  if (presetText) {
    const ta = body.querySelector('[data-name="text"]');
    if (ta) ta.value = presetText;
  }

  const submit = document.getElementById('gw-modal-submit');
  submit.onclick = () => {
    const params = Object.assign({}, spec.extra || {});
    body.querySelectorAll('[data-name]').forEach((node) => {
      const n = node.getAttribute('data-name');
      const t = node.getAttribute('data-type');
      if (t === 'checks') {
        params[n] = Array.from(node.querySelectorAll('input:checked')).map((i) => i.value);
      } else if (t === 'check') {
        params[n] = node.checked;
      } else if (t === 'number') {
        params[n] = node.value ? Number(node.value) : undefined;
      } else {
        params[n] = node.value;
      }
    });

    result.innerHTML = '<div class="gw-loading">任务已提交，执行中…</div>';
    submit.disabled = true;

    submitTask(pid, spec.task, params, (out, err) => {
      submit.disabled = false;
      result.innerHTML = '';
      if (err) {
        result.innerHTML = '<div class="gw-error">任务失败：' + esc(err) + '</div>';
        return;
      }
      const original = params.text || params.rawEntries || '';
      result.appendChild(renderResultBlock(out, original, pid, { title: spec.title }));
      if (out && out.items) {
        result.appendChild(renderHitsList(out));
      }
    });
  };
}

export function closeAgentModal() {
  const m = document.getElementById('gw-modal');
  if (m) m.style.display = 'none';
}

/* ---------------- 检索命中列表 ---------------- */

export function renderHitsList(result) {
  const wrap = el('<div class="gw-hits"><div class="gw-hits-head">检索命中 ' + result.count + ' 条</div><div class="gw-hits-body"></div></div>');
  const body = wrap.querySelector('.gw-hits-body');

  (result.items || []).forEach((it, i) => {
    const row = el('<div class="gw-hit">'
      + '<div class="gw-hit-idx">' + (i + 1) + '</div>'
      + '<div class="gw-hit-main">'
      + '<div class="gw-hit-title"></div>'
      + '<div class="gw-hit-sub"></div>'
      + '<div class="gw-hit-tags"></div>'
      + '</div></div>');
    row.querySelector('.gw-hit-title').textContent = it.title || '(无标题)';
    row.querySelector('.gw-hit-sub').textContent = (it.year || '—') + ' · ' + (it.venue || '未标注来源')
      + ' · 被引 ' + (it.citedBy || 0) + ' · ' + ((it.authors || []).slice(0, 3).join('; ') || '—');
    row.querySelector('.gw-hit-tags').innerHTML = ((it.sources && it.sources.length ? it.sources : [it.source || ''])
      .filter(Boolean).map((s) => '<span class="gw-tag">' + esc(s) + '</span>').join('')
      + '<span class="gw-tag gw-tag-score">' + (it.score || 0) + '</span>');
    body.appendChild(row);
  });

  if (result.chineseLinks && result.chineseLinks.length) {
    const links = el('<div class="gw-cn-links"><span>中文库：</span></div>');
    result.chineseLinks.forEach((l) => {
      const a = el('<a class="gw-link" target="_blank" rel="noopener"></a>');
      a.href = l.url;
      a.textContent = l.name;
      links.appendChild(a);
    });
    wrap.appendChild(links);
  }

  return wrap;
}

/* ---------------- 流水线看板 ---------------- */

export function renderChainPanel(chain) {
  const wrap = el('<div class="gw-chain">'
    + '<div class="gw-chain-head"><span class="gw-chain-title"></span><button class="gw-btn gw-btn-sm" data-act="collapse">收起</button></div>'
    + '<div class="gw-chain-steps"></div>'
    + '<div class="gw-chain-log"></div>'
    + '</div>');
  wrap.querySelector('.gw-chain-title').textContent = chain.title || '研究流水线';

  const stepsBox = wrap.querySelector('.gw-chain-steps');
  (chain.steps || []).forEach((s, i) => {
    const label = s.taskType ? (TASK_LABEL[taskKeyOf(s.taskType)] || s.taskType) : (s.kind === 'pause-confirm' ? '人工确认' : s.kind);
    const node = el('<div class="gw-step" data-i="' + i + '">'
      + '<span class="gw-step-dot"></span>'
      + '<span class="gw-step-label"></span>'
      + '<span class="gw-step-note"></span></div>');
    node.querySelector('.gw-step-label').textContent = (i + 1) + '. ' + label;
    node.querySelector('.gw-step-note').textContent = s.note || s.prompt || '';
    stepsBox.appendChild(node);
  });

  wrap.querySelector('[data-act="collapse"]').addEventListener('click', () => {
    stepsBox.style.display = stepsBox.style.display === 'none' ? 'block' : 'none';
  });

  return wrap;
}

function taskKeyOf(t) {
  const m = {
    SCHOLAR_SEARCH: 'scholar-search', ZOTERO_FETCH: 'zotero-fetch', LIT_READ: 'lit-read',
    TOPIC_SCORE: 'topic-score', ADW_CLEAN: 'adw-clean', NS_REVIEW: 'ns-review',
    BUILD_OUTLINE: 'build-outline', ABSTRACT: 'abstract', DELIVERABLE: 'deliverable', CITATION: 'citation'
  };
  return m[t] || t;
}

export function appendChainLog(panel, text, kind) {
  const log = panel.querySelector('.gw-chain-log');
  if (!log) return;
  const line = el('<div class="gw-log-line ' + (kind ? 'gw-log-' + kind : '') + '"></div>');
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  line.textContent = '[' + time + '] ' + text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

export function markStep(panel, index, state) {
  const node = panel.querySelector('.gw-step[data-i="' + index + '"]');
  if (node) node.setAttribute('data-state', state);
}

/* ---------------- 确认框 ---------------- */

export function openConfirmModal(step, resolve) {
  const modal = document.getElementById('gw-confirm');
  const textEl = document.getElementById('gw-confirm-text');
  const btnBox = document.getElementById('gw-confirm-btns');
  if (!modal) { resolve('abort'); return; }

  textEl.textContent = step.prompt || '是否继续？';
  btnBox.innerHTML = '';

  const opts = (step.options && step.options.length ? step.options.slice() : ['继续']);
  opts.forEach((o) => {
    const b = el('<button class="gw-btn gw-btn-primary"></button>');
    b.textContent = o;
    b.addEventListener('click', (ev) => {
      const action = (ev.altKey) ? 'abort' : o;
      modal.style.display = 'none';
      resolve(action);
    });
    btnBox.appendChild(b);
  });

  const stop = el('<button class="gw-btn gw-btn-danger">终止流水线</button>');
  stop.addEventListener('click', () => { modal.style.display = 'none'; resolve('abort'); });
  btnBox.appendChild(stop);

  modal.style.display = 'flex';
}
