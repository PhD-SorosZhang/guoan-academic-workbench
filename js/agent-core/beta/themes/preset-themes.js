// SCH-026 预置专题库：5 个国家安全学方向，新建选题时可一键加载为上下文。
export const PRESET_THEMES = [
  {
    id: 'chokepoint',
    name: '海上通道安全（咽喉点治理）',
    definitions: {
      '海上通道': '国际货运依赖的关键航道及其周边管辖水域',
      '排他性治理': '将部分国家或行为体排除在规则制定与使用之外的治理安排',
      '棘轮效应': '制度一旦收紧，退出成本上升，难以回到原状的单向累积过程'
    },
    coreLiterature: [
      'Mearsheimer (2014) The Tragedy of Great Power Politics',
      'Kahler (1995) Institution-building in the Pacific',
      '苏伊士/霍尔木兹案例官方通行记录'
    ],
    commonObjections: [
      '咽喉点是否真的能被"排他性"控制？',
      '棘轮效应与一般路径依赖有何区别？',
      '案例选择是否存在幸存者偏差？'
    ]
  },
  {
    id: 'securitization',
    name: '安全化理论（哥本哈根学派）',
    definitions: {
      '安全化': '行为体通过"言说来"把某议题建构为存在性威胁的过程',
      '指涉对象': '被声称为受到威胁的对象',
      '行为主体': '发出安全化言说的行为体'
    },
    coreLiterature: [
      'Buzer, Wæver & Williams (1998) Security: A New Framework for Analysis',
      'Søren Jakobsen 关于欧洲安全化的经验研究'
    ],
    commonObjections: [
      '安全化是否可证伪？',
      '如何区分成功与失败的安全化？'
    ]
  },
  {
    id: 'global-commons',
    name: '全球公地治理',
    definitions: {
      '全球公地': '不属于任何单一国家管辖、为全人类共同使用的空间与资源',
      '公地产品': '为维护公地开放与安全而提供的公共产品'
    },
    coreLiterature: [
      'Ostrom (1990) Governing the Commons',
      'IPCC 与 UNCLOS 相关条款'
    ],
    commonObjections: [
      '公地是否真的"无主"？',
      '搭便车问题在海上如何体现？'
    ]
  },
  {
    id: 'fisheries',
    name: '渔业安全化',
    definitions: {
      '渔业争端': '围绕渔区、配额、养护措施产生的国家间摩擦',
      '渔具冲突': '因作业方式与管辖重叠引发的现场对抗'
    },
    coreLiterature: [
      'UNCLOS 第五部分与渔区制度',
      '北太平洋渔业委员会公开年报'
    ],
    commonObjections: [
      '渔业争端何时升级为安全议题？'
    ]
  },
  {
    id: 'marine-supply-chain',
    name: '海洋产业链安全',
    definitions: {
      '海洋产业链': '从造船、港口运营到航运保险的上下游体系',
      '关键节点': '短期内难以替代、中断会造成系统性影响的环节'
    },
    coreLiterature: [
      'UNCTAD 海运述评年度报告',
      '波罗的海交易所运价指数公开数据'
    ],
    commonObjections: [
      '产业链"安全"与"效率"如何权衡？'
    ]
  }
];

export function getTheme(id) { return PRESET_THEMES.find((t) => t.id === id) || null; }

// 拼成可注入 prompt 的上下文块
export function themeContextBlock(id) {
  const t = getTheme(id);
  if (!t) return '';
  return [
    `【专题：${t.name}】`,
    '核心定义：',
    ...Object.entries(t.definitions).map(([k, v]) => `- ${k} = ${v}`),
    '核心文献：',
    ...t.coreLiterature.map((x) => '- ' + x),
    '常见审稿质疑（需在论文中预先回应）：',
    ...t.commonObjections.map((x) => '- ' + x)
  ].join('\n');
}
