export function needUserConfirm(step) {
  return step && (step.kind === 'pause-confirm' || step.kind === 'branch-select');
}

export function injectPrevOutput(params, prevOutputs) {
  if (!prevOutputs || prevOutputs.length === 0) return params || {};
  return Object.assign({}, params, {
    inheritedContext: prevOutputs.join('\n\n').slice(-12000)
  });
}

/** 校验规划器产出的链是否合法，过滤掉不可执行步骤 */
export function sanitizeChain(chain, validTaskTypes) {
  if (!chain || !Array.isArray(chain.steps)) throw new Error('任务链结构非法');
  const steps = chain.steps.filter((s) => {
    if (!s || !s.kind) return false;
    if (s.kind === 'run-task') return validTaskTypes.includes(s.taskType);
    return s.kind === 'pause-confirm' || s.kind === 'branch-select' || s.kind === 'finish';
  });
  if (!steps.length) throw new Error('任务链没有可执行步骤');
  return {
    chainId: chain.chainId || ('c' + Date.now().toString(36)),
    title: chain.title || '未命名研究流水线',
    steps
  };
}
