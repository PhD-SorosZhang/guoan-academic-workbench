// SCH-027 内置评测集：用固定 fixture 跑静态能力，输出可复现指标。
import { runStaticReview } from '../core/reviewer-120.js';
import { attachTier, normalizeByDOI } from '../search/normalizer.js';
import { gate as riskGate } from '../compliance/domain-risk-gate.js';
import { parseDOIs } from '../compliance/doi-verifier.js';
import { evidenceCheck } from '../core/evidence.js';

const FIXTURE_BAD = `
综上所述，在当今时代，海上通道的排他性治理不断加强。
众所周知，这表明国际秩序发生了显著变化。
本文认为这一变化将彻底解决全球治理困境。
具体机制包括规则嵌入[@Mearsheimer2014]、能力沉淀[@Kahler1995]。
存在反例但被忽略[待补证据]。
`;

const FIXTURE_GOOD = `
规则嵌入通过制度锁定提高退出成本。
本文从过程追踪出发，比较苏伊士与霍尔木兹两个案例[@Case2021]。
这一发现为理解渐进收紧提供了中层机制，而非普适结论。
DOI 示例: 10.1234/example-valid.doi.123
`;

export function runBenchmark() {
  const r1 = runStaticReview(FIXTURE_BAD);
  const r2 = runStaticReview(FIXTURE_GOOD);

  const tiered = attachTier([
    { sourceType: 'target_journal' }, { sourceType: 'cssci' },
    { sourceType: 'preprint' }, { sourceType: 'webpage' }
  ], 'writing');

  const merged = normalizeByDOI([
    { doi: '10.1/x', title: 'A', volume: '12', pages: '' },
    { doi: '10.1/x', title: 'A', volume: '12', pages: '1-20' }
  ]);

  const risk = riskGate('这涉及分裂国家与武装政变的方法。', 'input');
  const ev = evidenceCheck([{ tag: 'theory' }, { tag: 'case' }]);

  return {
    timestamp: new Date().toISOString(),
    metrics: {
      badSampleFindings: r1.totalFindings,            // 应 > 0
      goodSampleFindings: r2.totalFindings,           // 应 < bad
      writingPhaseKept: tiered.length,                // 应为 3（D 被剔）
      tieredOrder: tiered.map((t) => t.sourceTier).join(','),
      doiMergeConflicts: merged.conflictReport.length,
      riskBlocked: risk.blocked,                      // 应为 true
      evidencePass: ev.pass                           // 应为 false（素材不足）
    },
    assertions: [
      { name: '坏样例能命中问题', pass: r1.totalFindings >= 3 },
      { name: '好样例问题更少', pass: r2.totalFindings < r1.totalFindings },
      { name: '写作阶段剔除 D 类', pass: tiered.length === 3 },
      { name: '等级排序 A<B<C', pass: tiered[0].sourceTier === 'A' },
      { name: '同 DOI 融合补页码', pass: merged.merged[0].pages === '1-20' },
      { name: '高风险被阻断', pass: risk.blocked === true },
      { name: '证据不足被识别', pass: ev.pass === false }
    ]
  };
}
