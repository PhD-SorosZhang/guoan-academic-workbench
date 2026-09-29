# 国安学术工作台 v4.0

> 担国是，护安澜 —— 私有化学术研究辅助平台

基于 **GitHub Pages + SQLite + GitHub Actions** 构建的个人学术工作台。纯静态前端 + 云端自动化后端，无需服务器，每日自动收录核心期刊文章并生成 AI 深度剖析与学术评价。

---

## v4.0 核心升级

### 新增
- 📚 **存档库**：所有收录文章永久存档，支持关键词/期刊/分类/评级/评分/作者组合检索与排序分页
- ⭐ **10维学术评价智能体**：按 CSSCI 审稿人标准打分（S/A/B/C 四级），含灰度雷达图、优缺点、审稿总评、修改建议、可延伸选题
- 🔄 **每日自动收录**：GitHub Actions 每日北京时间 06:30 自动抓取国家哲学社会科学文献中心及国安/国关类核心期刊新文章，经 AI 剖析评价后存档
- 📊 **更新中心**：收录统计、日历热力图、各期刊/分类收录数、运行状态一览
- 🔍 **RAG 前沿检索**：评价前自动检索 OpenAlex/CrossRef 近 2 年文献及相关政策文件，保证与时俱进
- 📝 **提示词版本化**：`prompts/` 目录管理角色/剖析/评价/前沿检索四类提示词
- 🤖 **全局搜索集成**：存档文章纳入顶部全局搜索

### 修复
- ✅ **API 404**：移除所有不存在的 `/api` 后端请求，纯静态环境下数据层走 localStorage + 静态文件
- ✅ **网络请求**：统一 `httpGetJson` 封装，内置超时(10s)、重试(2次)、降级和用户可见错误提示
- ✅ **定位接口**：ipapi.co 添加 5 秒超时和降级方案
- ✅ **今日新文**：从伪随机示例池改为优先读取真实存档数据

---

## 功能模块（17个）

| 模块 | 说明 |
|------|------|
| 📊 论文工作台 | 多项目管理 + 数据总览 + 任务追踪 |
| 🔍 选题筛选 | 12 维度 AI 评测 + 雷达图 + 论点匹配引文 |
| 📖 好文剖析 | 每日核心期刊论文深度拆解 + 论证流程 + 概念图谱 |
| 📚 **存档库** | **文章永久存档 + 组合检索 + 详情评价** |
| 🎓 考博信息 | 15 校 86 位导师数据库，支持搜索筛选 |
| 💼 就业导航 | 公务员/智库/高校/央企就业方向 |
| 📝 文献管理 | PDF 拖拽自动提取 + 手动录入 + 已读标记 |
| ✍️ 写作素材 | 金句/理论/政策/数据分类管理 |
| 🖋️ 论文写作 | 写作辅助工具 |
| 📅 学术日程 | 会议/讲座/截止日期/答辩管理 |
| 🧠 研究笔记 | 灵感记录 + 导出 Word |
| 🤖 AI技能库 | 10 项内置 AI 能力 |
| 💬 论文AI对话 | 接入自定义大模型 API（OpenAI 兼容） |
| 🗑 回收站 | 软删除数据恢复 |
| 📊 数据看板 | 数据统计可视化 |
| 🔄 **更新中心** | **收录状态 + 日历热力图 + 手动刷新** |
| ⚙️ 设置 | 主题/API/密钥/数据管理 |

---

## 架构

```
┌─────────────────────────────────────────────────────┐
│  GitHub 仓库（唯一事实源）                            │
│  ├── 前端站点（GitHub Pages 部署）                    │
│  ├── data/archive.db      ← SQLite 数据库            │
│  ├── data/articles/YYYY-MM-DD/*.json|md  ← 单篇存档  │
│  ├── data/index.json      ← 存档索引（前端首屏加载）   │
│  ├── knowledge_base/*.md  ← 领域知识库（每周更新）     │
│  └── prompts/*.md         ← 评价智能体提示词（版本化） │
└─────────────────────────────────────────────────────┘
        ▲ 每日 commit/push              │ 前端 fetch
        │                               ▼
┌──────────────────┐         ┌──────────────────────┐
│ GitHub Actions   │         │  浏览器前端           │
│ ① 抓取新文章      │         │  · 存档库检索         │
│ ② RAG前沿检索    │         │  · 文章详情+评价      │
│ ③ LLM剖析+评价   │         │  · 更新中心           │
│ ④ 写入SQLite     │         │  · 17个模块全部保留   │
│ ⑤ commit→部署    │         │  · localStorage数据   │
└──────────────────┘         └──────────────────────┘
        │ LLM API（Key 存 GitHub Secrets）
        ▼
  DeepSeek / 豆包 / 智谱 / Kimi / 通义 / GPT
```

**核心设计**：Git 仓库 + SQLite 文件即"数据库"，由 Actions 每日写入，前端通过 `index.json`（元数据）+ 单篇 JSON（详情）查询，无需自建数据库服务器。

---

## 部署与配置

### 第一步：启用 GitHub Pages

1. 仓库 Settings → Pages → Source 选择 `main` 分支根目录
2. 等待部署完成（约1分钟）

### 第二步：配置 GitHub Secrets（必需，用于每日自动收录的 AI 评价）

进入仓库 Settings → Secrets and variables → Actions，添加：

