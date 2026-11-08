// SCH-009 国安学 120 维审稿自评（静态可检测子集）
// 真正 120 维里一部分能用规则扫，一部分必须模型判断；这里把能规则化的做掉，
// 其余维度占位提示"需模型复核"。产出带段落锚点的结构化清单。

const CJK = '\\u4e00-\\u9fa5';

const RULES = [
  { id: 'logic-01', dim: '逻辑闭环', re: /(因此|所以|由此可见)[^。]{0,40}(但是|然而|不过)/, msg: '结论句后紧接转折，论证未闭环' },
  { id: 'logic-02', dim: '概念一致', re: /(棘轮效应|安全化|排他性治理)[^。]{0,30}(机制|路径|过程)/, msg: '同一概念在不同段落混用机制/路径/过程，需统一' },
  { id: 'emp-01', dim: '实证支撑', re: /(表明|证明|说明)[^。]{0,20}(显著|大幅|明显)/, msg: '强判断缺少数据/案例支撑，检查是否有 [@key] 或 [待补证据]' },
  { id: 'emp-02', dim: '案例可比', re: /(苏伊士|霍尔木兹|南海|马六甲)[^。]{0,40}(对比|比较)/, msg: '案例比较需说明可比性与选择理由' },
  { id: 'scope-01', dim: '研究边界', re: /(本文|本研究)[^。]{0,20}(将|会|能)(解决|消除|终结)/, msg: '过度宣称，改为"有助于/为...提供参考"' },
  { id: 'lit-01', dim: '文献对话', re: /(已有研究|既有文献)[^。]{0,30}(指出|认为)/, msg: '文献综述需落到具体作者与年份，不要泛指' },
  { id: 'method-01', dim: '方法透明', re: /(过程追踪|案例研究|定性|定量)/, msg: '出现方法名需在方法论小节说明选择理由与局限' },
  { id: 'tone-01', dim: '学术语气', re: /(众所周知|不言而喻|显而易见)/, msg: '口语化/断言式表达，改为有依据的判断' },
  { id: 'ai-01', dim: 'AI 痕迹', re: /(值得注意的是|综上所述|在当今时代|随着.*的不断发展)/, msg: '典型 AI 套话，建议删除或改写' },
  { id: 'gap-01', dim: '待补证据', re: /\[待补证据\]/, msg: '存在未补证据占位，定稿前必须处理' },
  { id: 'cite-01', dim: '引用规范', re: /\[@[A-Za-z0-9]+\]/, msg: '存在作者-年份占位引用，定稿前需转 GB/T 7714' }
];

export function runStaticReview(text) {
  const paras = String(text || '').split(/\n+/).filter((p) => p.trim());
  const findings = [];
  paras.forEach((p, i) => {
    for (const rule of RULES) {
      if (rule.re.test(p)) {
        findings.push({
          dim: rule.dim, rule: rule.id,
          paraIndex: i,
          snippet: p.trim().slice(0, 80),
          msg: rule.msg
        });
      }
    }
  });
  const byDim = {};
  for (const f of findings) byDim[f.dim] = (byDim[f.dim] || 0) + 1;
  return {
    totalFindings: findings.length,
    byDimension: byDim,
    findings,
    modelOnlyDimensions: [
      '创新点是否成立', '理论框架与经验材料是否真正搭桥',
      '案例选择是否有偏差', '反事实是否被认真对待',
      '与顶刊近三年文献是否真正对话'
    ],
    note: `规则扫描命中 ${findings.length} 处；另有 ${5} 个维度必须由模型/资深审稿人复核。`
  };
}
