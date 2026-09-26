# 国安学术工作台 v3.0

> 担国是，护安澜 —— 私有化学术研究辅助平台

基于 **Vercel + Supabase** 构建的个人学术工作台，支持密码密钥访问、数据云端持久化、模块联动、真实 AI 对话。v3.0 在 v2.0 基础上移植了本地版全部独有功能，并大幅完善考博导师数据库。

---

## v3.0 更新内容

### 新增功能（从本地版移植）
- 🔗 **论点匹配引文**：输入论点关键词，匹配内置文献库并直达知网/万方/维普三库检索
- 📰 **国安研究周报**：一键汇总本周选题/文献/好文/素材，生成结构化 Word 文档
- 📄 **PDF 拖拽上传**：基于 PDF.js，拖拽 PDF 自动提取标题、作者、期刊、年份等元数据
- 📝 **导出 Word**：研究笔记、周报等支持一键导出为 `.doc` 文件
- 📥 **数据导入备份**：支持从 JSON 备份文件恢复全部数据
- 🟠🟢 **万方/维普检索入口**：文献检索三库齐全（知网+万方+维普）

### 考博导师数据库全面完善
- **15 所院校 · 86 位博士生导师**，全部从各高校学院官网真实采集
- 每条记录包含：学校 → 学院 → 导师姓名 → 职称 → 研究方向 → 代表文献（标题+期刊+年份）→ 导师主页 → 邮箱
- 覆盖：北大、清华、复旦、人大、南大、吉大、武大、厦大、中山、外交学院、中国政法、国际关系学院、大连海事、浙大、上海交大

### 架构改进
- **双模式数据层**：配置 Supabase 时用云端存储，未配置时自动降级 localStorage，双击 index.html 即可使用
- **修复 loadProjects 报错**：项目为空时自动创建默认项目
- **AI 对话双模式**：API 模式调用后端真实大模型，本地模式使用内置学术助手回复

---

## 功能特性

- 🔐 **私有访问**：密码密钥登录，只有你能进入
- 📋 **论文工作台**：多项目管理 + 数据总览 + 任务追踪
- 🔍 **选题筛选**：12 维度 AI 评测 + 雷达图 + 论点匹配引文
- 📚 **好文剖析**：每日一篇核心期刊深度拆解 + 论证流程 + 概念图谱
- 🎓 **考博信息**：15 校 86 位导师数据库，支持搜索筛选
- 💼 **就业导航**：公务员/智库/高校/央企就业方向
- 📝 **文献管理**：PDF 拖拽自动提取 + 手动录入 + 已读标记
- ✍️ **写作素材**：金句/理论/政策/数据分类管理
- 🧠 **研究笔记**：灵感记录 + 导出 Word
- 📅 **学术日程**：会议/讲座/截止日期/答辩管理
- 🤖 **AI Agent 技能库**：10 项内置 AI 能力一览
- 💬 **论文 AI 对话**：接入你自己的大模型 API（OpenAI 兼容格式）
- 🎨 **17 套主题配色**：故宫朱红、燕园深蓝、暗夜紫金等，支持自动轮换

---

## 部署步骤（约 15 分钟）

### 第一步：创建 Supabase 数据库

1. 注册 [Supabase](https://supabase.com/)（免费版足够）
2. 新建一个 Project，记录下：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `service_role key`（在 Settings → API 中，注意不是 anon key）
3. 进入 **SQL Editor**，打开 `supabase/schema.sql`，复制全部内容执行
4. 执行成功后，10 张表会自动创建

### 第二步：部署到 Vercel

1. 本项目已推送到 GitHub，登录 [Vercel](https://vercel.com/) 导入该仓库
2. 在 **Environment Variables** 中添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `SUPABASE_URL` | 你的 Supabase Project URL | 形如 `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | 你的 Supabase service_role key | 注意是 service_role，不是 anon |
| `ACCESS_KEY` | 你自己设定的访问密钥 | 登录时用这个 |
| `TOKEN_SECRET` | 任意随机字符串 | 用于签名登录 token |

3. 点击 **Deploy**，等待部署完成（约 1-2 分钟）

> **不配置 Supabase 也能用**：未配置环境变量时，系统自动降级为浏览器本地存储模式，所有功能正常可用，只是数据不跨设备同步。

### 第三步：配置大模型 API（可选但推荐）

1. 打开部署好的网站，输入 `ACCESS_KEY` 登录
2. 进入「设置」页面，填入大模型 API 配置
3. 支持 OpenAI 兼容格式：豆包、DeepSeek、通义千问等

---

## 本地开发

```bash
npm install
npm i -g vercel
vercel login
vercel dev
```

环境变量放在项目根目录 `.env` 文件中。

---

## 持续更新

```bash
git add .
git commit -m "更新说明"
git push
```

Vercel 会自动检测 push 并重新部署，通常 1 分钟内生效。

---

## 项目结构

```
guoan-workbench/
├── index.html              # 前端入口
├── css/style.css           # 全部样式（17套主题）
├── js/
│   ├── app.js              # 前端应用逻辑（12模块+6项移植功能）
│   └── phd-data.js         # 考博导师数据库（15校86位）
├── api/                    # Vercel Serverless Functions
│   ├── _lib/auth.js        # 认证中间件
│   ├── _lib/db.js          # Supabase 客户端
│   ├── login.js            # 登录
│   ├── data.js             # 通用 CRUD
│   ├── chat.js             # AI 对话
│   ├── analyze.js          # 文献剖析
│   └── stats.js            # 统计数据
├── data/phd_supervisors.json  # 考博导师数据（JSON格式）
├── supabase/schema.sql     # 数据库表结构
├── package.json
├── vercel.json
└── README.md
```

---

## 数据安全

- 云端模式：数据存储在你自己的 Supabase 数据库中
- 本地模式：数据存储在浏览器 localStorage，不上传任何服务器
- API Key 存储在服务器端，不会暴露给前端
- 支持一键导出全部数据为 JSON 备份
