// ===== 轻量 IndexedDB 封装（不依赖外部库，离线可用）=====
function openDB(name, version, onUpgrade) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (e) => {
      if (onUpgrade) onUpgrade(req.result, e);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store);
}

function wrapReq(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createStore(name, version, upgradeFn) {
  let dbPromise = null;
  function db() {
    if (!dbPromise) dbPromise = openDB(name, version, upgradeFn);
    return dbPromise;
  }
  return {
    async get(store, key) { return wrapReq(tx(await db(), store, 'readonly').get(key)); },
    async put(store, value, key) {
      const s = tx(await db(), store, 'readwrite');
      const req = key === undefined ? s.put(value) : s.put(value, key);
      return wrapReq(req);
    },
    async add(store, value) { return wrapReq(tx(await db(), store, 'readwrite').add(value)); },
    async del(store, key) { return wrapReq(tx(await db(), store, 'readwrite').delete(key)); },
    async all(store) { return wrapReq(tx(await db(), store, 'readonly').getAll()); },
    async clear(store) { return wrapReq(tx(await db(), store, 'readwrite').clear()); }
  };
}
