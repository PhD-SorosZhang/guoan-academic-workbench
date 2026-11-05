import { createStore } from './store/idb.js';

const store = createStore('AgentChainDB', 1, (db) => {
  if (!db.objectStoreNames.contains('chains')) db.createObjectStore('chains', { keyPath: 'chainId' });
  if (!db.objectStoreNames.contains('checkpoints')) db.createObjectStore('checkpoints', { keyPath: 'chainId' });
});

export async function saveChain(chain) {
  await store.put('chains', Object.assign({}, chain, { savedAt: Date.now() }));
}

export async function loadChain(chainId) {
  return store.get('chains', chainId);
}

export async function listChains() {
  const all = await store.all('chains');
  return all.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export async function setCheckpoint(chainId, data) {
  await store.put('checkpoints', Object.assign({ chainId }, data, { updatedAt: Date.now() }));
}

export async function getCheckpoint(chainId) {
  return store.get('checkpoints', chainId);
}

export async function clearCheckpoint(chainId) {
  try { await store.del('checkpoints', chainId); } catch (e) {}
}
