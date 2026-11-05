// ===== 模型桥：DeepSeek / GLM / 任意 OpenAI 兼容 / Ollama 本地 =====
import { getConfig } from './config.js';

const PROVIDERS = {
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' },
  glm: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', modelName: 'glm-4' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen-plus' }
};

export async function callModel(systemPrompt, userPrompt, opts = {}) {
  const cfg = getConfig().model;

  if (cfg.ollama && cfg.ollama.enable) {
    return callOllama(cfg.ollama, systemPrompt, userPrompt, opts);
  }

  const p = PROVIDERS[cfg.provider] || {};
  const baseUrl = (cfg.baseUrl || p.baseUrl || '').replace(/\/$/, '');
  const modelName = cfg.modelName || p.modelName;

  if (!cfg.apiKey) {
    throw new Error('未配置模型 API Key，请在「Agent 设置」中填写，或启用本地 Ollama');
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 90000);

  try {
    const resp = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify({
        model: modelName,
        temperature: opts.temperature ?? cfg.temperature ?? 0.25,
        max_tokens: opts.maxTokens || cfg.maxTokens || 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    clearTimeout(timer);
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error((data.error && data.error.message) || ('HTTP ' + resp.status));
    }
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    return (msg && msg.content ? msg.content : '').trim();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function callOllama(cfg, systemPrompt, userPrompt, opts) {
  const resp = await fetch(cfg.host.replace(/\/$/, '') + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      stream: false,
      options: { temperature: opts.temperature ?? 0.25 },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  if (!resp.ok) throw new Error('Ollama 连接失败：' + resp.status);
  const json = await resp.json();
  return ((json.message && json.message.content) || '').trim();
}

/** 要求模型返回 JSON 时使用，带一次修复重试 */
export async function callModelJSON(systemPrompt, userPrompt, opts = {}) {
  const raw = await callModel(systemPrompt, userPrompt, { ...opts, temperature: opts.temperature ?? 0.15 });
  try {
    return extractJSON(raw);
  } catch (e) {
    const fix = await callModel(
      '你是 JSON 修复器。把输入改写成严格合法的 JSON，不要输出任何解释、不要用 markdown 代码块。',
      raw,
      { temperature: 0.02 }
    );
    return extractJSON(fix);
  }
}

export function extractJSON(text) {
  if (!text) throw new Error('模型返回为空');
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = s.search(/[{\[]/);
  if (start < 0) throw new Error('响应中未找到 JSON');
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const seg = s.slice(start, i + 1);
        try { return JSON.parse(seg); } catch (e) { throw new Error('JSON 解析失败：' + e.message); }
      }
    }
  }
  throw new Error('JSON 未闭合');
}
