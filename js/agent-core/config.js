// ===== Agent 配置（localStorage 持久化，可在设置面板修改）=====
const DEFAULTS = {
  model: {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    modelName: 'deepseek-chat',
    apiKey: '',
    temperature: 0.25,
    maxTokens: 4096,
    // Ollama 本地离线
    ollama: { enable: false, host: 'http://localhost:11434', model: 'qwen2.5:14b' }
  },
  journalDefault: '太平洋学报',
  journals: {
    '太平洋学报': { style: 'cssci-pacific', maxWords: 10000 },
    '现代国际关系': { style: 'cssci-ir', maxWords: 12000 },
    '国际安全研究': { style: 'cssci-security', maxWords: 12000 },
    '世界经济与政治': { style: 'cssci-ipe', maxWords: 15000 }
  },
  // 检索连接器
  scholar: {
    sources: ['openalex', 'crossref', 'semanticscholar'],
    mailto: 'SorosZhang@163.com',   // OpenAlex/Crossref 礼貌池，提升配额
    pageSize: 20,
    years: 5,
    minScore: 0.0,
    s2Key: '',
    cacheTTLHours: 72
  },
  zotero: {
    apiBase: 'http://localhost:23119/api/users/0',
    libraryType: 'user',
    autoImport: false
  },
  net: {
    timeoutMs: 20000,
    retries: 2,
    concurrency: 3,
    // 每域名每秒请求上限
    rateLimit: { 'api.openalex.org': 8, 'api.crossref.org': 6, 'api.semanticscholar.org': 2, default: 3 }
  },
  adw: { targetAiRatio: 10, aggressive: true },
  taskQueue: { maxConcurrent: 2 },
  memory: { enable: true, projectIsolate: true }
};

const KEY = 'gw_agent_config_v1';

function deepMerge(base, patch) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  if (!patch || typeof patch !== 'object') return out;
  for (const k in patch) {
    const v = patch[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

let current = DEFAULTS;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) current = deepMerge(DEFAULTS, JSON.parse(raw));
} catch (e) { current = DEFAULTS; }

export function getConfig() { return current; }

export function setConfig(patch) {
  current = deepMerge(current, patch);
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch (e) {}
  return current;
}

export function resetConfig() {
  current = deepMerge(DEFAULTS, {});
  try { localStorage.removeItem(KEY); } catch (e) {}
  return current;
}

export function hasLLM() {
  const m = current.model;
  return Boolean(m.ollama.enable || (m.apiKey && m.apiKey.trim()));
}
