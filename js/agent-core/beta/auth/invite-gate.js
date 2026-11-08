// SCH-029 邀请码 / 机构授权（单机版逻辑；真多人版需后端）
// 白名单存在 localStorage，注册时校验；机构邮箱后缀自动识别。
const KEY = 'beta:invite:whitelist';
const ORG_KEY = 'beta:invite:org-domains';

// 内置白名单（可后续在开发者视图里加）
const DEFAULT_CODES = ['BETA-2026-SEC', 'GUOAN-DEMO'];
const DEFAULT_ORGS = ['pku.edu.cn', 'tsinghua.edu.cn', 'fudan.edu.cn', 'nju.edu.cn', 'dlmu.edu.cn'];

function loadList(k, def) {
  try {
    const v = JSON.parse(localStorage.getItem(k) || 'null');
    return v || def;
  } catch { return def; }
}
function saveList(k, list) { try { localStorage.setItem(k, JSON.stringify(list)); } catch {} }

export function whitelist() { return loadList(KEY, DEFAULT_CODES); }
export function addCode(code) {
  const l = whitelist();
  if (!l.includes(code)) { l.push(code); saveList(KEY, l); }
  return l;
}

export function orgDomains() { return loadList(ORG_KEY, DEFAULT_ORGS); }

// 校验邀请码：在白名单里，或邮箱是机构后缀
export function checkInvite(code, email) {
  if (whitelist().includes(code)) {
    return { ok: true, type: 'invite_code', quota: 'pro' };
  }
  if (email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && orgDomains().includes(domain)) {
      return { ok: true, type: 'org_email', domain, quota: 'institution' };
    }
  }
  return { ok: false, msg: '邀请码无效，或邮箱不在机构白名单内' };
}
