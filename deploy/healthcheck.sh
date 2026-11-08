#!/usr/bin/env bash
# SCH-018 部署前自检：检查静态站点关键文件是否齐、语法是否过。
set -u
fail=0
say() { echo "[healthcheck] $*"; }
bad() { echo "[healthcheck] FAIL: $*"; fail=$((fail+1)); }

cd "$(dirname "$0")/.." || exit 1

say "检查入口 index.html"
[ -f index.html ] || bad "缺 index.html"

say "检查 bootstrap.js"
[ -f js/agent-core/bootstrap.js ] || bad "缺 bootstrap.js"

say "检查 beta 模块"
for f in compliance/ethics-gate compliance/doi-verifier compliance/domain-risk-gate \
         crypto/task-crypto search/scheduler search/normalizer \
         core/evidence core/branch-engine core/sanitize-engine core/task-sandbox \
         core/reviewer-120 core/annotation-tracker core/provenance \
         infra/quota-broker infra/audit-logger infra/progress-stream \
         themes/preset-themes eval/benchmark ui/beta-panel ui/paper-preview ui/svg-builder \
         index; do
  [ -f "js/agent-core/beta/$f.js" ] || bad "缺 beta/$f.js"
done

say "检查 node 语法"
if command -v node >/dev/null 2>&1; then
  while IFS= read -r f; do
    node --check "$f" || bad "语法错: $f"
  done < <(find js/agent-core/beta -name '*.js')
else
  say "未装 node，跳过语法检查"
fi

say "检查文档"
for f in CHANGELOG.md LICENSE CONTRIBUTING.md docs/beta-deploy.md; do
  [ -f "$f" ] || bad "缺 $f"
done

if [ "$fail" -eq 0 ]; then
  say "全部通过 ✅"
  exit 0
else
  echo "[healthcheck] 共 $fail 项失败，请修复后再部署"
  exit 1
fi
