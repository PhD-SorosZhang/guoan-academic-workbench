# 贡献指南

欢迎以国家安全学 / 公共管理 / 国际关系方向的研究者身份参与。

## 技术栈
- 纯静态站点：原生 HTML + ESM JavaScript，无构建步骤。
- 存储：localStorage（单机版）+ IndexedDB（大文件）。
- 部署：GitHub Pages，main 分支自动发布。

## 目录约定
```
js/agent-core/
  modules/       已有任务模块（V9）
  beta/          V1-C Beta 新增能力（本批补丁）
    compliance/  伦理门、DOI 校验、领域风控
    crypto/      Web Crypto 端侧加密
    search/      检索调度器、元数据归一
    core/        证据校验、分支、清洗、沙盒、120 维审稿、批注、溯源
    infra/       配额、审计链、进度流
    themes/      五大预置专题
    eval/        内置评测集
    ui/          内测台面板
```

## 提交流程
1. Fork → 新建分支 `feat/xxx` 或 `fix/xxx`。
2. 改完后在本地 `python -m http.server` 跑一遍，确认控制台无红色报错。
3. PR 描述里写明：改了哪个 SCH 编号、为什么、怎么测的。
4. 不要把 API Key、个人 token 提交进仓库。

## Issue 模板
- 「能力建议」：说明使用场景、目标期刊、当前卡在哪。
- 「Bug」：浏览器版本、复现步骤、控制台截图。
- 「假文献」：贴出可疑 DOI / 题录，我们优先修。
