// ===== Agent 调度器：任务类型注册、队列、并发控制、结果回调 =====
import { getConfig } from './config.js';
import { getProjectContext, logTask } from './memory-store.js';

export const TaskType = Object.freeze({
  SCHOLAR_SEARCH: 'scholar-search',
  ZOTERO_FETCH: 'zotero-fetch',
  LIT_READ: 'lit-read',
  TOPIC_SCORE: 'topic-score',
  ADW_CLEAN: 'adw-clean',
  NS_REVIEW: 'ns-review',
  BUILD_OUTLINE: 'build-outline',
  ABSTRACT: 'abstract',
  DELIVERABLE: 'deliverable',
  CITATION: 'citation'
});

export const TASK_LABEL = {
  'scholar-search': '文献检索',
  'zotero-fetch': 'Zotero 取用',
  'lit-read': '文献精读',
  'topic-score': '选题评估',
  'adw-clean': '防御性写作清洗',
  'ns-review': '国安学审稿扫描',
  'build-outline': '生成期刊大纲',
  'abstract': '英文摘要润色',
  'deliverable': '配套材料生成',
  'citation': '参考文献格式化'
};

const handlers = new Map();

export function registerTask(type, fn) {
  handlers.set(type, fn);
}

const queue = [];
let running = 0;
const listeners = new Set();

function emit(evt) {
  listeners.forEach((fn) => { try { fn(evt); } catch (e) {} });
}

export function onTaskEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function submitTask(pid, type, params, onDone) {
  const task = { pid, type, params: params || {}, onDone, id: Math.random().toString(36).slice(2) };
  queue.push(task);
  emit({ kind: 'queued', task });
  tick();
  return task.id;
}

async function tick() {
  const limit = Number(getConfig().taskQueue.maxConcurrent || 2);
  if (running >= limit || queue.length === 0) return;
  running += 1;
  const job = queue.shift();
  emit({ kind: 'start', task: job });

  try {
    const fn = handlers.get(job.type);
    if (!fn) throw new Error('未注册的任务类型：' + job.type);

    const ctx = await getProjectContext(job.pid);
    const out = await fn(job.params, ctx, job.pid);

    await logTask(job.pid, job.type, job.params, out);
    emit({ kind: 'done', task: job, output: out });
    if (job.onDone) job.onDone(out, null);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    emit({ kind: 'error', task: job, error: msg });
    if (job.onDone) job.onDone(null, msg);
  } finally {
    running -= 1;
    tick();
  }
}

export function queueStatus() {
  return { running, waiting: queue.length };
}
