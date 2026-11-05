// ===== 链式执行器：顺序调度 + 人工确认 + 断点续跑 =====
import { submitTask, TaskType, TASK_LABEL } from './scheduler.js';
import { needUserConfirm, injectPrevOutput } from './validator.js';
import { saveChain, setCheckpoint, getCheckpoint } from './chain-store.js';
import { appendContext } from './memory-store.js';

const TYPE_MAP = {
  SCHOLAR_SEARCH: TaskType.SCHOLAR_SEARCH,
  ZOTERO_FETCH: TaskType.ZOTERO_FETCH,
  LIT_READ: TaskType.LIT_READ,
  TOPIC_SCORE: TaskType.TOPIC_SCORE,
  ADW_CLEAN: TaskType.ADW_CLEAN,
  NS_REVIEW: TaskType.NS_REVIEW,
  BUILD_OUTLINE: TaskType.BUILD_OUTLINE,
  ABSTRACT: TaskType.ABSTRACT,
  DELIVERABLE: TaskType.DELIVERABLE,
  CITATION: TaskType.CITATION,
  CHAPTER_WRITE: TaskType.CHAPTER_WRITE,
  ASSEMBLE: TaskType.ASSEMBLE,
  REVISION: TaskType.REVISION,
  FORMAT_AUDIT: TaskType.FORMAT_AUDIT
};

function toText(out) {
  if (out == null) return '';
  if (typeof out === 'string') return out;
  if (out.text) return out.text;
  return JSON.stringify(out, null, 2).slice(0, 20000);
}

export class ChainRunner {
  constructor(pid, chain, cb) {
    this.pid = pid;
    this.chain = chain;
    this.chainId = chain.chainId;
    this.stepIdx = 0;
    this.outputs = [];
    this.aborted = false;
    this.cb = cb || {};
  }

  async start(resume) {
    if (resume) {
      const cp = await getCheckpoint(this.chainId);
      if (cp && typeof cp.stepIdx === 'number') {
        this.stepIdx = cp.stepIdx;
        this.outputs = cp.outputs || [];
        if (this.cb.onLog) this.cb.onLog('从第 ' + (this.stepIdx + 1) + ' 步断点续跑');
      }
    }
    try { await saveChain(this.chain); } catch (e) {}
    await this.runNext();
  }

  async persist() {
    // IndexedDB 不可用（隐私模式等）时不应中断整条流水线
    try {
      await setCheckpoint(this.chainId, {
        stepIdx: this.stepIdx,
        outputs: this.outputs.slice(-8),
        chain: this.chain
      });
    } catch (e) {}
  }

  async runNext() {
    if (this.aborted) return;
    if (this.stepIdx >= this.chain.steps.length) {
      if (this.cb.onFinish) this.cb.onFinish(this.outputs);
      return;
    }

    const step = this.chain.steps[this.stepIdx];
    const label = step.taskType ? (TASK_LABEL[TYPE_MAP[step.taskType]] || step.taskType) : step.kind;

    if (needUserConfirm(step)) {
      this.cb.onConfirm && this.cb.onConfirm(step, async (choice) => {
        if (choice === 'abort') { this.aborted = true; return; }
        this.outputs.push('[人工选择] ' + choice);
        this.stepIdx += 1;
        await this.persist();
        await this.runNext();
      });
      return;
    }

    if (step.kind === 'run-task') {
      const type = TYPE_MAP[step.taskType];
      if (!type) {
        this.cb.onError && this.cb.onError('未知任务类型 ' + step.taskType);
        this.stepIdx += 1;
        await this.runNext();
        return;
      }

      const params = injectPrevOutput(step.params, this.outputs);
      this.cb.onLog && this.cb.onLog('▶ ' + label + (step.note ? '：' + step.note : ''));

      submitTask(this.pid, type, params, async (out, err) => {
        if (err) {
          this.cb.onError && this.cb.onError(label + ' 失败：' + err);
          this.aborted = true;
          return;
        }
        const text = toText(out);
        this.outputs.push(text);
        try { await appendContext(this.pid, 'chainNotes', '[' + label + '] ' + text.slice(0, 600)); } catch (e) {}
        await this.persist();
        this.cb.onStepDone && this.cb.onStepDone(step, out);
        this.stepIdx += 1;
        await this.runNext();
      });
      return;
    }

    if (step.kind === 'finish') {
      if (this.cb.onFinish) this.cb.onFinish(this.outputs);
    }
  }

  abort() { this.aborted = true; }
}
