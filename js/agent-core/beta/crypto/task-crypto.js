// SCH-025 端侧加密：用用户口令做 PBKDF2 派生 AES-GCM 密钥，浏览器内加解密。
// 服务端（GitHub Pages）只拿到密文，无法还原明文稿件。
const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64ToBuf(b64) {
  const s = atob(b64);
  const arr = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
  return arr;
}

// 返回 {v:1, salt, iv, data}，全部 base64
export async function encrypt(plainText, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, enc.encode(plainText)
  );
  return {
    v: 1,
    salt: bufToB64(salt.buffer),
    iv: bufToB64(iv.buffer),
    data: bufToB64(cipher)
  };
}

export async function decrypt(pack, password) {
  const salt = b64ToBuf(pack.salt);
  const iv = b64ToBuf(pack.iv);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, b64ToBuf(pack.data)
  );
  return dec.decode(plain);
}

// 一键打包：把任务 JSON 加密成可下载文件
export async function encryptToFile(obj, password, filename) {
  const pack = await encrypt(JSON.stringify(obj, null, 2), password);
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'secscholar-encrypted.json';
  a.click();
  URL.revokeObjectURL(url);
  return a.download;
}