| Secret 名 | 说明 | 示例 |
|-----------|------|------|
| `LLM_API_KEY` | 大模型 API Key（必需） | `sk-xxxxxx` |
| `LLM_BASE_URL` | API 端点（可选，默认 DeepSeek） | `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 模型名称（可选） | `deepseek-chat` |

> 支持所有 OpenAI 兼容格式：DeepSeek、豆包、智谱 GLM、Kimi、通义千问、GPT 等。
> **不配置也能用**：未配置时工作流仅存档题录，不生成 AI 评价。

### 第三步：启用 Actions 写权限

仓库 Settings → Actions → General → Workflow permissions → 选择 **Read and write permissions**。

### 第四步：手动触发首次收录

Actions → 「每日文章收录与评价」→ Run workflow → 选择日期 → 运行。

> 种子数据已包含 12 篇示例文章，部署后存档库立即可用。

---

## 进阶：Cloudflare Worker（网页端"立即更新"）

如需在网页上点击"立即更新"触发工作流，需部署一个 Cloudflare Worker（PAT 只存在 Worker，不进前端）：

1. 将 `cloudflare-worker.js` 部署到 Cloudflare Workers
2. 设置环境变量：`GITHUB_TOKEN`（PAT）、`GITHUB_REPO`（用户名/仓库名）、`ACCESS_KEY`（网站登录密钥）
3. 将 Worker URL 填入网站设置页

---

## 项目结构

```
guoan-academic-workbench/
├── index.html                 # 前端入口
├── style.css                  # 全部样式（17套主题 + 存档库样式）
├── app.js                     # 主逻辑（15个原有模块）
├── js/archive.js              # 存档库 + 更新中心模块
├── job-data.js / phd-data.js  # 就业/考博数据
├── phd_supervisors.json       # 博导库
├── .github/
│   ├── workflows/
│   │   ├── daily-archive.yml  # 每日收录（06:30 BJT）
│   │   ├── weekly-kb-update.yml # 每周知识库更新
│   │   └── deploy.yml         # 部署校验
│   └── dependabot.yml         # 依赖自动更新
├── scripts/
│   ├── build_db.py            # SQLite 建表与迁移
│   ├── crawl.py               # 多源文章抓取（ncpssd/RSS/期刊官网）
│   ├── rag.py                 # OpenAlex/CrossRef/政策 RAG 检索
│   ├── evaluate.py            # LLM 剖析 + 10维评价
│   ├── build_index.py         # 生成 index.json + 单篇存档
│   ├── run_pipeline.py        # 流水线总控
│   ├── update_kb.py           # 知识库更新
│   └── seed_data.py           # 种子数据（12篇示例）
├── data/
│   ├── archive.db             # SQLite 数据库
│   ├── index.json             # 存档索引
│   ├── articles/YYYY-MM-DD/   # 单篇 JSON + MD 存档
│   └── inbox/                 # 待处理投稿
├── knowledge_base/            # 领域知识库
├── prompts/                   # 提示词版本化管理
│   ├── 00-role.md             # 角色设定
│   ├── 01-analyst.md          # 剖析提示词
│   ├── 02-evaluator.md        # 评价提示词（10维标准）
│   ├── 03-frontier.md         # 前沿检索规则
│   └── changelog.md           # 提示词变更日志
├── cloudflare-worker.js       # 可选：网页触发更新的 Worker
├── CHANGELOG.md
└── README.md
```

---

## 评价智能体（10维 CSSCI 审稿标准）

| 维度 | 权重 | 说明 |
|------|------|------|
| D1 选题价值与问题意识 | 12% | 是否提出真问题 |
| D2 学术创新性 | 15% | 新问题/新视角/新方法/新材料/新论点 |
| D3 理论贡献与对话能力 | 12% | 与既有理论的对话、修正或推进 |
| D4 研究方法适切性 | 12% | 方法与问题匹配、设计规范 |
| D5 论证逻辑与结构 | 10% | 逻辑链条完整、结构合理 |
| D6 证据/数据/史料质量 | 10% | 证据充分性、来源可靠性 |
| D7 文献综述与前沿把握 | 8% | 文献覆盖权威、新近、切题 |
| D8 学术规范 | 5% | 引用规范、概念准确 |
| D9 现实意义与政策价值 | 10% | 对国家安全实践的参考价值 |
| D10 写作与表达 | 6% | 表述清晰、可读性 |

**评级**：S(≥90 标杆级) / A(80-89 优秀) / B(70-79 良好) / C(<70 有限)

---

## 数据安全

- 所有数据存储在你自己的 GitHub 仓库中
- LLM API Key 仅存于 GitHub Secrets，绝不硬编码、绝不暴露给前端
- 个人业务数据存于浏览器 localStorage，不上传任何服务器
- 支持一键导出全部数据为 JSON 备份
- PAT（如使用 Worker）仅存于 Cloudflare Worker 环境变量

---

## 本地开发

无需构建工具，直接用浏览器打开 `index.html` 即可。Python 脚本可本地调试：

```bash
# 初始化数据库
python scripts/build_db.py

# 本地运行抓取（需网络）
python scripts/crawl.py --date 2026-09-29

# 生成种子数据
python scripts/seed_data.py

# 完整流水线（需 LLM_API_KEY 环境变量）
LLM_API_KEY=sk-xxx python scripts/run_pipeline.py --date 2026-09-29
```

---

*国安学术工作台 v4.0 | 担国是，护安澜*
