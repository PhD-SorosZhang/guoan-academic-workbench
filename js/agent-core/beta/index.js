// V1-C Beta 统一出口
export { mountBetaDock } from './ui/beta-panel.js';
export * as Ethics from './compliance/ethics-gate.js';
export * as DOI from './compliance/doi-verifier.js';
export * as Risk from './compliance/domain-risk-gate.js';
export * as Crypto from './crypto/task-crypto.js';
export { SearchScheduler, Health } from './search/scheduler.js';
export { attachTier, normalizeByDOI } from './search/normalizer.js';
export { evidenceCheck, buildStateAnchor, conflictWithAnchor } from './core/evidence.js';
export { snapshot, consistencyScan } from './core/branch-engine.js';
export { buildSanitizePrompt, PROFILES } from './core/sanitize-engine.js';
export * as Sandbox from './core/task-sandbox.js';
export { runStaticReview } from './core/reviewer-120.js';
export * as Anno from './core/annotation-tracker.js';
export { buildProvenance, downloadProvenance } from './core/provenance.js';
export { runBenchmark } from './eval/benchmark.js';
export { PRESET_THEMES, themeContextBlock } from './themes/preset-themes.js';
